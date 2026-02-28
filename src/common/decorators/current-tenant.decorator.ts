import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const tenantId = (request as unknown as Record<string, unknown>)[
      'tenantId'
    ] as string | undefined;

    if (!tenantId) {
      throw new Error(
        'tenantId not found on request. Ensure TenantGuard is active.',
      );
    }

    return tenantId;
  },
);
