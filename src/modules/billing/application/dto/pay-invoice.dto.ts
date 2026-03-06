import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsIn,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class CreditCardDto {
  @ApiProperty({ example: 'João da Silva' })
  @IsString()
  @IsNotEmpty()
  holderName!: string;

  @ApiProperty({ example: '4111111111111111' })
  @IsString()
  @IsNotEmpty()
  number!: string;

  @ApiProperty({ example: '12' })
  @IsString()
  @IsNotEmpty()
  expiryMonth!: string;

  @ApiProperty({ example: '2028' })
  @IsString()
  @IsNotEmpty()
  expiryYear!: string;

  @ApiProperty({ example: '123' })
  @IsString()
  @IsNotEmpty()
  ccv!: string;
}

export class PayInvoiceDto {
  @ApiProperty({
    description: 'Método de pagamento',
    enum: ['pix', 'boleto', 'credit_card'],
    example: 'pix',
  })
  @IsString()
  @IsIn(['pix', 'boleto', 'credit_card'])
  paymentMethod!: string;

  @ApiPropertyOptional({
    description: 'Usar cartão salvo na assinatura',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  useStoredCard?: boolean;

  @ApiPropertyOptional({
    description: 'Dados do cartão de crédito (se não usar cartão salvo)',
    type: CreditCardDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreditCardDto)
  creditCard?: CreditCardDto;

  @ApiPropertyOptional({
    description: 'Salvar token do cartão para futuras cobranças',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  saveCard?: boolean;
}
