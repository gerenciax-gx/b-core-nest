import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsInt, Min } from 'class-validator';

// ── CREATE ──────────────────────────────────────────────────

export class CreatePriceVariationDto {
  @ApiProperty({ example: 'Corte + Barba' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 60 })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiProperty({ example: 45 })
  @IsInt()
  @Min(1)
  durationMinutes!: number;

  @ApiPropertyOptional({ example: 40 })
  @IsOptional()
  @IsInt()
  durationMinMinutes?: number;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsInt()
  durationMaxMinutes?: number;
}

// ── UPDATE ──────────────────────────────────────────────────

export class UpdatePriceVariationDto {
  @ApiPropertyOptional({ example: 'Corte + Barba + Sobrancelha' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 75 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ example: 60 })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsInt()
  durationMinMinutes?: number;

  @ApiPropertyOptional({ example: 70 })
  @IsOptional()
  @IsInt()
  durationMaxMinutes?: number;
}

// ── RESPONSE ────────────────────────────────────────────────

export class PriceVariationSubResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() price!: number;
  @ApiProperty() durationMinutes!: number;
  @ApiPropertyOptional() durationMinMinutes!: number | null;
  @ApiPropertyOptional() durationMaxMinutes!: number | null;
  @ApiProperty() sortOrder!: number;
}
