# 🏗️ GerenciaX — Arquitetura Completa do Backend

> **Stack:** NestJS + Supabase (PostgreSQL) + Drizzle ORM + Asaas (Gateway de Pagamentos)  
> **Complemento direto de:** `BACKEND-REQUIREMENTS.md`  
> **Objetivo:** Definir o System Design, infraestrutura, padrões arquiteturais, CI/CD, módulo de billing e todas as decisões técnicas para que o backend atenda de forma robusta, segura e escalável o frontend do GerenciaX.

---

## 📑 Índice

1. [Visão Geral da Arquitetura](#1-visão-geral-da-arquitetura)
2. [Padrão Arquitetural: Modular Monolith com Hexagonal Architecture](#2-padrão-arquitetural-modular-monolith-com-hexagonal-architecture)
3. [Estrutura de Pastas e Módulos NestJS](#3-estrutura-de-pastas-e-módulos-nestjs)
4. [Infraestrutura e Hospedagem](#4-infraestrutura-e-hospedagem)
5. [Banco de Dados: Supabase + PostgreSQL + Drizzle ORM](#5-banco-de-dados-supabase--postgresql--drizzle-orm)
6. [Multi-Tenancy: Estratégia de Isolamento](#6-multi-tenancy-estratégia-de-isolamento)
7. [Autenticação, Segurança e Fluxo Colaborador→Usuário](#7-autenticação-e-segurança)
8. [Sistema de Billing e Pagamentos (Asaas)](#8-sistema-de-billing-e-pagamentos-asaas)
9. [Sistema de Notificações](#9-sistema-de-notificações)
10. [Upload de Arquivos](#10-upload-de-arquivos)
11. [Fila de Tarefas Assíncronas (Jobs/Queue)](#11-fila-de-tarefas-assíncronas-jobsqueue)
12. [BFF (Backend for Frontend) — Estratégia Multi-Consumidor](#12-bff-backend-for-frontend--estratégia-multi-consumidor)
13. [CI/CD Pipeline](#13-cicd-pipeline)
14. [Observabilidade e Monitoramento](#14-observabilidade-e-monitoramento)
15. [Estratégia de Testes](#15-estratégia-de-testes)
16. [Diagrama de Infraestrutura](#16-diagrama-de-infraestrutura)
17. [Diagrama de Módulos e Dependências](#17-diagrama-de-módulos-e-dependências)
18. [Roadmap de Implementação](#18-roadmap-de-implementação)

---

## 1. Visão Geral da Arquitetura

### 1.1 Resumo Executivo

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTES                                │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐     │
│   │  Web (PWA)   │  │ Mobile App   │  │ MFEs (Ferramentas│     │
│   │ Angular/Ionic│  │  Capacitor   │  │   Module Fed.)   │     │
│   └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘     │
└──────────┼─────────────────┼───────────────────┼────────────────┘
           │                 │                   │
           ▼                 ▼                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                     CLOUDFLARE (CDN + WAF)                      │
│           DNS + SSL + DDoS Protection + Edge Cache              │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (NestJS API)                          │
│        Modular Monolith + Hexagonal Architecture (Ports/Adapters)│
│                                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │   Auth   │ │ Products │ │ Services │ │   Billing        │   │
│  │  Module  │ │  Module  │ │  Module  │ │   Module         │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │ Collabs  │ │Notificat.│ │ Settings │ │   Marketplace    │   │
│  │  Module  │ │  Module  │ │  Module  │ │   Module         │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘   │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────────────────┐    │
│  │  Upload  │ │  Queue   │ │   Shared / Common Module     │    │
│  │  Module  │ │  Module  │ │  (Guards, Pipes, Decorators)  │    │
│  └──────────┘ └──────────┘ └──────────────────────────────┘    │
└──────────────────┬───────────────┬──────────────────────────────┘
                   │               │
        ┌──────────┘               └──────────┐
        ▼                                     ▼
┌───────────────────┐              ┌────────────────────┐
│  SUPABASE         │              │  SERVIÇOS EXTERNOS  │
│  ┌──────────────┐ │              │                    │
│  │ PostgreSQL   │ │              │  ┌──────────────┐  │
│  │  (Database)  │ │              │  │    Asaas      │  │
│  └──────────────┘ │              │  │  (Payments)   │  │
│  ┌──────────────┐ │              │  └──────────────┘  │
│  │   Storage    │ │              │  ┌──────────────┐  │
│  │  (Buckets)   │ │              │  │   Resend      │  │
│  └──────────────┘ │              │  │  (E-mail)     │  │
│  ┌──────────────┐ │              │  └──────────────┘  │
│  │   Realtime   │ │              │  ┌──────────────┐  │
│  │  (WebSocket) │ │              │  │    FCM        │  │
│  └──────────────┘ │              │  │(Push Notif.)  │  │
│  ┌──────────────┐ │              │  └──────────────┘  │
│  │    Edge      │ │              │  ┌──────────────┐  │
│  │  Functions   │ │              │  │   Upstash     │  │
│  └──────────────┘ │              │  │(Redis/Queue)  │  │
└───────────────────┘              │  └──────────────┘  │
                                   └────────────────────┘
```

### 1.2 Decisões Arquiteturais Fundamentais

| Decisão | Escolha | Justificativa |
|---------|---------|---------------|
| **Padrão** | Modular Monolith | Velocidade de desenvolvimento do MVP sem complexidade de microserviços. Cada módulo é extraível para microserviço no futuro. |
| **Architeture Layer** | Hexagonal Architecture (Ports & Adapters) | Desacoplamento total de serviços externos via Ports (interfaces) e Adapters (implementações). Trocar DB, gateway de pagamento ou qualquer serviço externo = criar novo Adapter. |
| **BFF** | SIM (lightweight, dentro do NestJS) | Múltiplos consumidores (Web PWA, Mobile Capacitor, MFEs independentes). Camada BFF no NestJS com versionamento e controllers por plataforma quando necessário. |
| **ORM** | Drizzle ORM | Type-safe, performance superior ao Prisma, SQL-like, ótimo para PostgreSQL. |
| **Banco** | Supabase (PostgreSQL) | Postgres gerenciado + Storage + Realtime + Auth infra (usaremos apenas Postgres + Storage). |
| **Cache** | Upstash Redis | Redis serverless, baixo custo, ideal para cache + sessions + queues. |
| **Payments** | Asaas | Gateway brasileiro, suporte nativo a PIX, Boleto, Cartão, Recorrência. Gerenciamento de fatura fica no backend. |
| **Hosting** | Railway (API) | Deploy simples com Docker, auto-scaling, CI/CD nativo, preço justo. Alternativa: Render ou Fly.io. |

---

## 2. Padrão Arquitetural: Modular Monolith com Hexagonal Architecture

### 2.1 Por que Modular Monolith?

```
Microserviços       Modular Monolith       Monolítico Tradicional
────────────        ────────────────        ──────────────────────
Alta complexidade   Equilíbrio ideal       Tudo junto e misturado
Infra cara          Deploy único           Difícil de manter
N deploys           Módulos isolados       Acoplamento forte
Rede entre serviços Comunicação local      Sem fronteiras claras
Ideal: >50 devs     Ideal: 1-10 devs ✅    Ideal: protótipo rápido
```

**Para a GerenciaX no momento atual:**
- Time pequeno (1-5 devs)
- MVP precisa sair rápido
- Precisa ser bem organizado desde o início
- Cada módulo PODE virar microserviço no futuro sem reescrita

### 2.2 Por que Hexagonal Architecture (Ports & Adapters)?

**Objetivo principal:** Desacoplamento TOTAL de qualquer serviço externo (banco de dados, gateway de pagamento, storage, e-mail, etc.). Trocar qualquer dependência externa = criar um novo Adapter, sem tocar em NENHUMA linha de regra de negócio.

#### Comparação: Clean Arch vs Hexagonal vs Nenhum

```
Clean Architecture         Hexagonal (Ports & Adapters)         Nenhum
──────────────────         ────────────────────────────         ──────
Camadas concêntricas       Portas + Adaptadores                 Acoplado
Ótimo para separação       MELHOR para trocar serviços ✅       Rápido mas frágil
Domain → App → Infra       Domain define contratos              Tudo junto
Menos explícito sobre      Explícito: Port = interface,         Difícil manutenção
  troca de serviços          Adapter = implementação
```

**Escolha: Hexagonal Architecture** — pois o requisito principal é poder trocar banco de dados (Supabase → AWS RDS), gateway de pagamento (Asaas → Stripe), storage (Supabase → S3), e-mail (Resend → SendGrid), etc., sem alterar nenhuma regra de negócio.

#### O Hexágono Explicado

```
                           PRIMARY ADAPTERS (Driving)
                      Quem CHAMA o sistema (entrada)
                    ┌──────────────────────────────┐
                    │  HTTP Controllers (REST API)  │
                    │  WebSocket Handlers            │
                    │  CRON Job Triggers             │
                    │  CLI Commands                  │
                    │  Event Listeners               │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │        PRIMARY PORTS          │
                    │   (Input Interfaces/DTOs)     │
                    │   CreateProductUseCase         │
                    │   ProcessPaymentUseCase        │
                    │   AuthenticateUserUseCase      │
                    └──────────────┬───────────────┘
                                   │
                    ┌──────────────▼───────────────┐
                    │                              │
                    │     ╔════════════════════╗   │
                    │     ║   DOMAIN (CORE)    ║   │
                    │     ║                    ║   │
                    │     ║  • Entities        ║   │
                    │     ║  • Value Objects   ║   │
                    │     ║  • Domain Services ║   │
                    │     ║  • Domain Events   ║   │
                    │     ║  • Business Rules  ║   │
                    │     ║                    ║   │
                    │     ║  ZERO dependências ║   │
                    │     ║  externas          ║   │
                    │     ╚════════════════════╝   │
                    │                              │
                    └──────────────┬───────────────┘
                                   │
                    ┌──────────────▼───────────────┐
                    │      SECONDARY PORTS          │
                    │   (Output Interfaces)          │
                    │   ProductRepositoryPort         │
                    │   PaymentGatewayPort            │
                    │   StoragePort                   │
                    │   EmailSenderPort               │
                    │   CachePort                     │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │     SECONDARY ADAPTERS        │
                    │      (Driven / Output)        │
                    │                               │
                    │  DrizzleProductRepository     │
                    │  AsaasPaymentGateway          │
                    │  SupabaseStorageAdapter       │
                    │  ResendEmailAdapter           │
                    │  UpstashCacheAdapter          │
                    └──────────────────────────────┘
```

#### Como funciona na prática: Trocar o Asaas pelo Stripe

```typescript
// SECONDARY PORT (interface no domain — nunca muda)
export interface PaymentGatewayPort {
  createCustomer(data: CreateCustomerInput): Promise<ExternalCustomer>;
  chargeByPix(data: PixChargeInput): Promise<PixChargeResult>;
  chargeByBoleto(data: BoletoChargeInput): Promise<BoletoChargeResult>;
  chargeByCreditCard(data: CreditCardChargeInput): Promise<CreditCardChargeResult>;
  cancelPayment(externalId: string): Promise<void>;
  refundPayment(externalId: string, amount?: number): Promise<void>;
}

// ADAPTER ATUAL — Asaas
@Injectable()
export class AsaasPaymentAdapter implements PaymentGatewayPort {
  async chargeByPix(data: PixChargeInput): Promise<PixChargeResult> {
    // Chama API do Asaas
    const response = await fetch(`${this.baseUrl}/payments`, { ... });
    return this.mapToPixResult(response);
  }
}

// ADAPTER FUTURO — Stripe (só criar este arquivo!)
@Injectable()
export class StripePaymentAdapter implements PaymentGatewayPort {
  async chargeByPix(data: PixChargeInput): Promise<PixChargeResult> {
    // Chama API do Stripe
    const paymentIntent = await this.stripe.paymentIntents.create({ ... });
    return this.mapToPixResult(paymentIntent);
  }
}

// NO MODULE — trocar o binding:
// providers: [{ provide: 'PaymentGatewayPort', useClass: AsaasPaymentAdapter }]
// →
// providers: [{ provide: 'PaymentGatewayPort', useClass: StripePaymentAdapter }]
```

**Nenhuma linha de regra de negócio precisa mudar.** O PaymentService (Application Layer) usa `PaymentGatewayPort` — ele não sabe se é Asaas, Stripe ou qualquer outro.

#### Ports Definidos para o GerenciaX

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

#### Estrutura de Pastas (Hexagonal) Dentro de Cada Módulo

```
modules/billing/
├── billing.module.ts
│
├── domain/                              # ═══ CORE (Centro do hexágono) ═══
│   ├── entities/                        # Entidades de domínio
│   │   ├── invoice.entity.ts
│   │   ├── subscription.entity.ts
│   │   └── billing-info.entity.ts
│   ├── value-objects/                   # Value Objects
│   │   ├── money.vo.ts
│   │   └── payment-method.vo.ts
│   ├── events/                          # Domain Events
│   │   ├── invoice-created.event.ts
│   │   └── payment-confirmed.event.ts
│   ├── services/                        # Domain Services (lógica pura)
│   │   └── invoice-calculator.service.ts
│   └── ports/                           # ═══ PORTS (contratos) ═══
│       ├── input/                       # Primary Ports (entrada)
│       │   ├── create-invoice.usecase.ts
│       │   ├── process-payment.usecase.ts
│       │   └── subscribe-tool.usecase.ts
│       └── output/                      # Secondary Ports (saída)
│           ├── invoice.repository.port.ts
│           ├── subscription.repository.port.ts
│           ├── payment-gateway.port.ts
│           └── pdf-generator.port.ts
│
├── application/                         # ═══ USE CASES (orquestração) ═══
│   ├── services/
│   │   ├── subscription.service.ts      # Implementa subscribe-tool.usecase
│   │   ├── invoice.service.ts           # Implementa create-invoice.usecase
│   │   └── payment.service.ts           # Implementa process-payment.usecase
│   ├── dto/
│   │   ├── subscribe-tool.dto.ts
│   │   ├── create-invoice.dto.ts
│   │   └── pay-invoice.dto.ts
│   ├── mappers/
│   │   ├── invoice.mapper.ts
│   │   └── subscription.mapper.ts
│   └── jobs/
│       ├── generate-monthly-invoices.job.ts
│       └── check-overdue-invoices.job.ts
│
└── infrastructure/                      # ═══ ADAPTERS (implementações) ═══
    ├── adapters/
    │   ├── primary/                     # Driving Adapters (entrada)
    │   │   ├── subscription.controller.ts
    │   │   ├── invoice.controller.ts
    │   │   └── webhook.controller.ts
    │   └── secondary/                   # Driven Adapters (saída)
    │       ├── persistence/
    │       │   ├── drizzle-invoice.repository.ts
    │       │   └── drizzle-subscription.repository.ts
    │       ├── payment/
    │       │   └── asaas-payment.adapter.ts
    │       └── pdf/
    │           └── pdfkit-pdf.adapter.ts
    └── config/
        └── billing.config.ts
```

**Regra de ouro:** O Domain NUNCA importa nada de fora. Ele define Ports (interfaces). A camada de Infrastructure implementa esses Ports como Adapters. O NestJS faz o binding via `providers` no module.

### 2.3 Comunicação Entre Módulos

```
┌──────────────┐       EventEmitter        ┌──────────────┐
│   Billing    │ ──────────────────────▶   │ Notification │
│   Module     │    BillingEvents          │   Module     │
└──────────────┘   (InvoiceCreated,        └──────────────┘
                    PaymentReceived)

┌──────────────┐       Direct Import       ┌──────────────┐
│  Marketplace │ ──────────────────────▶   │   Billing    │
│   Module     │   BillingService          │   Module     │
└──────────────┘   (subscribeTool)         └──────────────┘
```

- **Comunicação síncrona:** Um módulo pode importar o Service de outro (via NestJS module exports).
- **Comunicação assíncrona:** Eventos (NestJS `EventEmitter2`) para side-effects (ex: pagamento confirmado → notificação criada).
- **Regra:** Nunca acessar repositórios de outro módulo diretamente. Sempre via Service exportado.

---

## 3. Estrutura de Pastas e Módulos NestJS

### 3.1 Estrutura Raiz

```
gerenciax-api/
├── src/
│   ├── main.ts                          # Bootstrap da aplicação
│   ├── app.module.ts                    # Root module (importa todos os módulos)
│   │
│   ├── common/                          # === SHARED / CROSS-CUTTING ===
│   │   ├── config/
│   │   │   ├── app.config.ts            # Configurações gerais
│   │   │   ├── database.config.ts       # Config do Supabase/Drizzle
│   │   │   ├── asaas.config.ts          # Config do Asaas
│   │   │   ├── storage.config.ts        # Config do Supabase Storage
│   │   │   └── redis.config.ts          # Config do Upstash Redis
│   │   ├── database/
│   │   │   ├── drizzle.provider.ts      # Provider do Drizzle para NestJS
│   │   │   ├── schema/                  # Drizzle schemas (todas as tabelas)
│   │   │   │   ├── index.ts
│   │   │   │   ├── tenant.schema.ts
│   │   │   │   ├── user.schema.ts
│   │   │   │   ├── product.schema.ts
│   │   │   │   ├── service.schema.ts
│   │   │   │   ├── collaborator.schema.ts
│   │   │   │   ├── subscription.schema.ts
│   │   │   │   ├── invoice.schema.ts
│   │   │   │   ├── notification.schema.ts
│   │   │   │   ├── tool.schema.ts
│   │   │   │   ├── billing.schema.ts
│   │   │   │   └── ...
│   │   │   └── migrations/              # Drizzle migrations
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts    # @CurrentUser() decorator
│   │   │   ├── current-tenant.decorator.ts  # @CurrentTenant() decorator
│   │   │   └── roles.decorator.ts           # @Roles('admin') decorator
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   ├── roles.guard.ts
│   │   │   └── tenant.guard.ts              # Verifica tenantId no JWT
│   │   ├── interceptors/
│   │   │   ├── response.interceptor.ts      # Wrapper { data, message, success }
│   │   │   ├── logging.interceptor.ts       # Request/Response logging
│   │   │   └── timeout.interceptor.ts
│   │   ├── pipes/
│   │   │   └── validation.pipe.ts
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts     # Padroniza erros
│   │   ├── types/
│   │   │   ├── api-response.type.ts
│   │   │   └── pagination.type.ts
│   │   └── utils/
│   │       ├── cpf-cnpj.validator.ts
│   │       ├── date.util.ts
│   │       └── crypto.util.ts
│   │
│   ├── modules/                         # === MÓDULOS DE NEGÓCIO ===
│   │   │
│   │   ├── auth/                        # ── AUTENTICAÇÃO ──
│   │   │   ├── auth.module.ts
│   │   │   ├── domain/
│   │   │   │   ├── entities/
│   │   │   │   │   └── user.entity.ts
│   │   │   │   └── ports/
│   │   │   │       ├── input/
│   │   │   │       │   ├── authenticate.usecase.ts
│   │   │   │       │   └── register.usecase.ts
│   │   │   │       └── output/
│   │   │   │           ├── user.repository.port.ts
│   │   │   │           └── hasher.port.ts           # bcrypt ou argon2
│   │   │   ├── application/
│   │   │   │   ├── services/
│   │   │   │   │   └── auth.service.ts
│   │   │   │   ├── dto/
│   │   │   │   │   ├── login.dto.ts
│   │   │   │   │   ├── signup.dto.ts
│   │   │   │   │   ├── reset-password.dto.ts
│   │   │   │   │   └── token.dto.ts
│   │   │   │   └── mappers/
│   │   │   │       └── user.mapper.ts
│   │   │   └── infrastructure/
│   │   │       ├── adapters/
│   │   │       │   ├── primary/
│   │   │       │   │   └── auth.controller.ts
│   │   │       │   └── secondary/
│   │   │       │       ├── drizzle-user.repository.ts
│   │   │       │       └── bcrypt-hasher.adapter.ts
│   │   │       └── strategies/
│   │   │           └── jwt.strategy.ts
│   │   │
│   │   ├── tenant/                      # ── EMPRESA (TENANT) ──
│   │   │   ├── tenant.module.ts
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   └── infrastructure/
│   │   │
│   │   ├── product/                     # ── PRODUTOS ──
│   │   │   ├── product.module.ts
│   │   │   ├── domain/
│   │   │   │   ├── entities/
│   │   │   │   │   ├── product.entity.ts
│   │   │   │   │   ├── product-variation.entity.ts
│   │   │   │   │   └── product-category.entity.ts
│   │   │   │   └── ports/
│   │   │   │       ├── input/
│   │   │   │       │   └── manage-product.usecase.ts
│   │   │   │       └── output/
│   │   │   │           └── product.repository.port.ts
│   │   │   ├── application/
│   │   │   │   ├── services/
│   │   │   │   │   └── product.service.ts
│   │   │   │   ├── dto/
│   │   │   │   │   ├── create-product.dto.ts
│   │   │   │   │   ├── update-product.dto.ts
│   │   │   │   │   └── product-response.dto.ts
│   │   │   │   └── mappers/
│   │   │   │       └── product.mapper.ts
│   │   │   └── infrastructure/
│   │   │       ├── adapters/
│   │   │       │   ├── primary/
│   │   │       │   │   └── product.controller.ts
│   │   │       │   └── secondary/
│   │   │       │       └── drizzle-product.repository.ts
│   │   │       └── config/
│   │   │
│   │   ├── service/                     # ── SERVIÇOS ──
│   │   │   ├── service.module.ts
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   └── infrastructure/
│   │   │
│   │   ├── collaborator/               # ── COLABORADORES + AUTO-CREATE USER ──
│   │   │   ├── collaborator.module.ts
│   │   │   ├── domain/
│   │   │   │   ├── entities/
│   │   │   │   │   ├── collaborator.entity.ts
│   │   │   │   │   └── tool-permission.entity.ts
│   │   │   │   └── ports/
│   │   │   │       └── output/
│   │   │   │           ├── collaborator.repository.port.ts
│   │   │   │           └── tool-permission.repository.port.ts
│   │   │   ├── application/
│   │   │   │   ├── services/
│   │   │   │   │   ├── collaborator.service.ts  # Cria collab + user
│   │   │   │   │   └── permission.service.ts    # CRUD permissões
│   │   │   │   └── dto/
│   │   │   └── infrastructure/
│   │   │       └── adapters/
│   │   │
│   │   ├── marketplace/                # ── MARKETPLACE (FERRAMENTAS) ──
│   │   │   ├── marketplace.module.ts
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   └── infrastructure/
│   │   │
│   │   ├── billing/                    # ── BILLING & PAGAMENTOS ──
│   │   │   ├── billing.module.ts
│   │   │   ├── domain/
│   │   │   │   ├── entities/
│   │   │   │   │   ├── subscription.entity.ts
│   │   │   │   │   ├── subscribed-tool.entity.ts
│   │   │   │   │   ├── invoice.entity.ts
│   │   │   │   │   └── billing-info.entity.ts
│   │   │   │   ├── value-objects/
│   │   │   │   │   ├── money.vo.ts
│   │   │   │   │   └── payment-method.vo.ts
│   │   │   │   ├── events/
│   │   │   │   │   ├── invoice-created.event.ts
│   │   │   │   │   ├── payment-confirmed.event.ts
│   │   │   │   │   └── subscription-overdue.event.ts
│   │   │   │   └── repositories/
│   │   │   │       ├── subscription.repository.interface.ts
│   │   │   │       └── invoice.repository.interface.ts
│   │   │   ├── application/
│   │   │   │   ├── services/
│   │   │   │   │   ├── subscription.service.ts
│   │   │   │   │   ├── invoice.service.ts
│   │   │   │   │   └── payment.service.ts
│   │   │   │   ├── dto/
│   │   │   │   │   ├── subscribe-tool.dto.ts
│   │   │   │   │   ├── upgrade-plan.dto.ts
│   │   │   │   │   ├── create-invoice.dto.ts
│   │   │   │   │   └── pay-invoice.dto.ts
│   │   │   │   ├── jobs/
│   │   │   │   │   ├── generate-monthly-invoices.job.ts
│   │   │   │   │   ├── check-overdue-invoices.job.ts
│   │   │   │   │   └── process-webhook.job.ts
│   │   │   │   └── mappers/
│   │   │   ├── infrastructure/
│   │   │   │   ├── controllers/
│   │   │   │   │   ├── subscription.controller.ts
│   │   │   │   │   ├── invoice.controller.ts
│   │   │   │   │   └── webhook.controller.ts
│   │   │   │   ├── repositories/
│   │   │   │   │   ├── drizzle-subscription.repository.ts
│   │   │   │   │   └── drizzle-invoice.repository.ts
│   │   │   │   ├── gateways/
│   │   │   │   │   └── asaas.gateway.ts
│   │   │   │   └── pdf/
│   │   │   │       └── invoice-pdf.generator.ts
│   │   │
│   │   ├── notification/               # ── NOTIFICAÇÕES ──
│   │   │   ├── notification.module.ts
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   │   ├── services/
│   │   │   │   │   └── notification.service.ts
│   │   │   │   └── listeners/
│   │   │   │       ├── billing.listener.ts
│   │   │   │       ├── stock.listener.ts
│   │   │   │       └── system.listener.ts
│   │   │   └── infrastructure/
│   │   │       ├── controllers/
│   │   │       ├── repositories/
│   │   │       └── channels/
│   │   │           ├── email.channel.ts
│   │   │           ├── push.channel.ts
│   │   │           └── sms.channel.ts
│   │   │
│   │   ├── settings/                   # ── CONFIGURAÇÕES ──
│   │   │   ├── settings.module.ts
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   └── infrastructure/
│   │   │
│   │   ├── dashboard/                  # ── DASHBOARD (agregação) ──
│   │   │   ├── dashboard.module.ts
│   │   │   └── application/
│   │   │       └── services/
│   │   │           └── dashboard.service.ts  # Agrega dados de vários módulos
│   │   │
│   │   └── upload/                     # ── UPLOAD DE ARQUIVOS ──
│   │       ├── upload.module.ts
│   │       ├── application/
│   │       │   └── services/
│   │       │       └── upload.service.ts
│   │       └── infrastructure/
│   │           ├── controllers/
│   │           │   └── upload.controller.ts
│   │           └── storage/
│   │               └── supabase-storage.adapter.ts
│   │
│   └── queue/                          # === SISTEMA DE FILAS ===
│       ├── queue.module.ts
│       ├── processors/
│       │   ├── email.processor.ts
│       │   ├── invoice.processor.ts
│       │   ├── notification.processor.ts
│       │   └── pdf.processor.ts
│       └── jobs/
│           └── job-definitions.ts
│
├── drizzle/                            # Drizzle config e migrations
│   ├── drizzle.config.ts
│   └── migrations/
│       └── 0001_initial.sql
│
├── test/                               # Testes E2E
│   ├── auth.e2e-spec.ts
│   ├── product.e2e-spec.ts
│   └── billing.e2e-spec.ts
│
├── docker-compose.yml                  # Dev environment local
├── Dockerfile                          # Build de produção
├── .env.example
├── .env.development
├── .env.production
├── nest-cli.json
├── tsconfig.json
├── tsconfig.build.json
├── package.json
└── README.md
```

### 3.2 Mapa de Módulos NestJS

| Módulo | Responsabilidade | Exporta | Depende de |
|--------|-----------------|---------|------------|
| `AuthModule` | Login, Signup, JWT, Refresh, 2FA | `AuthService` | `TenantModule` |
| `TenantModule` | CRUD de empresa, endereço, dados comerciais | `TenantService` | — |
| `ProductModule` | CRUD de produtos, variações, categorias | `ProductService` | `UploadModule` |
| `ServiceModule` | CRUD de serviços, variações, profissionais | `ServiceService` | `CollaboratorModule`, `UploadModule` |
| `CollaboratorModule` | CRUD de colaboradores, auto-criação de User, permissões por ferramenta, ToolPermissionGuard | `CollaboratorService` | `AuthModule`, `MarketplaceModule` |
| `MarketplaceModule` | Catálogo de ferramentas, planos | `MarketplaceService` | `BillingModule` |
| `BillingModule` | Assinaturas, faturas, cobranças, Asaas | `BillingService`, `InvoiceService` | `QueueModule` |
| `NotificationModule` | CRUD notificações, push, email, SMS | `NotificationService` | `QueueModule` |
| `SettingsModule` | Preferências, segurança, integrações | `SettingsService` | `AuthModule`, `TenantModule` |
| `DashboardModule` | Agregação de dados para tela principal | — | Todos os acima |
| `UploadModule` | Upload de imagens para Supabase Storage | `UploadService` | — |
| `QueueModule` | BullMQ + Upstash Redis | — | — |

---

## 4. Infraestrutura e Hospedagem

### 4.1 Topologia de Servidores

```
┌───────────────────────────────────────────────────────────────┐
│                        PRODUÇÃO                               │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  RAILWAY (ou Render)                                    │  │
│  │  ┌─────────────────────────────────────────────────┐    │  │
│  │  │ gerenciax-api (NestJS)                          │    │  │
│  │  │ • Container Docker                               │    │  │
│  │  │ • 1 vCPU / 1GB RAM (escala horizontal)          │    │  │
│  │  │ • Auto-deploy via GitHub                         │    │  │
│  │  │ • Health check: /api/health                      │    │  │
│  │  │ • Port: 3000                                     │    │  │
│  │  └─────────────────────────────────────────────────┘    │  │
│  │                                                          │  │
│  │  ┌─────────────────────────────────────────────────┐    │  │
│  │  │ gerenciax-worker (NestJS CLI)        [FUTURO]   │    │  │
│  │  │ • Processador de filas (BullMQ)                  │    │  │
│  │  │ • Emails, PDFs, Webhooks                         │    │  │
│  │  │ • Pode rodar no mesmo container inicialmente     │    │  │
│  │  └─────────────────────────────────────────────────┘    │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  SUPABASE (Gerenciado)                                  │  │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────────────┐   │  │
│  │  │ PostgreSQL │ │  Storage   │ │    Realtime        │   │  │
│  │  │  Database  │ │  Buckets   │ │   (WebSocket)      │   │  │
│  │  │  (Free→Pro)│ │  (Images)  │ │  (Notificações)    │   │  │
│  │  └────────────┘ └────────────┘ └────────────────────┘   │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  UPSTASH (Serverless)                                   │  │
│  │  ┌────────────────┐ ┌──────────────────────────────┐    │  │
│  │  │  Redis          │ │  QStash (Queue as a Service) │    │  │
│  │  │  (Cache +       │ │  (Alternativa ao BullMQ)     │    │  │
│  │  │   Sessions)     │ │                              │    │  │
│  │  └────────────────┘ └──────────────────────────────┘    │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  CLOUDFLARE                                             │  │
│  │  ┌──────┐ ┌───────┐ ┌──────────┐ ┌──────────────────┐  │  │
│  │  │ DNS  │ │  SSL  │ │   WAF    │ │  R2 (CDN/Files)  │  │  │
│  │  └──────┘ └───────┘ └──────────┘ └──────────────────┘  │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

### 4.2 Comparação de Hosting

| Plataforma | Prós | Contras | Custo Estimado |
|------------|------|---------|----------------|
| **Railway** ✅ | Deploy fácil, Docker nativo, auto-scaling, CI/CD integrado, free tier generoso | Pode ficar caro com alto tráfego | $5-20/mês (MVP) |
| **Render** | Similar ao Railway, bom free tier | Cold starts no free tier | $7-25/mês (MVP) |
| **Fly.io** | Edge deploy, muito rápido, escala global | Config mais complexa | $5-15/mês (MVP) |
| **AWS ECS/Fargate** | Infinitamente escalável | Complexidade muito alta, caro para MVP | $50+/mês |
| **Vercel** | Ótimo para frontend | Não ideal para NestJS long-running | N/A para backend |

**Decisão: Railway para MVP. Migrar para AWS ECS quando necessário.**

### 4.3 Domínios e DNS

```
gerenciax.com.br           → Frontend (Vercel)
api.gerenciax.com.br       → Backend NestJS (Railway)
cdn.gerenciax.com.br       → Supabase Storage / Cloudflare R2
ws.gerenciax.com.br        → Supabase Realtime (WebSocket)
```

### 4.4 Custos Estimados (MVP — primeiros 6 meses)

| Serviço | Plano | Custo/mês |
|---------|-------|-----------|
| Railway (API) | Starter | $5 - $20 |
| Supabase (DB + Storage) | Free → Pro | $0 - $25 |
| Upstash (Redis + Queue) | Free → Pay-as-you-go | $0 - $10 |
| Cloudflare (DNS + WAF) | Free | $0 |
| Resend (E-mail) | Free → Starter | $0 - $20 |
| Asaas (Payments) | Transacional | Taxa por transação |
| **TOTAL MVP** | | **~$10 - $75/mês** |

---

## 5. Banco de Dados: Supabase + PostgreSQL + Drizzle ORM

### 5.1 Por que essa combinação?

| Componente | Justificativa |
|------------|---------------|
| **Supabase** | PostgreSQL gerenciado, backups automáticos, dashboard visual, Storage integrado, Realtime (WebSocket), Row Level Security nativo. |
| **Drizzle ORM** | Type-safe com TypeScript, zero overhead de runtime, sintaxe SQL-like, migrations robustas, performance superior ao Prisma, excelente para PostgreSQL. |
| **PostgreSQL** | JSONB para campos flexíveis, extensões (pg_cron para jobs, pgcrypto para crypto), Row Level Security, full-text search nativo. |

### 5.2 Configuração do Drizzle com NestJS

```typescript
// src/common/database/drizzle.provider.ts

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export const DRIZZLE = Symbol('DRIZZLE');

export const DrizzleProvider = {
  provide: DRIZZLE,
  useFactory: () => {
    const client = postgres(process.env.DATABASE_URL!, {
      max: 10,          // Pool de conexões
      idle_timeout: 20,
      connect_timeout: 10,
    });
    return drizzle(client, { schema });
  },
};
```

### 5.3 Exemplo de Schema Drizzle (Tenant + User)

```typescript
// src/common/database/schema/tenant.schema.ts

import { pgTable, uuid, varchar, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';

export const companyTypeEnum = pgEnum('company_type', ['produtos', 'servicos', 'ambos']);

export const tenants = pgTable('tenants', {
  id: uuid('id').defaultRandom().primaryKey(),
  tradeName: varchar('trade_name', { length: 255 }).notNull(),
  legalName: varchar('legal_name', { length: 255 }),
  cnpj: varchar('cnpj', { length: 14 }),
  companyType: companyTypeEnum('company_type').notNull(),
  
  // Endereço (embedded como colunas — evita JOIN desnecessário)
  addressStreet: varchar('address_street', { length: 255 }),
  addressNumber: varchar('address_number', { length: 20 }),
  addressComplement: varchar('address_complement', { length: 100 }),
  addressNeighborhood: varchar('address_neighborhood', { length: 100 }),
  addressZipCode: varchar('address_zip_code', { length: 8 }),
  addressCity: varchar('address_city', { length: 100 }),
  addressState: varchar('address_state', { length: 2 }),
  addressCountry: varchar('address_country', { length: 50 }).default('Brasil'),
  
  // Social
  socialWebsite: text('social_website'),
  socialInstagram: text('social_instagram'),
  socialFacebook: text('social_facebook'),
  socialLinkedin: text('social_linkedin'),
  
  // Business Data (JSONB para flexibilidade)
  businessData: text('business_data'), // JSON stringified
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// src/common/database/schema/user.schema.ts

import { pgTable, uuid, varchar, boolean, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { tenants } from './tenant.schema';

export const userRoleEnum = pgEnum('user_role', ['admin', 'user']);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  cpf: varchar('cpf', { length: 11 }),
  birthDate: timestamp('birth_date'),
  photoUrl: text('photo_url'),
  role: userRoleEnum('role').default('admin').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  
  // === CAMPOS PARA USUÁRIO CRIADO VIA COLABORADOR ===
  collaboratorId: uuid('collaborator_id'),  // NULL para admin, preenchido para colaborador
  mustResetPassword: boolean('must_reset_password').default(false).notNull(),
  lastPasswordResetAt: timestamp('last_password_reset_at'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### 5.4 Estratégia de Migrations

```bash
# Gerar migration
npx drizzle-kit generate:pg

# Aplicar migration
npx drizzle-kit push:pg

# Visualizar schema
npx drizzle-kit studio
```

**Fluxo:**
1. Alterar schema no TypeScript
2. `drizzle-kit generate` → gera SQL de migration
3. Revisar SQL manualmente
4. `drizzle-kit push` → aplica no banco
5. Commit do schema + migration

### 5.5 Índices Obrigatórios

```sql
-- Índice em TODAS as tabelas por tenant_id (performance multi-tenant)
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_products_tenant ON products(tenant_id);
CREATE INDEX idx_services_tenant ON services(tenant_id);
CREATE INDEX idx_collaborators_tenant ON collaborators(tenant_id);
CREATE INDEX idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX idx_notifications_tenant_user ON notifications(tenant_id, user_id);

-- Índice para buscas frequentes
CREATE INDEX idx_products_sku ON products(tenant_id, sku);
CREATE INDEX idx_invoices_status ON invoices(status, due_date);
CREATE INDEX idx_notifications_unread ON notifications(tenant_id, status) WHERE status = 'unread';
```

---

## 6. Multi-Tenancy: Estratégia de Isolamento

### 6.1 Abordagem Escolhida: Column-Based (Shared Database, Shared Schema)

```
┌────────────────────────────────────────────┐
│              PostgreSQL (Supabase)          │
│                                            │
│  ┌─────────────────────────────────────┐   │
│  │        Tabela: products             │   │
│  │  ┌────────┬────────────┬─────────┐  │   │
│  │  │  id    │ tenant_id  │  name   │  │   │
│  │  ├────────┼────────────┼─────────┤  │   │
│  │  │ uuid-1 │ tenant-A   │ Produto │  │   │
│  │  │ uuid-2 │ tenant-B   │ Outro   │  │   │ ← Dados de todos os
│  │  │ uuid-3 │ tenant-A   │ Mais um │  │   │   tenants na mesma tabela
│  │  └────────┴────────────┴─────────┘  │   │
│  └─────────────────────────────────────┘   │
└────────────────────────────────────────────┘
```

**Todas** as tabelas que pertencem a um tenant possuem a coluna `tenant_id`. O backend **SEMPRE** filtra por `tenant_id` extraído do JWT.

### 6.2 Implementação no NestJS — TenantGuard + Decorator

```typescript
// @CurrentTenant() decorator — extrai tenantId do JWT
export const CurrentTenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.tenantId;
  },
);

// Uso no controller
@Get()
async getProducts(@CurrentTenant() tenantId: string) {
  return this.productService.findAll(tenantId);
}

// No service
async findAll(tenantId: string) {
  return this.db
    .select()
    .from(products)
    .where(eq(products.tenantId, tenantId));
}
```

### 6.3 Segurança Extra: RLS do PostgreSQL (opcional, recomendado)

```sql
-- Habilitar RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Policy: só acessa seu tenant
CREATE POLICY tenant_isolation ON products
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Setar o tenant na conexão (feito pelo middleware NestJS)
SET app.tenant_id = 'uuid-do-tenant';
```

---

## 7. Autenticação e Segurança

### 7.1 Fluxo Completo de Autenticação

```
                  ┌───────────┐
                  │  Frontend │
                  └─────┬─────┘
                        │
              POST /auth/login
            { email, password }
                        │
                        ▼
              ┌─────────────────┐
              │   AuthController │
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐     ┌──────────────┐
              │   AuthService    │────▶│   bcrypt      │
              │                  │     │   compare()   │
              └────────┬────────┘     └──────────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
  ┌──────────┐  ┌──────────┐  ┌──────────────────┐
  │  Access   │  │ Refresh  │  │  Session criada   │
  │  Token    │  │  Token   │  │  no DB (devices)  │
  │ (15 min)  │  │ (30 dias)│  │                   │
  └──────────┘  └──────────┘  └──────────────────┘
       │              │
       ▼              ▼
  Header:          HttpOnly Cookie
  Authorization:   (Secure, SameSite=Strict)
  Bearer <token>
```

### 7.2 Estratégia JWT com NestJS

```typescript
// JWT Payload (claims)
interface JwtPayload {
  sub: string;              // userId
  email: string;
  tenantId: string;
  role: 'admin' | 'user';
  collaboratorId?: string;  // presente apenas para usuários criados via colaborador
  mustResetPassword: boolean;
}

// Configuração
JwtModule.registerAsync({
  useFactory: () => ({
    secret: process.env.JWT_SECRET,
    signOptions: { expiresIn: '15m' },
  }),
});
```

### 7.3 Headers de Segurança (Helmet)

```typescript
// main.ts
import helmet from 'helmet';

app.use(helmet());
app.enableCors({
  origin: [
    'https://gerenciax.com.br',
    'https://app.gerenciax.com.br',
    'http://localhost:4200',  // dev
  ],
  credentials: true,
});
```

### 7.4 Rate Limiting

```typescript
import { ThrottlerModule } from '@nestjs/throttler';

ThrottlerModule.forRoot({
  ttl: 60,      // 60 segundos
  limit: 100,   // 100 requisições por minuto
});

// Rate limiting específico para auth (mais restritivo)
@Throttle(5, 900)  // 5 tentativas a cada 15 min
@Post('login')
async login() { ... }
```

### 7.5 Fluxo: Colaborador → Usuário (Acesso ao Sistema)

Quando o admin (dono da empresa) cria um colaborador, o sistema automaticamente cria um **usuário** vinculado a esse colaborador, com senha aleatória e obrigatoriedade de redefinição no primeiro login.

#### Fluxo Completo

```
ADMIN: POST /api/collaborators
{ name: "Maria", email: "maria@email.com", role: "user", toolPermissions: [...] }
    │
    ▼
CollaboratorService.create():
    1. Valida dados do colaborador
    2. Cria registro na tabela `collaborators` (dados profissionais)
    3. Gera senha aleatória segura (crypto.randomBytes → base64, 16 chars)
    4. Cria registro na tabela `users` com:
       • role = 'user'
       • collaboratorId = collaborator.id
       • mustResetPassword = true
       • passwordHash = bcrypt(senhaAleatoria)
    5. Cria permissões de ferramentas (collaborator_tool_permissions)
    6. Envia e-mail para o colaborador com:
       • Link de acesso ao sistema
       • Email de login
       • Senha temporária (ou magic link)
    │
    ▼
COLABORADOR acessa o sistema:
    POST /api/auth/login { email, password: senhaTemporaria }
    │
    ▼
AuthService.login():
    1. Valida credenciais (bcrypt.compare)
    2. Verifica user.mustResetPassword === true
    3. Retorna JWT com claim { mustResetPassword: true }
    4. Frontend detecta a flag e REDIRECIONA para tela de redefinição
    │
    ▼
Frontend: Tela de "Redefinir Senha" (obrigatória, não pode navegar)
    POST /api/auth/reset-password { currentPassword, newPassword }
    │
    ▼
AuthService.resetPassword():
    1. Valida senha atual
    2. Valida nova senha (mín 8 chars, complexidade)
    3. Atualiza passwordHash
    4. Seta mustResetPassword = false
    5. Seta lastPasswordResetAt = now()
    6. Gera novo JWT (sem flag mustResetPassword)
    7. Colaborador agora acessa o sistema normalmente
```

#### Middleware de Proteção: ForcePasswordResetGuard

```typescript
@Injectable()
export class ForcePasswordResetGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Se o usuário precisa redefinir senha, bloqueia TODAS as rotas
    // exceto /auth/reset-password e /auth/logout
    if (user?.mustResetPassword) {
      const path = request.route?.path;
      const allowedPaths = ['/api/auth/reset-password', '/api/auth/logout'];
      if (!allowedPaths.includes(path)) {
        throw new ForbiddenException({
          code: 'PASSWORD_RESET_REQUIRED',
          message: 'Você precisa redefinir sua senha antes de continuar.',
        });
      }
    }

    return true;
  }
}

// Aplicar GLOBALMENTE no app.module.ts:
APP_GUARD: [JwtAuthGuard, ForcePasswordResetGuard, RolesGuard, TenantGuard]
```

#### Permissões do Colaborador (O que ele pode acessar)

```typescript
// Schema: collaborator_tool_permissions
export const collaboratorToolPermissions = pgTable('collaborator_tool_permissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  collaboratorId: uuid('collaborator_id').references(() => collaborators.id).notNull(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  
  toolId: varchar('tool_id', { length: 50 }).notNull(),    // Ex: 'agendamento', 'estoque'
  canView: boolean('can_view').default(true).notNull(),
  canEdit: boolean('can_edit').default(false).notNull(),
  canDelete: boolean('can_delete').default(false).notNull(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Guard que verifica permissão por ferramenta
@Injectable()
export class ToolPermissionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    // Admin tem acesso total
    if (user.role === 'admin') return true;
    
    // Colaborador: verificar permissão para a ferramenta específica
    const toolId = Reflect.getMetadata('toolId', context.getHandler());
    const requiredAction = Reflect.getMetadata('toolAction', context.getHandler());
    // 'view', 'edit', 'delete'
    
    return this.permissionService.hasPermission(
      user.collaboratorId, toolId, requiredAction
    );
  }
}

// Uso no controller:
@Get('appointments')
@SetMetadata('toolId', 'agendamento')
@SetMetadata('toolAction', 'view')
@UseGuards(ToolPermissionGuard)
async getAppointments() { ... }
```

#### O que o colaborador pode ver/fazer

| Escopo | Admin | Colaborador (role: user) |
|--------|-------|-------------------------|
| Dashboard | Visão completa | Visão limitada (só seus dados) |
| Produtos | CRUD completo | Somente se tiver permissão na ferramenta |
| Serviços | CRUD completo | Somente se tiver permissão na ferramenta |
| Ferramentas | Todas assinadas | Apenas as que o admin liberou |
| Configurações | Todas as abas | Apenas "Pessoal" (seus dados) |
| Faturamento | Visão completa | Sem acesso |
| Colaboradores | CRUD | Sem acesso |
| Marketplace | Assinar/cancelar | Sem acesso |
| Seu perfil | Editar | Editar (nome, foto, senha) |

---

## 8. Sistema de Billing e Pagamentos (Asaas)

### 8.1 Visão Geral do Módulo de Billing

Este é o módulo mais crítico do sistema. O **backend da GerenciaX é o dono da fatura**. O Asaas é APENAS o executor da cobrança.

```
┌─────────────────────────────────────────────────────────────────┐
│                    BILLING MODULE (NestJS)                       │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │               SUBSCRIPTION SERVICE                       │    │
│  │  • Gerencia quais ferramentas o tenant assina            │    │
│  │  • Calcula total mensal                                  │    │
│  │  • Upgrade/downgrade de plano                            │    │
│  │  • Cancela ferramentas                                   │    │
│  └──────────────────────┬──────────────────────────────────┘    │
│                         │                                        │
│  ┌──────────────────────▼──────────────────────────────────┐    │
│  │               INVOICE SERVICE                            │    │
│  │  • Gera faturas mensais (CRON job)                       │    │
│  │  • Calcula pro-rata para assinaturas no meio do mês      │    │
│  │  • Gera PDF da fatura                                    │    │
│  │  • Registra histórico de faturas no banco                │    │
│  │  • Atualiza status (pending → paid / overdue)            │    │
│  └──────────────────────┬──────────────────────────────────┘    │
│                         │                                        │
│  ┌──────────────────────▼──────────────────────────────────┐    │
│  │               PAYMENT SERVICE                            │    │
│  │  • Solicita cobrança ao Asaas                            │    │
│  │  • Gera PIX QR Code via Asaas                            │    │
│  │  • Gera Boleto via Asaas                                 │    │
│  │  • Cobra cartão de crédito via Asaas                     │    │
│  │  • Processa pagamento recorrente                         │    │
│  │  • Recebe e processa webhooks do Asaas                   │    │
│  └──────────────────────┬──────────────────────────────────┘    │
│                         │                                        │
│  ┌──────────────────────▼──────────────────────────────────┐    │
│  │               ASAAS GATEWAY (Infrastructure)             │    │
│  │  • HTTP Client para API do Asaas                         │    │
│  │  • Mapeia DTOs internos → Asaas API format               │    │
│  │  • Trata erros e retries                                 │    │
│  │  • Valida webhooks (assinatura HMAC)                     │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Fluxo Completo: Assinatura → Cobrança → Pagamento

```
PASSO 1: Tenant assina ferramenta "Agendamento" (Plano Profissional - R$49,90)
──────────────────────────────────────────────────────────────────────────────

Frontend: POST /api/tools/agendamento/subscribe  { planId: 'agendamento-profissional' }
    │
    ▼
SubscriptionService:
    1. Verifica se já existe assinatura ativa para esta ferramenta
    2. Cria SubscribedTool no banco (status: 'active')
    3. Recalcula totalAmount da Subscription
    4. Se é primeira ferramenta → cria Subscription
    5. Emite evento: ToolSubscribed { tenantId, toolId, planId, price }
    │
    ▼
InvoiceService (listener do evento):
    1. Calcula valor pro-rata se não for dia 1 do mês
    2. Cria Invoice no banco (status: 'pending')
    3. Gera itens da fatura (InvoiceItem por ferramenta)
    4. Emite evento: InvoiceCreated { invoiceId, amount }
    │
    ▼
PaymentService (listener do evento):
    1. Verifica método de pagamento preferido do tenant
    2. Se cartão cadastrado com recorrência → cobra automaticamente
    3. Se PIX/Boleto → gera cobrança no Asaas e aguarda


PASSO 2: Cobrança via Asaas
────────────────────────────

PaymentService → AsaasGateway:
    │
    ├── CARTÃO DE CRÉDITO (recorrente)
    │   POST https://api.asaas.com/v3/payments
    │   {
    │     "customer": "cus_xxx",        // ID do cliente no Asaas
    │     "billingType": "CREDIT_CARD",
    │     "value": 89.80,
    │     "dueDate": "2026-03-01",
    │     "creditCard": {
    │       "holderName": "RICARDO SILVA",
    │       "number": "4111...1111",     // Tokenizado
    │       "expiryMonth": "12",
    │       "expiryYear": "2028",
    │       "ccv": "123"
    │     },
    │     "creditCardHolderInfo": { ... }
    │   }
    │
    ├── PIX
    │   POST https://api.asaas.com/v3/payments
    │   {
    │     "customer": "cus_xxx",
    │     "billingType": "PIX",
    │     "value": 89.80,
    │     "dueDate": "2026-03-01",
    │     "description": "GerenciaX - Fatura Mar/2026"
    │   }
    │   → Retorna: pixQrCode, pixCopiaECola, expirationDate
    │
    └── BOLETO
        POST https://api.asaas.com/v3/payments
        {
          "customer": "cus_xxx",
          "billingType": "BOLETO",
          "value": 89.80,
          "dueDate": "2026-03-01",
          "description": "GerenciaX - Fatura Mar/2026"
        }
        → Retorna: bankSlipUrl, barCode, nossoNumero


PASSO 3: Confirmação de Pagamento (Webhook)
────────────────────────────────────────────

Asaas → POST https://api.gerenciax.com.br/api/billing/webhooks/asaas
    {
      "event": "PAYMENT_CONFIRMED",
      "payment": {
        "id": "pay_xxx",
        "status": "CONFIRMED",
        "value": 89.80,
        "billingType": "PIX",
        "confirmedDate": "2026-02-28"
      }
    }
    │
    ▼
WebhookController:
    1. Valida assinatura HMAC do webhook
    2. Busca Invoice pelo externalPaymentId
    3. InvoiceService.confirmPayment(invoiceId)
        → Atualiza Invoice: status = 'paid', paidAt = now()
        → Atualiza Subscription: status = 'active'
    4. Emite evento: PaymentConfirmed { tenantId, invoiceId }
    │
    ▼
NotificationService (listener):
    → Cria notificação: "Pagamento de R$89,80 confirmado via PIX"
```

### 8.3 Entidades de Billing (Drizzle Schema Detalhado)

```typescript
// === INVOICE (Fatura) ===

export const invoiceStatusEnum = pgEnum('invoice_status', [
  'draft',       // Rascunho (sendo montada)
  'pending',     // Aguardando pagamento
  'processing',  // Processando (cartão enviado)
  'paid',        // Paga
  'overdue',     // Vencida
  'cancelled',   // Cancelada
  'refunded',    // Estornada
]);

export const invoices = pgTable('invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  subscriptionId: uuid('subscription_id').references(() => subscriptions.id).notNull(),
  
  // Referência temporal
  referenceMonth: integer('reference_month').notNull(),  // 1-12
  referenceYear: integer('reference_year').notNull(),
  
  // Valores
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
  discount: decimal('discount', { precision: 10, scale: 2 }).default('0'),
  total: decimal('total', { precision: 10, scale: 2 }).notNull(),
  
  // Status e datas
  status: invoiceStatusEnum('status').default('draft').notNull(),
  dueDate: timestamp('due_date').notNull(),
  paidAt: timestamp('paid_at'),
  
  // Pagamento
  paymentMethod: varchar('payment_method', { length: 20 }),  // 'credit-card', 'pix', 'boleto'
  externalPaymentId: varchar('external_payment_id', { length: 100 }),  // ID no Asaas
  
  // PIX data (preenchido quando billingType = PIX)
  pixQrCode: text('pix_qr_code'),
  pixCopiaECola: text('pix_copia_e_cola'),
  pixExpirationDate: timestamp('pix_expiration_date'),
  
  // Boleto data
  boletoUrl: text('boleto_url'),
  boletoBarCode: varchar('boleto_bar_code', { length: 50 }),
  
  // PDF
  pdfUrl: text('pdf_url'),
  
  // Metadata
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});


// === INVOICE ITEM (Itens da Fatura) ===

export const invoiceItems = pgTable('invoice_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  invoiceId: uuid('invoice_id').references(() => invoices.id).notNull(),
  
  // Referência à ferramenta
  toolId: varchar('tool_id', { length: 50 }).notNull(),
  toolName: varchar('tool_name', { length: 100 }).notNull(),
  planName: varchar('plan_name', { length: 100 }).notNull(),
  
  // Valores
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  quantity: integer('quantity').default(1).notNull(),
  total: decimal('total', { precision: 10, scale: 2 }).notNull(),
  
  // Pro-rata
  isProRata: boolean('is_pro_rata').default(false),
  proRataDays: integer('pro_rata_days'),
  proRataTotalDays: integer('pro_rata_total_days'),
  
  description: text('description'),
});


// === BILLING INFO (Dados de Pagamento do Tenant) ===

export const billingInfos = pgTable('billing_infos', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull().unique(),
  
  // Dados fiscais
  invoiceEmail: varchar('invoice_email', { length: 255 }).notNull(),
  taxDocument: varchar('tax_document', { length: 14 }).notNull(),  // CPF ou CNPJ
  
  // Método preferido
  preferredPaymentMethod: varchar('preferred_payment_method', { length: 20 })
    .default('pix').notNull(),
  
  // Asaas Customer ID
  asaasCustomerId: varchar('asaas_customer_id', { length: 50 }),
  
  // Cartão tokenizado (dados do Asaas, NÃO do cartão real)
  cardLastFourDigits: varchar('card_last_four_digits', { length: 4 }),
  cardBrand: varchar('card_brand', { length: 20 }),
  cardHolderName: varchar('card_holder_name', { length: 100 }),
  asaasCreditCardToken: varchar('asaas_credit_card_token', { length: 100 }),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});


// === PAYMENT LOG (Histórico de tentativas de pagamento) ===

export const paymentLogs = pgTable('payment_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  invoiceId: uuid('invoice_id').references(() => invoices.id).notNull(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  
  action: varchar('action', { length: 50 }).notNull(),
  // 'CHARGE_CREATED', 'CHARGE_SENT', 'PAYMENT_RECEIVED', 
  // 'PAYMENT_OVERDUE', 'PAYMENT_REFUNDED', 'CHARGE_FAILED'
  
  paymentMethod: varchar('payment_method', { length: 20 }),
  amount: decimal('amount', { precision: 10, scale: 2 }),
  externalId: varchar('external_id', { length: 100 }),  // ID no Asaas
  rawPayload: text('raw_payload'),  // JSON do webhook/response (para debug)
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

### 8.4 Integração com Asaas — Gateway Service

```typescript
// src/modules/billing/infrastructure/gateways/asaas.gateway.ts

@Injectable()
export class AsaasGateway {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(private config: ConfigService) {
    this.baseUrl = config.get('ASAAS_API_URL');     // https://api.asaas.com/v3
    this.apiKey = config.get('ASAAS_API_KEY');       // $aact_...
  }

  // ═══════════════════════════════════════
  //  CUSTOMER (Criar cliente no Asaas)
  // ═══════════════════════════════════════

  async createCustomer(data: {
    name: string;
    email: string;
    cpfCnpj: string;
    phone?: string;
    externalReference: string;  // tenantId
  }): Promise<{ id: string }> {
    return this.post('/customers', data);
  }

  async getCustomer(customerId: string): Promise<AsaasCustomer> {
    return this.get(`/customers/${customerId}`);
  }

  // ═══════════════════════════════════════
  //  PAGAMENTO POR PIX
  // ═══════════════════════════════════════

  async createPixPayment(data: {
    customer: string;
    value: number;
    dueDate: string;
    description: string;
    externalReference: string;  // invoiceId
  }): Promise<{
    id: string;
    status: string;
    pixQrCodeUrl: string;
    pixCopiaECola: string;
    expirationDate: string;
  }> {
    return this.post('/payments', {
      ...data,
      billingType: 'PIX',
    });
  }

  // Retorna QR Code do PIX como imagem
  async getPixQrCode(paymentId: string): Promise<{
    encodedImage: string;  // Base64
    payload: string;       // Copia e cola
    expirationDate: string;
  }> {
    return this.get(`/payments/${paymentId}/pixQrCode`);
  }

  // ═══════════════════════════════════════
  //  PAGAMENTO POR BOLETO
  // ═══════════════════════════════════════

  async createBoletoPayment(data: {
    customer: string;
    value: number;
    dueDate: string;
    description: string;
    externalReference: string;
  }): Promise<{
    id: string;
    status: string;
    bankSlipUrl: string;
    nossoNumero: string;
    barCode: string;
  }> {
    return this.post('/payments', {
      ...data,
      billingType: 'BOLETO',
    });
  }

  // ═══════════════════════════════════════
  //  PAGAMENTO POR CARTÃO DE CRÉDITO
  // ═══════════════════════════════════════

  // Cobrança única com dados do cartão
  async createCreditCardPayment(data: {
    customer: string;
    value: number;
    dueDate: string;
    description: string;
    externalReference: string;
    creditCard: {
      holderName: string;
      number: string;
      expiryMonth: string;
      expiryYear: string;
      ccv: string;
    };
    creditCardHolderInfo: {
      name: string;
      email: string;
      cpfCnpj: string;
      phone: string;
      postalCode: string;
      addressNumber: string;
    };
  }): Promise<{
    id: string;
    status: string;  // 'CONFIRMED' se aprovado
    creditCard: { creditCardToken: string };
  }> {
    return this.post('/payments', {
      ...data,
      billingType: 'CREDIT_CARD',
    });
  }

  // Cobrança com token (recorrência — usa cartão salvo)
  async createTokenizedCreditCardPayment(data: {
    customer: string;
    value: number;
    dueDate: string;
    description: string;
    externalReference: string;
    creditCardToken: string;        // Token salvo anteriormente
  }): Promise<{
    id: string;
    status: string;
  }> {
    return this.post('/payments', {
      ...data,
      billingType: 'CREDIT_CARD',
    });
  }

  // ═══════════════════════════════════════
  //  CARTÃO DE DÉBITO
  // ═══════════════════════════════════════

  async createDebitCardPayment(data: {
    customer: string;
    value: number;
    dueDate: string;
    description: string;
    externalReference: string;
  }): Promise<{
    id: string;
    status: string;
    transactionReceiptUrl: string;  // URL para redirecionar o cliente
  }> {
    return this.post('/payments', {
      ...data,
      billingType: 'DEBIT_CARD',
    });
  }

  // ═══════════════════════════════════════
  //  CONSULTA E CANCELAMENTO
  // ═══════════════════════════════════════

  async getPayment(paymentId: string): Promise<AsaasPayment> {
    return this.get(`/payments/${paymentId}`);
  }

  async cancelPayment(paymentId: string): Promise<void> {
    await this.delete(`/payments/${paymentId}`);
  }

  async refundPayment(paymentId: string, value?: number): Promise<void> {
    await this.post(`/payments/${paymentId}/refund`, { value });
  }

  // ═══════════════════════════════════════
  //  WEBHOOK VALIDATION
  // ═══════════════════════════════════════

  validateWebhook(payload: string, signature: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', this.config.get('ASAAS_WEBHOOK_SECRET')!)
      .update(payload)
      .digest('hex');
    return expectedSignature === signature;
  }

  // ═══════════════════════════════════════
  //  HTTP HELPERS
  // ═══════════════════════════════════════

  private async post<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': this.apiKey,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new AsaasApiError(error);
    }
    return response.json();
  }

  private async get<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: { 'access_token': this.apiKey },
    });
    if (!response.ok) throw new AsaasApiError(await response.json());
    return response.json();
  }

  private async delete(path: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: { 'access_token': this.apiKey },
    });
    if (!response.ok) throw new AsaasApiError(await response.json());
  }
}
```

### 8.5 Jobs Automáticos do Billing

```typescript
// ═══════════════════════════════════════════════════
//  JOB 1: Gerar faturas mensais (CRON — dia 1 às 00:00)
// ═══════════════════════════════════════════════════

@Cron('0 0 1 * *')  // Primeiro dia de cada mês
async generateMonthlyInvoices(): Promise<void> {
  // 1. Busca todas as subscriptions ativas
  const activeSubscriptions = await this.subscriptionRepo.findAllActive();
  
  for (const sub of activeSubscriptions) {
    // 2. Busca ferramentas ativas da subscription
    const tools = await this.subscribedToolRepo.findBySubscription(sub.id);
    
    // 3. Cria Invoice com itens
    const invoice = await this.invoiceService.createMonthlyInvoice({
      tenantId: sub.tenantId,
      subscriptionId: sub.id,
      items: tools.map(t => ({
        toolId: t.toolId,
        toolName: t.toolName,
        planName: t.planName,
        price: t.monthlyPrice,
      })),
      dueDate: this.calculateDueDate(sub),  // Ex: dia 5 do mês
    });
    
    // 4. Enfileira cobrança
    await this.queue.add('process-payment', {
      invoiceId: invoice.id,
      tenantId: sub.tenantId,
    });
  }
}

// ═══════════════════════════════════════════════════
//  JOB 2: Verificar faturas vencidas (CRON — diário 08:00)
// ═══════════════════════════════════════════════════

@Cron('0 8 * * *')  // Todos os dias às 08:00
async checkOverdueInvoices(): Promise<void> {
  const overdueInvoices = await this.invoiceRepo.findOverdue();
  
  for (const invoice of overdueInvoices) {
    // Atualiza status
    await this.invoiceService.markAsOverdue(invoice.id);
    
    // Notifica tenant
    this.eventEmitter.emit('invoice.overdue', {
      tenantId: invoice.tenantId,
      invoiceId: invoice.id,
      amount: invoice.total,
      daysOverdue: this.calculateDaysOverdue(invoice.dueDate),
    });
    
    // Se vencida há mais de X dias → suspender acesso
    if (this.calculateDaysOverdue(invoice.dueDate) > 15) {
      await this.subscriptionService.suspend(invoice.subscriptionId);
    }
  }
}

// ═══════════════════════════════════════════════════
//  JOB 3: Processar cobrança automática
// ═══════════════════════════════════════════════════

@Process('process-payment')
async processPayment(job: Job<{ invoiceId: string; tenantId: string }>) {
  const { invoiceId, tenantId } = job.data;
  
  const invoice = await this.invoiceRepo.findById(invoiceId);
  const billingInfo = await this.billingInfoRepo.findByTenant(tenantId);
  
  if (!billingInfo?.asaasCustomerId) {
    // Tenant não tem dados de pagamento — aguardar pagamento manual
    return;
  }
  
  switch (billingInfo.preferredPaymentMethod) {
    case 'credit-card':
      if (billingInfo.asaasCreditCardToken) {
        // Cobrança automática com token salvo
        await this.paymentService.chargeWithToken(invoice, billingInfo);
      }
      break;
    case 'pix':
      // Gera cobrança PIX e salva QR Code na invoice
      await this.paymentService.generatePixCharge(invoice, billingInfo);
      break;
    case 'boleto':
      // Gera boleto e salva URL na invoice
      await this.paymentService.generateBoleto(invoice, billingInfo);
      break;
  }
}
```

### 8.6 Webhook Controller (Receber eventos do Asaas)

```typescript
@Controller('billing/webhooks')
export class WebhookController {
  
  @Post('asaas')
  @HttpCode(200)
  async handleAsaasWebhook(
    @Body() payload: AsaasWebhookPayload,
    @Headers('asaas-access-token') signature: string,
    @Req() req: Request,
  ) {
    // 1. Validar autenticidade do webhook
    const rawBody = JSON.stringify(payload);
    if (!this.asaasGateway.validateWebhook(rawBody, signature)) {
      throw new UnauthorizedException('Webhook inválido');
    }
    
    // 2. Log do evento (para auditoria)
    await this.paymentLogService.log({
      action: payload.event,
      externalId: payload.payment?.id,
      rawPayload: rawBody,
    });
    
    // 3. Processar por tipo de evento
    switch (payload.event) {
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED':
        await this.paymentService.confirmPayment(payload.payment);
        break;
        
      case 'PAYMENT_OVERDUE':
        await this.paymentService.handleOverdue(payload.payment);
        break;
        
      case 'PAYMENT_DELETED':
      case 'PAYMENT_REFUNDED':
        await this.paymentService.handleRefund(payload.payment);
        break;
        
      case 'PAYMENT_CREATED':
      case 'PAYMENT_UPDATED':
        // Log only — atualizar status se necessário
        break;
    }
    
    return { received: true };
  }
}
```

### 8.7 Recorrência com Cartão de Crédito

**Abordagem: Recorrência GERENCIADA pelo backend (não pelo Asaas).**

```
FLUXO:
1. Tenant cadastra cartão na primeira cobrança
2. Asaas retorna creditCardToken
3. GerenciaX salva o token na tabela billing_infos
4. Todo mês (CRON), o InvoiceService gera a fatura
5. O PaymentService usa o token para cobrar via Asaas
6. Se cobrança falhar → marca como pending e notifica
7. Se aprovar → webhook PAYMENT_CONFIRMED → marca como paid
```

**Vantagem:** O GerenciaX controla 100% da lógica de recorrência, fatura, pro-rata, desconto, retry. O Asaas é apenas o "braço" que efetua a cobrança.

### 8.8 Ciclo de Vida da Invoice

```
               ┌─────────┐
               │  DRAFT   │  (sendo montada, itens sendo adicionados)
               └────┬─────┘
                    │ InvoiceService.finalize()
                    ▼
               ┌─────────┐
               │ PENDING  │  (aguardando pagamento)
               └────┬─────┘
                    │
          ┌─────────┼──────────────────┐
          │         │                  │
          ▼         ▼                  ▼
   ┌────────────┐ ┌──────────┐ ┌────────────┐
   │ PROCESSING │ │  OVERDUE │ │ CANCELLED  │
   │(cartão env)│ │ (venceu) │ │  (manual)  │
   └─────┬──────┘ └────┬─────┘ └────────────┘
         │              │
         ▼              │ (pagamento tardio)
   ┌──────────┐         │
   │   PAID   │ ◄───────┘
   └──────────┘
         │
         ▼ (raro)
   ┌──────────┐
   │ REFUNDED │
   └──────────┘
```

---

## 9. Sistema de Notificações

### 9.1 Arquitetura Event-Driven

```
┌──────────────┐    EventEmitter2     ┌────────────────────┐
│ BillingModule │ ───────────────────▶ │ NotificationModule │
│  PaymentConf. │                      │                    │
└──────────────┘    'payment.confirmed'│  ┌──────────────┐  │
                                       │  │  Listener     │  │
┌──────────────┐    'stock.low'        │  │  → Cria no DB │  │
│ ProductModule │ ───────────────────▶ │  │  → Enfileira  │  │
│  StockAlert   │                      │  └──────┬───────┘  │
└──────────────┘                       │         │           │
                                       │         ▼           │
                                       │  ┌──────────────┐  │
                                       │  │ QueueModule   │  │
                                       │  │  → Email      │  │
                                       │  │  → Push (FCM) │  │
                                       │  │  → SMS        │  │
                                       │  └──────────────┘  │
                                       └────────────────────┘
```

### 9.2 Supabase Realtime (WebSocket para notificações in-app)

```typescript
// Frontend (Angular) se inscreve no Realtime do Supabase
// para receber notificações em tempo real SEM polling

const channel = supabase
  .channel('notifications')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `tenant_id=eq.${tenantId}`,
  }, (payload) => {
    // Nova notificação chegou em tempo real!
    this._notifications.update(list => [payload.new, ...list]);
  })
  .subscribe();
```

**Vantagem:** Usa a infra do Supabase sem precisar implementar WebSocket no NestJS.

---

## 10. Upload de Arquivos

### 10.1 Supabase Storage

```typescript
// src/modules/upload/infrastructure/storage/supabase-storage.adapter.ts

@Injectable()
export class SupabaseStorageAdapter {
  private supabase: SupabaseClient;

  constructor(config: ConfigService) {
    this.supabase = createClient(
      config.get('SUPABASE_URL')!,
      config.get('SUPABASE_SERVICE_KEY')!,
    );
  }

  async upload(file: Express.Multer.File, tenantId: string, folder: string): Promise<string> {
    const fileName = `${tenantId}/${folder}/${uuid()}-${file.originalname}`;
    
    const { data, error } = await this.supabase.storage
      .from('uploads')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) throw new InternalServerErrorException('Upload failed');

    // Retorna URL pública
    const { data: urlData } = this.supabase.storage
      .from('uploads')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  }

  async delete(filePath: string): Promise<void> {
    await this.supabase.storage.from('uploads').remove([filePath]);
  }
}
```

### 10.2 Organização de Buckets

```
uploads/
├── {tenant-id}/
│   ├── products/         # Fotos de produtos
│   ├── services/         # Fotos de serviços
│   ├── collaborators/    # Fotos de perfil
│   ├── users/            # Foto do usuário
│   └── invoices/         # PDFs de faturas
```

---

## 11. Fila de Tarefas Assíncronas (Jobs/Queue)

### 11.1 Stack: BullMQ + Upstash Redis

```typescript
// src/queue/queue.module.ts

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.UPSTASH_REDIS_HOST,
        port: parseInt(process.env.UPSTASH_REDIS_PORT!),
        password: process.env.UPSTASH_REDIS_PASSWORD,
        tls: {},  // Upstash requer TLS
      },
    }),
    BullModule.registerQueue(
      { name: 'email' },
      { name: 'invoice' },
      { name: 'notification' },
      { name: 'pdf' },
    ),
  ],
})
```

### 11.2 Filas Definidas

| Fila | Responsabilidade | Prioridade |
|------|-----------------|------------|
| `email` | Envio de e-mails (Resend) | Normal |
| `invoice` | Geração e processamento de faturas | Alta |
| `notification` | Push notifications (FCM), SMS | Normal |
| `pdf` | Geração de PDFs de faturas | Baixa |

### 11.3 CRONs do Sistema

| Job | Schedule | Descrição |
|-----|----------|-----------|
| `generate-monthly-invoices` | `0 0 1 * *` (dia 1, 00:00) | Gera faturas para todos os tenants ativos |
| `check-overdue-invoices` | `0 8 * * *` (todo dia, 08:00) | Marca faturas vencidas como overdue |
| `send-due-reminders` | `0 9 * * *` (todo dia, 09:00) | Notifica faturas vencendo em 3 dias |
| `cleanup-old-sessions` | `0 3 * * 0` (domingo, 03:00) | Remove sessões expiradas |
| `check-stock-alerts` | `0 */6 * * *` (a cada 6h) | Verifica estoque mínimo e gera alertas |

---

## 12. BFF (Backend for Frontend) — Estratégia Multi-Consumidor

### 12.1 Cenário: Múltiplos Consumidores

O GerenciaX terá **diversas fontes** consumindo o backend simultaneamente:

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CONSUMIDORES                                │
│                                                                     │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐     │
│   │  Web (PWA)   │  │ Mobile App   │  │  MFEs (Ferramentas)  │     │
│   │ Angular/Ionic│  │  Capacitor   │  │  Module Federation   │     │
│   │  Browser     │  │  iOS/Android │  │  Web + Mobile        │     │
│   └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘     │
│          │                 │                      │                  │
│   ┌──────┴───────┐  ┌──────┴───────┐  ┌──────────┴───────────┐     │
│   │ Shell Web    │  │ Shell Mobile │  │  MFE Agendamento     │     │
│   │ (tabs, nav)  │  │ (nav nativa) │  │  MFE Estoque         │     │
│   │              │  │              │  │  MFE Financeiro       │     │
│   └──────────────┘  └──────────────┘  │  MFE PDV             │     │
│                                       │  (cada um independente)    │
│                                       └──────────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │ COMO SERVIR TODOS? │
                    └───────────────────┘
```

