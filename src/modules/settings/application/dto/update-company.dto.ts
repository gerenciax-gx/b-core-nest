import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsEmail,
  IsInt,
  Min,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class UpdateCompanyDto {
  // ── Basic ─────────────────────────────────────────────────
  @ApiPropertyOptional({ example: 'Empresa XPTO LTDA' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  companyName?: string;

  @ApiPropertyOptional({ example: '12.345.678/0001-90' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  document?: string;

  @ApiPropertyOptional({ example: '(11) 99999-0000' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ example: 'contato@empresa.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'https://cdn.gerenciax.com/logos/logo.png' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string;

  // ── Legal / Registration ──────────────────────────────────
  @ApiPropertyOptional({ example: 'Empresa XPTO LTDA - ME' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  legalName?: string;

  @ApiPropertyOptional({ example: '123.456.789.001' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  stateRegistration?: string;

  @ApiPropertyOptional({ example: '001234567' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
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
  @MaxLength(255)
  street?: string;

  @ApiPropertyOptional({ example: '123' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  number?: string;

  @ApiPropertyOptional({ example: 'Sala 10' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  complement?: string;

  @ApiPropertyOptional({ example: 'Centro' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  neighborhood?: string;

  @ApiPropertyOptional({ example: 'São Paulo' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 'SP' })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  state?: string;

  @ApiPropertyOptional({ example: 'BR' })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  country?: string;

  // ── Business Data ─────────────────────────────────────────
  @ApiPropertyOptional({ example: '2020-01-15', description: 'Data de abertura (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  openingDate?: string;

  @ApiPropertyOptional({ example: 'Seg-Sex 09:00-18:00, Sáb 09:00-13:00' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  businessHours?: string;

  @ApiPropertyOptional({ example: 'Corte masculino, Barba, Coloração' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
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
  @MaxLength(500)
  paymentMethods?: string;

  @ApiPropertyOptional({ example: 'Cancelamentos devem ser feitos com 24h de antecedência' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  cancellationPolicy?: string;

  @ApiPropertyOptional({ example: 'Barbearia especializada em cortes modernos' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  // ── Social Links ──────────────────────────────────────────
  @ApiPropertyOptional({ example: 'https://www.empresa.com.br' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  website?: string;

  @ApiPropertyOptional({ example: '@empresa' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  instagram?: string;

  @ApiPropertyOptional({ example: 'https://facebook.com/empresa' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  facebook?: string;

  @ApiPropertyOptional({ example: '(11) 99999-0000' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  whatsapp?: string;
}
