# Billing Module — Gap Analysis Report

> **Date:** 2026-03-04  
> **Scope:** `b-core-nest/src/modules/billing/` vs docs `08`, `06`, `09`, `BACKEND-REQUIREMENTS.md`

---

## Executive Summary

The billing module has a **solid foundation** with the core CRUD, CRON jobs, Asaas gateway integration, and invoice lifecycle implemented. However, several features described in the docs are **partially implemented or entirely missing**, notably: SubscribedTools aggregation, upgrade/downgrade with pro-rata, invoice PDF generation, PaymentLogs write-through, notification event handlers, grace/suspension logic, and dunning retries.

| Category | Status |
|----------|--------|
| Invoice Entity & Lifecycle | ✅ Implemented |
| Subscription Entity & Lifecycle | ⚠️ Partial |
| 3 CRON Jobs | ✅ Implemented |
| Asaas Gateway Adapter | ✅ Implemented |
| Webhook Processing | ✅ Implemented |
| Billing Controller (API) | ✅ Implemented |
| Billing Info CRUD | ✅ Implemented |
| SubscribedTools / Multi-Tool Invoicing | ❌ Missing |
| Upgrade/Downgrade + Pro-rata | ❌ Missing |
| Invoice PDF Generation | ❌ Missing |
| PaymentLogs Recording | ❌ Missing (schema exists, no writes) |
| Notification Event Handlers | ❌ Missing |
| Grace Period / Suspension Logic | ❌ Missing |
| Dunning (Retry Failed Payments) | ❌ Missing |
| Trial → First Invoice Generation | ⚠️ Partial |
| Discount/Coupon Support | ❌ Missing (not in docs either) |
| Tax Calculation | ❌ Missing (not in docs either) |

---

## 1. Invoice Entity & Lifecycle

### Doc requirement (08-billing-payments-module.md §1):
> ```
> Invoice lifecycle: PENDING → PAID | OVERDUE → PAID | CANCELLED | REFUNDED
> ```

### Implementation status: ✅ IMPLEMENTED

The `Invoice` entity (`src/modules/billing/domain/entities/invoice.entity.ts`) implements all transitions:

| Transition | Method | Guard / Validation | Status |
|---|---|---|---|
| → `pending` (creation) | `Invoice.create()` | Always starts pending | ✅ |
| `pending` → `paid` | `confirmPayment()` | Rejects if cancelled/refunded | ✅ |
| `pending` → `overdue` | `markAsOverdue()` | Only from pending | ✅ |
| `overdue` → `paid` | `confirmPayment()` | Accepts overdue | ✅ |
| any → `cancelled` | `cancel()` | Rejects if paid | ✅ |
| `paid` → `refunded` | `refund()` | Only from paid | ✅ |

**Invoice Items** are also supported via `addItem()` / `setItems()` with `InvoiceItem` value objects.

---

## 2. Subscription Entity & Lifecycle

### Doc requirement (BACKEND-REQUIREMENTS.md §9.2):
> ```
> 1. Signup → Tenant criado, Subscription com status 'pending' (sem ferramentas)
> 2. Contrata 1ª ferramenta → SubscribedTool criado, invoice gerada
> 3. Pagamento da invoice → status = 'paid', subscription = 'active'
> 4. Mensalmente → Invoice gerada automaticamente
> 5. Não pagou → status = 'overdue', possível suspensão após X dias
> 6. Upgrade → ToolPlan alterado, total recalculado, diferença cobrada proporcional
> 7. Cancelamento de ferramenta → SubscribedTool desativada, total recalculado
> ```

### Implementation status: ⚠️ PARTIAL

**What's implemented:**

| Behavior | Method | Status |
|---|---|---|
| Create subscription (active/trialing) | `Subscription.create()` | ✅ |
| Cancel subscription | `cancel(reason)` | ✅ |
| Mark past_due | `markPastDue()` | ✅ |
| Reactivate after payment | `reactivate()` | ✅ |
| Advance billing date | `advanceBillingDate()` | ✅ |
| Store card token | `setCardToken()` | ✅ |
| Trial status | `trialDays` → `trialing` | ✅ |

**What's MISSING:**

