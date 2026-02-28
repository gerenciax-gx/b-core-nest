import { Module } from '@nestjs/common';

@Module({
  imports: [],
  controllers: [],
  providers: [
    // Port → Adapter bindings go here
    // { provide: 'InvoiceRepositoryPort', useClass: DrizzleInvoiceRepository },
    // { provide: 'SubscriptionRepositoryPort', useClass: DrizzleSubscriptionRepository },
    // { provide: 'PaymentGatewayPort', useClass: AsaasPaymentAdapter },
  ],
  exports: [],
})
export class BillingModule {}
