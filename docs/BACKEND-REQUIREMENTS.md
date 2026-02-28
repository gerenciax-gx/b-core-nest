# 📋 GerenciaX — Especificação Completa de Requisitos para o Backend

> **Documento gerado a partir de análise exaustiva do frontend (Shell Angular/Ionic)**  
> **Objetivo:** Servir como fonte da verdade para definição de arquitetura de backend, modelagem de banco de dados, design de APIs e regras de negócio.

---

## 📑 Índice

1. [Visão Geral do Sistema](#1-visão-geral-do-sistema)
2. [Arquitetura Multi-Tenant](#2-arquitetura-multi-tenant)
3. [Módulos e Domínios de Negócio](#3-módulos-e-domínios-de-negócio)
4. [Modelagem de Dados (Entidades)](#4-modelagem-de-dados-entidades)
5. [Especificação de Endpoints REST](#5-especificação-de-endpoints-rest)
6. [Autenticação e Autorização](#6-autenticação-e-autorização)
7. [Regras de Negócio por Domínio](#7-regras-de-negócio-por-domínio)
8. [Sistema de Notificações](#8-sistema-de-notificações)
9. [Sistema de Assinaturas e Billing](#9-sistema-de-assinaturas-e-billing)
10. [Integrações Externas](#10-integrações-externas)
11. [Requisitos Não-Funcionais](#11-requisitos-não-funcionais)
12. [Resumo de Decisões para Arquitetura](#12-resumo-de-decisões-para-arquitetura)

---

## 1. Visão Geral do Sistema

### 1.1 O que é o GerenciaX

O **GerenciaX** é um **SaaS B2B modular** voltado para micro e pequenas empresas brasileiras (salões de beleza, comércios, prestadores de serviços). O sistema é composto por:

- **Shell (Core):** Aplicação principal que gerencia autenticação, navegação, layout, assinaturas e configurações.
- **Ferramentas (MFE - Micro-Frontends):** Módulos independentes como Agendamento, Fluxo de Caixa, NF-e, CRM, etc. carregados dinamicamente.

### 1.2 Modelo de Negócio

- Cada empresa (tenant) tem um **plano base gratuito** (acesso ao Shell).
- Ferramentas são **assinadas individualmente** com planos por ferramenta (Básico, Profissional, Enterprise).
- A fatura mensal é a **soma** dos planos de todas as ferramentas contratadas.
- Cada ferramenta tem features escalonadas por plano (limites de uso, integrações, etc.).

### 1.3 Tipos de Empresa Suportados

O sistema suporta três perfis de empresa na criação:
- **`produtos`** — Comércio, loja física ou online
- **`servicos`** — Consultoria, salão, clínica, etc.
- **`ambos`** — Produtos e serviços

Isso impacta quais módulos e ferramentas são exibidos/recomendados.

---

## 2. Arquitetura Multi-Tenant

### 2.1 Modelo de Isolamento

Cada empresa cadastrada no sistema é um **Tenant** independente. O `tenantId` é injetado pelo backend em toda requisição autenticada.

```
User → pertence a → Tenant (Empresa)
Tenant → possui → N Assinaturas de Ferramentas
Tenant → possui → N Colaboradores
Tenant → possui → N Produtos
Tenant → possui → N Serviços
```

### 2.2 Dados Extraídos do Frontend

| Campo | Origem | Tipo |
|-------|--------|------|
| `tenantId` | `User.tenantId` (auth.interface.ts) | `string (UUID)` |
| `companyName` | `SignUpRequest.companyName` | `string` |
| `companyType` | `SignUpRequest.companyType` | `'produtos' \| 'servicos' \| 'ambos'` |

### 2.3 Contexto do Tenant em Cada Requisição

O frontend envia o token JWT. O backend DEVE:
1. Extrair `tenantId` do token JWT (claim `tenantId`).
2. Filtrar **TODOS** os dados por `tenantId` automaticamente (row-level security ou filtro no ORM).
3. Nunca permitir acesso cruzado entre tenants.

### 2.4 Payload JWT Esperado pelo Frontend

```json
{
  "sub": "user-id",
  "email": "user@empresa.com",
  "tenantId": "tenant-uuid",
  "role": "admin | user",
  "iat": 1234567890,
  "exp": 1234654290
}
```

---

## 3. Módulos e Domínios de Negócio

### 3.1 Módulos do Shell (Core)

Estes módulos fazem parte do shell e toda empresa tem acesso:

| Módulo | Descrição | Rota Frontend |
|--------|-----------|---------------|
| **Dashboard** | Painel geral com resumo de assinatura, ferramentas ativas e módulos | `/app/dashboard` |
| **Produtos** | CRUD completo de produtos com variações, estoque e fotos | `/app/products` |
| **Serviços** | CRUD de serviços com variações de preço, profissionais vinculados | `/app/services` |
| **Colaboradores** | CRUD de funcionários com permissões por ferramenta, horários | `/app/collaborators` |
| **Assinatura** | Visualização de plano, ferramentas contratadas, faturas | `/app/subscription` |
| **Marketplace** | Loja de ferramentas para contratar | `/app/marketplace` |
| **Planos de Ferramenta** | Visualização de planos de uma ferramenta específica | `/app/tool-plans/:id` |
| **Ferramentas Ativas** | Lista de ferramentas contratadas com acesso rápido | `/app/tools` |
| **Notificações** | Feed de notificações do sistema | `/app/notifications` |
| **Configurações** | 8 abas: Pessoal, Empresa, Pagamentos, Aparência, Notificações, Segurança, Integrações, Privacidade | `/app/settings` |

### 3.2 Ferramentas (Micro-Frontends) — Marketplace

| ID | Nome | Categoria | Preço Base (mock) |
|----|------|-----------|-------------------|
| `agendamento` | Agendamento | Operacional | R$ 29,90/mês |
| `fluxo-caixa` | Fluxo de Caixa | Financeiro | R$ 39,90/mês |
| `estoque` | Gestão de Estoque | Operacional | R$ 34,90/mês |
| `crm` | CRM Vendas | Vendas | R$ 44,90/mês |
| `rh` | RH Simplificado | RH | R$ 54,90/mês |
| `nfe` | NF-e | Financeiro | R$ 29,90/mês |

**Categorias:** `Financeiro`, `Operacional`, `Vendas`, `RH`

---

## 4. Modelagem de Dados (Entidades)

### 4.1 Entidade: Tenant (Empresa)

```
Tenant
├── id: UUID (PK)
├── tradeName: string                 -- Nome fantasia
├── legalName: string                 -- Razão social
├── cnpj: string (14 dígitos)
├── stateRegistration: string         -- Inscrição estadual
├── municipalRegistration: string     -- Inscrição municipal
├── companyType: enum ['produtos', 'servicos', 'ambos']
├── businessType: string              -- Tipo de negócio
├── businessArea: string              -- Ramo de atuação
├── specificSegment: string           -- Segmento específico
├── foundationYear: string
├── employeeCount: string
├── averageRevenue: string
├── targetAudience: string
├── mainProducts: string
├── mainServices: string
├── goals: string                     -- Metas
├── challenges: string                -- Desafios
├── address: (embedded ou FK)
│   ├── street: string
│   ├── number: string
│   ├── complement: string
│   ├── neighborhood: string
│   ├── zipCode: string (8 dígitos)
│   ├── city: string
│   ├── state: string (UF)
│   └── country: string (default: Brasil)
├── socialLinks: (embedded ou FK)
│   ├── website: string
│   ├── instagram: string
│   ├── facebook: string
│   └── linkedin: string
├── createdAt: datetime
└── updatedAt: datetime
```

### 4.2 Entidade: User (Usuário)

```
User
├── id: UUID (PK)
├── tenantId: UUID (FK → Tenant)
├── name: string
├── fullName: string
├── email: string (unique por tenant)
├── passwordHash: string
├── phone: string
├── cpf: string (11 dígitos)
├── birthDate: date
├── photoUrl: string (URL da foto)
├── role: enum ['admin', 'user']
├── isActive: boolean
├── createdAt: datetime
└── updatedAt: datetime
```

**Regra:** O primeiro usuário cadastrado (`signUp`) é automaticamente `admin` do tenant.

### 4.3 Entidade: Collaborator (Colaborador)

```
Collaborator
├── id: UUID (PK)
├── tenantId: UUID (FK → Tenant)
├── firstName: string
├── lastName: string
├── email: string
├── cpf: string (11 dígitos)
├── phone: string
├── gender: enum ['Masculino', 'Feminino', 'Não-Binário', 'Outro', 'Prefiro não dizer']
├── timezone: string (default: 'America/Sao_Paulo')
├── birthDate: date
├── profileImageUrl: string
├── status: enum ['Ativo', 'Inativo', 'Afastado']
├── role: enum ['Administrador', 'Usuário']
├── allToolsAccess: boolean
├── address: (embedded ou FK)
│   ├── cep: string
│   ├── street: string
│   └── number: string
├── workSchedule: (embedded ou FK)
│   ├── startTime: string (HH:mm)
│   ├── lunchStart: string (HH:mm)
│   ├── lunchEnd: string (HH:mm)
│   ├── endTime: string (HH:mm)
│   └── workDays: string[] (array de ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'])
├── createdAt: datetime
└── updatedAt: datetime
```

### 4.4 Entidade: CollaboratorToolPermission

```
CollaboratorToolPermission
├── id: UUID (PK)
├── collaboratorId: UUID (FK → Collaborator)
├── toolId: string (FK → Tool)
├── hasAccess: boolean
```

**Regra:** Se `allToolsAccess = true` no Collaborator, todas as ferramentas estão acessíveis independente desta tabela.

### 4.5 Entidade: Product (Produto)

```
Product
├── id: UUID (PK)
├── tenantId: UUID (FK → Tenant)
├── name: string
├── sku: string (unique por tenant)
├── description: string
├── categoryId: UUID (FK → ProductCategory, nullable)
├── basePrice: decimal(10,2)         -- Preço de venda
├── costPrice: decimal(10,2)         -- Preço de custo (nullable)
├── profitMargin: decimal(5,2)       -- Margem de lucro % (nullable, computed)
├── stock: integer                    -- Quantidade total em estoque
├── minStock: integer                 -- Estoque mínimo (alerta)
├── maxStock: integer (nullable)      -- Estoque máximo
├── stockAlert: boolean               -- Alertar quando estoque baixo
├── trackInventory: boolean           -- Rastrear inventário
├── barcode: string (nullable)
├── weight: decimal(8,3) (nullable)   -- kg
├── dimensions: (embedded, nullable)
│   ├── length: decimal(8,2)          -- cm
│   ├── width: decimal(8,2)
│   └── height: decimal(8,2)
├── photos: string[] (array de URLs)
├── tags: string[] (nullable)
├── status: enum ['ATIVO', 'INATIVO']
├── isActive: boolean
├── createdAt: datetime
└── updatedAt: datetime
```

### 4.6 Entidade: ProductVariation

```
ProductVariation
├── id: UUID (PK)
├── productId: UUID (FK → Product)
├── name: string                      -- Ex: "Tamanho P - Azul"
├── sku: string (nullable)
├── price: decimal(10,2)
├── stock: integer
├── imageUrl: string (nullable)
├── photos: string[] (array de URLs)
├── attributes: JSON
│   └── [ { type: 'size', value: 'P' }, { type: 'color', value: 'Azul' } ]
├── customFields: JSON
│   └── [ { key: 'Voltagem', value: '110V', type: 'text' } ]
```

### 4.7 Entidade: ProductCustomField

```
ProductCustomField
├── id: UUID (PK)
├── productId: UUID (FK → Product)
├── key: string                       -- Ex: "Voltagem", "Garantia"
├── value: string                     -- Ex: "110V", "12 meses"
├── type: enum ['text', 'number', 'date', 'boolean'] (default: 'text')
```

### 4.8 Entidade: ProductCategory

```
ProductCategory
├── id: UUID (PK)
├── tenantId: UUID (FK → Tenant)
├── name: string
```

### 4.9 Entidade: Service (Serviço)

```
Service
├── id: UUID (PK)
├── tenantId: UUID (FK → Tenant)
├── name: string
├── description: string
├── basePrice: decimal(10,2)
├── durationMinutes: integer
├── category: string (nullable)
├── status: enum ['ATIVO', 'INATIVO', 'PAUSADO']
├── createdAt: datetime
└── updatedAt: datetime
```

### 4.10 Entidade: ServicePriceVariation

```
ServicePriceVariation
├── id: UUID (PK)
├── serviceId: UUID (FK → Service)
├── name: string                     -- Ex: "Corte Simples"
├── durationMinutes: integer         -- Duração média
├── durationMinMinutes: integer      -- Tempo mínimo
├── durationMaxMinutes: integer      -- Tempo máximo
├── price: decimal(10,2)
├── photos: string[] (array de URLs)
```

### 4.11 Entidade: ServiceProfessional (Relação N:N)

```
ServiceProfessional
├── serviceId: UUID (FK → Service)
├── professionalId: UUID (FK → Collaborator)
```

**Regra:** Profissionais são Colaboradores vinculados a um ou mais serviços.

### 4.12 Entidade: ServicePhoto

```
ServicePhoto
├── id: UUID (PK)
├── serviceId: UUID (FK → Service)
├── url: string
├── isMain: boolean (default: false)
├── order: integer
```

### 4.13 Entidade: Tool (Ferramenta do Marketplace)

```
Tool
├── id: string (PK, slug semântico: 'agendamento', 'nfe', etc.)
├── name: string
├── description: string
├── category: enum ['Financeiro', 'Operacional', 'Vendas', 'RH']
├── price: decimal(10,2)              -- Preço base exibido no marketplace
├── icon: string                      -- Nome do Ionicon
├── status: enum ['ATIVO', 'INATIVO', 'EM_CONFIGURACAO']
├── route: string (nullable)          -- Rota do MFE (ex: '/agendamento')
├── isPublished: boolean
├── createdAt: datetime
└── updatedAt: datetime
```

### 4.14 Entidade: ToolPlan (Plano de Ferramenta)

```
ToolPlan
├── id: UUID (PK) ou slug semântico ('nfe-basico', etc.)
├── toolId: string (FK → Tool)
├── type: enum ['Básico', 'Profissional', 'Empresarial']
├── price: decimal(10,2)
├── monthlyLabel: string (default: 'por mês')
├── status: enum ['DISPONIVEL', 'POPULAR']   -- Flags de exibição
├── isActive: boolean
├── displayOrder: integer
```

### 4.15 Entidade: PlanFeature

```
PlanFeature
├── id: UUID (PK)
├── toolPlanId: UUID (FK → ToolPlan)
├── description: string               -- Ex: "Agendamentos ilimitados"
├── isIncluded: boolean
├── displayOrder: integer
```

### 4.16 Entidade: Subscription (Assinatura do Tenant)

```
Subscription
├── id: UUID (PK)
├── tenantId: UUID (FK → Tenant)
├── status: enum ['active', 'pending', 'overdue', 'cancelled']
├── nextDueDate: date
├── totalAmount: decimal(10,2)         -- Recalculado soma de todos os planos ativos
├── createdAt: datetime
└── updatedAt: datetime
```

### 4.17 Entidade: SubscribedTool (Ferramenta Contratada)

```
SubscribedTool
├── id: UUID (PK)
├── subscriptionId: UUID (FK → Subscription)
├── toolId: string (FK → Tool)
├── toolPlanId: UUID (FK → ToolPlan)
├── monthlyPrice: decimal(10,2)
├── subscribedAt: datetime
├── cancelledAt: datetime (nullable)
├── isActive: boolean
```

### 4.18 Entidade: Invoice (Fatura)

```
Invoice
├── id: UUID (PK)
├── subscriptionId: UUID (FK → Subscription)
├── tenantId: UUID (FK → Tenant)
├── month: string                      -- "janeiro de 2026"
├── referenceDate: date                -- Data de referência da fatura
├── dueDate: date
├── amount: decimal(10,2)
├── status: enum ['paid', 'pending', 'overdue']
├── pdfUrl: string (nullable)
├── paidAt: datetime (nullable)
├── paymentMethod: string (nullable)
├── createdAt: datetime
```

### 4.19 Entidade: Notification (Notificação)

```
Notification
├── id: UUID (PK)
├── tenantId: UUID (FK → Tenant)
├── userId: UUID (FK → User, nullable)  -- Se null, é para todo o tenant
├── type: enum ['sale', 'appointment', 'stock', 'payment', 'team', 'system']
├── title: string
├── message: string
├── status: enum ['unread', 'read']
├── badgeLabel: string (nullable)        -- "Nova", "Urgente"
├── actionLabel: string (nullable)       -- "Ver relatório", "Pagar agora"
├── actionUrl: string (nullable)         -- Rota de destino ao clicar
├── metadata: JSON (nullable)            -- Dados contextuais (IDs de referência, etc.)
├── createdAt: datetime
├── readAt: datetime (nullable)
```

### 4.20 Entidade: UserSettings (Preferências do Usuário)

```
UserSettings
├── id: UUID (PK)
├── userId: UUID (FK → User)
├── appearance:
│   ├── theme: enum ['light', 'dark']
│   ├── language: enum ['pt-BR', 'en-US', 'es']
│   ├── fontSize: enum ['small', 'medium', 'large']
│   └── compactMode: boolean
├── notifications:
│   ├── email: boolean
│   ├── sms: boolean
│   ├── push: boolean
│   ├── marketing: boolean
│   ├── appointments: boolean
│   ├── payments: boolean
│   └── updates: boolean
├── twoFactorEnabled: boolean
├── updatedAt: datetime
```

### 4.21 Entidade: UserSession (Sessão Ativa)

```
UserSession
├── id: UUID (PK)
├── userId: UUID (FK → User)
├── deviceInfo: string                 -- "Chrome - Windows"
├── ipAddress: string
├── location: string                   -- "São Paulo, SP"
├── isCurrent: boolean
├── createdAt: datetime
├── lastActiveAt: datetime
├── revokedAt: datetime (nullable)
```

### 4.22 Entidade: Integration (Integração Externa)

```
Integration (catálogo)
├── id: UUID (PK)
├── name: string                       -- "WhatsApp Business"
├── description: string
├── icon: string
├── isAvailable: boolean

TenantIntegration (conexão do tenant)
├── id: UUID (PK)
├── tenantId: UUID (FK → Tenant)
├── integrationId: UUID (FK → Integration)
├── isConnected: boolean
├── config: JSON (nullable)            -- Tokens, webhooks, etc. (criptografado)
├── connectedAt: datetime (nullable)
├── disconnectedAt: datetime (nullable)
```

### 4.23 Entidade: ApiKey (Chave de API)

```
ApiKey
├── id: UUID (PK)
├── tenantId: UUID (FK → Tenant)
├── key: string (hash)                 -- Armazenada em hash, exibida apenas uma vez
├── prefix: string                     -- "gx_live_" (para identificação)
├── isActive: boolean
├── createdAt: datetime
├── lastUsedAt: datetime (nullable)
├── revokedAt: datetime (nullable)
```

### 4.24 Entidade: BillingInfo (Dados de Faturamento)

```
BillingInfo
├── id: UUID (PK)
├── tenantId: UUID (FK → Tenant)
├── invoiceEmail: string
├── taxDocument: string                -- CPF ou CNPJ
├── paymentMethod: enum ['credit-card', 'pix', 'boleto']
├── creditCard: (criptografado/tokenizado - NÃO armazenar raw)
│   ├── lastFourDigits: string
│   ├── cardholderName: string
│   ├── expirationMonth: integer
│   ├── expirationYear: integer
│   └── gatewayToken: string           -- Token do gateway (Stripe, Pagar.me, etc.)
├── updatedAt: datetime
```

**⚠️ SEGURANÇA:** Nunca armazenar número completo do cartão. Usar tokenização via gateway de pagamentos (Stripe, Pagar.me, Asaas).

---

## 5. Especificação de Endpoints REST

### 5.1 Autenticação (`/api/auth`)

| Método | Endpoint | Descrição | Body (Request) | Response |
|--------|----------|-----------|-----------------|----------|
| `POST` | `/auth/login` | Login | `{ email, password }` | `{ accessToken, refreshToken?, user }` |
| `POST` | `/auth/signup` | Cadastro | `{ name, email, password, passwordConfirm, companyName, companyType }` | `{ user, message }` |
| `POST` | `/auth/refresh` | Renovar token | `{ refreshToken }` (ou HttpOnly cookie) | `{ accessToken }` |
| `POST` | `/auth/logout` | Logout | — | `{ message }` |
| `POST` | `/auth/forgot-password` | Esqueci senha | `{ email }` | `{ message }` |
| `POST` | `/auth/reset-password` | Resetar senha | `{ token, newPassword }` | `{ message }` |

### 5.2 Dashboard (`/api/dashboard`)

| Método | Endpoint | Descrição | Response |
|--------|----------|-----------|----------|
| `GET` | `/dashboard` | Dados do dashboard | `{ user, subscription, activeTools[], commercialModules[], managementModules[], unreadNotifications }` |

**Dados esperados:**
- Resumo da assinatura (plano, total mensal, data vencimento, status)
- Ferramentas ativas com plano e preço
- Módulos comerciais (Produtos, Serviços, Colaboradores, Notificações)
- Módulos de gestão (Assinatura, Ferramentas, Loja, Configurações)
- Contador de notificações não lidas

### 5.3 Produtos (`/api/products`)

| Método | Endpoint | Descrição | Body/Params |
|--------|----------|-----------|-------------|
| `GET` | `/products` | Listar produtos do tenant | Query: `?search=&status=&page=&limit=` |
| `GET` | `/products/:id` | Detalhe de um produto | — |
| `POST` | `/products` | Criar produto | `ProductFormData` completo |
| `PUT` | `/products/:id` | Atualizar produto | `ProductFormData` completo |
| `DELETE` | `/products/:id` | Deletar produto | — |
| `GET` | `/products/categories` | Listar categorias | — |
| `POST` | `/products/categories` | Criar categoria | `{ name }` |

**Campos do POST/PUT (ProductFormData):**
```json
{
  "name": "string",
  "sku": "string",
  "description": "string",
  "category": "string",
  "basePrice": 49.90,
  "costPrice": 30.00,
  "profitMargin": 39.87,
  "stock": 45,
  "minStock": 10,
  "maxStock": 100,
  "stockAlert": true,
  "trackInventory": true,
  "barcode": "string",
  "weight": 0.5,
  "dimensions": { "length": 10, "width": 5, "height": 3 },
  "photos": ["url1", "url2"],
  "tags": ["tag1", "tag2"],
  "status": "ATIVO",
  "variations": [
    {
      "name": "Tamanho P - Azul",
      "sku": "CAM-001-P-AZ",
      "price": 49.90,
      "stock": 10,
      "photos": ["url"],
      "attributes": [
        { "type": "size", "value": "P" },
        { "type": "color", "value": "Azul" }
      ],
      "customFields": [
        { "key": "Voltagem", "value": "110V", "type": "text" }
      ]
    }
  ],
  "customFields": [
    { "key": "Garantia", "value": "12 meses", "type": "text" }
  ]
}
```

### 5.4 Serviços (`/api/services`)

| Método | Endpoint | Descrição | Body/Params |
|--------|----------|-----------|-------------|
| `GET` | `/services` | Listar serviços | Query: `?search=&status=&category=` |
| `GET` | `/services/:id` | Detalhe de um serviço | — |
| `POST` | `/services` | Criar serviço | `CreateServiceRequest` |
| `PUT` | `/services/:id` | Atualizar serviço | `UpdateServiceRequest` |
| `DELETE` | `/services/:id` | Deletar serviço | — |
| `GET` | `/services/professionals` | Listar profissionais | — |

**Campos do POST/PUT:**
```json
{
  "name": "string",
  "description": "string",
  "category": "string",
  "basePrice": 45.00,
  "durationMinutes": 30,
  "professionalIds": ["uuid1", "uuid2"],
  "photoUrls": ["url1", "url2"],
  "status": "ATIVO",
  "priceVariations": [
    {
      "name": "Corte Simples",
      "durationMinutes": 30,
      "durationMinMinutes": 25,
      "durationMaxMinutes": 40,
      "price": 45.00,
      "photos": ["url"]
    }
  ]
}
```

### 5.5 Colaboradores (`/api/collaborators`)

| Método | Endpoint | Descrição | Body/Params |
|--------|----------|-----------|-------------|
| `GET` | `/collaborators` | Listar colaboradores | Query: `?search=` |
| `GET` | `/collaborators/:id` | Detalhe de um colaborador | — |
| `POST` | `/collaborators` | Criar colaborador | `CreateCollaboratorDTO` |
| `PUT` | `/collaborators/:id` | Atualizar colaborador | `UpdateCollaboratorDTO` |
| `DELETE` | `/collaborators/:id` | Deletar colaborador | — |
| `PATCH` | `/collaborators/:id/status` | Alterar status | `{ status: 'active' \| 'inactive' }` |

**Campos do POST/PUT (CreateCollaboratorDTO):**
```json
{
  "firstName": "string",
  "lastName": "string",
  "email": "string",
  "cpf": "string",
  "phone": "string",
  "gender": "Masculino | Feminino | Não-Binário | Outro | Prefiro não dizer",
  "timezone": "America/Sao_Paulo",
  "birthDate": "1990-05-15",
  "address": {
    "cep": "12345-678",
    "street": "string",
    "number": "string"
  },
  "workSchedule": {
    "startTime": "08:00",
    "lunchStart": "12:00",
    "lunchEnd": "13:00",
    "endTime": "17:00",
    "workDays": ["Seg", "Ter", "Qua", "Qui", "Sex"]
  },
  "status": "Ativo",
  "role": "Usuário",
  "toolPermissions": [
    { "toolId": "agendamento", "hasAccess": true },
    { "toolId": "fluxo-caixa", "hasAccess": false }
  ],
  "allToolsAccess": false,
  "profileImage": "base64 ou URL"
}
```

### 5.6 Marketplace / Ferramentas (`/api/tools`)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/tools` | Listar todas as ferramentas disponíveis |
| `GET` | `/tools?category=Financeiro` | Filtrar por categoria |
| `GET` | `/tools/:id` | Detalhe de uma ferramenta |
| `GET` | `/tools/:id/plans` | Planos disponíveis com features |
| `POST` | `/tools/:id/subscribe` | Assinar uma ferramenta |

**Response de `/tools/:id/plans`:**
```json
{
  "toolId": "nfe",
  "toolName": "NF-e",
  "toolCategory": "Financeiro",
  "toolIcon": "document-text-outline",
  "toolDescription": "Emissão de notas fiscais eletrônicas",
  "isSubscribed": false,
  "currentPlanId": null,
  "plans": [
    {
      "id": "nfe-basico",
      "type": "Básico",
      "price": 30.90,
      "monthlyLabel": "por mês",
      "status": "DISPONIVEL",
      "features": [
        { "id": "1", "description": "Até 50 NF-e/mês", "isIncluded": true }
      ],
      "buttonLabel": "Assinar agora",
      "buttonDisabled": false
    }
  ]
}
```

### 5.7 Assinatura (`/api/subscription`)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/subscription` | Dados da assinatura atual |
| `DELETE` | `/subscription/tools/:toolId` | Remover ferramenta da assinatura |
| `POST` | `/subscription/upgrade` | Upgrade de plano (body: `{ toolId, newPlanId }`) |
| `GET` | `/subscription/invoices` | Histórico de faturas |
| `GET` | `/subscription/invoices/:id/pdf` | Download de fatura em PDF |
| `POST` | `/subscription/invoices/:id/pay` | Pagar fatura (body: `{ paymentMethod }`) |

**Response de `GET /subscription`:**
```json
{
  "nextDueDate": "09 de janeiro de 2026",
  "totalAmount": 89.80,
  "subscribedToolsCount": 2,
  "status": "paid",
  "subscribedTools": [
    {
      "id": "1",
      "name": "Agendamento",
      "planName": "Plano Profissional",
      "monthlyPrice": 49.90,
      "iconUrl": "calendar"
    }
  ],
  "invoiceHistory": [
    {
      "id": "1",
      "month": "janeiro de 2026",
      "date": "04/01/2026",
      "amount": 89.80,
      "status": "paid",
      "pdfUrl": "/invoices/2026-01.pdf"
    }
  ]
}
```

### 5.8 Notificações (`/api/notifications`)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/notifications` | Listar notificações (Query: `?type=&status=&page=&limit=`) |
| `GET` | `/notifications/stats` | Estatísticas (total, unread, read, byType) |
| `PATCH` | `/notifications/:id/read` | Marcar como lida |
| `PATCH` | `/notifications/mark-all-read` | Marcar todas como lidas |
| `DELETE` | `/notifications` | Limpar todas as notificações |

**Response de `GET /notifications/stats`:**
```json
{
  "total": 12,
  "unread": 5,
  "read": 7,
  "byType": {
    "sale": 3,
    "appointment": 2,
    "stock": 1,
    "payment": 3,
    "team": 1,
    "system": 2
  }
}
```

### 5.9 Configurações do Usuário (`/api/settings`)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/settings/personal` | Dados pessoais do usuário |
| `PUT` | `/settings/personal` | Atualizar dados pessoais |
| `POST` | `/settings/personal/photo` | Upload de foto de perfil (multipart) |
| `GET` | `/settings/company` | Dados da empresa |
| `PUT` | `/settings/company` | Atualizar dados da empresa (inclui endereço, dados comerciais, redes sociais) |
| `GET` | `/settings/billing` | Dados de faturamento |
| `PUT` | `/settings/billing` | Atualizar dados de faturamento |
| `GET` | `/settings/appearance` | Preferências de aparência |
| `PUT` | `/settings/appearance` | Atualizar aparência |
| `GET` | `/settings/notifications` | Preferências de notificação |
| `PUT` | `/settings/notifications` | Atualizar preferências |
| `POST` | `/settings/security/change-password` | Alterar senha (body: `{ currentPassword, newPassword, confirmPassword }`) |
| `POST` | `/settings/security/2fa/enable` | Ativar 2FA |
| `POST` | `/settings/security/2fa/disable` | Desativar 2FA |
| `GET` | `/settings/security/sessions` | Listar sessões ativas |
| `DELETE` | `/settings/security/sessions/:id` | Revogar sessão |
| `GET` | `/settings/integrations` | Listar integrações |
| `POST` | `/settings/integrations/:id/connect` | Conectar integração |
| `POST` | `/settings/integrations/:id/disconnect` | Desconectar integração |
| `GET` | `/settings/api-key` | Obter chave de API (mascarada) |
| `POST` | `/settings/api-key/regenerate` | Gerar nova chave (invalida anterior) |
| `POST` | `/settings/privacy/export` | Exportar dados (LGPD) |
| `DELETE` | `/settings/account` | Excluir conta (LGPD - irreversível) |

### 5.10 Upload de Arquivos (`/api/uploads`)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/uploads/image` | Upload de imagem (multipart/form-data) |
| `POST` | `/uploads/images` | Upload múltiplo de imagens |
| `DELETE` | `/uploads/:id` | Remover arquivo |

**Retorno esperado:**
```json
{
  "url": "https://cdn.gerenciax.com/tenant-uuid/products/image-id.jpg",
  "id": "image-id",
  "size": 245000,
  "mimeType": "image/jpeg"
}
```

---

## 6. Autenticação e Autorização

### 6.1 Fluxo de Autenticação

```
1. Usuário faz POST /auth/login (email + password)
2. Backend valida credenciais
3. Backend gera Access Token JWT (curta duração: 15-30min)
4. Backend gera Refresh Token (longa duração: 7-30 dias)
   → Armazena em HttpOnly Cookie (web) ou retorna no body (mobile)
5. Frontend armazena Access Token em MEMÓRIA (Signal)
6. Frontend envia Access Token em header: Authorization: Bearer <token>
7. Quando token expira, frontend usa Refresh Token para renovar
```

### 6.2 Claims do JWT

```json
{
  "sub": "user-uuid",
  "email": "user@empresa.com",
  "tenantId": "tenant-uuid",
  "role": "admin",
  "iat": 1234567890,
  "exp": 1234569690
}
```

### 6.3 Roles e Permissões

| Role | Descrição | Permissões |
|------|-----------|------------|
| `admin` | Administrador do tenant | CRUD total em tudo, gerenciar assinatura, gerenciar colaboradores, configurações |
| `user` | Colaborador com acesso | Acesso às ferramentas permitidas, leitura do dashboard |

### 6.4 Guards Implementados no Frontend

1. **`authGuard`:** Verifica `isAuthenticated()` e `hasActiveSubscription()`. Redireciona para `/auth/login` ou `/subscription`.
2. **`guestGuard`:** Impede usuários logados de acessar login/signup. Redireciona para `/home`.

### 6.5 Regras de Segurança

- Tokens JWT **nunca** em localStorage (apenas sessionStorage para persistência entre tabs, e memória como principal).
- Refresh token via HttpOnly Cookie (secure, SameSite=Strict).
- HTTPS obrigatório em produção.
- Rate limiting em endpoints de autenticação.
- Validação de CORS.
- Sanitização de inputs.

---

## 7. Regras de Negócio por Domínio

### 7.1 Autenticação / Cadastro

| # | Regra |
|---|-------|
| RN-001 | Email deve ser único globalmente (não apenas por tenant). |
| RN-002 | Senha mínima: 6 caracteres (frontend). Recomendação backend: 8 caracteres, incluindo maiúscula, número e caractere especial. |
| RN-003 | Ao fazer signup, o sistema cria automaticamente: 1 Tenant + 1 User (role=admin). |
| RN-004 | `companyType` é obrigatório e determina quais módulos são mais relevantes. |
| RN-005 | O campo `password` e `passwordConfirm` devem ser iguais. |

### 7.2 Produtos

| # | Regra |
|---|-------|
| RN-010 | SKU deve ser único dentro do tenant. |
| RN-011 | Produto pode ter 0 a N variações. |
| RN-012 | Cada variação tem seu próprio preço, estoque e fotos. |
| RN-013 | Variações possuem atributos tipados (size, color, model, etc.). |
| RN-014 | Se `trackInventory = true`, o estoque é obrigatório. |
| RN-015 | Se `stockAlert = true` e `stock <= minStock`, gerar notificação tipo `stock`. |
| RN-016 | Produto pode ter campos personalizados (CustomFields) definidos pelo usuário. |
| RN-017 | Produto pode ter tags para categorização livre. |
| RN-018 | Status ATIVO/INATIVO controla visibilidade. |
| RN-019 | Fotos são URLs (upload via endpoint separado). |

### 7.3 Serviços

| # | Regra |
|---|-------|
| RN-020 | Serviço tem preço base e pode ter variações de preço. |
| RN-021 | Cada variação de preço tem duração mínima e máxima. |
| RN-022 | Serviço é vinculado a 1 ou N profissionais (Colaboradores). |
| RN-023 | Profissional herda dados do Collaborator (name, initials, avatar, color). |
| RN-024 | Status: ATIVO (aceita agendamentos), PAUSADO (temporariamente indisponível), INATIVO (não exibido). |
| RN-025 | Serviço pode ter galeria de fotos com ordem definida. |

### 7.4 Colaboradores

| # | Regra |
|---|-------|
| RN-030 | CPF deve ser validado (11 dígitos + algoritmo). |
| RN-031 | Email deve ser único dentro do tenant. |
| RN-032 | Horário de trabalho inclui: início, pausa almoço (início/fim), fim, dias da semana. |
| RN-033 | Dias de trabalho são selecionáveis: Dom, Seg, Ter, Qua, Qui, Sex, Sáb. |
| RN-034 | Se `allToolsAccess = true`, o colaborador acessa todas as ferramentas contratadas. |
| RN-035 | Caso contrário, permissões são definidas individualmente por ferramenta. |
| RN-036 | Status: Ativo, Inativo, Afastado. |
| RN-037 | Role: Administrador ou Usuário. |
| RN-038 | Endereço inclui CEP (com possível consulta ViaCEP no frontend). |

### 7.5 Assinaturas e Billing

| # | Regra |
|---|-------|
| RN-040 | O total mensal é a soma do preço de todos os planos de ferramentas contratadas. |
| RN-041 | Ao assinar uma ferramenta, cria-se um `SubscribedTool` com o plano selecionado. |
| RN-042 | Ao fazer upgrade, atualiza o `toolPlanId` e recalcula o `totalAmount`. |
| RN-043 | Ao remover uma ferramenta, seta `cancelledAt` e `isActive=false`, recalcula total. |
| RN-044 | Faturas são geradas mensalmente com base nos planos ativos. |
| RN-045 | Status da fatura: `paid` (paga), `pending` (aguardando), `overdue` (vencida). |
| RN-046 | Status da assinatura reflete o status da última fatura. |
| RN-047 | Fatura pode ser baixada em PDF. |
| RN-048 | Métodos de pagamento: Cartão de crédito, PIX, Boleto. |
| RN-049 | Dados de cartão NUNCA devem ser armazenados em texto plano — usar tokenização via gateway. |

### 7.6 Marketplace

| # | Regra |
|---|-------|
| RN-050 | Ferramentas são listadas a partir do catálogo (tabela Tool). |
| RN-051 | O campo `isSubscribed` é calculado em tempo real: verifica se existe `SubscribedTool` ativa para o `tenantId` + `toolId`. |
| RN-052 | Ferramentas podem ser filtradas por categoria. |
| RN-053 | Cada ferramenta tem 3 planos (Básico, Profissional, Empresarial) com features diferentes. |
| RN-054 | Um plano pode ser marcado como "POPULAR" para destaque visual. |
| RN-055 | Se o tenant já assina, exibir "SEU PLANO ATUAL" e botão "Fazer Upgrade" para planos superiores. |

### 7.7 Notificações

| # | Regra |
|---|-------|
| RN-060 | Notificações podem ser geradas por eventos: venda, agendamento, estoque baixo, pagamento recebido, ação de equipe, sistema. |
| RN-061 | Cada tipo tem cor/ícone/gradiente próprios (configuração visual no frontend). |
| RN-062 | Notificações possuem status `unread` (padrão ao criar) e `read`. |
| RN-063 | O usuário pode marcar uma, todas como lidas, ou limpar todas. |
| RN-064 | Notificações são ordenadas por data (mais recentes primeiro). |
| RN-065 | O badge "Urgente" é usado para notificações críticas (ex: estoque mínimo atingido). |
| RN-066 | O contador de não lidas aparece no header como badge no ícone de sino. |
| RN-067 | Futuramente: WebSocket para notificações em tempo real. |

### 7.8 Configurações

| # | Regra |
|---|-------|
| RN-070 | Dados pessoais: nome, email, telefone, CPF, data nascimento, foto. |
| RN-071 | Dados da empresa: nome fantasia, razão social, CNPJ, inscrições, endereço, dados comerciais, redes sociais. |
| RN-072 | Aparência: tema (light/dark), idioma (pt-BR, en-US, es), tamanho de fonte, modo compacto. |
| RN-073 | Notificações: toggles por canal (email, SMS, push) e tipo (marketing, agendamentos, pagamentos, updates). |
| RN-074 | Segurança: alteração de senha (requer senha atual), 2FA (ativar/desativar), gerenciar sessões ativas. |
| RN-075 | Integrações: WhatsApp Business, Google Calendar, Mercado Pago, Google Analytics, Mailchimp. |
| RN-076 | API Key: gerar, regenerar (invalida anterior), copiar, visualizar mascarada. |
| RN-077 | Privacidade (LGPD): exportar dados em JSON, ler política de privacidade, excluir conta permanentemente. |
| RN-078 | Exclusão de conta requer confirmação dupla e é irreversível. |

---

## 8. Sistema de Notificações

### 8.1 Tipos de Notificação

| Tipo | Cor | Ícone | Trigger (Backend) |
|------|-----|-------|-------------------|
| `sale` | `#00c950` (verde) | `cash-outline` | Nova venda registrada, meta atingida, produto mais vendido |
| `appointment` | `#2b7fff` (azul) | `calendar-outline` | Novo agendamento, confirmação, cancelamento |
| `stock` | `#f0b100` (amarelo) | `cube-outline` | Estoque abaixo do mínimo |
| `payment` | `#00c950` (verde) | `card-outline` | Pagamento recebido, fatura vencendo, fluxo positivo |
| `team` | `#2b7fff` (azul) | `people-outline` | Colaborador ausente, novo colaborador |
| `system` | `#6b7280` (cinza) | `information-circle-outline` | Backup concluído, atualização disponível |

### 8.2 Eventos que Geram Notificações (Backend)

1. **Estoque:** `product.stock <= product.minStock` → Notificação `stock` com badge `Urgente`
2. **Fatura:** `invoice.dueDate - 3 dias` → Notificação `payment` "Fatura vencendo em 3 dias"
3. **Venda:** Nova venda processada → Notificação `sale`
4. **Agendamento:** Criação/confirmação/cancelamento → Notificação `appointment`
5. **Pagamento:** PIX/cartão recebido → Notificação `payment`
6. **Sistema:** Backup automático, atualização → Notificação `system`

### 8.3 Entrega de Notificações

| Canal | Configurável | Implementação |
|-------|-------------|---------------|
| In-App (Feed) | Sempre ativo | REST API + WebSocket (futuro) |
| E-mail | Sim (toggle) | Fila de e-mails (SendGrid, SES) |
| SMS | Sim (toggle) | Gateway SMS (Twilio, Infobip) |
| Push | Sim (toggle) | Capacitor Push Notifications (FCM/APNs) |

---

## 9. Sistema de Assinaturas e Billing

### 9.1 Modelo de Precificação

```
Tenant
  └── Subscription (1:1)
        ├── SubscribedTool: Agendamento → Plano Profissional (R$ 49,90)
        ├── SubscribedTool: Fluxo de Caixa → Plano Básico (R$ 39,90)
        └── Total Mensal = R$ 89,80
```

### 9.2 Ciclo de Vida da Assinatura

```
1. Signup → Tenant criado, Subscription com status 'pending' (sem ferramentas)
2. Contrata 1ª ferramenta → SubscribedTool criado, invoice gerada
3. Pagamento da invoice → status = 'paid', subscription = 'active'
4. Mensalmente → Invoice gerada automaticamente
5. Não pagou → status = 'overdue', possível suspensão após X dias
6. Upgrade → ToolPlan alterado, total recalculado, diferença cobrada proporcional
7. Cancelamento de ferramenta → SubscribedTool desativada, total recalculado
```

### 9.3 Gateway de Pagamentos

O frontend está preparado para 3 métodos:
- **Cartão de crédito** — Requer integração com gateway (Stripe, Pagar.me, Asaas)
- **PIX** — Geração de QR Code via gateway
- **Boleto** — Geração via gateway

**Recomendação:** Usar um gateway brasileiro como **Asaas** ou **Pagar.me** que suporta os 3 métodos nativamente.

---

## 10. Integrações Externas

### 10.1 Integrações Previstas

| Integração | Descrição | Tipo |
|------------|-----------|------|
| WhatsApp Business | Envio de mensagens e confirmações | API Cloud |
| Google Calendar | Sincronização de agendamentos | OAuth2 |
| Mercado Pago | Pagamentos online | API REST |
| Google Analytics | Analytics de uso | SDK |
| Mailchimp | E-mail marketing | API REST |

### 10.2 Consulta de CEP

O frontend formata e valida CEP. O backend pode (opcionalmente) integrar com a API ViaCEP para autocompletar endereço:

```
GET https://viacep.com.br/ws/{cep}/json/
```

### 10.3 API Key para Terceiros

O sistema gera API Keys (prefixo `gx_live_`) para que o tenant integre sistemas externos. O backend deve:
- Gerar chaves criptograficamente seguras.
- Armazenar apenas o hash da chave.
- Exibir a chave completa apenas uma vez na geração.
- Permitir regeneração (invalidando a anterior).

---

## 11. Requisitos Não-Funcionais

### 11.1 Performance

- Tempo de resposta médio de API: < 200ms
- Paginação obrigatória em listagens (default: 20 itens/página)
- Cache de dados estáticos (categorias, ferramentas do marketplace)
- CDN para assets estáticos e uploads de imagens

### 11.2 Segurança

- HTTPS obrigatório em produção
- Rate limiting: 100 req/min por usuário, 5 tentativas de login por 15min
- CORS configurado para domínios autorizados
- Sanitização de inputs (prevenção de SQL Injection, XSS)
- Headers de segurança: `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`
- Dados sensíveis (tokens de integração, API keys) criptografados em repouso
- Logs de auditoria para operações críticas (login, alteração de senha, exclusão de conta)
- Conformidade com **LGPD**: exportação de dados, exclusão de conta, consentimento

### 11.3 Escalabilidade

- Cada tenant é isolado por `tenantId` — permite crescimento horizontal
- Micro-frontends são independentes — o backend pode ter microserviços por domínio
- Upload de arquivos via Storage externo (S3, GCS, Cloudflare R2)
- Fila assíncrona para operações pesadas (geração de PDF, envio de e-mail, notificações)

### 11.4 Observabilidade

- Logging estruturado (JSON) com correlação de requests
- Health check endpoint: `GET /api/health`
- Métricas de uso por tenant (requests, ferramentas ativas)

---

## 12. Resumo de Decisões para Arquitetura

### 12.1 Banco de Dados

| Opção | Quando usar |
|-------|-------------|
| **PostgreSQL** | Recomendado. Suporta JSON/JSONB para campos flexíveis (customFields, attributes), bom para multi-tenant com row-level security. |
| **MongoDB** | Alternativa se preferir schema flexível. Bom para notificações e logs. |
| **Abordagem Híbrida** | Postgres para dados estruturados + Redis para cache/sessions + S3 para uploads |

### 12.2 Tabelas Principais (Resumo)

```
tenant
user
collaborator
collaborator_tool_permission
product
product_variation
product_custom_field
product_category
service
service_price_variation
service_professional (N:N)
service_photo
tool (catálogo, gerenciado pelo admin do SaaS)
tool_plan
plan_feature
subscription
subscribed_tool
invoice
notification
user_settings
user_session
integration (catálogo)
tenant_integration
api_key
billing_info
```

**Total: ~22 tabelas principais**

### 12.3 API Style

- **RESTful** com padrão de resposta consistente:
```json
{
  "data": { ... },
  "message": "Success",
  "success": true
}
```
- Erros:
```json
{
  "message": "Validation failed",
  "statusCode": 400,
  "errors": {
    "email": ["O e-mail é obrigatório"],
    "password": ["Mínimo de 6 caracteres"]
  }
}
```

### 12.4 Infraestrutura Recomendada

| Componente | Recomendação |
|------------|-------------|
| **Runtime** | Node.js (NestJS) ou Go ou Python (FastAPI) |
| **Banco** | PostgreSQL 16+ |
| **Cache** | Redis |
| **File Storage** | AWS S3 / Cloudflare R2 / GCS |
| **Gateway de Pagamentos** | Asaas, Pagar.me ou Stripe |
| **E-mail** | SendGrid ou AWS SES |
| **SMS** | Twilio ou Infobip |
| **Push Notifications** | Firebase Cloud Messaging (FCM) |
| **Queue/Jobs** | BullMQ (Node) ou equivalente |
| **Deploy** | Docker + Railway / Render / AWS ECS |
| **CDN** | Cloudflare |

### 12.5 Prioridade de Implementação (MVP)

| Fase | Módulos | Endpoints |
|------|---------|-----------|
| **Fase 1 - Auth & Core** | Auth, User, Tenant | `/auth/*`, `/dashboard`, `/settings/personal` |
| **Fase 2 - Catálogo** | Produtos, Serviços, Categorias | `/products/*`, `/services/*` |
| **Fase 3 - Equipe** | Colaboradores, Permissões | `/collaborators/*` |
| **Fase 4 - Marketplace** | Tools, Plans, Subscriptions | `/tools/*`, `/subscription/*` |
| **Fase 5 - Billing** | Invoices, Payments | `/subscription/invoices/*`, `/settings/billing` |
| **Fase 6 - Notificações** | Notifications, WebSocket | `/notifications/*` |
| **Fase 7 - Integrações** | Integrations, API Keys | `/settings/integrations/*` |
| **Fase 8 - Compliance** | LGPD, Audit Logs | `/settings/privacy/*`, `/settings/account` |

---

## Apêndice A: Mapa de Rotas Frontend → Backend

| Rota Frontend | Endpoint Backend Principal |
|---------------|---------------------------|
| `POST /auth/login` (LoginPage) | `POST /api/auth/login` |
| `POST /auth/signup` (SignUpPage) | `POST /api/auth/signup` |
| `/app/dashboard` (DashboardPage) | `GET /api/dashboard` |
| `/app/products` (ProductsPage) | `GET /api/products` |
| `/app/products/new` (ProductCreatePage) | `POST /api/products` |
| `/app/products/edit/:id` (ProductEditPage) | `GET + PUT /api/products/:id` |
| `/app/services` (ServicesPage) | `GET /api/services` |
| `/app/services/create` (ServiceCreatePage) | `POST /api/services` |
| `/app/services/edit/:id` (ServiceEditPage) | `GET + PUT /api/services/:id` |
| `/app/collaborators` (CollaboratorsPage) | `GET /api/collaborators` |
| `/app/collaborators/new` (CollaboratorFormPage) | `POST /api/collaborators` |
| `/app/collaborators/:id` (CollaboratorFormPage) | `GET + PUT /api/collaborators/:id` |
| `/app/marketplace` (MarketplacePage) | `GET /api/tools` |
| `/app/tool-plans/:id` (ToolPlansPage) | `GET /api/tools/:id/plans` |
| `/app/tools` (ToolsPage) | `GET /api/tools?subscribed=true` |
| `/app/subscription` (SubscriptionPage) | `GET /api/subscription` |
| `/app/notifications` (NotificationsPage) | `GET /api/notifications` |
| `/app/settings` (SettingsPage) | `GET/PUT /api/settings/*` |

---

## Apêndice B: Fluxo Completo de Dados por Tela

### B.1 Dashboard
```
→ GET /api/dashboard
← {
    user: { id, name, email, company, avatar },
    subscription: { planName, totalMonthly, dueDate, status, statusLabel },
    activeTools: [{ id, name, planType, price, icon, iconColor, bgColor }],
    commercialModules: [{ id, name, icon, iconColor, bgColor, route }],
    managementModules: [{ id, name, icon, iconColor, bgColor, route }],
    unreadNotifications: number
   }
```

### B.2 Login
```
→ POST /api/auth/login { email, password }
← { accessToken: "jwt...", refreshToken?: "...", user: { id, name, email, companyName, companyType, role, tenantId, createdAt } }
```

### B.3 SignUp
```
→ POST /api/auth/signup { name, email, password, passwordConfirm, companyName, companyType }
← { user: { id, name, email, ... }, message: "Conta criada com sucesso!" }
```

### B.4 Produto (Create)
```
→ POST /api/products { name, sku, description, category, basePrice, costPrice, stock, minStock, maxStock, stockAlert, trackInventory, variations[], photos[], barcode, weight, dimensions, tags[], customFields[], status }
← { data: Product, message: "Produto criado", success: true }
```

### B.5 Serviço (Create)
```
→ POST /api/services { name, description, category, basePrice, durationMinutes, professionalIds[], photoUrls[], priceVariations[] }
← { success: true, message: "Serviço criado", serviceId: "uuid" }
```

### B.6 Colaborador (Create)
```
→ POST /api/collaborators { firstName, lastName, email, cpf, phone, gender, timezone, birthDate, address, workSchedule, status, role, toolPermissions[], allToolsAccess, profileImage }
← { data: Collaborator, message: "Colaborador criado", success: true }
```

---

> **Documento v1.0** — Gerado em 24/02/2026  
> **Fonte:** Análise completa do frontend GerenciaX (Shell Angular/Ionic)  
> **Arquivos analisados:** 13 interfaces, 13 services, 18 pages, 20+ shared components, route definitions, guards e environments.
