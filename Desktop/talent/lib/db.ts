/**
 * Database Client
 *
 * This module provides a singleton Prisma client instance for database operations.
 * Uses the MariaDB adapter for MySQL connections (required in Prisma 7).
 *
 * Why a singleton?
 * - In development with hot reloading, each reload would create a new Prisma client
 * - This exhausts database connections quickly
 * - The singleton pattern ensures we reuse the same client across hot reloads
 *
 * Usage:
 * ```typescript
 * import { db } from '@/lib/db';
 *
 * const users = await db.user.findMany();
 * ```
 */

import { PrismaClient } from './generated/prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { parseDbUrl } from './db-utils';

// Re-export parseDbUrl for convenience
export { parseDbUrl } from './db-utils';

// Declare a global variable to store the Prisma client in development
// This prevents creating multiple instances during hot reloading
declare global {
   
  var prisma: PrismaClient | undefined;
}

/**
 * Get database URL from environment variables
 * Supports both full DATABASE_URL and individual components
 */
function getDatabaseUrl(): string {
  // Option 1: Full DATABASE_URL (preferred)
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL.trim();
  }

  // Option 2: Build from individual components (for AWS RDS)
  const host = process.env.DB_HOST || process.env.RDS_HOSTNAME;
  const user = process.env.DB_USER || process.env.RDS_USERNAME;
  const password = process.env.DB_PASSWORD || process.env.RDS_PASSWORD;
  const database = process.env.DB_NAME || process.env.RDS_DB_NAME;
  const port = process.env.DB_PORT || process.env.RDS_PORT || '3306';

  if (host && user && password && database) {
    // URL encode username and password in case they contain special characters
    const encodedUser = encodeURIComponent(user);
    const encodedPassword = encodeURIComponent(password);
    return `mysql://${encodedUser}:${encodedPassword}@${host}:${port}/${database}`;
  }

  throw new Error(
    'DATABASE_URL or database connection components (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME) must be set.\n' +
    'For AWS RDS, use: DATABASE_URL="mysql://user:pass@rds-endpoint:3306/dbname"\n' +
    'Or set: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT'
  );
}

/**
 * Create the MariaDB adapter for Prisma
 */
function createAdapter() {
  const dbUrl = getDatabaseUrl();
  const config = parseDbUrl(dbUrl);

  return new PrismaMariaDb({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    connectionLimit: 5, // Reasonable limit for shared hosting
    acquireTimeout: 30000, // Wait up to 30s to acquire a connection from pool
    connectTimeout: 30000, // Wait up to 30s for initial connection
    idleTimeout: 60000, // Close idle connections after 60s
  });
}

/**
 * Create or reuse the Prisma client
 *
 * In production: Always create a new client
 * In development: Reuse the global client to prevent connection exhaustion
 */
function createPrismaClient() {
  const adapter = createAdapter();

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

export const db = globalThis.prisma || createPrismaClient();

// In development, store the client globally for reuse
if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = db;
}

/**
 * Disconnect from the database
 *
 * Call this during graceful shutdown or testing cleanup
 */
export async function disconnectDb(): Promise<void> {
  await db.$disconnect();
}

/**
 * Check database connectivity
 *
 * Useful for health checks and startup verification
 *
 * @returns true if connected, false otherwise
 */
export async function checkDbConnection(): Promise<boolean> {
  try {
    // Execute a simple query to check connectivity
    await db.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  }
}
