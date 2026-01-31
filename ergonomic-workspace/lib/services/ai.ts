/**
 * AI Service
 *
 * Provides AI-powered features using OpenAI API.
 * Handles context management, token tracking, rate limiting, and caching.
 */

import OpenAI from 'openai';
import { collections, generateId } from '@/lib/db';
import { serverTimestamp, toPlainObject, timestampToDate } from '@/lib/db-utils';
import { COLLECTIONS } from '@/lib/types/firestore';

// Initialize OpenAI client
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured. Please set it in your .env file.');
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

// Cache for responses (in-memory, simple implementation)
const responseCache = new Map<string, { response: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Rate limiting (simple in-memory implementation)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX_REQUESTS = 60; // per window
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

export interface AIChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIChatOptions {
  messages: AIChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  context?: Record<string, unknown>; // Additional context data
  userId?: string; // For tracking
  conversationId?: string; // For conversation history
}

export interface AIChatResponse {
  response: string;
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };
  model: string;
  cached?: boolean;
}

export interface AIInteractionLog {
  id: string;
  userId: string;
  conversationId?: string;
  type: 'chat' | 'questionnaire' | 'analysis' | 'report';
  prompt: string;
  response: string;
  tokensUsed: number;
  model: string;
  context?: Record<string, unknown>;
  createdAt: Date;
}

/**
 * Check rate limit for a user
 */
function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);

  if (!userLimit || now > userLimit.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  userLimit.count++;
  return true;
}

/**
 * Generate cache key from messages
 */
function generateCacheKey(messages: AIChatMessage[]): string {
  const key = JSON.stringify(messages.map((m) => ({ role: m.role, content: m.content })));
  return Buffer.from(key).toString('base64').substring(0, 100);
}

/**
 * Get cached response if available
 */
function getCachedResponse(cacheKey: string): string | null {
  const cached = responseCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.response;
  }
  responseCache.delete(cacheKey);
  return null;
}

/**
 * Set cached response
 */
function setCachedResponse(cacheKey: string, response: string): void {
  responseCache.set(cacheKey, { response, timestamp: Date.now() });
}

/**
 * Log AI interaction to Firestore
 */
