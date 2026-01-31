/**
 * Firebase Configuration Validator
 * 
 * Run this script to validate your Firebase Admin configuration:
 * npx tsx scripts/validate-firebase-config.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { initializeApp, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function loadEnvFile(): Record<string, string> {
  const envPath = path.join(process.cwd(), '.env');
  const env: Record<string, string> = {};

  if (!fs.existsSync(envPath)) {
    console.error('❌ .env file not found!');
    return env;
  }

  const content = fs.readFileSync(envPath, 'utf-8');
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      
      // Remove surrounding quotes
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      env[key] = value;
    }
  }

  return env;
}

function validatePrivateKey(key: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!key) {
    errors.push('Private key is empty');
    return { valid: false, errors };
  }

  const beginMarker = '-----BEGIN PRIVATE KEY-----';
  const endMarker = '-----END PRIVATE KEY-----';

  if (!key.includes(beginMarker)) {
    errors.push(`Missing "${beginMarker}" marker`);
  }

  if (!key.includes(endMarker)) {
    errors.push(`Missing "${endMarker}" marker`);
  }

  if (key.includes(beginMarker) && !key.includes(endMarker)) {
    errors.push('Has BEGIN marker but missing END marker');
  }

  if (key.includes(endMarker) && !key.includes(beginMarker)) {
    errors.push('Has END marker but missing BEGIN marker');
  }

  // Check if key looks too short (should be ~2000+ characters)
  if (key.length < 1000) {
    errors.push(`Key seems too short (${key.length} chars). Expected ~2000+ characters.`);
  }

  // Check for common issues
  if (key.includes('your-private-key') || key.includes('your-firebase')) {
    errors.push('Key appears to be a placeholder');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function formatPrivateKey(key: string): string {
  let formatted = key.trim();
  
  // Remove surrounding quotes
  formatted = formatted.replace(/^["']|["']$/g, '');
  
  // Replace escaped newlines
  formatted = formatted.replace(/\\n/g, '\n');
  
  // Ensure proper newlines around markers
  formatted = formatted
    .replace(/(-----BEGIN PRIVATE KEY-----)/, '$1\n')
    .replace(/(-----END PRIVATE KEY-----)/, '\n$1');
  
  // Clean up double newlines
  formatted = formatted.replace(/\n\n+/g, '\n');
  
  return formatted;
}

async function main() {
  console.log('🔍 Validating Firebase Admin Configuration...\n');

  const env = loadEnvFile();

  // Check required variables
  const required = [
    'FIREBASE_ADMIN_PRIVATE_KEY',
    'FIREBASE_ADMIN_CLIENT_EMAIL',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  ];

  const missing: string[] = [];
  for (const key of required) {
    if (!env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\nPlease add these to your .env file.\n');
    process.exit(1);
  }

  console.log('✅ All required environment variables are present\n');

  // Validate private key format
  const privateKey = env.FIREBASE_ADMIN_PRIVATE_KEY;
  const validation = validatePrivateKey(privateKey);

  if (!validation.valid) {
    console.error('❌ Private key validation failed:');
    validation.errors.forEach(error => console.error(`   - ${error}`));
    console.error('\n');
  } else {
    console.log('✅ Private key format looks correct\n');
  }

  // Try to format and validate with Firebase SDK
  console.log('🔧 Attempting to initialize Firebase Admin...\n');

  try {
    const formattedKey = formatPrivateKey(privateKey);
    
    const serviceAccount: ServiceAccount = {
      projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: formattedKey,
    };

    const app = initializeApp({
      credential: cert(serviceAccount),
      projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });

    console.log('✅ Firebase Admin initialized successfully!\n');

    // Try to access Firestore
    const db = getFirestore(app);
    console.log('✅ Firestore connection successful!\n');

    console.log('🎉 All checks passed! Your Firebase configuration is correct.\n');
    
    process.exit(0);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    console.error('❌ Failed to initialize Firebase Admin:\n');
    
    if (errorMessage.includes('DECODER') || errorMessage.includes('unsupported')) {
      console.error('   This is a private key format error.\n');
      console.error('   Common causes:');
      console.error('   1. Missing or incorrect BEGIN/END markers');
      console.error('   2. Incorrect newline handling (\\n vs actual newlines)');
      console.error('   3. Key was truncated or corrupted');
      console.error('   4. Extra spaces or characters\n');
      console.error('   Solution:');
      console.error('   1. Go to Firebase Console > Project Settings > Service Accounts');
      console.error('   2. Generate a NEW private key');
      console.error('   3. Copy the ENTIRE "private_key" value from the JSON file');
      console.error('   4. Paste it into .env, keeping all \\n characters');
      console.error('   5. Wrap it in double quotes\n');
    } else {
      console.error(`   Error: ${errorMessage}\n`);
    }
    
    process.exit(1);
  }
}

main().catch(console.error);
