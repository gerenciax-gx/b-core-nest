import { randomUUID } from 'node:crypto';
import { DomainException } from '../../../../common/exceptions/domain.exception.js';
import { Email } from '../value-objects/email.vo.js';

export type UserRole = 'master' | 'admin' | 'user';
export const VALID_USER_ROLES: readonly UserRole[] = ['master', 'admin', 'user'];

export interface CreateUserProps {
  tenantId: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  collaboratorId?: string;
  mustResetPassword?: boolean;
  phone?: string;
  cpf?: string;
  birthDate?: string;
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
    private _phone: string | null,
    private _cpf: string | null,
    private _birthDate: string | null,
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
      props.phone ?? null,
      props.cpf ?? null,
      props.birthDate ?? null,
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
    phone: string | null;
    cpf: string | null;
    birthDate: string | null;
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
      data.phone,
      data.cpf,
      data.birthDate,
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
  get phone(): string | null {
    return this._phone;
  }
  get cpf(): string | null {
    return this._cpf;
  }
  get birthDate(): string | null {
    return this._birthDate;
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

  updateProfile(data: {
    name?: string;
    avatarUrl?: string;
    phone?: string | null;
    cpf?: string | null;
    birthDate?: string | null;
  }): void {
    const name = data.name ?? this._name;
    if (!name || name.trim().length < 2) {
      throw new DomainException('Nome deve ter pelo menos 2 caracteres');
    }
    this._name = name.trim();
    if (data.avatarUrl !== undefined) {
      this._avatarUrl = data.avatarUrl;
    }
    if (data.phone !== undefined) {
      this._phone = data.phone;
    }
    if (data.cpf !== undefined) {
      this._cpf = data.cpf;
    }
    if (data.birthDate !== undefined) {
      this._birthDate = data.birthDate;
    }
    this._updatedAt = new Date();
  }

  isAdmin(): boolean {
    return this._role === 'admin';
  }

  isMaster(): boolean {
    return this._role === 'master';
  }

  isCollaboratorUser(): boolean {
    return this._collaboratorId !== null;
  }
}
