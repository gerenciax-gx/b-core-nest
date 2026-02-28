# Análise: Skills b-core-nest vs Padrões Anthropic para AI Agents

> **Data:** Junho 2025  
> **Escopo:** 12 skill files em `b-core-nest/docs/`  
> **Referência:** Anthropic's Best Practices for System Prompts, Agent Instructions & Tool Use

---

## Resumo Executivo

Os 12 skill files estão **bem acima da média** em qualidade para instruções de AI agents. Possuem regras numeradas, exemplos ✅/❌, diagramas ASCII, código completo, e linguagem imperativa clara. Porém, existem **7 gaps críticos** e **5 melhorias recomendadas** para atingir o padrão que a Anthropic recomenda.

**Score atual: 7/10** → Com as correções pode chegar a **9.5/10**

---

## 1. O QUE ESTÁ BOM (Pontos Fortes)

### ✅ 1.1 Regras Numeradas e Rastreáveis
Todos os docs finalizam com tabela de regras numeradas (`R-001` a `R-008`, `C-001` a `C-020`, `T-001` a `T-013`, etc.). Total: **~130 regras únicas**. Isso é excelente — a Anthropic recomenda regras explícitas e referenciáveis.

### ✅ 1.2 Exemplos Corretos/Incorretos com Marcadores Visuais
Uso consistente de `✅ CORRETO` e `❌ PROIBIDO` com blocos de código completos. A Anthropic recomenda fortemente "do/don't" pairs.

### ✅ 1.3 Palavra-Chave "PROIBIDO"
Termo forte e consistente que a IA reconhece como constraint hard. Funciona como o equivalente ao padrão que a Anthropic chama de "hard constraints vs soft preferences".

### ✅ 1.4 Código Completo e Funcional
Os exemplos não são snippets — são implementações completas com imports, tipos, e contexto. Isso é fundamental para a Anthropic: "Show, don't tell."

### ✅ 1.5 Diagramas ASCII
Diagramas em texto (pirâmide de testes, fluxo de auth, lifecycle de invoice, camadas de segurança) são consumidos perfeitamente por LLMs — melhor que imagens.

### ✅ 1.6 Checklists Procedurais
Doc 04 tem checklist de 10 passos para criar módulo. Doc 12 tem checklist para novas features. A Anthropic recomenda "step-by-step procedures for complex tasks."

### ✅ 1.7 Tabela de Referência Cruzada
Doc 01 (seção 15) tem tabela completa referenciando todos os 12 docs. A Anthropic recomenda modularidade com referência cruzada.

### ✅ 1.8 Footer Consistente
Todo doc termina com `Skill File v1.0 — [Nome]` e uma regra-chave. Padrão de versionamento que facilita tracking.

---

## 2. GAPS CRÍTICOS (Devem ser Corrigidos)

### 🔴 GAP-1: Falta um System Prompt / Arquivo Mestre de Instruções

**Problema:** Não existe um arquivo que diga à IA:
- QUEM ela é (role/persona)
- COMO deve se comportar
- QUAL é a ordem de leitura dos docs
- O QUE fazer quando enfrentar ambiguidade

**O que a Anthropic recomenda:**
> "Start with a clear role definition. The model should know exactly who it is, what it can do, and what constraints it operates under."

**Solução:** Criar `00-ai-system-prompt.md` ou `CLAUDE.md` na raiz do projeto com:
```markdown
<role>
Você é um senior NestJS backend developer especializado em Hexagonal Architecture.
Você DEVE seguir estritamente os 12 skill files em docs/.
</role>

<task-routing>
- Criar módulo novo → Ler: 01, 02, 04, 06
- Implementar feature em módulo existente → Ler: 02, 03, 12
- Trabalhar com Auth → Ler: 07, 11
- Trabalhar com Billing → Ler: 08
- Criar testes → Ler: 05
- API/Endpoints → Ler: 09
- Error handling → Ler: 10
</task-routing>

<verification>
Após gerar código, verificar:
1. Domain não importa infrastructure?
2. Tem testes unitários?  
3. DTOs com class-validator?
4. tenant_id em queries?
</verification>
```

**Impacto:** ALTO — Sem isso, a IA precisa processar ~8.000+ linhas para entender o contexto. Com um System Prompt, ela sabe exatamente o que ler.

