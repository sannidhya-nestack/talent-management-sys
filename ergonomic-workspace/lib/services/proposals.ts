/**
 * Proposal Generation Service
 *
 * Provides AI-powered proposal generation with design rationale, product specifications, and pricing.
 */

import { chatCompletion } from './ai';
import { getLayoutById } from './layouts';
import { getClientById } from './clients';
import { getProducts } from './products';
import type { AIChatMessage } from './ai';
import type { FurnitureItem } from '@/components/interior-planning/designer';

export interface ProposalSection {
  title: string;
  content: string;
  order: number;
}

export interface ProposalProduct {
  productId: string;
  productName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  specifications?: Record<string, unknown>;
}

export interface Proposal {
  id: string;
  layoutId: string;
  clientId: string;
  version: number;
  sections: ProposalSection[];
  products: ProposalProduct[];
  pricing: {
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
    currency: string;
  };
  timeline: {
    phases: Array<{ name: string; duration: string; description: string }>;
    totalDuration: string;
  };
  termsAndConditions: string;
  status: 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'REVISED';
  createdAt: Date;
  updatedAt: Date;
}

export interface GenerateProposalOptions {
  layoutId: string;
  includeCustomSections?: boolean;
  pricingTier?: 'BASIC' | 'STANDARD' | 'PREMIUM';
  userId?: string;
}

/**
 * Generate proposal using AI
 */
export async function generateProposal(
  options: GenerateProposalOptions
): Promise<Omit<Proposal, 'id' | 'createdAt' | 'updatedAt' | 'status'>> {
  const { layoutId, includeCustomSections = false, pricingTier = 'STANDARD', userId } = options;

  // Get layout
  const layout = await getLayoutById(layoutId);
  if (!layout) {
    throw new Error('Layout not found');
  }

  // Get client
  const client = await getClientById(layout.clientId);
  if (!client) {
    throw new Error('Client not found');
  }

  // Get furniture items from layout
  const furnitureItems: FurnitureItem[] =
    (layout.layoutData && typeof layout.layoutData === 'object' && 'furniture' in layout.layoutData
      ? (layout.layoutData.furniture as FurnitureItem[])
      : []) || [];

  // Get products
  const products = await getProducts({ limit: 200, activeOnly: true });

  // Build product list with quantities
  const proposalProducts: ProposalProduct[] = furnitureItems.map((item) => {
    const product = products.products.find((p) => p.id === item.productId);
    return {
      productId: item.productId,
      productName: item.productName,
      category: item.category,
      quantity: 1, // Could be enhanced to count duplicates
      unitPrice: item.price,
      totalPrice: item.price,
      specifications: product?.specifications as Record<string, unknown> | undefined,
    };
  });

  // Calculate pricing
  const subtotal = proposalProducts.reduce((sum, p) => sum + p.totalPrice, 0);
  const tax = subtotal * 0.08; // 8% tax (configurable)
  const discount = pricingTier === 'PREMIUM' ? subtotal * 0.1 : pricingTier === 'STANDARD' ? subtotal * 0.05 : 0;
  const total = subtotal + tax - discount;

  // Build prompt for proposal generation
  const prompt = `Generate a professional workspace design proposal.

Client: ${client.companyName}
Industry: ${client.industry || 'Not specified'}
Layout: ${layout.name}
Description: ${layout.description || 'No description'}

Products Included:
${proposalProducts.map((p) => `- ${p.productName} (${p.category}): $${p.unitPrice.toLocaleString()} x ${p.quantity}`).join('\n')}

Pricing:
- Subtotal: $${subtotal.toLocaleString()}
- Tax: $${tax.toLocaleString()}
- Discount: $${discount.toLocaleString()}
- Total: $${total.toLocaleString()}

Generate a comprehensive proposal with the following sections:
1. Executive Summary (2-3 paragraphs highlighting key benefits)
2. Design Rationale (explain the design approach and why it fits the client's needs)
3. Space Analysis (analyze the space utilization and efficiency)
4. Product Specifications (detailed specifications for key products)
5. Detailed Pricing (itemized pricing breakdown)
6. Installation Timeline (phases with durations and descriptions)
7. Project Phases (breakdown of implementation phases)
8. Terms and Conditions (standard terms for the project)

${includeCustomSections ? 'Include additional custom sections as appropriate.' : ''}

Respond in JSON format:
{
  "sections": [
    {
      "title": "Section Title",
      "content": "Section content...",
      "order": 1
    }
  ],
  "timeline": {
    "phases": [
      {
        "name": "Phase Name",
        "duration": "2 weeks",
        "description": "Phase description"
      }
    ],
    "totalDuration": "6 weeks"
  },
  "termsAndConditions": "Terms and conditions text..."
}`;

  const messages: AIChatMessage[] = [
    {
      role: 'system',
      content:
        'You are an expert in workspace design and proposal writing. Generate professional, comprehensive proposals that clearly communicate value and build client confidence.',
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
        type: 'proposal',
        layoutId,
        clientId: client.id,
        clientName: client.companyName,
      },
    });

    // Parse JSON response
    let proposalData: {
      sections: ProposalSection[];
      timeline: Proposal['timeline'];
      termsAndConditions: string;
    };
    try {
      const jsonMatch = response.response.match(/```json\n([\s\S]*?)\n```/) || response.response.match(/```\n([\s\S]*?)\n```/);
      const jsonString = jsonMatch ? jsonMatch[1] : response.response;
      proposalData = JSON.parse(jsonString);
    } catch (parseError) {
      // Fallback: create basic proposal
      proposalData = {
        sections: [
          {
            title: 'Executive Summary',
            content: response.response.substring(0, 500),
            order: 1,
          },
        ],
        timeline: {
          phases: [
            {
              name: 'Design & Planning',
              duration: '2 weeks',
              description: 'Finalize design and prepare for installation',
            },
            {
              name: 'Installation',
              duration: '2 weeks',
              description: 'Install furniture and equipment',
            },
            {
              name: 'Final Inspection',
              duration: '1 week',
              description: 'Quality check and client walkthrough',
            },
          ],
          totalDuration: '5 weeks',
        },
        termsAndConditions: 'Standard terms and conditions apply.',
      };
    }

    return {
      layoutId,
      clientId: client.id,
      version: 1,
      sections: proposalData.sections,
      products: proposalProducts,
      pricing: {
        subtotal,
        tax,
        discount,
        total,
        currency: 'USD',
      },
      timeline: proposalData.timeline,
      termsAndConditions: proposalData.termsAndConditions,
    };
  } catch (error) {
    console.error('Error generating proposal:', error);
    throw new Error(`Failed to generate proposal: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
