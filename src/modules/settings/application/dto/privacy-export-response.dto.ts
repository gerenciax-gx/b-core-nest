import { ApiProperty } from '@nestjs/swagger';

export class PrivacyExportUserDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() email!: string;
  @ApiProperty() role!: string;
  @ApiProperty({ nullable: true }) phone!: string | null;
  @ApiProperty({ nullable: true }) cpf!: string | null;
  @ApiProperty({ nullable: true }) birthDate!: string | null;
  @ApiProperty({ nullable: true }) avatarUrl!: string | null;
  @ApiProperty() createdAt!: string;
}

export class PrivacyExportResponseDto {
  @ApiProperty() exportedAt!: string;
  @ApiProperty() user!: PrivacyExportUserDto;
  @ApiProperty() company!: Record<string, unknown>;
  @ApiProperty() settings!: Record<string, unknown>;
  @ApiProperty() notificationPreferences!: Record<string, unknown>;
  @ApiProperty({ type: [Object] }) categories!: Record<string, unknown>[];
  @ApiProperty({ type: [Object] }) products!: Record<string, unknown>[];
  @ApiProperty({ type: [Object] }) services!: Record<string, unknown>[];
  @ApiProperty({ type: [Object] }) collaborators!: Record<string, unknown>[];
  @ApiProperty({ type: [Object] }) notifications!: Record<string, unknown>[];
  @ApiProperty({ type: [Object] }) invoices!: Record<string, unknown>[];
  @ApiProperty({ type: [Object] }) subscriptions!: Record<string, unknown>[];
}

export class PrivacyExportSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ type: PrivacyExportResponseDto })
  data!: PrivacyExportResponseDto;
}
