/**
 * AI Context Providers
 *
 * Provides context-aware data aggregation for AI responses.
 * Detects current page context and aggregates relevant data.
 */

import { getClientById } from '@/lib/services/clients';
import { getClientActivities } from '@/lib/services/activities';
import { getDocuments } from '@/lib/services/documents';
import { getAssessments } from '@/lib/services/assessments';
import { getQuestionnaireById } from '@/lib/services/questionnaires';
import { getLayoutById } from '@/lib/services/layouts';
import { getProducts } from '@/lib/services/products';
import { collections } from '@/lib/db';
import { timestampToDate, toPlainObject } from '@/lib/db-utils';
import type { AIChatMessage } from '../ai';

export interface PageContext {
  type: 'client' | 'assessment' | 'questionnaire' | 'document' | 'interior-planning' | 'financial' | 'dashboard' | 'other';
  clientId?: string;
  assessmentId?: string;
  questionnaireId?: string;
  documentId?: string;
  layoutId?: string;
  tab?: string; // For client detail tabs
}

export interface AggregatedContext {
  client?: {
    id: string;
    companyName: string;
    industry: string | null;
    status: string;
    contacts: Array<{ name: string; email: string; jobTitle: string | null }>;
  };
  recentActivities?: Array<{
    type: string;
    description: string;
    timestamp: Date;
    user?: string;
  }>;
  documents?: Array<{
    id: string;
    fileName: string;
    category: string;
    ocrText?: string | null;
  }>;
  assessments?: Array<{
    id: string;
    type: string;
    status: string;
    conductedDate: Date | null;
    notes: string | null;
  }>;
  financial?: {
    totalRevenue: number;
    outstandingInvoices: number;
    recentPayments: Array<{ amount: number; date: Date }>;
  };
  questionnaire?: {
    id: string;
    name: string;
    questionsCount: number;
    responsesCount: number;
  };
  layout?: {
    id: string;
    name: string;
    clientId: string;
    projectId: string | null;
  };
  products?: Array<{
    id: string;
    name: string;
    category: string;
    price: number;
  }>;
}

/**
 * Detect page context from URL path
 */
export function detectPageContext(pathname: string, searchParams?: Record<string, string>): PageContext {
  // Client detail page
  if (pathname.match(/^\/clients\/[^/]+$/)) {
    const clientId = pathname.split('/')[2];
    return {
      type: 'client',
      clientId,
      tab: searchParams?.tab || 'overview',
    };
  }

  // Client detail tab
  if (pathname.match(/^\/clients\/[^/]+\/[^/]+$/)) {
    const parts = pathname.split('/');
    const clientId = parts[2];
    const tab = parts[3];
    return {
      type: 'client',
      clientId,
      tab,
    };
  }

  // Assessment detail
  if (pathname.match(/^\/assessments\/[^/]+$/)) {
    const assessmentId = pathname.split('/')[2];
    return {
      type: 'assessment',
      assessmentId,
    };
  }

  // Questionnaire detail
  if (pathname.match(/^\/questionnaires\/[^/]+$/)) {
    const questionnaireId = pathname.split('/')[2];
    return {
      type: 'questionnaire',
      questionnaireId,
    };
  }

  // Interior planning detail
  if (pathname.match(/^\/interior-planning\/[^/]+$/)) {
    const layoutId = pathname.split('/')[2];
    return {
      type: 'interior-planning',
      layoutId,
    };
  }

  // Dashboard
  if (pathname === '/dashboard') {
    return { type: 'dashboard' };
  }

  return { type: 'other' };
}

/**
 * Aggregate context data based on page context
 */
