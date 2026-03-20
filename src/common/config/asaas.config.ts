import { registerAs } from '@nestjs/config';

export const asaasConfig = registerAs('asaas', () => {
  const webhookToken = process.env['ASAAS_WEBHOOK_TOKEN'] ?? '';
  if (!webhookToken && process.env['NODE_ENV'] === 'prod') {
    throw new Error(
      'FATAL: ASAAS_WEBHOOK_TOKEN environment variable is required in production',
    );
  }

  return {
    apiKey: process.env['ASAAS_API_KEY'] ?? '',
    baseUrl:
      process.env['ASAAS_BASE_URL'] ?? 'https://sandbox.asaas.com/api/v3',
    webhookToken,
  };
});
