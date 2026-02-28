import { randomUUID } from 'node:crypto';

export interface CreateSessionProps {
  userId: string;
  refreshToken: string;
  device?: string;
  ip?: string;
  userAgent?: string;
  expiresAt: Date;
}

export class UserSession {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly refreshToken: string,
    public readonly device: string | null,
    public readonly ip: string | null,
    public readonly userAgent: string | null,
    public readonly expiresAt: Date,
    public readonly createdAt: Date,
  ) {}

  static create(props: CreateSessionProps): UserSession {
    return new UserSession(
      randomUUID(),
      props.userId,
      props.refreshToken,
      props.device ?? null,
      props.ip ?? null,
      props.userAgent ?? null,
      props.expiresAt,
      new Date(),
    );
  }

  isExpired(): boolean {
    return this.expiresAt < new Date();
  }
}
