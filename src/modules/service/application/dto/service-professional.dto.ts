import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

// ── CREATE ──────────────────────────────────────────────────

export class LinkProfessionalDto {
  @ApiProperty({ example: 'uuid-collaborator' })
  @IsUUID()
  collaboratorId!: string;
}

// ── RESPONSE ────────────────────────────────────────────────

export class ServiceProfessionalSubResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() collaboratorId!: string | null;
}
