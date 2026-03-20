import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn } from 'class-validator';

// ── CREATE ──────────────────────────────────────────────────

export class CreateCustomFieldDto {
  @ApiProperty({ example: 'Origem' })
  @IsString()
  key!: string;

  @ApiProperty({ example: 'Brasil' })
  @IsString()
  value!: string;

  @ApiPropertyOptional({ enum: ['text', 'number', 'date', 'boolean'] })
  @IsOptional()
  @IsString()
  @IsIn(['text', 'number', 'date', 'boolean'])
  type?: 'text' | 'number' | 'date' | 'boolean';
}

// ── UPDATE ──────────────────────────────────────────────────

export class UpdateCustomFieldDto {
  @ApiPropertyOptional({ example: 'Material' })
  @IsOptional()
  @IsString()
  key?: string;

  @ApiPropertyOptional({ example: 'Algodão' })
  @IsOptional()
  @IsString()
  value?: string;

  @ApiPropertyOptional({ enum: ['text', 'number', 'date', 'boolean'] })
  @IsOptional()
  @IsString()
  @IsIn(['text', 'number', 'date', 'boolean'])
  type?: 'text' | 'number' | 'date' | 'boolean';
}

// ── RESPONSE ────────────────────────────────────────────────

export class CustomFieldResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() key!: string;
  @ApiProperty() value!: string;
  @ApiProperty() type!: string;
  @ApiProperty() sortOrder!: number;
  @ApiPropertyOptional() variationId!: string | null;
}
