require('dotenv').config();
const { Pool } = require('pg');

// Configuración dinámica:
// Si existe DATABASE_URL (en Render), usa eso.
// Si no (en tu PC), usa las variables sueltas.
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false, // Necesario para que Supabase acepte la conexión desde Render
      },
    }
  : {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
    };

const pool = new Pool(poolConfig);

pool.on('connect', () => {
  console.log('Conectado a la Base de Datos PostgreSQL');
});

pool.on('error', (err) => {
  console.error('Error inesperado en la BBDD:', err);
  process.exit(-1);
});

module.exports = pool;