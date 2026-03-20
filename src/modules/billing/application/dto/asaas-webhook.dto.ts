import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class AsaasPaymentDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsNotEmpty()
  status!: string;

  @IsNumber()
  value!: number;

  @IsOptional()
  @IsString()
  externalReference?: string;

  @IsOptional()
  @IsString()
  confirmedDate?: string;
}

export class AsaasWebhookPayloadDto {
  @IsString()
  @IsNotEmpty()
  event!: string;

  @ValidateNested()
  @Type(() => AsaasPaymentDto)
  payment!: AsaasPaymentDto;
}
