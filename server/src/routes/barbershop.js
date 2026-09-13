/**
 * Perfil da barbearia (público + administração).
 */
import express from 'express';
import { db } from '../db.js';
import { ok, fail, slugify } from '../utils.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

const PUBLIC_FIELDS = [
  'id', 'name', 'slug', 'logo_principal', 'logo_horizontal', 'icone', 'banner',
  'perfil_social', 'wallpaper', 'simbolo', 'favicon', 'textura', 'tagline',
  'description', 'phone', 'whatsapp', 'instagram', 'address', 'cep', 'city',
  'state', 'map_url',
];

// GET /api/barbershop — perfil completo (admin)
router.get('/', requireAuth, async (req, res) => {
  const { rows } = await db.query('SELECT * FROM barbershops WHERE id = 1');
  const shop = rows[0];
  return ok(res, { shop });
});

// GET /api/barbershop/public — perfil público com dados de agendamento
router.get('/public', async (req, res) => {
  const { rows } = await db.query(`SELECT ${PUBLIC_FIELDS.join(', ')} FROM barbershops WHERE id = 1`);
  const shop = rows[0];
  if (!shop) return fail(res, 'Barbearia não configurada.', 404);
  return ok(res, { shop });
});

// PUT /api/barbershop — atualizar perfil (admin)
router.put('/', requireAuth, async (req, res) => {
  const allowed = PUBLIC_FIELDS.filter(f => f !== 'id');
  const fields = [];
  const vals = [];
  let paramIndex = 1;
  for (const f of allowed) {
    if (req.body[f] !== undefined) { fields.push(`${f} = $${paramIndex++}`); vals.push(req.body[f]); }
  }
  if (!fields.length) return fail(res, 'Nenhum campo para atualizar.');
  fields.push(`updated_at = NOW()`);
  vals.push(1);
  await db.query(`UPDATE barbershops SET ${fields.join(', ')} WHERE id = $${paramIndex}`, vals);

  const { rows } = await db.query(`SELECT ${PUBLIC_FIELDS.join(', ')} FROM barbershops WHERE id = 1`);
  const shop = rows[0];
  return ok(res, { shop });
});

// PUT /api/barbershop/slug — gerar link amigável
router.put('/slug', requireAuth, async (req, res) => {
  const name = req.body?.name || (await db.query('SELECT name FROM barbershops WHERE id = 1')).rows[0]?.name;
  const slug = slugify(name);
  await db.query('UPDATE barbershops SET slug = $1, updated_at = NOW() WHERE id = 1', [slug]);
  return ok(res, { slug });
});

export default router;