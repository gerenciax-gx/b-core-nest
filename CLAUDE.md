# CLAUDE.md — GerenciaX Backend

Este é o backend do **GerenciaX**, um SaaS multi-tenant de gestão empresarial.

## Stack
NestJS 10+ · TypeScript 5.4+ strict · Supabase (PostgreSQL 16+) · Drizzle ORM · Upstash Redis · BullMQ · Asaas

## Arquitetura
Modular Monolith + **Hexagonal Architecture** (Ports & Adapters). Domain NUNCA importa Infrastructure.

## Antes de Codar — Leia Primeiro
1. **`docs/00-ai-system-prompt.md`** — System prompt com role, task routing, constraints, self-check
2. Depois navegue pelos docs específicos conforme a tarefa (mapa completo no system prompt)

## Regras Absolutas
- Domain NUNCA importa Infrastructure (R-001)
- PROIBIDO `any` — use `unknown` (C-002)
- Toda query de negócio filtra por `tenant_id` (SEC-012)
- Entity valida seu próprio estado (R-005)
- Services injetam via `@Inject('PortName')` string token (R-008)
- Nunca retornar Entity fora do Service — sempre DTO (C-015)
- PROIBIDO `.then/.catch` — sempre `async/await` (C-010)
- PROIBIDO `console.log` — usar Logger do NestJS (LOG-001)
- PROIBIDO armazenar dados de cartão (BIL-009)
- class-validator com whitelist + forbidNonWhitelisted (SEC-009)
- Valores monetários: `numeric(10, 2)` no schema, `parseFloat()` no mapper, `Money` VO para aritmética — PROIBIDO `float`/`integer` (D-005, C-021)

## Estrutura de Módulos
```
src/modules/{module}/
  domain/         → Entities, Value Objects, Ports (interfaces)
  application/    → Services, DTOs, Mappers
  infrastructure/ → Controllers, Repositories (Drizzle), Adapters
  {module}.module.ts → Port→Adapter binding
```

## Comandos
```bash
npm run start:dev        # Dev server
npm run test             # Unit tests
npm run test:e2e         # E2E tests
npm run test:cov         # Coverage
npm run db:generate      # Gerar migration Drizzle
npm run db:migrate       # Aplicar migration
npm run lint             # ESLint
npm run build            # Production build
```

## Docs Completos
Todos em `docs/` — 12 skill files + system prompt. Ver `docs/00-ai-system-prompt.md` seção 9 para índice.
