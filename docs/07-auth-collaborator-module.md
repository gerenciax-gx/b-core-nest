# 07. Módulo Auth + Collaborator

> **Módulos:** Auth, Collaborator  
> **Responsabilidade:** Autenticação, autorização, gerenciamento de sessões, fluxo Collaborator→User  
> **Guards globais:** JwtAuthGuard → ForcePasswordResetGuard → RolesGuard → TenantGuard

---

## TL;DR para IA

<constraints>

**Regras invioláveis deste módulo:**
1. 🚫 RefreshToken **NUNCA** no corpo da response — sempre HttpOnly cookie (AUTH-002)
2. 🚫 Mensagem de erro genérica no login: "Credenciais inválidas" — não revelar se email existe (AUTH-007)
3. 🚫 Senha temporária retornada 1 vez, **NUNCA** armazenada no banco (COLLAB-006)
4. 🚫 ForcePasswordResetGuard bloqueia TUDO exceto reset-password e logout (COLLAB-003)
5. 🚫 Senha: mín. 8 chars, 1 maiúscula, 1 minúscula, 1 número, 1 especial (AUTH-006)

**Fluxos principais:**
- **Signup:** POST /auth/signup → cria Tenant + User (admin) em transação → JWT + refresh
- **Login:** POST /auth/login → valida senha → JWT (body) + refresh (HttpOnly cookie)
- **Collaborator→User:** Admin cria Collaborator → User com `mustResetPassword=true` → senha temporária retornada 1x
- **Guard chain global:** JwtAuthGuard → ForcePasswordResetGuard → RolesGuard → TenantGuard

**AccessToken:** 15 min · **RefreshToken:** 30 dias, rotação obrigatória

</constraints>

---

## 1. Fluxo de Autenticação — Visão Geral

```
┌─────────────────────────────────────────────────────────────────┐
│                        AUTH FLOWS                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SIGNUP (Admin)                                                  │
│  POST /api/v1/auth/signup                                       │
│  ┌──────┐   ┌──────────┐   ┌───────┐   ┌─────────┐            │
│  │Client│──>│AuthService│──>│Create │──>│Create   │            │
│  │      │   │          │   │Tenant │   │User     │            │
│  │      │   │          │   │       │   │(admin)  │            │
│  └──────┘   └──────────┘   └───────┘   └─────────┘            │
│                │                                                 │
│                ▼                                                 │
│         Generate JWT + Refresh Token                             │
│                                                                  │
│  LOGIN                                                           │
│  POST /api/v1/auth/login                                        │
│  ┌──────┐   ┌──────────┐   ┌─────────┐   ┌──────────┐         │
│  │Client│──>│AuthService│──>│Validate │──>│Generate  │         │
│  │      │   │          │   │Password │   │Tokens    │         │
│  └──────┘   └──────────┘   └─────────┘   └──────────┘         │
│                                              │                   │
│                                    Set HttpOnly Cookie           │
│                                    (refreshToken)                │
│                                                                  │
│  COLLABORATOR → USER                                             │
│  POST /api/v1/collaborators                                     │
│  ┌─────┐   ┌────────────────┐   ┌──────────┐   ┌────────────┐ │
│  │Admin│──>│CollaboratorSvc │──>│Create    │──>│Create User │ │
│  │     │   │               │   │Collaborat│   │(mustReset  │ │
│  │     │   │               │   │or        │   │ =true)     │ │
│  └─────┘   └────────────────┘   └──────────┘   └────────────┘ │
│                                                    │             │
│                                         Return tempPassword      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Domain Layer — Auth

### 2.1 User Entity

```typescript
// src/modules/auth/domain/entities/user.entity.ts
import { randomUUID } from 'node:crypto';
import { DomainException } from '../../../../common/exceptions/domain.exception';
import { Email } from '../value-objects/email.vo';

export interface CreateUserProps {
  tenantId: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'user';
  collaboratorId?: string;
  mustResetPassword?: boolean;
}

