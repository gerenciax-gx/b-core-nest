import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsIn } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto.js';

export class ListCollaboratorsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['active', 'inactive', 'on_leave', 'away'] })
  @IsOptional()
  @IsIn(['active', 'inactive', 'on_leave', 'away'])
  status?: string;
}