### 12.2 Decisão: BFF Lightweight Dentro do NestJS

**NÃO** usar API Gateway externo (Kong, AWS API Gateway) — overkill para monolítico modular.  
**SIM** usar padrão BFF implementado **dentro do próprio NestJS**, com:

```
┌─────────────────────────────────────────────────────────────────┐
│                    NestJS API (BFF integrado)                    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                   CAMADA BFF (Controllers)                 │  │
│  │                                                            │  │
│  │  /api/v1/...              API REST versionada (unificada)  │  │
│  │                           Serve Web, Mobile e MFEs         │  │
│  │                                                            │  │
│  │  /api/v1/mobile/...       Endpoints Mobile-specific        │  │
│  │                           (push tokens, device info,       │  │
│  │                            offline sync, deep links)       │  │
│  │                                                            │  │
│  │  /api/v1/mfe/:toolId/...  Endpoints MFE-specific           │  │
│  │                           (cada MFE acessa sua própria     │  │
│  │                            sub-rota com contexto isolado)  │  │
│  │                                                            │  │
│  │  /api/internal/...        Endpoints inter-MFE (futuro)     │  │
│  │                           (comunicação entre MFE backends) │  │
│  └──────────────────────────┬─────────────────────────────────┘  │
│                             │                                     │
│  ┌──────────────────────────▼─────────────────────────────────┐  │
│  │              MÓDULOS DE NEGÓCIO (Application Layer)         │  │
│  │         ProductService, BillingService, AuthService...      │  │
│  └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 12.3 Estratégia de Versionamento da API

```typescript
// main.ts
app.setGlobalPrefix('api');
app.enableVersioning({
  type: VersioningType.URI,
  defaultVersion: '1',
});

