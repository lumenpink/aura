import { Hono } from 'hono';
import { validator } from 'hono/validator';
import { setCookie, deleteCookie } from 'hono/cookie';
import { sign, verify } from 'hono/jwt';
import { loginSchema, refreshCookieSchema } from '@aura/shared';

type Bindings = {
  DB?: any; // D1Database is not globally typed in all environments, so we use any to be safe
  JWT_SECRET?: string;
};

const auth = new Hono<{ Bindings: Bindings }>();

// Fallback in-memory store for environments without Cloudflare D1 configured (e.g. dev/testing)
interface TokenSession {
  familyId: string;
  userCpf: string;
  isUsed: boolean;
  expiresAt: number;
}
const localTokenStore = new Map<string, TokenSession>();

const getJwtSecret = (c: any) => c.env.JWT_SECRET || 'super-secret-development-key';

async function hashPassword(password: string, salt: string): Promise<string> {
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

async function generateAccessToken(cpf: string, secret: string): Promise<string> {
  const payload = {
    sub: cpf,
    role: 'MEDICO',
    exp: Math.floor(Date.now() / 1000) + 15 * 60, // 15 minutes
  };
  return await sign(payload, secret, 'HS256');
}

async function generateRefreshToken(cpf: string, jti: string, familyId: string, secret: string): Promise<string> {
  const payload = {
    sub: cpf,
    jti,
    familyId,
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
  };
  return await sign(payload, secret, 'HS256');
}

// Rota de Login Blindada
auth.post('/login', validator('json', (value, c) => {
  const parsed = loginSchema.safeParse(value);
  if (!parsed.success) {
    return c.json({ error: 'Formato de credenciais inválido', details: parsed.error }, 400);
  }
  return parsed.data;
}), async (c) => {
  const { username, password } = c.req.valid('json');

  let user: any = null;
  let storedCreds: any = null;

  if (c.env.DB) {
    try {
      user = await c.env.DB.prepare(
        'SELECT id, cpf, name, phone, email, role FROM users WHERE cpf = ?'
      )
      .bind(username)
      .first();

      if (user) {
        storedCreds = await c.env.DB.prepare(
          'SELECT password_hash, salt FROM user_credentials WHERE user_id = ?'
        )
        .bind(user.id)
        .first();
      }
    } catch (dbError) {
      console.warn("Falha ao consultar banco D1 para login, usando fallback:", dbError);
    }
  }

  // Fallback para desenvolvimento local sem DB/migration executada
  if (!user || !storedCreds) {
    if (!c.env.DB && username === '12345678909' && password === 'senha123') {
      user = { id: 'd9b43c68-8be0-449e-8c3a-864a66a6a2a2', cpf: username, name: 'Dr. Gregory House (Mock)', role: 'MEDICO' };
    } else {
      return c.json({ error: 'Credenciais inválidas' }, 401);
    }
  } else {
    // Validar senha
    const computedHash = await hashPassword(password, storedCreds.salt);
    if (computedHash !== storedCreds.password_hash) {
      return c.json({ error: 'Credenciais inválidas' }, 401);
    }
  }

  const secret = getJwtSecret(c);
  const jti = crypto.randomUUID();
  const familyId = crypto.randomUUID();
  const refreshExpiresAt = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;

  // Persist the refresh token in D1 (or fallback to local memory)
  if (c.env.DB) {
    try {
      await c.env.DB.prepare(
        'INSERT INTO refresh_tokens (jti, family_id, user_cpf, is_used, expires_at) VALUES (?, ?, ?, 0, ?)'
      )
      .bind(jti, familyId, username, refreshExpiresAt)
      .run();
    } catch (dbError) {
      console.warn("Falha ao salvar token no banco D1, usando fallback em memória:", dbError);
      localTokenStore.set(jti, { familyId, userCpf: username, isUsed: false, expiresAt: refreshExpiresAt });
    }
  } else {
    localTokenStore.set(jti, { familyId, userCpf: username, isUsed: false, expiresAt: refreshExpiresAt });
  }

  // Generate both tokens
  const accessToken = await generateAccessToken(username, secret);
  const refreshToken = await generateRefreshToken(username, jti, familyId, secret);

  // Set the HTTP-Only Refresh Token cookie
  setCookie(c, 'refreshToken', refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'Strict',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });

  return c.json({
    message: 'Autenticação bem-sucedida',
    accessToken,
    user: { cpf: user.cpf, name: user.name, role: user.role }
  });
});

