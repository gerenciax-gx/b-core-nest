# 02. Hexagonal Architecture — Guia Estrito

> **Padrão obrigatório** para TODOS os módulos do GerenciaX Backend.  
> **Objetivo:** Desacoplamento TOTAL de serviços externos. Trocar DB, gateway de pagamento, storage ou qualquer serviço = criar novo Adapter, sem tocar em regras de negócio.

---

## TL;DR para IA

<constraints>

**5 regras invioláveis deste doc:**
1. 🚫 Domain **NUNCA** importa Infrastructure ou Application (R-001)
2. 🚫 Ports são **interfaces puras** TypeScript — sem `@Injectable()`, sem decorators NestJS (R-002)
3. 🚫 Entity **valida seu próprio estado** — constructor e métodos fazem validação (R-005)
4. 🚫 Services injetam via `@Inject('PortName')` com string token — nunca adapter direto (R-008)
5. 🚫 Adapters ficam SOMENTE em `infrastructure/` — nunca em domain/ ou application/ (R-003)

**3 padrões obrigatórios:**
- Camadas: `domain/` → `application/` → `infrastructure/` (dependência sempre para dentro)
- Module binding: `{ provide: 'PortName', useClass: AdapterClass }` no providers do module
- Fluxo: Controller → Service → Entity → Port → Adapter

**4 anti-patterns (PROIBIDO):**
- Service instanciando adapter com `new` (usar DI)
- Entity chamando repository diretamente
- Controller com lógica de negócio
- Import de `infrastructure/` dentro de `domain/`

</constraints>

---

## 1. O Hexágono Explicado

```
              PRIMARY ADAPTERS (Driving — quem CHAMA o sistema)
            ┌──────────────────────────────────────────┐
            │  HTTP Controllers · CRON Triggers         │
            │  WebSocket Handlers · CLI Commands         │
            │  Event Listeners                           │
            └─────────────────┬────────────────────────┘
                              │
                              ▼
            ┌──────────────────────────────────────────┐
            │          PRIMARY PORTS (Input)             │
            │  CreateProductUseCase (interface)          │
            │  ProcessPaymentUseCase (interface)         │
            │  AuthenticateUserUseCase (interface)       │
            └─────────────────┬────────────────────────┘
                              │
            ┌─────────────────▼────────────────────────┐
            │          ╔══════════════════════╗         │
            │          ║    DOMAIN (CORE)     ║         │
            │          ║                      ║         │
            │          ║  Entities            ║         │
            │          ║  Value Objects        ║         │
            │          ║  Domain Services      ║         │
            │          ║  Domain Events        ║         │
            │          ║  Business Rules       ║         │
            │          ║                      ║         │
            │          ║  ZERO dependências    ║         │
            │          ║  externas            ║         │
            │          ╚══════════════════════╝         │
            └─────────────────┬────────────────────────┘
                              │
            ┌─────────────────▼────────────────────────┐
            │         SECONDARY PORTS (Output)           │
            │  ProductRepositoryPort (interface)         │
            │  PaymentGatewayPort (interface)             │
            │  StoragePort (interface)                    │
            │  EmailSenderPort (interface)                │
            └─────────────────┬────────────────────────┘
                              │
            ┌─────────────────▼────────────────────────┐
            │       SECONDARY ADAPTERS (Driven)         │
            │  DrizzleProductRepository (implementação)  │
            │  AsaasPaymentAdapter (implementação)       │
            │  SupabaseStorageAdapter (implementação)     │
            │  ResendEmailAdapter (implementação)         │
            └──────────────────────────────────────────┘
```

---

## 2. Regras IRREVOGÁVEIS

### 2.1 Dependência Unidirecional

```
Infrastructure → Application → Domain
     ↑                              ↑
     │     NUNCA o contrário        │
     └──────────────────────────────┘
```

