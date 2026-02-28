# 04. Guia de Desenvolvimento de Módulos

> **Passo a passo** para criar novos módulos seguindo Hexagonal Architecture.  
> **Regra:** Todo novo módulo DEVE seguir este template. Sem exceções.

---

## 1. Checklist — Antes de Começar

- [ ] O módulo está previsto no `01-project-architecture.md`?
- [ ] As entidades estão definidas no `06-data-modeling.md`?
- [ ] Os endpoints estão mapeados no `BACKEND-REQUIREMENTS.md`?
- [ ] O módulo segue a estrutura hexagonal do `02-hexagonal-arch-guide.md`?

---

## 2. Passo a Passo — Criar Módulo Novo

### Passo 1: Criar estrutura de pastas

```
src/modules/{module-name}/
├── {module-name}.module.ts
├── domain/
│   ├── entities/
│   │   └── {entity}.entity.ts
│   ├── value-objects/
│   │   └── (se necessário)
│   ├── events/
│   │   └── {entity}-created.event.ts
│   ├── services/
│   │   └── (se necessário)
│   └── ports/
│       ├── input/
│       │   └── manage-{entity}.usecase.ts
│       └── output/
│           └── {entity}.repository.port.ts
├── application/
│   ├── services/
│   │   └── {entity}.service.ts
│   ├── dto/
│   │   ├── create-{entity}.dto.ts
│   │   ├── update-{entity}.dto.ts
│   │   └── {entity}-response.dto.ts
│   ├── mappers/
│   │   └── {entity}.mapper.ts
│   └── jobs/
│       └── (se necessário)
└── infrastructure/
    ├── adapters/
    │   ├── primary/
    │   │   └── {entity}.controller.ts
    │   └── secondary/
    │       └── persistence/
    │           └── drizzle-{entity}.repository.ts
    └── config/
        └── (se necessário)
```

### Passo 2: Criar Domain Entity

```typescript
// domain/entities/product.entity.ts
import { DomainException } from '../../../../common/exceptions/domain.exception';
import { Money } from '../value-objects/money.vo';

export class Product {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    private _name: string,
    private _sku: string,
    private _basePrice: Money,
    private _status: ProductStatus,
    private _stock: number,
    private _minStock: number,
    private _trackInventory: boolean,
    public readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  // Factory method
  static create(props: CreateProductProps): Product {
    if (!props.name || props.name.length < 2) {
      throw new DomainException('Nome do produto deve ter no mínimo 2 caracteres');
    }
    if (!props.sku) {
      throw new DomainException('SKU é obrigatório');
    }

    return new Product(
      props.id ?? crypto.randomUUID(),
      props.tenantId,
      props.name,
      props.sku,
      Money.create(props.basePrice),
      props.status ?? 'ATIVO',
      props.stock ?? 0,
      props.minStock ?? 0,
      props.trackInventory ?? false,
      new Date(),
      new Date(),
    );
  }

  // Getters
  get name(): string { return this._name; }
  get sku(): string { return this._sku; }
  get basePrice(): Money { return this._basePrice; }
  get status(): ProductStatus { return this._status; }
  get stock(): number { return this._stock; }

  // Comportamentos
  activate(): void {
    this._status = 'ATIVO';
    this._updatedAt = new Date();
  }

  deactivate(): void {
    this._status = 'INATIVO';
    this._updatedAt = new Date();
  }

  updateStock(quantity: number): void {
    if (this._trackInventory && quantity < 0) {
      throw new DomainException('Estoque não pode ser negativo');
    }
    this._stock = quantity;
    this._updatedAt = new Date();
  }

  isLowStock(): boolean {
    return this._trackInventory && this._stock <= this._minStock;
  }

  updatePrice(newPrice: number): void {
    this._basePrice = Money.create(newPrice);
    this._updatedAt = new Date();
  }
}

type ProductStatus = 'ATIVO' | 'INATIVO';

interface CreateProductProps {
  id?: string;
  tenantId: string;
  name: string;
  sku: string;
  basePrice: number;
  status?: ProductStatus;
  stock?: number;
  minStock?: number;
  trackInventory?: boolean;
}
```

### Passo 3: Criar Ports (interfaces)

