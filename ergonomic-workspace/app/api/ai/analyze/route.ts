/**
 * AI Document Analysis API Route
 *
 * POST /api/ai/analyze - Analyze document content using AI
 *
 * Required: Authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { chatCompletion } from '@/lib/services/ai';
import { getDocumentById } from '@/lib/services/documents';
import type { AIChatMessage } from '@/lib/services/ai';

/**
 * POST /api/ai/analyze
 *
 * Analyze document content
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
    const { documentId, question, analysisType } = body;

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    // Get document
    const document = await getDocumentById(documentId);
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Check if document has OCR text
    if (!document.ocrText) {
      return NextResponse.json(
        { error: 'Document has not been processed with OCR yet' },
        { status: 400 }
      );
    }

    // Build prompt based on analysis type
    let prompt = '';
    if (question) {
      prompt = `Answer this question about the document: "${question}"\n\nDocument content:\n${document.ocrText.substring(0, 8000)}`;
    } else if (analysisType === 'summary') {
      prompt = `Provide a comprehensive summary of this document:\n\n${document.ocrText.substring(0, 8000)}`;
    } else if (analysisType === 'extract') {
      prompt = `Extract key information from this document including dates, amounts, parties, and important terms:\n\n${document.ocrText.substring(0, 8000)}`;
    } else {
      prompt = `Analyze this document and provide insights:\n\n${document.ocrText.substring(0, 8000)}`;
    }

    const messages: AIChatMessage[] = [
      {
        role: 'system',
        content: `You are an expert document analyst. Analyze documents and provide accurate, concise insights. Document: ${document.fileName} (${document.category}).`,
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
      temperature: 0.3,
      maxTokens: 2000,
      userId: session.user.dbUserId,
      context: {
        type: 'analysis',
        documentId,
        documentCategory: document.category,
        fileName: document.fileName,
      },
    });

    return NextResponse.json({
      analysis: response.response,
      tokensUsed: response.tokensUsed,
      model: response.model,
    });
  } catch (error) {
    console.error('Error analyzing document:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
