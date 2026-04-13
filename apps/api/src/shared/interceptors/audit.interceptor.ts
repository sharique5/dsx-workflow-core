import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { PrismaService } from '../database/prisma.service';
import { AuthenticatedUser } from '../decorators/current-user.decorator';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ENTITY_MAP: Record<string, string> = {
  matters: 'matter',
  notes: 'note',
  documents: 'document',
  'document-requests': 'document_request',
  fees: 'fee',
  events: 'scheduled_event',
  users: 'user',
};

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = ctx.switchToHttp().getRequest<Request & { user: AuthenticatedUser }>();
    const method = request.method;

    if (!['POST', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const user = request.user;
    if (!user) return next.handle();

    return next.handle().pipe(
      tap(async (responseData) => {
        const action = this.resolveAction(method);
        const { entityType, entityId, matterId } = this.resolveEntity(request, responseData);

        if (!entityType || !entityId) return;

        await this.prisma.auditLog.create({
          data: {
            tenantId: user.tenantId,
            entityType,
            entityId,
            action,
            actorId: user.id,
            matterId: matterId ?? null,
            diff: {},
          },
        });
      }),
    );
  }

  private resolveAction(method: string): string {
    switch (method) {
      case 'POST':   return 'created';
      case 'PATCH':  return 'updated';
      case 'DELETE': return 'deleted';
      default:       return 'unknown';
    }
  }

  private resolveEntity(
    request: Request,
    responseData: unknown,
  ): { entityType: string | null; entityId: string | null; matterId: string | null } {
    // URL segments stripped of prefix e.g. ['matters', '{uuid}', 'events', '{uuid}']
    const segments = request.path.split('/').filter((s) => s && s !== 'api' && !/^v\d+$/.test(s));

    // Find entity type from the last named (non-UUID) segment
    const resourceSegment = [...segments].reverse().find((s) => ENTITY_MAP[s]);
    const entityType = resourceSegment ? ENTITY_MAP[resourceSegment] : null;

    // Extract matterId — always the UUID immediately after 'matters'
    const mattersIdx = segments.indexOf('matters');
    const matterIdFromUrl =
      mattersIdx !== -1 && UUID_RE.test(segments[mattersIdx + 1] ?? '')
        ? segments[mattersIdx + 1]
        : null;

    // matterId from response body (for direct matter mutations)
    const matterIdFromResponse =
      entityType === 'matter' &&
      responseData &&
      typeof responseData === 'object' &&
      'id' in (responseData as object)
        ? (responseData as { id: string }).id
        : null;

    const matterId = matterIdFromUrl ?? matterIdFromResponse ?? null;

    // Entity ID — from response body preferred, then URL :id param
    const rawParam = request.params['id'];
    const entityId: string | null =
      (responseData && typeof responseData === 'object'
        ? (responseData as { id?: string }).id ?? null
        : null) ??
      (Array.isArray(rawParam) ? rawParam[0] : rawParam) ??
      null;

    return { entityType, entityId, matterId };
  }
}