| Regra | Nível | Descrição |
|-------|-------|-----------|
| **R-001** | 🚫 CRITICAL | Domain **NUNCA** importa de `application/` ou `infrastructure/` |
| **R-002** | 🚫 CRITICAL | Application **NUNCA** importa de `infrastructure/` (exceto DTOs se necessário) |
| **R-003** | ⚠️ REQUIRED | Infrastructure implementa Ports. Application consome Ports via DI |
| **R-004** | 🚫 CRITICAL | Entidades de domínio **NÃO** possuem decoradores NestJS |
| **R-005** | 🚫 CRITICAL | Ports (interfaces) vivem **DENTRO** de `domain/ports/` |
| **R-006** | 🚫 CRITICAL | Controller **NUNCA** acessa repositório diretamente. Sempre via Application Service |
| **R-007** | 🚫 CRITICAL | Application Service injeta Ports via token de injeção (`@Inject('PortName')`) |
| **R-008** | ⚠️ REQUIRED | NestJS Module faz o binding Port → Adapter nos `providers` |

---

## 3. Camadas em Detalhe

### 3.1 Domain Layer (Centro do Hexágono)

O Domain contém **TODA** a lógica de negócio. Não depende de NADA externo.

#### Entities — Classes puras com regras de negócio

```typescript
// ✅ CORRETO — Entidade de domínio pura
export class Invoice {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly subscriptionId: string,
    private _status: InvoiceStatus,
    private _total: Money,
    private _dueDate: Date,
    private _paidAt: Date | null,
    public readonly items: InvoiceItem[],
    public readonly createdAt: Date,
  ) {}

  get status(): InvoiceStatus { return this._status; }
  get total(): Money { return this._total; }
  get dueDate(): Date { return this._dueDate; }
  get paidAt(): Date | null { return this._paidAt; }

  confirmPayment(paidAt: Date): void {
    if (this._status === 'cancelled') {
      throw new DomainException('Não é possível confirmar fatura cancelada');
    }
    if (this._status === 'paid') {
      throw new DomainException('Fatura já está paga');
    }
    this._status = 'paid';
    this._paidAt = paidAt;
  }

  markAsOverdue(): void {
    if (this._status !== 'pending') {
      throw new DomainException('Apenas faturas pendentes podem ser marcadas como vencidas');
    }
    this._status = 'overdue';
  }

  cancel(): void {
    if (this._status === 'paid') {
      throw new DomainException('Fatura paga não pode ser cancelada');
    }
    this._status = 'cancelled';
  }

  isOverdue(): boolean {
    return this._status === 'pending' && new Date() > this._dueDate;
  }

  getDaysOverdue(): number {
    if (!this.isOverdue()) return 0;
    const diff = new Date().getTime() - this._dueDate.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }
}
```

```typescript
// ❌ PROIBIDO — Entidade com dependência externa
import { Column, Entity } from 'typeorm';         // ❌ ORM no domain
import { Injectable } from '@nestjs/common';        // ❌ NestJS no domain
import { ConfigService } from '@nestjs/config';     // ❌ Config no domain

@Entity()                                          // ❌ Decorador de ORM
@Injectable()                                      // ❌ Decorador NestJS
export class Invoice {
  @Column()
  status: string;
  
  constructor(private config: ConfigService) {}    // ❌ Dependência externa
}
```

#### Value Objects — Objetos imutáveis com validação própria

```typescript
// ✅ CORRETO — Value Object
export class Money {
  private constructor(
    public readonly amount: number,
    public readonly currency: string = 'BRL',
  ) {}

  static create(amount: number, currency = 'BRL'): Money {
    if (amount < 0) {
      throw new DomainException('Valor monetário não pode ser negativo');
    }
    return new Money(Math.round(amount * 100) / 100, currency);
  }

  add(other: Money): Money {
    this.ensureSameCurrency(other);
    return Money.create(this.amount + other.amount, this.currency);
  }

  subtract(other: Money): Money {
    this.ensureSameCurrency(other);
    return Money.create(this.amount - other.amount, this.currency);
  }

  multiply(factor: number): Money {
    return Money.create(this.amount * factor, this.currency);
  }

  isZero(): boolean { return this.amount === 0; }
  isPositive(): boolean { return this.amount > 0; }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }

  private ensureSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new DomainException('Não é possível operar com moedas diferentes');
    }
  }
}
```

