import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  port: parseInt(process.env['PORT'] ?? '3000', 10),
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  corsOrigins: (
    process.env['CORS_ORIGINS'] ?? 'http://localhost:4200,http://localhost:8100'
  ).split(','),
  apiPrefix: 'api/v1',
}));
