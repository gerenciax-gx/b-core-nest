# 01. Arquitetura do Projeto — GerenciaX Backend

> **Stack:** NestJS 10+ · TypeScript 5.4+ strict · Supabase (PostgreSQL 16+) · Drizzle ORM · Upstash Redis · BullMQ · Asaas
> **Padrão:** Modular Monolith + Hexagonal Architecture (Ports & Adapters)
> **Complementos:** `BACKEND-REQUIREMENTS.md` + `BACKEND-ARCHITECTURE.md` (em `f-core-ionic/docs/`)

---

## 1. Visão Macro da Arquitetura

```
CLIENTES (Web PWA · Mobile Capacitor · MFEs Module Federation)
         │
         ▼
  CLOUDFLARE (CDN + WAF + SSL + DDoS)
         │
         ▼
  NestJS API — Modular Monolith + Hexagonal Architecture
  ┌──────────────────────────────────────────────────┐
  │  Auth · Tenant · Product · Service · Collaborator │
  │  Marketplace · Billing · Notification · Settings  │
  │  Dashboard · Upload · Queue                       │
  │  ─────────────────────────────────────────────── │
  │  Common (Guards · Decorators · Pipes · Filters)   │
  └──────────────────────────────────────────────────┘
         │                    │
         ▼                    ▼
  SUPABASE                SERVIÇOS EXTERNOS
  (PostgreSQL · Storage)  (Asaas · Resend · FCM · Upstash)
```

---

## 2. Decisões Arquiteturais Fundamentais

| Decisão | Escolha | Justificativa |
|---------|---------|---------------|
| Padrão | Modular Monolith | MVP rápido, time 1-5 devs, módulos extraíveis para microserviços |
| Camada | Hexagonal Architecture (Ports & Adapters) | Desacoplamento TOTAL de serviços externos |
| BFF | Lightweight dentro do NestJS | Múltiplos consumidores (Web, Mobile, MFEs) |
| ORM | Drizzle ORM | Type-safe, SQL-like, performance > Prisma |
| Banco | Supabase (PostgreSQL 16+) | Gerenciado, Storage, Realtime |
| Cache | Upstash Redis (serverless) | Cache, sessions, filas |
| Pagamentos | Asaas | PIX, Boleto, Cartão, Recorrência nativa |
| Hosting | Railway | Docker, auto-scaling, CI/CD nativo |

---

## 3. Modular Monolith — Por quê?

```
Microserviços       Modular Monolith       Monolítico Tradicional
────────────        ────────────────        ──────────────────────
Alta complexidade   Equilíbrio ideal ✅    Tudo junto e misturado
Infra cara          Deploy único           Difícil de manter
Ideal: >50 devs     Ideal: 1-10 devs      Sem fronteiras claras
```

**Regra:** Cada módulo NestJS é uma unidade isolada. Módulos se comunicam via Services exportados ou EventEmitter2 para side-effects. **PROIBIDO** acessar repositórios de outro módulo diretamente.

---

## 4. Hexagonal Architecture — Resumo

O centro do hexágono é o **Domain** (regras de negócio puras). Ele define **Ports** (interfaces). A camada de **Infrastructure** implementa esses ports como **Adapters**.

```
Primary Adapters (entrada)        →  Controllers, CRON, WebSocket
Primary Ports (contratos input)   →  Use Cases interfaces
DOMAIN (núcleo puro)              →  Entities, Value Objects, Domain Services, Events
Secondary Ports (contratos output)→  Repository, Gateway, Storage interfaces
Secondary Adapters (saída)        →  Drizzle repos, Asaas gateway, Supabase storage
```

**Regra de Ouro:** O Domain NUNCA importa nada de fora. ZERO dependências externas no domain.

> Detalhes completos em `02-hexagonal-arch-guide.md`

---

## 5. Estrutura de Pastas Raiz

```
gerenciax-api/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   │
│   ├── common/                      # Cross-cutting concerns
│   │   ├── config/                  # Configurações (DB, Redis, Asaas, etc.)
│   │   ├── database/                # Drizzle provider, schemas, migrations
│   │   ├── decorators/              # @CurrentUser(), @CurrentTenant(), @Roles()
│   │   ├── guards/                  # JWT, Roles, Tenant, ForcePasswordReset, ToolPermission
│   │   ├── interceptors/            # Response wrapper, logging, timeout
│   │   ├── pipes/                   # Validation pipe
│   │   ├── filters/                 # Http exception filter
│   │   ├── types/                   # ApiResponse, Pagination
│   │   └── utils/                   # CPF/CNPJ validator, date, crypto
│   │
│   ├── modules/                     # Módulos de negócio (hexagonal)
│   │   ├── auth/
│   │   ├── tenant/
│   │   ├── product/
│   │   ├── service/
│   │   ├── collaborator/
│   │   ├── marketplace/
│   │   ├── billing/
│   │   ├── notification/
│   │   ├── settings/
│   │   ├── dashboard/
│   │   └── upload/
│   │
│   └── queue/                       # BullMQ processors e jobs
│
├── drizzle/                         # Drizzle config + migrations SQL
├── test/                            # Testes E2E
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── nest-cli.json
├── tsconfig.json
└── package.json
```