```typescript
// ✅ CORRETO — Value Object com validação
export class Email {
  private constructor(public readonly value: string) {}

  static create(value: string): Email {
    if (!value || !value.includes('@')) {
      throw new DomainException('E-mail inválido');
    }
    return new Email(value.toLowerCase().trim());
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }
}
```

#### Domain Events — Eventos emitidos pelo domínio

```typescript
// ✅ CORRETO
export class InvoiceCreatedEvent {
  constructor(
    public readonly invoiceId: string,
    public readonly tenantId: string,
    public readonly amount: number,
    public readonly dueDate: Date,
    public readonly occurredAt: Date = new Date(),
  ) {}
}

export class PaymentConfirmedEvent {
  constructor(
    public readonly invoiceId: string,
    public readonly tenantId: string,
    public readonly amount: number,
    public readonly paymentMethod: string,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
```

#### Domain Services — Lógica pura que não pertence a uma entidade

```typescript
// ✅ CORRETO — Domain Service sem dependência externa
export class InvoiceCalculatorService {
  calculateProRata(
    monthlyPrice: number,
    startDay: number,
    totalDaysInMonth: number,
  ): number {
    const remainingDays = totalDaysInMonth - startDay + 1;
    const dailyRate = monthlyPrice / totalDaysInMonth;
    return Math.round(dailyRate * remainingDays * 100) / 100;
  }

  calculateTotal(items: { price: number; quantity: number }[]): number {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }
}
```

#### Ports — Interfaces que definem contratos

```typescript
// ✅ CORRETO — Primary Port (Use Case interface)
// domain/ports/input/create-invoice.usecase.ts
export interface CreateInvoiceUseCase {
  execute(input: CreateInvoiceInput): Promise<InvoiceOutput>;
}

export interface CreateInvoiceInput {
  tenantId: string;
  subscriptionId: string;
  items: { toolId: string; toolName: string; planName: string; price: number }[];
  dueDate: Date;
}

export interface InvoiceOutput {
  id: string;
  total: number;
  status: string;
  dueDate: Date;
}
```

```typescript
// ✅ CORRETO — Secondary Port (Output interface)
// domain/ports/output/invoice.repository.port.ts
export interface InvoiceRepositoryPort {
  save(invoice: Invoice): Promise<Invoice>;
  findById(id: string): Promise<Invoice | null>;
  findByTenant(tenantId: string): Promise<Invoice[]>;
  findOverdue(): Promise<Invoice[]>;
  findBySubscription(subscriptionId: string, month: number, year: number): Promise<Invoice | null>;
  update(invoice: Invoice): Promise<Invoice>;
}
```

```typescript
// ✅ CORRETO — Secondary Port (Gateway interface)
// domain/ports/output/payment-gateway.port.ts
export interface PaymentGatewayPort {
  createCustomer(data: CreateCustomerInput): Promise<ExternalCustomer>;
  chargeByPix(data: PixChargeInput): Promise<PixChargeResult>;
  chargeByBoleto(data: BoletoChargeInput): Promise<BoletoChargeResult>;
  chargeByCreditCard(data: CreditCardChargeInput): Promise<CreditCardChargeResult>;
  chargeWithToken(data: TokenChargeInput): Promise<TokenChargeResult>;
  cancelPayment(externalId: string): Promise<void>;
  refundPayment(externalId: string, amount?: number): Promise<void>;
  validateWebhook(payload: string, signature: string): boolean;
}
```

---

### 3.2 Application Layer (Orquestração)

A Application Layer implementa os Use Cases. Ela **orquestra** chamadas ao Domain e usa Ports para I/O.

