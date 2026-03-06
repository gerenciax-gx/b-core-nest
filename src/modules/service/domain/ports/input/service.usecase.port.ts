import type {
  CreateServiceDto,
  UpdateServiceDto,
  ServiceResponseDto,
  ServiceListItemDto,
} from '../../../application/dto/service.dto.js';
import type { ListServicesQueryDto } from '../../../application/dto/list-services-query.dto.js';
import type { PaginatedResponse } from '../../../../../common/types/api-response.type.js';

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
}
