# 09. API Design & BFF

> **Padrão:** REST (JSON)  
> **Versionamento:** URI (`/api/v1/...`)  
> **BFF:** Lightweight — dentro do NestJS, rotas específicas por consumer  
> **Response format:** `{ success, message?, data, meta? }`

---

## 1. Formato de Response Padrão

### 1.1 Sucesso — Item Único

```json
{
  "success": true,
  "message": "Produto criado com sucesso",
  "data": {
    "id": "uuid",
    "name": "Camiseta Básica",
    "sku": "CAM-001",
    "basePrice": 49.90,
    "status": "ATIVO"
  }
}
```

### 1.2 Sucesso — Lista Paginada

```json
{
  "success": true,
  "data": [
    { "id": "uuid", "name": "Camiseta Básica" },
    { "id": "uuid", "name": "Calça Jeans" }
  ],
  "meta": {
    "total": 42,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

### 1.3 Erro

```json
{
  "success": false,
  "message": "Produto não encontrado",
  "error": {
    "code": "NOT_FOUND",
    "statusCode": 404
  }
}
```

### 1.4 Erro de Validação

```json
{
  "success": false,
  "message": "Erro de validação",
  "error": {
    "code": "VALIDATION_ERROR",
    "statusCode": 400,
    "details": [
      { "field": "name", "message": "Nome é obrigatório" },
      { "field": "basePrice", "message": "Preço base deve ser positivo" }
    ]
  }
}
```

---

## 2. Response Wrapper (Interceptor)

```typescript
// src/common/interceptors/response-wrapper.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, map } from 'rxjs';

interface WrappedResponse {
  success: boolean;
  message?: string;
  data?: any;
  meta?: any;
}

