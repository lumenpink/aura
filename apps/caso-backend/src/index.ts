import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { patients as patientsTable, clinicalEvolutions as clinicalEvolutionsTable } from './db/schema';
import type { Bindings } from './types';

const app = new Hono<{ Bindings: Bindings }>();

// Dynamic CORS Middleware
app.use('*', async (c, next) => {
  const allowedRaw = c.env.ALLOWED_ORIGINS_CASO || c.env.ALLOWED_ORIGINS || '';
  const allowedOrigins = allowedRaw.split(',').map(o => o.trim());
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
    maxAge: 86400,
  })(c, next);
});

// Authentication Validation Middleware (Stateless verification utilizing Fluxo JWKS)
const tokenValidation = async (c: any, next: any) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Token não fornecido ou inválido', code: 'JQ489_UNAUTHORIZED_M2M' }, 401);
  }

  // In production, fetch Fluxo's JWKS and verify signature dynamically.
  // For stub/development purposes, we decode the token claims.
  const token = authHeader.split(' ')[1];
  try {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid JWT format');
    const payload = JSON.parse(atob(parts[1]));
    
    // Inject claims into context
    c.set('doctorCpf', payload.doctor_cpf || payload.cpf || '00000000000');
    c.set('tenantId', payload.tenant_id || 'local-tenant');
    await next();
  } catch (err) {
    return c.json({ error: 'Assinatura inválida ou token corrompido', code: 'JQ489_UNAUTHORIZED_M2M' }, 403);
  }
};

const api = new Hono<{ Bindings: Bindings }>();
api.use('*', tokenValidation);

// Patients List API
api.get('/patients', async (c) => {
  const dbMain = c.env.D1_MAIN ? drizzle(c.env.D1_MAIN) : null;
  const tenantId = c.get('tenantId');

  if (dbMain) {
    const list = await dbMain.select().from(patientsTable).where(eq(patientsTable.tenantId, tenantId));
    return c.json({ status: 'success', data: list });
  }

  return c.json({ status: 'success', message: 'Patients stub (D1_MAIN not bound)', data: [] });
});

// Patients Insert API (Event-Driven publishing to R2 queue)
api.post('/patients', async (c) => {
  const dbMain = c.env.D1_MAIN ? drizzle(c.env.D1_MAIN) : null;
  const tenantId = c.get('tenantId');
  const body = await c.req.json() as {
    id: string;
    name: string;
    cpf: string;
    phone: string;
    address?: string; // Should be a valid JSON address string
  };

  const now = new Date();

  const patientRecord = {
    id: body.id,
    tenantId,
    name: body.name,
    cpf: body.cpf,
    phone: body.phone,
    address: body.address || '{}',
    createdAt: now,
    updatedAt: now,
  };

  // 1. Save locally to Caso D1
  if (dbMain) {
    await dbMain.insert(patientsTable).values(patientRecord).onConflictDoUpdate({
      target: patientsTable.id,
      set: {
        name: body.name,
        cpf: body.cpf,
        phone: body.phone,
        address: body.address || '{}',
        updatedAt: now,
      }
    });
  }

  // 2. Publish Event to shared R2 SYNC_BUCKET for Fluxo ingestion
  if (c.env.SYNC_BUCKET) {
    const eventPayload = {
      entityName: 'Patient',
      action: 'upsert',
      data: {
        id: patientRecord.id,
        tenantId: patientRecord.tenantId,
        name: patientRecord.name,
        cpf: patientRecord.cpf,
        phone: patientRecord.phone,
        updatedAt: patientRecord.updatedAt.toISOString(),
      },
      timestamp: now.toISOString(),
    };

    const filename = `queue/patient_${patientRecord.id}_${now.getTime()}.json`;
    await c.env.SYNC_BUCKET.put(filename, JSON.stringify(eventPayload));
  }

  return c.json({ status: 'success', data: patientRecord });
});

// Clinical Evolutions List
api.get('/evolutions', async (c) => {
  const dbMain = c.env.D1_MAIN ? drizzle(c.env.D1_MAIN) : null;
  const tenantId = c.get('tenantId');

  if (dbMain) {
    const list = await dbMain.select().from(clinicalEvolutionsTable).where(eq(clinicalEvolutionsTable.tenantId, tenantId));
    return c.json({ status: 'success', data: list });
  }

  return c.json({ status: 'success', data: [] });
});

app.route('/api', api);

export default app;
