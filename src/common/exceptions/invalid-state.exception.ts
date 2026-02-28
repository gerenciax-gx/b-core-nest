import { DomainException } from './domain.exception.js';

export class InvalidStateException extends DomainException {
  constructor(message: string) {
    super(message, 'INVALID_STATE');
  }
}
