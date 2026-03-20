import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    PinoLoggerModule.forRoot({
      pinoHttp: {
        level: process.env['LOG_LEVEL'] ?? 'info',
        transport:
          process.env['NODE_ENV'] !== 'prod'
            ? {
                target: 'pino-pretty',
                options: { colorize: true, singleLine: true },
              }
            : undefined,
        autoLogging: {
          ignore: (req) =>
            (req as unknown as Record<string, unknown>)['url'] ===
            '/health',
        },
        serializers: {
          req: (req: Record<string, unknown>) => ({
            id: req['id'],
            method: req['method'],
            url: req['url'],
            correlationId: (req['headers'] as Record<string, unknown>)?.[
              'x-correlation-id'
            ],
          }),
        },
      },
    }),
  ],
})
export class LoggingModule {}
