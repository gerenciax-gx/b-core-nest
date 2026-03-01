import {
  Controller,
  Delete,
  Param,
  Post,
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
} from '@nestjs/swagger';
import { UploadService } from '../../../application/services/upload.service.js';
import { CurrentTenant } from '../../../../../common/decorators/current-tenant.decorator.js';

@ApiTags('Uploads')
@ApiBearerAuth()
@Controller('uploads')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

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

  @Delete(':path')
  @ApiOperation({ summary: 'Remover arquivo por path' })
  async deleteFile(@Param('path') filePath: string) {
    await this.uploadService.deleteFile(filePath);

    return {
      success: true,
      message: 'Arquivo removido com sucesso',
    };
  }
}
