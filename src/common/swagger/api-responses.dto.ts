import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ── Success Responses ────────────────────────────────────────

export class ApiSuccessResponseDto<T = any> {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiPropertyOptional({ example: 'Operação realizada com sucesso' })
  message?: string;

  @ApiProperty()
  data!: T;
}

// ── Pagination Meta ──────────────────────────────────────────

export class PaginationMetaDto {
  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 3 })
  totalPages!: number;

  @ApiProperty({ example: true })
  hasNext!: boolean;

  @ApiProperty({ example: false })
  hasPrevious!: boolean;
}

// ── Error Responses ──────────────────────────────────────────

export class ErrorDetailDto {
  @ApiProperty({ example: 'NOT_FOUND' })
  code!: string;

  @ApiProperty({ example: 404 })
  statusCode!: number;

  @ApiPropertyOptional({
    type: [Object],
    example: [{ field: 'email', message: 'Email deve ser válido' }],
  })
  details?: Array<{ field?: string; message: string }>;
}

export class ApiErrorResponseDto {
  @ApiProperty({ example: false })
  success!: boolean;

  @ApiProperty({ example: 'Recurso não encontrado' })
  message!: string;

  @ApiProperty({ type: ErrorDetailDto })
  error!: ErrorDetailDto;
}

// ── Message-only response ────────────────────────────────────

export class ApiMessageResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Operação realizada com sucesso' })
  message!: string;
}
