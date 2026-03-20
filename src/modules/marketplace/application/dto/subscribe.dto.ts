import { IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubscribeDto {
  @ApiProperty({
    description: 'UUID do plano a ser assinado',
    example: 'uuid-plan-1',
  })
  @IsUUID()
  @IsNotEmpty()
  planId!: string;
}
