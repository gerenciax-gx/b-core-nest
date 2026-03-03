# 13. Guia Completo de Paginação

> **Regra:** Toda listagem DEVE ser paginada — sem exceção.  
> **Controle:** O número de itens por página (`limit`) é enviado pelo **front-end**.  
> **Default:** `page = 1`, `limit = 20`, `sortOrder = 'desc'`  
> **Máximo:** `limit ≤ 100`

---

## 1. Visão Geral da Arquitetura

A paginação segue a **arquitetura hexagonal** do projeto, fluindo por todas as camadas de forma consistente:

```
Controller (Query Params)
  → Service (Lógica + Validação)
    → Repository Port (Interface)
      → Drizzle Adapter (SQL com LIMIT/OFFSET)
        → Response (data[] + meta)
```

### 1.1 Princípios

1. **Front-end controla o `limit`** — O número de itens por página é definido pela UI (mobile pode pedir 10, desktop pode pedir 30)
2. **Backend valida o range** — `limit` mínimo 1, máximo 100
3. **Default seguro** — Se não enviado, `page = 1` e `limit = 20`
4. **Resposta padronizada** — Sempre `{ success, data[], meta }` com metadados de paginação
5. **Tenant isolation** — Toda query paginada DEVE filtrar por `tenant_id`
6. **Contagem total separada** — `COUNT(*)` para calcular `totalPages`

---

## 2. Tipos Base — `src/common/types/api-response.type.ts`

```typescript
export interface PaginationQuery {
  page?: number;        // Página atual (default: 1)
  limit?: number;       // Itens por página — VINDO DO FRONT-END (default: 20, max: 100)
  search?: string;      // Busca textual (opcional)
  sortBy?: string;      // Campo de ordenação (opcional)
  sortOrder?: 'asc' | 'desc'; // Direção (default: 'desc')
}

export interface PaginationMeta {
  total: number;        // Total de registros
  page: number;         // Página atual
  limit: number;        // Itens por página
  totalPages: number;   // Total de páginas
  hasNext: boolean;     // Tem próxima página?
  hasPrevious: boolean; // Tem página anterior?
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: PaginationMeta;
}
```

---

## 3. DTO de Paginação — Camada de Validação

### 3.1 PaginationQueryDto (Reutilizável)

```typescript
// src/common/dto/pagination-query.dto.ts

import { IsOptional, IsNumber, Min, Max, IsString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Número da página', default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Itens por página (controlado pelo front-end)',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Termo de busca' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Campo para ordenação' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Direção da ordenação', enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
```

### 3.2 DTOs Específicos por Módulo

Cada módulo pode estender `PaginationQueryDto` com filtros específicos:

```typescript
// src/modules/product/application/dto/list-products-query.dto.ts

import { IsOptional, IsIn, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto.js';

export class ListProductsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filtrar por status', enum: ['active', 'inactive', 'draft'] })
  @IsOptional()
  @IsIn(['active', 'inactive', 'draft'])
  status?: string;

  @ApiPropertyOptional({ description: 'Filtrar por categoria' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
```

```typescript
// src/modules/service/application/dto/list-services-query.dto.ts

export class ListServicesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filtrar por status', enum: ['active', 'inactive', 'paused'] })
  @IsOptional()
  @IsIn(['active', 'inactive', 'paused'])
  status?: string;

  @ApiPropertyOptional({ description: 'Filtrar por categoria' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
```

---

## 4. Helper de Resposta Paginada

```typescript
// src/common/helpers/paginated-response.helper.ts

import type { PaginationMeta, PaginatedResponse } from '../types/api-response.type.js';

export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / limit);
  return {
    success: true,
    data,
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    },
  };
}
```

---

## 5. Padrão por Camada (Hexagonal)

### 5.1 Repository Port (Interface do Domínio)

