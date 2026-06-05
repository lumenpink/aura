import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { setCookie, deleteCookie } from 'hono/cookie';
import { allowedOriginsSchema } from '@aura/shared';

type Bindings = {
  D1_MAIN?: any;
  REVOCATION_KV?: any;
  ALLOWED_ORIGINS?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Global CORS Middleware with strict origin check and preflight optimization
app.use('*', async (c, next) => {
  const allowedRaw = c.env.ALLOWED_ORIGINS || '';
  const parsedOrigins = allowedOriginsSchema.safeParse(allowedRaw);
  const allowed = parsedOrigins.success ? parsedOrigins.data : '';
  const allowedOrigins = allowed ? allowed.split(',').map(o => o.trim()) : [];

  const origin = c.req.header('Origin');
  if (origin && !allowedOrigins.includes(origin)) {
    return c.json({ error: 'Origem não permitida', code: 'JQ488' }, 403);
  }

  return cors({
    origin: (origin) => {
      if (allowedOrigins.includes(origin)) {
        return origin;
      }
      return allowedOrigins[0] || '';
    },
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400, // Access-Control-Max-Age
  })(c, next);
});

// Setup Dedicated Sub-routers
const authRouter = new Hono<{ Bindings: Bindings }>();
const apiRouter = new Hono<{ Bindings: Bindings }>();

// Auth Routing Constraints
authRouter.use('*', async (c, next) => {
  const path = c.req.path;
  if (!path.startsWith('/auth')) {
    return c.json({ error: 'Acesso negado - Caminho inválido', code: 'JQ487_PATH' }, 403);
  }
  await next();
});

// API Routing Constraints
apiRouter.use('*', async (c, next) => {
  const path = c.req.path;
  if (!path.startsWith('/api')) {
    return c.json({ error: 'Acesso negado - Caminho operacional inválido', code: 'JQ488_PATH' }, 403);
  }
  await next();
});

// Auth Routes Stubs
authRouter.post('/login', (c) => {
  setCookie(c, 'refreshToken', 'dummy-pulso-refresh-token', {
    httpOnly: true,
    secure: true,
    sameSite: 'Strict',
    path: '/auth',
    maxAge: 604800,
  });
  return c.json({
    status: 'success',
    message: 'Login bem-sucedido no Aura Pulso',
    accessToken: 'dummy-pulso-access-token',
  });
});

authRouter.post('/refresh', (c) => {
  setCookie(c, 'refreshToken', 'dummy-pulso-new-refresh-token', {
    httpOnly: true,
    secure: true,
    sameSite: 'Strict',
    path: '/auth',
    maxAge: 604800,
  });
  return c.json({
    status: 'success',
    message: 'Token atualizado no Aura Pulso',
    accessToken: 'dummy-pulso-new-access-token',
  });
});

authRouter.post('/logout', (c) => {
  deleteCookie(c, 'refreshToken', { path: '/auth' });
  return c.json({ message: 'Logoff efetuado no Aura Pulso' });
});

// Operational API Routes Stubs
apiRouter.get('/prescriptions', (c) => {
  return c.json({
    status: 'success',
    message: 'Aura Pulso operational check',
    data: { totalPrescriptions: 0 }
  });
});

app.route('/auth', authRouter);
app.route('/api', apiRouter);

export default app;
