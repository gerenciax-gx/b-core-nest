import type { NotificationPreferences } from '../../entities/notification-preferences.entity.js';

export interface NotificationPreferencesRepositoryPort {
  findByUserId(userId: string): Promise<NotificationPreferences | null>;
  upsert(userId: string, prefs: NotificationPreferences): Promise<NotificationPreferences>;
}
