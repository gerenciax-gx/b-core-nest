import type { UserResponseDto } from '../../../application/dtos/user-response.dto.js';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface SignupInput {
  name: string;
  email: string;
  password: string;
  companyName: string;
  companyType: 'products' | 'services' | 'both';
}

export interface LoginInput {
  email: string;
  password: string;
  device?: string;
  ip?: string;
  userAgent?: string;
}

export interface AuthUseCasePort {
  signup(
    input: SignupInput,
  ): Promise<{ user: UserResponseDto; tokens: AuthTokens }>;
  login(
    input: LoginInput,
  ): Promise<{ user: UserResponseDto; tokens: AuthTokens }>;
  refreshToken(refreshToken: string): Promise<AuthTokens>;
  logout(refreshToken: string): Promise<void>;
  resetPassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void>;
}
