import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

const envFile = `.env.${process.env['NODE_ENV'] ?? 'dev'}`;
dotenv.config({ path: envFile });
dotenv.config(); // fallback to .env

export default defineConfig({
  schema: [
    './dist/src/common/database/enums.js',
    './dist/src/modules/**/infrastructure/adapters/secondary/persistence/*.schema.js',
  ],
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env['DATABASE_URL'] ?? 'postgresql://postgres:postgres@localhost:5432/gerenciax',
  },
  verbose: true,
  strict: true,
});
