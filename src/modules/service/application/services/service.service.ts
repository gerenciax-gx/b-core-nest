import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { ServiceUseCasePort } from '../../domain/ports/input/service.usecase.port.js';
import type { ServiceRepositoryPort } from '../../domain/ports/output/service.repository.port.js';
import type { UploadUseCasePort } from '../../../upload/domain/ports/input/upload.usecase.port.js';
import { Service } from '../../domain/entities/service.entity.js';
import type {
  CreateServiceDto,
  UpdateServiceDto,
  ServiceResponseDto,
  ServiceListItemDto,
} from '../dto/service.dto.js';
import type { ListServicesQueryDto } from '../dto/list-services-query.dto.js';
import type { PaginatedResponse } from '../../../../common/types/api-response.type.js';
import { createPaginatedResponse } from '../../../../common/helpers/paginated-response.helper.js';
import type { CreatePriceVariationDto, UpdatePriceVariationDto, PriceVariationSubResponseDto } from '../dto/service-price-variation.dto.js';
import type { CreateServicePhotoDto, ServicePhotoSubResponseDto } from '../dto/service-photo.dto.js';
import type { LinkProfessionalDto, ServiceProfessionalSubResponseDto } from '../dto/service-professional.dto.js';
import { TransactionManager } from '../../../../common/database/transaction.helper.js';

@Injectable()
export class ServiceService implements ServiceUseCasePort {
  constructor(
    @Inject('ServiceRepositoryPort')
    private readonly serviceRepo: ServiceRepositoryPort,
    @Inject('UploadUseCasePort')
    private readonly uploadService: UploadUseCasePort,
    private readonly transactionManager: TransactionManager,
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

    // Save photos (support both ServicePhotoDto[] and string[] via photoUrls)
    const photoEntries = this.resolvePhotos(dto);

    await this.transactionManager.run(async (tx) => {
      await this.serviceRepo.save(service, tx);

      // Save price variations
      if (dto.priceVariations && dto.priceVariations.length > 0) {
        service.setPriceVariations(
          dto.priceVariations.map((v, i) => ({
            id: randomUUID(),
            name: v.name,
            price: v.price,
            durationMinutes: v.durationMinutes,
            durationMinMinutes: v.durationMinMinutes ?? null,
            durationMaxMinutes: v.durationMaxMinutes ?? null,
            sortOrder: i,
          })),
        );
        await this.serviceRepo.savePriceVariations(service, tx);
      }

      if (photoEntries.length > 0) {
        service.setPhotos(photoEntries);
        await this.serviceRepo.savePhotos(service, tx);
      }

      // Save professionals
      if (dto.professionalIds && dto.professionalIds.length > 0) {
        service.setProfessionals(
          dto.professionalIds.map((collabId) => ({
            id: randomUUID(),
            collaboratorId: collabId,
          })),
        );
        await this.serviceRepo.saveProfessionals(service, tx);
      }
    });

    return this.toResponse(service);
  }

  async findAll(
    tenantId: string,
    query: ListServicesQueryDto,
  ): Promise<PaginatedResponse<ServiceListItemDto>> {
    const { page = 1, limit = 20 } = query;

    const [serviceList, total] = await this.serviceRepo.findAllByTenant(
      tenantId,
      { page, limit, sortBy: query.sortBy, sortOrder: query.sortOrder },
      { status: query.status, categoryId: query.categoryId, search: query.search },
    );

    const data = serviceList.map((s) => this.toListItem(s));
    return createPaginatedResponse(data, total, page, limit);
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

    // Update photos entries
    const photoEntries = this.resolvePhotos(dto);

    await this.transactionManager.run(async (tx) => {
      await this.serviceRepo.update(service, tx);

      // Update price variations if provided
      if (dto.priceVariations !== undefined) {
        service.setPriceVariations(
          (dto.priceVariations ?? []).map((v, i) => ({
            id: randomUUID(),
            name: v.name,
            price: v.price,
            durationMinutes: v.durationMinutes,
            durationMinMinutes: v.durationMinMinutes ?? null,
            durationMaxMinutes: v.durationMaxMinutes ?? null,
            sortOrder: i,
          })),
        );
        await this.serviceRepo.savePriceVariations(service, tx);
      }

      // Update photos if provided
      if (dto.photos !== undefined || dto.photoUrls !== undefined) {
        const oldPhotoUrls = service.photos.map((p) => p.url);
        service.setPhotos(photoEntries);
        await this.serviceRepo.savePhotos(service, tx);

        // Cleanup old files no longer referenced
        const newUrls = new Set(service.photos.map((p) => p.url));
        const toDelete = oldPhotoUrls.filter((u) => !newUrls.has(u));
        await this.deleteFilesQuietly(toDelete, tenantId);
      }

      // Update professionals if provided
      if (dto.professionalIds !== undefined) {
        service.setProfessionals(
          (dto.professionalIds ?? []).map((collabId) => ({
            id: randomUUID(),
            collaboratorId: collabId,
          })),
        );
        await this.serviceRepo.saveProfessionals(service, tx);
      }
    });

    return this.toResponse(service);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const service = await this.serviceRepo.findById(id, tenantId);
    if (!service) throw new NotFoundException('Serviço não encontrado');

    const photoUrls = service.photos.map((p) => p.url);
    await this.serviceRepo.delete(id, tenantId);
    await this.deleteFilesQuietly(photoUrls, tenantId);
  }

  // ── Price Variation sub-resource ────────────────────────

