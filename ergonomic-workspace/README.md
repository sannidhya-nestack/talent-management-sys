# Ergonomic Workspace Management Platform

A comprehensive platform for managing ergonomic workspace assessments, client relationships, interior planning, and project execution.

## Features

- **Client Management**: Complete CRM for managing client relationships, contacts, and projects
- **Workspace Assessments**: Conduct and track ergonomic workspace assessments
- **Questionnaires**: Create and send client-facing questionnaires
- **Interior Planning**: Design workspace layouts with 3D visualization
- **Installation Coordination**: Schedule and track installation projects
- **Integrations**: Email (Gmail/Outlook), Calendar (Google/Outlook), Accounting (QuickBooks/Xero)
- **AI Copilot**: Context-aware AI assistant on every page
- **Document Management**: Bulk upload, OCR processing, and full-text search

## Technology Stack

- **Framework**: Next.js 16+ (App Router)
- **Language**: TypeScript 5+
- **Database**: Firestore (Firebase)
- **Authentication**: Firebase Auth with NextAuth.js
- **UI**: Tailwind CSS + shadcn/ui components
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Firebase project with Authentication and Firestore enabled

### Installation

1. Install dependencies:
```bash
npm install --legacy-peer-deps
```
Note: Using `--legacy-peer-deps` is required due to React 19 compatibility with some dependencies.

2. Set up environment variables:
Create a `.env` file in the root directory with the following variables:

```env
# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Firebase Admin (for Firestore)
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-firebase-project-id"
FIREBASE_ADMIN_CLIENT_EMAIL="your-firebase-client-email"
FIREBASE_ADMIN_PRIVATE_KEY="your-firebase-private-key"

# Firebase Client Config
NEXT_PUBLIC_FIREBASE_API_KEY="your-firebase-api-key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-firebase-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your-messaging-sender-id"
NEXT_PUBLIC_FIREBASE_APP_ID="your-firebase-app-id"

# Gmail OAuth (optional, for email integration)
GMAIL_CLIENT_ID="your-gmail-client-id"
GMAIL_CLIENT_SECRET="your-gmail-client-secret"
GMAIL_REDIRECT_URI="http://localhost:3000/api/email/gmail/callback"

# OpenAI (optional, for AI Copilot)
OPENAI_API_KEY="your-openai-api-key"
```

3. Set up Firestore:
   - Enable Firestore in your Firebase Console
   - Create a Firestore database (start in production mode or test mode)
   - Configure Firestore security rules as needed

4. (Optional) Seed database:
```bash
npm run db:seed
```

6. Run development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Project Structure

```
ergonomic-workspace/
├── app/                    # Next.js app router pages
│   ├── (dashboard)/       # Protected dashboard routes
│   ├── api/               # API routes
│   └── questionnaire/     # Public questionnaire pages
├── components/             # React components
│   ├── ui/                # shadcn/ui components
│   ├── layout/             # Layout components
│   └── auth/               # Authentication components
├── lib/                    # Utility libraries
│   ├── services/           # Business logic services
│   ├── firebase/           # Firebase configuration
│   └── security/          # Security utilities
├── config/                 # Configuration files
├── prisma/                 # Prisma schema and migrations
└── public/                 # Static assets
```

## Development

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run lint`: Run ESLint
- `npm run db:studio`: Open Prisma Studio
- `npm run db:push`: Push schema changes to database

## License

Private - All rights reserved