| Feature | Doc Reference | Status |
|---|---|---|
| **Subscription status `'pending'`** at signup | REQ §9.2 step 1: *"Subscription com status 'pending'"* | ❌ Entity enum only has `active|past_due|cancelled|trialing`, no `pending` |
| **`totalAmount` on Subscription** (sum of all tool plans) | REQ §4.16: *"totalAmount: decimal(10,2) — Recalculado soma de todos os planos ativos"* | ❌ Not in entity or schema |
| **`nextDueDate` on Subscription** | REQ §4.16: *"nextDueDate: date"* | ⚠️ Exists as `nextBillingDate` (renamed, functionally equivalent) |
| **Upgrade plan** (`toolPlanId` changed, total recalculated, pro-rata charged) | REQ §9.2 step 6: *"Upgrade → ToolPlan alterado, total recalculado, diferença cobrada proporcional"* | ❌ No upgrade method or endpoint |
| **Downgrade plan** | REQ §9.2 step 7 + RN-043: *"Ao remover uma ferramenta, seta cancelledAt e isActive=false, recalcula total"* | ❌ No downgrade method or endpoint |

---

## 3. SubscribedTools (Multi-Tool Subscription)

### Doc requirement (BACKEND-REQUIREMENTS.md §4.17):
> ```
> SubscribedTool
> ├── subscriptionId: UUID (FK → Subscription)
> ├── toolId: string (FK → Tool)
> ├── toolPlanId: UUID (FK → ToolPlan)
> ├── monthlyPrice: decimal(10,2)
> ├── subscribedAt: datetime
> ├── cancelledAt: datetime (nullable)
> ├── isActive: boolean
> ```

### Doc requirement (BACKEND-REQUIREMENTS.md §1.2):
> *"A fatura mensal é a **soma** dos planos de todas as ferramentas contratadas."*

### Doc requirement (06-data-modeling.md §2.8):
> The `subscribedTools` table is defined in the Drizzle schema:
> ```typescript
> export const subscribedTools = pgTable('subscribed_tools', { ... });
> ```

### Implementation status: ❌ NOT IMPLEMENTED

- The **database schema** (`billing.schema.ts`) does NOT include a `subscribedTools` table.
- No `SubscribedTool` entity exists in the domain layer.
- No grep match for `subscribedTool` in `src/modules/`.
- The current model uses `Subscription → planId (1:1)` instead of the documented `Subscription → N SubscribedTools → N ToolPlans`.

**Impact:** The current implementation can only handle **one plan per subscription** rather than the documented model of **multiple tools per subscription** with independent plan tiers. This means:
- Invoice generation only creates a single line item per subscription.
- No aggregation of multiple tool prices into one invoice.
- Cannot independently upgrade/downgrade individual tools.

---

## 4. CRON Jobs

### 4.1 Generate Invoices (BIL-004)

**Doc requirement (08 §5.1):**
> *"Executa dia 1 de cada mês às 06:00. Gera faturas para todas subscriptions cujo nextBillingDate <= hoje"*

**Implementation:** ✅ `generate-invoices.cron.ts` — `@Cron('0 6 1 * *')`

| Aspect | Doc | Impl | Match? |
|---|---|---|---|
| Schedule | Day 1 at 06:00 | `'0 6 1 * *'` | ✅ |
| Finds due subscriptions | `findDueToBill(today)` | ✅ | ✅ |
| Skips inactive | `subscription.isActive()` | ✅ | ✅ |
| Looks up plan price | via `planRepo` | via `db.select().from(toolPlans)` | ✅ |
| Creates invoice with items | Single item with plan info | Single item | ✅ |
| Due date day 10 (BIL-003) | *"Vencimento dia 10"* | `new Date(y, m, 10)` | ✅ |
| Advances billing date | `advanceBillingDate()` | ✅ | ✅ |
| **Multi-tool aggregation** | REQ: *"soma dos planos de todas as ferramentas"* | ❌ Only one plan per sub | ❌ **GAP** |

### 4.2 Check Overdue (BIL-005)

**Doc requirement (08 §5.2):**
> *"Executa diariamente às 08:00. Marca faturas vencidas como overdue."*

**Implementation:** ✅ `check-overdue.cron.ts` — `@Cron('0 8 * * *')`

| Aspect | Doc | Impl | Match? |
|---|---|---|---|
| Schedule | Daily at 08:00 | `'0 8 * * *'` | ✅ |
| Finds pending invoices past due | `findPendingByDueDate(now)` | ✅ | ✅ |
| Marks as overdue | `invoice.markAsOverdue()` | ✅ | ✅ |
| Emits event | `payment.overdue` | ✅ | ✅ |
| **Suspends subscription after 3+ days** | BIL-012: *"Subscription past_due após 3+ dias"* | ❌ Not implemented | ❌ **GAP** |

