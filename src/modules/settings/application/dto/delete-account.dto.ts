import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class DeleteAccountDto {
  @ApiProperty({ example: 'SenhaAtual@123', description: 'Senha atual para confirmação' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password!: string;

  @ApiProperty({ example: 'DELETAR MINHA CONTA', description: 'Texto de confirmação' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  confirmation!: string;
}
