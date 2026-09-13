/**
 * Rotas de autenticação do painel administrativo.
 */
import express from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { ok, fail } from '../utils.js';
import { signToken, requireAuth } from '../middleware/auth.js';

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return fail(res, 'Informe e-mail e senha.');

  const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [String(email).trim().toLowerCase()]);
  const user = rows[0];
  if (!user || !bcrypt.compareSync(String(password), user.password_hash)) {
    return fail(res, 'E-mail ou senha incorretos.', 401);
  }
  if (!user.active) return fail(res, 'Usuário desativado.', 403);

  return ok(res, {
    token: signToken(user),
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  return ok(res, { user: req.user });
});

// PUT /api/auth/password — trocar senha
router.put('/password', requireAuth, async (req, res) => {
  const { current, password } = req.body || {};
  const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
  const user = rows[0];
  if (!user || !bcrypt.compareSync(String(current || ''), user.password_hash)) {
    return fail(res, 'Senha atual incorreta.');
  }
  if (!password || String(password).length < 6) {
    return fail(res, 'A nova senha deve ter ao menos 6 caracteres.');
  }
  const hash = bcrypt.hashSync(String(password), 10);
  await db.query(
    'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
    [hash, user.id]
  );
  return ok(res, { message: 'Senha alterada.' });
});

export default router;