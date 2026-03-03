import { ApiProperty } from '@nestjs/swagger';

export class DashboardUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  role!: string;

  @ApiProperty({ nullable: true })
  avatarUrl!: string | null;
}

export class DashboardTenantDto {
  @ApiProperty()
  companyName!: string;

  @ApiProperty()
  companyType!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty({ nullable: true })
  logoUrl!: string | null;
}

export class DashboardResponseDto {
  @ApiProperty()
  user!: DashboardUserDto;

  @ApiProperty()
  tenant!: DashboardTenantDto;

  @ApiProperty({ example: 0, description: 'Número de ferramentas ativas (implementado na Fase 4)' })
  activeToolsCount!: number;

  @ApiProperty({ example: 0, description: 'Notificações não lidas (implementado na Fase 5)' })
  unreadNotifications!: number;

  @ApiProperty({ type: String, nullable: true, example: null, description: 'Resumo da assinatura (implementado na Fase 4)' })
  subscription!: string | null;
}
