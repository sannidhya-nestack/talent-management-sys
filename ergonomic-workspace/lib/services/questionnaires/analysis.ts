/**
 * Questionnaire Response Analysis Service
 *
 * Provides AI-powered analysis of questionnaire responses.
 */

import { chatCompletion } from '../ai';
import { getQuestionnaireById } from '../questionnaires';
import { collections } from '@/lib/db';
import { timestampToDate } from '@/lib/db-utils';
import type { AIChatMessage } from '../ai';

export interface ResponseAnalysis {
  summary: string;
  highRiskAreas: Array<{ area: string; description: string; severity: 'LOW' | 'MEDIUM' | 'HIGH' }>;
  commonIssues: Array<{ issue: string; frequency: number; description: string }>;
  focusAreas: Array<{ area: string; reason: string }>;
  insights: string;
}

/**
 * Analyze questionnaire responses using AI
 *
 * @param questionnaireId - ID of the questionnaire
 * @param userId - User ID for logging
 * @returns Analysis results
 */
export async function analyzeQuestionnaireResponses(
  questionnaireId: string,
  userId?: string
): Promise<ResponseAnalysis> {
  // Get questionnaire
  const questionnaire = await getQuestionnaireById(questionnaireId);
  if (!questionnaire) {
    throw new Error('Questionnaire not found');
  }

  // Get all responses for this questionnaire
  const responsesSnapshot = await collections
    .questionnaireResponses()
    .where('questionnaireId', '==', questionnaireId)
    .get();

  if (responsesSnapshot.empty) {
    throw new Error('No responses found for this questionnaire');
  }

  // Group responses by submission
  const submissions = new Map<string, Array<{ questionId: string; answer: any }>>();
  for (const doc of responsesSnapshot.docs) {
    const data = doc.data();
    const submissionId = data.submissionId || doc.id;
    if (!submissions.has(submissionId)) {
      submissions.set(submissionId, []);
    }
    submissions.get(submissionId)!.push({
      questionId: data.questionId,
      answer: data.answer,
    });
  }

  // Build prompt for analysis
  const questionsText = questionnaire.questions
    ?.map((q, idx) => `${idx + 1}. ${q.text} (Type: ${q.type})`)
    .join('\n') || 'No questions available';

  const responsesText = Array.from(submissions.entries())
    .map(([submissionId, responses]) => {
      const responseText = responses
        .map((r) => {
          const question = questionnaire.questions?.find((q) => q.id === r.questionId);
          return `Q: ${question?.text || r.questionId}\nA: ${JSON.stringify(r.answer)}`;
        })
        .join('\n');
      return `Submission ${submissionId}:\n${responseText}`;
    })
    .join('\n\n');

  const prompt = `Analyze the following workspace assessment questionnaire responses and provide insights.

Questionnaire: ${questionnaire.name}
Total Submissions: ${submissions.size}

Questions:
${questionsText}

Responses:
${responsesText}

Please provide:
1. Executive summary of findings
2. High-risk areas identified (with severity: LOW, MEDIUM, HIGH)
3. Common issues across responses (with frequency)
4. Focus areas for on-site assessment
5. Overall insights and recommendations

Respond in JSON format:
{
  "summary": "Executive summary...",
  "highRiskAreas": [
    {
      "area": "Area name",
      "description": "Description",
      "severity": "HIGH" | "MEDIUM" | "LOW"
    }
  ],
  "commonIssues": [
    {
      "issue": "Issue name",
      "frequency": 5,
      "description": "Description"
    }
  ],
  "focusAreas": [
    {
      "area": "Area name",
      "reason": "Why this area needs focus"
    }
  ],
  "insights": "Overall insights and recommendations"
}`;

  const messages: AIChatMessage[] = [
    {
      role: 'system',
      content: 'You are an expert in ergonomic workspace assessment. Analyze questionnaire responses and provide actionable insights.',
    },
    {
      role: 'user',
      content: prompt,
    },
  ];

  try {
    const response = await chatCompletion({
      messages,
      model: 'gpt-4',
      temperature: 0.3,
      maxTokens: 3000,
      userId,
      context: {
        type: 'analysis',
        questionnaireId,
        questionnaireName: questionnaire.name,
      },
    });

    // Parse JSON response
    let analysis: ResponseAnalysis;
    try {
      const jsonMatch = response.response.match(/```json\n([\s\S]*?)\n```/) || response.response.match(/```\n([\s\S]*?)\n```/);
      const jsonString = jsonMatch ? jsonMatch[1] : response.response;
      analysis = JSON.parse(jsonString);
    } catch (parseError) {
      // Fallback: create basic analysis from response text
      analysis = {
        summary: response.response.substring(0, 500),
        highRiskAreas: [],
        commonIssues: [],
        focusAreas: [],
        insights: response.response,
      };
    }

    return analysis;
  } catch (error) {
    console.error('Error analyzing questionnaire responses:', error);
    throw new Error(`Failed to analyze responses: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