export class User {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    private _name: string,
    private _email: Email,
    private _passwordHash: string,
    private _role: 'admin' | 'user',
    private _isActive: boolean,
    private _collaboratorId: string | null,
    private _mustResetPassword: boolean,
    private _avatarUrl: string | null,
    private _lastLoginAt: Date | null,
    public readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  // --- Factory ---
  static create(props: CreateUserProps): User {
    const email = Email.create(props.email);
    return new User(
      randomUUID(),
      props.tenantId,
      props.name,
      email,
      props.passwordHash,
      props.role,
      true,
      props.collaboratorId ?? null,
      props.mustResetPassword ?? false,
      null,
      null,
      new Date(),
      new Date(),
    );
  }

  // --- Getters ---
  get name(): string { return this._name; }
  get email(): string { return this._email.value; }
  get passwordHash(): string { return this._passwordHash; }
  get role(): 'admin' | 'user' { return this._role; }
  get isActive(): boolean { return this._isActive; }
  get collaboratorId(): string | null { return this._collaboratorId; }
  get mustResetPassword(): boolean { return this._mustResetPassword; }
  get avatarUrl(): string | null { return this._avatarUrl; }
  get lastLoginAt(): Date | null { return this._lastLoginAt; }

  // --- Behaviors ---
  changePassword(newPasswordHash: string): void {
    if (!newPasswordHash) {
      throw new DomainException('Password hash não pode ser vazio');
    }
    this._passwordHash = newPasswordHash;
    this._mustResetPassword = false;
    this._updatedAt = new Date();
  }

  markPasswordResetComplete(): void {
    this._mustResetPassword = false;
    this._updatedAt = new Date();
  }

  updateLastLogin(): void {
    this._lastLoginAt = new Date();
  }

  deactivate(): void {
    if (!this._isActive) {
      throw new DomainException('Usuário já está desativado');
    }
    this._isActive = false;
    this._updatedAt = new Date();
  }

  activate(): void {
    this._isActive = true;
    this._updatedAt = new Date();
  }

  updateProfile(name: string, avatarUrl?: string): void {
    if (!name || name.trim().length < 2) {
      throw new DomainException('Nome deve ter pelo menos 2 caracteres');
    }
    this._name = name.trim();
    if (avatarUrl !== undefined) {
      this._avatarUrl = avatarUrl;
    }
    this._updatedAt = new Date();
  }

  isAdmin(): boolean {
    return this._role === 'admin';
  }

  isCollaboratorUser(): boolean {
    return this._collaboratorId !== null;
  }
}
```

### 2.2 Value Objects

```typescript
// src/modules/auth/domain/value-objects/email.vo.ts
import { DomainException } from '../../../../common/exceptions/domain.exception';

export class Email {
  private constructor(public readonly value: string) {}

  static create(email: string): Email {
    const normalized = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalized)) {
      throw new DomainException(`Email inválido: ${email}`);
    }
    return new Email(normalized);
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }
}
```

```typescript
// src/modules/auth/domain/value-objects/password.vo.ts
import { DomainException } from '../../../../common/exceptions/domain.exception';

export class Password {
  private constructor(public readonly value: string) {}

