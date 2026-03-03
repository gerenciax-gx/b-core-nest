import { IsOptional, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto.js';

export class ListCategoriesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filtrar por tipo de categoria',
    enum: ['product', 'service'],
  })
  @IsOptional()
  @IsIn(['product', 'service'])
  type?: string;
}
