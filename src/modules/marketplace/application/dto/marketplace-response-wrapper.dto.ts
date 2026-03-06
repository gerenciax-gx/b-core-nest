import { ApiProperty } from '@nestjs/swagger';
import {
  ToolResponseDto,
  ToolDetailResponseDto,
  SubscriptionResponseDto,
} from './marketplace.dto.js';
import { PaginationMetaDto } from '../../../../common/swagger/api-responses.dto.js';

// ── Tool list (paginated) ───────────────────────────────────
export class ToolPaginatedResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ type: [ToolResponseDto] })
  data!: ToolResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}

// ── Tool detail ─────────────────────────────────────────────
export class ToolDetailSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ type: ToolDetailResponseDto })
  data!: ToolDetailResponseDto;
}

// ── Subscription single ─────────────────────────────────────
export class SubscriptionSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ type: SubscriptionResponseDto })
  data!: SubscriptionResponseDto;
}

// ── Subscription list ───────────────────────────────────────
export class SubscriptionListResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ type: [SubscriptionResponseDto] })
  data!: SubscriptionResponseDto[];
}