  static validate(password: string): void {
    if (password.length < 8) {
      throw new DomainException('Senha deve ter pelo menos 8 caracteres');
    }
    if (!/[A-Z]/.test(password)) {
      throw new DomainException('Senha deve conter pelo menos uma letra maiúscula');
    }
    if (!/[a-z]/.test(password)) {
      throw new DomainException('Senha deve conter pelo menos uma letra minúscula');
    }
    if (!/\d/.test(password)) {
      throw new DomainException('Senha deve conter pelo menos um número');
    }
    if (!/[@$!%*?&#]/.test(password)) {
      throw new DomainException('Senha deve conter pelo menos um caractere especial (@$!%*?&#)');
    }
  }
}
```

### 2.3 Ports

```typescript
// src/modules/auth/domain/ports/output/user.repository.port.ts
import { User } from '../../entities/user.entity';

export interface UserRepositoryPort {
  save(user: User): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByTenantId(tenantId: string): Promise<User[]>;
  findByCollaboratorId(collaboratorId: string): Promise<User | null>;
  update(user: User): Promise<User>;
  delete(id: string): Promise<void>;
}
```

```typescript
// src/modules/auth/domain/ports/output/session.repository.port.ts
import { UserSession } from '../../entities/user-session.entity';

export interface SessionRepositoryPort {
  save(session: UserSession): Promise<UserSession>;
  findByRefreshToken(token: string): Promise<UserSession | null>;
  findByUserId(userId: string): Promise<UserSession[]>;
  deleteByRefreshToken(token: string): Promise<void>;
  deleteAllByUserId(userId: string): Promise<void>;
  deleteExpired(): Promise<number>;
}
```

```typescript
// src/modules/auth/domain/ports/input/auth.usecase.port.ts
export interface SignupInput {
  name: string;
  email: string;
  password: string;
  companyName: string;
  companyType: 'produtos' | 'servicos' | 'ambos';
}

export interface LoginInput {
  email: string;
  password: string;
  device?: string;
  ip?: string;
  userAgent?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUseCasePort {
  signup(input: SignupInput): Promise<{ user: any; tokens: AuthTokens }>;
  login(input: LoginInput): Promise<{ user: any; tokens: AuthTokens }>;
  refreshToken(refreshToken: string): Promise<AuthTokens>;
  logout(refreshToken: string): Promise<void>;
  resetPassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
}
```

---

## 3. Application Layer — Auth

### 3.1 Auth Service

```typescript
// src/modules/auth/application/services/auth.service.ts
import { Inject, Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { AuthUseCasePort, SignupInput, LoginInput, AuthTokens } from '../../domain/ports/input/auth.usecase.port';
import { UserRepositoryPort } from '../../domain/ports/output/user.repository.port';
import { SessionRepositoryPort } from '../../domain/ports/output/session.repository.port';
import { TenantRepositoryPort } from '../../../tenant/domain/ports/output/tenant.repository.port';
import { User } from '../../domain/entities/user.entity';
import { UserSession } from '../../domain/entities/user-session.entity';
import { Tenant } from '../../../tenant/domain/entities/tenant.entity';
import { Password } from '../../domain/value-objects/password.vo';
import { UserResponseDto } from '../dtos/user-response.dto';

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

  async signup(input: SignupInput): Promise<{ user: UserResponseDto; tokens: AuthTokens }> {
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
    const passwordHash = await bcrypt.hash(input.password, 12);
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
    this.eventEmitter.emit('user.signup', { userId: user.id, tenantId: tenant.id });

    return {
      user: UserResponseDto.from(user),
      tokens,
    };
  }

  async login(input: LoginInput): Promise<{ user: UserResponseDto; tokens: AuthTokens }> {
    // 1. Buscar user
    const user = await this.userRepo.findByEmail(input.email);
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // 2. Verificar se está ativo
    if (!user.isActive) {
      throw new UnauthorizedException('Conta desativada. Entre em contato com o administrador');
    }

    // 3. Verificar senha
    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
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
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
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

    // 3. Revogar sessão atual
    await this.sessionRepo.deleteByRefreshToken(refreshToken);

    // 4. Gerar novos tokens + nova sessão (rotation)
    const tokens = await this.generateTokens(user);
    const newSession = UserSession.create({
      userId: user.id,
      refreshToken: tokens.refreshToken,
      device: session.device,
      ip: session.ip,
      userAgent: session.userAgent,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    await this.sessionRepo.save(newSession);

    return tokens;
  }

  async logout(refreshToken: string): Promise<void> {
    await this.sessionRepo.deleteByRefreshToken(refreshToken);
  }

  async resetPassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
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
    const newHash = await bcrypt.hash(newPassword, 12);
    user.changePassword(newHash);
    await this.userRepo.update(user);

    // Revogar todas as sessões (forçar re-login)
    await this.sessionRepo.deleteAllByUserId(userId);

    this.eventEmitter.emit('user.password-reset', { userId: user.id });
  }

  // --- Private ---
  private async generateTokens(user: User): Promise<AuthTokens> {
    const payload = {
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
      mustResetPassword: user.mustResetPassword,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { expiresIn: '15m' }),
      this.generateRefreshToken(),
    ]);

    return { accessToken, refreshToken };
  }