```typescript
// ✅ CORRETO — Application Service implementando Use Case
import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateInvoiceUseCase, CreateInvoiceInput, InvoiceOutput } from '../domain/ports/input/create-invoice.usecase';
import { InvoiceRepositoryPort } from '../domain/ports/output/invoice.repository.port';
import { Invoice } from '../domain/entities/invoice.entity';
import { InvoiceCreatedEvent } from '../domain/events/invoice-created.event';
import { InvoiceMapper } from './mappers/invoice.mapper';

@Injectable()
export class InvoiceService implements CreateInvoiceUseCase {
  constructor(
    @Inject('InvoiceRepositoryPort')
    private readonly invoiceRepo: InvoiceRepositoryPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(input: CreateInvoiceInput): Promise<InvoiceOutput> {
    // 1. Criar entity via domain (regra de negócio)
    const invoice = Invoice.create({
      tenantId: input.tenantId,
      subscriptionId: input.subscriptionId,
      items: input.items,
      dueDate: input.dueDate,
    });

    // 2. Persistir via Port (não sabe se é Drizzle, Prisma, etc.)
    const saved = await this.invoiceRepo.save(invoice);

    // 3. Emitir domain event
    this.eventEmitter.emit(
      'invoice.created',
      new InvoiceCreatedEvent(saved.id, saved.tenantId, saved.total.amount, saved.dueDate),
    );

    // 4. Retornar DTO (nunca retornar entity para fora)
    return InvoiceMapper.toOutput(saved);
  }
}
```

```typescript
// ❌ PROIBIDO — Application Service acessando infra diretamente
import { drizzle } from 'drizzle-orm/postgres-js';    // ❌ Drizzle no application
import { invoices } from '../../common/database/schema'; // ❌ Schema direto

@Injectable()
export class InvoiceService {
  constructor(
    @Inject('DRIZZLE') private db: any,               // ❌ DB direto no service
  ) {}

  async create(input: any) {
    await this.db.insert(invoices).values(input);     // ❌ SQL no application layer
  }
}
```

#### DTOs — Validação de entrada/saída

```typescript
// ✅ CORRETO — DTO com class-validator
import { IsString, IsNumber, IsUUID, IsDateString, MinLength, Min, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInvoiceDto {
  @IsUUID()
  subscriptionId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];

  @IsDateString()
  dueDate: string;
}

export class InvoiceItemDto {
  @IsString()
  @MinLength(1)
  toolId: string;

  @IsString()
  @MinLength(1)
  toolName: string;

  @IsString()
  @MinLength(1)
  planName: string;

  @IsNumber()
  @Min(0)
  price: number;
}
```

#### Mappers — Conversão entre camadas

```typescript
// ✅ CORRETO — Mapper como classe estática
export class InvoiceMapper {
  static toOutput(entity: Invoice): InvoiceOutput {
    return {
      id: entity.id,
      total: entity.total.amount,
      status: entity.status,
      dueDate: entity.dueDate,
    };
  }

  static toDomain(raw: InvoiceRawData): Invoice {
    return new Invoice(
      raw.id,
      raw.tenantId,
      raw.subscriptionId,
      raw.status as InvoiceStatus,
      Money.create(parseFloat(raw.total)),
      raw.dueDate,
      raw.paidAt,
      raw.items.map(InvoiceItemMapper.toDomain),
      raw.createdAt,
    );
  }
}
```

---

### 3.3 Infrastructure Layer (Adapters)

Implementações concretas dos Ports definidos no Domain.

#### Primary Adapter — Controller (entrada HTTP)

```typescript
// ✅ CORRETO — Controller como Primary Adapter
import { Controller, Post, Body, Get, Param, UseGuards } from '@nestjs/common';
import { InvoiceService } from '../../application/services/invoice.service';
import { CreateInvoiceDto } from '../../application/dto/create-invoice.dto';
import { CurrentTenant } from '../../../../common/decorators/current-tenant.decorator';
import { Roles } from '../../../../common/decorators/roles.decorator';

@Controller({ path: 'invoices', version: '1' })
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post()
  @Roles('admin')
  async create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateInvoiceDto,
  ) {
    return this.invoiceService.execute({
      tenantId,
      subscriptionId: dto.subscriptionId,
      items: dto.items,
      dueDate: new Date(dto.dueDate),
    });
  }

  @Get(':id')
  async findOne(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.invoiceService.findById(tenantId, id);
  }
}
```

