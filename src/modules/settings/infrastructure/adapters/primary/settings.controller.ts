import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
} from '@nestjs/swagger';
import type { Request } from 'express';
import { SettingsService } from '../../../application/services/settings.service.js';
import { UploadService } from '../../../../upload/application/services/upload.service.js';
import { UpdatePersonalDto } from '../../../application/dto/update-personal.dto.js';
import { UpdateCompanyDto } from '../../../application/dto/update-company.dto.js';
import { ChangePasswordDto } from '../../../application/dto/change-password.dto.js';
import { UpdateAppearanceDto } from '../../../application/dto/update-appearance.dto.js';
import { UpdateNotificationPreferencesDto } from '../../../application/dto/update-notification-preferences.dto.js';
import { CurrentUser } from '../../../../../common/decorators/current-user.decorator.js';
import { CurrentTenant } from '../../../../../common/decorators/current-tenant.decorator.js';

@ApiTags('Settings')
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly uploadService: UploadService,
  ) {}

  // ── Personal ────────────────────────────────────────────

  @Get('personal')
  @ApiOperation({ summary: 'Obter dados pessoais do usuário' })
  async getPersonal(@CurrentUser('sub') userId: string) {
    const data = await this.settingsService.getPersonal(userId);
    return { success: true, data };
  }

  @Put('personal')
  @ApiOperation({ summary: 'Atualizar dados pessoais' })
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
  async getCompany(@CurrentTenant() tenantId: string) {
    const data = await this.settingsService.getCompany(tenantId);
    return { success: true, data };
  }

  @Put('company')
  @ApiOperation({ summary: 'Atualizar dados da empresa (admin only)' })
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
  async getAppearance(@CurrentUser('sub') userId: string) {
    const data = await this.settingsService.getAppearance(userId);
    return { success: true, data };
  }

  @Put('appearance')
  @ApiOperation({ summary: 'Atualizar configurações de aparência' })
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
  async getNotificationPreferences(@CurrentUser('sub') userId: string) {
    const data = await this.settingsService.getNotificationPreferences(userId);
    return { success: true, data };
  }

  @Put('notifications')
  @ApiOperation({ summary: 'Atualizar preferências de notificação' })
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
  async revokeSession(
    @Param('id') sessionId: string,
    @CurrentUser('sub') userId: string,
  ) {
    await this.settingsService.revokeSession(sessionId, userId);
    return { success: true, message: 'Sessão revogada com sucesso' };
  }
}
