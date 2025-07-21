import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Supabase impose SSL
});

pool.query('SELECT NOW()')
  .then(res => {
    console.log('✅ Connecté à Supabase PostgreSQL:', res.rows[0]);
  })
  .catch(err => {
    console.error('❌ Erreur de connexion DB:', err);
    process.exit(1);
  });

export default pool;
