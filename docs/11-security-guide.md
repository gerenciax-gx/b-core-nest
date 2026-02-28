# 11. Security Guide

> **Nível:** Produção SaaS — dados financeiros, dados pessoais (LGPD)  
> **Princípio:** Defense in depth — múltiplas camadas de proteção  
> **Stack de segurança:** Helmet, CORS, ThrottlerModule, bcrypt, JWT, Cloudflare WAF

---

## 1. Camadas de Segurança

```
┌──────────────────────────────────────────────┐
│                CLOUDFLARE                     │
│  WAF • DDoS Protection • SSL/TLS            │
├──────────────────────────────────────────────┤
│               NESTJS APP                      │
│  ┌────────────────────────────────────────┐  │
│  │ Helmet (HTTP Headers)                  │  │
│  ├────────────────────────────────────────┤  │
│  │ CORS (Multi-origin restritos)          │  │
│  ├────────────────────────────────────────┤  │
│  │ Rate Limiting (ThrottlerModule)        │  │
│  ├────────────────────────────────────────┤  │
│  │ Validation (class-validator whitelist) │  │
│  ├────────────────────────────────────────┤  │
│  │ Auth Guards (JWT → Reset → Roles → T) │  │
│  ├────────────────────────────────────────┤  │
│  │ Multi-tenancy (TenantGuard + tenant_id)│  │
│  ├────────────────────────────────────────┤  │
│  │ RLS (Optional PostgreSQL)              │  │
│  └────────────────────────────────────────┘  │
├──────────────────────────────────────────────┤
│              SUPABASE DB                      │
│  Encrypted at rest • SSL connections         │
└──────────────────────────────────────────────┘
```

---

## 2. Helmet — HTTP Security Headers

```typescript
// src/main.ts
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  hsts: { maxAge: 31536000, includeSubDomains: true },
}));
```

---

## 3. Rate Limiting

```typescript
// src/app.module.ts
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,   // 1 segundo
        limit: 10,    // 10 requests/segundo
      },
      {
        name: 'medium',
        ttl: 10000,  // 10 segundos
        limit: 50,    // 50 requests/10s
      },
      {
        name: 'long',
        ttl: 60000,  // 1 minuto
        limit: 100,   // 100 requests/minuto
      },
    ]),
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
```

### Rate Limiting Específico por Rota

```typescript
// Rotas sensíveis: mais restritivas
@Throttle({ short: { limit: 3, ttl: 1000 } })
@Post('auth/login')
async login() { /* ... */ }

@Throttle({ short: { limit: 1, ttl: 5000 } })
@Post('auth/signup')
async signup() { /* ... */ }

// Rotas de leitura: mais permissivas
@SkipThrottle()
@Get('health')
async health() { /* ... */ }
```

---

## 4. Autenticação — Regras de Segurança

### 4.1 JWT

| Aspecto | Regra |
|---------|-------|
| Access Token | Expira em 15 minutos |
| Refresh Token | Expira em 30 dias, HttpOnly cookie, Secure, SameSite=Strict |
| JWT Secret | Mínimo 256 bits, variável de ambiente |
| Armazenamento | **PROIBIDO** localStorage/sessionStorage para tokens |
| Payload | Mínimo: `{ sub, tenantId, role, mustResetPassword }` |
| Rotação | Refresh token rotacionado a cada uso |
| Revogação | Logout revoga refresh token, reset-password revoga todas sessões |

### 4.2 Senhas

```typescript
// Regras de password
Password.validate(password);
// - Mínimo 8 caracteres
// - 1 maiúscula
// - 1 minúscula
// - 1 número
// - 1 caractere especial

// Hash com bcrypt, cost factor 12
const hash = await bcrypt.hash(password, 12);
```

| Regra | Valor |
|-------|-------|
| Hash algorithm | bcrypt |
| Salt rounds | 12 |
| **PROIBIDO** | Armazenar senha em texto, usar MD5/SHA1 |

### 4.3 Mensagens de Erro no Login

```typescript
// ✅ CORRETO — mensagem genérica
throw new UnauthorizedException('Credenciais inválidas');

// ❌ PROIBIDO — revelar informação
throw new UnauthorizedException('Email não encontrado');
throw new UnauthorizedException('Senha incorreta');
```