#### Secondary Adapter — Repository Drizzle (saída banco de dados)

```typescript
// ✅ CORRETO — Repository como Secondary Adapter
import { Inject, Injectable } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { InvoiceRepositoryPort } from '../../domain/ports/output/invoice.repository.port';
import { Invoice } from '../../domain/entities/invoice.entity';
import { invoices } from '../../../../common/database/schema';
import { InvoiceMapper } from '../../application/mappers/invoice.mapper';
import { DRIZZLE } from '../../../../common/database/drizzle.provider';

@Injectable()
export class DrizzleInvoiceRepository implements InvoiceRepositoryPort {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDatabase) {}

  async save(invoice: Invoice): Promise<Invoice> {
    const [row] = await this.db
      .insert(invoices)
      .values({
        id: invoice.id,
        tenantId: invoice.tenantId,
        subscriptionId: invoice.subscriptionId,
        status: invoice.status,
        total: invoice.total.amount.toString(),
        dueDate: invoice.dueDate,
        createdAt: invoice.createdAt,
      })
      .returning();

    return InvoiceMapper.toDomain(row);
  }

  async findById(id: string): Promise<Invoice | null> {
    const [row] = await this.db
      .select()
      .from(invoices)
      .where(eq(invoices.id, id))
      .limit(1);

    return row ? InvoiceMapper.toDomain(row) : null;
  }

  async findByTenant(tenantId: string): Promise<Invoice[]> {
    const rows = await this.db
      .select()
      .from(invoices)
      .where(eq(invoices.tenantId, tenantId))
      .orderBy(invoices.createdAt);

    return rows.map(InvoiceMapper.toDomain);
  }

  async findOverdue(): Promise<Invoice[]> {
    const rows = await this.db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.status, 'pending'),
          // dueDate < agora
        ),
      );

    return rows.map(InvoiceMapper.toDomain);
  }

  async update(invoice: Invoice): Promise<Invoice> {
    const [row] = await this.db
      .update(invoices)
      .set({
        status: invoice.status,
        paidAt: invoice.paidAt,
        paymentMethod: invoice.paymentMethod,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, invoice.id))
      .returning();

    return InvoiceMapper.toDomain(row);
  }
}
```

#### Secondary Adapter — Payment Gateway (saída serviço externo)