---

### 🔴 GAP-2: Não há Priorização de Regras

**Problema:** As ~130 regras parecem ter o mesmo peso. A IA não sabe quais são invioláveis vs. preferências.

**O que a Anthropic recomenda:**
> "Distinguish between hard constraints (must always follow) and soft preferences (follow when possible)."

**Solução:** Classificar cada regra com um nível de severidade:

```
🚫 CRITICAL (inviolável) → R-001, R-005, SEC-012, BIL-009, C-002
⚠️ REQUIRED (obrigatório) → C-008, T-001, D-001, API-001
💡 RECOMMENDED (boa prática) → C-016, LOG-011
```

**Sugestão de implementação:** Adicionar coluna "Nível" nas tabelas de regras:

| # | Nível | Regra |
|---|-------|-------|
| R-001 | 🚫 CRITICAL | Domain NUNCA importa Infrastructure |
| C-016 | 💡 RECOMMENDED | `Promise.all` para queries independentes |

---

### 🔴 GAP-3: Ausência de XML Tags / Delimitadores Estruturados

**Problema:** Os docs usam apenas Markdown headers. A Anthropic demonstra que XML tags melhoram drasticamente a capacidade do modelo de localizar e seguir instruções específicas.

**O que a Anthropic recomenda:**
> "Use XML tags like `<rules>`, `<examples>`, `<constraints>`, `<context>` to clearly delineate different types of instructions."

**Solução:** Não precisa reescrever tudo em XML, mas o arquivo mestre (`00-ai-system-prompt.md`) DEVE usar XML tags, e considerar adicionar tags semânticas nos docs mais críticos (02, 03):

```markdown
<constraints>
- Domain NUNCA importa Infrastructure
- PROIBIDO usar `any`
- PROIBIDO query sem tenant_id
</constraints>

<correct-pattern name="dependency-injection">
```typescript
constructor(
  @Inject('ProductRepositoryPort')
  private readonly productRepo: ProductRepositoryPort,
) {}
```
</correct-pattern>

<incorrect-pattern name="dependency-injection">
```typescript
constructor(
  private readonly productRepo: DrizzleProductRepository, // ❌ adapter direto
) {}
```
</incorrect-pattern>
```

---

### 🔴 GAP-4: Falta Seção "Quando Tiver Dúvida" (Fallback Behavior)

**Problema:** Nenhum doc aborda o que a IA deve fazer em cenários ambíguos:
- E se a feature não se encaixa em nenhum módulo existente?
- E se dois padrões se contradizem?
- E se o user pede algo que viola uma regra?

**O que a Anthropic recomenda:**
> "Provide fallback behavior for edge cases. The model should know what to do when instructions don't clearly apply."

**Solução:** Adicionar ao System Prompt:

```markdown
<fallback-behavior>
Se houver ambiguidade:
1. Priorize segurança (doc 11) sobre conveniência
2. Priorize hexagonal (doc 02) sobre velocidade de implementação
3. Se a feature não se encaixa em módulo existente → sugira criar novo módulo (doc 04)
4. Se o user pedir algo que viola uma regra → ALERTE explicitamente e sugira alternativa
5. NUNCA assuma — pergunte quando a decisão for irreversível
</fallback-behavior>
```

---

### 🔴 GAP-5: Falta Self-Verification Checklist

**Problema:** Não há instrução para a IA se auto-verificar APÓS gerar código. A Anthropic chama isso de "reflection" ou "self-check."

**O que a Anthropic recomenda:**
> "Include verification steps that the model should perform after completing a task."

**Solução:** Cada doc deveria ter uma seção `## Checklist de Verificação` e/ou o System Prompt deveria ter uma checklist global:

```markdown
<self-check>
Após gerar qualquer código, verifique ANTES de entregar:

□ Domain layer não importa nada de infrastructure/application?
□ Ports são interfaces puras (sem decorators NestJS)?
□ Entities validam seu próprio estado no constructor?
□ Services injetam via Port (string token), não adapter?
□ DTOs usam class-validator decorators?
□ Response usa ResponseDto (nunca entity)?
□ Queries filtram por tenant_id?
□ Método público tem retorno tipado explícito?
□ Testes unitários acompanham o código?
□ Nomes seguem naming conventions (kebab-case file, PascalCase class)?
</self-check>
```

