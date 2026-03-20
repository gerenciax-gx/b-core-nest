import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsUrl } from 'class-validator';

// ── CREATE ──────────────────────────────────────────────────

export class CreateServicePhotoDto {
  @ApiProperty({ example: 'https://cdn.example.com/photo.jpg' })
  @IsUrl({}, { message: 'url deve ser uma URL válida' })
  url!: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isMain?: boolean;
}

// ── RESPONSE ────────────────────────────────────────────────

export class ServicePhotoSubResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() url!: string;
  @ApiProperty() isMain!: boolean;
  @ApiProperty() sortOrder!: number;
}
