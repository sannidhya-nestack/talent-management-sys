/**
 * Assessment Report Generation Service
 *
 * Provides AI-powered assessment report generation with recommendations and product suggestions.
 */

import { chatCompletion } from '../ai';
import { getAssessmentById } from '../assessments';
import { getClientById } from '../clients';
import { getProducts } from '../products';
import type { AIChatMessage } from '../ai';

export interface AssessmentReport {
  executiveSummary: string;
  keyFindings: Array<{ finding: string; severity: 'LOW' | 'MEDIUM' | 'HIGH'; description: string }>;
  riskAnalysis: {
    overallRisk: 'LOW' | 'MEDIUM' | 'HIGH';
    riskFactors: Array<{ factor: string; impact: string }>;
  };
  recommendations: Array<{ recommendation: string; priority: 'LOW' | 'MEDIUM' | 'HIGH'; rationale: string }>;
  productSuggestions: Array<{ productId: string; productName: string; reason: string; estimatedCost: number }>;
  costEstimates: {
    total: number;
    breakdown: Array<{ category: string; amount: number }>;
  };
}

/**
 * Generate assessment report using AI
 *
 * @param assessmentId - ID of the assessment
 * @param userId - User ID for logging
 * @returns Generated report
 */
export async function generateAssessmentReport(
  assessmentId: string,
  userId?: string
): Promise<AssessmentReport> {
  // Get assessment
  const assessment = await getAssessmentById(assessmentId);
  if (!assessment) {
    throw new Error('Assessment not found');
  }

  // Get client
  const client = await getClientById(assessment.clientId);
  if (!client) {
    throw new Error('Client not found');
  }

  // Get products for suggestions
  const products = await getProducts({ limit: 100, activeOnly: true });

  // Build prompt for report generation
  const prompt = `Generate a comprehensive workspace assessment report.

Client: ${client.companyName}
Industry: ${client.industry || 'Not specified'}
Assessment Type: ${assessment.type}
Assessment Date: ${assessment.conductedDate?.toLocaleDateString() || 'Not conducted'}
Status: ${assessment.status}
Notes: ${assessment.notes || 'No additional notes'}

Available Products (for suggestions):
${products.products.slice(0, 20).map((p) => `- ${p.name} (${p.category}): $${p.price}`).join('\n')}

Generate a professional assessment report with:
1. Executive Summary (2-3 paragraphs)
2. Key Findings (list of findings with severity: LOW, MEDIUM, HIGH)
3. Risk Analysis (overall risk level and risk factors)
4. Recommendations (prioritized recommendations with rationale)
5. Product Suggestions (suggest products from the available list with reasons and estimated costs)
6. Cost Estimates (total and breakdown by category)

Respond in JSON format:
{
  "executiveSummary": "Summary text...",
  "keyFindings": [
    {
      "finding": "Finding name",
      "severity": "HIGH" | "MEDIUM" | "LOW",
      "description": "Description"
    }
  ],
  "riskAnalysis": {
    "overallRisk": "HIGH" | "MEDIUM" | "LOW",
    "riskFactors": [
      {
        "factor": "Factor name",
        "impact": "Impact description"
      }
    ]
  },
  "recommendations": [
    {
      "recommendation": "Recommendation text",
      "priority": "HIGH" | "MEDIUM" | "LOW",
      "rationale": "Why this is recommended"
    }
  ],
  "productSuggestions": [
    {
      "productId": "product-id",
      "productName": "Product name",
      "reason": "Why this product is suggested",
      "estimatedCost": 1000
    }
  ],
  "costEstimates": {
    "total": 5000,
    "breakdown": [
      {
        "category": "Category name",
        "amount": 1000
      }
    ]
  }
}`;

  const messages: AIChatMessage[] = [
    {
      role: 'system',
      content: 'You are an expert in ergonomic workspace assessment. Generate comprehensive, professional assessment reports with actionable recommendations.',
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
      maxTokens: 4000,
      userId,
      context: {
        type: 'report',
        assessmentId,
        assessmentType: assessment.type,
        clientId: client.id,
        clientName: client.companyName,
      },
    });

    // Parse JSON response
    let report: AssessmentReport;
    try {
      const jsonMatch = response.response.match(/```json\n([\s\S]*?)\n```/) || response.response.match(/```\n([\s\S]*?)\n```/);
      const jsonString = jsonMatch ? jsonMatch[1] : response.response;
      report = JSON.parse(jsonString);
    } catch (parseError) {
      // Fallback: create basic report from response text
      report = {
        executiveSummary: response.response.substring(0, 500),
        keyFindings: [],
        riskAnalysis: {
          overallRisk: 'MEDIUM',
          riskFactors: [],
        },
        recommendations: [],
        productSuggestions: [],
        costEstimates: {
          total: 0,
          breakdown: [],
        },
      };
    }

    return report;
  } catch (error) {
    console.error('Error generating assessment report:', error);
    throw new Error(`Failed to generate report: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