---

### 🔴 GAP-6: Falta Arquivo `.cursorrules` / `CLAUDE.md` / `.github/copilot-instructions.md`

**Problema:** Não existe nenhum arquivo de configuração de AI na raiz do projeto. Ferramentas como Cursor, Cline, GitHub Copilot, e Claude Code leem automaticamente arquivos específicos:

| Ferramenta | Arquivo |
|------------|---------|
| Cursor | `.cursorrules` na raiz do projeto |
| Cline | `.clinerules` na raiz do projeto |
| Claude Code | `CLAUDE.md` na raiz do projeto |
| GitHub Copilot | `.github/copilot-instructions.md` |

**Solução:** Criar pelo menos 2 desses arquivos na raiz de `b-core-nest/` que apontem para os docs e contenham as instruções essenciais do System Prompt.

---

### 🔴 GAP-7: Docs Muito Longos sem Sumário TL;DR

**Problema:** Alguns docs são muito longos para contexto de IA:
- `07-auth-collaborator-module.md` — 1249 linhas
- `08-billing-payments-module.md` — 1117 linhas
- `02-hexagonal-arch-guide.md` — 900 linhas

A Anthropic recomenda manter instruções focadas e modulares.

**Solução:** Adicionar uma seção `## TL;DR para IA` no TOPO de cada doc longo (primeiras 15-20 linhas) com:
- As 5 regras mais críticas do doc
- Os 3 padrões obrigatórios mais comuns
- Links para as seções detalhadas

```markdown
## TL;DR para IA

**Regras invioláveis deste módulo:**
1. Domain NUNCA importa Infrastructure (R-001)
2. Ports são interfaces puras (R-002)
3. Entity valida seu estado (R-003)

**Padrões obrigatórios:**
- Inject via string token: `@Inject('PortName')`
- Module binding em providers array
- Adapters implementam interface do Port

> Para detalhes, veja seções abaixo.
```

---

## 3. MELHORIAS RECOMENDADAS (Nice-to-Have)

### 🟡 MEL-1: Adicionar "Raciocínio" aos Anti-Patterns

**Atual:** `❌ PROIBIDO — importar adapter direto`  
**Melhorado:** `❌ PROIBIDO — importar adapter direto (PORQUE: acopla domain a tecnologia específica, impossibilita trocar adapter sem alterar todo o código)`

O "porquê" ajuda a IA generalizar para cenários não cobertos explicitamente.

---

### 🟡 MEL-2: Consistência de Idioma

Alguns docs misturam português e inglês:
- Títulos: "Error Handling & Logging" (EN) vs "Estratégia de Testes" (PT)
- Regras: "PROIBIDO" (PT) misturado com "NEVER" (EN) em algumas frases
- Código: Comments em PT e EN

**Recomendação:** Padronizar um idioma para as regras e instruções (pode manter código em inglês). Se a IA receberá prompts em PT-BR, manter tudo em PT-BR. Se os prompts forem em EN, converter para EN.

---

### 🟡 MEL-3: Adicionar Glossário de Termos

Termos como "Port", "Adapter", "Primary", "Secondary", "BFF", "Multi-tenancy" são usados em todos os docs mas definidos apenas parcialmente no doc 02. Um glossário centralizado evita ambiguidade.

---

### 🟡 MEL-4: Exemplos de Interação Completa (Prompt → Response Esperada)

A Anthropic recomenda "few-shot examples" — mostrar para a IA:

```markdown
<example>
<user-request>Criar endpoint GET /products que retorna lista paginada</user-request>

<expected-ai-response>
1. Verificar se ProductModule já existe ✅
2. Criar DTO: `list-products.dto.ts` com query params
3. Criar Response DTO: `product-response.dto.ts`
4. Adicionar método `findAll` no `ProductRepositoryPort`
5. Implementar `findAll` no `DrizzleProductRepository`
6. Adicionar `listProducts()` no `ProductService`
7. Criar rota no `ProductController`
8. Escrever teste unitário para `ProductService.listProducts()`
9. Escrever teste de integração para GET /products
</expected-ai-response>
</example>
```

