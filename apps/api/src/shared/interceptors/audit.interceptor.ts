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

/**
 * Automatically records audit log entries for mutating requests
 * (POST, PATCH, DELETE) on entity endpoints.
 *
 * Controllers can inject the AuditContext to provide entity context
 * if the interceptor cannot infer it from the URL.
 */
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
        const { entityType, entityId } = this.resolveEntity(request, responseData);

        if (!entityType || !entityId) return;

        await this.prisma.auditLog.create({
          data: {
            tenantId: user.tenantId,
            entityType,
            entityId,
            action,
            actorId: user.id,
            diff: {},
          },
        });
      }),
    );
  }

  private resolveAction(method: string): string {
    switch (method) {
      case 'POST':
        return 'created';
      case 'PATCH':
        return 'updated';
      case 'DELETE':
        return 'deleted';
      default:
        return 'unknown';
    }
  }

  private resolveEntity(
    request: Request,
    responseData: unknown,
  ): { entityType: string | null; entityId: string | null } {
    // Try to extract from URL: /api/v1/matters/123
    const segments = request.path.split('/').filter(Boolean);
    const entityMap: Record<string, string> = {
      matters: 'matter',
      notes: 'note',
      documents: 'document',
      'document-requests': 'document_request',
      fees: 'fee',
      'scheduled-events': 'scheduled_event',
      users: 'user',
    };

    const resourceSegment = segments.find((s) => entityMap[s]);
    const entityType = resourceSegment ? entityMap[resourceSegment] : null;

    // Entity ID from response body or URL param
    const rawParam = request.params['id'];
    const entityId: string | null =
      (responseData && typeof responseData === 'object'
        ? (responseData as { id?: string }).id ?? null
        : null) ??
      (Array.isArray(rawParam) ? rawParam[0] : rawParam) ??
      null;

    return { entityType, entityId };
  }
}
