import type {
  CreateServiceDto,
  UpdateServiceDto,
  ServiceResponseDto,
  ServiceListItemDto,
} from '../../../application/dto/service.dto.js';
import type { ListServicesQueryDto } from '../../../application/dto/list-services-query.dto.js';
import type { PaginatedResponse } from '../../../../../common/types/api-response.type.js';
import type { CreatePriceVariationDto, UpdatePriceVariationDto, PriceVariationSubResponseDto } from '../../../application/dto/service-price-variation.dto.js';
import type { CreateServicePhotoDto, ServicePhotoSubResponseDto } from '../../../application/dto/service-photo.dto.js';
import type { LinkProfessionalDto, ServiceProfessionalSubResponseDto } from '../../../application/dto/service-professional.dto.js';

export interface ServiceUseCasePort {
  create(tenantId: string, dto: CreateServiceDto): Promise<ServiceResponseDto>;
  findAll(
    tenantId: string,
    query: ListServicesQueryDto,
  ): Promise<PaginatedResponse<ServiceListItemDto>>;
  findById(id: string, tenantId: string): Promise<ServiceResponseDto>;
  update(
    id: string,
    tenantId: string,
    dto: UpdateServiceDto,
  ): Promise<ServiceResponseDto>;
  delete(id: string, tenantId: string): Promise<void>;

  // ── Price Variation sub-resource ─────────────────────────
  listPriceVariations(serviceId: string, tenantId: string): Promise<PriceVariationSubResponseDto[]>;
  createPriceVariation(serviceId: string, tenantId: string, dto: CreatePriceVariationDto): Promise<PriceVariationSubResponseDto>;
  updatePriceVariation(serviceId: string, variationId: string, tenantId: string, dto: UpdatePriceVariationDto): Promise<PriceVariationSubResponseDto>;
  deletePriceVariation(serviceId: string, variationId: string, tenantId: string): Promise<void>;

  // ── Photo sub-resource ──────────────────────────────────
  listPhotos(serviceId: string, tenantId: string): Promise<ServicePhotoSubResponseDto[]>;
  addPhoto(serviceId: string, tenantId: string, dto: CreateServicePhotoDto): Promise<ServicePhotoSubResponseDto>;
  removePhoto(serviceId: string, photoId: string, tenantId: string): Promise<void>;

  // ── Professional sub-resource ───────────────────────────
  listProfessionals(serviceId: string, tenantId: string): Promise<ServiceProfessionalSubResponseDto[]>;
  linkProfessional(serviceId: string, tenantId: string, dto: LinkProfessionalDto): Promise<ServiceProfessionalSubResponseDto>;
  unlinkProfessional(serviceId: string, collaboratorId: string, tenantId: string): Promise<void>;
}
