# 10. Error Handling & Logging

> **Logging:** nestjs-pino (structured JSON)  
> **Error handling:** Global HttpExceptionFilter + DomainException mapping  
> **Observabilidade:** Correlation IDs, health check, métricas  
> **Princípio:** Todo erro deve ser rastreável. Nenhum erro silencioso.

---

## 1. Hierarquia de Exceções

```
                  Error
                    │
            ┌───────┴───────┐
            │               │
    HttpException    DomainException
            │               │
    ┌───────┼───────┐       ├── EntityNotFoundException
    │       │       │       ├── DuplicateEntityException
   400     401    403       ├── InvalidStateException
   404     409    500       └── BusinessRuleViolationException
```

### 1.1 DomainException (Base)

```typescript
// src/common/exceptions/domain.exception.ts
export class DomainException extends Error {
  constructor(
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'DomainException';
  }
}
```

### 1.2 Exceções Específicas

```typescript
// src/common/exceptions/entity-not-found.exception.ts
import { DomainException } from './domain.exception';

export class EntityNotFoundException extends DomainException {
  constructor(entity: string, id: string) {
    super(`${entity} com ID ${id} não encontrado`, 'ENTITY_NOT_FOUND');
  }
}

// src/common/exceptions/duplicate-entity.exception.ts
import { DomainException } from './domain.exception';

export class DuplicateEntityException extends DomainException {
  constructor(entity: string, field: string, value: string) {
    super(`${entity} com ${field} "${value}" já existe`, 'DUPLICATE_ENTITY');
  }
}

// src/common/exceptions/invalid-state.exception.ts
import { DomainException } from './domain.exception';

export class InvalidStateException extends DomainException {
  constructor(message: string) {
    super(message, 'INVALID_STATE');
  }
}

// src/common/exceptions/business-rule-violation.exception.ts
import { DomainException } from './domain.exception';

export class BusinessRuleViolationException extends DomainException {
  constructor(message: string, code?: string) {
    super(message, code ?? 'BUSINESS_RULE_VIOLATION');
  }
}
```

---

## 2. Global Exception Filter

```typescript
// src/common/filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { DomainException } from '../exceptions/domain.exception';
import { EntityNotFoundException } from '../exceptions/entity-not-found.exception';
import { DuplicateEntityException } from '../exceptions/duplicate-entity.exception';
import { InvalidStateException } from '../exceptions/invalid-state.exception';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, body } = this.resolveException(exception);

    // Log do erro
    if (statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.url} - ${statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
        {
          tenantId: request['tenantId'],
          userId: request['user']?.sub,
          correlationId: request.headers['x-correlation-id'],
        },
      );
    } else {
      this.logger.warn(
        `${request.method} ${request.url} - ${statusCode}: ${body.message}`,
        {
          tenantId: request['tenantId'],
          userId: request['user']?.sub,
        },
      );
    }

    response.status(statusCode).json(body);
  }

  private resolveException(exception: unknown): { statusCode: number; body: any } {
    // 1. HttpException do NestJS (BadRequestException, NotFoundException, etc.)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // Validação do class-validator
      if (typeof exceptionResponse === 'object' && 'message' in exceptionResponse) {
        const messages = (exceptionResponse as any).message;
        if (Array.isArray(messages)) {
          return {
            statusCode: status,
            body: {
              success: false,
              message: 'Erro de validação',
              error: {
                code: 'VALIDATION_ERROR',
                statusCode: status,
                details: messages.map((msg: string) => ({ message: msg })),
              },
            },
          };
        }
      }

      return {
        statusCode: status,
        body: {
          success: false,
          message: typeof exceptionResponse === 'string'
            ? exceptionResponse
            : (exceptionResponse as any).message ?? 'Erro',
          error: {
            code: this.httpStatusToCode(status),
            statusCode: status,
          },
        },
      };
    }

    // 2. DomainException → mapeamento para HTTP
    if (exception instanceof DomainException) {
      const statusCode = this.domainExceptionToStatus(exception);
      return {
        statusCode,
        body: {
          success: false,
          message: exception.message,
          error: {
            code: exception.code ?? 'DOMAIN_ERROR',
            statusCode,
          },
        },
      };
    }

    // 3. Erro desconhecido → 500
    const message = exception instanceof Error ? exception.message : 'Erro interno do servidor';
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        success: false,
        message: process.env.NODE_ENV === 'production'
          ? 'Erro interno do servidor'
          : message,
        error: {
          code: 'INTERNAL_ERROR',
          statusCode: 500,
        },
      },
    };
  }

  private domainExceptionToStatus(exception: DomainException): number {
    if (exception instanceof EntityNotFoundException) return HttpStatus.NOT_FOUND;
    if (exception instanceof DuplicateEntityException) return HttpStatus.CONFLICT;
    if (exception instanceof InvalidStateException) return HttpStatus.UNPROCESSABLE_ENTITY;
    return HttpStatus.BAD_REQUEST;
  }

  private httpStatusToCode(status: number): string {
    const map: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_ERROR',
    };
    return map[status] ?? 'UNKNOWN_ERROR';
  }
}
```