```typescript
// domain/ports/output/product.repository.port.ts
import { Product } from '../../entities/product.entity';

export interface ProductRepositoryPort {
  save(product: Product): Promise<Product>;
  findById(id: string): Promise<Product | null>;
  findByTenant(tenantId: string, options?: FindProductsOptions): Promise<Product[]>;
  findBySkuAndTenant(sku: string, tenantId: string): Promise<Product | null>;
  count(tenantId: string, options?: FindProductsOptions): Promise<number>;
  update(product: Product): Promise<Product>;
  delete(id: string): Promise<void>;
}

export interface FindProductsOptions {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
```

```typescript
// domain/ports/input/manage-product.usecase.ts
import { Product } from '../../entities/product.entity';

export interface CreateProductUseCase {
  execute(input: CreateProductInput): Promise<ProductOutput>;
}

export interface CreateProductInput {
  tenantId: string;
  name: string;
  sku: string;
  basePrice: number;
  costPrice?: number;
  stock?: number;
  minStock?: number;
  trackInventory?: boolean;
  status?: string;
}

export interface ProductOutput {
  id: string;
  name: string;
  sku: string;
  basePrice: number;
  status: string;
  stock: number;
  createdAt: string;
}
```

### Passo 4: Criar DTOs

```typescript
// application/dto/create-product.dto.ts
import { IsString, IsNumber, IsOptional, IsBoolean, IsEnum, MinLength, Min } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @MinLength(1)
  sku: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  basePrice: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  costPrice?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  stock?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  minStock?: number;

  @IsBoolean()
  @IsOptional()
  trackInventory?: boolean;

  @IsEnum(['ATIVO', 'INATIVO'])
  @IsOptional()
  status?: 'ATIVO' | 'INATIVO';
}
```

```typescript
// application/dto/update-product.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateProductDto } from './create-product.dto';

export class UpdateProductDto extends PartialType(CreateProductDto) {}
```

### Passo 5: Criar Mapper

```typescript
// application/mappers/product.mapper.ts
import { Product } from '../../domain/entities/product.entity';
import { ProductOutput } from '../../domain/ports/input/manage-product.usecase';

export class ProductMapper {
  static toOutput(entity: Product): ProductOutput {
    return {
      id: entity.id,
      name: entity.name,
      sku: entity.sku,
      basePrice: entity.basePrice.amount,
      status: entity.status,
      stock: entity.stock,
      createdAt: entity.createdAt.toISOString(),
    };
  }

  static toDomain(raw: ProductRawData): Product {
    return new Product(
      raw.id,
      raw.tenantId,
      raw.name,
      raw.sku,
      Money.create(parseFloat(raw.basePrice)),
      raw.status as ProductStatus,
      raw.stock,
      raw.minStock,
      raw.trackInventory,
      raw.createdAt,
      raw.updatedAt,
    );
  }
}
```

### Passo 6: Criar Application Service

