import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';
import { users } from '../../../../../auth/infrastructure/adapters/secondary/persistence/user.schema.js';

export const userSettings = pgTable('user_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  theme: varchar('theme', { length: 20 }).default('system').notNull(),
  language: varchar('language', { length: 10 }).default('pt-BR').notNull(),
  fontSize: varchar('font_size', { length: 10 }).default('medium').notNull(),
  compactMode: boolean('compact_mode').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type UserSettingsInsert = typeof userSettings.$inferInsert;
export type UserSettingsSelect = typeof userSettings.$inferSelect;