// Resultado:
// /api/v1/products       → Versão atual (Web + Mobile + MFEs)
// /api/v2/products       → Futura versão (breaking changes)
```

### 12.4 Headers de Plataforma (Client-Type Detection)

```typescript
// Middleware que identifica o tipo de cliente
@Injectable()
export class ClientTypeMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Header customizado enviado pelo frontend
    const clientType = req.headers['x-client-type'] as string;
    // Valores: 'web', 'mobile-ios', 'mobile-android', 'mfe-agendamento', 'mfe-estoque'
    
    const clientVersion = req.headers['x-client-version'] as string;
    // Valores: '1.0.0', '2.1.0', etc.
    
    req['clientType'] = clientType || 'web';
    req['clientVersion'] = clientVersion || 'unknown';
    
    next();
  }
}

// Decorator para acessar nos controllers
export const ClientType = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    return ctx.switchToHttp().getRequest()['clientType'];
  },
);
```

### 12.5 Endpoints Mobile-Specific

```typescript
// Endpoints que SÓ fazem sentido para mobile
@Controller({ path: 'mobile', version: '1' })
export class MobileController {
  
  // Registrar token de push notification (FCM)
  @Post('push-token')
  async registerPushToken(
    @CurrentUser() userId: string,
    @Body() dto: { token: string; platform: 'ios' | 'android' },
  ) { ... }

