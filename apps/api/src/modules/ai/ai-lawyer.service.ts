import { Injectable, Logger, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { PrismaService } from '../../shared/database/prisma.service';
import type { AuthenticatedUser } from '../../shared/decorators/current-user.decorator';

/** Structured response the model must return */
interface AiLawyerRaw {
  answer: string;
  confidence: 'high' | 'medium' | 'low';
  caveats: string | null;
  isLegalResearch: boolean;
  referencedCaseRefs: string[];
}

export interface AiLawyerResponse {
  answer: string;
  confidence: 'high' | 'medium' | 'low';
  caveats: string | null;
  isLegalResearch: boolean;
  /** Only refs that were verified to exist in the DB */
  groundedCaseRefs: string[];
  /** Refs the model mentioned that don't exist — signals hallucination */
  unverifedCaseRefs: string[];
}

@Injectable()
export class AiLawyerService {
  private readonly logger = new Logger(AiLawyerService.name);
  private readonly openai: OpenAI;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.config.get<string>('OPENAI_API_KEY'),
    });
  }

  async chat(question: string, user: AuthenticatedUser): Promise<AiLawyerResponse> {
    if (!question?.trim()) {
      throw new BadRequestException('Question cannot be empty');
    }
    if (user.role !== 'lawyer' && user.role !== 'admin') {
      throw new ForbiddenException('Only lawyers can use this endpoint');
    }

    // ── Fetch ALL firm cases for this tenant ───────────────────────────────
    const cases = await this.prisma.matter.findMany({
      where: { tenantId: user.tenantId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    const caseIds = cases.map((c) => c.id);
    const validRefs = new Set(cases.map((c) => c.internalRef));

    // ── Fetch related data in parallel ─────────────────────────────────────
    const [events, notes, fees, docRequests] = await Promise.all([
      this.prisma.scheduledEvent.findMany({
        where: { matterId: { in: caseIds }, tenantId: user.tenantId },
        orderBy: { scheduledAt: 'asc' },
      }),
      this.prisma.note.findMany({
        where: { matterId: { in: caseIds }, tenantId: user.tenantId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.fee.findMany({
        where: { matterId: { in: caseIds }, tenantId: user.tenantId },
      }),
      this.prisma.documentRequest.findMany({
        where: { matterId: { in: caseIds }, tenantId: user.tenantId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const today = new Date();
    const contextParts: string[] = [];

    for (const c of cases) {
      const caseEvents = events.filter((e) => e.matterId === c.id);
      const caseNotes = notes.filter((n) => n.matterId === c.id);
      const caseFees = fees.filter((f) => f.matterId === c.id);
      const caseDocs = docRequests.filter((dr) => dr.matterId === c.id);

      const upcomingHearings = caseEvents
        .filter((e) => new Date(e.scheduledAt) >= today)
        .map((e) => `  - ${new Date(e.scheduledAt).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}${e.outcomeNotes ? ` — ${e.outcomeNotes}` : ''}`)
        .join('\n');

      const pastHearings = caseEvents
        .filter((e) => new Date(e.scheduledAt) < today)
        .slice(-5)
        .map((e) => `  - ${new Date(e.scheduledAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}${e.outcomeNotes ? `: ${e.outcomeNotes}` : ''}`)
        .join('\n');

      const notesText = caseNotes
        .map((n) => `  [${n.isPublished ? 'shared' : 'private'}] ${n.content.slice(0, 300)}${n.content.length > 300 ? '…' : ''}`)
        .join('\n');

      const totalFees = caseFees.reduce((sum, f) => sum + f.totalAmount.toNumber(), 0);
      const totalPaid = caseFees.reduce((sum, f) => sum + f.paidAmount.toNumber(), 0);

      const pendingDocs = caseDocs
        .filter((dr) => dr.status === 'pending')
        .map((dr) => `  - ${dr.description}${dr.dueDate ? ` (due ${new Date(dr.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })})` : ''}`)
        .join('\n');

      contextParts.push(`[REF: ${c.internalRef}]
Title: ${c.title}${c.externalRef ? ` | Court Ref: ${c.externalRef}` : ''}
Status: ${c.statusKey} | Filed: ${new Date(c.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}

Upcoming Hearings:
${upcomingHearings || '  None scheduled'}

Recent Past Hearings:
${pastHearings || '  None'}

Notes (all — private and shared):
${notesText || '  None'}

Fees: Total ₹${totalFees.toLocaleString('en-IN')} | Paid ₹${totalPaid.toLocaleString('en-IN')} | Outstanding ₹${(totalFees - totalPaid).toLocaleString('en-IN')}

Pending Document Requests:
${pendingDocs || '  None'}`);
    }

    const systemPrompt = `You are an AI legal research assistant for a law firm based in India.
Today's date is ${today.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}.
You are assisting a ${user.role} named ${user.name ?? 'the lawyer'}.

You have TWO capabilities:
1. CASE QUERIES: Answer questions about the firm's cases using ONLY the data in the FIRM CASES section.
2. LEGAL RESEARCH: Answer general Indian law questions (IPC, CrPC, CPC, Contract Act, Evidence Act, family law, property law, etc.) from your training knowledge. Your training data cutoff is April 2024 — note this only when asking about very recent amendments or judgments after that date.

═══ CRITICAL GROUNDING RULES (NEVER BREAK THESE) ═══
- For case queries: You may ONLY reference cases listed in FIRM CASES below, identified by [REF: xxx].
- Do NOT invent, assume, or extrapolate any case detail not explicitly listed.
- Do NOT reference any case, client, hearing, or amount that is not in the data below.
- If asked about a case not in the list, respond: "I don't have a case matching that description in the system."
- If you are unsure whether something appears in the data, say so — do not guess.
═══════════════════════════════════════════════════════

RESPONSE FORMAT: You MUST respond with ONLY valid JSON — no markdown, no prose outside JSON:
{
  "answer": "<your answer — use \\n for line breaks>",
  "confidence": "<high|medium|low>",
  "caveats": "<string or null — note any uncertainty, recent amendment risks, or things to verify>",
  "isLegalResearch": <true if this is a general law question, false if case-specific>,
  "referencedCaseRefs": ["<exact ref strings from [REF: xxx] tags you cited, e.g. DSX-2024-001>"]
}

Confidence guide:
- high: you are certain from the provided data or well-established law
- medium: based on data but some ambiguity, or legal answer that may have amendments
- low: limited data, or legal area with significant uncertainty / recent changes

═══ FIRM CASES (${cases.length} total) ═══
${contextParts.join('\n\n---\n\n')}`;

    let raw = '';
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question },
        ],
        max_tokens: 1000,
        temperature: 0,
        response_format: { type: 'json_object' },
      });
      raw = completion.choices[0]?.message?.content ?? '{}';
    } catch (err) {
      this.logger.error(`OpenAI call failed: ${String(err)}`);
      throw err;
    }

    let parsed: AiLawyerRaw;
    try {
      parsed = JSON.parse(raw) as AiLawyerRaw;
    } catch {
      this.logger.warn(`Failed to parse AI JSON response: ${raw}`);
      return {
        answer: raw,
        confidence: 'low',
        caveats: 'Response could not be structured — please verify manually.',
        isLegalResearch: false,
        groundedCaseRefs: [],
        unverifedCaseRefs: [],
      };
    }

    // ── Cross-check every ref the model cited ──────────────────────────────
    const cited = Array.isArray(parsed.referencedCaseRefs) ? parsed.referencedCaseRefs : [];
    const groundedCaseRefs = cited.filter((r) => validRefs.has(r));
    const unverifedCaseRefs = cited.filter((r) => !validRefs.has(r));

    if (unverifedCaseRefs.length > 0) {
      this.logger.warn(`AI hallucinated case refs: ${unverifedCaseRefs.join(', ')}`);
    }

    return {
      answer: parsed.answer ?? '',
      confidence: parsed.confidence ?? 'low',
      caveats: parsed.caveats ?? null,
      isLegalResearch: parsed.isLegalResearch ?? false,
      groundedCaseRefs,
      unverifedCaseRefs,
    };
  }
}
