import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MarketplaceModule } from '../marketplace/marketplace.module.js';
import { BillingController } from './infrastructure/adapters/primary/billing.controller.js';
import { WebhookController } from './infrastructure/adapters/primary/webhook.controller.js';
import { BillingService } from './application/services/billing.service.js';
import { AsaasPaymentGateway } from './infrastructure/adapters/secondary/gateway/asaas-payment.gateway.js';
import { DrizzleInvoiceRepository } from './infrastructure/adapters/secondary/persistence/drizzle-invoice.repository.js';
import { DrizzleSubscriptionRepository } from './infrastructure/adapters/secondary/persistence/drizzle-subscription.repository.js';
import { DrizzleBillingInfoRepository } from './infrastructure/adapters/secondary/persistence/drizzle-billing-info.repository.js';
import { DrizzlePaymentLogRepository } from './infrastructure/adapters/secondary/persistence/drizzle-payment-log.repository.js';
import { GenerateInvoicesCron } from './application/crons/generate-invoices.cron.js';
import { CheckOverdueCron } from './application/crons/check-overdue.cron.js';
import { AutoChargeCron } from './application/crons/auto-charge.cron.js';
import { ConvertTrialsCron } from './application/crons/convert-trials.cron.js';
import { DunningRetryCron } from './application/crons/dunning-retry.cron.js';
import { BillingEventHandlers } from './application/listeners/billing-event.handlers.js';
import { PdfKitInvoiceGenerator } from './infrastructure/adapters/secondary/pdf/pdfkit-invoice.generator.js';
import { asaasConfig } from '../../common/config/asaas.config.js';

@Module({
  imports: [ConfigModule.forFeature(asaasConfig), MarketplaceModule],
  controllers: [BillingController, WebhookController],
  providers: [
    // Input Port → Service
    {
      provide: 'BillingUseCasePort',
      useClass: BillingService,
    },

    // Output Ports → Adapters
    {
      provide: 'PaymentGatewayPort',
      useClass: AsaasPaymentGateway,
    },
    {
      provide: 'InvoiceRepositoryPort',
      useClass: DrizzleInvoiceRepository,
    },
    {
      provide: 'SubscriptionRepositoryPort',
      useClass: DrizzleSubscriptionRepository,
    },
    {
      provide: 'BillingInfoRepositoryPort',
      useClass: DrizzleBillingInfoRepository,
    },
    {
      provide: 'PaymentLogRepositoryPort',
      useClass: DrizzlePaymentLogRepository,
    },
    {
      provide: 'PdfGeneratorPort',
      useClass: PdfKitInvoiceGenerator,
    },

    // CRON Jobs
    GenerateInvoicesCron,
    CheckOverdueCron,
    AutoChargeCron,
    ConvertTrialsCron,
    DunningRetryCron,

    // Event Handlers
    BillingEventHandlers,
  ],
  exports: ['BillingUseCasePort'],
})
export class BillingModule {}
