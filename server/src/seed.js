/**
 * Seed inicial da HENRIQUE BARBER — executado apenas quando o banco está vazio.
 * Todos os preços/dados vivem no banco (nada hardcoded no frontend).
 * Adaptado para PostgreSQL.
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { db, runTransaction } from './db.js';
import { initDatabaseSchema } from './schema.js';

const BRAND = {
  logo_principal:  '/brand/logo_principal.png',
  logo_horizontal: '/brand/logo_horizontal.png',
  icone:           '/brand/icone_app.png',
  banner:          '/brand/banner_capa.png',
  perfil_social:   '/brand/perfil_redes_sociais.png',
  wallpaper:       '/brand/wallpaper.png',
  simbolo:         '/brand/simbolo.png',
  favicon:         '/brand/favicon.png',
  textura:         '/brand/textura_fundo.png',
};

export const DEFAULT_SETTINGS = {
  'booking.min_advance_hours': '2',
  'booking.max_future_days': '60',
  'booking.slot_interval_minutes': '30',
  'booking.allow_cancel': 'true',
  'booking.cancel_deadline_hours': '24',
  'booking.allow_reschedule': 'true',
  'booking.allow_whatsapp': 'true',
  'scheduling.timezone': 'America/Sao_Paulo',
};

export async function seed() {
  await initDatabaseSchema();

  const countResult = await db.query('SELECT COUNT(*) AS n FROM users');
  const count = Number(countResult.rows[0].n);
  if (count > 0) return { seeded: false };

  await runTransaction(async (client) => {
    const henriqueId = await seedBarbers(client);
    await seedHours(client, henriqueId);
    const serviceIds = await seedServices(client);
    await seedBarbershop(client);
    const customerId = await seedDemoData(client, henriqueId, serviceIds);
    await seedSettings(client);
    await seedAdmin(client);
    await seedWelcome(client);
  });

  return { seeded: true };
}
async function seedBarbers(client) {
  const result = await client.query(`
    INSERT INTO barbers (name, slug, description, photo, specialties, status, position)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id
  `, [
    'Henrique',
    'henrique',
    'Fundador da HENRIQUE BARBER. Especialista em degradê, cortes clássicos e barba stylist. Cada corte é feito sob medida, com atenção total aos detalhes.',
    '/brand/perfil_redes_sociais.png',
    JSON.stringify(['Degradê', 'Corte Clássico', 'Barba', 'Acabamento']),
    'active',
    0
  ]);
  return Number(result.rows[0].id);
}

async function seedHours(client, henriqueId) {
  const insertHours = `
    INSERT INTO business_hours (day_of_week, open_time, close_time, active)
    VALUES ($1, $2, $3, $4)
  `;
  const insertBarberHours = `
    INSERT INTO barber_hours (barber_id, day_of_week, open_time, close_time, active)
    VALUES ($1, $2, $3, $4, $5)
  `;
  // 0 = Domingo (aberto), 1 = Segunda ...
  const week = [
    [1, '08:00', '18:00', 1],
    [2, '08:00', '18:00', 1],
    [3, '08:00', '18:00', 1],
    [4, '08:00', '18:00', 1],
    [5, '08:00', '19:00', 1],
    [6, '08:00', '17:00', 1],
    [0, '08:00', '18:00', 1],
  ];
  for (const [dow, open, close, active] of week) {
    await client.query(insertHours, [dow, open, close, active]);
    await client.query(insertBarberHours, [henriqueId, dow, open, close, active]);
  }
}

async function seedServices(client) {
  const insertService = `
    INSERT INTO services (name, description, price, duration_minutes, status, position, photo)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id
  `;
  const services = [
    ['Corte', 'Corte moderno com máquina e tesoura, finalização com pomada.', 35, 30, 'active', 0, null],
    ['Corte + Barba', 'Corte completo + barba alinhada com toalha quente e finalização.', 55, 60, 'active', 1, null],
    ['Barba', 'Barba modelada com navalha, toalha quente e balm pós-barba.', 25, 40, 'active', 2, null],
    ['Sobrancelha', 'Design de sobrancelha masculina com cera ou pinça.', 15, 15, 'active', 3, null],
    ['Corte Infantil', 'Corte para crianças até 10 anos, atendimento tranquilo e lúdico.', 25, 30, 'active', 4, null],
    ['Acabamento', 'Retoques rápidos: laterais, nuca e contornos.', 15, 15, 'active', 5, null],
    ['Outros', 'Serviços especiais sob consulta.', 30, 30, 'active', 6, null],
  ];
  const ids = [];
  for (const [name, desc, price, dur, status, pos, photo] of services) {
    const result = await client.query(insertService, [name, desc, price, dur, status, pos, photo]);
    ids.push(Number(result.rows[0].id));
  }
  return ids;
}

async function seedBarbershop(client) {
  const values = [
    1,
    'HENRIQUE BARBER',
    'henrique-barber',
    BRAND.logo_principal,
    BRAND.logo_horizontal,
    BRAND.icone,
    BRAND.banner,
    BRAND.perfil_social,
    BRAND.wallpaper,
    BRAND.simbolo,
    BRAND.favicon,
    BRAND.textura,
    'Barbearia premium',
    'Cortes precisos, barba impecável e aquele cuidado de verdade. Atendimento personalizado do primeiro ao último minuto.',
    '(11) 99999-9999',
    '5511999999999',
    '@henriquebarber',
    'Rua das Palmeiras, 123 - Centro',
    '01310-100',
    'São Paulo',
    'SP'
  ];
  await client.query(`
    INSERT INTO barbershops (
      id, name, slug, logo_principal, logo_horizontal, icone, banner, perfil_social,
      wallpaper, simbolo, favicon, textura, tagline, description, phone, whatsapp,
      instagram, address, cep, city, state
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
  `, values);
}
async function seedDemoData(client, henriqueId, serviceIds) {
  const customerResult = await client.query(`
    INSERT INTO customers (name, whatsapp, email)
    VALUES ($1, $2, $3)
    RETURNING id
  `, ['Cliente Exemplo', '5511988888888', 'cliente@email.com']);
  const customerId = Number(customerResult.rows[0].id);

  const code = 'DEMO-' + Date.now().toString(36).toUpperCase();
  const s = serviceIds[1];

  const apptResult = await client.query(`
    INSERT INTO appointments (code, customer_id, service_id, barber_id, date, start_time, end_time, value, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id
  `, [
    code,
    customerId,
    s,
    henriqueId,
    new Date().toISOString().split('T')[0], // YYYY-MM-DD
    '10:00',
    '11:00',
    55,
    'completed'
  ]);
  const apptId = Number(apptResult.rows[0].id);

  await client.query(`
    UPDATE customers 
    SET first_visit_at = NOW(), last_visit_at = NOW(), visits_count = 1, total_spent = $1
    WHERE id = $2
  `, [55, customerId]);

  await client.query(`
    INSERT INTO payments (appointment_id, method, value, status)
    VALUES ($1, $2, $3, $4)
  `, [apptId, 'pix', 55, 'paid']);

  await client.query(`
    INSERT INTO reviews (customer_name, rating, comment, status)
    VALUES ($1, $2, $3, $4)
  `, ['Cliente Exemplo', 5, 'Atendimento impecável e acabamento perfeito. Recomendo demais!', 'approved']);

  return customerId;
}

async function seedSettings(client) {
  const upsert = `
    INSERT INTO settings (key, value)
    VALUES ($1, $2)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  `;
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) {
    await client.query(upsert, [k, v]);
  }
}

async function seedAdmin(client) {
  const passwordHash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'henrique123', 10);
  await client.query(`
    INSERT INTO users (name, email, password_hash, role)
    VALUES ($1, $2, $3, $4)
  `, [
    process.env.ADMIN_NAME || 'Henrique',
    process.env.ADMIN_EMAIL || 'admin@henriquebarber.com.br',
    passwordHash,
    'admin'
  ]);
}

async function seedWelcome(client) {
  await client.query(`
    INSERT INTO notifications (title, message, type)
    VALUES ($1, $2, $3)
  `, [
    'Bem-vindo à HENRIQUE BARBER 🚀',
    'Sistema pronto. Configure serviços, horários e compartilhe seu link de agendamento.',
    'success'
  ]);
}