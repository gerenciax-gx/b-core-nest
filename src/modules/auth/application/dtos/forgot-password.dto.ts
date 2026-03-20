import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'usuario@email.com' })
  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase().trim() : value))
  email!: string;
}

export class VerifyResetTokenDto {
  @ApiProperty({ example: 'abc123token' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  token!: string;
}

export class ConfirmPasswordResetDto {
  @ApiProperty({ example: 'abc123token' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  token!: string;

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
