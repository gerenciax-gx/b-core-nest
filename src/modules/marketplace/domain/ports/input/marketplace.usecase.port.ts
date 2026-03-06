import type { PaginatedResponse } from '../../../../../common/types/api-response.type.js';
import type { ListToolsQueryDto } from '../../../application/dto/list-tools-query.dto.js';
import type { SubscribeDto } from '../../../application/dto/subscribe.dto.js';
import type {
  ToolResponseDto,
  ToolDetailResponseDto,
  SubscriptionResponseDto,
} from '../../../application/dto/marketplace.dto.js';

export interface MarketplaceUseCasePort {
  listTools(
    query: ListToolsQueryDto,
  ): Promise<PaginatedResponse<ToolResponseDto>>;

  getToolDetail(
    toolId: string,
    tenantId: string,
  ): Promise<ToolDetailResponseDto>;

  subscribe(
    tenantId: string,
    dto: SubscribeDto,
  ): Promise<SubscriptionResponseDto>;

  listSubscriptions(
    tenantId: string,
  ): Promise<SubscriptionResponseDto[]>;
}