  // Info do device para sessões ativas
  @Post('device-info')
  async registerDevice(
    @CurrentUser() userId: string,
    @Body() dto: { model: string; os: string; appVersion: string },
  ) { ... }

  // Sync de dados offline (quando voltar online)
  @Post('sync')
  async syncOfflineData(
    @CurrentUser() userId: string,
    @Body() dto: { changes: OfflineChange[] },
  ) { ... }

  // Deep link resolver
  @Get('deep-link/:type/:id')
  async resolveDeepLink(
    @Param('type') type: string,
    @Param('id') id: string,
  ) { ... }
}
```

### 12.6 Endpoints MFE-Specific (Micro-Frontend)

```typescript
// Cada MFE pode ter endpoints específicos agrupados
// Mantém isolamento e facilita extrair para microserviço no futuro

@Controller({ path: 'mfe/agendamento', version: '1' })
@UseGuards(ToolPermissionGuard)
@SetMetadata('toolId', 'agendamento')
export class MfeAgendamentoController {
  // Endpoints específicos do MFE de Agendamento
  // Só acessíveis para tenants que assinaram esta ferramenta
}

@Controller({ path: 'mfe/estoque', version: '1' })
@UseGuards(ToolPermissionGuard)
@SetMetadata('toolId', 'estoque')
export class MfeEstoqueController {
  // Endpoints específicos do MFE de Estoque
}
```

### 12.7 CORS Multi-Origem

```typescript
// Cada MFE pode rodar em domínio/porta diferente em dev
app.enableCors({
  origin: [
    // Shell principal
    'https://gerenciax.com.br',
    'https://app.gerenciax.com.br',
    'http://localhost:4200',
    
    // MFEs (se hospedados separadamente)
    'https://mfe-agendamento.gerenciax.com.br',
    'https://mfe-estoque.gerenciax.com.br',
    'http://localhost:4201',  // MFE dev port 1
    'http://localhost:4202',  // MFE dev port 2
    
    // Capacitor (mobile)
    'capacitor://localhost',
    'ionic://localhost',
    'http://localhost',       // Android WebView
  ],
  credentials: true,
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],  // Paginação
});
```

### 12.8 Quando Migrar para API Gateway Externo?

| Trigger | Ação |
|---------|------|
| MFEs com backends **próprios** (microserviços) | Adotar Kong ou AWS API Gateway para unificar roteamento |
| Necessidade de rate limiting **por tenant/plano** | API Gateway com políticas por API key |
| Parceiros externos consumindo a API | API Gateway com autenticação via API key + throttling diferenciado |
| Circuit breaker necessário entre serviços | API Gateway com health checks per-service |
| Equipe > 10 devs em times independentes | Cada time com seu serviço + API Gateway centralized |

**Para o MVP e pós-MVP imediato:** BFF dentro do NestJS é suficiente e muito mais simples.

---

## 13. CI/CD Pipeline

### 13.1 Stack de CI/CD

| Etapa | Ferramenta |
|-------|-----------|
| Source Control | GitHub |
| CI | GitHub Actions |
| CD | Railway (auto-deploy via GitHub) |
| Container | Docker |
| Ambiente de Dev | docker-compose (local) |

### 13.2 Pipeline Completo (GitHub Actions)

```yaml
# .github/workflows/ci.yml

