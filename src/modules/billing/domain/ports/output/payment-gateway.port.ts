export interface CreateChargeInput {
  customer: string; // Asaas customer ID
  billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'DEBIT_CARD';
  value: number;
  dueDate: string; // YYYY-MM-DD
  description: string;
  externalReference: string; // invoice ID
  creditCard?: CreditCardInput;
  creditCardToken?: string;
}

export interface CreditCardInput {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
}

export interface ChargeResult {
  id: string;
  status: string;
  invoiceUrl: string;
  bankSlipUrl?: string;
  pixQrCodeBase64?: string;
  pixCopyPaste?: string;
  creditCardToken?: string;
  creditCardBrand?: string;
}

export interface CreateCustomerInput {
  name: string;
  email: string;
  cpfCnpj: string;
  phone?: string;
  address?: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
}

export interface PaymentGatewayPort {
  createCustomer(input: CreateCustomerInput): Promise<{ id: string }>;
  updateCustomer(customerId: string, input: CreateCustomerInput): Promise<void>;
  createCharge(input: CreateChargeInput): Promise<ChargeResult>;
  getCharge(chargeId: string): Promise<ChargeResult>;
  refundCharge(chargeId: string): Promise<void>;
  tokenizeCard(input: CreditCardInput, customerId: string): Promise<string>;
}
