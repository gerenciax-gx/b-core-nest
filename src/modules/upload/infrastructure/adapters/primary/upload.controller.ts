import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import type { UploadUseCasePort } from '../../../domain/ports/input/upload.usecase.port.js';
import { UploadSuccessResponseDto, UploadMultipleSuccessResponseDto } from '../../../application/dto/upload-response-wrapper.dto.js';
import { ApiErrorResponseDto, ApiMessageResponseDto } from '../../../../../common/swagger/api-responses.dto.js';
import { CurrentTenant } from '../../../../../common/decorators/current-tenant.decorator.js';

@ApiTags('Uploads')
@ApiBearerAuth()
@Controller('uploads')
export class UploadController {
  constructor(
    @Inject('UploadUseCasePort')
    private readonly uploadService: UploadUseCasePort,
  ) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload de imagem única' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        folder: { type: 'string', example: 'products' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Imagem enviada com sucesso', type: UploadSuccessResponseDto })
  @ApiResponse({ status: 400, description: 'Arquivo inválido', type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Não autenticado', type: ApiErrorResponseDto })
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @CurrentTenant() tenantId: string,
  ) {
    const result = await this.uploadService.uploadImage(
      file,
      tenantId,
      'general',
    );

    return {
      success: true,
      data: result,
    };
  }

  @Post('images')
  @UseInterceptors(FilesInterceptor('files', 10))
  @ApiOperation({ summary: 'Upload múltiplo de imagens (máx. 10)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Imagens enviadas com sucesso', type: UploadMultipleSuccessResponseDto })
  @ApiResponse({ status: 400, description: 'Arquivos inválidos', type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Não autenticado', type: ApiErrorResponseDto })
  async uploadImages(
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentTenant() tenantId: string,
  ) {
    const results = await this.uploadService.uploadImages(
      files,
      tenantId,
      'general',
    );

    return {
      success: true,
      data: results,
    };
  }

  @Get('signed-url')
  @ApiOperation({ summary: 'Obter URL assinada temporária para um arquivo' })
  @ApiQuery({ name: 'path', description: 'Caminho do arquivo no storage', required: true })
  @ApiResponse({ status: 200, description: 'URL assinada gerada com sucesso' })
  @ApiResponse({ status: 400, description: 'Path não informado', type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Não autenticado', type: ApiErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Sem permissão', type: ApiErrorResponseDto })
  async getSignedUrl(
    @Query('path') filePath: string,
    @CurrentTenant() tenantId: string,
  ) {
    if (!filePath) {
      throw new BadRequestException('Path do arquivo é obrigatório');
    }

    const url = await this.uploadService.getSignedUrl(filePath, tenantId);

    return {
      success: true,
      data: { url },
    };
  }

  @Delete(':path')
  @ApiOperation({ summary: 'Remover arquivo por path' })
  @ApiParam({ name: 'path', description: 'Caminho do arquivo no storage' })
  @ApiResponse({ status: 200, description: 'Arquivo removido', type: ApiMessageResponseDto })
  @ApiResponse({ status: 401, description: 'Não autenticado', type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Arquivo não encontrado', type: ApiErrorResponseDto })
  async deleteFile(
    @Param('path') filePath: string,
    @CurrentTenant() tenantId: string,
  ) {
    await this.uploadService.deleteFile(filePath, tenantId);

    return {
      success: true,
      message: 'Arquivo removido com sucesso',
    };
  }
}
