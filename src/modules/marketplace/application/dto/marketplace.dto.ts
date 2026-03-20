import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ── Plan Feature Response ───────────────────────────────────
export class PlanFeatureResponseDto {
  @ApiProperty({ example: 'uuid-feature-1' })
  id!: string;

  @ApiProperty({ example: 'max_nfe_month' })
  featureKey!: string;

  @ApiProperty({ example: 'Até 50 NF-e/mês' })
  featureValue!: string;

  @ApiProperty({ example: false })
  isHighlighted!: boolean;

  @ApiProperty({ example: 0 })
  order!: number;
}

// ── Tool Plan Response ──────────────────────────────────────
export class ToolPlanResponseDto {
  @ApiProperty({ example: 'uuid-plan-1' })
  id!: string;

  @ApiProperty({ example: 'Básico' })
  name!: string;

  @ApiProperty({ example: 30.9 })
  price!: number;

  @ApiProperty({ example: 'monthly' })
  interval!: string;

  @ApiProperty({ example: false })
  isPopular!: boolean;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiPropertyOptional({ example: 5, nullable: true })
  maxUsers!: number | null;

  @ApiPropertyOptional({ example: 100, nullable: true })
  maxItems!: number | null;

  @ApiProperty({ type: [PlanFeatureResponseDto] })
  features!: PlanFeatureResponseDto[];
}

// ── Tool Response (list) ────────────────────────────────────
export class ToolResponseDto {
  @ApiProperty({ example: 'uuid-tool-1' })
  id!: string;

  @ApiProperty({ example: 'NF-e' })
  name!: string;

  @ApiProperty({ example: 'nfe' })
  slug!: string;

  @ApiPropertyOptional({ example: 'Emissão de notas fiscais eletrônicas', nullable: true })
  description!: string | null;

  @ApiPropertyOptional({ example: 'Financeiro', nullable: true })
  category!: string | null;

  @ApiProperty({ example: 'addon' })
  type!: string;

  @ApiPropertyOptional({ example: 'document-text-outline', nullable: true })
  iconUrl!: string | null;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: 0 })
  trialDays!: number;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  updatedAt!: string;
}

// ── Tool Detail Response (with plans + subscription context) ─
export class ToolDetailResponseDto {
  @ApiProperty({ example: 'uuid-tool-1' })
  id!: string;

  @ApiProperty({ example: 'NF-e' })
  name!: string;

  @ApiProperty({ example: 'nfe' })
  slug!: string;

  @ApiPropertyOptional({ example: 'Emissão de notas fiscais eletrônicas', nullable: true })
  description!: string | null;

  @ApiPropertyOptional({ example: 'Financeiro', nullable: true })
  category!: string | null;

  @ApiProperty({ example: 'addon' })
  type!: string;

  @ApiPropertyOptional({ example: 'document-text-outline', nullable: true })
  iconUrl!: string | null;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: 0 })
  trialDays!: number;

  @ApiProperty({ example: false })
  isSubscribed!: boolean;

  @ApiPropertyOptional({ example: null, nullable: true })
  currentPlanId!: string | null;

  @ApiProperty({ type: [ToolPlanResponseDto] })
  plans!: ToolPlanResponseDto[];

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  updatedAt!: string;
}

// ── Subscription Response ───────────────────────────────────
export class SubscriptionResponseDto {
  @ApiProperty({ example: 'uuid-subscription-1' })
  id!: string;

  @ApiProperty({ example: 'uuid-tool-1' })
  toolId!: string;

  @ApiProperty({ example: 'Agendamento' })
  toolName!: string;

  @ApiProperty({ example: 'Profissional' })
  planName!: string;

  @ApiProperty({ example: 49.9 })
  planPrice!: number;

  @ApiPropertyOptional({ example: 'calendar', nullable: true })
  iconUrl!: string | null;

  @ApiProperty({ example: 'active' })
  status!: string;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  startDate!: string;

  @ApiPropertyOptional({ example: null, nullable: true })
  endDate!: string | null;
}
