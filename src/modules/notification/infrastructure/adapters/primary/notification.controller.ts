import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import type { NotificationUseCasePort } from '../../../domain/ports/input/notification.usecase.port.js';
import { ListNotificationsQueryDto } from '../../../application/dto/list-notifications-query.dto.js';
import {
  NotificationSuccessResponseDto,
  NotificationPaginatedResponseDto,
  NotificationCountResponseDto,
  NotificationBulkUpdateResponseDto,
  NotificationBulkDeleteResponseDto,
} from '../../../application/dto/notification-response-wrapper.dto.js';
import {
  ApiErrorResponseDto,
  ApiMessageResponseDto,
} from '../../../../../common/swagger/api-responses.dto.js';
import { CurrentTenant } from '../../../../../common/decorators/current-tenant.decorator.js';
import { Roles } from '../../../../../common/decorators/index.js';
import { CurrentUser } from '../../../../../common/decorators/current-user.decorator.js';
import { BroadcastNotificationDto } from '../../../application/dto/broadcast-notification.dto.js';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationController {
  constructor(
    @Inject('NotificationUseCasePort')
    private readonly notificationService: NotificationUseCasePort,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar notificações (paginado)' })
  @ApiResponse({ status: 200, description: 'Lista paginada de notificações', type: NotificationPaginatedResponseDto })
  @ApiResponse({ status: 401, description: 'Não autenticado', type: ApiErrorResponseDto })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query() query: ListNotificationsQueryDto,
  ) {
    return this.notificationService.findAll(tenantId, query);
  }

  @Post('broadcast')
  @Roles('master')
  @ApiOperation({ summary: 'Enviar notificação para todos os tenants ativos (master only)' })
  @ApiResponse({ status: 201, description: 'Notificações enviadas', type: NotificationBulkUpdateResponseDto })
  @ApiResponse({ status: 401, description: 'Não autenticado', type: ApiErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Apenas administradores', type: ApiErrorResponseDto })
  async broadcast(@Body() dto: BroadcastNotificationDto) {
    const data = await this.notificationService.broadcast(dto);
    return { success: true, data };
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Obter quantidade de notificações não lidas' })
  @ApiResponse({ status: 200, description: 'Contagem de não lidas', type: NotificationCountResponseDto })
  @ApiResponse({ status: 401, description: 'Não autenticado', type: ApiErrorResponseDto })
  async getUnreadCount(@CurrentTenant() tenantId: string) {
    const data = await this.notificationService.getUnreadCount(tenantId);
    return { success: true, data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter notificação por ID' })
  @ApiParam({ name: 'id', description: 'UUID da notificação' })
  @ApiResponse({ status: 200, description: 'Notificação encontrada', type: NotificationSuccessResponseDto })
  @ApiResponse({ status: 401, description: 'Não autenticado', type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Notificação não encontrada', type: ApiErrorResponseDto })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    const data = await this.notificationService.findById(tenantId, id);
    return { success: true, data };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marcar notificação como lida' })
  @ApiParam({ name: 'id', description: 'UUID da notificação' })
  @ApiResponse({ status: 200, description: 'Notificação marcada como lida', type: NotificationSuccessResponseDto })
  @ApiResponse({ status: 401, description: 'Não autenticado', type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Notificação não encontrada', type: ApiErrorResponseDto })
  async markAsRead(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    const data = await this.notificationService.markAsRead(tenantId, id);
    return { success: true, data };
  }

  @Patch('mark-all-read')
  @ApiOperation({ summary: 'Marcar todas as notificações como lidas' })
  @ApiResponse({ status: 200, description: 'Todas marcadas como lidas', type: NotificationBulkUpdateResponseDto })
  @ApiResponse({ status: 401, description: 'Não autenticado', type: ApiErrorResponseDto })
  async markAllAsRead(@CurrentTenant() tenantId: string) {
    const data = await this.notificationService.markAllAsRead(tenantId);
    return { success: true, data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Excluir notificação' })
  @ApiParam({ name: 'id', description: 'UUID da notificação' })
  @ApiResponse({ status: 200, description: 'Notificação excluída', type: ApiMessageResponseDto })
  @ApiResponse({ status: 401, description: 'Não autenticado', type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Notificação não encontrada', type: ApiErrorResponseDto })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    await this.notificationService.remove(tenantId, id);
    return { success: true, message: 'Notificação excluída com sucesso' };
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Excluir todas as notificações' })
  @ApiResponse({ status: 200, description: 'Todas excluídas', type: NotificationBulkDeleteResponseDto })
  @ApiResponse({ status: 401, description: 'Não autenticado', type: ApiErrorResponseDto })
  async removeAll(@CurrentTenant() tenantId: string) {
    const data = await this.notificationService.removeAll(tenantId);
    return { success: true, data };
  }
}
