export interface PasswordResetTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export interface PasswordResetTokenRepositoryPort {
  save(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<PasswordResetTokenRecord>;

  findByTokenHash(
    tokenHash: string,
  ): Promise<PasswordResetTokenRecord | null>;

  findByTokenHashForUpdate(
    tokenHash: string,
    tx: unknown,
  ): Promise<PasswordResetTokenRecord | null>;

  markAsUsed(id: string, tx?: unknown): Promise<void>;

  deleteExpiredByUserId(userId: string): Promise<void>;

  deleteAllByUserId(userId: string): Promise<void>;
}
