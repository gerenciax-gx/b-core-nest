export interface TokenPayload {
  sub: string;
  tenantId: string;
  role: string;
  mustResetPassword: boolean;
}

export interface TokenServicePort {
  sign(payload: TokenPayload): Promise<string>;
  verify<T extends object = TokenPayload>(token: string): T;
}
