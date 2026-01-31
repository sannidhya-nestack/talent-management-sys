/**
 * Gmail OAuth Callback Route
 *
 * GET /api/gmail/callback
 *
 * Handles the OAuth2 callback from Google after user authorization.
 * Exchanges the authorization code for tokens and stores them.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { saveGmailCredentials } from '@/lib/gmail';

/**
 * GET /api/gmail/callback
 *
 * OAuth2 callback endpoint. Google redirects here with an authorization code.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Check for OAuth errors
    if (error) {
      console.error('[Gmail Callback] OAuth error:', error);
      return createCallbackResponse(false, `Authorization denied: ${error}`);
    }

    // Validate required parameters
    if (!code || !state) {
      return createCallbackResponse(false, 'Missing authorization code or state');
    }

    // Verify state to prevent CSRF
    const storedState = request.cookies.get('gmail_oauth_state')?.value;
    if (!storedState || storedState !== state) {
      return createCallbackResponse(false, 'Invalid state parameter - possible CSRF attack');
    }

    // Parse state to get user ID
    let stateData: { userId: string; nonce: string; timestamp: number };
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64url').toString());
    } catch {
      return createCallbackResponse(false, 'Invalid state format');
    }

    // Check state timestamp (must be within 10 minutes)
    if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
      return createCallbackResponse(false, 'Authorization expired. Please try again.');
    }

    // Verify user is still authenticated
    const session = await auth();
    if (!session?.user || session.user.dbUserId !== stateData.userId) {
      return createCallbackResponse(false, 'Session mismatch. Please log in again.');
    }

    // Exchange code for tokens and save
    const { email } = await saveGmailCredentials(stateData.userId, code);

    console.log(`[Gmail Callback] Successfully connected Gmail: ${email} for user ${stateData.userId}`);

    // Return success page that closes the popup
    return createCallbackResponse(true, `Successfully connected ${email}`);
  } catch (error) {
    console.error('[Gmail Callback] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createCallbackResponse(false, `Failed to connect Gmail: ${errorMessage}`);
  }
}

/**
 * Create HTML response that communicates result to parent window and closes popup
 */
function createCallbackResponse(success: boolean, message: string): NextResponse {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Gmail Connection</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      background: ${success ? '#10b981' : '#ef4444'};
      color: white;
    }
    .container {
      text-align: center;
      padding: 2rem;
    }
    .icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }
    h1 {
      margin: 0 0 0.5rem 0;
      font-size: 1.5rem;
    }
    p {
      margin: 0;
      opacity: 0.9;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">${success ? '✓' : '✕'}</div>
    <h1>${success ? 'Connected!' : 'Connection Failed'}</h1>
    <p>${escapeHtml(message)}</p>
    <p style="margin-top: 1rem; font-size: 0.875rem;">This window will close automatically...</p>
  </div>
  <script>
    // Send message to parent window
    if (window.opener) {
      window.opener.postMessage({
        type: 'gmail-oauth-callback',
        success: ${success},
        message: ${JSON.stringify(message)}
      }, window.location.origin);
    }
    // Close the popup after a short delay
    setTimeout(() => window.close(), 2000);
  </script>
</body>
</html>
  `.trim();

  const response = new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
    },
  });

  // Clear the state cookie
  response.cookies.delete('gmail_oauth_state');

  return response;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
