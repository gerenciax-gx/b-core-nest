import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull, lt, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from '../../../../../../common/database/database.module.js';
import type { DbClient } from '../../../../../../common/database/transaction.helper.js';
import type {
  PasswordResetTokenRepositoryPort,
  PasswordResetTokenRecord,
} from '../../../../domain/ports/output/password-reset-token.repository.port.js';
import { passwordResetTokens } from './password-reset-token.schema.js';

@Injectable()
export class DrizzlePasswordResetTokenRepository
  implements PasswordResetTokenRepositoryPort
{
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase,
  ) {}

  async save(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<PasswordResetTokenRecord> {
    const [row] = await this.db
      .insert(passwordResetTokens)
      .values({ userId, tokenHash, expiresAt })
      .returning();
    return this.toRecord(row!);
  }

  async findByTokenHash(
    tokenHash: string,
  ): Promise<PasswordResetTokenRecord | null> {
    const [row] = await this.db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.tokenHash, tokenHash),
          isNull(passwordResetTokens.usedAt),
        ),
      )
      .limit(1);
    return row ? this.toRecord(row) : null;
  }

  async findByTokenHashForUpdate(
    tokenHash: string,
    tx: unknown,
  ): Promise<PasswordResetTokenRecord | null> {
    const db = tx as DbClient;
    const rows = await db.execute(
      sql`SELECT * FROM password_reset_tokens WHERE token_hash = ${tokenHash} AND used_at IS NULL LIMIT 1 FOR UPDATE`,
    );
    const row = (rows as unknown as { rows: Array<Record<string, unknown>> }).rows?.[0];
    if (!row) return null;
    return {
      id: row['id'] as string,
      userId: row['user_id'] as string,
      tokenHash: row['token_hash'] as string,
      expiresAt: new Date(row['expires_at'] as string),
      usedAt: row['used_at'] ? new Date(row['used_at'] as string) : null,
      createdAt: new Date(row['created_at'] as string),
    };
  }

  async markAsUsed(id: string, tx?: unknown): Promise<void> {
    const db = (tx as DbClient) ?? this.db;
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, id));
  }

  async deleteExpiredByUserId(userId: string): Promise<void> {
    await this.db
      .delete(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.userId, userId),
          lt(passwordResetTokens.expiresAt, new Date()),
        ),
      );
  }

  async deleteAllByUserId(userId: string): Promise<void> {
    await this.db
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, userId));
  }

  private toRecord(
    row: typeof passwordResetTokens.$inferSelect,
  ): PasswordResetTokenRecord {
    return {
      id: row.id,
      userId: row.userId,
      tokenHash: row.tokenHash,
      expiresAt: row.expiresAt,
      usedAt: row.usedAt,
      createdAt: row.createdAt,
    };
  }
}
