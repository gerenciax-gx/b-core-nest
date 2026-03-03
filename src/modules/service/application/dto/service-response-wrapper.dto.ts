import { ApiProperty } from '@nestjs/swagger';
import { ServiceResponseDto, ServiceListItemDto } from './service.dto.js';
import { PaginationMetaDto } from '../../../../common/swagger/api-responses.dto.js';

export class ServiceSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ type: ServiceResponseDto })
  data!: ServiceResponseDto;
}

export class ServicePaginatedResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ type: [ServiceListItemDto] })
  data!: ServiceListItemDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
