# 03. Padrões de Código — NestJS + TypeScript

> **Obrigatório:** Todo código deve seguir estas regras. Desvios serão rejeitados em PR review.

---

## 1. TypeScript Strict Mode (Obrigatório)

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "strictPropertyInitialization": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "target": "ES2022",
    "module": "commonjs",
    "moduleResolution": "node",
    "baseUrl": "./",
    "outDir": "./dist",
    "sourceMap": true,
    "incremental": true,
    "skipLibCheck": true
  }
}
```

**PROIBIDO:** `any` como tipo. Use `unknown` quando o tipo não for conhecido.

```typescript
// ❌ PROIBIDO
function process(data: any) { ... }
const result: any = await fetch(...);

// ✅ CORRETO
function process(data: unknown) { ... }
const result: Response = await fetch(...);
```

---

## 2. Convenções de Nomenclatura

### 2.1 Arquivos

| Tipo | Pattern | Exemplo |
|------|---------|---------|
| Entidade | `{name}.entity.ts` | `invoice.entity.ts` |
| Value Object | `{name}.vo.ts` | `money.vo.ts` |
| Domain Event | `{name}.event.ts` | `invoice-created.event.ts` |
| Domain Service | `{name}.service.ts` | `invoice-calculator.service.ts` |
| Port (input) | `{name}.usecase.ts` | `create-invoice.usecase.ts` |
| Port (output) | `{name}.port.ts` | `invoice.repository.port.ts` |
| Application Service | `{name}.service.ts` | `invoice.service.ts` |
| DTO | `{name}.dto.ts` | `create-invoice.dto.ts` |
| Mapper | `{name}.mapper.ts` | `invoice.mapper.ts` |
| Controller | `{name}.controller.ts` | `invoice.controller.ts` |
| Repository Adapter | `drizzle-{name}.repository.ts` | `drizzle-invoice.repository.ts` |
| Gateway Adapter | `{provider}-{name}.adapter.ts` | `asaas-payment.adapter.ts` |
| Guard | `{name}.guard.ts` | `jwt-auth.guard.ts` |
| Decorator | `{name}.decorator.ts` | `current-tenant.decorator.ts` |
| Interceptor | `{name}.interceptor.ts` | `response.interceptor.ts` |
| Filter | `{name}.filter.ts` | `http-exception.filter.ts` |
| Pipe | `{name}.pipe.ts` | `validation.pipe.ts` |
| Module | `{name}.module.ts` | `billing.module.ts` |
| Spec | `{name}.spec.ts` | `invoice.service.spec.ts` |
| E2E Spec | `{name}.e2e-spec.ts` | `billing.e2e-spec.ts` |
| Schema (Drizzle) | `{name}.schema.ts` | `invoice.schema.ts` |

### 2.2 Classes e Interfaces

```typescript
// ✅ PascalCase para classes
export class InvoiceService {}
export class DrizzleInvoiceRepository {}
export class AsaasPaymentAdapter {}

// ✅ PascalCase para interfaces com sufixo descritivo
export interface InvoiceRepositoryPort {}
export interface PaymentGatewayPort {}
export interface CreateInvoiceUseCase {}

// ✅ PascalCase para DTOs
export class CreateInvoiceDto {}
export class InvoiceResponseDto {}

// ✅ PascalCase para Events
export class InvoiceCreatedEvent {}
export class PaymentConfirmedEvent {}

// ✅ PascalCase para Enums
export enum InvoiceStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}
```

### 2.3 Variáveis e Métodos

```typescript
// ✅ camelCase para variáveis, métodos, parâmetros
const invoiceTotal = Money.create(89.80);
const isActive = true;

async findByTenant(tenantId: string): Promise<Invoice[]> {}
async confirmPayment(invoiceId: string, paidAt: Date): Promise<void> {}

// ✅ UPPER_SNAKE_CASE para constantes
const MAX_LOGIN_ATTEMPTS = 5;
const JWT_EXPIRES_IN = '15m';
const DRIZZLE = Symbol('DRIZZLE');

