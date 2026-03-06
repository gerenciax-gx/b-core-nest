import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Put,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import type { Request } from 'express';
import type { SettingsUseCasePort } from '../../../domain/ports/input/settings.usecase.port.js';
import type { UploadUseCasePort } from '../../../../upload/domain/ports/input/upload.usecase.port.js';
import { UpdatePersonalDto } from '../../../application/dto/update-personal.dto.js';
import { UpdateCompanyDto } from '../../../application/dto/update-company.dto.js';
import { ChangePasswordDto } from '../../../application/dto/change-password.dto.js';
import { UpdateAppearanceDto } from '../../../application/dto/update-appearance.dto.js';
import { UpdateNotificationPreferencesDto } from '../../../application/dto/update-notification-preferences.dto.js';
import {
  PersonalSuccessResponseDto,
  CompanySuccessResponseDto,
  AppearanceSuccessResponseDto,
  NotificationPreferencesSuccessResponseDto,
  SessionListSuccessResponseDto,
} from '../../../application/dto/settings-response-wrapper.dto.js';
import { ApiErrorResponseDto, ApiMessageResponseDto } from '../../../../../common/swagger/api-responses.dto.js';
import { CurrentUser } from '../../../../../common/decorators/current-user.decorator.js';
import { CurrentTenant } from '../../../../../common/decorators/current-tenant.decorator.js';