export async function aggregateContext(context: PageContext): Promise<AggregatedContext> {
  const aggregated: AggregatedContext = {};

  try {
    // If we have a clientId, fetch client data
    if (context.clientId) {
      const client = await getClientById(context.clientId);
      if (client) {
        aggregated.client = {
          id: client.id,
          companyName: client.companyName,
          industry: client.industry,
          status: client.status,
          contacts: client.contacts.map((c) => ({
            name: c.name,
            email: c.email,
            jobTitle: c.jobTitle,
          })),
        };

        // Fetch recent activities
        try {
          const activities = await getClientActivities(context.clientId, { limit: 20 });
          aggregated.recentActivities = activities.map((a) => ({
            type: a.type,
            description: a.description,
            timestamp: a.timestamp,
            user: a.user?.displayName,
          }));
        } catch (error) {
          console.warn('Failed to fetch activities:', error);
        }

        // Fetch documents if on documents tab
        if (context.tab === 'documents') {
          try {
            const docs = await getDocuments({ clientId: context.clientId, limit: 20 });
            aggregated.documents = docs.documents.map((d) => ({
              id: d.id,
              fileName: d.fileName,
              category: d.category,
              ocrText: d.ocrText,
            }));
          } catch (error) {
            console.warn('Failed to fetch documents:', error);
          }
        }

        // Fetch assessments if on assessments tab
        if (context.tab === 'assessments') {
          try {
            const assessments = await getAssessments({ clientId: context.clientId, limit: 20 });
            aggregated.assessments = assessments.assessments.map((a) => ({
              id: a.id,
              type: a.type,
              status: a.status,
              conductedDate: a.conductedDate,
              notes: a.notes,
            }));
          } catch (error) {
            console.warn('Failed to fetch assessments:', error);
          }
        }

        // Fetch financial data if on financial tab
        if (context.tab === 'financial') {
          try {
            let invoiceSnapshot;
            let invoiceDocs: FirebaseFirestore.QueryDocumentSnapshot[];
            try {
              invoiceSnapshot = await collections
                .invoices()
                .where('clientId', '==', context.clientId)
                .orderBy('createdAt', 'desc')
                .limit(50)
                .get();
              invoiceDocs = invoiceSnapshot.docs;
            } catch (error) {
              invoiceSnapshot = await collections
                .invoices()
                .where('clientId', '==', context.clientId)
                .limit(50)
                .get();
              invoiceDocs = [...invoiceSnapshot.docs].sort((a, b) => {
                const aDate = timestampToDate(a.data().createdAt);
                const bDate = timestampToDate(b.data().createdAt);
                if (!aDate || !bDate) return 0;
                return bDate.getTime() - aDate.getTime();
              });
            }

            const invoices = invoiceDocs.map((doc) => {
              const data = doc.data();
              return {
                ...toPlainObject(data),
                id: doc.id,
                amount: data.amount || 0,
                status: data.status || 'DRAFT',
                paidDate: timestampToDate(data.paidDate),
              };
            });

            const totalRevenue = invoices
              .filter((inv: { status: string }) => inv.status === 'PAID')
              .reduce((sum: number, inv: { amount: number }) => sum + (inv.amount || 0), 0);
            const outstandingInvoices = invoices.filter((inv: { status: string }) => inv.status === 'SENT').length;
            const recentPayments = invoices
              .filter((inv: { status: string; paidDate: Date | null }) => inv.status === 'PAID' && inv.paidDate)
              .map((inv: { amount: number; paidDate: Date }) => ({
                amount: inv.amount || 0,
                date: inv.paidDate,
              }))
              .sort((a, b) => b.date.getTime() - a.date.getTime())
              .slice(0, 10);

            aggregated.financial = {
              totalRevenue,
              outstandingInvoices,
              recentPayments,
            };
          } catch (error) {
            console.warn('Failed to fetch financial data:', error);
          }
        }
      }
    }

    // Fetch assessment data if on assessment page
    if (context.assessmentId) {
      try {
        const assessments = await getAssessments({ page: 1, limit: 1 });
        const assessment = assessments.assessments.find((a) => a.id === context.assessmentId);
        if (assessment && assessment.clientId) {
          const client = await getClientById(assessment.clientId);
          if (client) {
            aggregated.client = {
              id: client.id,
              companyName: client.companyName,
              industry: client.industry,
              status: client.status,
              contacts: client.contacts.map((c) => ({
                name: c.name,
                email: c.email,
                jobTitle: c.jobTitle,
              })),
            };
          }
        }
        aggregated.assessments = assessment
          ? [
              {
                id: assessment.id,
                type: assessment.type,
                status: assessment.status,
                conductedDate: assessment.conductedDate,
                notes: assessment.notes,
              },
            ]
          : [];
      } catch (error) {
        console.warn('Failed to fetch assessment:', error);
      }
    }

    // Fetch questionnaire data if on questionnaire page
    if (context.questionnaireId) {
      try {
        const questionnaire = await getQuestionnaireById(context.questionnaireId);
        if (questionnaire) {
          aggregated.questionnaire = {
            id: questionnaire.id,
            name: questionnaire.name,
            questionsCount: questionnaire.questions?.length || 0,
            responsesCount: questionnaire.responsesCount || 0,
          };
        }
      } catch (error) {
        console.warn('Failed to fetch questionnaire:', error);
      }
    }

    // Fetch layout data if on interior planning page
    if (context.layoutId) {
      try {
        const layout = await getLayoutById(context.layoutId);
        if (layout) {
          aggregated.layout = {
            id: layout.id,
            name: layout.name,
            clientId: layout.clientId,
            projectId: layout.projectId,
          };
          if (layout.clientId) {
            const client = await getClientById(layout.clientId);
            if (client) {
              aggregated.client = {
                id: client.id,
                companyName: client.companyName,
                industry: client.industry,
                status: client.status,
                contacts: client.contacts.map((c) => ({
                  name: c.name,
                  email: c.email,
                  jobTitle: c.jobTitle,
                })),
              };
            }
          }
        }
      } catch (error) {
        console.warn('Failed to fetch layout:', error);
      }
    }

    // Fetch products for interior planning
    if (context.type === 'interior-planning') {
      try {
        const products = await getProducts({ limit: 50, activeOnly: true });
        aggregated.products = products.products.map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          price: p.price,
        }));
      } catch (error) {
        console.warn('Failed to fetch products:', error);
      }
    }
  } catch (error) {
    console.error('Error aggregating context:', error);
  }

  return aggregated;
}

