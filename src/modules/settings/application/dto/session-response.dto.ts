import { ApiProperty } from '@nestjs/swagger';

export class SessionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ nullable: true })
  device!: string | null;

  @ApiProperty({ nullable: true })
  ip!: string | null;

  @ApiProperty({ nullable: true })
  userAgent!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  expiresAt!: string;

  @ApiProperty()
  isCurrent!: boolean;
}
