# RecruitMaster CRM

## Environment Variables

### Firebase Authentication

Required for Firebase Authentication:

- `NEXT_PUBLIC_FIREBASE_API_KEY` - Firebase API key
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` - Firebase auth domain (e.g., test-automationn.firebaseapp.com)
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID` - Firebase project ID
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` - Firebase storage bucket
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` - Firebase messaging sender ID
- `NEXT_PUBLIC_FIREBASE_APP_ID` - Firebase app ID

### Google OAuth (Optional - for NextAuth)

If you want to use Google Sign-In with NextAuth:

- `GOOGLE_CLIENT_ID` - Google OAuth client ID (from Firebase Console or Google Cloud Console)
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret

**Note:** If Google OAuth credentials are not provided, you'll need to implement authentication differently (e.g., Firebase Auth client-side).

### NextAuth

- `NEXTAUTH_SECRET` - Secret for signing cookies (required)

### Gmail OAuth (Recommended for Email Sending)

The application supports Gmail OAuth2 for sending emails. This allows each admin to connect their Gmail account and send emails from their own address.

**Required Variables:**
```env
GOOGLE_GMAIL_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_GMAIL_CLIENT_SECRET=your-client-secret
GOOGLE_GMAIL_REDIRECT_URI=http://localhost:3000/api/gmail/callback  # Update for production
```

**Setup Instructions:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Gmail API** in APIs & Services > Library
4. Go to APIs & Services > Credentials
5. Click "Create Credentials" > "OAuth client ID"
6. Select "Web application"
7. Add authorized redirect URIs:
   - `http://localhost:3000/api/gmail/callback` (development)
   - `https://yourdomain.com/api/gmail/callback` (production)
8. Copy the Client ID and Client Secret to your `.env` file

**Usage:**
- Go to Settings page and click "Connect Gmail"
- Authorize in the popup window
- When sending emails, select which connected Gmail account to send from
- Admins can send from any connected Gmail account in the system

### Email (SMTP Configuration - Fallback)

Optional SMTP configuration for fallback email sending. The application uses nodemailer with SMTP if Gmail OAuth is not available.

**Required Variables:**
```env
SMTP_HOST=smtp.example.com          # SMTP server hostname
SMTP_PORT=587                       # SMTP port (587 for TLS, 465 for SSL, 25 for unencrypted)
SMTP_USER=your-email@example.com    # SMTP username (usually your email address)
SMTP_PASSWORD=your-smtp-password    # SMTP password or app-specific password
SMTP_FROM_EMAIL=noreply@example.com # Email address to send from
SMTP_FROM_NAME="RecruitMaster CRM"  # Display name for sender (optional)
SMTP_SECURE=false                   # Set to 'true' for SSL (port 465), 'false' for TLS (port 587)
```

**Common Email Provider Settings:**

**Gmail:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password  # Generate from Google Account > Security > App passwords
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_SECURE=false
```

**Outlook/Hotmail:**
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASSWORD=your-password
SMTP_FROM_EMAIL=your-email@outlook.com
SMTP_SECURE=false
```

**Dreamhost (Default):**
```env
SMTP_HOST=smtp.dreamhost.com
SMTP_PORT=587
SMTP_USER=your-email@yourdomain.com
SMTP_PASSWORD=your-email-password
SMTP_FROM_EMAIL=your-email@yourdomain.com
SMTP_SECURE=false
```

**SendGrid:**
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
SMTP_FROM_EMAIL=verified-sender@yourdomain.com
SMTP_SECURE=false
```

**Mailgun:**
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@yourdomain.mailgun.org
SMTP_PASSWORD=your-mailgun-password
SMTP_FROM_EMAIL=noreply@yourdomain.com
SMTP_SECURE=false
```

**Amazon SES:**
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com  # Use your region's endpoint
SMTP_PORT=587
SMTP_USER=your-ses-smtp-username
SMTP_PASSWORD=your-ses-smtp-password
SMTP_FROM_EMAIL=verified-email@yourdomain.com
SMTP_SECURE=false
```

**Note:** For Gmail, you need to enable "Less secure app access" or use an [App Password](https://support.google.com/accounts/answer/185833). For production, consider using a dedicated email service like SendGrid, Mailgun, or Amazon SES.

### Firebase Admin SDK (Optional - Not Required)

The system uses database-based access control, so Firebase Admin SDK is **not required**. However, if you want to use Firebase custom claims in the future, you can optionally add:

- `FIREBASE_ADMIN_PRIVATE_KEY` - Service account private key (can include escaped newlines `\n`)
- `FIREBASE_ADMIN_CLIENT_EMAIL` - Service account client email

**Current Implementation:** Access control (`isAdmin`, `hasAppAccess`) is managed through the local database, not Firebase custom claims.

### Database (AWS RDS or MySQL)

The application uses Prisma with MySQL/MariaDB. You can use AWS RDS or any MySQL-compatible database.

**Option 1: Full DATABASE_URL (Recommended)**
```env
DATABASE_URL="mysql://username:password@rds-endpoint.region.rds.amazonaws.com:3306/database_name"
```

**Option 2: Individual Components (for AWS RDS)**
```env
DB_HOST=your-rds-endpoint.region.rds.amazonaws.com
DB_USER=your-username
DB_PASSWORD=your-password
DB_NAME=your-database-name
DB_PORT=3306
```

**AWS RDS Example:**
```env
DATABASE_URL="mysql://admin:mypassword@mydb.123456789.us-east-1.rds.amazonaws.com:3306/talentdb"
```

After setting DATABASE_URL, run:
```bash
npx prisma generate  # Generate Prisma client
npx prisma migrate dev --name migrate_okta_to_firebase  # Run migrations
```
