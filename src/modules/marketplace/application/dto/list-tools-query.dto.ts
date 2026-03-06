import { IsOptional, IsIn, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto.js';

export class ListToolsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filtrar por tipo de ferramenta',
    enum: ['core', 'addon'],
  })
  @IsOptional()
  @IsIn(['core', 'addon'])
  type?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por categoria (ex.: Financeiro)',
  })
  @IsOptional()
  @IsString()
  category?: string;
}
