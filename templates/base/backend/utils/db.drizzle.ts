import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../drizzle/schema';

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Create drizzle instance with schema
export const db = drizzle(pool, { schema });

// Export schema for type inference
export { schema };

// Test connection on startup
pool.connect()
  .then((client) => {
    console.log('Database connected successfully');
    client.release();
  })
  .catch((err) => {
    console.error('Database connection failed:', err);
    process.exit(1);
  });

// Gracefully close pool on process termination
process.on('SIGINT', async () => {
  await pool.end();
  console.log('Database connection pool closed.');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await pool.end();
  console.log('Database connection pool closed.');
  process.exit(0);
});
