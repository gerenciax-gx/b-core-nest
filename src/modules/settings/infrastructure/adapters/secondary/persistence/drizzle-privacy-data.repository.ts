import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from '../../../../../../common/database/database.module.js';
import type { DbClient } from '../../../../../../common/database/transaction.helper.js';
import type { PrivacyDataRepositoryPort } from '../../../../domain/ports/output/privacy-data.repository.port.js';
import { tenants } from '../../../../../tenant/infrastructure/adapters/secondary/persistence/tenant.schema.js';
import { categories } from '../../../../../category/infrastructure/adapters/secondary/persistence/category.schema.js';
import { products, productVariations, productPhotos, productCustomFields } from '../../../../../product/infrastructure/adapters/secondary/persistence/product.schema.js';
import { services, servicePriceVariations, servicePhotos, serviceProfessionals } from '../../../../../service/infrastructure/adapters/secondary/persistence/service.schema.js';
import { collaborators, collaboratorToolPermissions } from '../../../../../collaborator/infrastructure/adapters/secondary/persistence/collaborator.schema.js';
import { notifications } from '../../../../../notification/infrastructure/adapters/secondary/persistence/notification.schema.js';
import { subscriptions, invoices, invoiceItems, billingInfos } from '../../../../../billing/infrastructure/adapters/secondary/persistence/billing.schema.js';
import { tenantToolSubscriptions } from '../../../../../marketplace/infrastructure/adapters/secondary/persistence/marketplace.schema.js';
import { userSettings } from './user-settings.schema.js';
import { notificationPreferences } from './notification-preferences.schema.js';

@Injectable()
export class DrizzlePrivacyDataRepository implements PrivacyDataRepositoryPort {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase,
  ) {}

  async exportTenantData(tenantId: string): Promise<{
    company: Record<string, unknown>;
    categories: Record<string, unknown>[];
    products: Record<string, unknown>[];
    services: Record<string, unknown>[];
    collaborators: Record<string, unknown>[];
    notifications: Record<string, unknown>[];
    invoices: Record<string, unknown>[];
    subscriptions: Record<string, unknown>[];
  }> {
    const [
      tenantRows,
      categoryRows,
      productRows,
      serviceRows,
      collaboratorRows,
      notificationRows,
      invoiceRows,
      subscriptionRows,
      toolSubRows,
    ] = await Promise.all([
      this.db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1),
      this.db.select().from(categories).where(eq(categories.tenantId, tenantId)),
      this.db.select().from(products).where(eq(products.tenantId, tenantId)),
      this.db.select().from(services).where(eq(services.tenantId, tenantId)),
      this.db.select().from(collaborators).where(eq(collaborators.tenantId, tenantId)),
      this.db.select().from(notifications).where(eq(notifications.tenantId, tenantId)),
      this.db.select().from(invoices).where(eq(invoices.tenantId, tenantId)),
      this.db.select().from(subscriptions).where(eq(subscriptions.tenantId, tenantId)),
      this.db.select().from(tenantToolSubscriptions).where(eq(tenantToolSubscriptions.tenantId, tenantId)),
    ]);

    return {
      company: (tenantRows[0] ?? {}) as Record<string, unknown>,
      categories: categoryRows as unknown as Record<string, unknown>[],
      products: productRows as unknown as Record<string, unknown>[],
      services: serviceRows as unknown as Record<string, unknown>[],
      collaborators: collaboratorRows as unknown as Record<string, unknown>[],
      notifications: notificationRows as unknown as Record<string, unknown>[],
      invoices: invoiceRows as unknown as Record<string, unknown>[],
      subscriptions: [
        ...subscriptionRows as unknown as Record<string, unknown>[],
        ...toolSubRows as unknown as Record<string, unknown>[],
      ],
    };
  }

  async anonymizeInvoices(tenantId: string, tx?: DbClient): Promise<void> {
    const db = tx ?? this.db;
    // Anonymize billing info (personal data) but keep financial records
    await db
      .update(billingInfos)
      .set({
        name: 'Conta removida',
        email: 'removido@removido.com',
        phone: null,
        document: '000.000.000-00',
        addressStreet: null,
        addressNumber: null,
        addressComplement: null,
        addressNeighborhood: null,
        addressCity: null,
        addressState: null,
        addressZipCode: null,
        updatedAt: new Date(),
      })
      .where(eq(billingInfos.tenantId, tenantId));

    // Anonymize subscription card data
    await db
      .update(subscriptions)
      .set({
        cardToken: null,
        cardLast4: null,
        cardBrand: null,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.tenantId, tenantId));
  }

  async deleteTenantData(tenantId: string, tx?: DbClient): Promise<void> {
    const db = tx ?? this.db;
    // Delete in order respecting FK constraints (children first)

    // Product sub-resources
    const productIds = (
      await db.select({ id: products.id }).from(products).where(eq(products.tenantId, tenantId))
    ).map((r) => r.id);

    for (const pid of productIds) {
      await db.delete(productVariations).where(eq(productVariations.productId, pid));
      await db.delete(productPhotos).where(eq(productPhotos.productId, pid));
      await db.delete(productCustomFields).where(eq(productCustomFields.productId, pid));
    }
    await db.delete(products).where(eq(products.tenantId, tenantId));

    // Service sub-resources
    const serviceIds = (
      await db.select({ id: services.id }).from(services).where(eq(services.tenantId, tenantId))
    ).map((r) => r.id);

    for (const sid of serviceIds) {
      await db.delete(servicePriceVariations).where(eq(servicePriceVariations.serviceId, sid));
      await db.delete(servicePhotos).where(eq(servicePhotos.serviceId, sid));
      await db.delete(serviceProfessionals).where(eq(serviceProfessionals.serviceId, sid));
    }
    await db.delete(services).where(eq(services.tenantId, tenantId));

    // Collaborator sub-resources
    const collabIds = (
      await db.select({ id: collaborators.id }).from(collaborators).where(eq(collaborators.tenantId, tenantId))
    ).map((r) => r.id);

    for (const cid of collabIds) {
      await db.delete(collaboratorToolPermissions).where(eq(collaboratorToolPermissions.collaboratorId, cid));
    }
    await db.delete(collaborators).where(eq(collaborators.tenantId, tenantId));

    // Categories
    await db.delete(categories).where(eq(categories.tenantId, tenantId));

    // Notifications
    await db.delete(notifications).where(eq(notifications.tenantId, tenantId));

    // Tool subscriptions (marketplace)
    await db.delete(tenantToolSubscriptions).where(eq(tenantToolSubscriptions.tenantId, tenantId));

    // Settings (user-level, cleaned up via user deletion cascade)
    // Invoices/subscriptions are NOT deleted — they're anonymized for fiscal compliance
  }
}
