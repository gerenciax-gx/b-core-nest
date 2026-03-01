import { ApiProperty } from '@nestjs/swagger';

export class PersonalResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  role!: string;

  @ApiProperty({ nullable: true })
  avatarUrl!: string | null;

  @ApiProperty({ nullable: true })
  phone!: string | null;

  @ApiProperty({ nullable: true })
  cpf!: string | null;

  @ApiProperty({ nullable: true })
  birthDate!: string | null;

  @ApiProperty()
  mustResetPassword!: boolean;

  @ApiProperty({ nullable: true })
  lastLoginAt!: string | null;

  @ApiProperty()
  createdAt!: string;
}
