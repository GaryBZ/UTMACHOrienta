import { Pool, types } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

types.setTypeParser(1700, (val) => parseFloat(val));

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
  //Por el momento false, ya luego para la nube se cambia
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

export default pool