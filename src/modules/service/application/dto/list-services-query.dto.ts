import { IsOptional, IsIn, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto.js';

export class ListServicesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filtrar por status',
    enum: ['active', 'inactive', 'paused'],
  })
  @IsOptional()
  @IsIn(['active', 'inactive', 'paused'])
  status?: string;

  @ApiPropertyOptional({ description: 'Filtrar por categoria' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
