import type { Collaborator } from '../../entities/collaborator.entity.js';
import type { PaginationQuery } from '../../../../../common/types/api-response.type.js';

export interface CollaboratorRepositoryPort {
  save(collaborator: Collaborator): Promise<Collaborator>;
  findById(id: string, tenantId: string): Promise<Collaborator | null>;
  findByEmail(email: string): Promise<Collaborator | null>;
  findByCpf(cpf: string, tenantId: string): Promise<Collaborator | null>;
  findAllByTenant(
    tenantId: string,
    pagination: PaginationQuery,
    filters?: { status?: string; search?: string },
  ): Promise<[Collaborator[], number]>;
  update(collaborator: Collaborator): Promise<Collaborator>;
  delete(id: string, tenantId: string): Promise<void>;

  // Tool permissions
  saveToolPermissions(
    collaboratorId: string,
    permissions: { toolId: string; hasAccess: boolean }[],
  ): Promise<void>;
  findToolPermissions(
    collaboratorId: string,
  ): Promise<{ id: string; toolId: string; hasAccess: boolean }[]>;
  hasToolPermission(collaboratorId: string, toolId: string): Promise<boolean>;
}
