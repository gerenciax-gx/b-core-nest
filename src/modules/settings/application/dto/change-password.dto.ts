import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'SenhaAtual@123' })
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @ApiProperty({ example: 'NovaSenha@456' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  newPassword!: string;

  @ApiProperty({ example: 'NovaSenha@456' })
  @IsString()
  @IsNotEmpty()
  confirmPassword!: string;
}
