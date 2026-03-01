import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, IsIn } from 'class-validator';

export class UpdateAppearanceDto {
  @ApiPropertyOptional({ example: 'dark', enum: ['light', 'dark', 'system'] })
  @IsOptional()
  @IsString()
  @IsIn(['light', 'dark', 'system'])
  theme?: 'light' | 'dark' | 'system';

  @ApiPropertyOptional({ example: 'pt-BR', enum: ['pt-BR', 'en-US', 'es'] })
  @IsOptional()
  @IsString()
  @IsIn(['pt-BR', 'en-US', 'es'])
  language?: 'pt-BR' | 'en-US' | 'es';

  @ApiPropertyOptional({ example: 'medium', enum: ['small', 'medium', 'large'] })
  @IsOptional()
  @IsString()
  @IsIn(['small', 'medium', 'large'])
  fontSize?: 'small' | 'medium' | 'large';

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  compactMode?: boolean;
}
