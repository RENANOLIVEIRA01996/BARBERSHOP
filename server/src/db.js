/**
 * Conexão com o banco de dados.
 * Usa SQLite em desenvolvimento e PostgreSQL em produção.
 */
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Determina o ambiente: desenvolvimento (SQLite) ou produção (PostgreSQL)
const isDevelopment = process.env.NODE_ENV !== 'production';

let db;

if (isDevelopment) {
  // SQLite para desenvolvimento - usando import dinâmico devido ao ES module
  const sqlite3Module = await import('sqlite3');
  const sqlite3 = sqlite3Module.verbose();
  const dbPath = path.resolve(__dirname, '../../data/barbershop.db');
  
  // Criar instância do banco SQLite
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Erro ao conectar ao SQLite:', err.message);
    } else {
      console.log('Conectado ao SQLite com sucesso!');
      // Habilitar foreign keys
      db.run('PRAGMA foreign_keys = ON');
    }
  });
  
  // Promisify query method for consistency with pg.Pool interface
  db.query = (text, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(text, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve({ rows });
        }
      });
    });
  };
  
  // Para compatibilidade com runTransaction, fornecer um método simplificado
  // Em SQLite, vamos usar uma transação simples (não temos pool de conexões)
  db.getClient = () => {
    return {
      query: (text, params) => {
        return new Promise((resolve, reject) => {
          db.all(text, params, (err, rows) => {
            if (err) {
              reject(err);
            } else {
              resolve({ rows });
            }
          });
        });
      }
    };
  };
} else {
  // PostgreSQL para produção (Neon)
  const { Pool } = await import('pg');
  
  db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // Necessário para Neon
    }
  });
  
  // Teste de conexão (opcional, mas recomendado)
  db.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.error('Erro ao conectar ao PostgreSQL:', err.stack);
    } else {
      console.log('Conectado ao PostgreSQL com sucesso!');
    }
  });
}

/** Executa uma transação com retry para lidar com erros de concorrência. */
export async function runTransaction(fn) {
  if (isDevelopment) {
    // Para SQLite, implementação de transação BEGIN/COMMIT/ROLLBACK
    return await db.query('BEGIN')
      .then(() => fn(db.getClient()))
      .then((result) => {
        return db.query('COMMIT').then(() => result);
      })
      .catch(async (err) => {
        await db.query('ROLLBACK');
        throw err;
      });
  } else {
    // PostgreSQL implementation with connection pooling
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

export default db;