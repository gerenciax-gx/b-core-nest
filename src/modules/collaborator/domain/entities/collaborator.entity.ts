import { randomUUID } from 'node:crypto';
import { DomainException } from '../../../../common/exceptions/domain.exception.js';

// ── Types ───────────────────────────────────────────────────
export type CollaboratorStatus = 'active' | 'inactive' | 'on_leave' | 'away';
export type CollaboratorRole = 'admin' | 'user';
export type CollaboratorGender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

export interface CollaboratorAddress {
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
}

export interface CollaboratorWorkSchedule {
  startTime: string; // HH:mm
  lunchStart: string;
  lunchEnd: string;
  endTime: string;
  workDays: string[]; // ['Seg','Ter', ...]
}

export interface ToolPermissionData {
  id: string;
  toolId: string;
  hasAccess: boolean;
}

export interface CreateCollaboratorProps {
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  cpf: string;
  phone: string;
  gender: CollaboratorGender;
  birthDate?: string;
  timezone?: string;
  role?: CollaboratorRole;
  allToolsAccess?: boolean;
  address?: CollaboratorAddress;
  workSchedule?: CollaboratorWorkSchedule;
  notes?: string;
}

// ── Entity ──────────────────────────────────────────────────
export class Collaborator {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    private _firstName: string,
    private _lastName: string,
    private _email: string,
    private _cpf: string,
    private _phone: string,
    private _gender: CollaboratorGender,
    private _birthDate: string | null,
    private _timezone: string,
    private _status: CollaboratorStatus,
    private _role: CollaboratorRole,
    private _avatarUrl: string | null,
    private _allToolsAccess: boolean,
    private _address: CollaboratorAddress | null,
    private _workSchedule: CollaboratorWorkSchedule | null,
    private _notes: string | null,
    public readonly createdAt: Date,
    private _updatedAt: Date,
    // In-memory aggregates
    private _toolPermissions: ToolPermissionData[] = [],
  ) {}

  // ── Factory ───────────────────────────────────────────────
  static create(props: CreateCollaboratorProps): Collaborator {
    if (!props.firstName?.trim()) {
      throw new DomainException('Nome é obrigatório');
    }
    if (!props.lastName?.trim()) {
      throw new DomainException('Sobrenome é obrigatório');
    }
    if (!props.email?.trim()) {
      throw new DomainException('Email é obrigatório');
    }
    if (!props.cpf?.trim()) {
      throw new DomainException('CPF é obrigatório');
    }
    if (!props.phone?.trim()) {
      throw new DomainException('Telefone é obrigatório');
    }

    const cpfDigits = props.cpf.replace(/\D/g, '');
    if (cpfDigits.length !== 11) {
      throw new DomainException('CPF deve ter 11 dígitos');
    }

    return new Collaborator(
      randomUUID(),
      props.tenantId,
      props.firstName.trim(),
      props.lastName.trim(),
      props.email.trim().toLowerCase(),
      cpfDigits,
      props.phone.trim(),
      props.gender,
      props.birthDate ?? null,
      props.timezone ?? 'America/Sao_Paulo',
      'active',
      props.role ?? 'user',
      null,
      props.allToolsAccess ?? false,
      props.address ?? null,
      props.workSchedule ?? null,
      props.notes?.trim() ?? null,
      new Date(),
      new Date(),
    );
  }

  // ── Reconstitution (from DB) ──────────────────────────────
  static reconstitute(data: {
    id: string;
    tenantId: string;
    firstName: string;
    lastName: string;
    email: string;
    cpf: string;
    phone: string;
    gender: CollaboratorGender;
    birthDate: string | null;
    timezone: string;
    status: CollaboratorStatus;
    role: CollaboratorRole;
    avatarUrl: string | null;
    allToolsAccess: boolean;
    address: CollaboratorAddress | null;
    workSchedule: CollaboratorWorkSchedule | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): Collaborator {
    return new Collaborator(
      data.id,
      data.tenantId,
      data.firstName,
      data.lastName,
      data.email,
      data.cpf,
      data.phone,
      data.gender,
      data.birthDate,
      data.timezone,
      data.status,
      data.role,
      data.avatarUrl,
      data.allToolsAccess,
      data.address,
      data.workSchedule,
      data.notes,
      data.createdAt,
      data.updatedAt,
    );
  }

  // ── Getters ───────────────────────────────────────────────
  get firstName(): string { return this._firstName; }
  get lastName(): string { return this._lastName; }
  get fullName(): string { return `${this._firstName} ${this._lastName}`; }
  get email(): string { return this._email; }
  get cpf(): string { return this._cpf; }
  get phone(): string { return this._phone; }
  get gender(): CollaboratorGender { return this._gender; }
  get birthDate(): string | null { return this._birthDate; }
  get timezone(): string { return this._timezone; }
  get status(): CollaboratorStatus { return this._status; }
  get role(): CollaboratorRole { return this._role; }
  get avatarUrl(): string | null { return this._avatarUrl; }
  get allToolsAccess(): boolean { return this._allToolsAccess; }
  get address(): CollaboratorAddress | null { return this._address; }
  get workSchedule(): CollaboratorWorkSchedule | null { return this._workSchedule; }
  get notes(): string | null { return this._notes; }
  get updatedAt(): Date { return this._updatedAt; }
  get toolPermissions(): ToolPermissionData[] { return this._toolPermissions; }

  // ── Setters for aggregates ────────────────────────────────
  setToolPermissions(perms: ToolPermissionData[]): void {
    this._toolPermissions = perms;
  }

  // ── Behaviors ─────────────────────────────────────────────
  update(data: Partial<Omit<CreateCollaboratorProps, 'tenantId'>>): void {
    if (data.firstName !== undefined) {
      if (!data.firstName.trim()) throw new DomainException('Nome é obrigatório');
      this._firstName = data.firstName.trim();
    }
    if (data.lastName !== undefined) {
      if (!data.lastName.trim()) throw new DomainException('Sobrenome é obrigatório');
      this._lastName = data.lastName.trim();
    }
    if (data.email !== undefined) {
      this._email = data.email.trim().toLowerCase();
    }
    if (data.cpf !== undefined) {
      const cpfDigits = data.cpf.replace(/\D/g, '');
      if (cpfDigits.length !== 11) throw new DomainException('CPF deve ter 11 dígitos');
      this._cpf = cpfDigits;
    }
    if (data.phone !== undefined) this._phone = data.phone.trim();
    if (data.gender !== undefined) this._gender = data.gender;
    if (data.birthDate !== undefined) this._birthDate = data.birthDate ?? null;
    if (data.timezone !== undefined) this._timezone = data.timezone;
    if (data.role !== undefined) this._role = data.role;
    if (data.allToolsAccess !== undefined) this._allToolsAccess = data.allToolsAccess;
    if (data.address !== undefined) this._address = data.address ?? null;
    if (data.workSchedule !== undefined) this._workSchedule = data.workSchedule ?? null;
    if (data.notes !== undefined) this._notes = data.notes?.trim() ?? null;
    this._updatedAt = new Date();
  }

  changeStatus(newStatus: CollaboratorStatus): void {
    if (this._status === newStatus) {
      throw new DomainException(`Colaborador já está com o status '${newStatus}'`);
    }
    this._status = newStatus;
    this._updatedAt = new Date();
  }

  isAdmin(): boolean {
    return this._role === 'admin';
  }

  isActive(): boolean {
    return this._status === 'active';
  }

  updateAvatar(url: string | null): void {
    this._avatarUrl = url;
    this._updatedAt = new Date();
  }
}
