import { ApiProperty } from '@nestjs/swagger';
import {
  InvoiceResponseDto,
  InvoiceDetailResponseDto,
  SubscriptionResponseDto,
  BillingInfoResponseDto,
  PaymentResultResponseDto,
} from './billing-response.dto.js';
import { PaginationMetaDto } from '../../../../common/swagger/api-responses.dto.js';

// ── Invoice list (paginated) ─────────────────────────────
export class InvoicePaginatedResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ type: [InvoiceResponseDto] })
  data!: InvoiceResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}

// ── Invoice detail ───────────────────────────────────────
export class InvoiceDetailSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ type: InvoiceDetailResponseDto })
  data!: InvoiceDetailResponseDto;
}

// ── Pay invoice ──────────────────────────────────────────
export class PayInvoiceSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ type: PaymentResultResponseDto })
  data!: PaymentResultResponseDto;
}

// ── Subscription list ────────────────────────────────────
export class SubscriptionListResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ type: [SubscriptionResponseDto] })
  data!: SubscriptionResponseDto[];
}

// ── Billing info ─────────────────────────────────────────
export class BillingInfoSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ type: BillingInfoResponseDto })
  data!: BillingInfoResponseDto;
}

// ── Cancel subscription ──────────────────────────────────
export class CancelSubscriptionSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Assinatura cancelada' })
  message!: string;
}

// ── Webhook response ─────────────────────────────────────
export class WebhookResponseDto {
  @ApiProperty({ example: true })
  received!: boolean;
}