---

## 6. Estrutura Interna de Cada Módulo (Hexagonal)

Cada módulo segue **OBRIGATORIAMENTE** esta estrutura:

```
modules/{module-name}/
├── {module-name}.module.ts          # NestJS module (importa/exporta)
│
├── domain/                          # ══ DOMAIN (centro do hexágono) ══
│   ├── entities/                    # Entidades de domínio (classes puras)
│   ├── value-objects/               # Value Objects imutáveis
│   ├── events/                      # Domain Events
│   ├── services/                    # Domain Services (lógica pura sem I/O)
│   └── ports/                       # Contratos (interfaces)
│       ├── input/                   # Primary Ports (Use Cases)
│       └── output/                  # Secondary Ports (Repos, Gateways)
│
├── application/                     # ══ APPLICATION LAYER ══
│   ├── services/                    # Use Cases implementation (orquestração)
│   ├── dto/                         # Data Transfer Objects (entrada/saída)
│   ├── mappers/                     # Entity ↔ DTO mappers
│   └── jobs/                        # Background jobs deste módulo
│
└── infrastructure/                  # ══ INFRASTRUCTURE (adapters) ══
    ├── adapters/
    │   ├── primary/                 # Controllers (REST), Listeners
    │   └── secondary/               # Repos (Drizzle), Gateways (Asaas), Storage
    └── config/                      # Config específica do módulo
```

**PROIBIDO:**
- Domain importar qualquer coisa de `infrastructure/` ou `application/`
- Entidade de domínio ter decoradores NestJS (`@Injectable`, `@Entity`, etc.)
- Controller acessar repositório diretamente (sempre via Application Service)

---

## 7. Mapa de Módulos e Dependências

| Módulo | Exporta | Depende de |
|--------|---------|------------|
| `AuthModule` | `AuthService` | `TenantModule` |
| `TenantModule` | `TenantService` | — |
| `ProductModule` | `ProductService` | `UploadModule` |
| `ServiceModule` | `ServiceService` | `CollaboratorModule`, `UploadModule` |
| `CollaboratorModule` | `CollaboratorService` | `AuthModule`, `MarketplaceModule` |
| `MarketplaceModule` | `MarketplaceService` | `BillingModule` |
| `BillingModule` | `BillingService`, `InvoiceService` | `QueueModule` |
| `NotificationModule` | `NotificationService` | `QueueModule` |
| `SettingsModule` | `SettingsService` | `AuthModule`, `TenantModule` |
| `DashboardModule` | — | Todos os acima |
| `UploadModule` | `UploadService` | — |
| `QueueModule` | — | — |

---

## 8. Comunicação Entre Módulos

### Síncrona (import direto)
```typescript
// MarketplaceModule importa BillingModule
@Module({
  imports: [BillingModule],
})
export class MarketplaceModule {}

// Usa BillingService no MarketplaceService
constructor(private readonly billingService: BillingService) {}
```

### Assíncrona (EventEmitter2 para side-effects)
```typescript
// BillingModule emite evento
this.eventEmitter.emit('payment.confirmed', { tenantId, invoiceId, amount });

// NotificationModule escuta
@OnEvent('payment.confirmed')
async handlePaymentConfirmed(payload: PaymentConfirmedEvent) {
  await this.notificationService.create({
    tenantId: payload.tenantId,
    type: 'payment',
    title: 'Pagamento confirmado',
    message: `R$ ${payload.amount} recebido`,
  });
}
```

**Regra:** Comunicação síncrona via Services exportados. Comunicação assíncrona via EventEmitter2. Nunca repositório de outro módulo.

---

## 9. Infraestrutura e Hosting

| Serviço | Plataforma | Finalidade |
|---------|-----------|-----------|
| API NestJS | Railway | Container Docker, auto-deploy via GitHub |
| Banco de Dados | Supabase (PostgreSQL 16+) | DB principal + Storage |
| Cache/Queue | Upstash Redis | Cache, sessions, BullMQ |
| CDN/WAF | Cloudflare | DNS, SSL, DDoS, Edge Cache |
| Pagamentos | Asaas API v3 | PIX, Boleto, Cartão, Recorrência |
| E-mail | Resend | E-mails transacionais |
| Push | FCM | Push notifications mobile |

### Domínios
```
api.gerenciax.com.br       → Backend NestJS (Railway)
gerenciax.com.br           → Frontend (Vercel)
cdn.gerenciax.com.br       → Supabase Storage / Cloudflare R2
```

---

## 10. Multi-Tenancy

Modelo: **Column-Based** (Shared Database, Shared Schema).

