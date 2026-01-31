/**
 * AI Document Categorization Service
 *
 * Provides AI-powered document classification using OpenAI.
 */

import { chatCompletion } from '@/lib/services/ai';
import { updateDocument } from '../documents';
import { DocumentCategory } from '@/lib/types/firestore';
import type { AIChatMessage } from '@/lib/services/ai';

export interface CategorizationResult {
  category: DocumentCategory;
  confidence: number;
  reasoning?: string;
}

/**
 * Categorize a document using AI
 *
 * @param fileName - Name of the document
 * @param fileType - MIME type of the document
 * @param ocrText - OCR extracted text (if available)
 * @param userId - User ID for logging
 * @returns Categorization result
 */
export async function categorizeDocument(
  fileName: string,
  fileType: string,
  ocrText: string | null,
  userId?: string
): Promise<CategorizationResult> {
  // Build prompt for categorization
  const content = `Categorize this document based on its filename and content.

Filename: ${fileName}
File Type: ${fileType}
${ocrText ? `Content Preview: ${ocrText.substring(0, 2000)}` : 'No text content available'}

Categories:
- LEGAL: Contracts, NDAs, agreements, legal documents
- FINANCIAL: Invoices, quotes, payment receipts, financial statements
- PROJECT: Proposals, floor plans, specifications, project documents
- ASSESSMENT: Assessment reports, workspace evaluations, photos
- INSTALLATION: Installation schedules, photos, completion certificates
- OTHER: Any other document type

Respond with a JSON object:
{
  "category": "LEGAL" | "FINANCIAL" | "PROJECT" | "ASSESSMENT" | "INSTALLATION" | "OTHER",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation"
}`;

  const messages: AIChatMessage[] = [
    {
      role: 'system',
      content: 'You are an expert document classifier. Analyze documents and categorize them accurately based on their content and filename.',
    },
    {
      role: 'user',
      content,
    },
  ];

  try {
    const response = await chatCompletion({
      messages,
      model: 'gpt-4',
      temperature: 0.3,
      maxTokens: 500,
      userId,
      context: {
        type: 'categorization',
        fileName,
        fileType,
      },
    });

    // Parse JSON response
    let result: CategorizationResult;
    try {
      const jsonMatch = response.response.match(/```json\n([\s\S]*?)\n```/) || response.response.match(/```\n([\s\S]*?)\n```/);
      const jsonString = jsonMatch ? jsonMatch[1] : response.response;
      const parsed = JSON.parse(jsonString);
      
      // Validate category
      const validCategories: DocumentCategory[] = ['LEGAL', 'FINANCIAL', 'PROJECT', 'ASSESSMENT', 'INSTALLATION', 'OTHER'];
      if (!validCategories.includes(parsed.category)) {
        parsed.category = 'OTHER';
      }

      result = {
        category: parsed.category as DocumentCategory,
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
        reasoning: parsed.reasoning,
      };
    } catch (parseError) {
      // Fallback categorization based on filename
      result = fallbackCategorization(fileName);
    }

    return result;
  } catch (error) {
    console.error('Error categorizing document:', error);
    // Fallback to filename-based categorization
    return fallbackCategorization(fileName);
  }
}

/**
 * Fallback categorization based on filename patterns
 */
function fallbackCategorization(fileName: string): CategorizationResult {
  const lower = fileName.toLowerCase();

  if (lower.includes('contract') || lower.includes('nda') || lower.includes('agreement') || lower.includes('legal')) {
    return { category: 'LEGAL', confidence: 0.7 };
  }
  if (lower.includes('invoice') || lower.includes('quote') || lower.includes('payment') || lower.includes('receipt') || lower.includes('financial')) {
    return { category: 'FINANCIAL', confidence: 0.7 };
  }
  if (lower.includes('proposal') || lower.includes('floor') || lower.includes('plan') || lower.includes('specification') || lower.includes('project')) {
    return { category: 'PROJECT', confidence: 0.7 };
  }
  if (lower.includes('assessment') || lower.includes('evaluation') || lower.includes('report')) {
    return { category: 'ASSESSMENT', confidence: 0.7 };
  }
  if (lower.includes('installation') || lower.includes('schedule') || lower.includes('certificate')) {
    return { category: 'INSTALLATION', confidence: 0.7 };
  }

  return { category: 'OTHER', confidence: 0.5 };
}

/**
 * Categorize a document and update it in the database
 *
 * @param documentId - ID of the document
 * @param fileName - Name of the document
 * @param fileType - MIME type of the document
 * @param ocrText - OCR extracted text (if available)
 * @param userId - User ID for logging
 * @returns Categorization result
 */
export async function categorizeAndUpdateDocument(
  documentId: string,
  fileName: string,
  fileType: string,
  ocrText: string | null,
  userId?: string
): Promise<CategorizationResult> {
  const result = await categorizeDocument(fileName, fileType, ocrText, userId);

  // Update document with new category
  await updateDocument(documentId, {
    category: result.category,
  });

  return result;
}

/**
 * Batch categorize multiple documents
 *
 * @param documents - Array of document info
 * @param userId - User ID for logging
 * @returns Array of categorization results
 */
export async function batchCategorizeDocuments(
  documents: Array<{
    documentId: string;
    fileName: string;
    fileType: string;
    ocrText: string | null;
  }>,
  userId?: string
): Promise<Array<CategorizationResult & { documentId: string }>> {
  const results = await Promise.all(
    documents.map(async (doc) => {
      try {
        const result = await categorizeAndUpdateDocument(
          doc.documentId,
          doc.fileName,
          doc.fileType,
          doc.ocrText,
          userId
        );
        return { ...result, documentId: doc.documentId };
      } catch (error) {
        console.error(`Failed to categorize document ${doc.documentId}:`, error);
        const fallback = fallbackCategorization(doc.fileName);
        return { ...fallback, documentId: doc.documentId };
      }
    })
  );

  return results;
}