@Injectable()
export class ResponseWrapperInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<WrappedResponse> {
    return next.handle().pipe(
      map((response) => {
        // Se já está no formato correto, retornar como está
        if (response?.success !== undefined) {
          return response;
        }

        // Wrap automático
        return {
          success: true,
          data: response,
        };
      }),
    );
  }
}
```

---

## 3. Estratégia BFF

### 3.1 Diagrama de Rotas

```
┌─────────────────────────────────────────────────────────┐
│                     BFF ROUTES                           │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  UNIFIED (Web + Mobile)                                  │
│  /api/v1/auth/*                                         │
│  /api/v1/products/*                                     │
│  /api/v1/services/*                                     │
│  /api/v1/collaborators/*                                │
│  /api/v1/billing/*                                      │
│  /api/v1/notifications/*                                │
│  /api/v1/settings/*                                     │
│  /api/v1/dashboard                                      │
│                                                          │
│  MOBILE-SPECIFIC                                         │
│  /api/v1/mobile/dashboard     ← dados simplificados     │
│  /api/v1/mobile/sync          ← delta sync para offline │
│  /api/v1/mobile/notifications ← formato push            │
│                                                          │
│  MFE-SPECIFIC                                            │
│  /api/v1/mfe/:toolId/config   ← config da ferramenta    │
│  /api/v1/mfe/:toolId/data     ← dados específicos       │
│                                                          │
│  WEBHOOKS (Public)                                       │
│  /api/v1/webhooks/asaas                                  │
│                                                          │
│  ADMIN (Internal)                                        │
│  /api/v1/admin/tenants                                   │
│  /api/v1/admin/tools                                     │
│  /api/v1/admin/plans                                     │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 3.2 ClientType Middleware

```typescript
// src/common/middleware/client-type.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

export type ClientType = 'web' | 'mobile' | 'mfe';

@Injectable()
export class ClientTypeMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    const header = req.headers['x-client-type'] as string;

    // Detectar por header ou por rota
    if (header) {
      req['clientType'] = header as ClientType;
    } else if (req.path.includes('/mobile/')) {
      req['clientType'] = 'mobile';
    } else if (req.path.includes('/mfe/')) {
      req['clientType'] = 'mfe';
    } else {
      req['clientType'] = 'web';
    }

    next();
  }
}
```

### 3.3 Mobile Dashboard (Response Simplificada)

```typescript
// src/modules/dashboard/infrastructure/controllers/mobile-dashboard.controller.ts
import { Controller, Get } from '@nestjs/common';
import { DashboardService } from '../../application/services/dashboard.service';
import { TenantId } from '../../../auth/infrastructure/decorators/tenant-id.decorator';
import { CurrentUser } from '../../../auth/infrastructure/decorators/current-user.decorator';

@Controller('api/v1/mobile/dashboard')
export class MobileDashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  async getMobileDashboard(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
  ) {
    const data = await this.dashboardService.getSummary(tenantId);

    // Retornar dados simplificados para mobile
    return {
      success: true,
      data: {
        userName: user.name,
        activeSubscriptions: data.activeSubscriptions,
        pendingInvoices: data.pendingInvoices,
        unreadNotifications: data.unreadNotifications,
        // Sem gráficos pesados — mobile carrega sob demanda
      },
    };
  }
}
```

---

## 4. Mapa de Endpoints Completo

### 4.1 Auth

| Método | Rota | Auth | Role | Descrição |
|--------|------|------|------|-----------|
| POST | `/api/v1/auth/signup` | ❌ | — | Criar conta (Tenant + User admin) |
| POST | `/api/v1/auth/login` | ❌ | — | Login (retorna accessToken) |
| POST | `/api/v1/auth/refresh` | ❌ | — | Renovar tokens (cookie) |
| POST | `/api/v1/auth/logout` | ✅ | — | Logout (revogar refresh) |
| POST | `/api/v1/auth/reset-password` | ✅ | — | Redefinir senha |
| GET | `/api/v1/auth/me` | ✅ | — | Dados do usuário logado |

### 4.2 Products

| Método | Rota | Auth | Role | Descrição |
|--------|------|------|------|-----------|
| GET | `/api/v1/products` | ✅ | — | Listar produtos (paginado) |
| GET | `/api/v1/products/:id` | ✅ | — | Detalhe do produto |
| POST | `/api/v1/products` | ✅ | admin | Criar produto |
| PATCH | `/api/v1/products/:id` | ✅ | admin | Atualizar produto |
| DELETE | `/api/v1/products/:id` | ✅ | admin | Deletar produto |
| GET | `/api/v1/products/:id/variations` | ✅ | — | Listar variações |
| POST | `/api/v1/products/:id/variations` | ✅ | admin | Criar variação |
| DELETE | `/api/v1/products/:id/variations/:varId` | ✅ | admin | Deletar variação |

### 4.3 Services

| Método | Rota | Auth | Role | Descrição |
|--------|------|------|------|-----------|
| GET | `/api/v1/services` | ✅ | — | Listar serviços |
| GET | `/api/v1/services/:id` | ✅ | — | Detalhe do serviço |
| POST | `/api/v1/services` | ✅ | admin | Criar serviço |
| PATCH | `/api/v1/services/:id` | ✅ | admin | Atualizar serviço |
| DELETE | `/api/v1/services/:id` | ✅ | admin | Deletar serviço |

### 4.4 Collaborators

| Método | Rota | Auth | Role | Descrição |
|--------|------|------|------|-----------|
| GET | `/api/v1/collaborators` | ✅ | admin | Listar colaboradores |
| GET | `/api/v1/collaborators/:id` | ✅ | admin | Detalhe do colaborador |
| POST | `/api/v1/collaborators` | ✅ | admin | Criar colaborador (+ User) |
| PATCH | `/api/v1/collaborators/:id` | ✅ | admin | Atualizar colaborador |
| DELETE | `/api/v1/collaborators/:id` | ✅ | admin | Deletar colaborador |
| PATCH | `/api/v1/collaborators/:id/permissions` | ✅ | admin | Atualizar permissões |

### 4.5 Marketplace

| Método | Rota | Auth | Role | Descrição |
|--------|------|------|------|-----------|
| GET | `/api/v1/marketplace/tools` | ✅ | — | Listar ferramentas disponíveis |
| GET | `/api/v1/marketplace/tools/:id` | ✅ | — | Detalhe da ferramenta + planos |
| POST | `/api/v1/marketplace/subscribe` | ✅ | admin | Assinar plano |
| GET | `/api/v1/marketplace/subscriptions` | ✅ | — | Ferramentas assinadas |

### 4.6 Billing

| Método | Rota | Auth | Role | Descrição |
|--------|------|------|------|-----------|
| GET | `/api/v1/billing/invoices` | ✅ | — | Listar faturas |
| GET | `/api/v1/billing/invoices/:id` | ✅ | — | Detalhe da fatura |
| POST | `/api/v1/billing/invoices/:id/pay` | ✅ | admin | Pagar fatura |
| GET | `/api/v1/billing/subscriptions` | ✅ | — | Listar assinaturas |
| POST | `/api/v1/billing/subscriptions/:id/cancel` | ✅ | admin | Cancelar assinatura |
| GET | `/api/v1/billing/info` | ✅ | admin | Dados de cobrança |
| PUT | `/api/v1/billing/info` | ✅ | admin | Atualizar dados de cobrança |

### 4.7 Notifications

| Método | Rota | Auth | Role | Descrição |
|--------|------|------|------|-----------|
| GET | `/api/v1/notifications` | ✅ | — | Listar notificações |
| PATCH | `/api/v1/notifications/:id/read` | ✅ | — | Marcar como lida |
| POST | `/api/v1/notifications/read-all` | ✅ | — | Marcar todas como lidas |
| GET | `/api/v1/notifications/unread-count` | ✅ | — | Contagem de não lidas |

### 4.8 Settings

| Método | Rota | Auth | Role | Descrição |
|--------|------|------|------|-----------|
| GET | `/api/v1/settings` | ✅ | — | Obter configurações do usuário |
| PUT | `/api/v1/settings` | ✅ | — | Atualizar configurações |
| GET | `/api/v1/settings/integrations` | ✅ | admin | Integrações disponíveis |
| POST | `/api/v1/settings/integrations/:id` | ✅ | admin | Ativar integração |

### 4.9 Dashboard

| Método | Rota | Auth | Role | Descrição |
|--------|------|------|------|-----------|
| GET | `/api/v1/dashboard` | ✅ | — | Dashboard web (completo) |
| GET | `/api/v1/mobile/dashboard` | ✅ | — | Dashboard mobile (resumido) |

### 4.10 Webhooks

| Método | Rota | Auth | Role | Descrição |
|--------|------|------|------|-----------|
| POST | `/api/v1/webhooks/asaas` | ❌ (token) | — | Webhook Asaas |

---

## 5. Convenções REST

### 5.1 Verbos HTTP

| Verbo | Uso | Response Code |
|-------|-----|---------------|
| GET | Buscar recurso(s) | 200 |
| POST | Criar recurso | 201 |
| PATCH | Atualização parcial | 200 |
| PUT | Substituição completa | 200 |
| DELETE | Remover recurso | 200 (com body) ou 204 |

### 5.2 Query Parameters — Paginação

```
GET /api/v1/products?page=1&limit=20&sort=name&order=asc&search=camiseta&status=ATIVO
```

| Param | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| page | number | 1 | Página atual |
| limit | number | 20 | Itens por página (max: 100) |
| sort | string | createdAt | Campo para ordenar |
| order | 'asc'\|'desc' | desc | Direção |
| search | string | — | Busca textual |
| status | string | — | Filtro por status |

### 5.3 Padrão de Paginação no Código

```typescript
// src/common/dtos/pagination-query.dto.ts
import { IsOptional, IsInt, Min, Max, IsString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  sort?: string = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @IsString()
  search?: string;
}
```

```typescript
// src/common/dtos/paginated-response.dto.ts
export class PaginatedResponseDto<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };

  static create<T>(data: T[], total: number, page: number, limit: number): PaginatedResponseDto<T> {
    const dto = new PaginatedResponseDto<T>();
    dto.data = data;
    dto.meta = {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
    return dto;
  }
}
```

---

## 6. CORS — Multi-Origin

```typescript
// src/main.ts
app.enableCors({
  origin: [
    'https://gerenciax.com.br',
    'https://www.gerenciax.com.br',
    'https://app.gerenciax.com.br',
    ...(process.env.NODE_ENV !== 'production'
      ? ['http://localhost:4200', 'http://localhost:8100']
      : []),
  ],
  credentials: true, // Para cookies HttpOnly
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Client-Type', 'X-Device-Type'],
});
```

---

## 7. Regras de API

| # | Nível | Regra |
|---|-------|-------|
| API-001 | 🚫 CRITICAL | Toda response segue o formato `{ success, data, message?, meta?, error? }` |
| API-002 | ⚠️ REQUIRED | Erros de validação retornam array de `details` com campo e mensagem |
| API-003 | ⚠️ REQUIRED | Rotas públicas usam decorator `@Public()` |
| API-004 | ⚠️ REQUIRED | Rotas admin usam decorator `@Roles('admin')` |
| API-005 | ⚠️ REQUIRED | IDs são UUID v4 — validar com `@ParseUUIDPipe` |
| API-006 | ⚠️ REQUIRED | Paginação: max 100 itens, default 20 |
| API-007 | 💡 RECOMMENDED | Busca textual via `?search=` — busca em name, description |
| API-008 | 🚫 CRITICAL | **PROIBIDO** retornar passwordHash, cardToken, ou dados sensíveis |
| API-009 | ⚠️ REQUIRED | Headers obrigatórios para BFF: `X-Client-Type` (web\|mobile\|mfe) |
| API-010 | 🚫 CRITICAL | Webhook endpoints SEMPRE retornam 200 |
| API-011 | ⚠️ REQUIRED | Timestamps em ISO 8601 (UTC) na response |
| API-012 | ⚠️ REQUIRED | Nomes de campo em camelCase na response JSON |

---

> **Skill File v1.0** — API Design & BFF  
> **Regra:** Controller apenas orquestra. Lógica fica no Service. Response no formato padrão.
