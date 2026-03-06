import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
} from 'class-validator';

export class UpdateBillingInfoDto {
  @ApiProperty({ description: 'CPF ou CNPJ', example: '12345678901' })
  @IsString()
  @IsNotEmpty()
  document!: string;

  @ApiProperty({ description: 'Nome ou Razão Social', example: 'Empresa LTDA' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ description: 'Email de cobrança', example: 'financeiro@empresa.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiPropertyOptional({ description: 'Telefone', example: '11999998888' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Logradouro', example: 'Rua das Flores' })
  @IsOptional()
  @IsString()
  addressStreet?: string;

  @ApiPropertyOptional({ description: 'Número', example: '123' })
  @IsOptional()
  @IsString()
  addressNumber?: string;

  @ApiPropertyOptional({ description: 'Complemento', example: 'Sala 10' })
  @IsOptional()
  @IsString()
  addressComplement?: string;

  @ApiPropertyOptional({ description: 'Bairro', example: 'Centro' })
  @IsOptional()
  @IsString()
  addressNeighborhood?: string;

  @ApiPropertyOptional({ description: 'Cidade', example: 'São Paulo' })
  @IsOptional()
  @IsString()
  addressCity?: string;

  @ApiPropertyOptional({ description: 'Estado (UF)', example: 'SP' })
  @IsOptional()
  @IsString()
  addressState?: string;

  @ApiPropertyOptional({ description: 'CEP', example: '01001000' })
  @IsOptional()
  @IsString()
  addressZipCode?: string;
}
