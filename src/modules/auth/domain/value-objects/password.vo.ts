import { DomainException } from '../../../../common/exceptions/domain.exception.js';

export class Password {
  private constructor() {}

  /**
   * Validates password strength rules:
   * - Min 8 chars
   * - At least 1 uppercase, 1 lowercase, 1 digit, 1 special char
   */
  static validate(password: string): void {
    if (password.length < 8) {
      throw new DomainException('Senha deve ter pelo menos 8 caracteres');
    }
    if (!/[A-Z]/.test(password)) {
      throw new DomainException(
        'Senha deve conter pelo menos uma letra maiúscula',
      );
    }
    if (!/[a-z]/.test(password)) {
      throw new DomainException(
        'Senha deve conter pelo menos uma letra minúscula',
      );
    }
    if (!/\d/.test(password)) {
      throw new DomainException('Senha deve conter pelo menos um número');
    }
    if (!/[@$!%*?&#]/.test(password)) {
      throw new DomainException(
        'Senha deve conter pelo menos um caractere especial (@$!%*?&#)',
      );
    }
  }
}