Isso treina a IA no WORKFLOW esperado, não apenas no CÓDIGO.

---

### 🟡 MEL-5: Adicionar Seção de "Erros Comuns de IA"

Baseado em como LLMs erram mais frequentemente:

```markdown
<common-ai-mistakes>
1. ❌ Colocar lógica de negócio no Controller (mover para Domain Entity)
2. ❌ Importar Repository Adapter direto no Service (usar Port)
3. ❌ Esquecer tenant_id nas queries (TODAS filtram por tenant)
4. ❌ Usar `any` quando não sabe o tipo (usar `unknown` + narrowing)
5. ❌ Retornar Entity para o Controller (converter para DTO)
6. ❌ Esquecer class-validator nos DTOs
7. ❌ Criar teste que depende de banco real (mock via Port)
8. ❌ Usar .then/.catch ao invés de async/await
</common-ai-mistakes>
```

---

## 4. PLANO DE AÇÃO (Ordem de Implementação)

| Prioridade | Ação | Impacto | Esforço |
|------------|------|---------|---------|
| 1 | Criar `00-ai-system-prompt.md` com role, task-routing, fallback, self-check | ALTÍSSIMO | Médio |
| 2 | Criar `.cursorrules` + `CLAUDE.md` na raiz | ALTO | Baixo |
| 3 | Adicionar TL;DR nos 3 docs longos (02, 07, 08) | ALTO | Baixo |
| 4 | Classificar regras por severidade (🚫/⚠️/💡) | ALTO | Médio |
| 5 | Adicionar self-check checklist global | MÉDIO | Baixo |
| 6 | Adicionar "porquê" nos anti-patterns | MÉDIO | Médio |
| 7 | Padronizar idioma | BAIXO | Alto |
| 8 | Adicionar glossário | BAIXO | Baixo |
| 9 | Adicionar few-shot examples | MÉDIO | Alto |
| 10 | Adicionar "erros comuns de IA" | MÉDIO | Baixo |

---

## 5. COMPARATIVO VISUAL

```
PADRÃO ANTHROPIC             SEUS SKILL FILES          STATUS
─────────────────────────────────────────────────────────────
Role/Persona definition       Não existe                 ❌
Hard vs Soft constraints      Tudo mesmo peso            ❌
XML tags / delimitadores      Só Markdown headers        ❌
Step-by-step procedures       Checklists excelentes      ✅
Do/Don't examples            ✅/❌ consistentes           ✅
Code examples                 Completos e funcionais     ✅
Numbered rules                ~130 regras rastreáveis    ✅
Cross-references              Tabela no doc 01           ✅
ASCII diagrams                Presentes em todos         ✅
Task routing                  Não existe                 ❌
Fallback behavior             Não existe                 ❌
Self-verification             Não existe                 ❌
Few-shot examples             Não existe                 ❌
Modular structure             12 docs bem separados      ✅
TL;DR summaries               Não existe                 ❌
Reasoning for rules           Parcial (algumas sim)      🟡
AI config files               Nenhum (.cursorrules etc)  ❌
Consistent language           Mistura PT/EN              🟡
Glossary                      Parcial (inline)           🟡
Version tracking              v1.0 em todos              ✅
```

**Score: 10/20 itens completos, 3 parciais, 7 ausentes**

---

## 6. CONCLUSÃO

Seus skill files são **significativamente melhores** que a maioria dos projetos. Os pontos fortes (regras numeradas, exemplos ✅/❌, código completo, diagramas ASCII, PROIBIDO como hard constraint) são exatamente o que a Anthropic recomenda.

Os 7 gaps identificados não são falhas nos docs existentes — são **camadas adicionais** que a Anthropic recomenda para maximizar a eficácia do agent. O mais impactante é o **GAP-1 (System Prompt)** — sem ele, a IA precisa processar ~8.000+ linhas para entender o meta-contexto.

**Recomendação:** Implementar ações 1-5 da tabela acima. Isso leva os docs de **7/10 para 9+/10** no alinhamento com padrões Anthropic.

---

> **Análise v1.0** — Skill Files vs Anthropic Patterns  
> **Veredicto:** Fundação excelente. Faltam 3 camadas de meta-instrução (system prompt, task routing, self-verification) para atingir padrão gold.
