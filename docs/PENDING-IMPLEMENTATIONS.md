# GerenciaX — Implementações Pendentes

> **Atualizado em:** 18/03/2026
> **Escopo:** Tudo o que falta implementar no backend (`b-core-nest`) e no frontend (`f-core-ionic`) para atingir produção completa.
> **Organização:** 4 blocos temáticos, cada um com fases priorizadas.

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Bloco A — Plataforma para Tools Externas](#2-bloco-a--plataforma-para-tools-externas)
3. [Bloco B — Billing & Pagamentos](#3-bloco-b--billing--pagamentos)
4. [Bloco C — SDK Compartilhado](#4-bloco-c--sdk-compartilhado)
5. [Bloco D — Frontend Polish](#5-bloco-d--frontend-polish)
6. [Ordem de Implementação Recomendada](#6-ordem-de-implementação-recomendada)
7. [Decisões Arquiteturais](#7-decisões-arquiteturais)

---

## 1. Visão Geral

### O que já está pronto

O Core (`b-core-nest`) e o Shell (`f-core-ionic`) estão **100% funcionais como MVP standalone**:

| Área | Status |
|------|--------|
| Auth (login, signup, refresh, forgot-password) | ✅ Completo |
| Marketplace (tools, plans, subscribe, cancel, change-plan) | ✅ Completo |
| Billing (invoices, CRON, Asaas gateway, PDF, dunning) | ✅ Completo |
| Products/Services CRUD + sub-resources | ✅ Completo |
| Collaborators CRUD | ✅ Completo |
| Categories CRUD | ✅ Completo |
| Settings (personal, company, appearance, notifications, security, LGPD) | ✅ Completo |
| Dashboard com dados reais | ✅ Completo |
| Notificações (REST + WebSocket + e-mails) | ✅ Completo |
| Upload de imagens (single + multiple) | ✅ Completo |
| Trial period + expiração automática | ✅ Completo |
| Admin endpoints (tools master) | ✅ Completo |
| Frontend ↔ Backend integração completa | ✅ Completo |
| WebSocket client no frontend | ✅ Completo |
| QA: 132 issues corrigidas (segurança, validação, transactions) | ✅ Completo |

### O que falta

| Bloco | Itens | Prioridade | Motivo |
|-------|-------|------------|--------|
| **A** — Plataforma para Tools | 5 itens | 🔴 Bloqueante para tools externas | Sem isso, NF-e/Agendamento/Estoque não funcionam |
| **B** — Billing avançado | 2 itens | 🟠 Importante para produção | Grace period e SubscribedTools |
| **C** — SDK compartilhado | 1 item | 🟠 Importante para DX das tools | Evita code duplication entre tools |
| **D** — Frontend polish | 2 itens | 🟡 Baixa prioridade | Melhorias de UI (sub-resources, user fields) |

---

## 2. Bloco A — Plataforma para Tools Externas

### Contexto

O GerenciaX Core é o **coração da plataforma**: gerencia autenticação, tenants, assinaturas, billing, marketplace e notificações. As **tools** (NF-e, Agendamento, Estoque, etc.) serão projetos independentes — cada uma com seu próprio backend e frontend (micro-frontend no Shell).

Para essa arquitetura de **plataforma + plugins** funcionar, o Core precisa:

1. **Autenticar tools** → API Keys (service-to-service)
2. **Informar permissões** → Entitlements API
3. **Notificar mudanças** → Webhooks
4. **Monitorar** → Usage tracking + Health checks

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│   Shell (f-core-ionic) + Micro-frontends (tools UI)         │
└────────────┬────────────────────────────────┬───────────────┘
             │ JWT do usuário                 │ JWT do usuário
             ▼                                ▼
┌────────────────────┐          ┌─────────────────────────────┐
│   CORE BACKEND     │◄────────│    TOOL BACKEND (ex: NF-e)   │
│   b-core-nest      │ API Key │    t-nfe-nest                │
│                    │─────────►                               │
│ • Auth/JWT         │ Webhooks│ • Domínio específico          │
│ • Marketplace      │─────────►│ • Dados do tenant na tool    │
│ • Billing          │          │ • Feature-gating local       │
│ • Entitlements API │          │ • Regras de negócio da tool  │
│ • Webhook Dispatch │          └─────────────────────────────┘
└────────────────────┘

Fluxo de uma request na tool:
1. Usuário faz request à tool com JWT (obtido via Core auth)
2. Tool extrai tenantId do JWT
3. Tool chama GET /api/v1/entitlements?toolSlug=nfe no Core (via API Key)
4. Core retorna: subscription status + features + limites
5. Tool aplica regras de negócio (bloquear feature, limitar quantidade)
```

---

### A.1 — Autenticação Service-to-Service (API Keys)

**Prioridade:** 🔴 Bloqueante — sem isso, nenhuma tool consegue chamar o Core.

**Problema atual:** Toda autenticação é via JWT de usuário. Quando o backend de uma tool precisa consultar entitlements no Core, ele não tem JWT — precisa de uma credencial própria.

**O que implementar:**

- Cada tool cadastrada no marketplace pode ter **uma API Key** associada
- A API Key é gerada pelo admin (`role: master`) e armazenada como **hash SHA-256** no banco (nunca plaintext)
- A API Key é exibida **uma única vez** no momento da geração (padrão GitHub tokens)
- Requests da tool passam pelo header `X-Api-Key`
- A API Key identifica **qual tool** está fazendo a request (não qual usuário)
- API Keys podem ser **revogadas** e **regeneradas** pelo admin
- Rate limiting por API Key: 1000 req/min por padrão

**Formato da Key:** `gx_{toolSlug}_{random32chars}` (ex: `gx_nfe_a3b7c9d2e4f6g8h0...`)

**Modelo de dados:**

```sql
tool_api_keys (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id       UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
  key_hash      VARCHAR(255) NOT NULL,        -- SHA-256 do key completo
  key_prefix    VARCHAR(10) NOT NULL,          -- primeiros 8 chars para identificação visual
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_by    UUID REFERENCES users(id),     -- admin que gerou
  last_used_at  TIMESTAMP WITH TIME ZONE,
  expires_at    TIMESTAMP WITH TIME ZONE,      -- null = não expira
  created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  revoked_at    TIMESTAMP WITH TIME ZONE
)
```

**Endpoints:**

- [ ] `POST /admin/tools/:toolId/api-keys` — Gerar nova API Key (retorna key em plaintext UMA vez)
- [ ] `GET /admin/tools/:toolId/api-keys` — Listar keys (só prefix + metadata, nunca o valor)
- [ ] `DELETE /admin/tools/:toolId/api-keys/:keyId` — Revogar API Key

**Guard:**

- [ ] `ApiKeyGuard` — Valida `X-Api-Key` header, busca tool associada, injeta `toolId` no request
- [ ] Coexiste com `JwtAuthGuard` — endpoints de entitlements aceitam **ambos** (JWT OU API Key)

**Arquitetura hexagonal:**

| Componente | Camada | Localização |
|---|---|---|
| `ApiKeyRepositoryPort` | Porta output | `src/modules/auth/domain/ports/output/` |
| `DrizzleApiKeyRepository` | Adapter secundário | `src/modules/auth/infrastructure/adapters/secondary/persistence/` |
| `ApiKeyGuard` | Guard | `src/common/guards/api-key.guard.ts` |
| Schema Drizzle | Infra | `src/modules/auth/infrastructure/adapters/secondary/persistence/api-key.schema.ts` |

---

### A.2 — Entitlements API

**Prioridade:** 🔴 Bloqueante — sem isso, tools não sabem se o tenant tem acesso.

**Problema atual:** A tool precisaria acessar diretamente o banco do Core (violação de bounded context) ou duplicar dados de subscription.

**O que implementar:**

- Endpoint acessível via **API Key** (tool backend) ou **JWT do admin** (frontend)
- Retorna o estado completo da subscription do tenant para aquela tool
- Estados possíveis:
  - `"active"` — plano ativo com features e limites
  - `"trialing"` — em trial com `trialEndsAt` + features do plano trial
  - `"cancelled"` — assinatura cancelada
  - `"none"` — sem subscription (tool deve bloquear acesso)
- Features retornadas como mapa chave-valor: `{ "max_nfe_month": "500", "advanced_reports": "true" }`
- **Cache:** Header `Cache-Control: max-age=300` (tool pode cachear por 5min)

**Endpoints:**

- [ ] `GET /api/v1/entitlements` — Entitlements para uma tool + tenant específico
- [ ] `GET /api/v1/entitlements/all` — Todas as tools do tenant (para montar menu lateral no Shell)
- [ ] `GET /api/v1/entitlements/check` — Check rápido: `?toolSlug=nfe&feature=advanced_reports` → `{ "allowed": true }`

**Request:**

```
GET /api/v1/entitlements
Headers:
  X-Api-Key: gx_nfe_a3b7c9d2...     (OU Authorization: Bearer <jwt>)
  X-Tenant-Id: uuid-do-tenant        (obrigatório quando via API Key)
Query:
  toolSlug: string                    (quando via JWT; API Key já identifica a tool)
```

**Response (subscription ativa):**

```json
{
  "tenantId": "uuid",
  "toolId": "uuid",
  "toolSlug": "nfe",
  "subscription": {
    "id": "uuid",
    "status": "active",
    "planId": "uuid",
    "planName": "Profissional",
    "planInterval": "monthly",
    "trialEndsAt": null,
    "startDate": "2026-01-15T00:00:00.000Z",
    "endDate": null
  },
  "features": {
    "max_nfe_month": "500",
    "advanced_reports": "true",
    "xml_export": "true",
    "api_access": "true"
  },
  "limits": {
    "maxUsers": 10,
    "maxItems": 500
  }
}
```

**Response (sem subscription):**

```json
{
  "tenantId": "uuid",
  "toolId": "uuid",
  "toolSlug": "nfe",
  "subscription": null,
  "features": {},
  "limits": { "maxUsers": 0, "maxItems": 0 }
}
```

**Lógica interna:**
1. Identificar a tool (via API Key → `toolId`, ou via `toolSlug` query param)
2. Buscar subscription ativa ou trialing do tenant para essa tool
3. Se existe, buscar o plano e suas features
4. Montar response com features como mapa chave-valor

**Arquitetura hexagonal:**

| Componente | Camada | Localização |
|---|---|---|
| `EntitlementsUseCasePort` | Porta input | `src/modules/marketplace/domain/ports/input/` |
| `EntitlementsService` | Application | `src/modules/marketplace/application/services/` |
| `EntitlementsController` | Adapter primário | `src/modules/marketplace/infrastructure/adapters/primary/` |
| DTOs | Application | `src/modules/marketplace/application/dto/entitlement*.dto.ts` |

**Nota:** Usa `MarketplaceRepositoryPort` existente — já tem todos os métodos de consulta necessários.

---

### A.3 — Registro de Infraestrutura da Tool (URLs e Secrets)

**Prioridade:** 🟠 Importante — necessário para webhooks funcionarem.

**Problema atual:** O Core não sabe a URL do servidor de cada tool. Sem isso, não tem como enviar webhooks.

**O que implementar:**

Cada tool pode ter uma configuração de infraestrutura:
- `baseUrl` — URL base do backend (ex: `https://nfe-api.gerenciax.com`)
- `webhookUrl` — URL para receber webhooks (ex: `https://nfe-api.gerenciax.com/webhooks/core`)
- `webhookSecret` — Secret HMAC-SHA256 para assinar payloads (gerado automaticamente)
- `healthCheckUrl` — URL do health check (ex: `https://nfe-api.gerenciax.com/health`)

**Modelo de dados (campos adicionais na tabela `tools`):**

```sql
ALTER TABLE tools ADD COLUMN base_url         VARCHAR(500);
ALTER TABLE tools ADD COLUMN webhook_url      VARCHAR(500);
ALTER TABLE tools ADD COLUMN webhook_secret   VARCHAR(255);   -- HMAC secret encriptado
ALTER TABLE tools ADD COLUMN health_check_url VARCHAR(500);
```

**Endpoints:**

- [ ] `PUT /admin/tools/:toolId/config` — Atualizar URLs da tool
- [ ] `POST /admin/tools/:toolId/config/regenerate-secret` — Regenerar webhook secret (retorna UMA vez)
- [ ] `GET /admin/tools/:toolId/config` — Ver configuração (secret parcialmente mascarado: `hmac_...****`)

---

### A.4 — Webhook Dispatch System

**Prioridade:** 🟠 Importante — tools precisam reagir a mudanças de subscription em tempo real.

**Problema atual:** Se um tenant cancela assinatura, a tool só descobre via polling da Entitlements API. Com webhooks, a notificação é instantânea.

**O que implementar:**

- O Core despacha webhooks para a `webhookUrl` da tool quando eventos relevantes ocorrem
- Cada webhook é assinado com HMAC-SHA256 usando o `webhookSecret` da tool
- A tool valida a assinatura do header `X-Webhook-Signature` antes de processar
- Retry com backoff exponencial: 1min → 5min → 30min → 2h → 12h (5 tentativas)
- Após 5 falhas: webhook marcado como `failed`, admin notificado por e-mail
- Webhooks são **idempotentes**: payload inclui `eventId` para a tool deduplicar

**Eventos que disparam webhooks:**

| Evento interno (EventEmitter2) | Webhook type | Dados incluídos |
|---|---|---|
| `tool.subscribed` | `subscription.created` | tenantId, planId, planName, status, trialEndsAt |
| `tool.unsubscribed` | `subscription.cancelled` | tenantId, subscriptionId, cancelledAt |
| `tool.plan.changed` | `subscription.plan_changed` | tenantId, oldPlanId, newPlanId, oldPlanName, newPlanName |
| `trial.expired` | `trial.expired` | tenantId, subscriptionId, toolId, expiredAt |
| `payment.confirmed` | `payment.confirmed` | tenantId, invoiceId, amount, paidAt |
| `payment.overdue` | `payment.overdue` | tenantId, invoiceId, amount, dueDate |
| `tenant.suspended` | `tenant.suspended` | tenantId, reason, suspendedAt |

**Payload do webhook:**

```json
POST https://nfe-api.gerenciax.com/webhooks/core
Headers:
  Content-Type: application/json
  X-Webhook-Id: "uuid-evento"
  X-Webhook-Signature: "sha256=abc123..."
  X-Webhook-Timestamp: "2026-03-11T14:30:00.000Z"

Body:
{
  "id": "uuid-evento",
  "type": "subscription.plan_changed",
  "createdAt": "2026-03-11T14:30:00.000Z",
  "data": {
    "tenantId": "uuid",
    "oldPlanId": "uuid",
    "newPlanId": "uuid",
    "oldPlanName": "Básico",
    "newPlanName": "Profissional"
  }
}
```

**Modelo de dados:**

```sql
webhook_deliveries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id         UUID NOT NULL REFERENCES tools(id),
  event_type      VARCHAR(100) NOT NULL,
  payload         JSONB NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending, delivered, failed
  attempts        INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  next_retry_at   TIMESTAMP WITH TIME ZONE,
  response_status INTEGER,
  response_body   TEXT,                     -- primeiros 1000 chars
  delivered_at    TIMESTAMP WITH TIME ZONE,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
)
```

**Endpoints (admin):**

- [ ] `GET /admin/tools/:toolId/webhooks` — Histórico de webhooks (paginado, filtrado por status)
- [ ] `POST /admin/tools/:toolId/webhooks/:webhookId/retry` — Reenviar webhook manualmente
- [ ] `POST /admin/tools/:toolId/webhooks/test` — Enviar webhook de teste

**Componentes:**

| Componente | Responsabilidade |
|---|---|
| `WebhookDispatchService` | Recebe evento, monta payload, assina HMAC, envia HTTP, loga resultado |
| `WebhookRetryCron` | CRON a cada 1min, busca webhooks pending com `next_retry_at <= now()` |
| Event listeners | Escutam eventos existentes → chamam `WebhookDispatchService` |

**Arquitetura hexagonal:** Novo módulo `webhook` em `src/modules/webhook/`.

---

### A.5 — Usage Tracking API + Health Check + Auditoria

**Prioridade:** 🟡 Melhoria — para produção robusta.

Estes 3 itens são melhorias que tornam a plataforma mais profissional:

#### A.5.1 — Usage Tracking

**Problema:** O plano "Básico" permite 50 NF-e/mês. Sem tracking centralizado, cada tool controla limites isoladamente e o Core não tem visibilidade.

**O que implementar:**
- Tool reporta uso ao Core: `POST /api/v1/usage` (API Key + tenant_id + feature_key + quantity)
- Core armazena contadores por tenant/tool/feature/período
- Core retorna uso junto com entitlement (campo `usage`)
- Alertas automáticos quando uso atinge 80% e 100% do limite
- Reset mensal conforme intervalo do plano

```sql
usage_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  tool_id     UUID NOT NULL REFERENCES tools(id),
  feature_key VARCHAR(100) NOT NULL,       -- 'nfe_issued', 'reports_generated'
  quantity    INTEGER NOT NULL DEFAULT 1,
  period      VARCHAR(20) NOT NULL,         -- '2026-03'
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
)

CREATE INDEX idx_usage_tenant_tool_period
  ON usage_records(tenant_id, tool_id, feature_key, period);
```

**Endpoints:**

- [ ] `POST /api/v1/usage` — Tool reporta uso
- [ ] `GET /api/v1/usage?toolSlug=nfe&period=2026-03` — Consultar uso do tenant
- [ ] `GET /api/v1/usage/summary` — Resumo de todas as tools (dashboard)

**Entitlement response estendida:**

```json
{
  "features": { "max_nfe_month": "50" },
  "usage": {
    "nfe_issued": { "current": 42, "limit": 50, "period": "2026-03", "percentage": 84 }
  }
}
```

#### A.5.2 — Health Check

**O que implementar:**
- CRON a cada 5min: `GET {healthCheckUrl}` de cada tool ativa
- Armazena resultado (online/offline, response time, último check)
- Offline por 15+ min → notificar admin (e-mail + WebSocket)
- Dashboard do admin exibe status

**Endpoints:**

- [ ] `GET /admin/tools/health` — Status de todas as tools
- [ ] `POST /admin/tools/:toolId/health/check` — Forçar check imediato

#### A.5.3 — Auditoria Service-to-Service

**O que implementar:**
- Logar toda request autenticada por API Key (método, path, toolId, tenantId, status, latência)
- Tabela `api_access_logs` com retenção de 90 dias
- Dashboard admin com métricas por tool

```sql
api_access_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id      UUID NOT NULL REFERENCES tools(id),
  api_key_id   UUID REFERENCES tool_api_keys(id),
  method       VARCHAR(10) NOT NULL,
  path         VARCHAR(255) NOT NULL,
  tenant_id    UUID,
  status_code  INTEGER NOT NULL,
  latency_ms   INTEGER,
  ip_address   VARCHAR(45),
  created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
)
```

---

## 3. Bloco B — Billing & Pagamentos

### B.1 — Grace Period (Período de Carência)

**Prioridade:** 🟠 Importante para produção.

**Problema atual:** Quando uma invoice fica overdue, o CRON `check-overdue` suspende o tenant após `SUSPENSION_THRESHOLD_DAYS = 3`. Porém, não existe um **período de carência** formal entre "fatura vencida" e "acesso restringido". O tenant simplesmente é suspenso, sem aviso gradual.

**O que implementar:**

Uma escala de restrição progressiva:

| Dia após vencimento | Ação | Acesso |
|---|---|---|
| 0 (vencimento) | E-mail: "Sua fatura venceu" | ✅ Normal |
| 1–3 | Banner no frontend: "Pagamento pendente" | ✅ Normal (grace period) |
| 4–7 | E-mail + Notificação: "Último aviso" | ⚠️ Parcial (read-only em features premium) |
| 8+ | Suspensão total | ❌ Suspenso |

**Implementação sugerida:**

1. Adicionar campo `grace_period_days` na tabela `subscriptions` (default: 3)
2. No `SuspensionGuard`, verificar se tenant está em grace period → permitir acesso com flag
3. Novo endpoint `GET /api/v1/billing/status` → retorna estado atual (`active`, `grace`, `suspended`)
4. Evento `subscription.grace_entered` para notificação
5. CRON ajustado: dia 4 → restrição parcial, dia 8 → suspensão total

**Nota:** O dunning (retry de cobrança nos dias 7, 10, 13) já existe. O grace period complementa informando ao tenant qual é a situação dele.

---

### B.2 — SubscribedTools Aggregation

**Prioridade:** 🟡 Baixa — funcionalidade de conveniência.

**Problema atual:** Para saber "quais tools o tenant assinou e quanto paga no total", é preciso fazer JOIN entre `tenant_tool_subscriptions` + `tool_plans` + `tools`. Não existe uma view ou tabela materializada que consolide isso.

**O que implementar:**

Uma query ou view que retorne:

```json
{
  "tenantId": "uuid",
  "totalMonthly": 149.70,
  "tools": [
    { "toolId": "uuid", "toolName": "NF-e", "planName": "Pro", "price": 79.90, "status": "active" },
    { "toolId": "uuid", "toolName": "Agendamento", "planName": "Básico", "price": 69.80, "status": "trialing" }
  ]
}
```

**Pode ser:** Um método no `MarketplaceService` que faz o JOIN, ou uma view SQL, ou um campo `totalAmount` recalculado na subscription.

---

## 4. Bloco C — SDK Compartilhado

### C.1 — Pacote npm `@gerenciax/core-sdk`

**Prioridade:** 🟠 Importante — evita retrabalho em cada tool.

**Problema atual:** Cada tool vai precisar: (1) validar JWT do Core, (2) consultar entitlements, (3) validar webhooks. Se cada tool reimplementar isso, haverá código duplicado, bugs inconsistentes, e manutenção difícil.

**O que o pacote faz:**

```typescript
// @gerenciax/core-sdk

// 1. Middleware de autenticação (valida JWT do Core)
export class GerenciaXAuthMiddleware {
  // Extrai userId, tenantId, role do JWT
  // Valida usando a mesma JWT_SECRET ou chave pública (RSA)
}

// 2. Guard de entitlements (consulta Core e injeta no request)
export class EntitlementGuard {
  // Chama GET /api/v1/entitlements no Core com API Key
  // Cacheia resultado por 5 minutos (configurável)
  // Injeta features e limites no request
}

// 3. Decorator para exigir features
@RequireFeature('advanced_reports')
export class ReportsController {
  // Se feature não disponível → 403 com mensagem
}

// 4. Validação de webhook
export class WebhookValidator {
  static verify(payload: string, signature: string, secret: string): boolean
  // Verifica HMAC-SHA256 do X-Webhook-Signature
}

// 5. Client HTTP para o Core
export class GerenciaXCoreClient {
  constructor(config: { coreUrl: string; apiKey: string; cacheTtl?: number })
  getEntitlements(tenantId: string): Promise<Entitlement>
  checkFeature(tenantId: string, feature: string): Promise<boolean>
  reportUsage(tenantId: string, featureKey: string, quantity?: number): Promise<void>
}
```

**Configuração na tool:**

```typescript
// app.module.ts da tool NF-e
GerenciaXModule.forRoot({
  coreUrl: process.env.GERENCIAX_CORE_URL,             // https://api.gerenciax.com
  apiKey: process.env.GERENCIAX_API_KEY,                // gx_nfe_a3b7c9d2...
  webhookSecret: process.env.GERENCIAX_WEBHOOK_SECRET,  // HMAC secret
  cacheTtl: 300,                                        // cache entitlements por 5min
})
```

**Nota:** Este pacote deve ser implementado **junto com a primeira tool**, quando o caso de uso real guiar as decisões de API. Não implementar antes — vai gerar over-engineering.

---

## 5. Bloco D — Frontend Polish

### D.1 — Campos extras do User na interface frontend

**Prioridade:** 🟡 Baixa.

**O que falta:** A interface `User` no frontend não inclui alguns campos que o backend retorna (ex: `phone`, `timezone`, `avatarUrl`). Adicionar esses campos para que o Shell possa exibir foto e informações completas no header/sidebar.

**Arquivo:** `f-core-ionic/shell/src/app/core/interfaces/auth.interface.ts`

---

### D.2 — Telas de sub-resources (variations, custom-fields)

**Prioridade:** 🟡 Baixa.

**O que falta:** O backend expõe CRUD completo para variações de produto, campos customizados, variações de preço de serviço, fotos e profissionais vinculados. O frontend tem formulários de criação/edição que enviam esses dados, mas **não tem telas dedicadas de listagem/gestão** desses sub-resources individualmente.

**Exemplo:** Não existe uma tela onde o usuário vê "todas as 5 variações deste produto" com opção de editar/deletar cada uma separadamente. Hoje, as variações são gerenciadas inline no formulário de produto.

**Nota:** Isso pode ser suficiente para o MVP. Telas dedicadas são um refinamento de UX para quando houver muitas variações.

---

## 6. Ordem de Implementação Recomendada

```
                   IMPLEMENTAÇÕES PENDENTES
                   ========================

FASE ATUAL (MVP Core standalone)         ✅ COMPLETO
    │
    ▼
A.1 API Keys ───► A.2 Entitlements ───► PRIMEIRA TOOL FUNCIONAL
                                                  │
                           ┌──────────────────────┘
                           ▼
                  A.3 URLs/Secrets ──► A.4 Webhooks
                                            │
                           ┌────────────────┘
                           ▼
                   B.1 Grace Period (pode ser paralelo)
                           │
                           ▼
                   C.1 SDK npm (junto com 1ª tool)
                           │
                           ▼
                  A.5 Usage/Health/Auditoria
                  B.2 SubscribedTools
                  D.1-D.2 Frontend polish
```

**Prioridade imediata:**
1. **A.1 + A.2** → Depois disso, já dá pra desenvolver a primeira tool
2. **B.1** → Melhora UX de cobrança (pode ser feito em paralelo)
3. **A.3 + A.4** → Webhooks para comunicação robusta tool ↔ Core
4. **C.1** → SDK surge naturalmente junto com a primeira tool

---

## 7. Decisões Arquiteturais

### Onde colocar cada componente no Core?

| Componente | Módulo | Justificativa |
|---|---|---|
| API Key (schema, repo, guard) | `auth` | É parte da camada de autenticação |
| Entitlements API | `marketplace` | Usa dados de subscription/plan desse módulo |
| Webhook Dispatch | Novo módulo `webhook` | Responsabilidade própria |
| Usage Tracking | Novo módulo `usage` | Domínio distinto |
| SDK | Pacote npm separado | Consumido por projetos externos |

### JWT do usuário nas tools

O JWT emitido pelo Core contém: `userId`, `tenantId`, `role`, `email`. As tools podem **validar esse JWT diretamente** (usando a mesma `JWT_SECRET` ou chave pública RSA). A API Key é para **chamadas server-to-server** (tool backend → Core backend), não para requests do browser do usuário.

### Sobre feature-gating

- O **Core** responde: *"o plano Básico tem `advanced_reports: false`"*
- A **Tool** decide: *"se `advanced_reports` é false, retorno 403 e mostro tela de upgrade"*

O Core **nunca** sabe o que cada feature significa no domínio da tool. Ele armazena chave-valor. A interpretação é responsabilidade da tool.

---

## Status de Progresso

| Item | Prioridade | Status |
|------|------------|--------|
| A.1 — API Keys (Service Auth) | 🔴 Bloqueante | ⬜ Não iniciado |
| A.2 — Entitlements API | 🔴 Bloqueante | ⬜ Não iniciado |
| A.3 — Registro URLs/Secrets | 🟠 Importante | ⬜ Não iniciado |
| A.4 — Webhook Dispatch | 🟠 Importante | ⬜ Não iniciado |
| A.5 — Usage/Health/Auditoria | 🟡 Melhoria | ⬜ Não iniciado |
| B.1 — Grace Period | 🟠 Importante | ⬜ Não iniciado |
| B.2 — SubscribedTools | 🟡 Baixa | ⬜ Não iniciado |
| C.1 — SDK npm | 🟠 Importante | ⬜ Não iniciado (junto com 1ª tool) |
| D.1 — User interface fields | 🟡 Baixa | ⬜ Não iniciado |
| D.2 — Sub-resources UI | 🟡 Baixa | ⬜ Não iniciado |
