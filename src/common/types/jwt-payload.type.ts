export interface JwtPayload {
  sub: string;
  tenantId: string;
  email: string;
  role: 'admin' | 'user';
  mustResetPassword: boolean;
  iat?: number;
  exp?: number;
}
