import { User } from '../../entities/user.entity.js';
import type { DbClient } from '../../../../../common/database/transaction.helper.js';

export interface UserRepositoryPort {
  save(user: User, tx?: DbClient): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByTenantId(tenantId: string): Promise<User[]>;
  findByCollaboratorId(collaboratorId: string): Promise<User | null>;
  update(user: User): Promise<User>;
  delete(id: string, tx?: DbClient): Promise<void>;
}
