import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { setCookie, deleteCookie } from 'hono/cookie';
import { allowedOriginsSchema } from '@aura/shared';
import { drizzle } from 'drizzle-orm/d1';
import { eq, desc } from 'drizzle-orm';
import { prescriptions as prescriptionsTable, prescriptionItems as prescriptionItemsTable, prescriptionValidityLogs as prescriptionValidityLogsTable } from './db/schema';
import { deepSortObject, calculateRowHash, calculatePayloadHash, MOCK_JWKS } from './utils/crypto';
import { getTemplateBytes, generatePrescriptionPdf } from './utils/pdf';

type Bindings = {
  D1_MAIN?: any;
  REVOCATION_KV?: any;
  ALLOWED_ORIGINS?: string;
  ALLOWED_ORIGINS_PULSO?: string;
  SYNC_BUCKET?: any;
};

const app = new Hono<{ Bindings: Bindings }>();

// Global CORS Middleware with strict origin check and preflight optimization
app.use('*', async (c, next) => {
  const allowedRaw = c.env.ALLOWED_ORIGINS_PULSO || c.env.ALLOWED_ORIGINS || '';
  const parsedOrigins = allowedOriginsSchema.safeParse(allowedRaw);
  const allowed = parsedOrigins.success ? parsedOrigins.data : 'http://pulso.localhost:12401';
  const allowedOrigins = allowed.split(',').map(o => o.trim());

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

// Auth Routes
authRouter.get('/jwks', (c) => {
  c.header('Cache-Control', 'public, max-age=86400, s-maxage=86400');
  return c.json(MOCK_JWKS);
});

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

// Token validation middleware
const tokenValidation = async (c: any, next: any) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Token não fornecido ou inválido', code: 'JQ489_UNAUTHORIZED_M2M' }, 401);
  }

  const token = authHeader.split(' ')[1];
  try {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid JWT format');
    const payload = JSON.parse(atob(parts[1]));
    
    // Inject claims into context
    c.set('doctorCpf', payload.sub || payload.doctor_cpf || payload.cpf || '00000000000');
    c.set('doctorName', payload.doctor_name || 'Dr. Fernando Henrique');
    c.set('doctorCrm', payload.doctor_crm || '123456');
    c.set('doctorCrmUf', payload.doctor_crm_uf || 'SP');
    c.set('tenantId', payload.tenant_id || 'clinica-luz');
    await next();
  } catch (err) {
    return c.json({ error: 'Assinatura inválida ou token corrompido', code: 'JQ489_UNAUTHORIZED_M2M' }, 403);
  }
};

// API Routing Constraints & Selective Auth
apiRouter.use('*', async (c, next) => {
  const path = c.req.path;
  if (!path.startsWith('/api')) {
    return c.json({ error: 'Acesso negado - Caminho operacional inválido', code: 'JQ488_PATH' }, 403);
  }

  // Exclude PDF route from authentication to allow public download
  const isPdfRoute = c.req.method === 'GET' && /\/api\/prescriptions\/[^/]+\/pdf$/.test(path);
  if (isPdfRoute) {
    return await next();
  }

  return await tokenValidation(c, next);
});