```typescript
// ✅ CORRETO — Gateway como Secondary Adapter
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentGatewayPort, PixChargeInput, PixChargeResult } from '../../domain/ports/output/payment-gateway.port';

@Injectable()
export class AsaasPaymentAdapter implements PaymentGatewayPort {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = config.getOrThrow('ASAAS_API_URL');
    this.apiKey = config.getOrThrow('ASAAS_API_KEY');
  }

  async chargeByPix(data: PixChargeInput): Promise<PixChargeResult> {
    const response = await fetch(`${this.baseUrl}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': this.apiKey,
      },
      body: JSON.stringify({
        customer: data.customerId,
        billingType: 'PIX',
        value: data.amount,
        dueDate: data.dueDate,
        description: data.description,
        externalReference: data.invoiceId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new PaymentGatewayException('Asaas PIX charge failed', error);
    }

    const result = await response.json();
    return {
      externalId: result.id,
      status: result.status,
      pixQrCode: result.pixQrCodeUrl,
      pixCopiaECola: result.pixCopiaECola,
      expirationDate: result.expirationDate,
    };
  }

  // ... outros métodos do PaymentGatewayPort
}
```

---

## 4. Binding no Module (DI do NestJS)

O Module é onde o NestJS conecta Ports a Adapters:

```typescript
// ✅ CORRETO — Module fazendo binding de Ports → Adapters
@Module({
  imports: [QueueModule, EventEmitterModule],
  controllers: [
    InvoiceController,     // Primary Adapter
    WebhookController,     // Primary Adapter
  ],
  providers: [
    // Application Services
    InvoiceService,
    SubscriptionService,
    PaymentService,

    // Domain Services (se houver)
    InvoiceCalculatorService,

    // ═══ BINDING: Port → Adapter ═══
    {
      provide: 'InvoiceRepositoryPort',
      useClass: DrizzleInvoiceRepository,     // Trocar aqui para mudar ORM
    },
    {
      provide: 'SubscriptionRepositoryPort',
      useClass: DrizzleSubscriptionRepository,
    },
    {
      provide: 'PaymentGatewayPort',
      useClass: AsaasPaymentAdapter,          // Trocar aqui para Stripe
    },
    {
      provide: 'PdfGeneratorPort',
      useClass: PdfKitAdapter,                // Trocar aqui para Puppeteer
    },
  ],
  exports: [InvoiceService, SubscriptionService],
})
export class BillingModule {}
```

### Como trocar Asaas por Stripe (exemplo real)

```typescript
// 1. Criar novo Adapter que implementa a MESMA interface
@Injectable()
export class StripePaymentAdapter implements PaymentGatewayPort {
  async chargeByPix(data: PixChargeInput): Promise<PixChargeResult> {
    // Implementação usando Stripe API
  }
  // ... todos os métodos da interface
}

// 2. Trocar o binding no Module
{
  provide: 'PaymentGatewayPort',
  useClass: StripePaymentAdapter,  // ← Só mudar aqui
}