@ApiTags('Settings')
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
  constructor(
    @Inject('SettingsUseCasePort')
    private readonly settingsService: SettingsUseCasePort,

    @Inject('UploadUseCasePort')
    private readonly uploadService: UploadUseCasePort,
  ) {}

  // ── Personal ────────────────────────────────────────────

  @Get('personal')
  @ApiOperation({ summary: 'Obter dados pessoais do usuário' })
  @ApiResponse({ status: 200, description: 'Dados pessoais retornados', type: PersonalSuccessResponseDto })
  @ApiResponse({ status: 401, description: 'Não autenticado', type: ApiErrorResponseDto })
  async getPersonal(@CurrentUser('sub') userId: string) {
    const data = await this.settingsService.getPersonal(userId);
    return { success: true, data };
  }

  @Put('personal')
  @ApiOperation({ summary: 'Atualizar dados pessoais' })
  @ApiResponse({ status: 200, description: 'Dados pessoais atualizados', type: PersonalSuccessResponseDto })
  @ApiResponse({ status: 400, description: 'Dados de entrada inválidos', type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Não autenticado', type: ApiErrorResponseDto })
  async updatePersonal(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdatePersonalDto,
  ) {
    const data = await this.settingsService.updatePersonal(userId, dto);
    return { success: true, data };
  }

  @Post('personal/photo')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload de foto de perfil' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Foto atualizada com sucesso', type: PersonalSuccessResponseDto })
  @ApiResponse({ status: 400, description: 'Arquivo inválido', type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Não autenticado', type: ApiErrorResponseDto })
  async uploadPhoto(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('sub') userId: string,
    @CurrentTenant() tenantId: string,
  ) {
    const uploaded = await this.uploadService.uploadImage(
      file,
      tenantId,
      'users',
    );
    const data = await this.settingsService.updateAvatar(userId, uploaded.url);
    return { success: true, data };
  }

  // ── Company ─────────────────────────────────────────────

  @Get('company')
  @ApiOperation({ summary: 'Obter dados da empresa' })
  @ApiResponse({ status: 200, description: 'Dados da empresa retornados', type: CompanySuccessResponseDto })
  @ApiResponse({ status: 401, description: 'Não autenticado', type: ApiErrorResponseDto })
  async getCompany(@CurrentTenant() tenantId: string) {
    const data = await this.settingsService.getCompany(tenantId);
    return { success: true, data };
  }

  @Put('company')
  @ApiOperation({ summary: 'Atualizar dados da empresa (admin only)' })
  @ApiResponse({ status: 200, description: 'Dados da empresa atualizados', type: CompanySuccessResponseDto })
  @ApiResponse({ status: 400, description: 'Dados de entrada inválidos', type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Não autenticado', type: ApiErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Apenas administradores podem alterar', type: ApiErrorResponseDto })
  async updateCompany(
    @CurrentTenant() tenantId: string,
    @CurrentUser('role') role: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    const data = await this.settingsService.updateCompany(
      tenantId,
      role,
      dto,
    );
    return { success: true, data };
  }

  // ── Appearance ──────────────────────────────────────────

  @Get('appearance')
  @ApiOperation({ summary: 'Obter configurações de aparência' })
  @ApiResponse({ status: 200, description: 'Configurações de aparência retornadas', type: AppearanceSuccessResponseDto })
  @ApiResponse({ status: 401, description: 'Não autenticado', type: ApiErrorResponseDto })
  async getAppearance(@CurrentUser('sub') userId: string) {
    const data = await this.settingsService.getAppearance(userId);
    return { success: true, data };
  }

  @Put('appearance')
  @ApiOperation({ summary: 'Atualizar configurações de aparência' })
  @ApiResponse({ status: 200, description: 'Configurações de aparência atualizadas', type: AppearanceSuccessResponseDto })
  @ApiResponse({ status: 400, description: 'Dados de entrada inválidos', type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Não autenticado', type: ApiErrorResponseDto })
  async updateAppearance(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateAppearanceDto,
  ) {
    const data = await this.settingsService.updateAppearance(userId, dto);
    return { success: true, data };
  }

  // ── Notifications ───────────────────────────────────────

  @Get('notifications')
  @ApiOperation({ summary: 'Obter preferências de notificação' })
  @ApiResponse({ status: 200, description: 'Preferências de notificação retornadas', type: NotificationPreferencesSuccessResponseDto })
  @ApiResponse({ status: 401, description: 'Não autenticado', type: ApiErrorResponseDto })
  async getNotificationPreferences(@CurrentUser('sub') userId: string) {
    const data = await this.settingsService.getNotificationPreferences(userId);
    return { success: true, data };
  }

  @Put('notifications')
  @ApiOperation({ summary: 'Atualizar preferências de notificação' })
  @ApiResponse({ status: 200, description: 'Preferências atualizadas', type: NotificationPreferencesSuccessResponseDto })
  @ApiResponse({ status: 400, description: 'Dados de entrada inválidos', type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Não autenticado', type: ApiErrorResponseDto })
  async updateNotificationPreferences(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    const data = await this.settingsService.updateNotificationPreferences(
      userId,
      dto,
    );
    return { success: true, data };
  }

  // ── Security ────────────────────────────────────────────

  @Post('security/change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Alterar senha' })
  @ApiResponse({ status: 200, description: 'Senha alterada com sucesso', type: ApiMessageResponseDto })
  @ApiResponse({ status: 400, description: 'Senhas não conferem ou senha atual incorreta', type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Não autenticado', type: ApiErrorResponseDto })
  async changePassword(
    @CurrentUser('sub') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.settingsService.changePassword(
      userId,
      dto.currentPassword,
      dto.newPassword,
      dto.confirmPassword,
    );
    return { success: true, message: 'Senha alterada com sucesso' };
  }

  @Get('security/sessions')
  @ApiOperation({ summary: 'Listar sessões ativas' })
  @ApiResponse({ status: 200, description: 'Lista de sessões ativas', type: SessionListSuccessResponseDto })
  @ApiResponse({ status: 401, description: 'Não autenticado', type: ApiErrorResponseDto })
  async listSessions(
    @CurrentUser('sub') userId: string,
    @Req() req: Request,
  ) {
    const refreshToken = req.cookies?.['refreshToken'] as string | undefined;
    const data = await this.settingsService.listSessions(
      userId,
      refreshToken,
    );
    return { success: true, data };
  }

  @Delete('security/sessions/:id')
  @ApiOperation({ summary: 'Revogar uma sessão' })
  @ApiParam({ name: 'id', description: 'UUID da sessão' })
  @ApiResponse({ status: 200, description: 'Sessão revogada', type: ApiMessageResponseDto })
  @ApiResponse({ status: 401, description: 'Não autenticado', type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Sessão não encontrada', type: ApiErrorResponseDto })
  async revokeSession(
    @Param('id') sessionId: string,
    @CurrentUser('sub') userId: string,
  ) {
    await this.settingsService.revokeSession(sessionId, userId);
    return { success: true, message: 'Sessão revogada com sucesso' };
  }
}
