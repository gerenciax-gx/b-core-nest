import { ApiProperty } from '@nestjs/swagger';
import {
  CollaboratorResponseDto,
  CollaboratorListItemDto,
  CollaboratorCreateResponseDto,
} from './collaborator.dto.js';
import { PaginationMetaDto } from '../../../../common/swagger/api-responses.dto.js';

// ── Single Collaborator (detail) ─────────────────────────────
export class CollaboratorSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ type: CollaboratorResponseDto })
  data!: CollaboratorResponseDto;
}

// ── Create Response (includes temporaryPassword) ─────────────
export class CollaboratorCreateSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ type: CollaboratorCreateResponseDto })
  data!: CollaboratorCreateResponseDto;
}

// ── Paginated List ───────────────────────────────────────────
export class CollaboratorPaginatedResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ type: [CollaboratorListItemDto] })
  data!: CollaboratorListItemDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
