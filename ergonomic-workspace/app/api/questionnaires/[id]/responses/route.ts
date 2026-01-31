/**
 * Questionnaire Responses API Route
 *
 * GET /api/questionnaires/[id]/responses - List all responses for a questionnaire template
 *
 * Required: Authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getQuestionnaireById } from '@/lib/services/questionnaires';
import { collections } from '@/lib/db';
import { timestampToDate, toPlainObject } from '@/lib/db-utils';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/questionnaires/[id]/responses
 *
 * List all responses for a questionnaire template with pagination
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Validate ID is not empty
    if (!id || id.trim().length === 0) {
      return NextResponse.json({ error: 'Invalid questionnaire ID' }, { status: 400 });
    }

    // Check if template exists
    const template = await getQuestionnaireById(id);
    if (!template) {
      return NextResponse.json({ error: 'Questionnaire not found' }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // Get all responses for this questionnaire template
    // Note: In the current implementation, responses are stored with questionnaireId = template.id
    let responsesSnapshot;
    let docs: FirebaseFirestore.QueryDocumentSnapshot[];

    try {
      // Try to order by submittedAt
      const orderedQuery = collections
        .questionnaireResponses()
        .where('questionnaireId', '==', id)
        .orderBy('submittedAt', 'desc')
        .limit(limit * page);
      responsesSnapshot = await orderedQuery.get();
      docs = responsesSnapshot.docs;
    } catch (error) {
      // If orderBy fails (e.g., no index or field doesn't exist), query without ordering
      console.warn('Could not order by submittedAt, querying without order:', error);
      responsesSnapshot = await collections
        .questionnaireResponses()
        .where('questionnaireId', '==', id)
        .limit(limit * page)
        .get();
      // Sort client-side by submittedAt if available
      docs = [...responsesSnapshot.docs].sort((a, b) => {
        const aDate = timestampToDate(a.data().submittedAt);
        const bDate = timestampToDate(b.data().submittedAt);
        if (!aDate || !bDate) return 0;
        return bDate.getTime() - aDate.getTime(); // desc
      });
    }

    const allResponses = docs.map((doc) => ({
      id: doc.id,
      ...toPlainObject(doc.data()),
      submittedAt: timestampToDate(doc.data().submittedAt) || new Date(),
    }));

    // Group responses by submission (assuming responses with same submittedAt are from same submission)
    const groupedResponses = new Map<string, any[]>();
    allResponses.forEach((response) => {
      const key = response.submittedAt?.toISOString() || response.id;
      if (!groupedResponses.has(key)) {
        groupedResponses.set(key, []);
      }
      groupedResponses.get(key)!.push(response);
    });

    const submissions = Array.from(groupedResponses.entries()).map(([key, responses]) => ({
      id: key,
      submittedAt: responses[0]?.submittedAt || new Date(),
      responsesCount: responses.length,
      responses,
    }));

    const total = submissions.length;

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const paginatedSubmissions = submissions.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      submissions: paginatedSubmissions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching questionnaire responses:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
