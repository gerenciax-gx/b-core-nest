import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from '../../../../../../common/database/database.module.js';
import type { NotificationPreferencesRepositoryPort } from '../../../../domain/ports/output/notification-preferences.repository.port.js';
import { NotificationPreferences } from '../../../../domain/entities/notification-preferences.entity.js';
import { notificationPreferences } from './notification-preferences.schema.js';

@Injectable()
export class DrizzleNotificationPreferencesRepository
  implements NotificationPreferencesRepositoryPort
{
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase,
  ) {}

  async findByUserId(userId: string): Promise<NotificationPreferences | null> {
    const rows = await this.db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    return this.toDomain(row);
  }

  async upsert(
    userId: string,
    prefs: NotificationPreferences,
  ): Promise<NotificationPreferences> {
    const existing = await this.findByUserId(userId);

    if (existing) {
      await this.db
        .update(notificationPreferences)
        .set({
          emailNotifications: prefs.emailNotifications,
          pushNotifications: prefs.pushNotifications,
          smsNotifications: prefs.smsNotifications,
          orderUpdates: prefs.orderUpdates,
          promotions: prefs.promotions,
          securityAlerts: prefs.securityAlerts,
          systemUpdates: prefs.systemUpdates,
          updatedAt: prefs.updatedAt,
        })
        .where(eq(notificationPreferences.userId, userId));
    } else {
      await this.db.insert(notificationPreferences).values({
        id: prefs.id,
        userId,
        emailNotifications: prefs.emailNotifications,
        pushNotifications: prefs.pushNotifications,
        smsNotifications: prefs.smsNotifications,
        orderUpdates: prefs.orderUpdates,
        promotions: prefs.promotions,
        securityAlerts: prefs.securityAlerts,
        systemUpdates: prefs.systemUpdates,
        createdAt: prefs.createdAt,
        updatedAt: prefs.updatedAt,
      });
    }

    return prefs;
  }

  private toDomain(
    row: typeof notificationPreferences.$inferSelect,
  ): NotificationPreferences {
    return new NotificationPreferences(
      row.id,
      row.userId,
      row.emailNotifications,
      row.pushNotifications,
      row.smsNotifications,
      row.orderUpdates,
      row.promotions,
      row.securityAlerts,
      row.systemUpdates,
      row.createdAt,
      row.updatedAt,
    );
  }
}
