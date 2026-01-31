/**
 * AI Questionnaire Generation API Route
 *
 * POST /api/ai/questionnaire - Generate questionnaire using AI
 *
 * Required: Authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { chatCompletion } from '@/lib/services/ai';
import type { AIChatMessage } from '@/lib/services/ai';

/**
 * POST /api/ai/questionnaire
 *
 * Generate questionnaire using AI
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
    const { clientName, industry, companySize, focusAreas } = body;

    if (!clientName || !industry) {
      return NextResponse.json(
        { error: 'Client name and industry are required' },
        { status: 400 }
      );
    }

    // Build prompt for questionnaire generation
    const prompt = `Generate a comprehensive workspace assessment questionnaire for ${clientName}, a company in the ${industry} industry${companySize ? ` with ${companySize} employees` : ''}.${focusAreas ? ` Focus areas: ${Array.isArray(focusAreas) ? focusAreas.join(', ') : focusAreas}.` : ''}

Generate 30-50 tailored questions that include:
1. Industry-specific questions relevant to ${industry}
2. Company-specific references to ${clientName}
3. Work pattern questions (hybrid work, remote work, office setup)
4. Ergonomic assessment questions
5. Workspace environment questions (lighting, air quality, noise)
6. Equipment and furniture questions
7. Health and wellness questions

Format the response as a JSON array of question objects, each with:
- text: string (the question text)
- type: "MULTIPLE_CHOICE" | "MULTIPLE_SELECT" | "LIKERT_SCALE" | "TRUE_FALSE" | "TEXT" | "RATING"
- required: boolean
- options: array of option objects (for multiple choice/select) or configuration object (for likert/rating)
- helpText: string (optional, helpful context for the question)

Make the questions specific, actionable, and relevant to workspace ergonomics assessment.`;

    const messages: AIChatMessage[] = [
      {
        role: 'system',
        content: 'You are an expert in ergonomic workspace assessment. Generate comprehensive, tailored questionnaires for workspace evaluations.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ];

    // Call AI service
    const response = await chatCompletion({
      messages,
      model: 'gpt-4',
      temperature: 0.8,
      maxTokens: 4000,
      userId: session.user.dbUserId,
      context: {
        type: 'questionnaire',
        clientName,
        industry,
        companySize,
        focusAreas,
      },
    });

    // Try to parse JSON from response
    let questions;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = response.response.match(/```json\n([\s\S]*?)\n```/) || response.response.match(/```\n([\s\S]*?)\n```/);
      const jsonString = jsonMatch ? jsonMatch[1] : response.response;
      questions = JSON.parse(jsonString);
    } catch (parseError) {
      // If parsing fails, return the raw response and let the frontend handle it
      return NextResponse.json({
        questions: null,
        rawResponse: response.response,
        tokensUsed: response.tokensUsed,
        model: response.model,
      });
    }

    return NextResponse.json({
      questions,
      tokensUsed: response.tokensUsed,
      model: response.model,
    });
  } catch (error) {
    console.error('Error generating questionnaire:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