### 4.3 Auto-Charge (BIL-006)

**Doc requirement (08 §5.3):**
> *"Executa dia 5 de cada mês às 07:00. Cobra faturas pendentes de assinaturas com cartão salvo."*

**Implementation:** ✅ `auto-charge.cron.ts` — `@Cron('0 7 5 * *')`

| Aspect | Doc | Impl | Match? |
|---|---|---|---|
| Schedule | Day 5 at 07:00 | `'0 7 5 * *'` | ✅ |
| Checks card token | `subscription.cardToken` | ✅ | ✅ |
| Creates charge in Asaas | via `paymentGateway.createCharge()` | ✅ | ✅ |
| Updates invoice external data | `setExternalPaymentData()` | ✅ | ✅ |

---

## 5. Payment Processing via Asaas

### Doc requirement (08 §4.1):
> Gateway adapter with `createCustomer`, `createCharge`, `getCharge`, `refundCharge`, `tokenizeCard`.

### Implementation: ✅ IMPLEMENTED

`AsaasPaymentGateway` (`infrastructure/adapters/secondary/gateway/asaas-payment.gateway.ts`) implements all 5 methods from `PaymentGatewayPort`. Uses `@nestjs/config` for type-safe config injection.

---

## 6. Webhook Handling

### Doc requirements (08 §4.2):
> - BIL-007: *"Webhook retorna 200 SEMPRE (mesmo com erro)"*
> - BIL-013: *"Webhook validado por token ASAAS_WEBHOOK_TOKEN"*

### Implementation: ✅ IMPLEMENTED

`WebhookController` at `POST /billing/webhooks/asaas`:
- `@Public()` decorator (no auth required) ✅
- `@HttpCode(HttpStatus.OK)` always returns 200 ✅
- Token validation via `asaas-access-token` header ✅
- Try/catch wraps processing — errors logged, not thrown ✅
- Handles: `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`, `PAYMENT_REFUNDED` ✅

---

## 7. Billing Controller (API Endpoints)

### Doc requirement (09-api-design-bff.md §4.6):

| Endpoint | Doc | Impl | Match? |
|---|---|---|---|
| `GET /api/v1/billing/invoices` | ✅ | `GET /billing/invoices` | ✅ |
| `GET /api/v1/billing/invoices/:id` | ✅ | `GET /billing/invoices/:id` | ✅ |
| `POST /api/v1/billing/invoices/:id/pay` | ✅ admin | `POST /billing/invoices/:id/pay` | ✅ |
| `GET /api/v1/billing/subscriptions` | ✅ | `GET /billing/subscriptions` | ✅ |
| `POST /api/v1/billing/subscriptions/:id/cancel` | ✅ admin | `POST /billing/subscriptions/:id/cancel` with `@Roles('admin')` | ✅ |
| `GET /api/v1/billing/info` | ✅ admin | `GET /billing/info` | ✅ |
| `PUT /api/v1/billing/info` | ✅ admin | `PUT /billing/info` with `@Roles('admin')` | ✅ |

### Additionally required by BACKEND-REQUIREMENTS.md §5.7 but MISSING:

| Endpoint | Doc Reference | Status |
|---|---|---|
| `DELETE /subscription/tools/:toolId` | *"Remover ferramenta da assinatura"* | ❌ Not implemented |
| `POST /subscription/upgrade` | *"Upgrade de plano (body: { toolId, newPlanId })"* | ❌ Not implemented |
| `GET /subscription/invoices/:id/pdf` | *"Download de fatura em PDF"* | ❌ Not implemented |

---

## 8. Billing Info / Customer Management

### Doc requirement (06 §2.8, REQ §4.24):
> billingInfos table with document, name, email, phone, address fields, and `customerExternalId` for Asaas.

### Implementation: ✅ IMPLEMENTED

- Entity: `BillingInfo` with all address fields ✅
- Repository: `DrizzleBillingInfoRepository` ✅
- Schema: `billingInfos` table with all columns ✅
- Asaas customer creation on first `updateBillingInfo()` call ✅

---

## 9. PaymentLogs

### Doc requirement (06 §2.8):
> ```typescript
> export const paymentLogs = pgTable('payment_logs', {
>   invoiceId, gateway, method, externalId, status, amount, rawPayload, processedAt, ...
> });
> ```

### Implementation: ⚠️ SCHEMA ONLY — NO WRITES

