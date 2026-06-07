import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { PrismaService } from '../../shared/database/prisma.service';
import { MessagesService } from '../messages/messages.service';
import type { AuthenticatedUser } from '../../shared/decorators/current-user.decorator';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly openai: OpenAI;

  constructor(
    private prisma: PrismaService,
    private messages: MessagesService,
    private config: ConfigService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.config.get<string>('OPENAI_API_KEY'),
    });
  }

  async chat(question: string, user: AuthenticatedUser): Promise<{ answer: string; routedToLawyer: boolean }> {
    if (!question?.trim()) {
      throw new BadRequestException('Question cannot be empty');
    }

    // ── Fetch all the client's cases ───────────────────────────────────────
    const cases = await this.prisma.matter.findMany({
      where: { participantId: user.id, tenantId: user.tenantId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (cases.length === 0) {
      return {
        answer: "You don't have any cases linked to your account yet. Please contact your lawyer for assistance.",
        routedToLawyer: false,
      };
    }

    const caseIds = cases.map((c) => c.id);

    // ── Fetch related data in parallel ─────────────────────────────────────
    const [events, notes, fees, docRequests] = await Promise.all([
      this.prisma.scheduledEvent.findMany({
        where: { matterId: { in: caseIds }, tenantId: user.tenantId },
        orderBy: { scheduledAt: 'asc' },
      }),
      this.prisma.note.findMany({
        where: { matterId: { in: caseIds }, tenantId: user.tenantId, isPublished: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
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
        .map((e) => `  - ${new Date(e.scheduledAt).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })}${e.outcomeNotes ? ` (${e.outcomeNotes})` : ''}`)
        .join('\n');

      const pastHearings = caseEvents
        .filter((e) => new Date(e.scheduledAt) < today)
        .slice(-3)
        .map((e) => `  - ${new Date(e.scheduledAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}${e.outcomeNotes ? `: ${e.outcomeNotes}` : ''}`)
        .join('\n');

      const notesText = caseNotes
        .map((n) => `  - ${n.content.slice(0, 200)}${n.content.length > 200 ? '…' : ''}`)
        .join('\n');

      const totalFees = caseFees.reduce((sum, f) => sum + f.totalAmount.toNumber(), 0);
      const totalPaid = caseFees.reduce((sum, f) => sum + f.paidAmount.toNumber(), 0);
      const totalDue = totalFees - totalPaid;

      const pendingDocs = caseDocs
        .filter((dr) => dr.status === 'pending')
        .map((dr) => `  - ${dr.description}${dr.dueDate ? ` (due ${new Date(dr.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })})` : ''}`)
        .join('\n');

      contextParts.push(`
CASE: ${c.title}
Reference: ${c.internalRef}${c.externalRef ? ` | Court Ref: ${c.externalRef}` : ''}
Status: ${c.statusKey}
Filed: ${new Date(c.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}

Upcoming Hearings:
${upcomingHearings || '  None scheduled'}

Recent Past Hearings:
${pastHearings || '  None'}

Lawyer's Notes (shared with you):
${notesText || '  None'}

Fees:
  Total: ₹${totalFees.toLocaleString('en-IN')}
  Paid: ₹${totalPaid.toLocaleString('en-IN')}
  Outstanding: ₹${totalDue.toLocaleString('en-IN')}

Pending Document Requests from your lawyer:
${pendingDocs || '  None'}
`.trim());
    }

    const systemPrompt = `You are a helpful legal case assistant for a law firm's client portal. 
You assist clients by answering questions about their cases using only the information provided below.
Today's date is ${today.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}.

IMPORTANT RULES:
- Only answer based on the case data provided. Do not make up information.
- Be concise, warm, and professional. Use simple language (not legal jargon).
- For questions about legal strategy, court procedures, or decisions that require a lawyer's judgment, say you'll forward the question to the lawyer and set ROUTE_TO_LAWYER=true in your response.
- If a question is completely unrelated to the client's cases, politely decline.
- Format responses clearly. Use bullet points for lists.
- Always mention the case name/reference when discussing specific case details.

ROUTE_TO_LAWYER should be true if the client is asking about:
- What should I do? / What are my options?
- Can you get an adjournment / extension / delay?
- Will I win? / What are my chances?
- Any strategic or procedural legal advice
- Requests to take any action on their behalf

RESPONSE FORMAT (always use this exact format):
ANSWER: <your answer here>
ROUTE_TO_LAWYER: <true or false>

--- CLIENT CASE DATA ---
${contextParts.join('\n\n---\n\n')}`;

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question },
      ],
      max_tokens: 600,
      temperature: 0.3,
    });

    const raw = completion.choices[0]?.message?.content ?? '';
    const answerMatch = raw.match(/ANSWER:\s*([\s\S]*?)(?:\nROUTE_TO_LAWYER:|$)/i);
    const routeMatch = raw.match(/ROUTE_TO_LAWYER:\s*(true|false)/i);

    const answer = answerMatch?.[1]?.trim() ?? raw.trim();
    const routedToLawyer = routeMatch?.[1]?.toLowerCase() === 'true';

    // If routing to lawyer — create a message in the first (most relevant) case thread
    if (routedToLawyer && cases.length > 0) {
      try {
        const targetCase = cases[0];
        const messageContent = `[Forwarded by AI assistant]\n\nClient asked: "${question}"\n\nAI response: ${answer}`;
        await this.messages.create(
          targetCase.id,
          { content: messageContent },
          user,
        );
      } catch (err) {
        this.logger.error(`Failed to route AI question to lawyer: ${String(err)}`);
      }
    }

    return { answer, routedToLawyer };
  }
}
