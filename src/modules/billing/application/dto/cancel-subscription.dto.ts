import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CancelSubscriptionDto {
  @ApiProperty({
    description: 'Motivo do cancelamento',
    example: 'Cliente solicitou cancelamento',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason!: string;
}
