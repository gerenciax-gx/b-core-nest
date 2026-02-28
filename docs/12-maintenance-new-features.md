# 12. Manutenção & Desenvolvimento de Novas Features

> **Objetivo:** Guia de como manter o projeto, adicionar funcionalidades, trocar serviços externos, e operar em produção.  
> **Princípio:** Toda mudança segue o padrão hexagonal. Nenhum atalho.

---

## 1. Adicionar Nova Feature (Dentro de Módulo Existente)

### Checklist

1. Definir o comportamento na **Domain Entity** (novo método)
2. Escrever **testes unitários** para o novo comportamento
3. Se necessário, atualizar **Port** (nova operação)
4. Implementar no **Application Service**
5. Criar/atualizar **DTO** (input + output)
6. Criar/atualizar **Controller** (nova rota)
7. Atualizar **Repository Adapter** (se novo campo/query)
8. Atualizar **Schema Drizzle** → rodar `npm run db:generate`
9. Escrever **teste de integração**
10. Atualizar documentação se necessário

### Exemplo: Adicionar "desconto por quantidade" em Product

```
1. Product entity → addBulkDiscount(minQty, discountPercent)
2. Teste: product.entity.spec.ts → deve aplicar desconto
3. ProductRepositoryPort → sem mudança (usa save/update existente)
4. ProductService → método applyBulkDiscount()
5. ApplyBulkDiscountDto → { minQuantity, discountPercent }
6. ProductController → POST /products/:id/bulk-discount
7. DrizzleProductRepository → ajustar se novo campo
8. product.schema.ts → adicionar coluna bulk_discounts (jsonb)
9. Teste integração → POST /products/:id/bulk-discount → 201
10. Atualizar 09-api-design-bff.md com novo endpoint
```

---

## 2. Criar Novo Módulo

Seguir integralmente o guia **04-module-development-guide.md** (10 passos).

### Resumo Rápido

```bash
# 1. Criar estrutura de pastas
mkdir -p src/modules/{novo-modulo}/{domain/{entities,value-objects,ports/{input,output}},application/{services,dtos,mappers},infrastructure/{controllers,repositories,database}}

# 2. Implementar camadas na ordem:
#    Domain → Application → Infrastructure → Module → AppModule

# 3. Gerar migration
npm run db:generate

# 4. Rodar testes
npm test -- --coverage
```

---

## 3. Trocar Serviço Externo (Adapter Swap)

A arquitetura hexagonal foi escolhida exatamente para este cenário.

### Exemplo: Trocar Asaas por Stripe

```
ANTES:
  BillingModule → { provide: 'PaymentGatewayPort', useClass: AsaasPaymentGateway }

DEPOIS:
  BillingModule → { provide: 'PaymentGatewayPort', useClass: StripePaymentGateway }
```

### Passos

1. Criar novo adapter: `src/modules/billing/infrastructure/gateways/stripe-payment.gateway.ts`
2. Implementar a interface `PaymentGatewayPort`
3. Escrever testes para o novo adapter
4. Alterar **apenas** o `billing.module.ts` (troca do `useClass`)
5. **Nenhuma alteração** em Domain ou Application

```typescript
// src/modules/billing/infrastructure/gateways/stripe-payment.gateway.ts
import { Injectable } from '@nestjs/common';
import { PaymentGatewayPort, CreateChargeInput, ChargeResult } from '../../domain/ports/output/payment-gateway.port';
// import Stripe from 'stripe';

@Injectable()
export class StripePaymentGateway implements PaymentGatewayPort {
  // private stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  async createCustomer(input: any): Promise<{ id: string }> {
    // const customer = await this.stripe.customers.create({ ... });
    // return { id: customer.id };
    throw new Error('Not implemented');
  }

  async createCharge(input: CreateChargeInput): Promise<ChargeResult> {
    // const paymentIntent = await this.stripe.paymentIntents.create({ ... });
    // return { id: paymentIntent.id, status: paymentIntent.status, ... };
    throw new Error('Not implemented');
  }

  async getCharge(chargeId: string): Promise<ChargeResult> {
    throw new Error('Not implemented');
  }

  async refundCharge(chargeId: string): Promise<void> {
    // await this.stripe.refunds.create({ payment_intent: chargeId });
  }

  async tokenizeCard(input: any, customerId: string): Promise<string> {
    throw new Error('Not implemented');
  }
}
```

