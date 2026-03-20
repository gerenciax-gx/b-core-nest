import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class ChangePlanDto {
  @ApiProperty({
    example: 'uuid-new-plan',
    description: 'UUID do novo plano desejado',
  })
  @IsUUID()
  @IsNotEmpty()
  newPlanId!: string;
}
