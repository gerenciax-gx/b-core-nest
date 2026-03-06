import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CancelSubscriptionDto {
  @ApiProperty({
    description: 'Motivo do cancelamento',
    example: 'Cliente solicitou cancelamento',
  })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