// 1. POST /api/prescriptions - Create Draft with OCC
apiRouter.post('/prescriptions', async (c) => {
  const dbMain = c.env.D1_MAIN ? drizzle(c.env.D1_MAIN) : null;
  if (!dbMain) {
    return c.json({ error: 'Database binding (D1_MAIN) missing' }, 500);
  }

  const tenantId = c.get('tenantId');
  const doctorCpf = c.get('doctorCpf');
  const doctorName = c.get('doctorName');
  const doctorCrm = c.get('doctorCrm');
  const doctorCrmUf = c.get('doctorCrmUf');

  const body = await c.req.json();
  const id = body.id || `recipe-${Math.floor(100000 + Math.random() * 900000)}`;
  const patientCpf = body.patientCpf;
  const patientName = body.patientName;
  const patientBirthdate = body.patientBirthdate || '1990-01-01';
  const type = body.type || 'comum';
  const items = body.items || [];

  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days default expiration

  // 1. Fetch last record to chain previous_hash or use from client body
  let previousHash = body.previousHash;
  if (previousHash === undefined) {
    previousHash = '0';
    const lastRecord = await dbMain
      .select()
      .from(prescriptionsTable)
      .where(eq(prescriptionsTable.tenantId, tenantId))
      .orderBy(desc(prescriptionsTable.createdAt))
      .limit(1);

    if (lastRecord && lastRecord.length > 0) {
      previousHash = lastRecord[0].currentHash;
    }
  }

  // 2. Generate canonical payload to hash
  const payload = {
    version: "1.0.0",
    prescriptionId: id,
    issuedAt: createdAt.toISOString(),
    tenantId,
    patientCpf,
    prescriptionType: type,
    items: items.map((item: any) => ({
      medicationName: item.medicationName,
      concentration: item.concentration || '',
      dosageForm: item.dosageForm || '',
      quantity: item.quantity || '',
      instructions: item.instructions || ''
    }))
  };

  const payloadHash = await calculatePayloadHash(payload);
  const currentHash = await calculateRowHash(payload, previousHash, createdAt.getTime());

  // 3. Conditional insertion with Optimistic Concurrency Control (OCC)
  try {
    const result = await c.env.D1_MAIN.prepare(`
      INSERT INTO prescriptions (
        id, tenant_id, patient_cpf, patient_name, patient_birthdate,
        doctor_cpf, doctor_name, doctor_crm, doctor_crm_uf,
        type, status, created_at, expires_at,
        payload_hash, previous_hash, current_hash
      )
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      WHERE (
        SELECT current_hash FROM prescriptions 
        WHERE tenant_id = ? 
        ORDER BY created_at DESC LIMIT 1
      ) = ?
      OR (
        SELECT COUNT(*) FROM prescriptions WHERE tenant_id = ?
      ) = 0
    `).bind(
      id,
      tenantId,
      patientCpf,
      patientName,
      patientBirthdate,
      doctorCpf,
      doctorName,
      doctorCrm,
      doctorCrmUf,
      type,
      'rascunho',
      createdAt.getTime(),
      expiresAt.getTime(),
      payloadHash,
      previousHash,
      currentHash,
      // WHERE check bindings
      tenantId,
      previousHash,
      tenantId
    ).run();

    const changes = result.meta?.changes ?? result.changes ?? 0;
    if (changes === 0) {
      return c.json({
        error: 'Conflito de concorrência detectado na cadeia de Ledger.',
        code: 'JQ490_CONCURRENCY_CONFLICT'
      }, 409);
    }

    // 4. Save items
    for (const item of items) {
      const itemId = `item-${Math.random().toString(36).substr(2, 9)}`;
      await dbMain.insert(prescriptionItemsTable).values({
        id: itemId,
        prescriptionId: id,
        medicationName: item.medicationName,
        dosageForm: item.dosageForm || '',
        concentration: item.concentration || '',
        quantity: item.quantity || '',
        instructions: item.instructions || '',
        createdAt
      });
    }

    return c.json({
      status: 'success',
      data: {
        id,
        tenantId,
        patientCpf,
        patientName,
        type,
        status: 'rascunho',
        payloadHash,
        previousHash,
        currentHash,
        createdAt
      }
    });

  } catch (err: any) {
    return c.json({ error: `Erro na persistência: ${err.message}`, code: 'JQ491_DB_ERROR' }, 500);
  }
});

// 2. GET /api/prescriptions - List
apiRouter.get('/prescriptions', async (c) => {
  const dbMain = c.env.D1_MAIN ? drizzle(c.env.D1_MAIN) : null;
  if (!dbMain) {
    return c.json({ error: 'Database binding missing' }, 500);
  }

  const tenantId = c.get('tenantId');
  const list = await dbMain
    .select()
    .from(prescriptionsTable)
    .where(eq(prescriptionsTable.tenantId, tenantId))
    .orderBy(desc(prescriptionsTable.createdAt));

  return c.json({ status: 'success', data: list });
});

