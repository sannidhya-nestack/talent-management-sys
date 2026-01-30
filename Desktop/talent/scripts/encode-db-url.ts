/**
 * Database URL Encoder
 * 
 * This script helps you create a properly encoded DATABASE_URL
 * Run: npx tsx scripts/encode-db-url.ts
 */

import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('Database URL Encoder for AWS RDS\n');
  console.log('This will help you create a properly encoded DATABASE_URL\n');

  const host = await question('RDS Endpoint (e.g., mydb.123456789.us-east-1.rds.amazonaws.com): ');
  const port = await question('Port (default 3306): ') || '3306';
  const user = await question('Username: ');
  const password = await question('Password: ');
  const database = await question('Database name: ');

  // URL encode username and password
  const encodedUser = encodeURIComponent(user);
  const encodedPassword = encodeURIComponent(password);

  const dbUrl = `mysql://${encodedUser}:${encodedPassword}@${host}:${port}/${database}`;

  console.log('\n✅ Your encoded DATABASE_URL:\n');
  console.log(`DATABASE_URL="${dbUrl}"`);
  console.log('\nAdd this to your .env file\n');

  rl.close();
}

main().catch(console.error);
