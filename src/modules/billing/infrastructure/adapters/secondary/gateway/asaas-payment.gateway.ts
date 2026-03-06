import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import type {
  PaymentGatewayPort,
  CreateChargeInput,
  ChargeResult,
  CreateCustomerInput,
  CreditCardInput,
} from '../../../../domain/ports/output/payment-gateway.port.js';
import { asaasConfig } from '../../../../../../common/config/asaas.config.js';

@Injectable()
export class AsaasPaymentGateway implements PaymentGatewayPort {
  private readonly logger = new Logger(AsaasPaymentGateway.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(
    @Inject(asaasConfig.KEY)
    private readonly config: ConfigType<typeof asaasConfig>,
  ) {
    this.baseUrl = this.config.baseUrl;
    this.apiKey = this.config.apiKey;
  }

  async createCustomer(input: CreateCustomerInput): Promise<{ id: string }> {
    const body: Record<string, unknown> = {
      name: input.name,
      email: input.email,
      cpfCnpj: input.cpfCnpj.replace(/\D/g, ''),
    };
    if (input.phone) body['phone'] = input.phone;
    if (input.address) {
      body['address'] = input.address.street;
      body['addressNumber'] = input.address.number;
      body['complement'] = input.address.complement;
      body['province'] = input.address.neighborhood;
      body['city'] = input.address.city;
      body['state'] = input.address.state;
      body['postalCode'] = input.address.zipCode?.replace(/\D/g, '');
    }

    const response = await this.request('POST', '/customers', body);
    return { id: response.id as string };
  }

  async createCharge(input: CreateChargeInput): Promise<ChargeResult> {
    const body: Record<string, unknown> = {
      customer: input.customer,
      billingType: input.billingType,
      value: input.value,
      dueDate: input.dueDate,
      description: input.description,
      externalReference: input.externalReference,
    };

    if (input.creditCardToken) {
      body['creditCardToken'] = input.creditCardToken;
    }

    if (input.creditCard) {
      body['creditCard'] = {
        holderName: input.creditCard.holderName,
        number: input.creditCard.number,
        expiryMonth: input.creditCard.expiryMonth,
        expiryYear: input.creditCard.expiryYear,
        ccv: input.creditCard.ccv,
      };
    }

    const response = await this.request('POST', '/payments', body);

    return {
      id: response.id as string,
      status: response.status as string,
      invoiceUrl: response.invoiceUrl as string,
      bankSlipUrl: response.bankSlipUrl as string | undefined,
      pixQrCodeBase64: response.pixQrCodeBase64 as string | undefined,
      pixCopyPaste: response.pixCopyPaste as string | undefined,
      creditCardToken: response.creditCardToken as string | undefined,
    };
  }

  async getCharge(chargeId: string): Promise<ChargeResult> {
    const response = await this.request('GET', `/payments/${chargeId}`);
    return {
      id: response.id as string,
      status: response.status as string,
      invoiceUrl: response.invoiceUrl as string,
      bankSlipUrl: response.bankSlipUrl as string | undefined,
    };
  }

  async refundCharge(chargeId: string): Promise<void> {
    await this.request('POST', `/payments/${chargeId}/refund`);
  }

  async tokenizeCard(
    input: CreditCardInput,
    customerId: string,
  ): Promise<string> {
    const response = await this.request('POST', '/creditCard/tokenize', {
      customer: customerId,
      creditCard: {
        holderName: input.holderName,
        number: input.number,
        expiryMonth: input.expiryMonth,
        expiryYear: input.expiryYear,
        ccv: input.ccv,
      },
    });
    return response.creditCardToken as string;
  }

  // ── HTTP Client ────────────────────────────────────────────
  private async request(
    method: string,
    path: string,
    body?: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const url = `${this.baseUrl}${path}`;

    this.logger.debug(`Asaas ${method} ${path}`);

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        access_token: this.apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      this.logger.error(`Asaas error: ${JSON.stringify(error)}`);
      throw new Error(
        `Asaas API error: ${response.status} - ${JSON.stringify(error)}`,
      );
    }

    return (await response.json()) as Record<string, unknown>;
  }
}