```typescript
// application/services/product.service.ts
import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProductRepositoryPort } from '../../domain/ports/output/product.repository.port';
import { Product } from '../../domain/entities/product.entity';
import { ProductMapper } from '../mappers/product.mapper';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { PaginationQueryDto, PaginatedResponseDto } from '../../../../common/types/pagination.type';

@Injectable()
export class ProductService {
  constructor(
    @Inject('ProductRepositoryPort')
    private readonly productRepo: ProductRepositoryPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(tenantId: string, dto: CreateProductDto): Promise<ProductOutput> {
    // Verificar SKU duplicado
    const existing = await this.productRepo.findBySkuAndTenant(dto.sku, tenantId);
    if (existing) {
      throw new ConflictException(`SKU "${dto.sku}" já existe neste tenant`);
    }

    // Criar entity via domain
    const product = Product.create({ ...dto, tenantId });

    // Persistir via Port
    const saved = await this.productRepo.save(product);

    // Emitir evento
    this.eventEmitter.emit('product.created', {
      productId: saved.id,
      tenantId,
      name: saved.name,
    });

    return ProductMapper.toOutput(saved);
  }

  async findAll(tenantId: string, query: PaginationQueryDto): Promise<PaginatedResponseDto<ProductOutput>> {
    const [products, total] = await Promise.all([
      this.productRepo.findByTenant(tenantId, query),
      this.productRepo.count(tenantId, query),
    ]);

    return PaginatedResponseDto.create(
      products.map(ProductMapper.toOutput),
      total,
      query.page ?? 1,
      query.limit ?? 20,
    );
  }

  async findById(tenantId: string, id: string): Promise<ProductOutput> {
    const product = await this.productRepo.findById(id);
    if (!product || product.tenantId !== tenantId) {
      throw new NotFoundException(`Produto ${id} não encontrado`);
    }
    return ProductMapper.toOutput(product);
  }

  async update(tenantId: string, id: string, dto: UpdateProductDto): Promise<ProductOutput> {
    const product = await this.productRepo.findById(id);
    if (!product || product.tenantId !== tenantId) {
      throw new NotFoundException(`Produto ${id} não encontrado`);
    }

    // Aplicar mudanças via domain entity
    if (dto.name) product.updateName(dto.name);
    if (dto.basePrice !== undefined) product.updatePrice(dto.basePrice);
    if (dto.stock !== undefined) product.updateStock(dto.stock);
    if (dto.status === 'ATIVO') product.activate();
    if (dto.status === 'INATIVO') product.deactivate();

    const updated = await this.productRepo.update(product);

    // Verificar alerta de estoque
    if (updated.isLowStock()) {
      this.eventEmitter.emit('stock.low', {
        productId: updated.id,
        tenantId,
        productName: updated.name,
        currentStock: updated.stock,
      });
    }

    return ProductMapper.toOutput(updated);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const product = await this.productRepo.findById(id);
    if (!product || product.tenantId !== tenantId) {
      throw new NotFoundException(`Produto ${id} não encontrado`);
    }
    await this.productRepo.delete(id);
  }
}
```

### Passo 7: Criar Controller (Primary Adapter)

```typescript
// infrastructure/adapters/primary/product.controller.ts
import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ProductService } from '../../../application/services/product.service';
import { CreateProductDto } from '../../../application/dto/create-product.dto';
import { UpdateProductDto } from '../../../application/dto/update-product.dto';
import { CurrentTenant } from '../../../../../common/decorators/current-tenant.decorator';
import { Roles } from '../../../../../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../../../../../common/types/pagination.type';

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
    await this.productService.remove(tenantId, id);
  }
}
```

### Passo 8: Criar Repository Adapter (Secondary Adapter)

```typescript
// infrastructure/adapters/secondary/persistence/drizzle-product.repository.ts
import { Inject, Injectable } from '@nestjs/common';
import { eq, and, like, desc, asc, sql } from 'drizzle-orm';
import { DRIZZLE } from '../../../../../common/database/drizzle.provider';
import { products } from '../../../../../common/database/schema';
import { ProductRepositoryPort, FindProductsOptions } from '../../../domain/ports/output/product.repository.port';
import { Product } from '../../../domain/entities/product.entity';
import { ProductMapper } from '../../../application/mappers/product.mapper';

@Injectable()
export class DrizzleProductRepository implements ProductRepositoryPort {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDatabase) {}

  async save(product: Product): Promise<Product> {
    const [row] = await this.db
      .insert(products)
      .values({
        id: product.id,
        tenantId: product.tenantId,
        name: product.name,
        sku: product.sku,
        basePrice: product.basePrice.amount.toString(),
        status: product.status,
        stock: product.stock,
        minStock: product.minStock,
        trackInventory: product.trackInventory,
      })
      .returning();

    return ProductMapper.toDomain(row);
  }

  async findById(id: string): Promise<Product | null> {
    const [row] = await this.db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    return row ? ProductMapper.toDomain(row) : null;
  }

  async findByTenant(tenantId: string, options?: FindProductsOptions): Promise<Product[]> {
    let query = this.db
      .select()
      .from(products)
      .where(eq(products.tenantId, tenantId));

    if (options?.search) {
      query = query.where(
        and(
          eq(products.tenantId, tenantId),
          like(products.name, `%${options.search}%`),
        ),
      );
    }

    if (options?.status) {
      query = query.where(
        and(eq(products.tenantId, tenantId), eq(products.status, options.status)),
      );
    }

    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    query = query.limit(limit).offset((page - 1) * limit);

    if (options?.sortBy) {
      const orderFn = options.sortOrder === 'asc' ? asc : desc;
      query = query.orderBy(orderFn(products[options.sortBy]));
    } else {
      query = query.orderBy(desc(products.createdAt));
    }

    const rows = await query;
    return rows.map(ProductMapper.toDomain);
  }

  async findBySkuAndTenant(sku: string, tenantId: string): Promise<Product | null> {
    const [row] = await this.db
      .select()
      .from(products)
      .where(and(eq(products.sku, sku), eq(products.tenantId, tenantId)))
      .limit(1);

    return row ? ProductMapper.toDomain(row) : null;
  }

  async count(tenantId: string, options?: FindProductsOptions): Promise<number> {
    const [result] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(eq(products.tenantId, tenantId));

    return Number(result.count);
  }

  async update(product: Product): Promise<Product> {
    const [row] = await this.db
      .update(products)
      .set({
        name: product.name,
        sku: product.sku,
        basePrice: product.basePrice.amount.toString(),
        status: product.status,
        stock: product.stock,
        updatedAt: new Date(),
      })
      .where(eq(products.id, product.id))
      .returning();

    return ProductMapper.toDomain(row);
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(products).where(eq(products.id, id));
  }
}
```

