import { registerAs } from '@nestjs/config';

export const asaasConfig = registerAs('asaas', () => ({
  apiKey: process.env['ASAAS_API_KEY'] ?? '',
  baseUrl: process.env['ASAAS_BASE_URL'] ?? 'https://sandbox.asaas.com/api/v3',
  webhookToken: process.env['ASAAS_WEBHOOK_TOKEN'] ?? '',
}));
