import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { ServiceRepositoryPort } from '../../domain/ports/output/service.repository.port.js';
import { Service } from '../../domain/entities/service.entity.js';
import type {
  CreateServiceDto,
  UpdateServiceDto,
  ServiceResponseDto,
  ServiceListItemDto,
} from '../dto/service.dto.js';

@Injectable()
export class ServiceService {
  constructor(
    @Inject('ServiceRepositoryPort')
    private readonly serviceRepo: ServiceRepositoryPort,
  ) {}

  async create(
    tenantId: string,
    dto: CreateServiceDto,
  ): Promise<ServiceResponseDto> {
    const service = Service.create({
      tenantId,
      name: dto.name,
      description: dto.description,
      categoryId: dto.category,
      basePrice: dto.basePrice,
      durationMinutes: dto.durationMinutes,
    });

    await this.serviceRepo.save(service);

    // Save price variations
    if (dto.priceVariations && dto.priceVariations.length > 0) {
      service.setPriceVariations(
        dto.priceVariations.map((v, i) => ({
          id: v.id || randomUUID(),
          name: v.name,
          price: v.price,
          durationMinutes: v.durationMinutes,
          durationMinMinutes: v.durationMinMinutes ?? null,
          durationMaxMinutes: v.durationMaxMinutes ?? null,
          sortOrder: i,
        })),
      );
      await this.serviceRepo.savePriceVariations(service);
    }

    // Save photos (support both ServicePhotoDto[] and string[] via photoUrls)
    const photoEntries = this.resolvePhotos(dto);
    if (photoEntries.length > 0) {
      service.setPhotos(photoEntries);
      await this.serviceRepo.savePhotos(service);
    }

    // Save professionals
    if (dto.professionalIds && dto.professionalIds.length > 0) {
      service.setProfessionals(
        dto.professionalIds.map((collabId) => ({
          id: randomUUID(),
          collaboratorId: collabId,
        })),
      );
      await this.serviceRepo.saveProfessionals(service);
    }

    return this.toResponse(service);
  }

  async findAll(tenantId: string): Promise<ServiceListItemDto[]> {
    const list = await this.serviceRepo.findAllByTenant(tenantId);
    return list.map((s) => this.toListItem(s));
  }

  async findById(
    id: string,
    tenantId: string,
  ): Promise<ServiceResponseDto> {
    const service = await this.serviceRepo.findById(id, tenantId);
    if (!service) throw new NotFoundException('Serviço não encontrado');
    return this.toResponse(service);
  }

  async update(
    id: string,
    tenantId: string,
    dto: UpdateServiceDto,
  ): Promise<ServiceResponseDto> {
    const service = await this.serviceRepo.findById(id, tenantId);
    if (!service) throw new NotFoundException('Serviço não encontrado');

    service.update({
      name: dto.name,
      description: dto.description,
      categoryId: dto.category,
      basePrice: dto.basePrice,
      durationMinutes: dto.durationMinutes,
      status: dto.status,
    });

    await this.serviceRepo.update(service);

    // Update price variations if provided
    if (dto.priceVariations !== undefined) {
      service.setPriceVariations(
        (dto.priceVariations ?? []).map((v, i) => ({
          id: v.id || randomUUID(),
          name: v.name,
          price: v.price,
          durationMinutes: v.durationMinutes,
          durationMinMinutes: v.durationMinMinutes ?? null,
          durationMaxMinutes: v.durationMaxMinutes ?? null,
          sortOrder: i,
        })),
      );
      await this.serviceRepo.savePriceVariations(service);
    }

    // Update photos if provided
    const photoEntries = this.resolvePhotos(dto);
    if (dto.photos !== undefined || dto.photoUrls !== undefined) {
      service.setPhotos(photoEntries);
      await this.serviceRepo.savePhotos(service);
    }

    // Update professionals if provided
    if (dto.professionalIds !== undefined) {
      service.setProfessionals(
        (dto.professionalIds ?? []).map((collabId) => ({
          id: randomUUID(),
          collaboratorId: collabId,
        })),
      );
      await this.serviceRepo.saveProfessionals(service);
    }

    return this.toResponse(service);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const service = await this.serviceRepo.findById(id, tenantId);
    if (!service) throw new NotFoundException('Serviço não encontrado');
    await this.serviceRepo.delete(id, tenantId);
  }

  private resolvePhotos(
    dto: CreateServiceDto | UpdateServiceDto,
  ): { id: string; url: string; isMain: boolean; sortOrder: number; priceVariationId: string | null }[] {
    const entries: { id: string; url: string; isMain: boolean; sortOrder: number; priceVariationId: string | null }[] = [];

    if (dto.photos && dto.photos.length > 0) {
      dto.photos.forEach((p, i) => {
        entries.push({
          id: p.id || randomUUID(),
          url: p.url,
          isMain: p.isMain ?? i === 0,
          sortOrder: p.order ?? i,
          priceVariationId: null,
        });
      });
    } else if (dto.photoUrls && dto.photoUrls.length > 0) {
      dto.photoUrls.forEach((url, i) => {
        entries.push({
          id: randomUUID(),
          url,
          isMain: i === 0,
          sortOrder: i,
          priceVariationId: null,
        });
      });
    }

    return entries;
  }

  private toResponse(service: Service): ServiceResponseDto {
    return {
      id: service.id,
      name: service.name,
      description: service.description,
      categoryId: service.categoryId,
      basePrice: service.basePrice,
      durationMinutes: service.durationMinutes,
      imageUrl: service.imageUrl,
      status: service.status,
      isActive: service.isActive,
      priceVariations: service.priceVariations.map((v) => ({
        id: v.id,
        name: v.name,
        price: v.price,
        durationMinutes: v.durationMinutes,
        durationMinMinutes: v.durationMinMinutes,
        durationMaxMinutes: v.durationMaxMinutes,
      })),
      photos: service.photos.map((p) => ({
        id: p.id,
        url: p.url,
        isMain: p.isMain,
        sortOrder: p.sortOrder,
      })),
      professionals: service.professionals.map((p) => ({
        id: p.id,
        collaboratorId: p.collaboratorId,
      })),
      createdAt: service.createdAt.toISOString(),
      updatedAt: service.updatedAt.toISOString(),
    };
  }

  private toListItem(service: Service): ServiceListItemDto {
    return {
      id: service.id,
      name: service.name,
      description: service.description,
      basePrice: service.basePrice,
      durationMinutes: service.durationMinutes,
      status: service.status,
      professionals: service.professionals.map((p) => ({
        id: p.id,
        collaboratorId: p.collaboratorId,
      })),
      category: service.categoryId,
      createdAt: service.createdAt.toISOString(),
      updatedAt: service.updatedAt.toISOString(),
    };
  }
}
