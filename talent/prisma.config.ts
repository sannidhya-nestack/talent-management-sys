/**
 * Prisma Configuration
 *
 * This file configures how Prisma connects to the database.
 * It supports environment-aware database selection:
 * - Development: Uses DATABASE_URL (dev database)
 * - Production: Uses DATABASE_URL (prod database, set in Vercel)
 *
 * The actual database URLs are stored in environment variables:
 * - DATABASE_URL: The primary connection string
 *
 * On Vercel, you'll set DATABASE_URL to point to the production database.
 * Locally, your .env file points to the development database.
 */
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

/**
 * Validate and normalize port number
 */
function validatePort(port: string | undefined, defaultPort: string = '3306'): string {
  if (!port) {
    return defaultPort;
  }
  
  const portNum = parseInt(port, 10);
  if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
    throw new Error(`Invalid port number: ${port}. Port must be between 1 and 65535.`);
  }
  
  return portNum.toString();
}

/**
 * Reconstruct URL with properly encoded credentials
 * This handles special characters in passwords (like @, ?, =, etc.)
 */
function reconstructUrl(protocol: string, username: string, password: string, hostname: string, port: string, pathname: string): string {
  const encodedUser = encodeURIComponent(username);
  const encodedPassword = encodeURIComponent(password);
  return `${protocol}//${encodedUser}:${encodedPassword}@${hostname}:${port}${pathname}`;
}

/**
 * Get the database URL based on environment
 *
 * Supports two formats:
 * 1. Full DATABASE_URL: mysql://user:pass@host:port/db
 * 2. Individual components: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT
 *
 * For AWS RDS, you can use either format.
 * Automatically handles URL encoding of special characters in passwords.
 */
function getDatabaseUrl(): string {
  // Option 1: Full DATABASE_URL (preferred)
  if (process.env.DATABASE_URL) {
    const url = process.env.DATABASE_URL.trim();
    
    // Try to parse the URL
    try {
      const parsed = new URL(url);
      
      if (parsed.protocol !== 'mysql:') {
        throw new Error(`Invalid protocol. Expected 'mysql:' but got '${parsed.protocol}'`);
      }
      
      // Validate and get port
      const port = parsed.port || '3306';
      validatePort(port);
      
      // Reconstruct URL with properly encoded credentials
      // This handles special characters in password that might break URL parsing
      const reconstructed = reconstructUrl(
        parsed.protocol,
        decodeURIComponent(parsed.username || ''),
        decodeURIComponent(parsed.password || ''),
        parsed.hostname,
        port,
        parsed.pathname
      );
      
      return reconstructed;
    } catch (error) {
      // If URL parsing fails, try manual parsing for passwords with @ symbol
      if (error instanceof TypeError || (error instanceof Error && error.message.includes('Invalid URL'))) {
        // Try to extract components manually
        const match = url.match(/^mysql:\/\/([^:]+):([^@]+)@([^:]+):?(\d+)?\/(.+)$/);
        
        if (match) {
          const [, user, password, host, port, database] = match;
          const finalPort = port || '3306';
          validatePort(finalPort);
          
          return reconstructUrl('mysql:', user, password, host, finalPort, `/${database}`);
        }
        
        throw new Error(
          `Invalid DATABASE_URL format. Expected: mysql://user:password@host:port/database\n` +
          `Got: ${url.substring(0, 50)}...\n` +
          `Note: If your password contains special characters (@, ?, =, etc.), they must be URL-encoded.\n` +
          `Use individual components (DB_HOST, DB_USER, etc.) instead, or URL-encode the password manually.`
        );
      }
      throw error;
    }
  }

  // Option 2: Build from individual components (for AWS RDS)
  const host = process.env.DB_HOST || process.env.RDS_HOSTNAME;
  const user = process.env.DB_USER || process.env.RDS_USERNAME;
  const password = process.env.DB_PASSWORD || process.env.RDS_PASSWORD;
  const database = process.env.DB_NAME || process.env.RDS_DB_NAME;
  const port = validatePort(process.env.DB_PORT || process.env.RDS_PORT, '3306');

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

export default defineConfig({
  // Path to the Prisma schema file
  schema: 'prisma/schema.prisma',

  // Path where migrations are stored
  migrations: {
    path: 'prisma/migrations',
    // Seed command to populate database with sample data
    seed: 'npx tsx prisma/seed.ts',
  },

  // Database connection configuration
  datasource: {
    url: getDatabaseUrl(),
  },
});
