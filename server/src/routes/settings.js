/**
 * Configurações do agendamento e do sistema.
 */
import express from 'express';
import { db } from '../db.js';
import { ok, fail, getSetting, setSetting } from '../utils.js';
import { requireAuth } from '../middleware/auth.js';
import { DEFAULT_SETTINGS } from '../seed.js';

const router = express.Router();
router.use(requireAuth);

// GET /api/settings — todas as configurações
router.get('/', async (req, res) => {
  const { rows } = await db.query('SELECT key, value FROM settings');
  const settings = {};
  for (const r of rows) settings[r.key] = r.value;
  return ok(res, { settings });
});

// PUT /api/settings — salvar chaves informadas
router.put('/', async (req, res) => {
  const body = req.body?.settings || req.body || {};
  for (const [k, v] of Object.entries(body)) {
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      await setSetting(k, v);
    }
  }
  const { rows } = await db.query('SELECT key, value FROM settings');
  const settings = {};
  for (const r of rows) settings[r.key] = r.value;
  return ok(res, { settings });
});

// POST /api/settings/reset — restaurar padrões
router.post('/reset', async (req, res) => {
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) await setSetting(k, v);
  const { rows } = await db.query('SELECT key, value FROM settings');
  const settings = {};
  for (const r of rows) settings[r.key] = r.value;
  return ok(res, { settings });
});

export default router;