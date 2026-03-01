import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from '../../../../../../common/database/database.module.js';
import { TenantRepositoryPort } from '../../../../domain/ports/output/tenant.repository.port.js';
import {
  Tenant,
  type CompanyType,
  type TenantStatus,
} from '../../../../domain/entities/tenant.entity.js';
import { tenants } from './tenant.schema.js';

@Injectable()
export class DrizzleTenantRepository implements TenantRepositoryPort {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase,
  ) {}

  async save(tenant: Tenant): Promise<Tenant> {
    await this.db.insert(tenants).values({
      id: tenant.id,
      companyName: tenant.companyName,
      companyType: tenant.companyType,
      document: tenant.document,
      phone: tenant.phone,
      email: tenant.email,
      status: tenant.status,
      logoUrl: tenant.logoUrl,
      isActive: tenant.isActive,
      legalName: tenant.legalName,
      stateRegistration: tenant.stateRegistration,
      municipalRegistration: tenant.municipalRegistration,
      cep: tenant.cep,
      street: tenant.street,
      number: tenant.number,
      complement: tenant.complement,
      neighborhood: tenant.neighborhood,
      city: tenant.city,
      state: tenant.state,
      country: tenant.country,
      openingDate: tenant.openingDate,
      businessHours: tenant.businessHours,
      specialties: tenant.specialties,
      maxCapacity: tenant.maxCapacity,
      averageServiceTime: tenant.averageServiceTime,
      paymentMethods: tenant.paymentMethods,
      cancellationPolicy: tenant.cancellationPolicy,
      description: tenant.description,
      website: tenant.website,
      instagram: tenant.instagram,
      facebook: tenant.facebook,
      whatsapp: tenant.whatsapp,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    });

    return tenant;
  }

  async findById(id: string): Promise<Tenant | null> {
    const rows = await this.db
      .select()
      .from(tenants)
      .where(eq(tenants.id, id))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    return this.toDomain(row);
  }

  async update(tenant: Tenant): Promise<Tenant> {
    await this.db
      .update(tenants)
      .set({
        companyName: tenant.companyName,
        companyType: tenant.companyType,
        document: tenant.document,
        phone: tenant.phone,
        email: tenant.email,
        status: tenant.status,
        logoUrl: tenant.logoUrl,
        isActive: tenant.isActive,
        legalName: tenant.legalName,
        stateRegistration: tenant.stateRegistration,
        municipalRegistration: tenant.municipalRegistration,
        cep: tenant.cep,
        street: tenant.street,
        number: tenant.number,
        complement: tenant.complement,
        neighborhood: tenant.neighborhood,
        city: tenant.city,
        state: tenant.state,
        country: tenant.country,
        openingDate: tenant.openingDate,
        businessHours: tenant.businessHours,
        specialties: tenant.specialties,
        maxCapacity: tenant.maxCapacity,
        averageServiceTime: tenant.averageServiceTime,
        paymentMethods: tenant.paymentMethods,
        cancellationPolicy: tenant.cancellationPolicy,
        description: tenant.description,
        website: tenant.website,
        instagram: tenant.instagram,
        facebook: tenant.facebook,
        whatsapp: tenant.whatsapp,
        updatedAt: tenant.updatedAt,
      })
      .where(eq(tenants.id, tenant.id));

    return tenant;
  }

  private toDomain(row: typeof tenants.$inferSelect): Tenant {
    return new Tenant(
      row.id,
      row.companyName,
      row.companyType as CompanyType,
      row.document,
      row.phone,
      row.email,
      row.status as TenantStatus,
      row.logoUrl,
      row.isActive,
      row.legalName,
      row.stateRegistration,
      row.municipalRegistration,
      row.cep,
      row.street,
      row.number,
      row.complement,
      row.neighborhood,
      row.city,
      row.state,
      row.country,
      row.openingDate,
      row.businessHours,
      row.specialties,
      row.maxCapacity,
      row.averageServiceTime,
      row.paymentMethods,
      row.cancellationPolicy,
      row.description,
      row.website,
      row.instagram,
      row.facebook,
      row.whatsapp,
      row.createdAt,
      row.updatedAt,
    );
  }
}
