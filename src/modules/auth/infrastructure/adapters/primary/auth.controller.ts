import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import type { AuthUseCasePort } from '../../../domain/ports/input/auth.usecase.port.js';
import { SignupDto } from '../../../application/dtos/signup.dto.js';
import { LoginDto } from '../../../application/dtos/login.dto.js';
import { ResetPasswordDto } from '../../../application/dtos/reset-password.dto.js';
import { AuthResponseDto, RefreshResponseDto } from '../../../application/dtos/auth-response.dto.js';
import { Public } from '../../../../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../../../../common/decorators/current-user.decorator.js';
import { ApiErrorResponseDto, ApiMessageResponseDto } from '../../../../../common/swagger/api-responses.dto.js';

const REFRESH_TOKEN_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 dias

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject('AuthUseCasePort')
    private readonly authService: AuthUseCasePort,
  ) {}

  @Public()
  @Post('signup')
  @ApiOperation({ summary: 'Cadastro de nova conta (cria tenant + admin user)' })
  @ApiResponse({ status: 201, description: 'Conta criada com sucesso', type: AuthResponseDto })
  @ApiResponse({ status: 400, description: 'Dados de entrada inválidos', type: ApiErrorResponseDto })
  @ApiResponse({ status: 409, description: 'Email já cadastrado', type: ApiErrorResponseDto })
  async signup(
    @Body() dto: SignupDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.signup({
      name: dto.name,
      email: dto.email,
      password: dto.password,
      companyName: dto.companyName,
      companyType: dto.companyType,
    });

    this.setRefreshTokenCookie(res, result.tokens.refreshToken);

    return {
      success: true,
      message: 'Conta criada com sucesso',
      data: {
        user: result.user,
        accessToken: result.tokens.accessToken,
      },
    };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login com email e senha' })
  @ApiResponse({ status: 200, description: 'Login realizado com sucesso', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas', type: ApiErrorResponseDto })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login({
      email: dto.email,
      password: dto.password,
      device: req.headers['x-device-type'] as string | undefined,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    this.setRefreshTokenCookie(res, result.tokens.refreshToken);

    return {
      success: true,
      message: 'Login realizado com sucesso',
      data: {
        user: result.user,
        accessToken: result.tokens.accessToken,
      },
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar access token via refresh token (cookie)' })
  @ApiResponse({ status: 200, description: 'Token renovado com sucesso', type: RefreshResponseDto })
  @ApiResponse({ status: 401, description: 'Refresh token inválido ou expirado', type: ApiErrorResponseDto })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = (req as unknown as Record<string, unknown>)[
      'cookies'
    ] as Record<string, string> | undefined;
    const token = refreshToken?.['refreshToken'] ?? '';

    const tokens = await this.authService.refreshToken(token);
    this.setRefreshTokenCookie(res, tokens.refreshToken);

    return {
      success: true,
      data: { accessToken: tokens.accessToken },
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout — revoga refresh token' })
  @ApiResponse({ status: 200, description: 'Logout realizado', type: ApiMessageResponseDto })
  @ApiResponse({ status: 401, description: 'Token de acesso inválido', type: ApiErrorResponseDto })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const cookies = (req as unknown as Record<string, unknown>)['cookies'] as
      | Record<string, string>
      | undefined;
    const refreshToken = cookies?.['refreshToken'];

    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    res.clearCookie('refreshToken', { path: '/api/v1/auth' });

    return { success: true, message: 'Logout realizado' };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Alterar senha do usuário autenticado' })
  @ApiResponse({ status: 200, description: 'Senha alterada com sucesso', type: ApiMessageResponseDto })
  @ApiResponse({ status: 400, description: 'Senha atual incorreta ou dados inválidos', type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Token de acesso inválido', type: ApiErrorResponseDto })
  async resetPassword(
    @CurrentUser('sub') userId: string,
    @Body() dto: ResetPasswordDto,
  ) {
    await this.authService.resetPassword(
      userId,
      dto.currentPassword,
      dto.newPassword,
    );

    return { success: true, message: 'Senha alterada com sucesso' };
  }

  // ── Private ───────────────────────────────────────────────

  private setRefreshTokenCookie(res: Response, token: string): void {
    res.cookie('refreshToken', token, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'prod',
      sameSite: 'strict',
      maxAge: REFRESH_TOKEN_MAX_AGE,
      path: '/api/v1/auth',
    });
  }
}
