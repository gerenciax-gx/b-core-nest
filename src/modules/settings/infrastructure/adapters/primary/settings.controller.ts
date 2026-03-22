import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
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
import { DeleteAccountDto } from '../../../application/dto/delete-account.dto.js';
import {
  PersonalSuccessResponseDto,
  CompanySuccessResponseDto,
  AppearanceSuccessResponseDto,
  NotificationPreferencesSuccessResponseDto,
  SessionListSuccessResponseDto,
} from '../../../application/dto/settings-response-wrapper.dto.js';
import { PrivacyExportSuccessResponseDto } from '../../../application/dto/privacy-export-response.dto.js';
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

  // â”€â”€ Personal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Get('personal')
  @ApiOperation({ summary: 'Obter dados pessoais do usuÃ¡rio' })
  @ApiResponse({ status: 200, description: 'Dados pessoais retornados', type: PersonalSuccessResponseDto })
  @ApiResponse({ status: 401, description: 'NÃ£o autenticado', type: ApiErrorResponseDto })
  async getPersonal(@CurrentUser('sub') userId: string) {
    const data = await this.settingsService.getPersonal(userId);
    return { success: true, data };
  }

  @Put('personal')
  @ApiOperation({ summary: 'Atualizar dados pessoais' })
  @ApiResponse({ status: 200, description: 'Dados pessoais atualizados', type: PersonalSuccessResponseDto })
  @ApiResponse({ status: 400, description: 'Dados de entrada invÃ¡lidos', type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, description: 'NÃ£o autenticado', type: ApiErrorResponseDto })
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
  @ApiResponse({ status: 400, description: 'Arquivo invÃ¡lido', type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, description: 'NÃ£o autenticado', type: ApiErrorResponseDto })
  async uploadPhoto(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('sub') userId: string,
    @CurrentTenant() tenantId: string,
  ) {
    // Delete old avatar from storage if exists
    const current = await this.settingsService.getPersonal(userId);
    if (current.avatarUrl) {
      try {
        await this.uploadService.deleteFile(current.avatarUrl, tenantId);
      } catch {
        // Old file may not exist in storage — continue
      }
    }

    const uploaded = await this.uploadService.uploadImage(
      file,
      tenantId,
      'users',
    );
    const data = await this.settingsService.updateAvatar(userId, uploaded.path);
    return { success: true, data };
  }

  // â”€â”€ Company â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Get('company')
  @ApiOperation({ summary: 'Obter dados da empresa' })
  @ApiResponse({ status: 200, description: 'Dados da empresa retornados', type: CompanySuccessResponseDto })
  @ApiResponse({ status: 401, description: 'NÃ£o autenticado', type: ApiErrorResponseDto })
  async getCompany(@CurrentTenant() tenantId: string) {
    const data = await this.settingsService.getCompany(tenantId);
    return { success: true, data };
  }

  @Put('company')
  @ApiOperation({ summary: 'Atualizar dados da empresa (admin only)' })
  @ApiResponse({ status: 200, description: 'Dados da empresa atualizados', type: CompanySuccessResponseDto })
  @ApiResponse({ status: 400, description: 'Dados de entrada invÃ¡lidos', type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, description: 'NÃ£o autenticado', type: ApiErrorResponseDto })
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

  // â”€â”€ Appearance â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Get('appearance')
  @ApiOperation({ summary: 'Obter configuraÃ§Ãµes de aparÃªncia' })
  @ApiResponse({ status: 200, description: 'ConfiguraÃ§Ãµes de aparÃªncia retornadas', type: AppearanceSuccessResponseDto })
  @ApiResponse({ status: 401, description: 'NÃ£o autenticado', type: ApiErrorResponseDto })
  async getAppearance(@CurrentUser('sub') userId: string) {
    const data = await this.settingsService.getAppearance(userId);
    return { success: true, data };
  }

  @Put('appearance')
  @ApiOperation({ summary: 'Atualizar configuraÃ§Ãµes de aparÃªncia' })
  @ApiResponse({ status: 200, description: 'ConfiguraÃ§Ãµes de aparÃªncia atualizadas', type: AppearanceSuccessResponseDto })
  @ApiResponse({ status: 400, description: 'Dados de entrada invÃ¡lidos', type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, description: 'NÃ£o autenticado', type: ApiErrorResponseDto })
  async updateAppearance(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateAppearanceDto,
  ) {
    const data = await this.settingsService.updateAppearance(userId, dto);
    return { success: true, data };
  }

  // â”€â”€ Notifications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Get('notifications')
  @ApiOperation({ summary: 'Obter preferÃªncias de notificaÃ§Ã£o' })
  @ApiResponse({ status: 200, description: 'PreferÃªncias de notificaÃ§Ã£o retornadas', type: NotificationPreferencesSuccessResponseDto })
  @ApiResponse({ status: 401, description: 'NÃ£o autenticado', type: ApiErrorResponseDto })
  async getNotificationPreferences(@CurrentUser('sub') userId: string) {
    const data = await this.settingsService.getNotificationPreferences(userId);
    return { success: true, data };
  }

  @Put('notifications')
  @ApiOperation({ summary: 'Atualizar preferÃªncias de notificaÃ§Ã£o' })
  @ApiResponse({ status: 200, description: 'PreferÃªncias atualizadas', type: NotificationPreferencesSuccessResponseDto })
  @ApiResponse({ status: 400, description: 'Dados de entrada invÃ¡lidos', type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, description: 'NÃ£o autenticado', type: ApiErrorResponseDto })
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

  // â”€â”€ Security â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Post('security/change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Alterar senha' })
  @ApiResponse({ status: 200, description: 'Senha alterada com sucesso', type: ApiMessageResponseDto })
  @ApiResponse({ status: 400, description: 'Senhas nÃ£o conferem ou senha atual incorreta', type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, description: 'NÃ£o autenticado', type: ApiErrorResponseDto })
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
  @ApiOperation({ summary: 'Listar sessÃµes ativas' })
  @ApiResponse({ status: 200, description: 'Lista de sessÃµes ativas', type: SessionListSuccessResponseDto })
  @ApiResponse({ status: 401, description: 'NÃ£o autenticado', type: ApiErrorResponseDto })
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
  @ApiOperation({ summary: 'Revogar uma sessÃ£o' })
  @ApiParam({ name: 'id', description: 'UUID da sessÃ£o' })
  @ApiResponse({ status: 200, description: 'SessÃ£o revogada', type: ApiMessageResponseDto })
  @ApiResponse({ status: 401, description: 'NÃ£o autenticado', type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, description: 'SessÃ£o nÃ£o encontrada', type: ApiErrorResponseDto })
  async revokeSession(
    @Param('id', ParseUUIDPipe) sessionId: string,
    @CurrentUser('sub') userId: string,
  ) {
    await this.settingsService.revokeSession(sessionId, userId);
    return { success: true, message: 'SessÃ£o revogada com sucesso' };
  }

  // â”€â”€ Privacy (LGPD) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Post('privacy/export')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exportar todos os dados do usuÃ¡rio (LGPD)' })
  @ApiResponse({ status: 200, description: 'Dados exportados em JSON', type: PrivacyExportSuccessResponseDto })
  @ApiResponse({ status: 401, description: 'NÃ£o autenticado', type: ApiErrorResponseDto })
  async exportData(
    @CurrentUser('sub') userId: string,
    @CurrentTenant() tenantId: string,
  ) {
    const data = await this.settingsService.exportUserData(userId, tenantId);
    return { success: true, data };
  }

  @Delete('account')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Excluir conta do usuÃ¡rio (LGPD)' })
  @ApiResponse({ status: 200, description: 'Conta excluÃ­da com sucesso', type: ApiMessageResponseDto })
  @ApiResponse({ status: 400, description: 'Senha incorreta ou confirmaÃ§Ã£o invÃ¡lida', type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, description: 'NÃ£o autenticado', type: ApiErrorResponseDto })
  async deleteAccount(
    @CurrentUser('sub') userId: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: DeleteAccountDto,
  ) {
    await this.settingsService.deleteAccount(
      userId,
      tenantId,
      dto.password,
      dto.confirmation,
    );
    return { success: true, message: 'Conta excluÃ­da com sucesso. Seus dados foram removidos.' };
  }
}
