import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';

export class SignupDto {
  @ApiProperty({ example: 'João Silva' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: 'joao@empresa.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'Senh@Forte1' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'Senh@Forte1' })
  @IsString()
  @MinLength(8)
  passwordConfirm!: string;

  @ApiProperty({ example: 'Empresa XPTO' })
  @IsString()
  @IsNotEmpty()
  companyName!: string;

  @ApiProperty({ example: 'products', enum: ['products', 'services', 'both'] })
  @IsIn(['products', 'services', 'both'])
  companyType!: 'products' | 'services' | 'both';
}