---

## 3. Logging Estruturado

### 3.1 Setup nestjs-pino

```typescript
// src/common/logging/logger.module.ts
import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    PinoLoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        transport: process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true, singleLine: true } }
          : undefined,

        // Campos extras em cada log
        customProps: (req: any) => ({
          tenantId: req['tenantId'] ?? req.user?.tenantId,
          userId: req.user?.sub,
          correlationId: req.headers['x-correlation-id'] ?? req.id,
          clientType: req['clientType'],
        }),

        // Serializar request (remover dados sensíveis)
        serializers: {
          req: (req: any) => ({
            method: req.method,
            url: req.url,
            query: req.query,
            params: req.params,
            // PROIBIDO logar body, headers.authorization, cookies
          }),
          res: (res: any) => ({
            statusCode: res.statusCode,
          }),
        },

        // Não logar health check
        autoLogging: {
          ignore: (req: any) => req.url === '/api/v1/health',
        },
      },
    }),
  ],
})
export class LoggingModule {}
```

### 3.2 Correlation ID Middleware

```typescript
// src/common/middleware/correlation-id.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const correlationId = (req.headers['x-correlation-id'] as string) ?? randomUUID();
    req.headers['x-correlation-id'] = correlationId;
    res.setHeader('x-correlation-id', correlationId);
    next();
  }
}
```

### 3.3 Uso no Service

```typescript
// ✅ CORRETO — usar Logger do NestJS
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  async processPayment(invoiceId: string): Promise<void> {
    this.logger.log(`Processando pagamento da fatura ${invoiceId}`);
    // ...
    this.logger.warn(`Tentativa de pagamento de fatura já paga: ${invoiceId}`);
    // ...
    this.logger.error(`Falha no pagamento: ${error.message}`, error.stack);
  }
}
```

```typescript
// ❌ PROIBIDO — console.log
console.log('Processando pagamento...'); // NUNCA
```

---

## 4. Health Check

```typescript
// src/common/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { Public } from '../../modules/auth/infrastructure/decorators/public.decorator';

@Public()
@Controller('api/v1/health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: process.env.APP_VERSION ?? '1.0.0',
    };
  }

  @Get('ready')
  readiness() {
    // Verificar conexões (DB, Redis, etc.)
    return {
      status: 'ready',
      checks: {
        database: 'up',
        redis: 'up',
      },
    };
  }
}
```

---

## 5. Registrar no AppModule

```typescript
// src/main.ts
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseWrapperInterceptor } from './common/interceptors/response-wrapper.interceptor';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Pino logger
  app.useLogger(app.get(Logger));

  // Global filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global interceptors
  app.useGlobalInterceptors(new ResponseWrapperInterceptor());

  // ...
}
```

```typescript
// src/app.module.ts
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { LoggingModule } from './common/logging/logger.module';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { ClientTypeMiddleware } from './common/middleware/client-type.middleware';
import { HealthController } from './common/health/health.controller';

@Module({
  imports: [LoggingModule, /* ... modules */],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(CorrelationIdMiddleware, ClientTypeMiddleware)
      .forRoutes('*');
  }
}
```

---

## 6. Regras

| # | Nível | Regra |
|---|-------|-------|
| LOG-001 | 🚫 CRITICAL | Todo service usa `Logger` do NestJS (nunca `console.log`) |
| LOG-002 | ⚠️ REQUIRED | Logs incluem `tenantId`, `userId`, `correlationId` automaticamente |
| LOG-003 | 🚫 CRITICAL | **PROIBIDO** logar passwords, tokens, card data, body de requests |
| LOG-004 | ⚠️ REQUIRED | Erros 5xx logados como `error` com stack trace |
| LOG-005 | ⚠️ REQUIRED | Erros 4xx logados como `warn` |
| LOG-006 | ⚠️ REQUIRED | Health check (`/api/v1/health`) é `@Public()` e não é logado |
| LOG-007 | ⚠️ REQUIRED | DomainException mapeada automaticamente para HTTP status |
| LOG-008 | 🚫 CRITICAL | Erros em produção não expõem detalhes internos (stack, query, etc.) |
| LOG-009 | ⚠️ REQUIRED | Correlation ID propagado via header `x-correlation-id` |
| LOG-010 | ⚠️ REQUIRED | Formato em produção: JSON (para ingestão em ferramentas de observabilidade) |
| LOG-011 | 💡 RECOMMENDED | Formato em dev: pino-pretty (colorido, legível) |

---

> **Skill File v1.0** — Error Handling & Logging  
> **Regra:** Todo erro é rastreável. `console.log` é banido.
