import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: string;
  tenantId: string;
  role: 'master' | 'admin' | 'user';
  mustResetPassword: boolean;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('auth.jwtSecret') ??
        'change-me-in-production',
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    if (!payload.sub || !payload.tenantId) {
      throw new UnauthorizedException('Token inválido');
    }
    return payload;
  }
}