---

## 5. Input Validation & Sanitization

### 5.1 Validation Pipeline Global

```typescript
// src/main.ts
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,         // Remove campos não declarados no DTO
  forbidNonWhitelisted: true, // Erro se campo desconhecido
  transform: true,         // Auto-transform para tipos corretos
  transformOptions: {
    enableImplicitConversion: true,
  },
}));
```

### 5.2 Sanitização

```typescript
// ✅ CORRETO — sanitizar inputs críticos
const cpf = dto.cpf.replace(/\D/g, '');          // Apenas dígitos
const email = dto.email.trim().toLowerCase();      // Normalizar email
const name = dto.name.trim();                      // Remover espaços extras

// ❌ PROIBIDO — confiar em input do cliente
const query = `SELECT * FROM users WHERE email = '${dto.email}'`; // SQL INJECTION!
```

### 5.3 Proteção contra SQL Injection

Drizzle ORM previne SQL injection por padrão via prepared statements.

```typescript
// ✅ CORRETO — Drizzle com parametrização automática
const result = await this.db
  .select()
  .from(products)
  .where(eq(products.tenantId, tenantId))
  .where(like(products.name, `%${search}%`));

// ❌ PROIBIDO — query raw sem parametrização
await this.db.execute(sql`SELECT * FROM products WHERE name = '${search}'`);

// ✅ CORRETO — se precisar de raw query, usar sql template
await this.db.execute(sql`SELECT * FROM products WHERE name = ${search}`);
```

---

## 6. Multi-tenancy Security

### 6.1 Isolamento de Dados

```typescript
// REGRA: TODA query de negócio DEVE filtrar por tenant_id

// ✅ CORRETO
const products = await this.db
  .select()
  .from(schema.products)
  .where(eq(schema.products.tenantId, tenantId));

// ❌ PROIBIDO — query sem filtro de tenant
const products = await this.db.select().from(schema.products);
```

### 6.2 RLS Opcional (PostgreSQL)

```sql
-- Habilitar RLS na tabela
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Policy: users só veem dados do próprio tenant
CREATE POLICY tenant_isolation ON products
  USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- Setar tenant no início de cada request
SET app.current_tenant = 'tenant-uuid';
```

### 6.3 TenantGuard Garante tenantId

```typescript
// TenantGuard injeta tenantId no request
// Controllers usam @TenantId() para receber
// Services recebem tenantId como primeiro parâmetro

// ✅ CORRETO
@Get()
async list(@TenantId() tenantId: string) {
  return this.service.findByTenant(tenantId);
}

// ❌ PROIBIDO — pegar tenantId do body/query
@Get()
async list(@Query('tenantId') tenantId: string) {
  return this.service.findByTenant(tenantId);
}
```

---

## 7. API Keys

### 7.1 Formato e Segurança

```typescript
// Formato: gx_live_xxxxxxxxxxxxxxxxxxxxx
// Armazenamento: apenas hash no banco

// Gerar API Key
import { randomBytes, createHash } from 'node:crypto';

function generateApiKey(): { key: string; prefix: string; hash: string } {
  const raw = randomBytes(32).toString('hex');
  const prefix = 'gx_live_';
  const key = `${prefix}${raw}`;
  const hash = createHash('sha256').update(key).digest('hex');
  return { key, prefix, hash };
}

// Validar API Key
function validateApiKey(providedKey: string, storedHash: string): boolean {
  const hash = createHash('sha256').update(providedKey).digest('hex');
  return hash === storedHash;
}
```

| Regra | Valor |
|-------|-------|
| Prefixo live | `gx_live_` |
| Prefixo test | `gx_test_` |
| Armazenamento | SHA-256 hash (nunca a key completa) |
| Exibição | Apenas nos primeiros 8 chars + `...` |
| Revogação | isActive = false |

---

## 8. LGPD Compliance

### 8.1 Endpoints Obrigatórios

| Endpoint | Descrição |
|----------|-----------|
| `GET /api/v1/settings/data-export` | Exportar todos os dados do usuário (JSON) |
| `DELETE /api/v1/settings/account` | Solicitar exclusão da conta |