// ✅ Prefixo _ para membros privados de entidade
private _status: InvoiceStatus;
private _total: Money;

// ❌ PROIBIDO — Prefixo I para interfaces (convenção do C#)
interface IInvoiceRepository {}  // ❌
interface InvoiceRepositoryPort {} // ✅
```

### 2.4 Pastas

```
// ✅ kebab-case para pastas e arquivos
modules/billing/
domain/value-objects/
infrastructure/adapters/secondary/
create-invoice.dto.ts
drizzle-invoice.repository.ts

// ❌ PROIBIDO
modules/Billing/
domain/valueObjects/
CreateInvoice.dto.ts
```

---

## 3. Classes e Injeção de Dependência

### 3.1 Sempre usar constructor injection

```typescript
// ✅ CORRETO — Constructor injection
@Injectable()
export class InvoiceService {
  constructor(
    @Inject('InvoiceRepositoryPort')
    private readonly invoiceRepo: InvoiceRepositoryPort,
    @Inject('PaymentGatewayPort')
    private readonly paymentGateway: PaymentGatewayPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}
}
```

```typescript
// ❌ PROIBIDO — Property injection
@Injectable()
export class InvoiceService {
  @Inject('InvoiceRepositoryPort')
  private invoiceRepo: InvoiceRepositoryPort;  // ❌ Property injection
}
```

### 3.2 Readonly por padrão

```typescript
// ✅ CORRETO — Tudo readonly
constructor(
  private readonly invoiceRepo: InvoiceRepositoryPort,  // ✅
  private readonly config: ConfigService,                // ✅
) {}

// ❌ PROIBIDO — Sem readonly
constructor(
  private invoiceRepo: InvoiceRepositoryPort,  // ❌ Falta readonly
) {}
```

### 3.3 Token de Injeção para Ports

```typescript
// ✅ CORRETO — String token para Ports
@Inject('InvoiceRepositoryPort')
private readonly invoiceRepo: InvoiceRepositoryPort;

// ✅ CORRETO — Symbol token (alternativa)
export const INVOICE_REPO = Symbol('InvoiceRepositoryPort');

@Inject(INVOICE_REPO)
private readonly invoiceRepo: InvoiceRepositoryPort;

// Ambos são aceitos. Manter consistência dentro do projeto.
// Recomendação: usar string tokens.
```

---

## 4. Controllers — Regras

### 4.1 Controller magro (thin controller)

O controller apenas: valida DTO, extrai decoradores, delega para service, retorna.

```typescript
// ✅ CORRETO — Controller magro
@Controller({ path: 'products', version: '1' })
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @Roles('admin')
  async create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateProductDto,
  ) {
    return this.productService.create(tenantId, dto);
  }

  @Get()
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.productService.findAll(tenantId, query);
  }

  @Get(':id')
  async findOne(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.productService.findById(tenantId, id);
  }

  @Put(':id')
  @Roles('admin')
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.productService.remove(tenantId, id);
  }
}
```

```typescript
// ❌ PROIBIDO — Controller gordo com lógica
@Post()
async create(@Body() dto: CreateProductDto, @CurrentTenant() tenantId: string) {
  // ❌ Validação de negócio no controller
  if (dto.basePrice < 0) throw new BadRequestException('Preço inválido');
  
  // ❌ Acesso direto ao banco no controller
  const existing = await this.db.select().from(products).where(/*...*/);
  if (existing) throw new ConflictException('SKU duplicado');
  
  // ❌ Lógica de negócio no controller
  const profitMargin = ((dto.basePrice - dto.costPrice) / dto.costPrice) * 100;
  
  await this.db.insert(products).values({ ...dto, profitMargin });
}
```

### 4.2 Tipagem de retorno explícita

```typescript
// ✅ CORRETO — Retorno tipado
@Get()
async findAll(@CurrentTenant() tenantId: string): Promise<ProductResponseDto[]> {
  return this.productService.findAll(tenantId);
}

