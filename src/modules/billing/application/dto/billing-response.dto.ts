import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InvoiceItemResponseDto {
  @ApiProperty({ example: 'uuid-item-1' })
  id!: string;

  @ApiProperty({ example: 'Plano Pro - 2025-07' })
  description!: string;

  @ApiProperty({ example: 99.9 })
  unitPrice!: number;

  @ApiProperty({ example: 1 })
  quantity!: number;

  @ApiProperty({ example: 99.9 })
  totalPrice!: number;
}

export class InvoiceResponseDto {
  @ApiProperty({ example: 'uuid-invoice-1' })
  id!: string;

  @ApiProperty({ example: 'uuid-sub-1' })
  subscriptionId!: string;

  @ApiProperty({ enum: ['pending', 'paid', 'overdue', 'cancelled', 'refunded'], example: 'pending' })
  status!: string;

  @ApiProperty({ example: 99.9 })
  totalAmount!: number;

  @ApiProperty({ example: '2025-07-10T00:00:00.000Z' })
  dueDate!: string;

  @ApiPropertyOptional({ example: '2025-07-08T14:30:00.000Z' })
  paidAt!: string | null;

  @ApiProperty({ example: '2025-07' })
  referenceMonth!: string;

  @ApiPropertyOptional({ example: 'https://asaas.com/invoice/abc' })
  externalUrl!: string | null;

  @ApiProperty({ example: '2025-07-01T00:00:00.000Z' })
  createdAt!: string;
}

export class InvoiceDetailResponseDto extends InvoiceResponseDto {
  @ApiPropertyOptional({ example: 'pay_abc123' })
  externalId!: string | null;

  @ApiPropertyOptional({ example: 'base64...' })
  pixQrCode!: string | null;

  @ApiPropertyOptional({ example: '00020126...' })
  pixCopyPaste!: string | null;

  @ApiPropertyOptional({ example: 'https://asaas.com/boleto/abc' })
  boletoUrl!: string | null;

  @ApiPropertyOptional({ example: '23793.38128 60000.000003 00000.000406 1 84340000009990' })
  boletoBarcode!: string | null;

  @ApiProperty({ type: [InvoiceItemResponseDto] })
  items!: InvoiceItemResponseDto[];
}

export class SubscriptionResponseDto {
  @ApiProperty({ example: 'uuid-sub-1' })
  id!: string;

  @ApiProperty({ example: 'uuid-plan-1' })
  planId!: string;

  @ApiProperty({ enum: ['active', 'past_due', 'cancelled', 'trialing'], example: 'active' })
  status!: string;

  @ApiProperty({ example: '2025-07-01T00:00:00.000Z' })
  startDate!: string;

  @ApiPropertyOptional({ example: null })
  endDate!: string | null;

  @ApiProperty({ example: '2025-08-01T00:00:00.000Z' })
  nextBillingDate!: string;

  @ApiPropertyOptional({ example: null })
  cancelledAt!: string | null;

  @ApiPropertyOptional({ example: null })
  cancelReason!: string | null;

  @ApiPropertyOptional({ example: 'credit_card' })
  preferredPaymentMethod!: string | null;

  @ApiPropertyOptional({ example: '4242' })
  cardLast4!: string | null;

  @ApiPropertyOptional({ example: 'visa' })
  cardBrand!: string | null;

  @ApiProperty({ example: '2025-07-01T00:00:00.000Z' })
  createdAt!: string;
}

export class BillingInfoResponseDto {
  @ApiProperty({ example: 'uuid-info-1' })
  id!: string;

  @ApiProperty({ example: 'uuid-tenant-1' })
  tenantId!: string;

  @ApiPropertyOptional({ example: 'cus_abc123' })
  customerExternalId!: string | null;

  @ApiProperty({ example: '12345678901' })
  document!: string;

  @ApiProperty({ example: 'Empresa LTDA' })
  name!: string;

  @ApiProperty({ example: 'financeiro@empresa.com' })
  email!: string;

  @ApiPropertyOptional({ example: '11999998888' })
  phone!: string | null;

  @ApiPropertyOptional({ example: 'Rua das Flores' })
  addressStreet!: string | null;

  @ApiPropertyOptional({ example: '123' })
  addressNumber!: string | null;

  @ApiPropertyOptional({ example: 'Sala 10' })
  addressComplement!: string | null;

  @ApiPropertyOptional({ example: 'Centro' })
  addressNeighborhood!: string | null;

  @ApiPropertyOptional({ example: 'São Paulo' })
  addressCity!: string | null;

  @ApiPropertyOptional({ example: 'SP' })
  addressState!: string | null;

  @ApiPropertyOptional({ example: '01001000' })
  addressZipCode!: string | null;
}

export class PaymentResultResponseDto {
  @ApiProperty({ example: 'uuid-invoice-1' })
  invoiceId!: string;

  @ApiProperty({ example: 'pending' })
  status!: string;

  @ApiPropertyOptional({ example: 'https://asaas.com/invoice/abc' })
  externalUrl!: string | null;

  @ApiPropertyOptional({ example: 'base64...' })
  pixQrCode!: string | null;

  @ApiPropertyOptional({ example: '00020126...' })
  pixCopyPaste!: string | null;

  @ApiPropertyOptional({ example: 'https://asaas.com/boleto/abc' })
  boletoUrl!: string | null;

  @ApiPropertyOptional({ example: '23793.38128 ...' })
  boletoBarcode!: string | null;
}
