import { Inject, Injectable } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from '../../../../../../common/database/database.module.js';
import type {
  DashboardRepositoryPort,
  DashboardMetrics,
} from '../../../../domain/ports/output/dashboard.repository.port.js';
import { notifications } from '../../../../../notification/infrastructure/adapters/secondary/persistence/notification.schema.js';
import { tenantToolSubscriptions, toolPlans } from '../../../../../marketplace/infrastructure/adapters/secondary/persistence/marketplace.schema.js';
import { collaborators } from '../../../../../collaborator/infrastructure/adapters/secondary/persistence/collaborator.schema.js';
import { products } from '../../../../../product/infrastructure/adapters/secondary/persistence/product.schema.js';
import { services } from '../../../../../service/infrastructure/adapters/secondary/persistence/service.schema.js';
import { subscriptions } from '../../../../../billing/infrastructure/adapters/secondary/persistence/billing.schema.js';

@Injectable()
export class DrizzleDashboardRepository implements DashboardRepositoryPort {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase,
  ) {}

  async getMetrics(tenantId: string): Promise<DashboardMetrics> {
    const [
      toolsResult,
      notifResult,
      collabResult,
      prodResult,
      svcResult,
      subResult,
    ] = await Promise.all([
      // Active tools count + total amount in a single query
      this.db
        .select({
          count: sql<number>`count(*)::int`,
          totalAmount: sql<string>`coalesce(sum(${toolPlans.price}), 0)`,
        })
        .from(tenantToolSubscriptions)
        .innerJoin(toolPlans, eq(toolPlans.id, tenantToolSubscriptions.planId))
        .where(
          and(
            eq(tenantToolSubscriptions.tenantId, tenantId),
            eq(tenantToolSubscriptions.status, 'active'),
          ),
        ),

      // Unread notifications count
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(notifications)
        .where(
          and(
            eq(notifications.tenantId, tenantId),
            eq(notifications.isRead, false),
          ),
        ),

      // Active collaborators count
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(collaborators)
        .where(
          and(
            eq(collaborators.tenantId, tenantId),
            eq(collaborators.status, 'active'),
          ),
        ),

      // Total products count
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(products)
        .where(eq(products.tenantId, tenantId)),

      // Total services count
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(services)
        .where(eq(services.tenantId, tenantId)),

      // Active subscription (billing)
      this.db
        .select({
          status: subscriptions.status,
          nextBillingDate: subscriptions.nextBillingDate,
        })
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.tenantId, tenantId),
            eq(subscriptions.status, 'active'),
          ),
        )
        .limit(1),
    ]);

    const totalAmount = Number(toolsResult[0]?.totalAmount ?? 0);
    const activeSub = subResult[0] ?? null;

    return {
      activeToolsCount: toolsResult[0]?.count ?? 0,
      unreadNotifications: notifResult[0]?.count ?? 0,
      activeCollaborators: collabResult[0]?.count ?? 0,
      totalProducts: prodResult[0]?.count ?? 0,
      totalServices: svcResult[0]?.count ?? 0,
      subscription: activeSub
        ? {
            status: activeSub.status,
            nextBillingDate: activeSub.nextBillingDate ?? null,
            totalAmount,
          }
        : null,
    };
  }
}
