import { ApiProperty } from '@nestjs/swagger';
import { ProductResponseDto, ProductListItemDto } from './product.dto.js';
import { PaginationMetaDto } from '../../../../common/swagger/api-responses.dto.js';

export class ProductSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ type: ProductResponseDto })
  data!: ProductResponseDto;
}

export class ProductPaginatedResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ type: [ProductListItemDto] })
  data!: ProductListItemDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
