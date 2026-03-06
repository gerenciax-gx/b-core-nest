import { Inject, Injectable } from '@nestjs/common';
import { eq, and, ilike, sql, asc, desc, type SQL } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from '../../../../../../common/database/database.module.js';
import type { CollaboratorRepositoryPort } from '../../../../domain/ports/output/collaborator.repository.port.js';
import {
  Collaborator,
  type CollaboratorStatus,
  type CollaboratorRole,
  type CollaboratorGender,
  type CollaboratorAddress,
  type CollaboratorWorkSchedule,
} from '../../../../domain/entities/collaborator.entity.js';
import {
  collaborators,
  collaboratorToolPermissions,
} from './collaborator.schema.js';
import type { PaginationQuery } from '../../../../../../common/types/api-response.type.js';

@Injectable()
export class DrizzleCollaboratorRepository implements CollaboratorRepositoryPort{
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase,
  ) {}

  async save(collaborator: Collaborator): Promise<Collaborator> {
    await this.db.insert(collaborators).values({
      id: collaborator.id,
      tenantId: collaborator.tenantId,
      firstName: collaborator.firstName,
      lastName: collaborator.lastName,
      email: collaborator.email,
      cpf: collaborator.cpf,
      phone: collaborator.phone,
      gender: collaborator.gender,
      birthDate: collaborator.birthDate,
      timezone: collaborator.timezone,
      status: collaborator.status,
      role: collaborator.role,
      avatarUrl: collaborator.avatarUrl,
      allToolsAccess: collaborator.allToolsAccess,
      address: collaborator.address,
      workSchedule: collaborator.workSchedule,
      notes: collaborator.notes,
      createdAt: collaborator.createdAt,
      updatedAt: collaborator.updatedAt,
    });
    return collaborator;
  }

  async findById(id: string, tenantId: string): Promise<Collaborator | null> {
    const rows = await this.db
      .select()
      .from(collaborators)
      .where(
        and(eq(collaborators.id, id), eq(collaborators.tenantId, tenantId)),
      )
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    const entity = this.toDomain(row);
    const perms = await this.findToolPermissions(entity.id);
    entity.setToolPermissions(perms);
    return entity;
  }

  async findByEmail(email: string): Promise<Collaborator | null> {
    const rows = await this.db
      .select()
      .from(collaborators)
      .where(eq(collaborators.email, email.toLowerCase()))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    return this.toDomain(row);
  }

  async findByCpf(cpf: string, tenantId: string): Promise<Collaborator | null> {
    const cleanCpf = cpf.replace(/\D/g, '');
    const rows = await this.db
      .select()
      .from(collaborators)
      .where(
        and(
          eq(collaborators.cpf, cleanCpf),
          eq(collaborators.tenantId, tenantId),
        ),
      )
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    return this.toDomain(row);
  }

  async findAllByTenant(
    tenantId: string,
    pagination: PaginationQuery,
    filters?: { status?: string; search?: string },
  ): Promise<[Collaborator[], number]> {
    const { page = 1, limit = 20, sortBy, sortOrder = 'desc' } = pagination;
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [eq(collaborators.tenantId, tenantId)];

    if (filters?.status) {
      conditions.push(
        eq(
          collaborators.status,
          filters.status as CollaboratorStatus,
        ),
      );
    }

    if (filters?.search) {
      conditions.push(
        sql`(${ilike(collaborators.firstName, `%${filters.search}%`)} OR ${ilike(collaborators.lastName, `%${filters.search}%`)} OR ${ilike(collaborators.email, `%${filters.search}%`)})`,
      );
    }

    const whereClause = and(...conditions);

    const [countResult] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(collaborators)
      .where(whereClause);

    const total = countResult?.count ?? 0;

    const sortColumn = this.getSortColumn(sortBy);
    const orderFn = sortOrder === 'asc' ? asc : desc;

    const rows = await this.db
      .select()
      .from(collaborators)
      .where(whereClause)
      .orderBy(orderFn(sortColumn))
      .limit(limit)
      .offset(offset);

    return [rows.map((row) => this.toDomain(row)), total];
  }

  async update(collaborator: Collaborator): Promise<Collaborator> {
    await this.db
      .update(collaborators)
      .set({
        firstName: collaborator.firstName,
        lastName: collaborator.lastName,
        email: collaborator.email,
        cpf: collaborator.cpf,
        phone: collaborator.phone,
        gender: collaborator.gender,
        birthDate: collaborator.birthDate,
        timezone: collaborator.timezone,
        status: collaborator.status,
        role: collaborator.role,
        avatarUrl: collaborator.avatarUrl,
        allToolsAccess: collaborator.allToolsAccess,
        address: collaborator.address,
        workSchedule: collaborator.workSchedule,
        notes: collaborator.notes,
        updatedAt: collaborator.updatedAt,
      })
      .where(
        and(
          eq(collaborators.id, collaborator.id),
          eq(collaborators.tenantId, collaborator.tenantId),
        ),
      );
    return collaborator;
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await this.db
      .delete(collaborators)
      .where(
        and(eq(collaborators.id, id), eq(collaborators.tenantId, tenantId)),
      );
  }

  // ── Tool Permissions ────────────────────────────────────────

  async saveToolPermissions(
    collaboratorId: string,
    permissions: { toolId: string; hasAccess: boolean }[],
  ): Promise<void> {
    // Delete existing then insert new
    await this.db
      .delete(collaboratorToolPermissions)
      .where(eq(collaboratorToolPermissions.collaboratorId, collaboratorId));

    if (permissions.length > 0) {
      await this.db.insert(collaboratorToolPermissions).values(
        permissions.map((p) => ({
          collaboratorId,
          toolId: p.toolId,
          hasAccess: p.hasAccess,
        })),
      );
    }
  }

  async findToolPermissions(
    collaboratorId: string,
  ): Promise<{ id: string; toolId: string; hasAccess: boolean }[]> {
    const rows = await this.db
      .select()
      .from(collaboratorToolPermissions)
      .where(eq(collaboratorToolPermissions.collaboratorId, collaboratorId));

    return rows.map((r) => ({
      id: r.id,
      toolId: r.toolId,
      hasAccess: r.hasAccess,
    }));
  }

  async hasToolPermission(
    collaboratorId: string,
    toolId: string,
  ): Promise<boolean> {
    const rows = await this.db
      .select()
      .from(collaboratorToolPermissions)
      .where(
        and(
          eq(collaboratorToolPermissions.collaboratorId, collaboratorId),
          eq(collaboratorToolPermissions.toolId, toolId),
          eq(collaboratorToolPermissions.hasAccess, true),
        ),
      )
      .limit(1);

    return rows.length > 0;
  }

  // ── Private ─────────────────────────────────────────────────

  private getSortColumn(sortBy?: string) {
    const sortMap: Record<string, unknown> = {
      firstName: collaborators.firstName,
      lastName: collaborators.lastName,
      email: collaborators.email,
      status: collaborators.status,
      role: collaborators.role,
      createdAt: collaborators.createdAt,
    };
    return (sortMap[sortBy ?? 'createdAt'] ?? collaborators.createdAt) as typeof collaborators.createdAt;
  }

  private toDomain(row: typeof collaborators.$inferSelect): Collaborator {
    return Collaborator.reconstitute({
      id: row.id,
      tenantId: row.tenantId,
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      cpf: row.cpf,
      phone: row.phone,
      gender: row.gender as CollaboratorGender,
      birthDate: row.birthDate,
      timezone: row.timezone,
      status: row.status as CollaboratorStatus,
      role: row.role as CollaboratorRole,
      avatarUrl: row.avatarUrl,
      allToolsAccess: row.allToolsAccess,
      address: row.address as CollaboratorAddress | null,
      workSchedule: row.workSchedule as CollaboratorWorkSchedule | null,
      notes: row.notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
