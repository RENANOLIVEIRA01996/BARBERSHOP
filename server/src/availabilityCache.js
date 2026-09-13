/**
 * Cache compartilhado para a lista de dias disponíveis.
 * Importado por todas as rotas que precisam invalidar o cache
 * (pública + admin: horários, bloqueios, feriados, agendamentos).
 */

const daysCache = new Map();
const DAYS_CACHE_TTL_MS = 60_000; // 60 segundos

/** Retorna a lista cacheada ou null (miss/expirado). */
export function getCachedDays(key) {
  const hit = daysCache.get(key);
  if (hit && Date.now() - hit.t < DAYS_CACHE_TTL_MS) return hit.days;
  return null;
}

/** Armazena a lista no cache. */
export function setCachedDays(key, days) {
  daysCache.set(key, { t: Date.now(), days });
}

/** Limpa todo o cache de disponibilidade. Chamar ao alterar:
 *  - business_hours
 *  - barber_hours
 *  - blocked_times
 *  - holidays
 *  - appointments (criar / cancelar / excluir)
 *  - settings que afetam grade (slot_interval, min_advance_hours)
 */
export function invalidateAvailabilityCache() {
  daysCache.clear();
}
