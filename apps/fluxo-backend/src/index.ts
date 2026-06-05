import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { domainSchema, allowedOriginsSchema } from '@aura/shared';
import auth from './routes/auth';
import type { Bindings } from './types';
import { syncR2ToAnalytics } from './utils/sync';

// Initialize the main Hono application instance
const app = new Hono<{ Bindings: Bindings }>();

// Global CORS Middleware configured dynamically via ALLOWED_ORIGINS environment binding
app.use('*', async (c, next) => {
  const allowedRaw = c.env.ALLOWED_ORIGINS || '';
  const parsedOrigins = allowedOriginsSchema.safeParse(allowedRaw);
  const allowed = parsedOrigins.success ? parsedOrigins.data : '';
  const allowedOrigins = allowed ? allowed.split(',').map(o => o.trim()) : [];

  const origin = c.req.header('Origin');
  
  // Strict CORS: If origin is present (browser cross-origin request) but not in allowedOrigins, reject with JQ488
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

// 1. Setup the Dedicated Authentication Sub-router
const authRouter = new Hono<{ Bindings: Bindings }>();

// Global middleware for the Authentication sub-router to enforce strict path routing and prevent leakage
authRouter.use('*', async (c, next) => {
  const path = c.req.path;
  if (!path.startsWith('/auth')) {
    return c.json({ error: 'Acesso negado - Caminho inválido', code: 'JQ487_PATH' }, 403);
  }
  await next();
});

// Nest the actual authentication routes under the auth sub-router
authRouter.route('/', auth);

// 2. Setup the Dedicated Clinical API Sub-router
const apiRouter = new Hono<{ Bindings: Bindings }>();

// Global middleware for the Clinical API sub-router to enforce routing integrity
apiRouter.use('*', async (c, next) => {
  const path = c.req.path;
  if (!path.startsWith('/api')) {
    return c.json({ error: 'Acesso negado - Caminho operacional inválido', code: 'JQ488_PATH' }, 403);
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

export default {
  fetch: app.fetch,
  request: app.request.bind(app),
  async scheduled(event: any, env: Bindings, ctx: any) {
    const lockKey = 'lock:sync_analytics';
    
    // 1. Concurrency lock check using KV
    if (env.REVOCATION_KV) {
      const isLocked = await env.REVOCATION_KV.get(lockKey);
      if (isLocked) {
        console.log('[Sync-Cron] Sync task is already running. Aborting current execution.');
        return;
      }
      // Set lock with 5 minutes (300 seconds) safety TTL
      await env.REVOCATION_KV.put(lockKey, 'true', { expirationTtl: 300 });
    }

    try {
      // 2. Execute synchronization
      await syncR2ToAnalytics(env);
    } catch (err) {
      console.error('[Sync-Cron] Fatal error during sync:', err);
    } finally {
      // 3. Release Lock
      if (env.REVOCATION_KV) {
        await env.REVOCATION_KV.delete(lockKey);
      }
    }
  }
};