import { createRemoteJWKSet, jwtVerify } from 'jose';
import { getCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';
import { optional, type AppEnv } from './env';
import { HttpError } from './errors';
import { roleFor, type People } from './people';

const HEADER = 'Cf-Access-Jwt-Assertion';
const COOKIE = 'CF_Authorization';

type Jwks = ReturnType<typeof createRemoteJWKSet>;
const jwksByDomain = new Map<string, Jwks>();

function jwksFor(teamDomain: string): Jwks {
  let jwks = jwksByDomain.get(teamDomain);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`https://${teamDomain}/cdn-cgi/access/certs`));
    jwksByDomain.set(teamDomain, jwks);
  }
  return jwks;
}

/** Verifies a Cloudflare Access JWT and returns the email it asserts. */
export async function verifyAccessJwt(
  token: string,
  teamDomain: string,
  audience: string,
): Promise<string> {
  let email: unknown;
  try {
    const { payload } = await jwtVerify(token, jwksFor(teamDomain), {
      issuer: `https://${teamDomain}`,
      audience,
    });
    email = payload.email;
  } catch {
    throw new HttpError(401, 'unauthorized', 'Access token is invalid or expired');
  }
  if (typeof email !== 'string' || !email.includes('@')) {
    throw new HttpError(401, 'unauthorized', 'Access token carries no email');
  }
  return email;
}

/**
 * Resolves the caller to {email, role} and stores it on the context as `actor`.
 * Order: Access JWT (header, then cookie); DEV_BYPASS_EMAIL only when no team domain is configured.
 */
export function requireIdentity(people?: People) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const teamDomain = optional(c.env.ACCESS_TEAM_DOMAIN);
    const audience = optional(c.env.ACCESS_AUD);
    const bypass = optional(c.env.DEV_BYPASS_EMAIL);
    const token = c.req.header(HEADER) ?? getCookie(c, COOKIE);

    let email: string;
    if (token) {
      if (!teamDomain || !audience) {
        throw new HttpError(
          401,
          'unauthorized',
          'ACCESS_TEAM_DOMAIN and ACCESS_AUD are not configured',
        );
      }
      email = await verifyAccessJwt(token, teamDomain, audience);
    } else if (bypass && !teamDomain) {
      email = bypass;
    } else {
      throw new HttpError(401, 'unauthorized', 'Sign in through Cloudflare Access');
    }

    const role = roleFor(email, people);
    if (!role) {
      throw new HttpError(
        403,
        'not_allowed',
        `${email.toLowerCase()} is not listed in config/people.json`,
      );
    }
    c.set('actor', { email: email.toLowerCase(), role });
    await next();
  });
}

export const requireOwner = createMiddleware<AppEnv>(async (c, next) => {
  const actor = c.get('actor');
  if (actor.role !== 'owner') {
    throw new HttpError(403, 'not_allowed', 'Only an owner can do this');
  }
  await next();
});
