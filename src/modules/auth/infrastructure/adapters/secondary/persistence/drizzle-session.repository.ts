import { Inject, Injectable } from '@nestjs/common';
import { eq, lt } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from '../../../../../../common/database/database.module.js';
import type { DbClient } from '../../../../../../common/database/transaction.helper.js';
import { SessionRepositoryPort } from '../../../../domain/ports/output/session.repository.port.js';
import { UserSession } from '../../../../domain/entities/user-session.entity.js';
import { userSessions } from './user.schema.js';
import { hashToken } from '../../../../../../common/utils/crypto.util.js';

@Injectable()
export class DrizzleSessionRepository implements SessionRepositoryPort {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase,
  ) {}

  async save(session: UserSession): Promise<UserSession> {
    await this.db.insert(userSessions).values({
      id: session.id,
      userId: session.userId,
      refreshToken: hashToken(session.refreshToken),
      device: session.device,
      ip: session.ip,
      userAgent: session.userAgent,
      isRevoked: session.isRevoked,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
    });

    return session;
  }

  async findByRefreshToken(token: string): Promise<UserSession | null> {
    const tokenHash = hashToken(token);
    const rows = await this.db
      .select()
      .from(userSessions)
      .where(eq(userSessions.refreshToken, tokenHash))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    return this.toDomain(row);
  }

  async findByUserId(userId: string): Promise<UserSession[]> {
    const rows = await this.db
      .select()
      .from(userSessions)
      .where(eq(userSessions.userId, userId));

    return rows.map((row) => this.toDomain(row));
  }

  async deleteByRefreshToken(token: string): Promise<void> {
    const tokenHash = hashToken(token);
    await this.db
      .delete(userSessions)
      .where(eq(userSessions.refreshToken, tokenHash));
  }

  async revokeByRefreshToken(token: string): Promise<void> {
    const tokenHash = hashToken(token);
    await this.db
      .update(userSessions)
      .set({ isRevoked: true })
      .where(eq(userSessions.refreshToken, tokenHash));
  }

  async deleteAllByUserId(userId: string, tx?: DbClient): Promise<void> {
    const db = tx ?? this.db;
    await db.delete(userSessions).where(eq(userSessions.userId, userId));
  }

  async deleteExpired(): Promise<number> {
    const result = await this.db
      .delete(userSessions)
      .where(lt(userSessions.expiresAt, new Date()));

    return result.rowCount ?? 0;
  }

  private toDomain(row: typeof userSessions.$inferSelect): UserSession {
    return new UserSession(
      row.id,
      row.userId,
      row.refreshToken,
      row.device,
      row.ip,
      row.userAgent,
      row.isRevoked,
      row.expiresAt,
      row.createdAt,
    );
  }
}
