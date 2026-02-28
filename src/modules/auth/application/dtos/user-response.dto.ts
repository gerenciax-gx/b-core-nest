import { ApiProperty } from '@nestjs/swagger';
import type { User } from '../../domain/entities/user.entity.js';

export class UserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  role!: string;

  @ApiProperty({ nullable: true })
  avatarUrl!: string | null;

  @ApiProperty()
  mustResetPassword!: boolean;

  @ApiProperty()
  isCollaborator!: boolean;

  @ApiProperty({ nullable: true })
  lastLoginAt!: string | null;

  static from(user: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.tenantId = user.tenantId;
    dto.name = user.name;
    dto.email = user.email;
    dto.role = user.role;
    dto.avatarUrl = user.avatarUrl;
    dto.mustResetPassword = user.mustResetPassword;
    dto.isCollaborator = user.isCollaboratorUser();
    dto.lastLoginAt = user.lastLoginAt?.toISOString() ?? null;
    return dto;
  }
}
