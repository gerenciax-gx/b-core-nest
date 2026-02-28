import { UserSession } from '../../entities/user-session.entity.js';

export interface SessionRepositoryPort {
  save(session: UserSession): Promise<UserSession>;
  findByRefreshToken(token: string): Promise<UserSession | null>;
  findByUserId(userId: string): Promise<UserSession[]>;
  deleteByRefreshToken(token: string): Promise<void>;
  deleteAllByUserId(userId: string): Promise<void>;
  deleteExpired(): Promise<number>;
}