  async listPriceVariations(serviceId: string, tenantId: string): Promise<PriceVariationSubResponseDto[]> {
    await this.ensureServiceExists(serviceId, tenantId);
    return this.serviceRepo.findPriceVariationsByService(serviceId);
  }

  async createPriceVariation(serviceId: string, tenantId: string, dto: CreatePriceVariationDto): Promise<PriceVariationSubResponseDto> {
    await this.ensureServiceExists(serviceId, tenantId);
    const existing = await this.serviceRepo.findPriceVariationsByService(serviceId);
    return this.serviceRepo.addPriceVariation(serviceId, {
      id: randomUUID(),
      name: dto.name,
      price: dto.price,
      durationMinutes: dto.durationMinutes,
      durationMinMinutes: dto.durationMinMinutes ?? null,
      durationMaxMinutes: dto.durationMaxMinutes ?? null,
      sortOrder: existing.length,
    });
  }

  async updatePriceVariation(serviceId: string, variationId: string, tenantId: string, dto: UpdatePriceVariationDto): Promise<PriceVariationSubResponseDto> {
    await this.ensureServiceExists(serviceId, tenantId);
    const updated = await this.serviceRepo.updatePriceVariation(variationId, serviceId, {
      name: dto.name,
      price: dto.price,
      durationMinutes: dto.durationMinutes,
      durationMinMinutes: dto.durationMinMinutes,
      durationMaxMinutes: dto.durationMaxMinutes,
    });
    if (!updated) throw new NotFoundException('Variação de preço não encontrada');
    return updated;
  }

  async deletePriceVariation(serviceId: string, variationId: string, tenantId: string): Promise<void> {
    await this.ensureServiceExists(serviceId, tenantId);
    const deleted = await this.serviceRepo.deletePriceVariation(variationId, serviceId);
    if (!deleted) throw new NotFoundException('Variação de preço não encontrada');
  }

  // ── Photo sub-resource ──────────────────────────────────

  async listPhotos(serviceId: string, tenantId: string): Promise<ServicePhotoSubResponseDto[]> {
    await this.ensureServiceExists(serviceId, tenantId);
    const photos = await this.serviceRepo.findPhotosByService(serviceId);
    return photos.map((p) => ({ id: p.id, url: p.url, isMain: p.isMain, sortOrder: p.sortOrder }));
  }

  async addPhoto(serviceId: string, tenantId: string, dto: CreateServicePhotoDto): Promise<ServicePhotoSubResponseDto> {
    await this.ensureServiceExists(serviceId, tenantId);
    const existing = await this.serviceRepo.findPhotosByService(serviceId);
    const photo = await this.serviceRepo.addPhoto(serviceId, {
      id: randomUUID(),
      url: dto.url,
      isMain: dto.isMain ?? existing.length === 0,
      sortOrder: existing.length,
      priceVariationId: null,
    });
    return { id: photo.id, url: photo.url, isMain: photo.isMain, sortOrder: photo.sortOrder };
  }

  async removePhoto(serviceId: string, photoId: string, tenantId: string): Promise<void> {
    await this.ensureServiceExists(serviceId, tenantId);

    // Get photo URL before deleting
    const photos = await this.serviceRepo.findPhotosByService(serviceId);
    const photo = photos.find((p) => p.id === photoId);

    const deleted = await this.serviceRepo.deletePhoto(photoId, serviceId);
    if (!deleted) throw new NotFoundException('Foto não encontrada');

    if (photo?.url) {
      await this.deleteFilesQuietly([photo.url], tenantId);
    }
  }

  // ── Professional sub-resource ───────────────────────────

  async listProfessionals(serviceId: string, tenantId: string): Promise<ServiceProfessionalSubResponseDto[]> {
    await this.ensureServiceExists(serviceId, tenantId);
    return this.serviceRepo.findProfessionalsByService(serviceId);
  }

  async linkProfessional(serviceId: string, tenantId: string, dto: LinkProfessionalDto): Promise<ServiceProfessionalSubResponseDto> {
    await this.ensureServiceExists(serviceId, tenantId);
    return this.serviceRepo.addProfessional(serviceId, {
      id: randomUUID(),
      collaboratorId: dto.collaboratorId,
    });
  }

  async unlinkProfessional(serviceId: string, collaboratorId: string, tenantId: string): Promise<void> {
    await this.ensureServiceExists(serviceId, tenantId);
    const deleted = await this.serviceRepo.deleteProfessional(collaboratorId, serviceId);
    if (!deleted) throw new NotFoundException('Profissional não vinculado a este serviço');
  }

  // ── Private helpers ─────────────────────────────────────

  private async ensureServiceExists(serviceId: string, tenantId: string): Promise<void> {
    const service = await this.serviceRepo.findById(serviceId, tenantId);
    if (!service) throw new NotFoundException('Serviço não encontrado');
  }

  private resolvePhotos(
    dto: CreateServiceDto | UpdateServiceDto,
  ): { id: string; url: string; isMain: boolean; sortOrder: number; priceVariationId: string | null }[] {
    const entries: { id: string; url: string; isMain: boolean; sortOrder: number; priceVariationId: string | null }[] = [];

    if (dto.photos && dto.photos.length > 0) {
      dto.photos.forEach((p, i) => {
        entries.push({
          id: randomUUID(),
          url: p.url,
          isMain: p.isMain ?? i === 0,
          sortOrder: p.sortOrder ?? i,
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

  private async deleteFilesQuietly(paths: string[], tenantId: string): Promise<void> {
    await Promise.allSettled(
      paths.filter(Boolean).map((p) => this.uploadService.deleteFile(p, tenantId)),
    );
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