- The `paymentLogs` table is defined in `billing.schema.ts` ✅
- **No code writes to `paymentLogs`** anywhere in the codebase ❌
- The `BillingService.processWebhook()` does NOT log webhook payloads ❌
- The `BillingService.payInvoice()` does NOT create a payment log ❌

**Expected:** Every charge attempt and webhook event should create a `PaymentLog` record for audit trail.

---

## 10. Pro-Rata Calculation

### Doc requirement (BACKEND-REQUIREMENTS.md §9.2 step 6):
> *"Upgrade → ToolPlan alterado, total recalculado, **diferença cobrada proporcional**"*

### Implementation: ❌ NOT IMPLEMENTED

- No pro-rata calculation logic exists anywhere in the billing module.
- No method to compute remaining days in a billing cycle.
- No method to generate a differential invoice for plan changes.

---

## 11. Trial Period → First Invoice

### Doc requirement (BACKEND-REQUIREMENTS.md §9.2):
> *"Signup → Subscription com status 'pending' (sem ferramentas)"*  
> *"Contrata 1ª ferramenta → SubscribedTool criado, invoice gerada"*

### Doc (08 §2.2):
> ```typescript
> static create(props: CreateSubscriptionProps): Subscription {
>   const status: SubscriptionStatus = props.trialDays && props.trialDays > 0 ? 'trialing' : 'active';
> }
> ```

### Implementation: ⚠️ PARTIAL

| Aspect | Status |
|---|---|
| Subscription creation with `trialDays` → `trialing` status | ✅ Entity supports it |
| `isActive()` includes `trialing` | ✅ |
| Trial → invoice generation: When does `trialing` transition to `active`? | ❌ No transition logic |
| Trial period tracking: When does trial end? | ❌ No `trialEndsAt` field |
| First invoice generation on first tool subscription | ❌ No such flow exists |

**Gap:** The entity can be created as `trialing`, but there's no mechanism to:
1. Track when the trial ends.
2. Automatically transition to `active` and generate the first invoice.
3. Handle the first-tool-subscription flow as described in the docs.

---

## 12. Grace Period & Suspension Logic

### Doc requirement (BIL-012, BACKEND-REQUIREMENTS.md §7.5):
> *"Subscription past_due após 3+ dias de atraso → suspender ferramentas"*  
> *"Não pagou → status = 'overdue', possível suspensão após X dias"*

### Implementation: ❌ NOT IMPLEMENTED

- The `CheckOverdueCron` marks invoices as overdue and emits events, but:
  - Does NOT check if a subscription should be marked `past_due` ❌
  - Does NOT suspend tools or access after 3+ days ❌
  - No `subscription.markPastDue()` call in any CRON ❌
- The `markPastDue()` method exists on the entity but is never called by automated processes.
- No guard or middleware checks `subscription.status` to restrict tool access.

---

## 13. Dunning (Retry Failed Payments)

### Doc requirement (08 §5.3, implied by BIL-006):
> Auto-charge runs on day 5 to charge stored cards. But there's no retry mechanism for failed charges.

### Implementation: ❌ NOT IMPLEMENTED

- `AutoChargeCron` attempts one charge per invoice. If it fails, the error is caught and logged, but:
  - No retry counter or retry schedule ❌
  - No escalation (e.g., try again on day 8, day 12) ❌
  - No notification to tenant that auto-charge failed ❌
  - Failed payment counts are not tracked ❌

---

## 14. Invoice PDF Generation

### Doc requirement (BACKEND-REQUIREMENTS.md §5.7):
> | `GET` | `/subscription/invoices/:id/pdf` | Download de fatura em PDF |

### Doc requirement (BACKEND-REQUIREMENTS.md §7.5):
> | RN-047 | Fatura pode ser baixada em PDF. |

### Doc requirement (BACKEND-REQUIREMENTS.md §4.18):
> | pdfUrl: string (nullable) |

### Doc requirement (BACKEND-REQUIREMENTS.md §11):
> *"Fila assíncrona para operações pesadas (geração de PDF, envio de e-mail, notificações)"*

### Implementation: ❌ NOT IMPLEMENTED

- No PDF generation service or library installed.
- No `GET /billing/invoices/:id/pdf` endpoint.
- No `pdfUrl` field on the invoice schema or entity.
- No async queue for PDF generation.

---

## 15. Email Notifications for Invoices

### Doc requirement (BACKEND-REQUIREMENTS.md §8.2):
> *"Fatura: invoice.dueDate - 3 dias → Notificação payment 'Fatura vencendo em 3 dias'"*  
> *"Pagamento: PIX/cartão recebido → Notificação payment"*