// Rota de Refresh Token com Rotação (RTR) e Detecção de Reuso
auth.post('/refresh', validator('cookie', (value, c) => {
  const parsed = refreshCookieSchema.safeParse(value);
  if (!parsed.success) {
    return c.json({ error: 'Refresh token ausente ou inválido', details: parsed.error }, 401);
  }
  return parsed.data;
}), async (c) => {
  const { refreshToken } = c.req.valid('cookie');
  const secret = getJwtSecret(c);

  let payload: any;
  try {
    payload = await verify(refreshToken, secret, 'HS256');
  } catch (err) {
    return c.json({ error: 'Token de refresh inválido ou expirado' }, 401);
  }

  const { sub: username, jti, familyId } = payload;
  if (!username || !jti || !familyId) {
    return c.json({ error: 'Payload de token inválido' }, 401);
  }

  // Query database/fallback to check token usage status
  let storedRecord: TokenSession | null = null;

  if (c.env.DB) {
    try {
      const dbRecord: any = await c.env.DB.prepare(
        'SELECT family_id, user_cpf, is_used, expires_at FROM refresh_tokens WHERE jti = ?'
      )
      .bind(jti)
      .first();

      if (dbRecord) {
        storedRecord = {
          familyId: dbRecord.family_id,
          userCpf: dbRecord.user_cpf,
          isUsed: dbRecord.is_used === 1,
          expiresAt: dbRecord.expires_at,
        };
      }
    } catch (dbError) {
      console.warn("Falha ao buscar token no banco D1, consultando fallback em memória:", dbError);
    }
  }

  if (!storedRecord) {
    const memRecord = localTokenStore.get(jti);
    if (memRecord) {
      storedRecord = memRecord;
    }
  }

  // If token is completely unknown
  if (!storedRecord) {
    return c.json({ error: 'Token de refresh desconhecido ou inválido' }, 401);
  }

  // REUSE DETECTION: If token has already been marked as used, revoke entire family!
  if (storedRecord.isUsed) {
    if (c.env.DB) {
      try {
        await c.env.DB.prepare(
          'UPDATE refresh_tokens SET is_used = 1 WHERE family_id = ?'
        )
        .bind(familyId)
        .run();
      } catch (dbError) {
        console.warn("Falha ao revogar família no banco D1:", dbError);
      }
    }

    // Revoke in-memory family
    for (const [key, val] of localTokenStore.entries()) {
      if (val.familyId === familyId) {
        localTokenStore.set(key, { ...val, isUsed: true });
      }
    }

    // Clean cookie and reject
    deleteCookie(c, 'refreshToken', { path: '/' });
    return c.json({ error: 'Tentativa de reuso de refresh token detectada. Acesso revogado por segurança.' }, 403);
  }

  // Token is valid and unused: proceed with rotation
  const newJti = crypto.randomUUID();
  const refreshExpiresAt = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;

  // Mark old token as used and insert new one
  if (c.env.DB) {
    try {
      // D1 runs non-transactionally but in sequence
      await c.env.DB.prepare(
        'UPDATE refresh_tokens SET is_used = 1 WHERE jti = ?'
      )
      .bind(jti)
      .run();

      await c.env.DB.prepare(
        'INSERT INTO refresh_tokens (jti, family_id, user_cpf, is_used, expires_at) VALUES (?, ?, ?, 0, ?)'
      )
      .bind(newJti, familyId, username, refreshExpiresAt)
      .run();
    } catch (dbError) {
      console.warn("Falha ao registrar rotação no banco D1:", dbError);
    }
  }

  // Update in-memory fallback
  const oldMemRecord = localTokenStore.get(jti);
  if (oldMemRecord) {
    localTokenStore.set(jti, { ...oldMemRecord, isUsed: true });
  }
  localTokenStore.set(newJti, { familyId, userCpf: username, isUsed: false, expiresAt: refreshExpiresAt });

  // Generate new token pair
  const newAccessToken = await generateAccessToken(username, secret);
  const newRefreshToken = await generateRefreshToken(username, newJti, familyId, secret);

  let userRole = 'MEDICO';
  let userName = '';

  if (c.env.DB) {
    try {
      const dbUser: any = await c.env.DB.prepare(
        'SELECT name, role FROM users WHERE cpf = ?'
      )
      .bind(username)
      .first();

      if (dbUser) {
        userRole = dbUser.role;
        userName = dbUser.name;
      }
    } catch (e) {
      console.warn("Falha ao buscar detalhes do usuário no refresh:", e);
    }
  }

  // Set the new HTTP-Only Refresh Token cookie
  setCookie(c, 'refreshToken', newRefreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'Strict',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });

  return c.json({
    message: 'Token atualizado com sucesso',
    accessToken: newAccessToken,
    user: { cpf: username, name: userName || 'Dr. Gregory House', role: userRole }
  });
});

export default auth;