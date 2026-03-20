import type { InvoiceFilters } from '../output/invoice.repository.port.js';
import type { CreditCardInput } from '../output/payment-gateway.port.js';

export interface PayInvoiceInput {
  paymentMethod: string;
  useStoredCard?: boolean;
  creditCard?: CreditCardInput;
  saveCard?: boolean;
}

export interface AsaasWebhookPayload {
  event: string;
  payment: {
    id: string;
    status: string;
    confirmedDate?: string;
    value: number;
    externalReference?: string;
  };
}

export interface PayInvoiceResult {
  invoiceId: string;
  status: string;
  externalUrl: string | null;
  pixQrCode: string | null;
  pixCopyPaste: string | null;
  boletoUrl: string | null;
  boletoBarcode: string | null;
}

export interface InvoiceSummary {
  id: string;
  subscriptionId: string | null;
  status: string;
  totalAmount: number;
  dueDate: Date;
  paidAt: Date | null;
  referenceMonth: string;
  externalUrl: string | null;
  createdAt: Date;
}

export interface InvoiceDetail extends InvoiceSummary {
  externalId: string | null;
  pixQrCode: string | null;
  pixCopyPaste: string | null;
  boletoUrl: string | null;
  boletoBarcode: string | null;
  items: {
    id: string;
    description: string;
    unitPrice: number;
    quantity: number;
    totalPrice: number;
  }[];
}

export interface SubscriptionSummary {
  id: string;
  planId: string;
  status: string;
  startDate: Date;
  endDate: Date | null;
  nextBillingDate: Date;
  cancelledAt: Date | null;
  cancelReason: string | null;
  preferredPaymentMethod: string | null;
  cardLast4: string | null;
  cardBrand: string | null;
  createdAt: Date;
}

export interface BillingInfoSummary {
  id: string;
  tenantId: string;
  customerExternalId: string | null;
  document: string;
  name: string;
  email: string;
  phone: string | null;
  addressStreet: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  addressNeighborhood: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressZipCode: string | null;
}

export interface BillingUseCasePort {
  payInvoice(
    tenantId: string,
    invoiceId: string,
    dto: PayInvoiceInput,
  ): Promise<PayInvoiceResult>;

  processWebhook(payload: AsaasWebhookPayload): Promise<void>;

  getInvoicesByTenant(
    tenantId: string,
    filters?: InvoiceFilters,
  ): Promise<{ data: InvoiceSummary[]; total: number }>;

  getInvoiceById(tenantId: string, invoiceId: string): Promise<InvoiceDetail>;

  getSubscriptionsByTenant(tenantId: string): Promise<SubscriptionSummary[]>;

  cancelSubscription(
    tenantId: string,
    subscriptionId: string,
    reason: string,
  ): Promise<void>;

  generateInvoicePdf(tenantId: string, invoiceId: string): Promise<Buffer>;

  getBillingInfo(tenantId: string): Promise<BillingInfoSummary | null>;

  updateBillingInfo(
    tenantId: string,
    data: {
      document: string;
      name: string;
      email: string;
      phone?: string;
      addressStreet?: string;
      addressNumber?: string;
      addressComplement?: string;
      addressNeighborhood?: string;
      addressCity?: string;
      addressState?: string;
      addressZipCode?: string;
    },
  ): Promise<BillingInfoSummary>;
}
