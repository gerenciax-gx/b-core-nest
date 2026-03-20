import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

/**
 * Blocks users with mustResetPassword=true from accessing any route
 * except reset-password and logout.
 */
@Injectable()
export class ForcePasswordResetGuard implements CanActivate {
  private readonly allowedSuffixes = [
    '/auth/reset-password',
    '/auth/logout',
  ];

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

    if (!user) return true; // JwtAuthGuard will handle this

    const mustResetPassword = user['mustResetPassword'] as boolean | undefined;
    if (!mustResetPassword) return true;

    const path = (request['path'] as string) ?? '';
    if (this.allowedSuffixes.some((suffix) => path.endsWith(suffix))) {
      return true;
    }

    throw new ForbiddenException(
      'Você deve redefinir sua senha antes de acessar o sistema',
    );
  }
}
