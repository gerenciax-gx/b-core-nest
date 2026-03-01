import { ApiProperty } from '@nestjs/swagger';

export class UploadResponseDto {
  @ApiProperty({ example: 'https://cdn.gerenciax.com/tenant-uuid/products/image-id.jpg' })
  url!: string;

  @ApiProperty({ example: 'tenant-uuid/products/image-id.jpg' })
  path!: string;

  @ApiProperty({ example: 245000 })
  size!: number;

  @ApiProperty({ example: 'image/jpeg' })
  mimeType!: string;
}
