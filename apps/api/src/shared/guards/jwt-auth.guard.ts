import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { AuthenticatedUser } from '../decorators/current-user.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwt: JwtService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user: AuthenticatedUser }>();

    // Check httpOnly cookie first, fall back to Authorization header
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const payload = this.jwt.verify<AuthenticatedUser>(token);
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractToken(request: Request): string | undefined {
    // httpOnly cookie (preferred)
    const cookieToken = (
      request.cookies as Record<string, string> | undefined
    )?.['access_token'];
    if (cookieToken) return cookieToken;

    // Authorization: Bearer <token> (for API clients)
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
