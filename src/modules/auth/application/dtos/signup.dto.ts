import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class SignupDto {
  @ApiProperty({ example: 'João Silva' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  @ApiProperty({ example: 'joao@empresa.com' })
  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase().trim() : value))
  email!: string;

  @ApiProperty({ example: 'Senh@Forte1' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @ApiProperty({ example: 'Senh@Forte1' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  passwordConfirm!: string;

  @ApiProperty({ example: 'Empresa XPTO' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  companyName!: string;

  @ApiProperty({ example: 'products', enum: ['products', 'services', 'both'] })
  @IsIn(['products', 'services', 'both'])
  companyType!: 'products' | 'services' | 'both';
}