### Passo 9: Criar Module (binding)

```typescript
// product.module.ts
import { Module } from '@nestjs/common';
import { ProductController } from './infrastructure/adapters/primary/product.controller';
import { ProductService } from './application/services/product.service';
import { DrizzleProductRepository } from './infrastructure/adapters/secondary/persistence/drizzle-product.repository';

@Module({
  controllers: [ProductController],
  providers: [
    ProductService,
    {
      provide: 'ProductRepositoryPort',
      useClass: DrizzleProductRepository,
    },
  ],
  exports: [ProductService],
})
export class ProductModule {}
```

### Passo 10: Registrar no AppModule

```typescript
// app.module.ts
@Module({
  imports: [
    // ...
    ProductModule,
  ],
})
export class AppModule {}
```

---

## 3. Checklist — Após Criar Módulo

- [ ] Entity no `domain/entities/` sem imports externos
- [ ] Port (interface) no `domain/ports/output/`
- [ ] Application Service injeta Port via `@Inject('PortName')`
- [ ] DTOs com `class-validator`
- [ ] Mapper converte Entity ↔ DTO
- [ ] Controller magro (valida, delega, retorna)
- [ ] Repository implementa Port interface
- [ ] Module faz binding `{ provide: 'Port', useClass: Adapter }`
- [ ] Module registrado no `AppModule`
- [ ] Schema Drizzle criado no `common/database/schema/`
- [ ] Índice em `tenant_id` no schema
- [ ] Testes unitários para Entity e Service
- [ ] Testes de integração para Controller
- [ ] Migration gerada e revisada

---

## 4. Padrão para Módulos Simples vs Complexos

### Módulo Simples (ex: ProductCategory)
- Pode omitir `value-objects/`, `events/`, `services/` no domain
- Pode omitir `jobs/` no application
- Pode omitir `config/` no infrastructure

### Módulo Complexo (ex: Billing)
- Múltiplos services: `SubscriptionService`, `InvoiceService`, `PaymentService`
- Múltiplos controllers: `SubscriptionController`, `InvoiceController`, `WebhookController`
- Múltiplos repos: `DrizzleSubscriptionRepository`, `DrizzleInvoiceRepository`
- Múltiplos ports: `InvoiceRepositoryPort`, `PaymentGatewayPort`, `PdfGeneratorPort`
- Domain Events: `InvoiceCreatedEvent`, `PaymentConfirmedEvent`
- Jobs: `GenerateMonthlyInvoicesJob`, `CheckOverdueInvoicesJob`

---

## 5. Regra de Comunicação entre Módulos

```typescript
// ✅ CORRETO — Importar módulo e usar Service exportado
@Module({
  imports: [CollaboratorModule],  // Importa o módulo
})
export class ServiceModule {}

// No ServiceService:
constructor(
  private readonly collaboratorService: CollaboratorService,  // Usa service exportado
) {}

// ❌ PROIBIDO — Importar repository de outro módulo
import { DrizzleCollaboratorRepository } from '../collaborator/infrastructure/...';  // ❌
```

---

> **Skill File v1.0** — Desenvolvimento de Módulos  
> **Regra:** Todo novo módulo criado DEVE seguir este template completo, sem atalhos.
