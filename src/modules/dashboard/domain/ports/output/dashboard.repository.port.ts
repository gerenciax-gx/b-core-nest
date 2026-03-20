export interface DashboardMetrics {
  activeToolsCount: number;
  unreadNotifications: number;
  activeCollaborators: number;
  totalProducts: number;
  totalServices: number;
  subscription: {
    status: string;
    nextBillingDate: string | null;
    totalAmount: number;
  } | null;
}

export interface DashboardRepositoryPort {
  getMetrics(tenantId: string): Promise<DashboardMetrics>;
}
