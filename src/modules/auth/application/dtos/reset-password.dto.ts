import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'SenhaAtual1!' })
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @ApiProperty({ example: 'NovaSenha1!' })
  @IsString()
  @MinLength(8)
  newPassword!: string;

  @ApiProperty({ example: 'NovaSenha1!' })
  @IsString()
  @MinLength(8)
  confirmPassword!: string;
}
