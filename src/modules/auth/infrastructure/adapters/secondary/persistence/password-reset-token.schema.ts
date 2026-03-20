import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './user.schema.js';

export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    tokenHash: varchar('token_hash', { length: 255 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_password_reset_tokens_user_id').on(table.userId),
    index('idx_password_reset_tokens_token_hash').on(table.tokenHash),
  ],
);

export type PasswordResetTokenInsert =
  typeof passwordResetTokens.$inferInsert;
export type PasswordResetTokenSelect =
  typeof passwordResetTokens.$inferSelect;
