import type {
  CreateCollaboratorDto,
  UpdateCollaboratorDto,
  ChangeStatusDto,
} from '../../../application/dto/collaborator.dto.js';
import type { ListCollaboratorsQueryDto } from '../../../application/dto/list-collaborators-query.dto.js';
import type { PaginatedResponse } from '../../../../../common/types/api-response.type.js';

export interface CollaboratorUseCasePort {
  create(
    tenantId: string,
    dto: CreateCollaboratorDto,
  ): Promise<{ collaborator: Record<string, unknown>; temporaryPassword: string }>;
  findAll(
    tenantId: string,
    query: ListCollaboratorsQueryDto,
  ): Promise<PaginatedResponse<Record<string, unknown>>>;
  findById(tenantId: string, id: string): Promise<Record<string, unknown>>;
  update(
    tenantId: string,
    id: string,
    dto: UpdateCollaboratorDto,
  ): Promise<Record<string, unknown>>;
  changeStatus(
    tenantId: string,
    id: string,
    dto: ChangeStatusDto,
  ): Promise<Record<string, unknown>>;
  remove(tenantId: string, id: string): Promise<void>;
}
