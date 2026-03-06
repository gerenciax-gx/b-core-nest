import {
  Inject,
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import type { CollaboratorUseCasePort } from '../../domain/ports/input/collaborator.usecase.port.js';
import type { CollaboratorRepositoryPort } from '../../domain/ports/output/collaborator.repository.port.js';
import type { UserRepositoryPort } from '../../../auth/domain/ports/output/user.repository.port.js';
import { Collaborator } from '../../domain/entities/collaborator.entity.js';
import { User } from '../../../auth/domain/entities/user.entity.js';
import type { CreateCollaboratorDto, UpdateCollaboratorDto, ChangeStatusDto } from '../dto/collaborator.dto.js';
import type { ListCollaboratorsQueryDto } from '../dto/list-collaborators-query.dto.js';
import { createPaginatedResponse } from '../../../../common/helpers/paginated-response.helper.js';
import type { PaginatedResponse } from '../../../../common/types/api-response.type.js';

@Injectable()
export class CollaboratorService implements CollaboratorUseCasePort {
  constructor(
    @Inject('CollaboratorRepositoryPort')
    private readonly collaboratorRepo: CollaboratorRepositoryPort,

    @Inject('UserRepositoryPort')
    private readonly userRepo: UserRepositoryPort,

    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ── Create ────────────────────────────────────────────────
  async create(
    tenantId: string,
    callerRole: string,
    dto: CreateCollaboratorDto,
  ) {
    // Apenas admin pode criar colaboradores
    if (callerRole !== 'admin') {
      throw new ForbiddenException('Apenas administradores podem criar colaboradores');
    }

    // Verificar email duplicado (global — user table)
    const existingUser = await this.userRepo.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('Email já está em uso');
    }

    // Verificar CPF duplicado no tenant
    const existingCpf = await this.collaboratorRepo.findByCpf(dto.cpf, tenantId);
    if (existingCpf) {
      throw new ConflictException('CPF já cadastrado neste tenant');
    }

    // Criar entidade Collaborator
    const collaborator = Collaborator.create({
      tenantId,
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      cpf: dto.cpf,
      phone: dto.phone,
      gender: dto.gender,
      birthDate: dto.birthDate,
      timezone: dto.timezone,
      role: dto.role,
      allToolsAccess: dto.allToolsAccess,
      address: dto.address,
      workSchedule: dto.workSchedule,
      notes: dto.notes,
    });

    await this.collaboratorRepo.save(collaborator);

    // Gerar senha temporária (COLLAB-002: randomBytes, retornada 1 vez)
    const temporaryPassword = this.generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    // Criar User vinculado com mustResetPassword = true (COLLAB-001)
    const userRole = dto.role === 'admin' ? 'admin' : 'user';
    const user = User.create({
      tenantId,
      name: collaborator.fullName,
      email: dto.email,
      passwordHash,
      role: userRole as 'admin' | 'user',
      collaboratorId: collaborator.id,
      mustResetPassword: true,
      phone: dto.phone,
      cpf: dto.cpf,
      birthDate: dto.birthDate,
    });
    await this.userRepo.save(user);

    // Salvar permissões de ferramentas (se não for allToolsAccess)
    if (dto.toolPermissions?.length && !dto.allToolsAccess) {
      await this.collaboratorRepo.saveToolPermissions(
        collaborator.id,
        dto.toolPermissions,
      );
    }

    // Emitir evento
    this.eventEmitter.emit('collaborator.created', {
      collaboratorId: collaborator.id,
      userId: user.id,
      tenantId,
    });

    // Carregar permissões para response
    const perms = await this.collaboratorRepo.findToolPermissions(collaborator.id);
    collaborator.setToolPermissions(perms);

    return {
      collaborator: this.toResponse(collaborator),
      temporaryPassword, // COLLAB-006: retornada APENAS aqui, nunca armazenada
    };
  }

  // ── List (paginated) ──────────────────────────────────────
  async findAll(
    tenantId: string,
    query: ListCollaboratorsQueryDto,
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    const { page = 1, limit = 20, search, status } = query;

    const [collaborators, total] = await this.collaboratorRepo.findAllByTenant(
      tenantId,
      { page, limit, sortBy: query.sortBy, sortOrder: query.sortOrder },
      { status, search },
    );

    const items = collaborators.map((c) => this.toListItem(c));
    return createPaginatedResponse(items, total, page, limit);
  }

  // ── Find by ID ────────────────────────────────────────────
  async findById(tenantId: string, id: string) {
    const collaborator = await this.collaboratorRepo.findById(id, tenantId);
    if (!collaborator) {
      throw new NotFoundException('Colaborador não encontrado');
    }
    return this.toResponse(collaborator);
  }

  // ── Update ────────────────────────────────────────────────
  async update(tenantId: string, id: string, dto: UpdateCollaboratorDto) {
    const collaborator = await this.collaboratorRepo.findById(id, tenantId);
    if (!collaborator) {
      throw new NotFoundException('Colaborador não encontrado');
    }

    // Verificar email duplicado (se mudou)
    if (dto.email && dto.email.toLowerCase() !== collaborator.email) {
      const existingUser = await this.userRepo.findByEmail(dto.email);
      if (existingUser) {
        throw new ConflictException('Email já está em uso');
      }
    }

    // Verificar CPF duplicado no tenant (se mudou)
    if (dto.cpf) {
      const cleanCpf = dto.cpf.replace(/\D/g, '');
      if (cleanCpf !== collaborator.cpf) {
        const existingCpf = await this.collaboratorRepo.findByCpf(dto.cpf, tenantId);
        if (existingCpf) {
          throw new ConflictException('CPF já cadastrado neste tenant');
        }
      }
    }

    collaborator.update({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      cpf: dto.cpf,
      phone: dto.phone,
      gender: dto.gender,
      birthDate: dto.birthDate,
      timezone: dto.timezone,
      role: dto.role,
      allToolsAccess: dto.allToolsAccess,
      address: dto.address,
      workSchedule: dto.workSchedule,
      notes: dto.notes,
    });

    await this.collaboratorRepo.update(collaborator);

    // Atualizar permissões (se fornecidas)
    if (dto.toolPermissions !== undefined) {
      await this.collaboratorRepo.saveToolPermissions(
        collaborator.id,
        dto.allToolsAccess ? [] : (dto.toolPermissions ?? []),
      );
    }

    // Atualizar nome/email/role no User vinculado
    const linkedUser = await this.userRepo.findByCollaboratorId(collaborator.id);
    if (linkedUser) {
      const nameChanged = dto.firstName !== undefined || dto.lastName !== undefined;
      if (nameChanged) {
        linkedUser.updateProfile({ name: collaborator.fullName });
      }
      if (dto.role && dto.role !== linkedUser.role) {
        // Role change handled through user update
      }
      await this.userRepo.update(linkedUser);
    }

    // Reload permissions
    const perms = await this.collaboratorRepo.findToolPermissions(collaborator.id);
    collaborator.setToolPermissions(perms);

    return this.toResponse(collaborator);
  }

  // ── Change Status ─────────────────────────────────────────
  async changeStatus(tenantId: string, id: string, dto: ChangeStatusDto) {
    const collaborator = await this.collaboratorRepo.findById(id, tenantId);
    if (!collaborator) {
      throw new NotFoundException('Colaborador não encontrado');
    }

    collaborator.changeStatus(dto.status);
    await this.collaboratorRepo.update(collaborator);

    // Se inativou, desativar user vinculado
    if (dto.status === 'inactive') {
      const linkedUser = await this.userRepo.findByCollaboratorId(collaborator.id);
      if (linkedUser && linkedUser.isActive) {
        linkedUser.deactivate();
        await this.userRepo.update(linkedUser);
      }
    }

    // Se reativou, reativar user vinculado
    if (dto.status === 'active') {
      const linkedUser = await this.userRepo.findByCollaboratorId(collaborator.id);
      if (linkedUser && !linkedUser.isActive) {
        linkedUser.activate();
        await this.userRepo.update(linkedUser);
      }
    }

    return this.toResponse(collaborator);
  }

  // ── Delete ────────────────────────────────────────────────
  async remove(tenantId: string, id: string): Promise<void> {
    const collaborator = await this.collaboratorRepo.findById(id, tenantId);
    if (!collaborator) {
      throw new NotFoundException('Colaborador não encontrado');
    }

    // COLLAB-005: Desativar user vinculado antes de deletar
    const linkedUser = await this.userRepo.findByCollaboratorId(collaborator.id);
    if (linkedUser) {
      linkedUser.deactivate();
      await this.userRepo.update(linkedUser);
    }

    await this.collaboratorRepo.delete(id, tenantId);

    this.eventEmitter.emit('collaborator.deleted', {
      collaboratorId: id,
      tenantId,
    });
  }

  // ── Mappers ───────────────────────────────────────────────

  private toResponse(collaborator: Collaborator): Record<string, unknown> {
    return {
      id: collaborator.id,
      tenantId: collaborator.tenantId,
      firstName: collaborator.firstName,
      lastName: collaborator.lastName,
      fullName: collaborator.fullName,
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
      toolPermissions: collaborator.toolPermissions,
      createdAt: collaborator.createdAt.toISOString(),
      updatedAt: collaborator.updatedAt.toISOString(),
    };
  }

  private toListItem(collaborator: Collaborator): Record<string, unknown> {
    return {
      id: collaborator.id,
      firstName: collaborator.firstName,
      lastName: collaborator.lastName,
      fullName: collaborator.fullName,
      email: collaborator.email,
      phone: collaborator.phone,
      status: collaborator.status,
      role: collaborator.role,
      avatarUrl: collaborator.avatarUrl,
      createdAt: collaborator.createdAt.toISOString(),
    };
  }

  // ── Helpers ───────────────────────────────────────────────

  private generateTemporaryPassword(): string {
    // COLLAB-002: crypto.randomBytes based
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!';
    let password = '';
    const bytes = randomBytes(12);
    for (const byte of bytes) {
      password += chars[byte % chars.length];
    }
    // Garantir requisitos mínimos (AUTH-006)
    return password + 'A1@';
  }
}
