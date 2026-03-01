import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsEmail,
  IsInt,
  Min,
  MinLength,
  Matches,
} from 'class-validator';

export class UpdateCompanyDto {
  // ── Basic ─────────────────────────────────────────────────
  @ApiPropertyOptional({ example: 'Empresa XPTO LTDA' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  companyName?: string;

  @ApiPropertyOptional({ example: '12.345.678/0001-90' })
  @IsOptional()
  @IsString()
  document?: string;

  @ApiPropertyOptional({ example: '(11) 99999-0000' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'contato@empresa.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'https://cdn.gerenciax.com/logos/logo.png' })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  // ── Legal / Registration ──────────────────────────────────
  @ApiPropertyOptional({ example: 'Empresa XPTO LTDA - ME' })
  @IsOptional()
  @IsString()
  legalName?: string;

  @ApiPropertyOptional({ example: '123.456.789.001' })
  @IsOptional()
  @IsString()
  stateRegistration?: string;

  @ApiPropertyOptional({ example: '001234567' })
  @IsOptional()
  @IsString()
  municipalRegistration?: string;

  // ── Address ───────────────────────────────────────────────
  @ApiPropertyOptional({ example: '01001-000' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{5}-?\d{3}$/, { message: 'CEP inválido' })
  cep?: string;

  @ApiPropertyOptional({ example: 'Rua Exemplo' })
  @IsOptional()
  @IsString()
  street?: string;

  @ApiPropertyOptional({ example: '123' })
  @IsOptional()
  @IsString()
  number?: string;

  @ApiPropertyOptional({ example: 'Sala 10' })
  @IsOptional()
  @IsString()
  complement?: string;

  @ApiPropertyOptional({ example: 'Centro' })
  @IsOptional()
  @IsString()
  neighborhood?: string;

  @ApiPropertyOptional({ example: 'São Paulo' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'SP' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: 'BR' })
  @IsOptional()
  @IsString()
  country?: string;

  // ── Business Data ─────────────────────────────────────────
  @ApiPropertyOptional({ example: '2020-01-15', description: 'Data de abertura (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  openingDate?: string;

  @ApiPropertyOptional({ example: 'Seg-Sex 09:00-18:00, Sáb 09:00-13:00' })
  @IsOptional()
  @IsString()
  businessHours?: string;

  @ApiPropertyOptional({ example: 'Corte masculino, Barba, Coloração' })
  @IsOptional()
  @IsString()
  specialties?: string;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxCapacity?: number;

  @ApiPropertyOptional({ example: 45, description: 'Tempo médio de atendimento em minutos' })
  @IsOptional()
  @IsInt()
  @Min(1)
  averageServiceTime?: number;

  @ApiPropertyOptional({ example: 'Pix, Cartão de Crédito, Dinheiro' })
  @IsOptional()
  @IsString()
  paymentMethods?: string;

  @ApiPropertyOptional({ example: 'Cancelamentos devem ser feitos com 24h de antecedência' })
  @IsOptional()
  @IsString()
  cancellationPolicy?: string;

  @ApiPropertyOptional({ example: 'Barbearia especializada em cortes modernos' })
  @IsOptional()
  @IsString()
  description?: string;

  // ── Social Links ──────────────────────────────────────────
  @ApiPropertyOptional({ example: 'https://www.empresa.com.br' })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional({ example: '@empresa' })
  @IsOptional()
  @IsString()
  instagram?: string;

  @ApiPropertyOptional({ example: 'https://facebook.com/empresa' })
  @IsOptional()
  @IsString()
  facebook?: string;

  @ApiPropertyOptional({ example: '(11) 99999-0000' })
  @IsOptional()
  @IsString()
  whatsapp?: string;
}
