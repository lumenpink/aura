import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { domainSchema, allowedOriginsSchema } from '@aura/shared';
import auth from './routes/auth';
import type { Bindings } from './types';

// Initialize the main Hono application instance
const app = new Hono<{ Bindings: Bindings }>();

// Global CORS Middleware configured dynamically via ALLOWED_ORIGINS environment binding
app.use('*', async (c, next) => {
  const allowedRaw = c.env.ALLOWED_ORIGINS || '';
  const parsedOrigins = allowedOriginsSchema.safeParse(allowedRaw);
  const allowed = parsedOrigins.success ? parsedOrigins.data : '';
  const allowedOrigins = allowed ? allowed.split(',').map(o => o.trim()) : [];

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
    maxAge: 86400, // Cache preflight requests for 24 hours
  })(c, next);
});

// 1. Setup the Dedicated Authentication Sub-router
const authRouter = new Hono<{ Bindings: Bindings }>();

// Global middleware for the Authentication sub-router to enforce API_DOMAIN and path isolation
authRouter.use('*', async (c, next) => {
  const reqHost = c.req.header('host');
  const expectedApiDomainRaw = c.env.API_DOMAIN;
  const parsedDomain = domainSchema.safeParse(expectedApiDomainRaw);
  const expectedApiDomain = parsedDomain.success ? parsedDomain.data : undefined;

  if (expectedApiDomain && reqHost !== expectedApiDomain) {
    return c.json({ error: 'Acesso negado', code: 'JQ487' }, 403);
  }

  const path = c.req.path;
  if (!path.startsWith('/auth')) {
    return c.json({ error: 'Acesso negado', code: 'JQ487_PATH' }, 403);
  }

  await next();
});

// Nest the actual authentication routes under the auth sub-router
authRouter.route('/', auth);

// 2. Setup the Dedicated Clinical API Sub-router
const apiRouter = new Hono<{ Bindings: Bindings }>();

// Global middleware for the Clinical API sub-router to enforce API_DOMAIN isolation
apiRouter.use('*', async (c, next) => {
  const reqHost = c.req.header('host');
  const expectedApiDomainRaw = c.env.API_DOMAIN;
  const parsedDomain = domainSchema.safeParse(expectedApiDomainRaw);
  const expectedApiDomain = parsedDomain.success ? parsedDomain.data : undefined;

  if (expectedApiDomain && reqHost !== expectedApiDomain) {
    return c.json({ error: 'Acesso negado', code: 'JQ488' }, 403);
  }

  await next();
});

// Register stubs for clinical operational endpoints
apiRouter.get('/patients', (c) => {
  return c.json({
    status: 'success',
    message: 'Patients operational endpoint stub',
    data: []
  });
});

apiRouter.get('/agenda', (c) => {
  return c.json({
    status: 'success',
    message: 'Agenda operational endpoint stub',
    data: []
  });
});

// Mount the configured sub-routers under their respective prefixes
app.route('/auth', authRouter);
app.route('/api', apiRouter);

export default app;