### Adaptadores Swappáveis

| Port | Adapter Atual | Alternativa |
|------|---------------|-------------|
| PaymentGatewayPort | AsaasPaymentGateway | StripePaymentGateway |
| StoragePort | SupabaseStorageAdapter | S3StorageAdapter |
| EmailSenderPort | ResendEmailAdapter | SendGridEmailAdapter |
| PushNotificationPort | FcmPushAdapter | OneSignalPushAdapter |
| CachePort | UpstashRedisAdapter | MemoryCacheAdapter |
| QueuePort | BullMQAdapter | SQSAdapter |
| PdfGeneratorPort | PuppeteerPdfAdapter | PdfMakePdfAdapter |

---

## 4. Workflow de Deploy

### 4.1 Ambientes

| Ambiente | Branch | URL | Banco |
|----------|--------|-----|-------|
| Development | `develop` | localhost:3000 | local PostgreSQL |
| Staging | `staging` | staging-api.gerenciax.com.br | Supabase staging |
| Production | `main` | api.gerenciax.com.br | Supabase prod |

### 4.2 Pipeline CI/CD (GitHub Actions)

```
  PR → develop          PR → main
       │                     │
  ┌────┴────┐           ┌────┴────┐
  │  lint   │           │  lint   │
  │  test   │           │  test   │
  │  build  │           │  build  │
  └────┬────┘           │  e2e   │
       │                └────┬────┘
  Auto deploy                │
  → Staging             Manual approve
                             │
                        Auto deploy
                        → Production
```

### 4.3 Deploy Checklist

| # | Item | Verificação |
|---|------|-------------|
| 1 | Testes passando | `npm test` green |
| 2 | Cobertura ≥ 75% | `npm run test:cov` |
| 3 | Lint sem erros | `npm run lint` |
| 4 | Build sem erros | `npm run build` |
| 5 | Migrations revisadas | SQL em `drizzle/migrations/` |
| 6 | Env vars configuradas | Railway dashboard |
| 7 | Breaking changes? | Versionamento na API |
| 8 | Rollback plan | Migration down disponível |

---

## 5. Workflow de Migrations em Produção

```
1. Developer altera schema .ts
2. Roda `npm run db:generate` → gera .sql
3. Revisa o SQL gerado
4. Commit: schema + migration juntos
5. PR → Code review inclui revisão do SQL
6. Merge → CI aplica migration em staging
7. Testar em staging
8. Merge → main → CI aplica migration em prod
```

### Regras de Migration

| # | Regra |
|---|-------|
| M-001 | **PROIBIDO** alterar migration já aplicada em prod |
| M-002 | Migration de dados deve ser script separado (seed) |
| M-003 | Colunas novas devem ter DEFAULT ou ser nullable |
| M-004 | Remoção de coluna: primeiro deprecar, depois remover |
| M-005 | Sempre testar migration em staging antes de prod |

---

## 6. PR Workflow

### 6.1 Branch Naming

```
feature/BIL-123-invoice-pdf-generation
fix/AUTH-456-refresh-token-rotation
refactor/PROD-789-product-entity-vo
chore/CI-101-add-e2e-pipeline
```

### 6.2 PR Template

```markdown
## Descrição
Breve descrição da mudança.

## Tipo
- [ ] Feature
- [ ] Bug fix
- [ ] Refactor
- [ ] Chore

## Checklist
- [ ] Testes unitários adicionados/atualizados
- [ ] Testes de integração (se aplicável)
- [ ] Schema Drizzle atualizado (se alteração no banco)
- [ ] Migration gerada e revisada
- [ ] DTO atualizado (se nova propriedade)
- [ ] Documentação atualizada
- [ ] Sem dados sensíveis no código
- [ ] Hexagonal: Domain não importa Infrastructure
- [ ] Controller magro (apenas orquestra)
- [ ] Lint e build passando
```

### 6.3 Code Review Checklist

