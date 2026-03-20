import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ── Create Plan Feature ─────────────────────────────────────
export class CreatePlanFeatureDto {
  @ApiProperty({ example: 'max_nfe_month', description: 'Chave da feature' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  featureKey!: string;

  @ApiProperty({ example: 'Até 50 NF-e/mês', description: 'Valor/descrição' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  featureValue!: string;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isHighlighted?: boolean;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

// ── Update Plan Feature ─────────────────────────────────────
export class UpdatePlanFeatureDto {
  @ApiPropertyOptional({ example: 'max_nfe_month' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  featureKey?: string;

  @ApiPropertyOptional({ example: 'Até 100 NF-e/mês' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  featureValue?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isHighlighted?: boolean;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