name: GerenciaX API - CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '20'

jobs:
  # ═══════════════════════════════════
  #  1. LINT + TYPE CHECK
  # ═══════════════════════════════════
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit

  # ═══════════════════════════════════
  #  2. TESTES UNITÁRIOS
  # ═══════════════════════════════════
  test-unit:
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npm run test -- --coverage
      - uses: codecov/codecov-action@v4  # Upload coverage

  # ═══════════════════════════════════
  #  3. TESTES E2E
  # ═══════════════════════════════════
  test-e2e:
    runs-on: ubuntu-latest
    needs: lint
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: gerenciax_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npx drizzle-kit push:pg
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/gerenciax_test
      - run: npm run test:e2e
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/gerenciax_test
          JWT_SECRET: test-secret

  # ═══════════════════════════════════
  #  4. BUILD DOCKER
  # ═══════════════════════════════════
  build:
    runs-on: ubuntu-latest
    needs: [test-unit, test-e2e]
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t gerenciax-api .
      # Railway faz o deploy automático via GitHub integration

  # ═══════════════════════════════════
  #  5. DEPLOY (Railway auto-deploy)
  # ═══════════════════════════════════
  # Railway detecta push em main e faz deploy automático
  # Configurado via Railway Dashboard → Settings → Source
  
  # ALTERNATIVA: Deploy manual via Railway CLI
  # deploy:
  #   runs-on: ubuntu-latest
  #   needs: build
  #   if: github.ref == 'refs/heads/main'
  #   steps:
  #     - uses: actions/checkout@v4
  #     - run: npm i -g @railway/cli
  #     - run: railway up --service gerenciax-api
  #       env:
  #         RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

