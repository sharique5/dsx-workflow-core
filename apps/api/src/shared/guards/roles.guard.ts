import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthenticatedUser } from '../decorators/current-user.decorator';
import { Request } from 'express';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    // No role restriction on this handler
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = ctx.switchToHttp().getRequest<Request & { user: AuthenticatedUser }>();
    const user = request.user;

    if (!user || !requiredRoles.includes(user.role as UserRole)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
