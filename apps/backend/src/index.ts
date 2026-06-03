import { Hono } from 'hono';
import auth from './routes/auth';

type Bindings = {
  VITE_AUTH_URL?: string;
  VITE_API_URL?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Middleware global para isolamento de subdomínios (Auth vs API)
app.use('*', async (c, next) => {
  const reqHost = c.req.header('host');
  const path = c.req.path;
  
  const expectedAuthUrl = c.env.VITE_AUTH_URL;
  const expectedApiUrl = c.env.VITE_API_URL;
  
  if (expectedAuthUrl && expectedApiUrl) {
    try {
      const authHost = new URL(expectedAuthUrl).host;
      const apiHost = new URL(expectedApiUrl).host;
      
      if (reqHost === authHost) {
        // No domínio de autenticação, apenas a rota de refresh (/api/auth/refresh) é permitida.
        if (path !== '/api/auth/refresh') {
          return c.json({ error: 'Acesso negado', code: 'JQ488' }, 403);
        }
      } else if (reqHost === apiHost) {
        // No domínio de API geral, a rota de refresh é bloqueada.
        if (path === '/api/auth/refresh') {
          return c.json({ error: 'Acesso negado', code: 'JQ487' }, 403);
        }
      }
    } catch (err) {
      console.warn('[Root Middleware] Erro ao validar host de subdomínio:', err);
    }
  }
  
  await next();
});

app.route('/api/auth', auth);

export default app;