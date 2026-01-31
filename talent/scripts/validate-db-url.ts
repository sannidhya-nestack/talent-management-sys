/**
 * Database URL Validator
 * 
 * Run this script to validate your DATABASE_URL format:
 * npx tsx scripts/validate-db-url.ts
 */

import 'dotenv/config';

function validateDatabaseUrl() {
  console.log('Validating DATABASE_URL...\n');

  const url = process.env.DATABASE_URL;
  
  if (!url) {
    console.error('❌ DATABASE_URL is not set in environment variables');
    console.log('\nPlease set DATABASE_URL in your .env file:');
    console.log('DATABASE_URL="mysql://username:password@host:3306/database_name"');
    process.exit(1);
  }

  console.log('DATABASE_URL found (showing first 30 chars for security):');
  console.log(url.substring(0, 30) + '...\n');

  try {
    const parsed = new URL(url);
    
    console.log('✅ URL format is valid');
    console.log(`   Protocol: ${parsed.protocol}`);
    console.log(`   Host: ${parsed.hostname}`);
    console.log(`   Port: ${parsed.port || '3306 (default)'}`);
    console.log(`   Database: ${parsed.pathname.slice(1)}`);
    console.log(`   User: ${parsed.username ? '✓ Set' : '✗ Missing'}`);
    console.log(`   Password: ${parsed.password ? '✓ Set' : '✗ Missing'}`);

    // Validate protocol
    if (parsed.protocol !== 'mysql:') {
      console.error(`\n❌ Invalid protocol: ${parsed.protocol}`);
      console.log('   Expected: mysql:');
      process.exit(1);
    }

    // Validate port
    if (parsed.port) {
      const portNum = parseInt(parsed.port, 10);
      if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        console.error(`\n❌ Invalid port number: ${parsed.port}`);
        console.log('   Port must be between 1 and 65535');
        process.exit(1);
      }
    }

    // Check required components
    if (!parsed.hostname) {
      console.error('\n❌ Host is missing');
      process.exit(1);
    }

    if (!parsed.username) {
      console.error('\n❌ Username is missing');
      process.exit(1);
    }

    if (!parsed.password) {
      console.error('\n❌ Password is missing');
      process.exit(1);
    }

    if (!parsed.pathname || parsed.pathname === '/') {
      console.error('\n❌ Database name is missing');
      process.exit(1);
    }

    console.log('\n✅ All checks passed! DATABASE_URL is valid.');
    console.log('\nExample AWS RDS format:');
    console.log('DATABASE_URL="mysql://admin:password@mydb.123456789.us-east-1.rds.amazonaws.com:3306/talentdb"');
    
  } catch (error) {
    console.error('\n❌ Invalid DATABASE_URL format');
    if (error instanceof TypeError) {
      console.error(`   Error: ${error.message}`);
      console.log('\n💡 Your password likely contains special characters (@, ?, =, etc.)');
      console.log('   that break URL parsing. Use individual components instead:\n');
      console.log('DB_HOST=your-rds-endpoint.region.rds.amazonaws.com');
      console.log('DB_USER=your-username');
      console.log('DB_PASSWORD=your-password');
      console.log('DB_NAME=your-database-name');
      console.log('DB_PORT=3306');
      console.log('\nThe system will automatically build DATABASE_URL from these components.');
    } else {
      console.error(`   Error: ${error}`);
    }
    console.log('\nExpected format (if password has no special characters):');
    console.log('DATABASE_URL="mysql://username:password@host:port/database_name"');
    process.exit(1);
  }
}

validateDatabaseUrl();
