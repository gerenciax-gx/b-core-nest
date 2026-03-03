import { ApiProperty } from '@nestjs/swagger';
import { PersonalResponseDto } from './personal-response.dto.js';
import { CompanyResponseDto } from './company-response.dto.js';
import { AppearanceResponseDto } from './appearance-response.dto.js';
import { NotificationPreferencesResponseDto } from './notification-preferences-response.dto.js';
import { SessionResponseDto } from './session-response.dto.js';

export class PersonalSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ type: PersonalResponseDto })
  data!: PersonalResponseDto;
}

export class CompanySuccessResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ type: CompanyResponseDto })
  data!: CompanyResponseDto;
}

export class AppearanceSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ type: AppearanceResponseDto })
  data!: AppearanceResponseDto;
}

export class NotificationPreferencesSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ type: NotificationPreferencesResponseDto })
  data!: NotificationPreferencesResponseDto;
}

export class SessionListSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ type: [SessionResponseDto] })
  data!: SessionResponseDto[];
}
