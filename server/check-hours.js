import 'dotenv/config';
import { db } from './src/db.js';

(async () => {
  try {
    const [barberHours, businessHours] = await Promise.all([
      db.query('SELECT * FROM barber_hours WHERE barber_id = 1 ORDER BY day_of_week'),
      db.query('SELECT * FROM business_hours ORDER BY day_of_week')
    ]);
    console.log('BARBER_HOURS for Henrique (id=1):');
    const days = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
    barberHours.rows.forEach(h => {
      console.log(`  ${days[h.day_of_week]}: ${h.open_time}–${h.close_time} (active: ${h.active})`);
    });
    console.log('');
    console.log('BUSINESS_HOURS:');
    businessHours.rows.forEach(h => {
      console.log(`  ${days[h.day_of_week]}: ${h.open_time}–${h.close_time}`);
    });
    process.exit(0);
  } catch (err) {
    console.error('Erro:', err.message);
    process.exit(1);
  }
})();