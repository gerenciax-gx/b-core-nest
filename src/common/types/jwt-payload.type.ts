export interface JwtPayload {
  sub: string;
  tenantId: string;
  email: string;
  role: 'master' | 'admin' | 'user';
  mustResetPassword: boolean;
  iat?: number;
  exp?: number;
}
