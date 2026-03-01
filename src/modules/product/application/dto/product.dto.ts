import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  IsInt,
  IsIn,
  MinLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// ── Nested DTOs ─────────────────────────────────────────────

export class VariationAttributeDto {
  @ApiProperty({ example: 'size' }) @IsString() type!: string;
  @ApiProperty({ example: '250ml' }) @IsString() value!: string;
}

export class ProductVariationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() id?: string;
  @ApiProperty({ example: '250ml' }) @IsString() name!: string;
  @ApiPropertyOptional({ example: 'SHA-250' }) @IsOptional() @IsString() sku?: string;
  @ApiProperty({ type: [VariationAttributeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariationAttributeDto)
  attributes!: VariationAttributeDto[];
  @ApiProperty({ example: 49.9 }) @IsNumber() price!: number;
  @ApiProperty({ example: 50 }) @IsInt() stock!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() imageUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) photos?: string[];
  @ApiPropertyOptional({ type: [Object] }) @IsOptional() @IsArray() customFields?: CustomFieldDto[];
}

export class ProductDimensionsDto {
  @ApiProperty({ example: 20 }) @IsNumber() length!: number;
  @ApiProperty({ example: 10 }) @IsNumber() width!: number;
  @ApiProperty({ example: 5 }) @IsNumber() height!: number;
}

export class CustomFieldDto {
  @ApiPropertyOptional() @IsOptional() @IsString() id?: string;
  @ApiProperty({ example: 'Origem' }) @IsString() key!: string;
  @ApiProperty({ example: 'Brasil' }) @IsString() value!: string;
  @ApiPropertyOptional({ enum: ['text', 'number', 'date', 'boolean'] })
  @IsOptional()
  @IsString()
  @IsIn(['text', 'number', 'date', 'boolean'])
  type?: 'text' | 'number' | 'date' | 'boolean';
}

// ── Create ──────────────────────────────────────────────────

export class CreateProductDto {
  @ApiProperty({ example: 'Shampoo Reparador' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: 'SHA-500-REP' })
  @IsString()
  @MinLength(1)
  sku!: string;

  @ApiPropertyOptional({ example: 'Shampoo profissional' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'uuid-category' })
  @IsOptional()
  @IsString()
  category?: string; // categoryId — frontend sends 'category'

  @ApiProperty({ example: 89.9 })
  @IsNumber()
  @Min(0)
  basePrice!: number;

  @ApiPropertyOptional({ example: 45.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @ApiPropertyOptional({ example: 35 })
  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  minStock?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxStock?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  stockAlert?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  trackInventory?: boolean;

  @ApiPropertyOptional({ example: '7891234567890' })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiPropertyOptional({ example: 0.5 })
  @IsOptional()
  @IsNumber()
  weight?: number;

  @ApiPropertyOptional({ type: ProductDimensionsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProductDimensionsDto)
  dimensions?: ProductDimensionsDto;

  @ApiPropertyOptional({ enum: ['active', 'inactive', 'draft'] })
  @IsOptional()
  @IsString()
  @IsIn(['active', 'inactive', 'draft'])
  status?: 'active' | 'inactive' | 'draft';

  @ApiPropertyOptional({ example: ['cabelo', 'shampoo'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ type: [ProductVariationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariationDto)
  variations?: ProductVariationDto[];

  @ApiPropertyOptional({ example: ['https://cdn.example.com/photo1.jpg'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @ApiPropertyOptional({ type: [CustomFieldDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomFieldDto)
  customFields?: CustomFieldDto[];
}

// ── Update ──────────────────────────────────────────────────

export class UpdateProductDto extends CreateProductDto {
  // All fields optional via inheritance (all have @IsOptional already except name/sku/basePrice)
  @ApiPropertyOptional() @IsOptional() declare name: string;
  @ApiPropertyOptional() @IsOptional() declare sku: string;
  @ApiPropertyOptional() @IsOptional() declare basePrice: number;
}

// ── Response ────────────────────────────────────────────────

export class ProductVariationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() sku!: string | null;
  @ApiProperty() attributes!: VariationAttributeDto[];
  @ApiProperty() price!: number;
  @ApiProperty() stock!: number;
  @ApiPropertyOptional() imageUrl!: string | null;
}

export class ProductPhotoResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() url!: string;
  @ApiProperty() isMain!: boolean;
  @ApiProperty() sortOrder!: number;
}

export class CustomFieldResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() key!: string;
  @ApiProperty() value!: string;
  @ApiPropertyOptional() type!: string;
}

export class ProductResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() sku!: string;
  @ApiPropertyOptional() description!: string | null;
  @ApiPropertyOptional() categoryId!: string | null;
  @ApiProperty() basePrice!: number;
  @ApiPropertyOptional() costPrice!: number | null;
  @ApiProperty() stock!: number;
  @ApiProperty() minStock!: number;
  @ApiPropertyOptional() maxStock!: number | null;
  @ApiProperty() stockAlert!: boolean;
  @ApiProperty() trackInventory!: boolean;
  @ApiPropertyOptional() barcode!: string | null;
  @ApiPropertyOptional() weight!: number | null;
  @ApiPropertyOptional() dimensions!: ProductDimensionsDto | null;
  @ApiProperty() tags!: string[];
  @ApiPropertyOptional() imageUrl!: string | null;
  @ApiProperty() status!: string;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ type: [ProductVariationResponseDto] }) variations!: ProductVariationResponseDto[];
  @ApiProperty({ type: [ProductPhotoResponseDto] }) photos!: ProductPhotoResponseDto[];
  @ApiProperty({ type: [CustomFieldResponseDto] }) customFields!: CustomFieldResponseDto[];
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

// ── List Item (lighter) ─────────────────────────────────────

export class ProductListItemDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() sku!: string;
  @ApiProperty() price!: number;
  @ApiProperty() stock!: number;
  @ApiPropertyOptional() minStock?: number;
  @ApiPropertyOptional() maxStock?: number;
  @ApiPropertyOptional() imageUrl!: string | null;
  @ApiProperty() isActive!: boolean;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}