```typescript
// domain/ports/output/product.repository.port.ts

import type { PaginationQuery } from '../../../../common/types/api-response.type.js';

export interface ProductRepositoryPort {
  save(product: Product): Promise<void>;
  findById(id: string, tenantId: string): Promise<Product | null>;
  
  // ✅ PAGINADO — recebe PaginationQuery, retorna [data[], total]
  findAllByTenant(
    tenantId: string,
    pagination: PaginationQuery,
    filters?: { status?: string; categoryId?: string; search?: string },
  ): Promise<[Product[], number]>;

  delete(id: string, tenantId: string): Promise<void>;
}
```

> **Convenção:** `findAllByTenant` retorna uma **tupla `[data[], total]`** para que o service construa a resposta paginada.

### 5.2 Drizzle Repository Adapter (Infraestrutura)

```typescript
// infrastructure/adapters/secondary/persistence/drizzle-product.repository.ts

import { eq, and, ilike, sql, asc, desc, type SQL } from 'drizzle-orm';

async findAllByTenant(
  tenantId: string,
  pagination: PaginationQuery,
  filters?: { status?: string; categoryId?: string; search?: string },
): Promise<[Product[], number]> {
  const { page = 1, limit = 20, sortBy, sortOrder = 'desc' } = pagination;
  const offset = (page - 1) * limit;

  // Construir condições WHERE
  const conditions: SQL[] = [eq(products.tenantId, tenantId)];

  if (filters?.status) {
    conditions.push(eq(products.status, filters.status));
  }
  if (filters?.categoryId) {
    conditions.push(eq(products.categoryId, filters.categoryId));
  }
  if (filters?.search) {
    conditions.push(ilike(products.name, `%${filters.search}%`));
  }

  const whereClause = and(...conditions);

  // Query de contagem total (para calcular totalPages)
  const [countResult] = await this.db
    .select({ count: sql<number>`count(*)::int` })
    .from(products)
    .where(whereClause);

  const total = countResult?.count ?? 0;

  // Query de dados com LIMIT + OFFSET
  const sortColumn = this.getSortColumn(sortBy);
  const orderFn = sortOrder === 'asc' ? asc : desc;

  const rows = await this.db
    .select()
    .from(products)
    .where(whereClause)
    .orderBy(orderFn(sortColumn))
    .limit(limit)
    .offset(offset);

  const data = rows.map((row) => this.toDomain(row));

  return [data, total];
}

private getSortColumn(sortBy?: string) {
  const sortMap: Record<string, any> = {
    name: products.name,
    basePrice: products.basePrice,
    stock: products.stock,
    status: products.status,
    createdAt: products.createdAt,
  };
  return sortMap[sortBy ?? 'createdAt'] ?? products.createdAt;
}
```

### 5.3 Application Service

```typescript
// application/services/product.service.ts

import { createPaginatedResponse } from '../../../../common/helpers/paginated-response.helper.js';
import type { PaginatedResponse } from '../../../../common/types/api-response.type.js';

async findAll(
  tenantId: string,
  query: ListProductsQueryDto,
): Promise<PaginatedResponse<ProductListItemDto>> {
  const { page = 1, limit = 20 } = query;

  const [products, total] = await this.productRepo.findAllByTenant(
    tenantId,
    { page, limit, sortBy: query.sortBy, sortOrder: query.sortOrder },
    { status: query.status, categoryId: query.categoryId, search: query.search },
  );

  const data = products.map((p) => this.toListItem(p));

  return createPaginatedResponse(data, total, page, limit);
}
```

### 5.4 Controller

```typescript
// infrastructure/adapters/primary/product.controller.ts

@Get()
@ApiOperation({ summary: 'Listar produtos do tenant (paginado)' })
@ApiQuery({ type: ListProductsQueryDto })
@ApiOkResponse({ description: 'Lista paginada de produtos' })
async findAll(
  @CurrentTenant() tenantId: string,
  @Query() query: ListProductsQueryDto,
): Promise<PaginatedResponse<ProductListItemDto>> {
  return this.productService.findAll(tenantId, query);
}
```

---

## 6. Formato de Resposta — Contrato com o Front-end

