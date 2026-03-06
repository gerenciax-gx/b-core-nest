import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsIn } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto.js';

export class ListNotificationsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filtrar por tipo de notificação',
    enum: [
      'payment_confirmed',
      'payment_overdue',
      'subscription_activated',
      'tool_new',
      'system_maintenance',
      'stock_alert',
    ],
  })
  @IsOptional()
  @IsIn([
    'payment_confirmed',
    'payment_overdue',
    'subscription_activated',
    'tool_new',
    'system_maintenance',
    'stock_alert',
  ])
  type?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por status de leitura (true = lidas, false = não lidas)',
    type: String,
    enum: ['true', 'false'],
  })
  @IsOptional()
  @IsIn(['true', 'false'])
  isRead?: string;
}
