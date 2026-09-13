/**
 * Inicializa todo o schema do banco (parte 1 + parte 2).
 */
import { db } from './db.js';
import { initSchema } from './schema1.js';
import { initSchemaPart2 } from './schema2.js';

export { db };

export async function initDatabaseSchema() {
  await initSchema();
  await initSchemaPart2();
}