| Aspecto | O que verificar |
|---------|-----------------|
| Hexagonal | Domain não depende de Infrastructure? |
| Ports | Novo comportamento externo tem Port? |
| Tests | Testes cobrem happy path + edge cases? |
| Security | Dados sensíveis expostos? Filtro de tenant? |
| Performance | N+1 queries? Paginação correta? |
| Naming | Convenções seguidas? (kebab-case files, PascalCase classes) |

---

## 7. Troubleshooting Comum

### 7.1 Erros de Tenant

```
Problema: "Tenant não identificado"
Causa: TenantGuard não encontrou tenantId no JWT
Solução: Verificar se token tem claim tenantId. Se rota pública, usar @Public()
```

### 7.2 Erros de Migration

```
Problema: "relation already exists"
Causa: Migration foi rodada manualmente e depois via CLI
Solução: Verificar tabela __drizzle_migrations. Não rodar migrations manuais
```

### 7.3 Erros de Port/Adapter

```
Problema: "Nest can't resolve dependencies of XService"
Causa: Port não está vinculado no module
Solução: Verificar { provide: 'PortName', useClass: AdapterClass } no module
```

### 7.4 Performance

```
Problema: Queries lentas
Diagnóstico: 
  1. Verificar se tenant_id tem índice
  2. Verificar se há N+1 queries (usar EXPLAIN ANALYZE)
  3. Verificar se paginação está sendo aplicada
Solução: Adicionar índice, usar query com join, limitar resultados
```

---

## 8. Monitoramento em Produção

### 8.1 Endpoints de Monitoramento

| Endpoint | Propósito |
|----------|-----------|
| `GET /api/v1/health` | Health check (uptime, version) |
| `GET /api/v1/health/ready` | Readiness (DB + Redis up?) |

### 8.2 Métricas Chave

| Métrica | Alerta se |
|---------|-----------|
| Response time p95 | > 500ms |
| Error rate | > 1% |
| DB connection pool | > 80% utilizado |
| Memory usage | > 80% |
| Faturas overdue | > 5% do total |

### 8.3 Logs — O que Monitorar

```
level: error → Alertar imediatamente (Slack/Discord)
level: warn  → Revisar diariamente
level: info  → Referência para debug
```

---

## 9. Regras de Manutenção

| # | Nível | Regra |
|---|-------|-------|
| MNT-001 | ⚠️ REQUIRED | Toda feature segue os 10 passos do módulo development guide |
| MNT-002 | 🚫 CRITICAL | Adapter swap: alterar apenas module binding, nunca domain/application |
| MNT-003 | 🚫 CRITICAL | **PROIBIDO** fazer hotfix direto em prod sem PR |
| MNT-004 | ⚠️ REQUIRED | Migrations: sempre staging antes de prod |
| MNT-005 | ⚠️ REQUIRED | Colunas removidas: deprecar primeiro (1 release), remover depois |
| MNT-006 | 💡 RECOMMENDED | Dependências: atualizar semanalmente com `npm audit` |
| MNT-007 | ⚠️ REQUIRED | Secrets: rotacionar a cada 90 dias |
| MNT-008 | ⚠️ REQUIRED | Testes: coverage não pode diminuir em PR |
| MNT-009 | ⚠️ REQUIRED | Health check monitorado 24/7 |
| MNT-010 | ⚠️ REQUIRED | Backups do banco: diários (Supabase automático) |

---

## 10. Roadmap de Implementação — Referência

| Fase | Módulos | Duração |
|------|---------|---------|
| 1 | Setup + Auth + Tenant | 2 semanas |
| 2 | Product + Service | 2 semanas |
| 3 | Collaborator + Permissions | 1.5 semanas |
| 4 | Marketplace + Billing (Básico) | 3 semanas |
| 5 | Billing (Asaas completo) + Webhooks | 2 semanas |
| 6 | Notifications + Settings | 1.5 semanas |
| 7 | Dashboard + BFF Mobile | 1 semana |
| 8 | Testes E2E + Polish + Deploy | 1.5 semanas |

**Total estimado: 14-16 semanas**

---

> **Skill File v1.0** — Manutenção & Novas Features  
> **Regra:** O sistema é projetado para mudança. A arquitetura hexagonal garante que mudanças sejam localizadas e seguras.