### Doc requirement (BACKEND-REQUIREMENTS.md §8.3):
> | E-mail | Sim (toggle) | Fila de e-mails (SendGrid, SES) |

### Implementation: ❌ NOT IMPLEMENTED

- Events `payment.confirmed` and `payment.overdue` are **emitted** by `BillingService` ✅
- But **no `@OnEvent()` handlers exist** anywhere in the codebase to consume them ❌
- No notification creation for billing events ❌
- No email sending service integrated ❌
- No "3 days before due date" reminder CRON ❌

---

## 16. Discount/Coupon Support

### Doc requirement: **Not explicitly in docs**

This feature is not documented in any of the reviewed docs. Neither the data model nor the business rules mention coupons, discounts, or promotional pricing.

### Implementation: ❌ NOT IMPLEMENTED (and not required by docs)

---

## 17. Tax Calculation

### Doc requirement: **Not explicitly in docs**

No mention of tax calculation in the reviewed docs.

### Implementation: ❌ NOT IMPLEMENTED (and not required by docs)

---

## 18. Database Schema Alignment

### Comparison: Doc schema (06 §2.8) vs Implemented schema (`billing.schema.ts`)

| Table | Doc | Impl | Match? |
|---|---|---|---|
| `subscriptions` | ✅ | ✅ | ✅ |
| `subscribed_tools` | ✅ (06 §2.8) | ❌ Missing from schema | ❌ **GAP** |
| `invoices` | ✅ | ✅ | ✅ |
| `invoice_items` | ✅ | ✅ | ✅ |
| `payment_logs` | ✅ | ✅ (schema only) | ⚠️ Schema exists, no usage |
| `billing_infos` | ✅ | ✅ | ✅ |

### Missing columns:

| Table | Column | Doc Reference | Status |
|---|---|---|---|
| `invoices` | `pdfUrl` | REQ §4.18 | ❌ Missing |
| `subscriptions` | `totalAmount` | REQ §4.16: *"Recalculado soma de todos os planos ativos"* | ❌ Missing |
| `subscribed_tools` | `toolPlanId` | REQ §4.17 | ❌ Entire table missing |
| `subscribed_tools` | `monthlyPrice` | REQ §4.17 | ❌ Entire table missing |

---

## 19. Business Rules Compliance

| Rule | Description | Status | Notes |
|------|-------------|--------|-------|
| BIL-001 | Backend gera faturas via CRON. Asaas executa cobranças | ✅ | CRON generates invoices, Asaas charges |
| BIL-002 | Toda fatura tem `referenceMonth` para evitar duplicatas | ⚠️ | Field exists, but no dedup check in generate CRON |
| BIL-003 | Vencimento padrão: dia 10 | ✅ | `new Date(y, m, 10)` |
| BIL-004 | CRON geração: dia 1 às 06:00 | ✅ | `@Cron('0 6 1 * *')` |
| BIL-005 | CRON vencimento: diário às 08:00 | ✅ | `@Cron('0 8 * * *')` |
| BIL-006 | CRON auto-charge: dia 5 às 07:00 | ✅ | `@Cron('0 7 5 * *')` |
| BIL-007 | Webhook retorna 200 SEMPRE | ✅ | `@HttpCode(OK)` + try/catch |
| BIL-008 | Card token na subscription, never full card | ✅ | `setCardToken(token, last4, brand)` |
| BIL-009 | PROIBIDO armazenar número completo do cartão | ✅ | Only token stored |
| BIL-010 | Reembolso só para faturas pagas | ✅ | `refund()` checks `status !== 'paid'` |
| BIL-011 | Cancelamento: apenas admin | ✅ | `@Roles('admin')` on cancel endpoint |
| BIL-012 | past_due após 3+ dias → suspender ferramentas | ❌ | No suspension logic |
| BIL-013 | Webhook validado por token | ✅ | Header check against config |
| BIL-014 | PIX: QR Code + copy-paste | ✅ | Fields in invoice + returned from payInvoice |
| BIL-015 | Boleto: URL + código de barras | ✅ | Fields in invoice + returned from payInvoice |
| BIL-016 | externalId indexado | ✅ | `index('idx_invoices_external_id')` |
| RN-040 | Total mensal = soma de todos os planos | ❌ | Single plan per subscription |
| RN-041 | Assinar ferramenta → SubscribedTool | ❌ | No SubscribedTool entity |
| RN-042 | Upgrade → atualiza toolPlanId, recalcula total | ❌ | No upgrade logic |
| RN-043 | Remover ferramenta → cancelledAt, recalcula total | ❌ | No remove-tool logic |
| RN-044 | Faturas geradas mensalmente | ✅ | CRON on day 1 |
| RN-045 | Status: paid, pending, overdue | ✅ | + cancelled, refunded |
| RN-046 | Subscription status reflete última fatura | ❌ | No auto-sync between invoice status and subscription |
| RN-047 | Fatura pode ser baixada em PDF | ❌ | No PDF endpoint |
| RN-048 | Métodos: cartão, PIX, boleto | ✅ | All three supported |
| RN-049 | Dados de cartão nunca em texto plano | ✅ | Tokenization via Asaas |

