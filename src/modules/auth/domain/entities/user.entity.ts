import { randomUUID } from 'node:crypto';
import { DomainException } from '../../../../common/exceptions/domain.exception.js';
import { Email } from '../value-objects/email.vo.js';

export type UserRole = 'admin' | 'user';

export interface CreateUserProps {
  tenantId: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  collaboratorId?: string;
  mustResetPassword?: boolean;
}

export class User {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    private _name: string,
    private _email: Email,
    private _passwordHash: string,
    private _role: UserRole,
    private _isActive: boolean,
    private _collaboratorId: string | null,
    private _mustResetPassword: boolean,
    private _avatarUrl: string | null,
    private _lastLoginAt: Date | null,
    public readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  // ── Factory ───────────────────────────────────────────────
  static create(props: CreateUserProps): User {
    const email = Email.create(props.email);
    return new User(
      randomUUID(),
      props.tenantId,
      props.name.trim(),
      email,
      props.passwordHash,
      props.role,
      true,
      props.collaboratorId ?? null,
      props.mustResetPassword ?? false,
      null,
      null,
      new Date(),
      new Date(),
    );
  }

  // ── Reconstitution (from DB) ──────────────────────────────
  static reconstitute(data: {
    id: string;
    tenantId: string;
    name: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    isActive: boolean;
    collaboratorId: string | null;
    mustResetPassword: boolean;
    avatarUrl: string | null;
    lastLoginAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): User {
    return new User(
      data.id,
      data.tenantId,
      data.name,
      Email.create(data.email),
      data.passwordHash,
      data.role,
      data.isActive,
      data.collaboratorId,
      data.mustResetPassword,
      data.avatarUrl,
      data.lastLoginAt,
      data.createdAt,
      data.updatedAt,
    );
  }

  // ── Getters ───────────────────────────────────────────────
  get name(): string {
    return this._name;
  }
  get email(): string {
    return this._email.value;
  }
  get passwordHash(): string {
    return this._passwordHash;
  }
  get role(): UserRole {
    return this._role;
  }
  get isActive(): boolean {
    return this._isActive;
  }
  get collaboratorId(): string | null {
    return this._collaboratorId;
  }
  get mustResetPassword(): boolean {
    return this._mustResetPassword;
  }
  get avatarUrl(): string | null {
    return this._avatarUrl;
  }
  get lastLoginAt(): Date | null {
    return this._lastLoginAt;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }

  // ── Behaviors ─────────────────────────────────────────────
  changePassword(newPasswordHash: string): void {
    if (!newPasswordHash) {
      throw new DomainException('Password hash não pode ser vazio');
    }
    this._passwordHash = newPasswordHash;
    this._mustResetPassword = false;
    this._updatedAt = new Date();
  }

  updateLastLogin(): void {
    this._lastLoginAt = new Date();
  }

  deactivate(): void {
    if (!this._isActive) {
      throw new DomainException('Usuário já está desativado');
    }
    this._isActive = false;
    this._updatedAt = new Date();
  }

  activate(): void {
    this._isActive = true;
    this._updatedAt = new Date();
  }

  updateProfile(name: string, avatarUrl?: string): void {
    if (!name || name.trim().length < 2) {
      throw new DomainException('Nome deve ter pelo menos 2 caracteres');
    }
    this._name = name.trim();
    if (avatarUrl !== undefined) {
      this._avatarUrl = avatarUrl;
    }
    this._updatedAt = new Date();
  }

  isAdmin(): boolean {
    return this._role === 'admin';
  }

  isCollaboratorUser(): boolean {
    return this._collaboratorId !== null;
  }
}
