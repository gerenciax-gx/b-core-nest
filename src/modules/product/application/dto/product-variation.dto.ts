import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsInt, IsArray, IsUrl, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { VariationAttributeDto } from './product.dto.js';

// ── CREATE ──────────────────────────────────────────────────

export class CreateVariationDto {
  @ApiProperty({ example: '250ml' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 'SHA-250' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty({ type: [VariationAttributeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariationAttributeDto)
  attributes!: VariationAttributeDto[];

  @ApiProperty({ example: 49.9 })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiProperty({ example: 50 })
  @IsInt()
  @Min(0)
  stock!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({}, { message: 'imageUrl deve ser uma URL válida' })
  imageUrl?: string;
}

// ── UPDATE ──────────────────────────────────────────────────

export class UpdateVariationDto {
  @ApiPropertyOptional({ example: '500ml' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'SHA-500' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({ type: [VariationAttributeDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariationAttributeDto)
  attributes?: VariationAttributeDto[];

  @ApiPropertyOptional({ example: 69.9 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({}, { message: 'imageUrl deve ser uma URL válida' })
  imageUrl?: string;
}

// ── RESPONSE ────────────────────────────────────────────────

export class VariationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() sku!: string | null;
  @ApiProperty({ type: [VariationAttributeDto] }) attributes!: VariationAttributeDto[];
  @ApiProperty() price!: number;
  @ApiProperty() stock!: number;
  @ApiPropertyOptional() imageUrl!: string | null;
  @ApiProperty() sortOrder!: number;
}
