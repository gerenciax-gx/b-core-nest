import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsInt,
  IsArray,
  IsIn,
  MinLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// ── Nested DTOs ─────────────────────────────────────────────

export class PriceVariationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() id?: string;
  @ApiProperty({ example: 'Corte + Barba' }) @IsString() name!: string;
  @ApiProperty({ example: 60 }) @IsNumber() price!: number;
  @ApiProperty({ example: 45 }) @IsInt() @Min(1) durationMinutes!: number;
  @ApiPropertyOptional({ example: 40 }) @IsOptional() @IsInt() durationMinMinutes?: number;
  @ApiPropertyOptional({ example: 50 }) @IsOptional() @IsInt() durationMaxMinutes?: number;
  @ApiPropertyOptional({ example: ['https://cdn.example.com/photo.jpg'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];
}

export class ServicePhotoDto {
  @ApiPropertyOptional() @IsOptional() @IsString() id?: string;
  @ApiProperty({ example: 'https://cdn.example.com/photo.jpg' }) @IsString() url!: string;
  @ApiPropertyOptional() @IsOptional() isMain?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() order?: number;
}

// ── Create ──────────────────────────────────────────────────

export class CreateServiceDto {
  @ApiProperty({ example: 'Corte de Cabelo Masculino' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional({ example: 'Corte tradicional com acabamento' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'uuid-category', description: 'Category ID or name' })
  @IsOptional()
  @IsString()
  category?: string; // categoryId — frontend sends 'category'

  @ApiProperty({ example: 45.0 })
  @IsNumber()
  @Min(0)
  basePrice!: number;

  @ApiProperty({ example: 30 })
  @IsInt()
  @Min(1)
  durationMinutes!: number;

  @ApiPropertyOptional({ type: [PriceVariationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PriceVariationDto)
  priceVariations?: PriceVariationDto[];

  @ApiPropertyOptional({ type: [ServicePhotoDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServicePhotoDto)
  photos?: ServicePhotoDto[];

  @ApiPropertyOptional({ example: ['uuid-professional-1'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  professionalIds?: string[];

  @ApiPropertyOptional({ example: ['https://cdn.example.com/photo1.jpg'], description: 'Alternative: photo URLs as strings' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photoUrls?: string[];
}

// ── Update ──────────────────────────────────────────────────

export class UpdateServiceDto extends CreateServiceDto {
  @ApiPropertyOptional() @IsOptional() declare name: string;
  @ApiPropertyOptional() @IsOptional() declare basePrice: number;
  @ApiPropertyOptional() @IsOptional() declare durationMinutes: number;

  @ApiPropertyOptional({ enum: ['active', 'inactive', 'paused'] })
  @IsOptional()
  @IsString()
  @IsIn(['active', 'inactive', 'paused'])
  status?: 'active' | 'inactive' | 'paused';
}

// ── Response ────────────────────────────────────────────────

export class PriceVariationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() price!: number;
  @ApiProperty() durationMinutes!: number;
  @ApiPropertyOptional() durationMinMinutes!: number | null;
  @ApiPropertyOptional() durationMaxMinutes!: number | null;
}

export class ServicePhotoResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() url!: string;
  @ApiProperty() isMain!: boolean;
  @ApiProperty() sortOrder!: number;
}

export class ServiceProfessionalResponseDto {
  @ApiProperty() id!: string;
  @ApiPropertyOptional() collaboratorId!: string | null;
  // In Fase 3 these will be populated with name, initials, etc.
}

export class ServiceResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() description!: string | null;
  @ApiPropertyOptional() categoryId!: string | null;
  @ApiProperty() basePrice!: number;
  @ApiProperty() durationMinutes!: number;
  @ApiPropertyOptional() imageUrl!: string | null;
  @ApiProperty() status!: string;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ type: [PriceVariationResponseDto] }) priceVariations!: PriceVariationResponseDto[];
  @ApiProperty({ type: [ServicePhotoResponseDto] }) photos!: ServicePhotoResponseDto[];
  @ApiProperty({ type: [ServiceProfessionalResponseDto] }) professionals!: ServiceProfessionalResponseDto[];
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

// ── List Item ───────────────────────────────────────────────

export class ServiceListItemDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() description!: string | null;
  @ApiProperty() basePrice!: number;
  @ApiProperty() durationMinutes!: number;
  @ApiProperty() status!: string;
  @ApiProperty({ type: [ServiceProfessionalResponseDto] }) professionals!: ServiceProfessionalResponseDto[];
  @ApiPropertyOptional() category?: string | null;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}
