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
  private static readonly UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

    if (!user) {
      throw new UnauthorizedException('Autenticação necessária');
    }

    const userRole = user['role'] as string | undefined;
    const tenantId = user['tenantId'] as string | undefined;

    // Master pode operar em qualquer tenant via query param
    if (userRole === 'master') {
      const req = context.switchToHttp().getRequest<Record<string, unknown>>();
      const url = (req['url'] as string) ?? '';
      const urlParams = new URLSearchParams(url.split('?')[1] ?? '');
      const targetTenant = urlParams.get('targetTenantId');
      if (targetTenant && !TenantGuard.UUID_RE.test(targetTenant)) {
        throw new UnauthorizedException('targetTenantId inválido');
      }
      request['tenantId'] = targetTenant ?? tenantId ?? '';
      return true;
    }

    if (!tenantId || !TenantGuard.UUID_RE.test(tenantId)) {
      throw new UnauthorizedException('Token inválido: tenantId ausente');
    }

    request['tenantId'] = tenantId;
    return true;
  }
}
