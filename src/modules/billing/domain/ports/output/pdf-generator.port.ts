import type { InvoiceDetail, BillingInfoSummary } from '../../ports/input/billing.usecase.port.js';

export interface PdfGeneratorPort {
  generateInvoicePdf(
    invoice: InvoiceDetail,
    billingInfo: BillingInfoSummary | null,
  ): Promise<Buffer>;
}