// 3. GET /api/prescriptions/:id - Retrieve
apiRouter.get('/prescriptions/:id', async (c) => {
  const dbMain = c.env.D1_MAIN ? drizzle(c.env.D1_MAIN) : null;
  if (!dbMain) {
    return c.json({ error: 'Database binding missing' }, 500);
  }

  const id = c.req.param('id');
  const prescription = await dbMain
    .select()
    .from(prescriptionsTable)
    .where(eq(prescriptionsTable.id, id))
    .limit(1);

  if (!prescription || prescription.length === 0) {
    return c.json({ error: 'Receita não encontrada', code: 'JQ492_NOT_FOUND' }, 404);
  }

  const items = await dbMain
    .select()
    .from(prescriptionItemsTable)
    .where(eq(prescriptionItemsTable.prescriptionId, id));

  return c.json({
    status: 'success',
    data: {
      ...prescription[0],
      items
    }
  });
});

// 4. POST /api/prescriptions/:id/sign - Attach signature
apiRouter.post('/prescriptions/:id/sign', async (c) => {
  const dbMain = c.env.D1_MAIN ? drizzle(c.env.D1_MAIN) : null;
  if (!dbMain) {
    return c.json({ error: 'Database binding missing' }, 500);
  }

  const id = c.req.param('id');
  const body = await c.req.json();
  const signature = body.signature;

  if (!signature) {
    return c.json({ error: 'Assinatura não fornecida', code: 'JQ493_MISSING_SIGNATURE' }, 400);
  }

  const now = new Date();
  await dbMain
    .update(prescriptionsTable)
    .set({
      status: 'ativa',
      digitalSignature: signature,
      signedAt: now
    })
    .where(eq(prescriptionsTable.id, id));

  return c.json({
    status: 'success',
    message: 'Receita assinada com sucesso',
    data: {
      id,
      status: 'ativa',
      signedAt: now
    }
  });
});

// 5. GET /api/prescriptions/:id/pdf - Public Endpoint to generate & download PDF
apiRouter.get('/prescriptions/:id/pdf', async (c) => {
  const dbMain = c.env.D1_MAIN ? drizzle(c.env.D1_MAIN) : null;
  if (!dbMain) {
    return c.text('Database binding missing', 500);
  }

  const id = c.req.param('id');
  
  // Fetch prescription details
  const prescription = await dbMain
    .select()
    .from(prescriptionsTable)
    .where(eq(prescriptionsTable.id, id))
    .limit(1);

  if (!prescription || prescription.length === 0) {
    return c.text('Receita não encontrada', 404);
  }

  const items = await dbMain
    .select()
    .from(prescriptionItemsTable)
    .where(eq(prescriptionItemsTable.prescriptionId, id));

  const data = {
    ...prescription[0],
    items
  };

  // Resolve template bytes from Cache API / R2
  const templateBytes = await getTemplateBytes(c.env);

  // Generate finalized PDF bytes
  const pdfBytes = await generatePrescriptionPdf(templateBytes, data);

  c.header('Content-Type', 'application/pdf');
  c.header('Content-Disposition', `inline; filename="prescricao-${id}.pdf"`);
  return c.body(pdfBytes);
});

// 6. POST /api/prescriptions/:id/dispense - M2M Dispensation Log
apiRouter.post('/api/prescriptions/:id/dispense', async (c) => {
  const dbMain = c.env.D1_MAIN ? drizzle(c.env.D1_MAIN) : null;
  if (!dbMain) {
    return c.json({ error: 'Database binding missing' }, 500);
  }

  const id = c.req.param('id');
  const body = await c.req.json();
  const performedBy = body.performedBy || 'Farmácia Parceira';
  const notes = body.notes || '';

  const now = new Date();

  // Create log
  await dbMain.insert(prescriptionValidityLogsTable).values({
    id: `log-${Math.random().toString(36).substr(2, 9)}`,
    prescriptionId: id,
    action: 'DISPENSED',
    performedBy,
    notes,
    createdAt: now
  });

  // Update prescription status
  await dbMain
    .update(prescriptionsTable)
    .set({ status: 'dispensada' })
    .where(eq(prescriptionsTable.id, id));

  return c.json({
    status: 'success',
    message: 'Dispensação registrada com sucesso'
  });
});

app.route('/auth', authRouter);
app.route('/api', apiRouter);

export default app;
