// API client com suporte a JWT para o painel administrativo.
const API_URL = import.meta.env.VITE_API_URL || '';
const TOKEN_KEY = 'hb_admin_token';
const USER_KEY = 'hb_admin_user';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setSession({ token, user }) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user || null));
}

export function getSessionUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY)) || null;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function resolveUrl(path) {
  if (!path) return API_URL;
  if (String(path).startsWith('http')) return path;
  return `${API_URL}${String(path).startsWith('/') ? '' : '/'}${path}`;
}

export function authHeaders(extra = {}) {
  const headers = { 'Content-Type': 'application/json', ...extra };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

// GET genérico — retorna .ok ? data : lança erro (inclui 401)
export async function apiGet(path, opts = {}) {
  const res = await fetch(resolveUrl(path), { headers: authHeaders() });
  let body = null;
  try { body = await res.json(); } catch { /* sem corpo */ }
  if (res.status === 401 || body?.message === 'Não autorizado.') {
    clearSession();
    throw new Error('Sessão expirada. Faça login novamente.');
  }
  if (!res.ok || !body?.ok) throw new Error(body?.message || `Erro ${res.status}`);
  return body.data ?? body;
}

// Envia JSON (POST / PUT / PATCH / DELETE).
export function apiSend(method, path, payload) {
  const opts = {
    method,
    headers: authHeaders(),
  };
  if (payload !== undefined) opts.body = JSON.stringify(payload);
  return fetch(resolveUrl(path), opts).then(async (res) => {
    let body = null;
    try { body = await res.json(); } catch { /* sem corpo */ }
    if (res.status === 401 || body?.message === 'Não autorizado.') {
      clearSession();
      throw new Error('Sessão expirada. Faça login novamente.');
    }
    if (!res.ok || !body?.ok) throw new Error(body?.message || `Erro ${res.status}`);
    return body.data ?? body;
  });
}

export function apiPost(path, payload) { return apiSend('POST', path, payload); }
export function apiPut(path, payload) { return apiSend('PUT', path, payload); }
export function apiPatch(path, payload) { return apiSend('PATCH', path, payload); }
export function apiDelete(path) { return apiSend('DELETE', path); }

export function mediaUrl(p) {
  if (!p) return null;
  return String(p).startsWith('http') ? p : `${API_URL}${p}`;
}

export function formatMoney(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatDateTimeBR(v) {
  if (!v) return '—';
  try { return new Date(v).toLocaleString('pt-BR'); } catch { return v; }
}

export { API_URL };