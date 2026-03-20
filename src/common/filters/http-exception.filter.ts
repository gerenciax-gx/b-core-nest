import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  DomainException,
  EntityNotFoundException,
  DuplicateEntityException,
  InvalidStateException,
} from '../exceptions/index.js';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, body } = this.resolveException(exception);

    if (statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.url} - ${statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
        {
          tenantId: (request as unknown as Record<string, unknown>)['tenantId'],
          userId: (request as unknown as Record<string, unknown>)['user']
            ? (
                (request as unknown as Record<string, unknown>)[
                  'user'
                ] as Record<string, unknown>
              )['sub']
            : undefined,
          correlationId: request.headers['x-correlation-id'],
        },
      );
    } else {
      this.logger.warn(
        `${request.method} ${request.url} - ${String(statusCode)}: ${String(body.message)}`,
        {
          tenantId: (request as unknown as Record<string, unknown>)['tenantId'],
          userId: (request as unknown as Record<string, unknown>)['user']
            ? (
                (request as unknown as Record<string, unknown>)[
                  'user'
                ] as Record<string, unknown>
              )['sub']
            : undefined,
        },
      );
    }

    response.status(statusCode).json(body);
  }

  private resolveException(exception: unknown): {
    statusCode: number;
    body: Record<string, unknown>;
  } {
    // 1. HttpException (NestJS built-in)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null &&
        'message' in exceptionResponse
      ) {
        const messages = (exceptionResponse as Record<string, unknown>).message;
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
          message:
            typeof exceptionResponse === 'string'
              ? exceptionResponse
              : (((exceptionResponse as Record<string, unknown>)
                  .message as string) ?? 'Erro'),
          error: {
            code: this.httpStatusToCode(status),
            statusCode: status,
          },
        },
      };
    }

    // 2. DomainException → HTTP mapping
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

    // 3. Unknown error → 500
    const message =
      exception instanceof Error
        ? exception.message
        : 'Erro interno do servidor';
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        success: false,
        message:
          process.env['NODE_ENV'] === 'prod'
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
    if (exception instanceof EntityNotFoundException)
      return HttpStatus.NOT_FOUND;
    if (exception instanceof DuplicateEntityException)
      return HttpStatus.CONFLICT;
    if (exception instanceof InvalidStateException)
      return HttpStatus.UNPROCESSABLE_ENTITY;
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
