import { DomainException } from './domain.exception.js';

export class EntityNotFoundException extends DomainException {
  constructor(entity: string, id: string) {
    super(`${entity} com ID ${id} não encontrado`, 'ENTITY_NOT_FOUND');
  }
}
