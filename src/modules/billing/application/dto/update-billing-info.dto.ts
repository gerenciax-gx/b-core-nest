import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  MaxLength,
} from 'class-validator';

export class UpdateBillingInfoDto {
  @ApiProperty({ description: 'CPF ou CNPJ', example: '12345678901' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  document!: string;

  @ApiProperty({ description: 'Nome ou Razão Social', example: 'Empresa LTDA' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty({ description: 'Email de cobrança', example: 'financeiro@empresa.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiPropertyOptional({ description: 'Telefone', example: '11999998888' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ description: 'Logradouro', example: 'Rua das Flores' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressStreet?: string;

  @ApiPropertyOptional({ description: 'Número', example: '123' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  addressNumber?: string;

  @ApiPropertyOptional({ description: 'Complemento', example: 'Sala 10' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  addressComplement?: string;

  @ApiPropertyOptional({ description: 'Bairro', example: 'Centro' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  addressNeighborhood?: string;

  @ApiPropertyOptional({ description: 'Cidade', example: 'São Paulo' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  addressCity?: string;

  @ApiPropertyOptional({ description: 'Estado (UF)', example: 'SP' })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  addressState?: string;

  @ApiPropertyOptional({ description: 'CEP', example: '01001000' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  addressZipCode?: string;
}
