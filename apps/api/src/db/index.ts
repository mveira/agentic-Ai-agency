import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

// For query purposes
const queryClient = postgres(connectionString);
export const db = drizzle(queryClient, { schema });

// For migrations (uses a separate connection)
export function createMigrationClient() {
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  return postgres(connectionString, { max: 1 });
}

export { schema };
