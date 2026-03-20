import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NotificationResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id!: string;

  @ApiProperty({ example: 'a1b2c3d4-0000-0000-0000-000000000000' })
  tenantId!: string;

  @ApiProperty({ example: 'payment_confirmed' })
  type!: string;

  @ApiProperty({ example: 'Pagamento confirmado' })
  title!: string;

  @ApiProperty({ example: 'Sua fatura de Janeiro/2026 foi paga com sucesso.' })
  message!: string;

  @ApiProperty({ example: false })
  isRead!: boolean;

  @ApiPropertyOptional({ example: { invoiceId: 'inv-123' } })
  metadata?: Record<string, unknown> | null;

  @ApiProperty({ example: '2026-01-15T10:30:00Z' })
  createdAt!: Date;
}

export class NotificationCountDto {
  @ApiProperty({ example: 5 })
  count!: number;
}

export class NotificationBulkResultDto {
  @ApiProperty({ example: 3 })
  updated?: number;

  @ApiProperty({ example: 3 })
  deleted?: number;
}
