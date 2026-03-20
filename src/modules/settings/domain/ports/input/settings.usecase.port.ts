import type { PersonalResponseDto } from '../../../application/dto/personal-response.dto.js';
import type { CompanyResponseDto } from '../../../application/dto/company-response.dto.js';
import type { AppearanceResponseDto } from '../../../application/dto/appearance-response.dto.js';
import type { NotificationPreferencesResponseDto } from '../../../application/dto/notification-preferences-response.dto.js';
import type { SessionResponseDto } from '../../../application/dto/session-response.dto.js';
import type { UpdatePersonalDto } from '../../../application/dto/update-personal.dto.js';
import type { UpdateCompanyDto } from '../../../application/dto/update-company.dto.js';
import type { UpdateAppearanceDto } from '../../../application/dto/update-appearance.dto.js';
import type { UpdateNotificationPreferencesDto } from '../../../application/dto/update-notification-preferences.dto.js';
import type { PrivacyExportResponseDto } from '../../../application/dto/privacy-export-response.dto.js';

export interface SettingsUseCasePort {
  getPersonal(userId: string): Promise<PersonalResponseDto>;
  updatePersonal(userId: string, dto: UpdatePersonalDto): Promise<PersonalResponseDto>;
  updateAvatar(userId: string, avatarUrl: string): Promise<PersonalResponseDto>;
  getCompany(tenantId: string): Promise<CompanyResponseDto>;
  updateCompany(tenantId: string, userRole: string, dto: UpdateCompanyDto): Promise<CompanyResponseDto>;
  getAppearance(userId: string): Promise<AppearanceResponseDto>;
  updateAppearance(userId: string, dto: UpdateAppearanceDto): Promise<AppearanceResponseDto>;
  getNotificationPreferences(userId: string): Promise<NotificationPreferencesResponseDto>;
  updateNotificationPreferences(userId: string, dto: UpdateNotificationPreferencesDto): Promise<NotificationPreferencesResponseDto>;
  changePassword(userId: string, currentPassword: string, newPassword: string, confirmPassword: string): Promise<void>;
  listSessions(userId: string, currentRefreshToken?: string): Promise<SessionResponseDto[]>;
  revokeSession(sessionId: string, userId: string): Promise<void>;
  exportUserData(userId: string, tenantId: string): Promise<PrivacyExportResponseDto>;
  deleteAccount(userId: string, tenantId: string, password: string, confirmation: string): Promise<void>;
}
