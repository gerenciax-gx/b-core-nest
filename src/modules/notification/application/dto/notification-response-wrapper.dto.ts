import { ApiProperty } from '@nestjs/swagger';
import { NotificationResponseDto, NotificationCountDto } from './notification.dto.js';
import { PaginationMetaDto } from '../../../../common/swagger/api-responses.dto.js';

export class NotificationSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ type: NotificationResponseDto })
  data!: NotificationResponseDto;
}

export class NotificationPaginatedResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ type: [NotificationResponseDto] })
  data!: NotificationResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}

export class NotificationCountResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ type: NotificationCountDto })
  data!: NotificationCountDto;
}

export class NotificationBulkUpdateResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: { updated: 5 } })
  data!: { updated: number };
}

export class NotificationBulkDeleteResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: { deleted: 5 } })
  data!: { deleted: number };
}
