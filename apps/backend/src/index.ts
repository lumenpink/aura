import { Hono } from 'hono';
import auth from './routes/auth';

const app = new Hono();

app.route('/api/auth', auth);

export default app;