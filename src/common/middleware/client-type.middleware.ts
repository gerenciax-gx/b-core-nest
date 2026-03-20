import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

export type ClientType = 'web' | 'mobile-ios' | 'mobile-android' | 'mfe';

const ALLOWED_CLIENT_TYPES: readonly string[] = ['web', 'mobile-ios', 'mobile-android', 'mfe'];

@Injectable()
export class ClientTypeMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    const raw = req.headers['x-client-type'] as string | undefined;
    const clientType: ClientType = raw && ALLOWED_CLIENT_TYPES.includes(raw)
      ? (raw as ClientType)
      : 'web';
    (req as unknown as Record<string, unknown>)['clientType'] = clientType;
    next();
  }
}
