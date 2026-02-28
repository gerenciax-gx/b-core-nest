# GerenciaX Backend — Copilot Instructions

## Architecture
This is a **NestJS 10+** backend using **Hexagonal Architecture** (Ports & Adapters) with **Modular Monolith** pattern.

## Critical Rules
- Domain layer NEVER imports from infrastructure/ or application/
- Ports are pure TypeScript interfaces (no NestJS decorators)
- Entities validate their own state in constructors/methods
- Services inject via `@Inject('PortName')` string token, never adapter class directly
- FORBIDDEN: `any` type — use `unknown` + type narrowing
- FORBIDDEN: `.then/.catch` — always `async/await`
- Every business query MUST filter by `tenant_id`
- Never return Entity outside Service — always convert to DTO via Mapper
- DTOs must use class-validator decorators with `whitelist: true, forbidNonWhitelisted: true`
- FORBIDDEN: `console.log` — use NestJS Logger
- FORBIDDEN: storing full card numbers — only tokens
- FORBIDDEN: `float`/`real`/`integer` for monetary values — always `numeric(10, 2)` in Drizzle schema
- Monetary fields: `parseFloat()` conversion ONLY in Mapper (Drizzle returns numeric as string)
- Monetary arithmetic via `Money` value object — never raw math in controllers/services
- DTO money validation: `@IsNumber({ maxDecimalPlaces: 2 }) @Min(0)`
- Login errors must be generic ("Credenciais inválidas") — never reveal if email exists

## Module Structure
```
src/modules/{module}/
  domain/          → Entities, Value Objects, Ports (interfaces)
  application/     → Services, DTOs, Mappers
  infrastructure/  → Controllers, Repositories, Adapters
  {module}.module.ts
```

## Stack
NestJS 10+ · TypeScript 5.4+ strict · Supabase (PostgreSQL 16+) · Drizzle ORM · Upstash Redis · BullMQ · Asaas

## Full Documentation
See `docs/00-ai-system-prompt.md` for complete AI instructions including task routing, self-verification checklist, and 130+ codified rules across 12 skill files.
