import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import type { ConfigType } from '@nestjs/config';
import { Public } from '../../../../../common/decorators/public.decorator.js';
import type { BillingUseCasePort } from '../../../domain/ports/input/billing.usecase.port.js';
import { asaasConfig } from '../../../../../common/config/asaas.config.js';
import { WebhookResponseDto } from '../../../application/dto/billing-response-wrapper.dto.js';
import { AsaasWebhookPayloadDto } from '../../../application/dto/asaas-webhook.dto.js';

@ApiTags('Billing – Webhooks')
@Controller('billing/webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    @Inject('BillingUseCasePort')
    private readonly billingService: BillingUseCasePort,

    @Inject(asaasConfig.KEY)
    private readonly config: ConfigType<typeof asaasConfig>,
  ) {}

  /**
   * BIL-007: ALWAYS return 200 to avoid Asaas infinite retries.
   * BIL-013: Validate webhook token.
   */
  @Public()
  @Post('asaas')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook Asaas (público)' })
  @ApiResponse({ status: 200, description: 'Webhook processado', type: WebhookResponseDto })
  async handleAsaasWebhook(
    @Body() payload: AsaasWebhookPayloadDto,
    @Headers('asaas-access-token') accessToken: string,
  ): Promise<{ received: boolean }> {
    // Validate webhook token — timing-safe comparison (BIL-013)
    if (!accessToken || !this.config.webhookToken) {
      this.logger.warn('Webhook token ausente');
      throw new UnauthorizedException();
    }

    const a = Buffer.from(accessToken, 'utf-8');
    const b = Buffer.from(this.config.webhookToken, 'utf-8');
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      this.logger.warn('Webhook token inválido');
      throw new UnauthorizedException();
    }

    this.logger.log(
      `Webhook Asaas: ${payload.event} - Payment: ${payload.payment?.id}`,
    );

    // Process — always return 200 even on error (BIL-007)
    try {
      await this.billingService.processWebhook(payload);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Erro processando webhook: ${message}`, stack);
    }

    return { received: true };
  }
}