// ❌ PROIBIDO — Sem tipo de retorno
@Get()
async findAll(@CurrentTenant() tenantId: string) {  // ❌ Missing return type
  return this.productService.findAll(tenantId);
}
```

---

## 5. DTOs — Validação de Entrada

### 5.1 Sempre usar class-validator

```typescript
// ✅ CORRETO
import {
  IsString, IsNumber, IsOptional, IsUUID, IsEnum,
  IsBoolean, IsArray, ValidateNested, MinLength,
  MaxLength, Min, Max, IsEmail, Matches,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateProductDto {
  @IsString()
  @MinLength(2, { message: 'Nome deve ter no mínimo 2 caracteres' })
  @MaxLength(255)
  name: string;

  @IsString()
  @MinLength(1)
  sku: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'Preço base deve ser positivo' })
  basePrice: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  costPrice?: number;

  @IsBoolean()
  @IsOptional()
  trackInventory?: boolean;

  @IsEnum(['ATIVO', 'INATIVO'])
  status: 'ATIVO' | 'INATIVO';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariationDto)
  @IsOptional()
  variations?: ProductVariationDto[];
}
```

### 5.2 DTOs de saída (Response)

```typescript
// ✅ CORRETO — DTO de resposta
export class ProductResponseDto {
  id: string;
  name: string;
  sku: string;
  basePrice: number;
  status: string;
  variationsCount: number;
  createdAt: string;

  static from(entity: Product): ProductResponseDto {
    const dto = new ProductResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.sku = entity.sku;
    dto.basePrice = entity.basePrice.amount;
    dto.status = entity.status;
    dto.variationsCount = entity.variations.length;
    dto.createdAt = entity.createdAt.toISOString();
    return dto;
  }
}
```

### 5.3 DTO de paginação

```typescript
// ✅ CORRETO — Query de paginação reutilizável
export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

// Resposta paginada
export class PaginatedResponseDto<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };

  static create<T>(data: T[], total: number, page: number, limit: number): PaginatedResponseDto<T> {
    const totalPages = Math.ceil(total / limit);
    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    };
  }
}
```

---

## 6. Application Services — Regras

### 6.1 Um service por responsabilidade

```typescript
// ✅ CORRETO — Service focado
@Injectable()
export class ProductService {
  async create(tenantId: string, dto: CreateProductDto): Promise<ProductResponseDto> { ... }
  async findAll(tenantId: string, query: PaginationQueryDto): Promise<PaginatedResponseDto<ProductResponseDto>> { ... }
  async findById(tenantId: string, id: string): Promise<ProductResponseDto> { ... }
  async update(tenantId: string, id: string, dto: UpdateProductDto): Promise<ProductResponseDto> { ... }
  async remove(tenantId: string, id: string): Promise<void> { ... }
}
```

### 6.2 Tratar NOT FOUND no service

```typescript
// ✅ CORRETO
async findById(tenantId: string, id: string): Promise<ProductResponseDto> {
  const product = await this.productRepo.findById(id);
  
  if (!product) {
    throw new NotFoundException(`Produto com id ${id} não encontrado`);
  }
  
  if (product.tenantId !== tenantId) {
    throw new ForbiddenException('Acesso negado a este recurso');
  }

  return ProductMapper.toOutput(product);
}
```

### 6.3 Transações quando necessário

```typescript
// ✅ CORRETO — Transação para operações compostas
async createCollaborator(tenantId: string, dto: CreateCollaboratorDto): Promise<CollaboratorResponseDto> {
  return this.db.transaction(async (tx) => {
    // 1. Criar colaborador
    const collaborator = await this.collaboratorRepo.save(
      Collaborator.create({ ...dto, tenantId }),
      tx,
    );

    // 2. Criar usuário vinculado
    const randomPassword = crypto.randomBytes(16).toString('base64');
    const user = await this.userRepo.save(
      User.createFromCollaborator({
        tenantId,
        email: dto.email,
        name: `${dto.firstName} ${dto.lastName}`,
        passwordHash: await this.hasher.hash(randomPassword),
        collaboratorId: collaborator.id,
        mustResetPassword: true,
      }),
      tx,
    );

    // 3. Criar permissões de ferramentas
    if (dto.toolPermissions?.length) {
      await this.permissionRepo.saveMany(
        dto.toolPermissions.map(p => ({
          collaboratorId: collaborator.id,
          tenantId,
          toolId: p.toolId,
          canView: p.hasAccess,
          canEdit: p.hasAccess,
          canDelete: false,
        })),
        tx,
      );
    }

    // 4. Enfileirar e-mail de boas-vindas (fora da transação)
    this.eventEmitter.emit('collaborator.created', {
      email: dto.email,
      name: dto.firstName,
      temporaryPassword: randomPassword,
      tenantId,
    });

    return CollaboratorMapper.toOutput(collaborator);
  });
}
```

---

## 7. Async/Await — Regras

```typescript
// ✅ CORRETO — Sempre async/await (nunca .then/.catch)
async findAll(tenantId: string): Promise<Product[]> {
  const products = await this.productRepo.findByTenant(tenantId);
  return products;
}

