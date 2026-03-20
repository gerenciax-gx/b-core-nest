import {
  IsString,
  IsOptional,
  IsIn,
  IsBoolean,
  IsUrl,
  IsInt,
  IsNotEmpty,
  Min,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ── Create Tool ─────────────────────────────────────────────
export class CreateToolDto {
  @ApiProperty({ example: 'NF-e', description: 'Nome da ferramenta' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty({
    example: 'nfe',
    description: 'Slug único (lowercase, sem espaços)',
  })
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug deve conter apenas letras minúsculas, números e hífens',
  })
  slug!: string;

  @ApiPropertyOptional({
    example: 'Emissão de notas fiscais eletrônicas',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: 'Financeiro', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiProperty({ example: 'addon', enum: ['core', 'addon'] })
  @IsIn(['core', 'addon'])
  @IsNotEmpty()
  type!: string;

  @ApiPropertyOptional({
    example: 'document-text-outline',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  iconUrl?: string;

  @ApiPropertyOptional({ example: 7, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  trialDays?: number;
}

// ── Update Tool ─────────────────────────────────────────────
export class UpdateToolDto {
  @ApiPropertyOptional({ example: 'NF-e' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ example: 'nfe' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug deve conter apenas letras minúsculas, números e hífens',
  })
  slug?: string;

  @ApiPropertyOptional({ example: 'Emissão de notas fiscais eletrônicas' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: 'Financeiro' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ example: 'addon', enum: ['core', 'addon'] })
  @IsOptional()
  @IsIn(['core', 'addon'])
  type?: string;

  @ApiPropertyOptional({ example: 'document-text-outline' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  iconUrl?: string;

  @ApiPropertyOptional({ example: 7 })
  @IsOptional()
  @IsInt()
  @Min(0)
  trialDays?: number;
}

// ── Toggle Tool Status ──────────────────────────────────────
export class ToggleToolStatusDto {
  @ApiProperty({ example: true, description: 'Ativar ou desativar ferramenta' })
  @IsBoolean()
  isActive!: boolean;
}
