/**
 * HENRIQUE BARBER — servidor principal.
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { initDatabaseSchema } from './schema.js';
import { seed } from './seed.js';

import authRoutes from './routes/auth.js';
import barbershopRoutes from './routes/barbershop.js';
import servicesRoutes from './routes/services.js';
import barbersRoutes from './routes/barbers.js';
import appointmentsRoutes from './routes/appointments.js';
import customersRoutes from './routes/customers.js';
import hoursRoutes from './routes/hours.js';
import scheduleRoutes from './routes/schedule.js';
import portfolioRoutes from './routes/portfolio.js';
import reviewsRoutes from './routes/reviews.js';
import paymentsRoutes from './routes/payments.js';
import reportsRoutes from './routes/reports.js';
import dashboardRoutes from './routes/dashboard.js';
import settingsRoutes from './routes/settings.js';
import publicRoutes from './routes/public.js';
import uploadRoutes from './routes/upload.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------- banco ----------
initDatabaseSchema().then(() => {
  return seed();
}).then((seeded) => {
  if (seeded?.seeded) console.log('✔ Seed inicial executado.');
}).catch((err) => {
  console.error('❌ Falha ao inicializar banco de dados:', err);
  process.exit(1);
});

const app = express();

app.set('trust proxy', 1);

// CORS — somente o frontend do HENRIQUE BARBER em desenvolvimento,
// e controlado por variável de ambiente em produção.
const corsOrigin = (process.env.CORS_ORIGIN || 'http://localhost:5174,http://localhost:5175')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
app.use(cors({
  origin(origin, cb) {
    if (!origin || corsOrigin.includes('*') || corsOrigin.includes(origin)) return cb(null, true);
    return cb(null, false);
  },
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));

// ---------- estáticos ----------
app.use('/brand', express.static(path.join(__dirname, '..', 'public', 'brand'), { maxAge: '7d' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), { maxAge: '7d' }));

// ---------- health ----------
app.get('/api/health', (req, res) => res.json({ ok: true, name: 'HENRIQUE BARBER API', time: new Date().toISOString() }));

// ---------- rotas ----------
// IMPORTANTE: a API pública vem primeiro — os roteadores de painel
// (mounted em /api com requireAuth global) não podem interceptá-la.
app.use('/api/public', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/barbershop', barbershopRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/barbers', barbersRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/hours', hoursRoutes);
app.use('/api', scheduleRoutes); // /blocked, /blocked/:id, /holidays, /holidays/:id
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api', paymentsRoutes); // /payments, /financial/summary
app.use('/api/reports', reportsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/upload', uploadRoutes);

// ---------- 404 API ----------
app.use('/api', (req, res) => res.status(404).json({ ok: false, message: 'Rota não encontrada.' }));

// ---------- erro ----------
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[ERRO]', err);
  if (res.headersSent) return;
  const status = /conflict/i.test(String(err.message)) ? 409 : err.status || 500;
  res.status(status).json({ ok: false, message: err.message || 'Erro interno.' });
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✂️  HENRIQUE BARBER API rodando em http://localhost:${PORT}`);
  console.log(`   Página pública: ${process.env.PUBLIC_BASE_URL || 'http://localhost:5174'}/agendar`);
});