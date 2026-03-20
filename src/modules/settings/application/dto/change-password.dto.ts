import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MinLength, MaxLength } from 'class-validator';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;
const PASSWORD_MSG = 'Senha deve ter ao menos 1 maiúscula, 1 minúscula, 1 número e 1 caractere especial';

export class ChangePasswordDto {
  @ApiProperty({ example: 'SenhaAtual@123' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  currentPassword!: string;

  @ApiProperty({ example: 'NovaSenha@456' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MSG })
  newPassword!: string;

  @ApiProperty({ example: 'NovaSenha@456' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  confirmPassword!: string;
}
