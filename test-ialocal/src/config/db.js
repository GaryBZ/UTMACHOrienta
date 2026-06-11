const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'nombre_de_tu_bd',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'root'
});

module.exports = pool;
