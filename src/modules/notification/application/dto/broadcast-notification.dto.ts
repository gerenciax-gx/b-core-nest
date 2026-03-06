import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength, IsOptional, IsIn } from 'class-validator';

export class BroadcastNotificationDto {
  @ApiProperty({ description: 'Título da notificação', example: 'Manutenção programada' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @ApiProperty({ description: 'Mensagem da notificação', example: 'O sistema ficará indisponível das 02h às 04h.' })
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiPropertyOptional({
    description: 'Tipo da notificação (padrão: system_maintenance)',
    enum: ['system_maintenance', 'tool_new'],
    default: 'system_maintenance',
  })
  @IsOptional()
  @IsIn(['system_maintenance', 'tool_new'])
  type?: 'system_maintenance' | 'tool_new';
}
