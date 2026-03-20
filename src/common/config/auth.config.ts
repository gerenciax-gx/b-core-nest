import { registerAs } from '@nestjs/config';

export const authConfig = registerAs('auth', () => {
  const jwtSecret = process.env['JWT_SECRET'];
  if (!jwtSecret && process.env['NODE_ENV'] === 'prod') {
    throw new Error(
      'FATAL: JWT_SECRET environment variable is required in production',
    );
  }

  return {
    jwtSecret: jwtSecret ?? 'dev-only-unsafe-secret',
    jwtExpiresIn: process.env['JWT_EXPIRES_IN'] ?? '15m',
    refreshTokenExpiresIn: process.env['REFRESH_TOKEN_EXPIRES_IN'] ?? '30d',
    bcryptRounds: parseInt(process.env['BCRYPT_ROUNDS'] ?? '12', 10),
    refreshTokenDays: parseInt(process.env['REFRESH_TOKEN_DAYS'] ?? '30', 10),
    resetTokenHours: parseInt(process.env['RESET_TOKEN_HOURS'] ?? '1', 10),
  };
});
