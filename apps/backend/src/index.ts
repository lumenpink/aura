import { Hono } from 'hono';
import auth from './routes/auth';
import type { Bindings } from './types';

// Initialize the main Hono application instance
const app = new Hono<{ Bindings: Bindings }>();

// 1. Setup the Dedicated Authentication Sub-router
const authRouter = new Hono<{ Bindings: Bindings }>();

// Global middleware for the Authentication sub-router to enforce API_DOMAIN and path isolation
authRouter.use('*', async (c, next) => {
  const reqHost = c.req.header('host');
  const expectedApiDomain = c.env.API_DOMAIN;

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
  const expectedApiDomain = c.env.API_DOMAIN;

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