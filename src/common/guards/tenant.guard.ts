import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

/**
 * Extracts tenantId from JWT payload and attaches it to the request.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context
      .switchToHttp()
      .getRequest<Record<string, unknown>>();
    const user = request['user'] as Record<string, unknown> | undefined;

    if (!user) return true; // JwtAuthGuard handles this

    const tenantId = user['tenantId'] as string | undefined;
    if (!tenantId) {
      throw new UnauthorizedException('Token inválido: tenantId ausente');
    }

    request['tenantId'] = tenantId;
    return true;
  }
}
