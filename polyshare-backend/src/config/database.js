require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
const { Pool } = require('pg');


// Configuration du pool de connexions PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false,
  // Configuration optionnelle pour optimiser les connexions
  max: 20, // Nombre maximum de clients dans le pool
  idleTimeoutMillis: 30000, // Timeout avant de fermer une connexion inactive
  connectionTimeoutMillis: 2000, // Timeout pour établir une connexion
});

// Event listeners pour le debugging
pool.on('connect', () => {
  console.log('✅ Database connection established');
});

pool.on('error', (err, client) => {
  console.error('❌ Unexpected database error:', err);
});

// Fonction helper pour exécuter des requêtes
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    
    // Log en développement
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Executed query:', { 
        text: text.substring(0, 100), // Affiche les 100 premiers caractères
        duration: `${duration}ms`, 
        rows: res.rowCount 
      });
    }
    
    return res;
  } catch (error) {
    console.error('❌ Database query error:', error);
    throw error;
  }
};

// Fonction pour tester la connexion
const testConnection = async () => {
  try {
    const result = await query('SELECT NOW() as now');
    console.log('🔌 Database connected at:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to database:', error.message);
    return false;
  }
};

module.exports = {
  query,
  pool,
  testConnection
};