### 6.1 Request — Query Parameters

```
GET /api/v1/products?page=2&limit=15&search=camiseta&status=active&sortBy=name&sortOrder=asc
```

| Parâmetro   | Tipo    | Default | Descrição                             |
|-------------|---------|---------|---------------------------------------|
| `page`      | number  | 1       | Página solicitada                     |
| `limit`     | number  | 20      | **Itens por página (enviado pelo front-end)** |
| `search`    | string  | —       | Termo de busca textual                |
| `sortBy`    | string  | —       | Campo de ordenação                    |
| `sortOrder` | string  | desc    | Direção: `asc` ou `desc`             |
| `status`    | string  | —       | Filtro por status (específico do módulo) |

### 6.2 Response — Lista Paginada

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Camiseta Básica",
      "sku": "CAM-001",
      "basePrice": 49.90,
      "stock": 120,
      "status": "active",
      "categoryName": "Vestuário",
      "mainPhotoUrl": "https://...",
      "createdAt": "2025-01-15T10:30:00.000Z"
    }
  ],
  "meta": {
    "total": 42,
    "page": 2,
    "limit": 15,
    "totalPages": 3,
    "hasNext": true,
    "hasPrevious": true
  }
}
```

### 6.3 Response — Lista Vazia

```json
{
  "success": true,
  "data": [],
  "meta": {
    "total": 0,
    "page": 1,
    "limit": 20,
    "totalPages": 0,
    "hasNext": false,
    "hasPrevious": false
  }
}
```

---

## 7. Entidades que DEVEM ser Paginadas

| Entidade / Recurso             | Endpoint                                    | Filtros Específicos                        |
|--------------------------------|---------------------------------------------|--------------------------------------------|
| **Produtos**                   | `GET /api/v1/products`                      | `status`, `categoryId`, `search`           |
| **Serviços**                   | `GET /api/v1/services`                      | `status`, `categoryId`, `search`           |
| **Colaboradores**              | `GET /api/v1/collaborators`                 | `status`, `role`, `search`                 |
| **Ferramentas do Marketplace** | `GET /api/v1/marketplace/tools`             | `category`, `search`, `isFree`             |
| **Ferramentas do Usuário**     | `GET /api/v1/tools`                         | `status`, `category`                       |
| **Faturas**                    | `GET /api/v1/invoices`                      | `status`, `dateFrom`, `dateTo`             |
| **Notificações**               | `GET /api/v1/notifications`                 | `type`, `status` (read/unread)             |
| **Categorias**                 | `GET /api/v1/categories`                    | `type` (product/service)                   |
| **Clientes**                   | `GET /api/v1/customers`                     | `search`, `status`                         |
| **Agendamentos**               | `GET /api/v1/appointments`                  | `status`, `dateFrom`, `dateTo`, `staffId`  |
| **Transações Financeiras**     | `GET /api/v1/transactions`                  | `type`, `dateFrom`, `dateTo`               |
| **Logs / Auditoria**           | `GET /api/v1/audit-logs`                    | `action`, `userId`, `dateFrom`, `dateTo`   |

> **Exceções** (NÃO paginados — retornam lista completa):
> - `GET /api/v1/settings/*` — Configurações do tenant (poucos registros)
> - `GET /api/v1/dashboard/*` — Dados agregados (não lista)
> - Dropdowns (ex: listar categorias para um select — usar `?all=true` caso necessário)

---

## 8. Front-end — Consumo de Paginação

### 8.1 O Front-end Controla o `limit`

O número de itens por página é **determinado pela UI**:

| Contexto                  | `limit` sugerido |
|---------------------------|------------------|
| Mobile (lista vertical)   | 10–15            |
| Tablet                    | 15–20            |
| Desktop (tabela)          | 20–30            |
| Infinite scroll (mobile)  | 10               |
| Exportação / Relatório    | 100 (máximo)     |

### 8.2 Interface TypeScript (Front-end)

```typescript
// Tipo compartilhado para consumir endpoints paginados
interface PaginationParams {
  page: number;
  limit: number;       // Front-end define baseado no layout
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  [key: string]: any;  // Filtros específicos do módulo
}

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

interface PaginatedResult<T> {
  success: boolean;
  data: T[];
  meta: PaginationMeta;
}
```

### 8.3 Service Angular (Exemplo)

```typescript
// Angular Signal-based service
@Injectable({ providedIn: 'root' })
export class ProductApiService {
  private http = inject(HttpClient);

  getProducts(params: PaginationParams & { status?: string; categoryId?: string }) {
    return this.http.get<PaginatedResult<ProductListItem>>('/api/v1/products', {
      params: this.buildParams(params),
    });
  }

  private buildParams(params: Record<string, any>): HttpParams {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    });
    return httpParams;
  }
}
```

### 8.4 Infinite Scroll (Ionic)

```typescript
// Component com Infinite Scroll
export class ProductListComponent {
  products = signal<ProductListItem[]>([]);
  meta = signal<PaginationMeta | null>(null);
  currentPage = signal(1);
  readonly ITEMS_PER_PAGE = 10; // Front-end controla

  loadMore(event: InfiniteScrollCustomEvent) {
    if (!this.meta()?.hasNext) {
      event.target.complete();
      event.target.disabled = true;
      return;
    }

    this.currentPage.update((p) => p + 1);
    this.productApi.getProducts({
      page: this.currentPage(),
      limit: this.ITEMS_PER_PAGE,
    }).subscribe((res) => {
      this.products.update((prev) => [...prev, ...res.data]);
      this.meta.set(res.meta);
      event.target.complete();
    });
  }
}
```

---

## 9. Padrões de Search (Busca Textual)

### 9.1 Busca Simples com `ILIKE`

```typescript
// Para poucos campos — busca no nome
if (filters?.search) {
  conditions.push(ilike(products.name, `%${filters.search}%`));
}
```

### 9.2 Busca em Múltiplos Campos

```typescript
// Para busca em nome + SKU + descrição
if (filters?.search) {
  conditions.push(
    sql`(
      ${products.name} ILIKE ${`%${filters.search}%`}
      OR ${products.sku} ILIKE ${`%${filters.search}%`}
      OR ${products.description} ILIKE ${`%${filters.search}%`}
    )`,
  );
}
```

### 9.3 Debounce no Front-end

```typescript
// Sempre fazer debounce na busca para evitar requisições excessivas
searchTerm = signal('');

searchChanged = toObservable(this.searchTerm).pipe(
  debounceTime(400),
  distinctUntilChanged(),
  switchMap((term) =>
    this.productApi.getProducts({ page: 1, limit: this.ITEMS_PER_PAGE, search: term }),
  ),
);
```

---

## 10. Sorting (Ordenação)

### 10.1 Campos Permitidos por Módulo

| Módulo        | Campos de Ordenação                          | Default           |
|---------------|----------------------------------------------|--------------------|
| Produtos      | `name`, `basePrice`, `stock`, `createdAt`    | `createdAt desc`   |
| Serviços      | `name`, `price`, `duration`, `createdAt`     | `createdAt desc`   |
| Colaboradores | `name`, `email`, `role`, `createdAt`         | `name asc`         |
| Faturas       | `issueDate`, `dueDate`, `total`, `status`    | `issueDate desc`   |
| Notificações  | `createdAt`, `type`                          | `createdAt desc`   |

### 10.2 Proteção contra SQL Injection

Nunca interpolar o `sortBy` direto no SQL. Usar **whitelist com mapeamento**:

```typescript
// ✅ CORRETO — Whitelist de colunas
private getSortColumn(sortBy?: string) {
  const sortMap: Record<string, any> = {
    name: products.name,
    basePrice: products.basePrice,
    stock: products.stock,
    status: products.status,
    createdAt: products.createdAt,
  };
  return sortMap[sortBy ?? 'createdAt'] ?? products.createdAt;
}

// ❌ ERRADO — Nunca fazer isso
// .orderBy(sql`${sortBy}`) // SQL Injection!
```

---

## 11. Performance e Boas Práticas

### 11.1 Índices no Banco

```sql
-- Índice composto para queries paginadas por tenant
CREATE INDEX idx_products_tenant_status ON products(tenant_id, status);
CREATE INDEX idx_products_tenant_created ON products(tenant_id, created_at DESC);
CREATE INDEX idx_products_tenant_name ON products(tenant_id, name);

-- Para busca textual
CREATE INDEX idx_products_name_gin ON products USING gin(name gin_trgm_ops);
```

### 11.2 Regras de Performance

1. **Sempre usar `LIMIT` + `OFFSET`** — Nunca buscar todos os registros
2. **COUNT separado** — A contagem total é uma query separada para não impactar a query principal
3. **Índice no `tenant_id`** — Toda tabela multi-tenant DEVE ter índice no `tenant_id`
4. **Limite máximo de 100** — Protege contra requests abusivos
5. **Cache de contagem** — Para tabelas muito grandes, considerar cache da contagem total
6. **Evitar `OFFSET` alto** — Para datasets muito grandes (>100k), considerar cursor-based pagination no futuro

### 11.3 Cursor-based Pagination (Futuro)

Para quando `OFFSET` se tornar lento em tabelas com milhões de registros:

```typescript
// Futuro — não implementar agora, mas ter consciência
interface CursorPaginationQuery {
  cursor?: string;  // ID do último item
  limit?: number;
  direction?: 'forward' | 'backward';
}

// WHERE id > :cursor ORDER BY id ASC LIMIT :limit
```

---

## 12. Checklist de Implementação

Ao criar um novo endpoint paginado, verificar:

- [ ] Controller recebe `@Query() query: ListXxxQueryDto`
- [ ] `ListXxxQueryDto` estende `PaginationQueryDto`
- [ ] Filtros específicos do módulo adicionados ao DTO
- [ ] Service chama repository com pagination e filters
- [ ] Service usa `createPaginatedResponse()` para montar resposta
- [ ] Repository Port define `findAllByTenant(tenantId, pagination, filters): Promise<[T[], number]>`
- [ ] Drizzle Adapter implementa `LIMIT`, `OFFSET`, `COUNT(*)`, `WHERE tenant_id`
- [ ] `sortBy` usa **whitelist** (nunca interpolar direto no SQL)
- [ ] `search` usa `ILIKE` com `%term%`
- [ ] Swagger documenta query params e response format
- [ ] Índices criados para colunas de filtro e ordenação
- [ ] Front-end envia `limit` baseado no layout (mobile vs desktop)

---

## 13. Resumo dos Arquivos Envolvidos

```
src/
├── common/
│   ├── types/
│   │   └── api-response.type.ts          # PaginationQuery, PaginationMeta, PaginatedResponse<T>
│   ├── dto/
│   │   └── pagination-query.dto.ts       # PaginationQueryDto (class-validator)
│   └── helpers/
│       └── paginated-response.helper.ts  # createPaginatedResponse()
│
├── modules/
│   └── [module]/
│       ├── application/
│       │   ├── dto/
│       │   │   └── list-xxx-query.dto.ts # ListXxxQueryDto extends PaginationQueryDto
│       │   └── services/
│       │       └── xxx.service.ts        # findAll(tenantId, query) → PaginatedResponse<T>
│       ├── domain/
│       │   └── ports/
│       │       └── output/
│       │           └── xxx.repository.port.ts  # findAllByTenant(...): Promise<[T[], number]>
│       └── infrastructure/
│           └── adapters/
│               ├── primary/
│               │   └── xxx.controller.ts       # @Query() query: ListXxxQueryDto
│               └── secondary/
│                   └── persistence/
│                       └── drizzle-xxx.repository.ts  # SQL com LIMIT/OFFSET/COUNT
```