---

## 20. Priority Recommendations

### P0 — Critical Gaps (core billing functionality)

1. **SubscribedTools model** — The entire multi-tool-per-subscription model is missing. This is the foundation for accurate invoicing per the docs.
2. **PaymentLogs recording** — Every charge/webhook should write to `payment_logs`. Schema is ready; add writes in `processWebhook()` and `payInvoice()`.
3. **Invoice deduplication** — `GenerateInvoicesCron` should check if an invoice for the same `referenceMonth` + `subscriptionId` already exists before creating a new one (BIL-002).

### P1 — Required by Business Rules

4. **Subscription suspension** (BIL-012) — Add logic in `CheckOverdueCron`: if invoice overdue ≥3 days, call `subscription.markPastDue()` and restrict tool access.
5. **Upgrade/Downgrade flow** — Implement `POST /subscription/upgrade` with pro-rata calculation.
6. **Remove tool** — Implement `DELETE /subscription/tools/:toolId`.
7. **RN-046** — Sync subscription status with latest invoice status.

### P2 — Required Features

8. **Invoice PDF** — Add `GET /billing/invoices/:id/pdf` endpoint using a library like `pdfkit` or `puppeteer`.
9. **Notification event handlers** — Add `@OnEvent('payment.confirmed')` and `@OnEvent('payment.overdue')` handlers to create notifications.
10. **Invoice due reminder** — Add CRON or logic to emit `payment.due_soon` 3 days before `dueDate`.
11. **Trial → Active transition** — Add `trialEndsAt` to subscription entity, CRON to check trial expiration and generate first invoice.

### P3 — Nice-to-Have

12. **Dunning retries** — Track failed charge attempts, schedule retries on escalating schedule.
13. **Email sending** — Integrate SendGrid/SES for invoice emails.
14. **Grace period** — Define configurable grace period before tool suspension.

---

## Appendix: File Reference

| File | Purpose |
|------|---------|
| `domain/entities/invoice.entity.ts` | Invoice aggregate with items |
| `domain/entities/subscription.entity.ts` | Subscription aggregate |
| `domain/entities/billing-info.entity.ts` | Billing info VO |
| `domain/value-objects/money.vo.ts` | Money value object |
| `domain/ports/input/billing.usecase.port.ts` | Use case port (7 methods) |
| `domain/ports/output/invoice.repository.port.ts` | Invoice repo port |
| `domain/ports/output/subscription.repository.port.ts` | Subscription repo port |
| `domain/ports/output/payment-gateway.port.ts` | Asaas gateway port |
| `domain/ports/output/billing-info.repository.port.ts` | Billing info repo port |
| `application/services/billing.service.ts` | Main service (390 lines) |
| `application/crons/generate-invoices.cron.ts` | Monthly invoice generation |
| `application/crons/check-overdue.cron.ts` | Daily overdue check |
| `application/crons/auto-charge.cron.ts` | Monthly auto-charge |
| `infrastructure/adapters/primary/billing.controller.ts` | REST controller (7 endpoints) |
| `infrastructure/adapters/primary/webhook.controller.ts` | Asaas webhook |
| `infrastructure/adapters/secondary/gateway/asaas-payment.gateway.ts` | Asaas HTTP adapter |
| `infrastructure/adapters/secondary/persistence/billing.schema.ts` | Drizzle schema (6 tables) |
| `infrastructure/adapters/secondary/persistence/drizzle-invoice.repository.ts` | Invoice repo |
| `infrastructure/adapters/secondary/persistence/drizzle-subscription.repository.ts` | Subscription repo |
| `infrastructure/adapters/secondary/persistence/drizzle-billing-info.repository.ts` | Billing info repo |
| `billing.module.ts` | Module binding |
