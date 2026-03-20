import { createHash } from 'node:crypto';

/**
 * Hash a token with SHA-256 for safe storage.
 * Used for refresh tokens and password reset tokens.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
