import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import type { SettingsUseCasePort } from '../../domain/ports/input/settings.usecase.port.js';
import type { UserRepositoryPort } from '../../../auth/domain/ports/output/user.repository.port.js';
import type { SessionRepositoryPort } from '../../../auth/domain/ports/output/session.repository.port.js';
import type { TenantRepositoryPort } from '../../../tenant/domain/ports/output/tenant.repository.port.js';
import type { UserSettingsRepositoryPort } from '../../domain/ports/output/user-settings.repository.port.js';
import type { NotificationPreferencesRepositoryPort } from '../../domain/ports/output/notification-preferences.repository.port.js';
import { UserSettings } from '../../domain/entities/user-settings.entity.js';
import { NotificationPreferences } from '../../domain/entities/notification-preferences.entity.js';
import { Password } from '../../../auth/domain/value-objects/password.vo.js';
import type { UpdatePersonalDto } from '../dto/update-personal.dto.js';
import type { UpdateCompanyDto } from '../dto/update-company.dto.js';
import type { UpdateAppearanceDto } from '../dto/update-appearance.dto.js';
import type { UpdateNotificationPreferencesDto } from '../dto/update-notification-preferences.dto.js';
import type { PersonalResponseDto } from '../dto/personal-response.dto.js';
import type { CompanyResponseDto } from '../dto/company-response.dto.js';
import type { SessionResponseDto } from '../dto/session-response.dto.js';
import type { AppearanceResponseDto } from '../dto/appearance-response.dto.js';
import type { NotificationPreferencesResponseDto } from '../dto/notification-preferences-response.dto.js';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class SettingsService implements SettingsUseCasePort {
  constructor(
    @Inject('UserRepositoryPort')
    private readonly userRepo: UserRepositoryPort,

    @Inject('SessionRepositoryPort')
    private readonly sessionRepo: SessionRepositoryPort,

    @Inject('TenantRepositoryPort')
    private readonly tenantRepo: TenantRepositoryPort,

    @Inject('UserSettingsRepositoryPort')
    private readonly userSettingsRepo: UserSettingsRepositoryPort,

    @Inject('NotificationPreferencesRepositoryPort')
    private readonly notifPrefsRepo: NotificationPreferencesRepositoryPort,
  ) {}

  // ── Personal ────────────────────────────────────────────

  async getPersonal(userId: string): Promise<PersonalResponseDto> {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new NotFoundException('Usuário não encontrado');

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      phone: user.phone,
      cpf: user.cpf,
      birthDate: user.birthDate,
      mustResetPassword: user.mustResetPassword,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async updatePersonal(
    userId: string,
    dto: UpdatePersonalDto,
  ): Promise<PersonalResponseDto> {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new NotFoundException('Usuário não encontrado');

    user.updateProfile({
      name: dto.name,
      avatarUrl: dto.avatarUrl,
      phone: dto.phone ?? undefined,
      cpf: dto.cpf ?? undefined,
      birthDate: dto.birthDate ?? undefined,
    });
    await this.userRepo.update(user);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      phone: user.phone,
      cpf: user.cpf,
      birthDate: user.birthDate,
      mustResetPassword: user.mustResetPassword,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async updateAvatar(userId: string, avatarUrl: string): Promise<PersonalResponseDto> {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new NotFoundException('Usuário não encontrado');

    user.updateProfile({ avatarUrl });
    await this.userRepo.update(user);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      phone: user.phone,
      cpf: user.cpf,
      birthDate: user.birthDate,
      mustResetPassword: user.mustResetPassword,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
    };
  }

  // ── Company ─────────────────────────────────────────────

  async getCompany(tenantId: string): Promise<CompanyResponseDto> {
    const tenant = await this.tenantRepo.findById(tenantId);
    if (!tenant) throw new NotFoundException('Empresa não encontrada');

    return {
      id: tenant.id,
      companyName: tenant.companyName,
      companyType: tenant.companyType,
      document: tenant.document,
      phone: tenant.phone,
      email: tenant.email,
      status: tenant.status,
      logoUrl: tenant.logoUrl,
      legalName: tenant.legalName,
      stateRegistration: tenant.stateRegistration,
      municipalRegistration: tenant.municipalRegistration,
      address: tenant.address,
      businessData: tenant.businessData,
      socialLinks: tenant.socialLinks,
      createdAt: tenant.createdAt.toISOString(),
    };
  }

  async updateCompany(
    tenantId: string,
    userRole: string,
    dto: UpdateCompanyDto,
  ): Promise<CompanyResponseDto> {
    if (userRole !== 'admin') {
      throw new ForbiddenException(
        'Apenas administradores podem alterar dados da empresa',
      );
    }

    const tenant = await this.tenantRepo.findById(tenantId);
    if (!tenant) throw new NotFoundException('Empresa não encontrada');

    tenant.updateCompanyInfo({
      companyName: dto.companyName,
      document: dto.document,
      phone: dto.phone,
      email: dto.email,
      logoUrl: dto.logoUrl,
      legalName: dto.legalName,
      stateRegistration: dto.stateRegistration,
      municipalRegistration: dto.municipalRegistration,
      cep: dto.cep,
      street: dto.street,
      number: dto.number,
      complement: dto.complement,
      neighborhood: dto.neighborhood,
      city: dto.city,
      state: dto.state,
      country: dto.country,
      openingDate: dto.openingDate,
      businessHours: dto.businessHours,
      specialties: dto.specialties,
      maxCapacity: dto.maxCapacity,
      averageServiceTime: dto.averageServiceTime,
      paymentMethods: dto.paymentMethods,
      cancellationPolicy: dto.cancellationPolicy,
      description: dto.description,
      website: dto.website,
      instagram: dto.instagram,
      facebook: dto.facebook,
      whatsapp: dto.whatsapp,
    });
    await this.tenantRepo.update(tenant);

    return {
      id: tenant.id,
      companyName: tenant.companyName,
      companyType: tenant.companyType,
      document: tenant.document,
      phone: tenant.phone,
      email: tenant.email,
      status: tenant.status,
      logoUrl: tenant.logoUrl,
      legalName: tenant.legalName,
      stateRegistration: tenant.stateRegistration,
      municipalRegistration: tenant.municipalRegistration,
      address: tenant.address,
      businessData: tenant.businessData,
      socialLinks: tenant.socialLinks,
      createdAt: tenant.createdAt.toISOString(),
    };
  }

  // ── Appearance ──────────────────────────────────────────

  async getAppearance(userId: string): Promise<AppearanceResponseDto> {
    const settings = await this.userSettingsRepo.findByUserId(userId);

    // Return defaults if no record exists
    if (!settings) {
      return {
        theme: 'system',
        language: 'pt-BR',
        fontSize: 'medium',
        compactMode: false,
      };
    }

    return {
      theme: settings.theme,
      language: settings.language,
      fontSize: settings.fontSize,
      compactMode: settings.compactMode,
    };
  }

  async updateAppearance(
    userId: string,
    dto: UpdateAppearanceDto,
  ): Promise<AppearanceResponseDto> {
    let settings = await this.userSettingsRepo.findByUserId(userId);

    if (settings) {
      settings.update({
        theme: dto.theme,
        language: dto.language,
        fontSize: dto.fontSize,
        compactMode: dto.compactMode,
      });
    } else {
      const now = new Date();
      settings = new UserSettings(
        randomUUID(),
        userId,
        dto.theme ?? 'system',
        dto.language ?? 'pt-BR',
        dto.fontSize ?? 'medium',
        dto.compactMode ?? false,
        now,
        now,
      );
    }

    await this.userSettingsRepo.upsert(userId, settings);

    return {
      theme: settings.theme,
      language: settings.language,
      fontSize: settings.fontSize,
      compactMode: settings.compactMode,
    };
  }

  // ── Notification Preferences ────────────────────────────

  async getNotificationPreferences(
    userId: string,
  ): Promise<NotificationPreferencesResponseDto> {
    const prefs = await this.notifPrefsRepo.findByUserId(userId);

    // Return defaults if no record exists
    if (!prefs) {
      return {
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: false,
        orderUpdates: true,
        promotions: false,
        securityAlerts: true,
        systemUpdates: true,
      };
    }

    return {
      emailNotifications: prefs.emailNotifications,
      pushNotifications: prefs.pushNotifications,
      smsNotifications: prefs.smsNotifications,
      orderUpdates: prefs.orderUpdates,
      promotions: prefs.promotions,
      securityAlerts: prefs.securityAlerts,
      systemUpdates: prefs.systemUpdates,
    };
  }

  async updateNotificationPreferences(
    userId: string,
    dto: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreferencesResponseDto> {
    let prefs = await this.notifPrefsRepo.findByUserId(userId);

    if (prefs) {
      prefs.update({
        emailNotifications: dto.emailNotifications,
        pushNotifications: dto.pushNotifications,
        smsNotifications: dto.smsNotifications,
        orderUpdates: dto.orderUpdates,
        promotions: dto.promotions,
        securityAlerts: dto.securityAlerts,
        systemUpdates: dto.systemUpdates,
      });
    } else {
      const now = new Date();
      prefs = new NotificationPreferences(
        randomUUID(),
        userId,
        dto.emailNotifications ?? true,
        dto.pushNotifications ?? true,
        dto.smsNotifications ?? false,
        dto.orderUpdates ?? true,
        dto.promotions ?? false,
        dto.securityAlerts ?? true,
        dto.systemUpdates ?? true,
        now,
        now,
      );
    }

    await this.notifPrefsRepo.upsert(userId, prefs);

    return {
      emailNotifications: prefs.emailNotifications,
      pushNotifications: prefs.pushNotifications,
      smsNotifications: prefs.smsNotifications,
      orderUpdates: prefs.orderUpdates,
      promotions: prefs.promotions,
      securityAlerts: prefs.securityAlerts,
      systemUpdates: prefs.systemUpdates,
    };
  }

  // ── Security: Change Password ───────────────────────────

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
  ): Promise<void> {
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('Nova senha e confirmação não coincidem');
    }

    const user = await this.userRepo.findById(userId);
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new BadRequestException('Senha atual incorreta');
    }

    Password.validate(newPassword);

    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    user.changePassword(newHash);
    await this.userRepo.update(user);

    // Revoga todas as sessões (forçar re-login)
    await this.sessionRepo.deleteAllByUserId(userId);
  }

  // ── Security: Sessions ──────────────────────────────────

  async listSessions(
    userId: string,
    currentRefreshToken?: string,
  ): Promise<SessionResponseDto[]> {
    const sessions = await this.sessionRepo.findByUserId(userId);

    return sessions
      .filter((s) => !s.isExpired())
      .map((s) => ({
        id: s.id,
        device: s.device,
        ip: s.ip,
        userAgent: s.userAgent,
        createdAt: s.createdAt.toISOString(),
        expiresAt: s.expiresAt.toISOString(),
        isCurrent: s.refreshToken === (currentRefreshToken ?? ''),
      }));
  }

  async revokeSession(
    sessionId: string,
    userId: string,
  ): Promise<void> {
    const sessions = await this.sessionRepo.findByUserId(userId);
    const target = sessions.find((s) => s.id === sessionId);

    if (!target) {
      throw new NotFoundException('Sessão não encontrada');
    }

    await this.sessionRepo.deleteByRefreshToken(target.refreshToken);
  }
}
