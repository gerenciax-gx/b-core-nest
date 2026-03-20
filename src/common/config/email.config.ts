import { registerAs } from '@nestjs/config';

export const emailConfig = registerAs('email', () => ({
  resendApiKey: process.env['RESEND_API_KEY'] ?? '',
  fromAddress:
    process.env['EMAIL_FROM'] ?? 'GerenciaX <noreply@gerenciax.com>',
  frontendUrl:
    process.env['FRONTEND_URL'] ?? 'http://localhost:8100',
}));
