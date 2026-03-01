import type { UserSettings } from '../../entities/user-settings.entity.js';

export interface UserSettingsRepositoryPort {
  findByUserId(userId: string): Promise<UserSettings | null>;
  upsert(userId: string, settings: UserSettings): Promise<UserSettings>;
}
