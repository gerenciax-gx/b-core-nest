import { DomainException } from './domain.exception.js';

export class DuplicateEntityException extends DomainException {
  constructor(entity: string, field: string, value: string) {
    super(`${entity} com ${field} "${value}" já existe`, 'DUPLICATE_ENTITY');
  }
}
