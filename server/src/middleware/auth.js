/**
 * Autenticação JWT para rotas administrativas.
 */
import jwt from 'jsonwebtoken';
import { db } from '../db.js';
import { fail } from '../utils.js';

const JWT_SECRET = process.env.JWT_SECRET || 'henrique_barber_super_secret_key_2026';

export function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role },
    JWT_SECRET,
    { expiresIn: process.env.TOKEN_EXPIRES || '12h' }
  );
}

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return fail(res, 'Não autenticado.', 401);

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const { rows } = await db.query(
      'SELECT id, name, email, role, active FROM users WHERE id = $1',
      [payload.id]
    );
    const user = rows[0];
    if (!user || !user.active) return fail(res, 'Usuário inválido.', 401);
    req.user = user;
    next();
  } catch {
    return fail(res, 'Sessão expirada ou inválida.', 401);
  }
}