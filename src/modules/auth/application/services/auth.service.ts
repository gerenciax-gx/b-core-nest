import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import type {
  AuthUseCasePort,
  AuthTokens,
  SignupInput,
  LoginInput,
} from '../../domain/ports/input/auth.usecase.port.js';
import type { UserRepositoryPort } from '../../domain/ports/output/user.repository.port.js';
import type { SessionRepositoryPort } from '../../domain/ports/output/session.repository.port.js';
import type { TenantRepositoryPort } from '../../../tenant/domain/ports/output/tenant.repository.port.js';
import { User } from '../../domain/entities/user.entity.js';
import { UserSession } from '../../domain/entities/user-session.entity.js';
import { Tenant } from '../../../tenant/domain/entities/tenant.entity.js';
import { Password } from '../../domain/value-objects/password.vo.js';
import { UserResponseDto } from '../dtos/user-response.dto.js';

const BCRYPT_ROUNDS = 12;
const REFRESH_TOKEN_DAYS = 30;

@Injectable()
export class AuthService implements AuthUseCasePort {
  constructor(
    @Inject('UserRepositoryPort')
    private readonly userRepo: UserRepositoryPort,

    @Inject('SessionRepositoryPort')
    private readonly sessionRepo: SessionRepositoryPort,

    @Inject('TenantRepositoryPort')
    private readonly tenantRepo: TenantRepositoryPort,

    private readonly jwtService: JwtService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async signup(
    input: SignupInput,
  ): Promise<{ user: UserResponseDto; tokens: AuthTokens }> {
    // 1. Validar senha
    Password.validate(input.password);

    // 2. Verificar email duplicado
    const existing = await this.userRepo.findByEmail(input.email);
    if (existing) {
      throw new ConflictException('Email já está em uso');
    }

    // 3. Criar Tenant
    const tenant = Tenant.create({
      companyName: input.companyName,
      companyType: input.companyType,
    });
    await this.tenantRepo.save(tenant);

    // 4. Criar User (admin)
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const user = User.create({
      tenantId: tenant.id,
      name: input.name,
      email: input.email,
      passwordHash,
      role: 'admin',
    });
    await this.userRepo.save(user);

    // 5. Gerar tokens
    const tokens = await this.generateTokens(user);

    // 6. Emitir evento
    this.eventEmitter.emit('user.signup', {
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

    // 2. Buscar user
    const user = await this.userRepo.findById(session.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuário não encontrado ou desativado');
    }

    // 3. Revogar sessão atual (rotation)
    await this.sessionRepo.deleteByRefreshToken(refreshToken);

    // 4. Gerar novos tokens + nova sessão
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
    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    user.changePassword(newHash);
    await this.userRepo.update(user);

    // Revogar todas as sessões (forçar re-login)
    await this.sessionRepo.deleteAllByUserId(userId);

    this.eventEmitter.emit('user.password-reset', { userId: user.id });
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
      this.jwtService.signAsync(payload, { expiresIn: '15m' }),
      Promise.resolve(this.generateRefreshToken()),
    ]);

    return { accessToken, refreshToken };
  }

  private generateRefreshToken(): string {
    return randomBytes(64).toString('hex');
  }

  private refreshTokenExpiresAt(): Date {
    return new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);
  }
}
