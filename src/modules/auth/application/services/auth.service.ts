import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { TokenServicePort } from '../../domain/ports/output/token-service.port.js';
import type { EventBusPort } from '../../../../common/types/event-bus.port.js';
import * as bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'node:crypto';
import type {
  AuthUseCasePort,
  AuthTokens,
  SignupInput,
  LoginInput,
} from '../../domain/ports/input/auth.usecase.port.js';
import type { UserRepositoryPort } from '../../domain/ports/output/user.repository.port.js';
import type { SessionRepositoryPort } from '../../domain/ports/output/session.repository.port.js';
import type { PasswordResetTokenRepositoryPort } from '../../domain/ports/output/password-reset-token.repository.port.js';
import type { EmailSenderPort } from '../../../notification/domain/ports/output/email-sender.port.js';
import { resetPasswordEmail } from '../../../notification/infrastructure/adapters/secondary/email/email-templates.js';
import type { TenantRepositoryPort } from '../../../tenant/domain/ports/output/tenant.repository.port.js';
import { User } from '../../domain/entities/user.entity.js';
import { UserSession } from '../../domain/entities/user-session.entity.js';
import { Tenant } from '../../../tenant/domain/entities/tenant.entity.js';
import { Password } from '../../domain/value-objects/password.vo.js';
import { UserResponseDto } from '../dtos/user-response.dto.js';
import { TransactionManager } from '../../../../common/database/transaction.helper.js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService implements AuthUseCasePort {
  private readonly bcryptRounds: number;
  private readonly refreshTokenDays: number;
  private readonly resetTokenHours: number;

  constructor(
    @Inject('UserRepositoryPort')
    private readonly userRepo: UserRepositoryPort,

    @Inject('SessionRepositoryPort')
    private readonly sessionRepo: SessionRepositoryPort,

    @Inject('TenantRepositoryPort')
    private readonly tenantRepo: TenantRepositoryPort,

    @Inject('PasswordResetTokenRepositoryPort')
    private readonly resetTokenRepo: PasswordResetTokenRepositoryPort,

    @Inject('EmailSenderPort')
    private readonly emailSender: EmailSenderPort,

    @Inject('TokenServicePort')
    private readonly tokenService: TokenServicePort,

    @Inject('EventBusPort')
    private readonly eventBus: EventBusPort,

    @Inject('FRONTEND_URL')
    private readonly frontendUrl: string,

    private readonly transactionManager: TransactionManager,
    private readonly configService: ConfigService,
  ) {
    this.bcryptRounds = this.configService.get<number>('auth.bcryptRounds', 12);
    this.refreshTokenDays = this.configService.get<number>('auth.refreshTokenDays', 30);
    this.resetTokenHours = this.configService.get<number>('auth.resetTokenHours', 1);
  }

  async signup(
    input: SignupInput,
  ): Promise<{ user: UserResponseDto; tokens: AuthTokens }> {
    // 1. Validar senha
    Password.validate(input.password);

    // 1b. Validar confirmação de senha
    if (input.passwordConfirm && input.password !== input.passwordConfirm) {
      throw new BadRequestException('As senhas não conferem');
    }

    // 2. Verificar email duplicado
    const existing = await this.userRepo.findByEmail(input.email);
    if (existing) {
      throw new ConflictException('Email já está em uso');
    }

    // 3. Criar Tenant + User atomicamente
    const tenant = Tenant.create({
      companyName: input.companyName,
      companyType: input.companyType,
    });

    const passwordHash = await bcrypt.hash(input.password, this.bcryptRounds);
    const user = User.create({
      tenantId: tenant.id,
      name: input.name,
      email: input.email,
      passwordHash,
      role: 'admin',
    });

    await this.transactionManager.run(async (tx) => {
      await this.tenantRepo.save(tenant, tx);
      await this.userRepo.save(user, tx);
    });

    // 5. Gerar tokens + salvar sessão
    const tokens = await this.generateTokens(user);
    const session = UserSession.create({
      userId: user.id,
      refreshToken: tokens.refreshToken,
      device: input.device,
      ip: input.ip,
      userAgent: input.userAgent,
      expiresAt: this.refreshTokenExpiresAt(),
    });
    await this.sessionRepo.save(session);

    // 6. Emitir evento
    this.eventBus.emit('user.signup', {
      userId: user.id,
      tenantId: tenant.id,
    });

    return {
      user: UserResponseDto.from(user),
      tokens,
    };
  }

  async login(
    input: LoginInput,
  ): Promise<{ user: UserResponseDto; tokens: AuthTokens }> {
    // 1. Buscar user
    const user = await this.userRepo.findByEmail(input.email);
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // 2. Verificar se está ativo
    if (!user.isActive) {
      throw new UnauthorizedException(
        'Conta desativada. Entre em contato com o administrador',
      );
    }

    // 3. Verificar senha
    const isPasswordValid = await bcrypt.compare(
      input.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // 4. Atualizar last login
    user.updateLastLogin();
    await this.userRepo.update(user);

    // 5. Gerar tokens + salvar sessão
    const tokens = await this.generateTokens(user);
    const session = UserSession.create({
      userId: user.id,
      refreshToken: tokens.refreshToken,
      device: input.device,
      ip: input.ip,
      userAgent: input.userAgent,
      expiresAt: this.refreshTokenExpiresAt(),
    });
    await this.sessionRepo.save(session);

    // 6. Emitir evento de login se IP/device for novo
    const previousSessions = await this.sessionRepo.findByUserId(user.id);
    const isKnownDevice = previousSessions.some(
      (s) => s.id !== session.id && s.ip === input.ip,
    );
    if (!isKnownDevice && input.ip) {
      this.eventBus.emit('user.login', {
        userId: user.id,
        tenantId: user.tenantId,
        ip: input.ip,
        device: input.device ?? input.userAgent ?? 'Desconhecido',
        userAgent: input.userAgent,
      });
    }

    return {
      user: UserResponseDto.from(user),
      tokens,
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    // 1. Buscar sessão
    const session = await this.sessionRepo.findByRefreshToken(refreshToken);
    if (!session || session.isExpired()) {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

    // 2. Reuse detection — se o token já foi revogado, é roubo de token
    if (session.isRevoked) {
      // Revogar TODAS as sessões do usuário (medida de segurança)
      await this.sessionRepo.deleteAllByUserId(session.userId);
      throw new UnauthorizedException(
        'Refresh token já utilizado. Todas as sessões foram encerradas por segurança.',
      );
    }

    // 3. Buscar user
    const user = await this.userRepo.findById(session.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuário não encontrado ou desativado');
    }

    // 4. Revogar sessão atual (rotation) — marcar como revogada em vez de deletar
    await this.sessionRepo.revokeByRefreshToken(refreshToken);

    // 5. Gerar novos tokens + nova sessão
    const tokens = await this.generateTokens(user);
    const newSession = UserSession.create({
      userId: user.id,
      refreshToken: tokens.refreshToken,
      device: session.device ?? undefined,
      ip: session.ip ?? undefined,
      userAgent: session.userAgent ?? undefined,
      expiresAt: this.refreshTokenExpiresAt(),
    });
    await this.sessionRepo.save(newSession);

    return tokens;
  }

  async logout(refreshToken: string): Promise<void> {
    await this.sessionRepo.deleteByRefreshToken(refreshToken);
  }

  async resetPassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    // Validar senha atual
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new BadRequestException('Senha atual incorreta');
    }

    // Validar nova senha
    Password.validate(newPassword);

    // Alterar senha
    const newHash = await bcrypt.hash(newPassword, this.bcryptRounds);
    user.changePassword(newHash);
    await this.userRepo.update(user);

    // Revogar todas as sessões (forçar re-login)
    await this.sessionRepo.deleteAllByUserId(userId);

    this.eventBus.emit('user.password-reset', { userId: user.id });
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.userRepo.findByEmail(email);
    // Always return success to prevent email enumeration
    if (!user || !user.isActive) return;

    // Invalidate ALL existing tokens for this user (only the latest should be valid)
    await this.resetTokenRepo.deleteAllByUserId(user.id);

    // Generate a secure random token
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(
      Date.now() + this.resetTokenHours * 60 * 60 * 1000,
    );

    await this.resetTokenRepo.save(user.id, tokenHash, expiresAt);

    // Build password reset link
    const resetLink = `${this.frontendUrl}/auth/reset-password?token=${rawToken}`;

    await this.emailSender.send({
      to: user.email,
      subject: 'Redefinir sua senha — GerenciaX',
      html: resetPasswordEmail(user.name, resetLink),
    });
  }

  async verifyResetToken(token: string): Promise<{ valid: boolean }> {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const record = await this.resetTokenRepo.findByTokenHash(tokenHash);

    if (!record || record.expiresAt < new Date()) {
      return { valid: false };
    }

    return { valid: true };
  }

  async confirmPasswordReset(
    token: string,
    newPassword: string,
  ): Promise<void> {
    const tokenHash = createHash('sha256').update(token).digest('hex');

    await this.transactionManager.run(async (tx) => {
      // SELECT FOR UPDATE to prevent concurrent use of the same token
      const record = await this.resetTokenRepo.findByTokenHashForUpdate(tokenHash, tx);

      if (!record || record.expiresAt < new Date()) {
        throw new BadRequestException('Token inválido ou expirado');
      }

      const user = await this.userRepo.findById(record.userId);
      if (!user || !user.isActive) {
        throw new BadRequestException('Token inválido ou expirado');
      }

      Password.validate(newPassword);

      const newHash = await bcrypt.hash(newPassword, this.bcryptRounds);
      user.changePassword(newHash);
      await this.userRepo.update(user);

      // Mark token as used
      await this.resetTokenRepo.markAsUsed(record.id, tx);

      // Revoke all sessions
      await this.sessionRepo.deleteAllByUserId(user.id);
    });

    this.eventBus.emit('user.password-reset', {});
  }

  // ── Private ───────────────────────────────────────────────

  private async generateTokens(user: User): Promise<AuthTokens> {
    const payload = {
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
      mustResetPassword: user.mustResetPassword,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.tokenService.sign(payload),
      Promise.resolve(this.generateRefreshToken()),
    ]);

    return { accessToken, refreshToken };
  }

  private generateRefreshToken(): string {
    return randomBytes(64).toString('hex');
  }

  private refreshTokenExpiresAt(): Date {
    return new Date(Date.now() + this.refreshTokenDays * 24 * 60 * 60 * 1000);
  }

}
