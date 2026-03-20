import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const tenantId = (request as unknown as Record<string, unknown>)[
      'tenantId'
    ] as string | undefined;

    if (!tenantId) {
      throw new UnauthorizedException(
        'Token inválido: tenantId ausente',
      );
    }

    return tenantId;
  },
);
