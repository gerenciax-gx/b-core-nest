import {
  IsString,
  IsOptional,
  IsNumber,
  IsIn,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ── Create Plan ─────────────────────────────────────────────
export class CreatePlanDto {
  @ApiProperty({ example: 'Básico', description: 'Nome do plano' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 29.9, description: 'Preço do plano' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price!: number;

  @ApiPropertyOptional({
    example: 'monthly',
    enum: ['monthly', 'quarterly', 'semiannual', 'annual'],
    default: 'monthly',
  })
  @IsOptional()
  @IsIn(['monthly', 'quarterly', 'semiannual', 'annual'])
  interval?: string;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isPopular?: boolean;

  @ApiPropertyOptional({ example: 5, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxUsers?: number;

  @ApiPropertyOptional({ example: 100, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxItems?: number;
}

// ── Update Plan ─────────────────────────────────────────────
export class UpdatePlanDto {
  @ApiPropertyOptional({ example: 'Profissional' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 49.9 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price?: number;

  @ApiPropertyOptional({
    example: 'monthly',
    enum: ['monthly', 'quarterly', 'semiannual', 'annual'],
  })
  @IsOptional()
  @IsIn(['monthly', 'quarterly', 'semiannual', 'annual'])
  interval?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isPopular?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxUsers?: number;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxItems?: number;
}
