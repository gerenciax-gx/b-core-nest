import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from './user-response.dto.js';

// ── Signup / Login response ──────────────────────────────────

export class AuthDataDto {
  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken!: string;
}

export class AuthResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Login realizado com sucesso' })
  message!: string;

  @ApiProperty({ type: AuthDataDto })
  data!: AuthDataDto;
}

// ── Refresh response ─────────────────────────────────────────

export class RefreshDataDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken!: string;
}

export class RefreshResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ type: RefreshDataDto })
  data!: RefreshDataDto;
}