  private generateRefreshToken(): string {
    return randomBytes(64).toString('hex');
  }
}
```

### 3.2 DTOs

```typescript
// src/modules/auth/application/dtos/signup.dto.ts
import { IsEmail, IsNotEmpty, IsString, MinLength, IsIn } from 'class-validator';

export class SignupDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MinLength(8)
  passwordConfirm: string;

  @IsString()
  @IsNotEmpty()
  companyName: string;

  @IsIn(['produtos', 'servicos', 'ambos'])
  companyType: 'produtos' | 'servicos' | 'ambos';
}
```

```typescript
// src/modules/auth/application/dtos/login.dto.ts
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
```

```typescript
// src/modules/auth/application/dtos/reset-password.dto.ts
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @MinLength(8)
  newPassword: string;

  @IsString()
  @MinLength(8)
  confirmPassword: string;
}
```

```typescript
// src/modules/auth/application/dtos/user-response.dto.ts
import { User } from '../../domain/entities/user.entity';

export class UserResponseDto {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  mustResetPassword: boolean;
  isCollaborator: boolean;
  lastLoginAt: string | null;

  static from(user: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.tenantId = user.tenantId;
    dto.name = user.name;
    dto.email = user.email;
    dto.role = user.role;
    dto.avatarUrl = user.avatarUrl;
    dto.mustResetPassword = user.mustResetPassword;
    dto.isCollaborator = user.isCollaboratorUser();
    dto.lastLoginAt = user.lastLoginAt?.toISOString() ?? null;
    return dto;
  }
}
```

---

## 4. Infrastructure Layer — Auth

### 4.1 Auth Controller

```typescript
// src/modules/auth/infrastructure/controllers/auth.controller.ts
import { Controller, Post, Body, Res, Req, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from '../../application/services/auth.service';
import { SignupDto } from '../../application/dtos/signup.dto';
import { LoginDto } from '../../application/dtos/login.dto';
import { ResetPasswordDto } from '../../application/dtos/reset-password.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Public } from '../decorators/public.decorator';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('signup')
  async signup(
    @Body() dto: SignupDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.signup(dto);

    this.setRefreshTokenCookie(res, result.tokens.refreshToken);

    return {
      success: true,
      message: 'Conta criada com sucesso',
      data: {
        user: result.user,
        accessToken: result.tokens.accessToken,
      },
    };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login({
      ...dto,
      device: req.headers['x-device-type'] as string,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    this.setRefreshTokenCookie(res, result.tokens.refreshToken);

    return {
      success: true,
      message: 'Login realizado com sucesso',
      data: {
        user: result.user,
        accessToken: result.tokens.accessToken,
      },
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refreshToken;
    const tokens = await this.authService.refreshToken(refreshToken);

    this.setRefreshTokenCookie(res, tokens.refreshToken);

    return {
      success: true,
      data: { accessToken: tokens.accessToken },
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    res.clearCookie('refreshToken');

    return { success: true, message: 'Logout realizado' };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @CurrentUser() user: { sub: string },
    @Body() dto: ResetPasswordDto,
  ) {
    await this.authService.resetPassword(
      user.sub,
      dto.currentPassword,
      dto.newPassword,
    );

    return { success: true, message: 'Senha alterada com sucesso' };
  }

  // --- Private ---
  private setRefreshTokenCookie(res: Response, token: string): void {
    res.cookie('refreshToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dias
      path: '/api/v1/auth',
    });
  }
}
```

### 4.2 Guards

```typescript
// src/modules/auth/infrastructure/guards/jwt-auth.guard.ts
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }
}
```

```typescript
// src/modules/auth/infrastructure/guards/force-password-reset.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

const ALLOWED_ROUTES = ['/api/v1/auth/reset-password', '/api/v1/auth/logout'];

@Injectable()
export class ForcePasswordResetGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user?.mustResetPassword) {
      const path = request.path;
      if (!ALLOWED_ROUTES.includes(path)) {
        throw new ForbiddenException({
          success: false,
          message: 'Você deve redefinir sua senha antes de continuar',
          code: 'MUST_RESET_PASSWORD',
        });
      }
    }

    return true;
  }
}
```

```typescript
// src/modules/auth/infrastructure/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles?.length) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Acesso negado. Permissão insuficiente');
    }

    return true;
  }
}
```

```typescript
// src/modules/auth/infrastructure/guards/tenant.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.tenantId) {
      throw new ForbiddenException('Tenant não identificado');
    }

    // Injetar tenantId no request para uso nos serviços
    request.tenantId = user.tenantId;

    return true;
  }
}
```

### 4.3 Decorators

```typescript
// src/modules/auth/infrastructure/decorators/public.decorator.ts
import { SetMetadata } from '@nestjs/common';
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