// 3. ZERO alterações em InvoiceService, PaymentService, entidades.
```

---

## 5. Regras de Import — Verificação Obrigatória

### O que PODE importar o quê:

| Camada | Pode importar de |
|--------|-----------------|
| `domain/entities/` | NADA externo. Apenas outros entities, VOs, domain exceptions |
| `domain/value-objects/` | NADA externo. Apenas domain exceptions |
| `domain/events/` | NADA externo. Tipos primitivos apenas |
| `domain/services/` | Entities, VOs, tipos do domain |
| `domain/ports/input/` | Tipos do domain (entities como return type) |
| `domain/ports/output/` | Entities do domain (como parâmetros e retorno) |
| `application/services/` | `domain/` inteiro + `@nestjs/common` + ports via `@Inject` |
| `application/dto/` | `class-validator`, `class-transformer` |
| `application/mappers/` | `domain/entities/` + `application/dto/` |
| `infrastructure/adapters/primary/` | `application/services/` + `application/dto/` + `@nestjs/*` |
| `infrastructure/adapters/secondary/` | `domain/ports/output/` + `domain/entities/` + libs externas (Drizzle, Asaas SDK) |

### O que NUNCA pode acontecer:

```
❌ domain/ importa de application/
❌ domain/ importa de infrastructure/
❌ domain/ importa @nestjs/common, drizzle-orm, ou qualquer lib
❌ application/ importa de infrastructure/ (classes concretas)
❌ controller importa repository diretamente
❌ entity com @Injectable(), @Entity(), @Column()
❌ application service com `this.db.query(...)` direto
```

---

## 6. Checklist de Revisão — Antes de Todo PR

Antes de aprovar qualquer PR, verificar:

- [ ] Entidades de domínio estão livre de imports externos?
- [ ] Value Objects são imutáveis e validam no `create()`?
- [ ] Ports são interfaces (não classes abstratas)?
- [ ] Application Services injetam Ports via `@Inject('NomeDoPort')`?
- [ ] Controllers delegam para Application Services (nunca repos)?
- [ ] Module faz binding `{ provide: 'Port', useClass: Adapter }`?
- [ ] Novos adapters implementam a interface do Port completamente?
- [ ] Domain Events são classes simples sem dependências?
- [ ] Mappers convertem Entity ↔ DTO sem lógica de negócio?
- [ ] Nenhum import cruzado entre módulos (apenas Services exportados)?

---

## 7. Anti-Patterns — O que NÃO fazer

### Anti-Pattern 1: Anemic Domain

```typescript
// ❌ PROIBIDO — Entidade sem comportamento (anêmica)
export class Invoice {
  id: string;
  status: string;   // Público e mutável
  total: number;     // Sem validação
}

// O service faz TUDO:
invoiceService.markAsPaid(invoice);  // ❌ Lógica deveria estar na Entity
```

```typescript
// ✅ CORRETO — Entidade rica com comportamento
export class Invoice {
  private _status: InvoiceStatus;

  confirmPayment(paidAt: Date): void {    // ✅ Comportamento na Entity
    if (this._status === 'cancelled') {
      throw new DomainException('Não pode confirmar fatura cancelada');
    }
    this._status = 'paid';
    this._paidAt = paidAt;
  }
}
```

### Anti-Pattern 2: God Service

```typescript
// ❌ PROIBIDO — Service que faz tudo
export class BillingService {
  async subscribe() { /* ... */ }
  async createInvoice() { /* ... */ }
  async processPayment() { /* ... */ }
  async generatePdf() { /* ... */ }
  async handleWebhook() { /* ... */ }
  async checkOverdue() { /* ... */ }
}
```

```typescript
// ✅ CORRETO — Services separados por responsabilidade
export class SubscriptionService { /* subscribe, upgrade, cancel */ }
export class InvoiceService { /* create, findById, markAsOverdue */ }
export class PaymentService { /* charge, confirm, refund */ }
```

### Anti-Pattern 3: Leaking Infrastructure

```typescript
// ❌ PROIBIDO — Retornar row do banco para o controller
async findAll(tenantId: string) {
  return this.db.select().from(products).where(eq(products.tenantId, tenantId));
  // ❌ Retorna schema do Drizzle, não entity
}
```

```typescript
// ✅ CORRETO — Converter para entity/DTO
async findAll(tenantId: string): Promise<ProductOutput[]> {
  const products = await this.productRepo.findByTenant(tenantId);
  return products.map(ProductMapper.toOutput);
}
```

### Anti-Pattern 4: Bypass de Port

```typescript
// ❌ PROIBIDO — Service acessando Asaas diretamente
@Injectable()
export class PaymentService {
  async charge(invoice: Invoice) {
    const response = await fetch('https://api.asaas.com/v3/payments', {  // ❌ Direto
      // ...
    });
  }
}
```

```typescript
// ✅ CORRETO — Service usa Port
@Injectable()
export class PaymentService {
  constructor(
    @Inject('PaymentGatewayPort')
    private readonly paymentGateway: PaymentGatewayPort,  // ✅ Via Port
  ) {}

  async charge(invoice: Invoice) {
    return this.paymentGateway.chargeByPix({
      customerId: invoice.customerId,
      amount: invoice.total.amount,
    });
  }
}
```

---

## 8. Resumo Visual — Fluxo de Uma Request

```
HTTP Request
    │
    ▼
Controller (Primary Adapter)
    │ valida DTO (class-validator)
    │ extrai tenantId, userId
    │
    ▼
Application Service (Use Case)
    │ orquestra domain entities
    │ chama Ports via @Inject
    │ emite events
    │
    ├──▶ Domain Entity (regra de negócio pura)
    │
    ├──▶ Repository Port → Drizzle Adapter (salva no DB)
    │
    ├──▶ Gateway Port → Asaas Adapter (cobra pagamento)
    │
    └──▶ EventEmitter → Notification Listener (side effect)
    │
    ▼
Response DTO (nunca entity)
    │
    ▼
HTTP Response
```

---

> **Skill File v1.0** — Hexagonal Architecture  
> **REGRA ABSOLUTA:** Toda IA ou desenvolvedor que toque neste projeto DEVE seguir estritamente este guia. Desvios serão rejeitados em code review.
