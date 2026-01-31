# Firebase Setup Guide

## Getting Firebase Admin Credentials

The error "DECODER routines::unsupported" typically means the private key format is incorrect. Follow these steps:

### Step 1: Get Service Account Credentials

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project (or create a new one)
3. Click the gear icon ⚙️ next to "Project Overview"
4. Select **"Project settings"**
5. Go to the **"Service accounts"** tab
6. Click **"Generate new private key"**
7. Click **"Generate key"** in the confirmation dialog
8. A JSON file will download (e.g., `your-project-firebase-adminsdk-xxxxx.json`)

### Step 2: Extract Values from JSON

Open the downloaded JSON file. It will look like this:

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com",
  ...
}
```

### Step 3: Add to .env File

Add these values to your `ergonomic-workspace/.env` file:

```env
# Copy the entire "private_key" value (including BEGIN/END markers)
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"

# Copy the "client_email" value
FIREBASE_ADMIN_CLIENT_EMAIL="firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com"

# Copy the "project_id" value
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
```

### Important Notes:

1. **Private Key Format**: 
   - The private key MUST include the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` markers
   - Keep the `\n` characters as they are (they will be converted to actual newlines)
   - If copying from JSON, the key will already have `\n` in it - keep them!

2. **Quotes in .env**:
   - Use double quotes `"` around the values
   - If your private key contains quotes, escape them with `\"`

3. **Common Mistakes**:
   - ❌ Removing the BEGIN/END markers
   - ❌ Removing the `\n` characters
   - ❌ Using single quotes instead of double quotes
   - ❌ Not copying the entire key (it's very long!)

### Step 4: Enable Firestore

1. In Firebase Console, go to **"Firestore Database"** in the left menu
2. Click **"Create database"**
3. Choose **"Start in production mode"** or **"Start in test mode"** (for development)
4. Select a location for your database
5. Click **"Enable"**

### Step 5: Restart Dev Server

After updating your `.env` file:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

## Troubleshooting

### Error: "DECODER routines::unsupported"
- **Cause**: Private key format is incorrect
- **Fix**: Make sure you copied the ENTIRE private_key value from the JSON, including BEGIN/END markers and all `\n` characters

### Error: "Missing required Firebase Admin configuration"
- **Cause**: Environment variables are not set
- **Fix**: Check that all three variables are in your `.env` file and restart the server

### Error: "Invalid FIREBASE_ADMIN_PRIVATE_KEY format"
- **Cause**: Private key is missing BEGIN/END markers
- **Fix**: Copy the entire private_key value from the JSON file, including the markers
