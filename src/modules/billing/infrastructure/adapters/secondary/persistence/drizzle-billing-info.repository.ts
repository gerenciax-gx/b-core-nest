import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from '../../../../../../common/database/database.module.js';
import type { BillingInfoRepositoryPort } from '../../../../domain/ports/output/billing-info.repository.port.js';
import { BillingInfo } from '../../../../domain/entities/billing-info.entity.js';
import { billingInfos } from './billing.schema.js';

@Injectable()
export class DrizzleBillingInfoRepository implements BillingInfoRepositoryPort {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase,
  ) {}

  async save(billingInfo: BillingInfo): Promise<BillingInfo> {
    await this.db.insert(billingInfos).values({
      id: billingInfo.id,
      tenantId: billingInfo.tenantId,
      customerExternalId: billingInfo.customerExternalId,
      document: billingInfo.document,
      name: billingInfo.name,
      email: billingInfo.email,
      phone: billingInfo.phone,
      addressStreet: billingInfo.addressStreet,
      addressNumber: billingInfo.addressNumber,
      addressComplement: billingInfo.addressComplement,
      addressNeighborhood: billingInfo.addressNeighborhood,
      addressCity: billingInfo.addressCity,
      addressState: billingInfo.addressState,
      addressZipCode: billingInfo.addressZipCode,
      createdAt: billingInfo.createdAt,
      updatedAt: billingInfo.updatedAt,
    });
    return billingInfo;
  }

  async findByTenantId(tenantId: string): Promise<BillingInfo | null> {
    const rows = await this.db
      .select()
      .from(billingInfos)
      .where(eq(billingInfos.tenantId, tenantId))
      .limit(1);

    const row = rows[0];
    if (!row) return null;
    return this.toDomain(row);
  }

  async update(billingInfo: BillingInfo): Promise<BillingInfo> {
    await this.db
      .update(billingInfos)
      .set({
        customerExternalId: billingInfo.customerExternalId,
        document: billingInfo.document,
        name: billingInfo.name,
        email: billingInfo.email,
        phone: billingInfo.phone,
        addressStreet: billingInfo.addressStreet,
        addressNumber: billingInfo.addressNumber,
        addressComplement: billingInfo.addressComplement,
        addressNeighborhood: billingInfo.addressNeighborhood,
        addressCity: billingInfo.addressCity,
        addressState: billingInfo.addressState,
        addressZipCode: billingInfo.addressZipCode,
        updatedAt: new Date(),
      })
      .where(eq(billingInfos.id, billingInfo.id));

    return billingInfo;
  }

  // ── Helpers ────────────────────────────────────────────────

  private toDomain(
    row: typeof billingInfos.$inferSelect,
  ): BillingInfo {
    return new BillingInfo(
      row.id,
      row.tenantId,
      row.customerExternalId,
      row.document,
      row.name,
      row.email,
      row.phone,
      row.addressStreet,
      row.addressNumber,
      row.addressComplement,
      row.addressNeighborhood,
      row.addressCity,
      row.addressState,
      row.addressZipCode,
      row.createdAt,
      row.updatedAt,
    );
  }
}
