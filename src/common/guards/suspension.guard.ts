import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, sql } from 'drizzle-orm';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { DATABASE_CONNECTION } from '../database/database.module.js';
import { invoices } from '../../modules/billing/infrastructure/adapters/secondary/persistence/billing.schema.js';

/**
 * Bloqueia o acesso de tenants com faturas vencidas há 3+ dias.
 *
 * Exceções:
 * - Endpoints públicos (@Public)
 * - Endpoints de billing (para que o tenant possa pagar a fatura)
 * - Endpoints de auth (login, refresh)
 */
@Injectable()
export class SuspensionGuard implements CanActivate {
  private static readonly SUSPENSION_DAYS = 3;
  private static readonly CACHE_TTL = 60_000; // 60 seconds

  private readonly cache = new Map<string, { suspended: boolean; at: number }>();

  constructor(
    private readonly reflector: Reflector,

    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // Permitir endpoints de billing e auth (para pagar faturas / autenticar)
    const request = context
      .switchToHttp()
      .getRequest<Record<string, unknown>>();
    const url = (request['url'] as string) ?? '';
    const pathname = url.split('?')[0];
    if (pathname.includes('/billing') || pathname.includes('/auth')) {
      return true;
    }

    const user = request['user'] as Record<string, unknown> | undefined;

    // Master nunca é bloqueado por suspensão
    if (user?.['role'] === 'master') return true;

    const tenantId = user?.['tenantId'] as string | undefined;
    if (!tenantId) return true; // JwtAuthGuard / TenantGuard will handle

    // Check in-memory cache first
    const cached = this.cache.get(tenantId);
    if (cached && Date.now() - cached.at < SuspensionGuard.CACHE_TTL) {
      if (cached.suspended) {
        throw new ForbiddenException(
          'Acesso bloqueado: você possui faturas em atraso há mais de 3 dias. Regularize no painel de billing.',
        );
      }
      return true;
    }

    // Consulta leve: existe fatura overdue com 3+ dias?
    const rows = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(invoices)
      .where(
        and(
          eq(invoices.tenantId, tenantId),
          eq(invoices.status, 'overdue'),
          sql`${invoices.dueDate} <= (CURRENT_DATE - ${SuspensionGuard.SUSPENSION_DAYS}::int)`,
        ),
      );

    const overdueCount = rows[0]?.count ?? 0;
    const suspended = overdueCount > 0;

    // Cache the result
    this.cache.set(tenantId, { suspended, at: Date.now() });

    if (suspended) {
      throw new ForbiddenException(
        'Acesso bloqueado: você possui faturas em atraso há mais de 3 dias. Regularize no painel de billing.',
      );
    }

    return true;
  }
}
