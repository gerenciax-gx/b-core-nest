import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  date,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import {
  collaboratorStatusEnum,
  collaboratorRoleEnum,
  collaboratorGenderEnum,
} from '../../../../../../common/database/enums.js';
import { tenants } from '../../../../../tenant/infrastructure/adapters/secondary/persistence/tenant.schema.js';

// ── Address / Work-schedule JSON shapes ───────────────────
export interface CollaboratorAddress {
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
}

export interface CollaboratorWorkSchedule {
  startTime: string; // HH:mm
  lunchStart: string;
  lunchEnd: string;
  endTime: string;
  workDays: string[]; // ['Seg','Ter', ...]
}

// ── Collaborators ─────────────────────────────────────────
export const collaborators = pgTable(
  'collaborators',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    cpf: varchar('cpf', { length: 14 }).notNull(),
    phone: varchar('phone', { length: 20 }).notNull(),
    birthDate: date('birth_date'),
    gender: collaboratorGenderEnum('gender').notNull(),
    timezone: varchar('timezone', { length: 50 }).default('America/Sao_Paulo').notNull(),
    status: collaboratorStatusEnum('status').default('active').notNull(),
    role: collaboratorRoleEnum('role').default('user').notNull(),
    avatarUrl: varchar('avatar_url', { length: 500 }),
    allToolsAccess: boolean('all_tools_access').default(false).notNull(),
    address: jsonb('address').$type<CollaboratorAddress>(),
    workSchedule: jsonb('work_schedule').$type<CollaboratorWorkSchedule>(),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_collaborators_tenant_id').on(table.tenantId),
    index('idx_collaborators_email').on(table.email),
    index('idx_collaborators_cpf').on(table.cpf),
    index('idx_collaborators_status').on(table.status),
  ],
);

// ── Tool Permissions ─────────────────────────────────────
export const collaboratorToolPermissions = pgTable(
  'collaborator_tool_permissions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    collaboratorId: uuid('collaborator_id')
      .references(() => collaborators.id, { onDelete: 'cascade' })
      .notNull(),
    toolId: varchar('tool_id', { length: 100 }).notNull(),
    hasAccess: boolean('has_access').default(true).notNull(),
    grantedAt: timestamp('granted_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_collab_perms_collaborator').on(table.collaboratorId),
    index('idx_collab_perms_tool').on(table.toolId),
  ],
);

// ── Type Exports ──────────────────────────────────────────
export type CollaboratorInsert = typeof collaborators.$inferInsert;
export type CollaboratorSelect = typeof collaborators.$inferSelect;
export type CollaboratorToolPermissionInsert =
  typeof collaboratorToolPermissions.$inferInsert;
export type CollaboratorToolPermissionSelect =
  typeof collaboratorToolPermissions.$inferSelect;