### 13.3 Dockerfile

```dockerfile
# Dockerfile

# === BUILD STAGE ===
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# === PRODUCTION STAGE ===
FROM node:20-alpine AS production

WORKDIR /app

# Instala apenas dependências de produção
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copia build
COPY --from=builder /app/dist ./dist

# Security: non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001
USER nestjs

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget -q --spider http://localhost:3000/api/health || exit 1

CMD ["node", "dist/main.js"]
```

### 13.4 Ambientes

| Ambiente | Branch | URL | Banco |
|----------|--------|-----|-------|
| Development | `develop` | `localhost:3000` | Docker local / Supabase project dev |
| Staging | `develop` (auto-deploy) | `staging-api.gerenciax.com.br` | Supabase project staging |
| Production | `main` (auto-deploy) | `api.gerenciax.com.br` | Supabase project production |

### 13.5 Variáveis de Ambiente

```env
# .env.example

# === APP ===
NODE_ENV=development
PORT=3000
API_PREFIX=api

# === DATABASE (Supabase) ===
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...

# === AUTH ===
JWT_SECRET=your-super-secret-key-min-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

# === REDIS (Upstash) ===
UPSTASH_REDIS_URL=rediss://default:[password]@[host].upstash.io:6379

# === ASAAS (Payments) ===
ASAAS_API_URL=https://sandbox.asaas.com/api/v3
ASAAS_API_KEY=$aact_...
ASAAS_WEBHOOK_SECRET=your-webhook-secret

# === EMAIL (Resend) ===
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@gerenciax.com.br

# === STORAGE ===
SUPABASE_STORAGE_BUCKET=uploads

# === CORS ===
CORS_ORIGINS=http://localhost:4200,https://gerenciax.com.br

# === RATE LIMITING ===
THROTTLE_TTL=60
THROTTLE_LIMIT=100
```

