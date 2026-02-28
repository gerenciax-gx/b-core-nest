import { registerAs } from '@nestjs/config';

export const databaseConfig = registerAs('database', () => ({
  url: process.env['DATABASE_URL'] ?? '',
  maxConnections: parseInt(process.env['DB_MAX_CONNECTIONS'] ?? '10', 10),
}));
