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

export class DashboardSubscriptionDto {
  @ApiProperty({ example: 'active' })
  status!: string;

  @ApiProperty({ example: '2026-04-01', nullable: true })
  nextBillingDate!: string | null;

  @ApiProperty({ example: 149.7 })
  totalAmount!: number;
}

export class DashboardResponseDto {
  @ApiProperty()
  user!: DashboardUserDto;

  @ApiProperty()
  tenant!: DashboardTenantDto;

  @ApiProperty({ example: 3, description: 'Ferramentas ativas do tenant' })
  activeToolsCount!: number;

  @ApiProperty({ example: 5, description: 'Notificações não lidas' })
  unreadNotifications!: number;

  @ApiProperty({ example: 2, description: 'Colaboradores ativos' })
  activeCollaborators!: number;

  @ApiProperty({ example: 15, description: 'Total de produtos cadastrados' })
  totalProducts!: number;

  @ApiProperty({ example: 8, description: 'Total de serviços cadastrados' })
  totalServices!: number;

  @ApiProperty({ type: DashboardSubscriptionDto, nullable: true, description: 'Resumo da assinatura ativa' })
  subscription!: DashboardSubscriptionDto | null;
}