// ❌ PROIBIDO
findAll(tenantId: string): Promise<Product[]> {
  return this.productRepo.findByTenant(tenantId)
    .then(products => products)     // ❌ Promise chain
    .catch(err => { throw err; });  // ❌ .catch
}

// ✅ CORRETO — Parallel promises quando independentes
async getDashboard(tenantId: string) {
  const [products, services, notifications] = await Promise.all([
    this.productRepo.count(tenantId),
    this.serviceRepo.count(tenantId),
    this.notificationRepo.countUnread(tenantId),
  ]);
  return { products, services, notifications };
}
```

---

## 8. Enums — Regras

```typescript
// ✅ CORRETO — Enum com valores string
export enum InvoiceStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  PROCESSING = 'processing',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

// ✅ CORRETO — Union Type (alternativa para DTOs)
export type CompanyType = 'produtos' | 'servicos' | 'ambos';
export type UserRole = 'admin' | 'user';

// ❌ PROIBIDO — Enum numérico
export enum InvoiceStatus {
  DRAFT,     // ❌ Valor 0, 1, 2... frágil
  PENDING,
  PAID,
}

// ❌ PROIBIDO — String literal sem enum/type
status: string;  // ❌ Sem tipagem forte
```

---

## 9. Error Handling — Padrão

```typescript
// ✅ CORRETO — Domain Exception
export class DomainException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainException';
  }
}

// ✅ CORRETO — Exceções específicas de domínio
export class InvoiceAlreadyPaidException extends DomainException {
  constructor(invoiceId: string) {
    super(`A fatura ${invoiceId} já está paga`);
  }
}

export class InsufficientStockException extends DomainException {
  constructor(productId: string, available: number, requested: number) {
    super(`Estoque insuficiente para produto ${productId}: disponível ${available}, solicitado ${requested}`);
  }
}
```

```typescript
// ✅ CORRETO — Uso no Application Service
async confirmPayment(tenantId: string, invoiceId: string): Promise<void> {
  const invoice = await this.invoiceRepo.findById(invoiceId);
  if (!invoice) throw new NotFoundException('Fatura não encontrada');
  if (invoice.tenantId !== tenantId) throw new ForbiddenException();

  try {
    invoice.confirmPayment(new Date());  // Pode lançar DomainException
  } catch (error) {
    if (error instanceof DomainException) {
      throw new BadRequestException(error.message);
    }
    throw error;
  }

  await this.invoiceRepo.update(invoice);
}
```

---

## 10. Imports — Organização

```typescript
// ✅ CORRETO — Ordem de imports
// 1. Módulos do Node.js
import { randomUUID } from 'crypto';

// 2. Pacotes de terceiros
import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { eq, and, desc } from 'drizzle-orm';

