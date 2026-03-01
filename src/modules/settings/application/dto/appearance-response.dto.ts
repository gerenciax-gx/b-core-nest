import { ApiProperty } from '@nestjs/swagger';

export class AppearanceResponseDto {
  @ApiProperty({ enum: ['light', 'dark', 'system'] })
  theme!: string;

  @ApiProperty({ enum: ['pt-BR', 'en-US', 'es'] })
  language!: string;

  @ApiProperty({ enum: ['small', 'medium', 'large'] })
  fontSize!: string;

  @ApiProperty()
  compactMode!: boolean;
}
