import { UserSession } from '../../entities/user-session.entity.js';
import type { DbClient } from '../../../../../common/database/transaction.helper.js';

export interface SessionRepositoryPort {
  save(session: UserSession): Promise<UserSession>;
  findByRefreshToken(token: string): Promise<UserSession | null>;
  findByUserId(userId: string): Promise<UserSession[]>;
  revokeByRefreshToken(token: string): Promise<void>;
  deleteByRefreshToken(token: string): Promise<void>;
  deleteAllByUserId(userId: string, tx?: DbClient): Promise<void>;
  deleteExpired(): Promise<number>;
}
