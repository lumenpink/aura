import { Hono } from 'hono';
import { validator } from 'hono/validator';
import { setCookie, deleteCookie, getCookie } from 'hono/cookie';
import { verify } from 'hono/jwt';
import { loginSchema, refreshCookieSchema } from '@aura/shared';
import {
  getJwtSecret,
  hashPassword,
  generateAccessToken,
  generateRefreshToken,
  getSystemConfigs,
  revokeSession,
  isSessionRevoked
} from '../utils/auth-helpers';

type Bindings = {
  DB?: any;
  REVOCATION_KV?: any;
  JWT_SECRET?: string;
};

const auth = new Hono<{ Bindings: Bindings }>();

// Fallback in-memory store for environments without Cloudflare D1 configured (e.g. dev/testing)
interface TokenSession {
  id: string;
  userCpf: string;
  currentTokenJti: string;
  lastTokenJti: string | null;
  penultimateTokenJti: string | null;
  expiresAt: number;
}
const localTokenStore = new Map<string, TokenSession>();

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

  if (!user || !storedCreds) {
    return c.json({ error: 'Credenciais inválidas' }, 401);
  }

  // Validar senha
  const computedHash = await hashPassword(password, storedCreds.salt);
  if (computedHash !== storedCreds.password_hash) {
    return c.json({ error: 'Credenciais inválidas' }, 401);
  }

  // Obter configurações do sistema
  const configs = await getSystemConfigs(c);
  const secret = getJwtSecret(c);
  const sid = crypto.randomUUID();
  const jti = crypto.randomUUID();
  const refreshExpiresAt = Math.floor(Date.now() / 1000) + configs.cookieTtlSeconds;

  // Lógica de Sessão Única (Single Session) avaliada pelo Worker
  if (configs.singleSessionEnabled) {
    if (c.env.DB) {
      try {
        // Encontrar sessões anteriores
        const oldSessions: any = await c.env.DB.prepare(
          'SELECT id FROM sessions WHERE user_cpf = ?'
        )
        .bind(username)
        .all();

        if (oldSessions && oldSessions.results) {
          for (const session of oldSessions.results) {
            // Revogar no KV pelo tempo de vida do JWT (para invalidar Access Tokens em trânsito)
            await revokeSession(c, session.id, configs.jwtTtlSeconds);
            
            // Deletar sessão anterior do banco
            await c.env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(session.id).run();
          }
        }
      } catch (dbError) {
        console.warn("Falha ao invalidar sessões anteriores no D1:", dbError);
      }
    }

    // Invalidação no store local (fallback)
    for (const [key, val] of localTokenStore.entries()) {
      if (val.userCpf === username) {
        await revokeSession(c, val.id, configs.jwtTtlSeconds);
        localTokenStore.delete(key);
      }
    }
  }

  // Persistir nova sessão
  if (c.env.DB) {
    try {
      await c.env.DB.prepare(
        'INSERT INTO sessions (id, user_cpf, current_token_jti, expires_at) VALUES (?, ?, ?, ?)'
      )
      .bind(sid, username, jti, refreshExpiresAt)
      .run();
    } catch (dbError) {
      console.warn("Falha ao salvar sessão no banco D1, usando fallback em memória:", dbError);
      localTokenStore.set(sid, {
        id: sid,
        userCpf: username,
        currentTokenJti: jti,
        lastTokenJti: null,
        penultimateTokenJti: null,
        expiresAt: refreshExpiresAt
      });
    }
  } else {
    localTokenStore.set(sid, {
      id: sid,
      userCpf: username,
      currentTokenJti: jti,
      lastTokenJti: null,
      penultimateTokenJti: null,
      expiresAt: refreshExpiresAt
    });
  }

  // Gerar tokens
  const accessToken = await generateAccessToken(username, secret, sid, configs.jwtTtlSeconds);
  const refreshToken = await generateRefreshToken(username, jti, sid, secret, configs.cookieTtlSeconds);

  // Set HTTP-Only Refresh Token Cookie
  setCookie(c, 'refreshToken', refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'Strict',
    path: '/',
    maxAge: configs.cookieTtlSeconds,
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

  const { sub: username, jti, sid } = payload;
  if (!username || !jti || !sid) {
    return c.json({ error: 'Payload de token inválido' }, 401);
  }

  // Verificar se a sessão foi revogada via KV
  const isRevoked = await isSessionRevoked(c, sid);
  if (isRevoked) {
    return c.json({ error: 'Sessão revogada ou inválida' }, 401);
  }

  // Obter configurações do sistema
  const configs = await getSystemConfigs(c);
  let storedRecord: TokenSession | null = null;

  if (c.env.DB) {
    try {
      const dbRecord: any = await c.env.DB.prepare(
        'SELECT id, user_cpf, current_token_jti, last_token_jti, penultimate_token_jti, expires_at FROM sessions WHERE id = ?'
      )
      .bind(sid)
      .first();

      if (dbRecord) {
        storedRecord = {
          id: dbRecord.id,
          userCpf: dbRecord.user_cpf,
          currentTokenJti: dbRecord.current_token_jti,
          lastTokenJti: dbRecord.last_token_jti,
          penultimateTokenJti: dbRecord.penultimate_token_jti,
          expiresAt: dbRecord.expires_at,
        };
      }
    } catch (dbError) {
      console.warn("Falha ao buscar sessão no banco D1, consultando fallback em memória:", dbError);
    }
  }

  if (!storedRecord) {
    storedRecord = localTokenStore.get(sid) || null;
  }

  if (!storedRecord) {
    return c.json({ error: 'Sessão não encontrada' }, 401);
  }

  // DETECÇÃO DE REUSO: se o jti for igual a um dos dois últimos utilizados, revoga tudo!
  if (jti === storedRecord.lastTokenJti || jti === storedRecord.penultimateTokenJti) {
    // Revogar sessão inteira
    await revokeSession(c, sid, configs.jwtTtlSeconds);

    if (c.env.DB) {
      try {
        await c.env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(sid).run();
      } catch (dbError) {
        console.warn("Falha ao deletar sessão do banco D1:", dbError);
      }
    }
    localTokenStore.delete(sid);

    deleteCookie(c, 'refreshToken', { path: '/' });
    return c.json({ error: 'Tentativa de reuso de refresh token detectada. Acesso revogado por segurança.' }, 403);
  }

  // Se o jti não for o ativo atual, é inválido
  if (jti !== storedRecord.currentTokenJti) {
    return c.json({ error: 'Refresh token inválido' }, 401);
  }

  // Token válido e atual: rotacionar em-place
  const newJti = crypto.randomUUID();
  const refreshExpiresAt = Math.floor(Date.now() / 1000) + configs.cookieTtlSeconds;

  if (c.env.DB) {
    try {
      await c.env.DB.prepare(
        'UPDATE sessions SET penultimate_token_jti = last_token_jti, last_token_jti = current_token_jti, current_token_jti = ?, expires_at = ? WHERE id = ?'
      )
      .bind(newJti, refreshExpiresAt, sid)
      .run();
    } catch (dbError) {
      console.warn("Falha ao atualizar rotação de sessão no D1:", dbError);
    }
  }

  // Atualizar store em memória local
  const oldLocal = localTokenStore.get(sid);
  if (oldLocal) {
    localTokenStore.set(sid, {
      ...oldLocal,
      penultimateTokenJti: oldLocal.lastTokenJti,
      lastTokenJti: oldLocal.currentTokenJti,
      currentTokenJti: newJti,
      expiresAt: refreshExpiresAt
    });
  }

  // Gerar novos tokens
  const newAccessToken = await generateAccessToken(username, secret, sid, configs.jwtTtlSeconds);
  const newRefreshToken = await generateRefreshToken(username, newJti, sid, secret, configs.cookieTtlSeconds);

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

  // Set HTTP-Only Refresh Token Cookie
  setCookie(c, 'refreshToken', newRefreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'Strict',
    path: '/',
    maxAge: configs.cookieTtlSeconds,
  });

  return c.json({
    message: 'Token atualizado com sucesso',
    accessToken: newAccessToken,
    user: { cpf: username, name: userName || 'Dr. Gregory House', role: userRole }
  });
});

// Rota de Logout / Invalidação Rápida
auth.post('/logout', async (c) => {
  const refreshTokenCookie = getCookie(c, 'refreshToken');
  const configs = await getSystemConfigs(c);
  const secret = getJwtSecret(c);

  let sid: string | null = null;

  if (refreshTokenCookie) {
    try {
      const payload: any = await verify(refreshTokenCookie, secret, 'HS256');
      if (payload && payload.sid) {
        sid = payload.sid;
      }
    } catch (e) {
      // Ignora erro de expiração no logout
    }
  }

  if (sid) {
    // Revoga a sessão instantaneamente no KV
    await revokeSession(c, sid, configs.jwtTtlSeconds);

    // Deleta do D1
    if (c.env.DB) {
      try {
        await c.env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(sid).run();
      } catch (dbError) {
        console.warn("Falha ao remover sessão no D1 durante o logout:", dbError);
      }
    }
    localTokenStore.delete(sid);
  }

  // Limpa o cookie
  deleteCookie(c, 'refreshToken', { path: '/' });

  return c.json({ message: 'Logoff efetuado com sucesso' });
});

export default auth;