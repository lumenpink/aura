import { sign } from 'hono/jwt';

export const getJwtSecret = (c: any) => c.env.JWT_SECRET || 'super-secret-development-key';

// Local memory store for revoked sessions fallback (to allow testing without Cloudflare KV bound)
const localRevokedSessions = new Map<string, number>();

export async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(salt),
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "HMAC", hash: "SHA-256", length: 256 },
    true,
    ["sign"]
  );
  const exported = await crypto.subtle.exportKey("raw", key) as ArrayBuffer;
  const hashArray = Array.from(new Uint8Array(exported));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function generateAccessToken(cpf: string, secret: string, sid: string, ttlSeconds: number): Promise<string> {
  const payload = {
    sub: cpf,
    role: 'MEDICO',
    sid,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  return await sign(payload, secret, 'HS256');
}

export async function generateRefreshToken(cpf: string, jti: string, sid: string, secret: string, ttlSeconds: number): Promise<string> {
  const payload = {
    sub: cpf,
    jti,
    sid,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  return await sign(payload, secret, 'HS256');
}

export async function revokeSession(c: any, sid: string, ttlSeconds: number): Promise<void> {
  if (c.env.REVOCATION_KV) {
    try {
      // Expiration TTL must be at least 60 seconds
      const ttl = Math.max(60, ttlSeconds);
      await c.env.REVOCATION_KV.put(`revoked:session:${sid}`, '1', { expirationTtl: ttl });
    } catch (e) {
      console.warn("Falha ao salvar sessão revogada no KV:", e);
      localRevokedSessions.set(sid, Date.now() + ttlSeconds * 1000);
    }
  } else {
    localRevokedSessions.set(sid, Date.now() + ttlSeconds * 1000);
  }
}

export async function isSessionRevoked(c: any, sid: string): Promise<boolean> {
  if (c.env.REVOCATION_KV) {
    try {
      const val = await c.env.REVOCATION_KV.get(`revoked:session:${sid}`);
      if (val === '1') {
        return true;
      }
    } catch (e) {
      console.warn("Falha ao buscar sessão revogada no KV:", e);
    }
  }
  
  const expireAt = localRevokedSessions.get(sid);
  if (expireAt && expireAt > Date.now()) {
    return true;
  }
  return false;
}

export interface SystemConfigs {
  singleSessionEnabled: boolean;
  jwtTtlSeconds: number;
  cookieTtlSeconds: number;
}

export async function getSystemConfigs(c: any): Promise<SystemConfigs> {
  const defaults = {
    singleSessionEnabled: false,
    jwtTtlSeconds: 900, // 15 mins
    cookieTtlSeconds: 604800, // 7 days
  };

  if (!c.env.DB) {
    return defaults;
  }

  try {
    const rows: any = await c.env.DB.prepare('SELECT key, value FROM system_configs').all();
    if (rows && rows.results) {
      const configs = { ...defaults };
      for (const row of rows.results) {
        if (row.key === 'single_session_enabled') {
          configs.singleSessionEnabled = row.value === 'true';
        } else if (row.key === 'jwt_ttl_seconds') {
          configs.jwtTtlSeconds = parseInt(row.value, 10) || defaults.jwtTtlSeconds;
        } else if (row.key === 'cookie_ttl_seconds') {
          configs.cookieTtlSeconds = parseInt(row.value, 10) || defaults.cookieTtlSeconds;
        }
      }
      return configs;
    }
  } catch (e) {
    console.warn("Falha ao ler system_configs do D1, usando fallbacks padrão:", e);
  }

  return defaults;
}
