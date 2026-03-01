import { ApiProperty } from '@nestjs/swagger';

export class NotificationPreferencesResponseDto {
  @ApiProperty() emailNotifications!: boolean;
  @ApiProperty() pushNotifications!: boolean;
  @ApiProperty() smsNotifications!: boolean;
  @ApiProperty() orderUpdates!: boolean;
  @ApiProperty() promotions!: boolean;
  @ApiProperty() securityAlerts!: boolean;
  @ApiProperty() systemUpdates!: boolean;
}