- Todas as tabelas possuem coluna `tenant_id`
- Backend SEMPRE filtra por `tenant_id` extraído do JWT
- Índice em `tenant_id` em TODAS as tabelas
- RLS do PostgreSQL como camada extra de segurança (opcional)

```typescript
// Decorator para extrair tenantId
@Get()
async getProducts(@CurrentTenant() tenantId: string) {
  return this.productService.findAll(tenantId);
}
```

**PROIBIDO:** Query sem filtro de `tenant_id`. Exceção: tabelas globais (tools, tool_plans).

---

## 11. BFF — Backend for Frontend

BFF lightweight implementado dentro do NestJS:

| Rota | Consumidor | Descrição |
|------|-----------|-----------|
| `/api/v1/...` | Web + Mobile + MFEs | API REST versionada (unificada) |
| `/api/v1/mobile/...` | Mobile only | Push tokens, device info, offline sync |
| `/api/v1/mfe/:toolId/...` | MFEs only | Endpoints específicos por ferramenta |
| `/api/internal/...` | Inter-módulos (futuro) | Comunicação entre backends de MFEs |

Header obrigatório dos clientes: `X-Client-Type: web | mobile-ios | mobile-android | mfe-agendamento`

---

## 12. Ports Definidos para o GerenciaX

| Port (Interface) | Adapter Atual | Troca Fácil Para |
|------------------|--------------|-------------------|
| `ProductRepositoryPort` | `DrizzleProductRepository` | TypeORM, Prisma, Mongoose |
| `UserRepositoryPort` | `DrizzleUserRepository` | qualquer ORM |
| `InvoiceRepositoryPort` | `DrizzleInvoiceRepository` | qualquer ORM |
| `PaymentGatewayPort` | `AsaasPaymentAdapter` | Stripe, PagSeguro, Mercado Pago |
| `StoragePort` | `SupabaseStorageAdapter` | AWS S3, Cloudflare R2, MinIO |
| `EmailSenderPort` | `ResendEmailAdapter` | SendGrid, AWS SES, Mailgun |
| `PushNotificationPort` | `FcmPushAdapter` | OneSignal, Expo Push |
| `CachePort` | `UpstashCacheAdapter` | Redis local, Memcached |
| `QueuePort` | `BullMQQueueAdapter` | AWS SQS, RabbitMQ |
| `PdfGeneratorPort` | `PdfKitAdapter` | Puppeteer, jsPDF |

---

## 13. Guardrails Globais

Estes guards são aplicados **globalmente** no `app.module.ts` na seguinte ordem:

```typescript
providers: [
  { provide: APP_GUARD, useClass: JwtAuthGuard },
  { provide: APP_GUARD, useClass: ForcePasswordResetGuard },
  { provide: APP_GUARD, useClass: RolesGuard },
  { provide: APP_GUARD, useClass: TenantGuard },
]
```

1. **JwtAuthGuard** — Valida token JWT. Usa `@Public()` para rotas abertas.
2. **ForcePasswordResetGuard** — Bloqueia colaboradores que precisam redefinir senha.
3. **RolesGuard** — Verifica role (`admin`, `user`) via `@Roles()`.
4. **TenantGuard** — Injeta `tenantId` no request.

---

## 14. CI/CD Pipeline

```
git push → GitHub Actions → Lint + TypeCheck → Unit Tests → E2E Tests → Docker Build → Railway Deploy
```

| Ambiente | Branch | URL |
|----------|--------|-----|
| Development | local | `localhost:3000` |
| Staging | `develop` | `staging-api.gerenciax.com.br` |
| Production | `main` | `api.gerenciax.com.br` |

---

## 15. Referência Rápida de Documentos

| Doc | Conteúdo |
|-----|----------|
| `01-project-architecture.md` | Este documento (visão geral) |
| `02-hexagonal-arch-guide.md` | Hexagonal Architecture: Ports, Adapters, regras estritas |
| `03-coding-standards.md` | Padrões de código NestJS, TypeScript, DTOs, naming |
| `04-module-development-guide.md` | Como criar novos módulos passo a passo |
| `05-testing-strategy.md` | Testes unitários, integração, E2E |
| `06-data-modeling.md` | Drizzle schemas, migrations, modelagem por módulo |
| `07-auth-collaborator-module.md` | Auth, JWT, Colaborador→Usuário, Guards |
| `08-billing-payments-module.md` | Billing, Asaas, invoices, recorrência |
| `09-api-design-bff.md` | REST conventions, BFF, versionamento, paginação |
| `10-error-handling-logging.md` | Exception filters, logging, observabilidade |
| `11-security-guide.md` | Helmet, CORS, rate limiting, LGPD, RLS |
| `12-maintenance-new-features.md` | Manutenção, novas features, PR workflow, deploy |

---

> **Skill File v1.0** — GerenciaX Backend  
> **Regra:** Toda IA ou desenvolvedor DEVE seguir este documento como fonte da verdade da arquitetura.
