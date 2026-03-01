import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from '../../../../../../common/database/database.module.js';
import type { UserSettingsRepositoryPort } from '../../../../domain/ports/output/user-settings.repository.port.js';
import {
  UserSettings,
  type ThemeType,
  type LanguageType,
  type FontSizeType,
} from '../../../../domain/entities/user-settings.entity.js';
import { userSettings } from './user-settings.schema.js';

@Injectable()
export class DrizzleUserSettingsRepository
  implements UserSettingsRepositoryPort
{
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase,
  ) {}

  async findByUserId(userId: string): Promise<UserSettings | null> {
    const rows = await this.db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    return this.toDomain(row);
  }

  async upsert(
    userId: string,
    settings: UserSettings,
  ): Promise<UserSettings> {
    const existing = await this.findByUserId(userId);

    if (existing) {
      await this.db
        .update(userSettings)
        .set({
          theme: settings.theme,
          language: settings.language,
          fontSize: settings.fontSize,
          compactMode: settings.compactMode,
          updatedAt: settings.updatedAt,
        })
        .where(eq(userSettings.userId, userId));
    } else {
      await this.db.insert(userSettings).values({
        id: settings.id,
        userId,
        theme: settings.theme,
        language: settings.language,
        fontSize: settings.fontSize,
        compactMode: settings.compactMode,
        createdAt: settings.createdAt,
        updatedAt: settings.updatedAt,
      });
    }

    return settings;
  }

  private toDomain(row: typeof userSettings.$inferSelect): UserSettings {
    return new UserSettings(
      row.id,
      row.userId,
      row.theme as ThemeType,
      row.language as LanguageType,
      row.fontSize as FontSizeType,
      row.compactMode,
      row.createdAt,
      row.updatedAt,
    );
  }
}
