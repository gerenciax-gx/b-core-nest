import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsIn, IsDateString } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto.js';

export class ListInvoicesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filtrar por status',
    enum: ['pending', 'paid', 'overdue', 'cancelled', 'refunded'],
  })
  @IsOptional()
  @IsIn(['pending', 'paid', 'overdue', 'cancelled', 'refunded'])
  status?: string;

  @ApiPropertyOptional({
    description: 'Data de início (ISO 8601)',
    example: '2025-01-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Data de fim (ISO 8601)',
    example: '2025-12-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