```typescript
// src/modules/auth/infrastructure/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```

```typescript
// src/modules/auth/infrastructure/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
```

```typescript
// src/modules/auth/infrastructure/decorators/tenant-id.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenantId ?? request.user?.tenantId;
  },
);
```

### 4.4 JWT Strategy

```typescript
// src/modules/auth/infrastructure/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: string;
  tenantId: string;
  role: 'admin' | 'user';
  mustResetPassword: boolean;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    if (!payload.sub || !payload.tenantId) {
      throw new UnauthorizedException('Token inválido');
    }
    return payload;
  }
}
```

---

## 5. Collaborator Module

### 5.1 Collaborator Entity

```typescript
// src/modules/collaborator/domain/entities/collaborator.entity.ts
import { randomUUID } from 'node:crypto';
import { DomainException } from '../../../../common/exceptions/domain.exception';

export interface CreateCollaboratorProps {
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  cpf: string;
  phone: string;
  gender: 'Masculino' | 'Feminino' | 'Outro' | 'Prefiro não informar';
  birthDate?: Date;
  role: 'Administrador' | 'Usuário';
  allToolsAccess: boolean;
  notes?: string;
}

export class Collaborator {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    private _firstName: string,
    private _lastName: string,
    private _email: string,
    private _cpf: string,
    private _phone: string,
    private _gender: string,
    private _birthDate: Date | null,
    private _status: 'Ativo' | 'Inativo' | 'Férias' | 'Afastado',
    private _role: 'Administrador' | 'Usuário',
    private _avatarUrl: string | null,
    private _allToolsAccess: boolean,
    private _notes: string | null,
    public readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(props: CreateCollaboratorProps): Collaborator {
    if (!props.firstName?.trim()) throw new DomainException('Nome é obrigatório');
    if (!props.lastName?.trim()) throw new DomainException('Sobrenome é obrigatório');
    if (!props.cpf?.trim()) throw new DomainException('CPF é obrigatório');

    return new Collaborator(
      randomUUID(),
      props.tenantId,
      props.firstName.trim(),
      props.lastName.trim(),
      props.email.trim().toLowerCase(),
      props.cpf.replace(/\D/g, ''),
      props.phone,
      props.gender,
      props.birthDate ?? null,
      'Ativo',
      props.role,
      null,
      props.allToolsAccess,
      props.notes ?? null,
      new Date(),
      new Date(),
    );
  }

  // --- Getters ---
  get firstName(): string { return this._firstName; }
  get lastName(): string { return this._lastName; }
  get fullName(): string { return `${this._firstName} ${this._lastName}`; }
  get email(): string { return this._email; }
  get cpf(): string { return this._cpf; }
  get phone(): string { return this._phone; }
  get gender(): string { return this._gender; }
  get status(): string { return this._status; }
  get role(): string { return this._role; }
  get allToolsAccess(): boolean { return this._allToolsAccess; }

  // --- Behaviors ---
  deactivate(): void {
    if (this._status === 'Inativo') {
      throw new DomainException('Colaborador já está inativo');
    }
    this._status = 'Inativo';
    this._updatedAt = new Date();
  }

  activate(): void {
    this._status = 'Ativo';
    this._updatedAt = new Date();
  }

  setOnVacation(): void {
    this._status = 'Férias';
    this._updatedAt = new Date();
  }

  setOnLeave(): void {
    this._status = 'Afastado';
    this._updatedAt = new Date();
  }

  isAdministrator(): boolean {
    return this._role === 'Administrador';
  }
}
```

