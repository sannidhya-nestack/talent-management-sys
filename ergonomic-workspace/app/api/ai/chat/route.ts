/**
 * AI Chat API Route
 *
 * POST /api/ai/chat - Chat with AI copilot
 *
 * Required: Authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { chatCompletion, getConversationHistory } from '@/lib/services/ai';
import { detectPageContext, buildSystemMessageWithContext } from '@/lib/services/ai/context';
import type { AIChatMessage } from '@/lib/services/ai';

/**
 * POST /api/ai/chat
 *
 * Chat with AI copilot
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user || !session.user.dbUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { message, conversationId, pathname, context: additionalContext } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Detect page context
    const pageContext = detectPageContext(pathname || '/dashboard', additionalContext);
    
    // Build system message with context
    const systemMessage = await buildSystemMessageWithContext(pageContext);

    // Get conversation history if conversationId provided
    let conversationHistory: AIChatMessage[] = [];
    if (conversationId) {
      conversationHistory = await getConversationHistory(conversationId, 20);
    }

    // Build messages array
    const messages: AIChatMessage[] = [
      systemMessage,
      ...conversationHistory,
      { role: 'user', content: message },
    ];

    // Call AI service
    const response = await chatCompletion({
      messages,
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2000,
      userId: session.user.dbUserId,
      conversationId,
      context: {
        pageContext,
        pathname,
      },
    });

    return NextResponse.json({
      response: response.response,
      tokensUsed: response.tokensUsed,
      model: response.model,
      cached: response.cached,
    });
  } catch (error) {
    console.error('Error in AI chat:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
