import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  boolean,
  date,
  index,
} from 'drizzle-orm/pg-core';
import { userRoleEnum } from '../../../../../../common/database/enums.js';
import { tenants } from '../../../../../tenant/infrastructure/adapters/secondary/persistence/tenant.schema.js';

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).unique().notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    role: userRoleEnum('role').default('admin').notNull(),
    avatarUrl: varchar('avatar_url', { length: 500 }),
    phone: varchar('phone', { length: 20 }),
    cpf: varchar('cpf', { length: 14 }),
    birthDate: date('birth_date'),
    isActive: boolean('is_active').default(true).notNull(),

    // Fluxo Collaborator → User
    collaboratorId: uuid('collaborator_id'),
    mustResetPassword: boolean('must_reset_password').default(false).notNull(),

    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_users_tenant_id').on(table.tenantId),
    index('idx_users_email').on(table.email),
    index('idx_users_collaborator_id').on(table.collaboratorId),
  ],
);

export const userSessions = pgTable(
  'user_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    refreshToken: varchar('refresh_token', { length: 500 }).notNull(),
    device: varchar('device', { length: 255 }),
    ip: varchar('ip', { length: 45 }),
    userAgent: varchar('user_agent', { length: 500 }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_user_sessions_user_id').on(table.userId),
    index('idx_user_sessions_refresh_token').on(table.refreshToken),
  ],
);

export type UserInsert = typeof users.$inferInsert;
export type UserSelect = typeof users.$inferSelect;
export type UserSessionInsert = typeof userSessions.$inferInsert;
export type UserSessionSelect = typeof userSessions.$inferSelect;
