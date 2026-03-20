import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'SenhaAtual1!' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  currentPassword!: string;

  @ApiProperty({ example: 'NovaSenha1!' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword!: string;

  @ApiProperty({ example: 'NovaSenha1!' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  confirmPassword!: string;
}
