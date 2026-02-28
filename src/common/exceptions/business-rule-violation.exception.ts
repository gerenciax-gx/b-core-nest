import { DomainException } from './domain.exception.js';

export class BusinessRuleViolationException extends DomainException {
  constructor(message: string, code?: string) {
    super(message, code ?? 'BUSINESS_RULE_VIOLATION');
  }
}
