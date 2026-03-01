import {
  pgTable,
  uuid,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';
import { users } from '../../../../../auth/infrastructure/adapters/secondary/persistence/user.schema.js';

export const notificationPreferences = pgTable('notification_preferences', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  emailNotifications: boolean('email_notifications').default(true).notNull(),
  pushNotifications: boolean('push_notifications').default(true).notNull(),
  smsNotifications: boolean('sms_notifications').default(false).notNull(),
  orderUpdates: boolean('order_updates').default(true).notNull(),
  promotions: boolean('promotions').default(false).notNull(),
  securityAlerts: boolean('security_alerts').default(true).notNull(),
  systemUpdates: boolean('system_updates').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type NotificationPreferencesInsert = typeof notificationPreferences.$inferInsert;
export type NotificationPreferencesSelect = typeof notificationPreferences.$inferSelect;