async function logAIInteraction(data: {
  userId: string;
  conversationId?: string;
  type: 'chat' | 'questionnaire' | 'analysis' | 'report';
  prompt: string;
  response: string;
  tokensUsed: number;
  model: string;
  context?: Record<string, unknown>;
}): Promise<void> {
  try {
    const id = generateId();
    await collections.aiInteractions().doc(id).set({
      id,
      userId: data.userId,
      conversationId: data.conversationId || null,
      type: data.type,
      prompt: data.prompt,
      response: data.response,
      tokensUsed: data.tokensUsed,
      model: data.model,
      context: data.context || null,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    // Log error but don't fail the request
    console.error('Failed to log AI interaction:', error);
  }
}

/**
 * Chat completion with OpenAI
 *
 * @param options - Chat options including messages and context
 * @returns AI response with token usage
 */
export async function chatCompletion(options: AIChatOptions): Promise<AIChatResponse> {
  const { messages, model = 'gpt-4', temperature = 0.7, maxTokens = 2000, userId, conversationId } = options;

  // Check rate limit
  if (userId && !checkRateLimit(userId)) {
    throw new Error('Rate limit exceeded. Please try again in a minute.');
  }

  // Check cache
  const cacheKey = generateCacheKey(messages);
  const cachedResponse = getCachedResponse(cacheKey);
  if (cachedResponse) {
    return {
      response: cachedResponse,
      tokensUsed: { prompt: 0, completion: 0, total: 0 },
      model,
      cached: true,
    };
  }

  const client = getOpenAIClient();

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature,
      max_tokens: maxTokens,
    });

    const response = completion.choices[0]?.message?.content || '';
    const tokensUsed = {
      prompt: completion.usage?.prompt_tokens || 0,
      completion: completion.usage?.completion_tokens || 0,
      total: completion.usage?.total_tokens || 0,
    };

    // Cache response
    setCachedResponse(cacheKey, response);

    // Log interaction
    if (userId) {
      await logAIInteraction({
        userId,
        conversationId,
        type: 'chat',
        prompt: messages[messages.length - 1]?.content || '',
        response,
        tokensUsed: tokensUsed.total,
        model,
        context: options.context,
      });
    }

    return {
      response,
      tokensUsed,
      model,
      cached: false,
    };
  } catch (error) {
    // Retry logic for transient errors
    if (error instanceof Error && error.message.includes('rate_limit')) {
      // Wait and retry once
      await new Promise((resolve) => setTimeout(resolve, 1000));
      try {
        const completion = await client.chat.completions.create({
          model,
          messages: messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          temperature,
          max_tokens: maxTokens,
        });

        const response = completion.choices[0]?.message?.content || '';
        const tokensUsed = {
          prompt: completion.usage?.prompt_tokens || 0,
          completion: completion.usage?.completion_tokens || 0,
          total: completion.usage?.total_tokens || 0,
        };

        setCachedResponse(cacheKey, response);

        if (userId) {
          await logAIInteraction({
            userId,
            conversationId,
            type: 'chat',
            prompt: messages[messages.length - 1]?.content || '',
            response,
            tokensUsed: tokensUsed.total,
            model,
            context: options.context,
          });
        }

        return {
          response,
          tokensUsed,
          model,
          cached: false,
        };
      } catch (retryError) {
        throw new Error(`OpenAI API error: ${retryError instanceof Error ? retryError.message : 'Unknown error'}`);
      }
    }

    throw new Error(`OpenAI API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get conversation history
 */
export async function getConversationHistory(
  conversationId: string,
  limit: number = 50
): Promise<AIChatMessage[]> {
  try {
    const snapshot = await collections
      .aiInteractions()
      .where('conversationId', '==', conversationId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    const messages: AIChatMessage[] = [];
    snapshot.docs.reverse().forEach((doc) => {
      const data = doc.data();
      messages.push({ role: 'user', content: data.prompt });
      messages.push({ role: 'assistant', content: data.response });
    });

    return messages;
  } catch (error) {
    console.error('Error fetching conversation history:', error);
    return [];
  }
}

/**
 * Get AI interaction logs for a user
 */
export async function getAIInteractionLogs(
  userId: string,
  options?: {
    page?: number;
    limit?: number;
    type?: 'chat' | 'questionnaire' | 'analysis' | 'report';
  }
): Promise<{ interactions: AIInteractionLog[]; total: number }> {
  const page = options?.page || 1;
  const limit = options?.limit || 20;

  let query = collections
    .aiInteractions()
    .where('userId', '==', userId) as FirebaseFirestore.Query<FirebaseFirestore.DocumentData>;

  if (options?.type) {
    query = query.where('type', '==', options.type);
  }

  try {
    const snapshot = await query.orderBy('createdAt', 'desc').get();
    const total = snapshot.size;

    const startIndex = (page - 1) * limit;
    const paginatedDocs = snapshot.docs.slice(startIndex, startIndex + limit);

    const interactions = paginatedDocs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        conversationId: data.conversationId,
        type: data.type,
        prompt: data.prompt,
        response: data.response,
        tokensUsed: data.tokensUsed,
        model: data.model,
        context: data.context,
        createdAt: timestampToDate(data.createdAt) || new Date(),
      } as AIInteractionLog;
    });

    return { interactions, total };
  } catch (error) {
    console.error('Error fetching AI interaction logs:', error);
    // Fallback: query without orderBy if index is missing
    const snapshot = await collections.aiInteractions().where('userId', '==', userId).get();
    const total = snapshot.size;

    const startIndex = (page - 1) * limit;
    const docs = [...snapshot.docs].sort((a, b) => {
      const aDate = timestampToDate(a.data().createdAt);
      const bDate = timestampToDate(b.data().createdAt);
      if (!aDate || !bDate) return 0;
      return bDate.getTime() - aDate.getTime();
    });
    const paginatedDocs = docs.slice(startIndex, startIndex + limit);

    const interactions = paginatedDocs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        conversationId: data.conversationId,
        type: data.type,
        prompt: data.prompt,
        response: data.response,
        tokensUsed: data.tokensUsed,
        model: data.model,
        context: data.context,
        createdAt: timestampToDate(data.createdAt) || new Date(),
      } as AIInteractionLog;
    });

    return { interactions, total };
  }
}

/**
 * Clear cache for a specific key or all cache
 */
export function clearCache(cacheKey?: string): void {
  if (cacheKey) {
    responseCache.delete(cacheKey);
  } else {
    responseCache.clear();
  }
}

/**
 * Get rate limit status for a user
 */
export function getRateLimitStatus(userId: string): { remaining: number; resetAt: number } {
  const userLimit = rateLimitMap.get(userId);
  const now = Date.now();

  if (!userLimit || now > userLimit.resetAt) {
    return { remaining: RATE_LIMIT_MAX_REQUESTS, resetAt: now + RATE_LIMIT_WINDOW_MS };
  }

  return {
    remaining: Math.max(0, RATE_LIMIT_MAX_REQUESTS - userLimit.count),
    resetAt: userLimit.resetAt,
  };
}