// 3. Módulos internos (domain)
import { Invoice } from '../domain/entities/invoice.entity';
import { InvoiceRepositoryPort } from '../domain/ports/output/invoice.repository.port';
import { InvoiceCreatedEvent } from '../domain/events/invoice-created.event';

// 4. Módulos internos (application)
import { InvoiceMapper } from './mappers/invoice.mapper';
import { CreateInvoiceDto } from './dto/create-invoice.dto';

// 5. Common/Shared
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
```

**Regra:** Separar grupos com **linha em branco**.

---

## 11. Comentários — Regras

```typescript
// ✅ CORRETO — JSDoc para métodos públicos de Service/Port
/**
 * Cria uma nova fatura para o tenant.
 * Calcula pro-rata se assinatura iniciou no meio do mês.
 * Emite evento `invoice.created` após persistência.
 *
 * @throws NotFoundException se subscription não existir
 * @throws BadRequestException se já existir fatura para o mês
 */
async create(tenantId: string, dto: CreateInvoiceDto): Promise<InvoiceResponseDto> { ... }

// ❌ PROIBIDO — Comentários óbvios
// Busca o produto pelo ID
const product = await this.productRepo.findById(id);

// Verifica se existe
if (!product) { ... }
```

---

## 12. Regras Gerais — Resumo

| # | Nível | Regra |
|---|-------|-------|
| C-001 | 🚫 CRITICAL | TypeScript `strict: true` obrigatório |
| C-002 | 🚫 CRITICAL | **PROIBIDO** usar `any`. Use `unknown` |
| C-003 | ⚠️ REQUIRED | Nomes de arquivo em `kebab-case` |
| C-004 | ⚠️ REQUIRED | Classes e interfaces em `PascalCase` |
| C-005 | ⚠️ REQUIRED | Variáveis e métodos em `camelCase` |
| C-006 | ⚠️ REQUIRED | Constantes em `UPPER_SNAKE_CASE` |
| C-007 | 🚫 CRITICAL | Sempre `constructor injection` com `private readonly` |
| C-008 | 🚫 CRITICAL | Controllers magros: validar, delegar, retornar |
| C-009 | 🚫 CRITICAL | DTOs com `class-validator` obrigatório |
| C-010 | 🚫 CRITICAL | Sempre `async/await`. **PROIBIDO** `.then/.catch` |
| C-011 | ⚠️ REQUIRED | Retorno tipado explícito em todos os métodos públicos |
| C-012 | ⚠️ REQUIRED | Enums com valores `string` (nunca numérico) |
| C-013 | 💡 RECOMMENDED | Imports organizados: node → third-party → domain → app → common |
| C-014 | 💡 RECOMMENDED | JSDoc em métodos públicos de Services e Ports |
| C-015 | 🚫 CRITICAL | Nunca retornar entity para fora do service. Sempre DTO |
| C-016 | 💡 RECOMMENDED | `Promise.all` para queries independentes |
| C-017 | ⚠️ REQUIRED | Transações para operações compostas (multi-table) |
| C-018 | ⚠️ REQUIRED | Domain exceptions para regras de negócio violadas |
| C-019 | ⚠️ REQUIRED | `NotFoundException`, `ForbiddenException`, `BadRequestException` do NestJS para HTTP errors |
| C-020 | ⚠️ REQUIRED | Sem prefixo `I` em interfaces |
| C-021 | 🚫 CRITICAL | Campos monetários: `@IsNumber({ maxDecimalPlaces: 2 }) @Min(0)` no DTO. Schema `numeric(10,2)`. Entity/VO `number`. **PROIBIDO** `float`/`integer` para dinheiro |
| C-022 | ⚠️ REQUIRED | Conversão `numeric` do Drizzle (string) para `number` via `parseFloat()` **somente no Mapper** — nunca no controller ou service |

---

> **Skill File v1.0** — Padrões de Código  
> **Regra:** Todo código que não seguir estas regras será rejeitado. A IA deve seguir estritamente estas convenções.
