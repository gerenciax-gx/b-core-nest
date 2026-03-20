import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type {
  TokenServicePort,
  TokenPayload,
} from '../../../domain/ports/output/token-service.port.js';

@Injectable()
export class JwtTokenService implements TokenServicePort {
  constructor(private readonly jwtService: JwtService) {}

  async sign(payload: TokenPayload): Promise<string> {
    return this.jwtService.signAsync(payload, { expiresIn: '15m' });
  }

  verify<T extends object = TokenPayload>(token: string): T {
    return this.jwtService.verify<T>(token);
  }
}
