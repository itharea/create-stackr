import { randomBytes } from 'node:crypto';

/**
 * Credential generation for init-time `.env` writes.
 *
 * v0.4 generated Postgres / Redis / BetterAuth secrets inside the bash
 * `setup.sh` script via `openssl rand`. v0.5's multi-microservice refactor
 * moved setup.sh to pure file-copy, so credential generation had to move
 * somewhere. We put it here, in plain TypeScript, so:
 *
 *   - the generator writes real `.env` files at init time (no user edits
 *     needed before `docker compose up`),
 *   - `stackr add service` can reuse the same generator when appending a
 *     new service's env block to the root `.env`, and
 *   - tests can exercise the flow without a bash interpreter.
 *
 * Everything here is derived from `crypto.randomBytes`, so each call
 * returns a fresh value. No reseeding, no global state, no async I/O.
 */

/**
 * URL-safe alphanumeric password. Uses base64url and strips any residual
 * padding / symbols so the result can be embedded in a `postgresql://user:pw@...`
 * connection string without URL encoding. We over-sample by a few bytes
 * and slice to guarantee the output length even after character filtering.
 */
export function generatePassword(length = 24): string {
  if (!Number.isInteger(length) || length <= 0) {
    throw new Error(`generatePassword: length must be a positive integer, got ${length}`);
  }

  // base64url already uses A-Z a-z 0-9 - _, so we only need to drop
  // the hyphen / underscore / padding to get a clean alnum password.
  // Over-sample by 8 bytes so even after filtering we have enough chars
  // to cover `length`.
  const bytes = randomBytes(Math.ceil((length * 3) / 4) + 8);
  const alnum = bytes.toString('base64').replace(/[+/=]/g, '');

  if (alnum.length < length) {
    // Extremely unlikely given the over-sample, but guard against it
    // rather than silently returning a short password.
    throw new Error(
      `generatePassword: randomBytes produced ${alnum.length} alnum chars, needed ${length}`
    );
  }

  return alnum.slice(0, length);
}

/**
 * Long hex secret suitable for BetterAuth / JWT / session signing keys.
 * `bytes` is the number of random bytes, so the returned string is
 * `bytes * 2` hex characters. Default 32 bytes → 64 hex chars.
 */
export function generateHexSecret(bytes = 32): string {
  if (!Number.isInteger(bytes) || bytes <= 0) {
    throw new Error(`generateHexSecret: bytes must be a positive integer, got ${bytes}`);
  }
  return randomBytes(bytes).toString('hex');
}

/**
 * Credentials for a single service. `dbPassword` and `redisPassword` go
 * into the root `.env` (where docker-compose reads them) and into the
 * service's own `backend/.env`. `authSecret` is used as `BETTER_AUTH_SECRET`
 * by the auth service — base services ignore it.
 */
export interface ServiceCredentials {
  readonly dbPassword: string;
  readonly redisPassword: string;
  readonly authSecret: string;
}

/**
 * Generate a fresh credential bundle for one service. Each call is
 * independent — generating N services produces N independent bundles.
 */
export function generateServiceCredentials(): ServiceCredentials {
  return {
    dbPassword: generatePassword(24),
    redisPassword: generatePassword(24),
    authSecret: generateHexSecret(32),
  };
}
