import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from '../../../../../../common/database/database.module.js';
import type { DbClient } from '../../../../../../common/database/transaction.helper.js';
import { UserRepositoryPort } from '../../../../domain/ports/output/user.repository.port.js';
import {
  User,
  type UserRole,
  VALID_USER_ROLES,
} from '../../../../domain/entities/user.entity.js';
import { users } from './user.schema.js';

@Injectable()
export class DrizzleUserRepository implements UserRepositoryPort {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase,
  ) {}

  async save(user: User, tx?: DbClient): Promise<User> {
    const db = tx ?? this.db;
    await db.insert(users).values({
      id: user.id,
      tenantId: user.tenantId,
      name: user.name,
      email: user.email,
      passwordHash: user.passwordHash,
      role: user.role,
      avatarUrl: user.avatarUrl,
      phone: user.phone,
      cpf: user.cpf,
      birthDate: user.birthDate,
      isActive: user.isActive,
      collaboratorId: user.collaboratorId,
      mustResetPassword: user.mustResetPassword,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });

    return user;
  }

  async findById(id: string): Promise<User | null> {
    const rows = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    return this.toDomain(row);
  }

  async findByEmail(email: string): Promise<User | null> {
    const rows = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    return this.toDomain(row);
  }

  async findByTenantId(tenantId: string): Promise<User[]> {
    const rows = await this.db
      .select()
      .from(users)
      .where(eq(users.tenantId, tenantId));

    return rows.map((row) => this.toDomain(row));
  }

  async findByCollaboratorId(collaboratorId: string): Promise<User | null> {
    const rows = await this.db
      .select()
      .from(users)
      .where(eq(users.collaboratorId, collaboratorId))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    return this.toDomain(row);
  }

  async update(user: User): Promise<User> {
    await this.db
      .update(users)
      .set({
        name: user.name,
        email: user.email,
        passwordHash: user.passwordHash,
        role: user.role,
        avatarUrl: user.avatarUrl,
        phone: user.phone,
        cpf: user.cpf,
        birthDate: user.birthDate,
        isActive: user.isActive,
        collaboratorId: user.collaboratorId,
        mustResetPassword: user.mustResetPassword,
        lastLoginAt: user.lastLoginAt,
        updatedAt: user.updatedAt,
      })
      .where(eq(users.id, user.id));

    return user;
  }

  async delete(id: string, tx?: DbClient): Promise<void> {
    const db = tx ?? this.db;
    await db.delete(users).where(eq(users.id, id));
  }

  private toDomain(row: typeof users.$inferSelect): User {
    const role = VALID_USER_ROLES.includes(row.role as UserRole)
      ? (row.role as UserRole)
      : 'user';
    return User.reconstitute({
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      email: row.email,
      passwordHash: row.passwordHash,
      role,
      isActive: row.isActive,
      collaboratorId: row.collaboratorId,
      mustResetPassword: row.mustResetPassword,
      avatarUrl: row.avatarUrl,
      phone: row.phone,
      cpf: row.cpf,
      birthDate: row.birthDate,
      lastLoginAt: row.lastLoginAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