### 5.2 Collaborator Service (Com Auto-Criação de User)

```typescript
// src/modules/collaborator/application/services/collaborator.service.ts
import { Inject, Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { CollaboratorRepositoryPort } from '../../domain/ports/output/collaborator.repository.port';
import { UserRepositoryPort } from '../../../auth/domain/ports/output/user.repository.port';
import { Collaborator } from '../../domain/entities/collaborator.entity';
import { User } from '../../../auth/domain/entities/user.entity';
import { CreateCollaboratorDto } from '../dtos/create-collaborator.dto';
import { CollaboratorResponseDto } from '../dtos/collaborator-response.dto';

@Injectable()
export class CollaboratorService {
  constructor(
    @Inject('CollaboratorRepositoryPort')
    private readonly collaboratorRepo: CollaboratorRepositoryPort,

    @Inject('UserRepositoryPort')
    private readonly userRepo: UserRepositoryPort,

    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(
    tenantId: string,
    dto: CreateCollaboratorDto,
  ): Promise<{ collaborator: CollaboratorResponseDto; temporaryPassword: string }> {
    // 1. Verificar email duplicado
    const existingUser = await this.userRepo.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('Email já está em uso');
    }

    // 2. Criar Collaborator
    const collaborator = Collaborator.create({ ...dto, tenantId });
    await this.collaboratorRepo.save(collaborator);

    // 3. Gerar senha temporária
    const temporaryPassword = this.generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    // 4. Criar User vinculado com mustResetPassword = true
    const userRole = dto.role === 'Administrador' ? 'admin' : 'user';
    const user = User.create({
      tenantId,
      name: collaborator.fullName,
      email: dto.email,
      passwordHash,
      role: userRole as 'admin' | 'user',
      collaboratorId: collaborator.id,
      mustResetPassword: true,
    });
    await this.userRepo.save(user);

    // 5. Se tem permissões de ferramentas, salvar
    if (dto.toolPermissions?.length && !dto.allToolsAccess) {
      await this.collaboratorRepo.saveToolPermissions(
        collaborator.id,
        dto.toolPermissions,
      );
    }

    // 6. Emitir evento
    this.eventEmitter.emit('collaborator.created', {
      collaboratorId: collaborator.id,
      userId: user.id,
      tenantId,
    });

    return {
      collaborator: CollaboratorResponseDto.from(collaborator),
      temporaryPassword,
    };
  }

  async findByTenant(tenantId: string): Promise<CollaboratorResponseDto[]> {
    const collaborators = await this.collaboratorRepo.findByTenantId(tenantId);
    return collaborators.map(CollaboratorResponseDto.from);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const collaborator = await this.collaboratorRepo.findById(id);
    if (!collaborator || collaborator.tenantId !== tenantId) {
      throw new NotFoundException('Colaborador não encontrado');
    }

    // Desativar user vinculado
    const user = await this.userRepo.findByCollaboratorId(id);
    if (user) {
      user.deactivate();
      await this.userRepo.update(user);
    }

    await this.collaboratorRepo.delete(id);

    this.eventEmitter.emit('collaborator.deleted', {
      collaboratorId: id,
      tenantId,
    });
  }

  private generateTemporaryPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!';
    let password = '';
    const bytes = randomBytes(12);
    for (const byte of bytes) {
      password += chars[byte % chars.length];
    }
    // Garantir requisitos mínimos
    return password + 'A1@';
  }
}
```

