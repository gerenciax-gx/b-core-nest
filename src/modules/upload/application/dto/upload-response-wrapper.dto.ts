import { ApiProperty } from '@nestjs/swagger';
import { UploadResponseDto } from './upload-response.dto.js';

export class UploadSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ type: UploadResponseDto })
  data!: UploadResponseDto;
}

export class UploadMultipleSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ type: [UploadResponseDto] })
  data!: UploadResponseDto[];
}