### 8.2 Regras de Dados Pessoais

| # | Regra |
|---|-------|
| LGPD-001 | Usuário pode exportar seus dados a qualquer momento |
| LGPD-002 | Exclusão de conta deve remover dados pessoais em 30 dias |
| LGPD-003 | Email de confirmação antes de exclusão |
| LGPD-004 | Dados financeiros (faturas) mantidos por 5 anos (obrigação fiscal) |
| LGPD-005 | Logs de auditoria mantidos por 1 ano |
| LGPD-006 | Dados de cartão NUNCA armazenados (apenas token Asaas) |
| LGPD-007 | Consentimento explícito para notificações push/email |

### 8.3 Dados que NÃO Devem Ser Expostos

```typescript
// ✅ Response DTO – campos selecionados
export class UserResponseDto {
  id: string;
  name: string;
  email: string;
  role: string;
  // NÃO incluir: passwordHash, refreshTokens, ip, userAgent
}
```

---

## 9. Variáveis de Ambiente Sensíveis

```env
# .env (NUNCA commitar)
DATABASE_URL=postgresql://...
JWT_SECRET=<min-256-bits>
ASAAS_API_KEY=<api-key>
ASAAS_WEBHOOK_TOKEN=<webhook-token>
REDIS_URL=redis://...
SUPABASE_SERVICE_KEY=<key>
RESEND_API_KEY=<key>
```

| Regra | Descrição |
|-------|-----------|
| `.env` no `.gitignore` | Obrigatório |
| `.env.example` commitado | Sem valores reais, apenas nomes das vars |
| Secrets em Railway | Variáveis definidas na dashboard |
| Rotação de secrets | A cada 90 dias (JWT_SECRET, API keys) |

---

## 10. Regras de Segurança — Resumo

| # | Nível | Regra |
|---|-------|-------|
| SEC-001 | ⚠️ REQUIRED | Helmet habilitado com CSP headers |
| SEC-002 | ⚠️ REQUIRED | CORS restrito a domínios conhecidos |
| SEC-003 | ⚠️ REQUIRED | Rate limiting em todas as rotas (3 camadas) |
| SEC-004 | 🚫 CRITICAL | Login: max 5 tentativas/minuto por IP |
| SEC-005 | 🚫 CRITICAL | **PROIBIDO** localStorage para tokens |
| SEC-006 | 🚫 CRITICAL | Refresh token: HttpOnly + Secure + SameSite=Strict |
| SEC-007 | ⚠️ REQUIRED | bcrypt com 12 rounds para senhas |
| SEC-008 | 🚫 CRITICAL | **PROIBIDO** revelar se email existe no login |
| SEC-009 | 🚫 CRITICAL | class-validator com whitelist + forbidNonWhitelisted |
| SEC-010 | ⚠️ REQUIRED | Drizzle ORM para prevenir SQL injection |
| SEC-011 | 🚫 CRITICAL | Toda query filtra por tenant_id |
| SEC-012 | 🚫 CRITICAL | **PROIBIDO** query sem filtro de tenant em dados de negócio |
| SEC-013 | ⚠️ REQUIRED | API keys hasheadas com SHA-256 |
| SEC-014 | 🚫 CRITICAL | **PROIBIDO** armazenar dados de cartão de crédito |
| SEC-015 | ⚠️ REQUIRED | LGPD: data export + account deletion obrigatórios |
| SEC-016 | ⚠️ REQUIRED | .env no .gitignore, .env.example commitado |
| SEC-017 | 🚫 CRITICAL | **PROIBIDO** `console.log` de credenciais, tokens, ou dados sensíveis |
| SEC-018 | 🚫 CRITICAL | Webhooks validados por token secreto |
| SEC-019 | ⚠️ REQUIRED | SSL/TLS obrigatório em produção (Cloudflare) |
| SEC-020 | ⚠️ REQUIRED | Rotação de secrets a cada 90 dias |

---

> **Skill File v1.0** — Security Guide  
> **Regra:** Segurança não é feature. É requisito. Toda PR deve passar por checklist de segurança.
