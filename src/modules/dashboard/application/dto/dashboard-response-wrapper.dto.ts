import { ApiProperty } from '@nestjs/swagger';
import { DashboardResponseDto } from './dashboard-response.dto.js';

export class DashboardSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ type: DashboardResponseDto })
  data!: DashboardResponseDto;
}