---

## 14. Observabilidade e Monitoramento

### 14.1 Logging Estruturado

```typescript
// Usar nestjs-pino para logs estruturados em JSON
import { LoggerModule } from 'nestjs-pino';

LoggerModule.forRoot({
  pinoHttp: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    transport: process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty' }
      : undefined,
    // Adicionar tenantId e userId a cada log
    customProps: (req) => ({
      tenantId: req.user?.tenantId,
      userId: req.user?.sub,
    }),
  },
});
```

### 14.2 Health Check

```typescript
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
    };
  }
}
```

### 14.3 Monitoramento Recomendado

| Serviço | Finalidade | Custo |
|---------|-----------|-------|
| **Railway Metrics** | CPU, RAM, Logs | Incluso |
| **Sentry** | Error tracking, performance | Free tier |
| **Better Stack (Logtail)** | Agregação de logs | Free tier |
| **UptimeRobot** | Health check externo | Free |

---

## 15. Estratégia de Testes

### 15.1 Pirâmide de Testes

```
        ┌────────────┐
        │    E2E     │  ← Poucos (fluxos críticos: auth, billing)
        │  (Cypress)  │
        ├────────────┤
        │ Integration │  ← Médio (controllers + repos com DB de teste)
        │  (Jest +    │
        │  Supertest) │
        ├────────────┤
        │    Unit     │  ← Muitos (services, mappers, validators, domain)
        │   (Jest)    │
        └────────────┘
```