### 5.3 Tool Permission Guard

```typescript
// src/modules/collaborator/infrastructure/guards/tool-permission.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CollaboratorRepositoryPort } from '../../domain/ports/output/collaborator.repository.port';
import { TOOL_KEY } from '../decorators/require-tool.decorator';

@Injectable()
export class ToolPermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject('CollaboratorRepositoryPort')
    private readonly collaboratorRepo: CollaboratorRepositoryPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredTool = this.reflector.getAllAndOverride<string>(TOOL_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredTool) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Admin sempre tem acesso
    if (user.role === 'admin') return true;

    // Buscar colaborador
    const collaborator = await this.collaboratorRepo.findByUserId(user.sub);
    if (!collaborator) {
      throw new ForbiddenException('Colaborador não encontrado');
    }

    // allToolsAccess = true → acesso total
    if (collaborator.allToolsAccess) return true;

    // Verificar permissão específica
    const hasPermission = await this.collaboratorRepo.hasToolPermission(
      collaborator.id,
      requiredTool,
    );

    if (!hasPermission) {
      throw new ForbiddenException('Você não tem permissão para acessar esta ferramenta');
    }

    return true;
  }
}
```

---

## 6. Guard Chain — Ordem Global

```typescript
// src/app.module.ts (providers)
import { APP_GUARD } from '@nestjs/core';

providers: [
  // 1. Autenticação (valida JWT)
  { provide: APP_GUARD, useClass: JwtAuthGuard },

  // 2. Obriga redefinir senha (bloqueia se mustResetPassword)
  { provide: APP_GUARD, useClass: ForcePasswordResetGuard },

  // 3. Autorização por role (admin/user)
  { provide: APP_GUARD, useClass: RolesGuard },

  // 4. Garante tenantId no request
  { provide: APP_GUARD, useClass: TenantGuard },
],
```

---

## 7. Regras de Negócio

| # | Nível | Regra |
|---|-------|-------|
| AUTH-001 | ⚠️ REQUIRED | Signup cria Tenant + User (role=admin) em transação |
| AUTH-002 | 🚫 CRITICAL | Login retorna accessToken (body) + refreshToken (HttpOnly cookie) |
| AUTH-003 | ⚠️ REQUIRED | AccessToken expira em 15 minutos |
| AUTH-004 | ⚠️ REQUIRED | RefreshToken expira em 30 dias, rotação obrigatória no refresh |
| AUTH-005 | 🚫 CRITICAL | Email deve ser único globalmente |
| AUTH-006 | 🚫 CRITICAL | Senha: mín. 8 chars, 1 maiúscula, 1 minúscula, 1 número, 1 especial |
| AUTH-007 | 🚫 CRITICAL | Mensagem de erro genérica no login: "Credenciais inválidas" (não revelar se email existe) |
| COLLAB-001 | ⚠️ REQUIRED | Criar colaborador = criar User com `mustResetPassword=true` |
| COLLAB-002 | ⚠️ REQUIRED | Senha temporária gerada com `crypto.randomBytes`, retornada apenas 1 vez |
| COLLAB-003 | 🚫 CRITICAL | ForcePasswordResetGuard bloqueia tudo exceto reset-password e logout |
| COLLAB-004 | ⚠️ REQUIRED | allToolsAccess=true → não verificar permissões individuais |
| COLLAB-005 | ⚠️ REQUIRED | Deletar colaborador → desativar user vinculado |
| COLLAB-006 | 🚫 CRITICAL | **PROIBIDO** armazenar senha temporária em banco (apenas retornar na response) |

---

> **Skill File v1.0** — Auth + Collaborator Module  
> **Regra:** refreshToken NUNCA no corpo da response. Sempre HttpOnly cookie.
