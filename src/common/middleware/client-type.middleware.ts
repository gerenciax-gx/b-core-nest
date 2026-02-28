import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

export type ClientType = 'web' | 'mobile-ios' | 'mobile-android' | 'mfe';

@Injectable()
export class ClientTypeMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    const clientType = req.headers['x-client-type'] as ClientType | undefined;
    (req as unknown as Record<string, unknown>)['clientType'] =
      clientType ?? 'web';
    next();
  }
}
