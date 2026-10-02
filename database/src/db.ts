import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as schema from './schema';

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/mulyankan';

export const pool = new Pool({
  connectionString,
});

export const db = drizzle(pool, { schema });