/**
 * Format context into a system message for AI
 */
export function formatContextForAI(context: AggregatedContext, pageType: string): string {
  const parts: string[] = [];

  parts.push(`You are an AI assistant for an ergonomic workspace management platform.`);
  parts.push(`Current page context: ${pageType}`);

  if (context.client) {
    parts.push(`\nClient Information:`);
    parts.push(`- Company: ${context.client.companyName}`);
    if (context.client.industry) parts.push(`- Industry: ${context.client.industry}`);
    parts.push(`- Status: ${context.client.status}`);
    if (context.client.contacts.length > 0) {
      parts.push(`- Contacts: ${context.client.contacts.map((c) => `${c.name} (${c.email})`).join(', ')}`);
    }
  }

  if (context.recentActivities && context.recentActivities.length > 0) {
    parts.push(`\nRecent Activity (last ${context.recentActivities.length} items):`);
    context.recentActivities.slice(0, 10).forEach((activity) => {
      parts.push(`- [${activity.timestamp.toLocaleDateString()}] ${activity.type}: ${activity.description}`);
    });
  }

  if (context.documents && context.documents.length > 0) {
    parts.push(`\nDocuments (${context.documents.length} total):`);
    context.documents.slice(0, 5).forEach((doc) => {
      parts.push(`- ${doc.fileName} (${doc.category})`);
    });
  }

  if (context.assessments && context.assessments.length > 0) {
    parts.push(`\nAssessments:`);
    context.assessments.forEach((assessment) => {
      parts.push(`- ${assessment.type} (${assessment.status}) - ${assessment.conductedDate?.toLocaleDateString() || 'Not conducted'}`);
    });
  }

  if (context.financial) {
    parts.push(`\nFinancial Summary:`);
    parts.push(`- Total Revenue: $${context.financial.totalRevenue.toLocaleString()}`);
    parts.push(`- Outstanding Invoices: ${context.financial.outstandingInvoices}`);
    if (context.financial.recentPayments.length > 0) {
      parts.push(`- Recent Payments: ${context.financial.recentPayments.length} payments`);
    }
  }

  if (context.questionnaire) {
    parts.push(`\nQuestionnaire:`);
    parts.push(`- Name: ${context.questionnaire.name}`);
    parts.push(`- Questions: ${context.questionnaire.questionsCount}`);
    parts.push(`- Responses: ${context.questionnaire.responsesCount}`);
  }

  if (context.layout) {
    parts.push(`\nLayout:`);
    parts.push(`- Name: ${context.layout.name}`);
  }

  if (context.products && context.products.length > 0) {
    parts.push(`\nAvailable Products (${context.products.length} total):`);
    context.products.slice(0, 10).forEach((product) => {
      parts.push(`- ${product.name} (${product.category}) - $${product.price}`);
    });
  }

  parts.push(`\nProvide helpful, accurate responses based on this context. Be concise but informative.`);

  return parts.join('\n');
}

/**
 * Build system message with context
 */
export async function buildSystemMessageWithContext(
  pageContext: PageContext,
  baseSystemMessage?: string
): Promise<AIChatMessage> {
  const aggregated = await aggregateContext(pageContext);
  const contextText = formatContextForAI(aggregated, pageContext.type);

  const systemMessage = baseSystemMessage
    ? `${baseSystemMessage}\n\n${contextText}`
    : contextText;

  return {
    role: 'system',
    content: systemMessage,
  };
}