### 15.2 Cobertura Mínima Alvo

| Camada | Cobertura |
|--------|-----------|
| Domain Entities | 90%+ |
| Application Services | 80%+ |
| Controllers | 70%+ |
| General | 75%+ |

---

## 16. Diagrama de Infraestrutura

```
                     ┌─────────────────────┐
                     │    DESENVOLVEDOR     │
                     └──────────┬──────────┘
                                │ git push
                                ▼
                     ┌─────────────────────┐
                     │       GITHUB        │
                     │  (Source + Actions)  │
                     └──────────┬──────────┘
                                │ CI/CD
                    ┌───────────┼───────────┐
                    ▼           ▼           ▼
             ┌────────────┐ ┌──────┐ ┌───────────┐
             │  Lint +    │ │ Unit │ │   E2E     │
             │ TypeCheck  │ │ Test │ │   Test    │
             └─────┬──────┘ └──┬───┘ └─────┬─────┘
                   │           │           │
                   └───────────┼───────────┘
                               │ ✅ All pass
                               ▼
                     ┌─────────────────────┐
                     │   RAILWAY (Deploy)   │
                     │   Docker Container   │
                     │   NestJS API + Worker│
                     └────────┬─┬──────────┘
                              │ │
              ┌───────────────┘ └───────────────┐
              ▼                                 ▼
   ┌───────────────────┐              ┌─────────────────┐
   │     SUPABASE      │              │   CLOUDFLARE    │
   │ PostgreSQL + Store│              │  DNS + SSL + WAF│
   └───────────────────┘              └─────────────────┘
              │
   ┌──────────┴──────────┐
   ▼                     ▼
┌────────┐         ┌──────────┐
│UPSTASH │         │  ASAAS   │
│ Redis  │         │ Payments │
└────────┘         └──────────┘
```

---

## 17. Diagrama de Módulos e Dependências

```
┌─────────────────────────────────────────────────────────────┐
│                         APP MODULE                           │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  COMMON (Shared)                      │   │
│  │  Guards, Decorators, Pipes, Filters, Database,        │   │
│  │  Config, Utils                                        │   │
│  └──────────────────────┬───────────────────────────────┘   │
│                         │ importado por todos                │
│  ┌──────────────────────┼───────────────────────────────┐   │
│  │                      ▼                                │   │
│  │  ┌───────────┐  ┌─────────┐  ┌──────────────────┐   │   │
│  │  │   Auth    │  │ Tenant  │  │    Upload         │   │   │
│  │  │  Module   │──│ Module  │  │    Module         │   │   │
│  │  └─────┬─────┘  └────┬────┘  └────────┬─────────┘   │   │
│  │        │              │               │              │   │
│  │        ▼              ▼               ▼              │   │
│  │  ┌───────────┐  ┌──────────┐  ┌──────────────┐     │   │
│  │  │  Product  │  │ Service  │  │ Collaborator │     │   │
│  │  │  Module   │  │  Module  │──│   Module     │     │   │
│  │  └─────┬─────┘  └────┬────┘  └──────┬───────┘     │   │
│  │        │              │              │              │   │
│  │        └──────────────┼──────────────┘              │   │
│  │                       ▼                              │   │
│  │              ┌─────────────────┐                     │   │
│  │              │   Marketplace   │                     │   │
│  │              │     Module      │                     │   │
│  │              └────────┬────────┘                     │   │
│  │                       │                              │   │
│  │                       ▼                              │   │
│  │              ┌─────────────────┐                     │   │
│  │              │    Billing      │                     │   │
│  │              │    Module       │───── Asaas Gateway  │   │
│  │              └────────┬────────┘                     │   │
│  │                       │                              │   │
│  │        ┌──────────────┼──────────────┐              │   │
│  │        ▼              ▼              ▼              │   │
│  │  ┌──────────┐  ┌───────────┐  ┌──────────┐        │   │
│  │  │Notificat.│  │  Settings │  │Dashboard │        │   │
│  │  │  Module  │  │  Module   │  │  Module  │        │   │
│  │  └──────────┘  └───────────┘  └──────────┘        │   │
│  │        │                                            │   │
│  │        ▼                                            │   │
│  │  ┌──────────┐                                       │   │
│  │  │  Queue   │ ← Email, PDF, Push, SMS              │   │
│  │  │  Module  │                                       │   │
│  │  └──────────┘                                       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 18. Roadmap de Implementação

### Fase 0 — Setup (~1 semana)
- [ ] Criar repositório `gerenciax-api`
- [ ] Scaffold NestJS com nest-cli
- [ ] Configurar Drizzle + schemas base (tenant, user)
- [ ] Configurar Docker + docker-compose (Postgres local)
- [ ] Setup ESLint + Prettier + Husky
- [ ] Criar `common/` (guards, decorators, pipes, filters, response interceptor)
- [ ] Definir Ports base (RepositoryPort, StoragePort, PaymentGatewayPort, EmailPort)
- [ ] GitHub Actions CI básico (lint + test)
- [ ] Conectar Railway + auto-deploy
- [ ] Configurar BFF: versionamento API, ClientType middleware, CORS multi-origem

### Fase 1 — Auth & Core (~2 semanas)
- [ ] `AuthModule` (login, signup, JWT, refresh token)
- [ ] `TenantModule` (criação automática ao signup)
- [ ] Guards (JwtAuthGuard, RolesGuard, TenantGuard, ForcePasswordResetGuard)
- [ ] `SettingsModule` (personal, company — GET/PUT)
- [ ] `DashboardModule` (agregação básica)
- [ ] `UploadModule` (Supabase Storage via StoragePort)

### Fase 2 — Catálogo (~2 semanas)
- [ ] `ProductModule` (CRUD completo com variações e custom fields)
- [ ] `ServiceModule` (CRUD com variações de preço e profissionais)
- [ ] CategoryModule (ou dentro de Product)
- [ ] Testes unitários e E2E

### Fase 3 — Equipe & Permissões (~2 semanas)
- [ ] `CollaboratorModule` (CRUD com permissões, horários)
- [ ] Fluxo Colaborador → User (auto-criação, senha aleatória, mustResetPassword)
- [ ] collaborator_tool_permissions (tabela + CRUD)
- [ ] ToolPermissionGuard (valida permissão por ferramenta/ação)
- [ ] Endpoint /auth/reset-password + ForcePasswordResetGuard
- [ ] E-mail de boas-vindas ao colaborador com credenciais
- [ ] Testes

### Fase 4 — Marketplace & Billing (~3 semanas)
- [ ] `MarketplaceModule` (catálogo de ferramentas, planos, features)
- [ ] `BillingModule` — Subscription Service
- [ ] `BillingModule` — Invoice Service (geração de faturas)
- [ ] `BillingModule` — Asaas Gateway (via PaymentGatewayPort → AsaasPaymentAdapter)
- [ ] Webhook controller para Asaas
- [ ] Recorrência com token do cartão
- [ ] Geração de PDF de fatura
- [ ] CRONs (fatura mensal, verificação de vencidos)
- [ ] Testes completos

### Fase 5 — Notificações (~1 semana)
- [ ] `NotificationModule` (CRUD, stats)
- [ ] Event listeners (billing events, stock events)
- [ ] Supabase Realtime (WebSocket para in-app)
- [ ] Email channel (Resend)
- [ ] Push channel (FCM) — futuro

### Fase 6 — Configurações Avançadas (~1 semana)
- [ ] Settings: Billing, Appearance, Notifications, Security
- [ ] Alterar senha, 2FA (TOTP)
- [ ] Gerenciar sessões ativas
- [ ] API Keys

### Fase 7 — Integrações & Compliance (~2 semanas)
- [ ] `IntegrationModule` (WhatsApp, Google Calendar, etc.)
- [ ] LGPD (exportar dados, excluir conta)
- [ ] Audit logs
- [ ] Documentação Swagger/OpenAPI

### Fase 8 — Hardening & Launch (~1 semana)
- [ ] Load testing (k6 ou Artillery)
- [ ] Security audit (headers, RLS, rate limiting)
- [ ] Monitoramento (Sentry, logs)
- [ ] Domínio + SSL + DNS
- [ ] Go-live 🚀

**Tempo total estimado: 14-16 semanas (3.5-4 meses) para MVP completo.**

---

## Apêndice: Resumo de Tecnologias

| Categoria | Tecnologia | Versão |
|-----------|-----------|--------|
| Runtime | Node.js | 20 LTS |
| Framework | NestJS | 10+ |
| Linguagem | TypeScript | 5.4+ (strict) |
| ORM | Drizzle ORM | Latest |
| Banco de Dados | PostgreSQL (Supabase) | 16+ |
| Cache/Queue | Redis (Upstash) | — |
| Job Queue | BullMQ | Latest |
| Pagamentos | Asaas API | v3 |
| Email | Resend | Latest |
| Storage | Supabase Storage | — |
| Realtime | Supabase Realtime | — |
| Auth | JWT (Passport.js) | — |
| Validação | class-validator + Zod (DTOs) | — |
| Logging | nestjs-pino | — |
| Segurança | Helmet, CORS, Throttler | — |
| Testes | Jest + Supertest | — |
| CI/CD | GitHub Actions + Railway | — |
| Container | Docker | — |
| CDN/WAF | Cloudflare | Free |
| Monitoramento | Sentry + Better Stack | Free tier |

---

> **Documento v2.0** — Atualizado em 25/02/2026  
> **Baseado em:** `BACKEND-REQUIREMENTS.md` (análise do frontend)  
> **Decisão:** Modular Monolith + **Hexagonal Architecture (Ports & Adapters)** + BFF Lightweight + Asaas (billing gerenciado internamente) + Supabase + Railway  
> **Mudanças v2:** Hexagonal Arch para desacoplamento total, BFF multi-consumidor (Web/Mobile/MFEs), fluxo Colaborador→Usuário com permissões
