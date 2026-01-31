/**
 * Default Assessment Templates Configuration
 *
 * Predefined assessment templates that can be created via admin UI
 * or imported programmatically.
 */

import type { AssessmentQuestionInput } from '@/types/assessment';

export interface DefaultAssessmentTemplate {
  id: string;
  name: string;
  slug: string;
  description: string;
  type: 'GENERAL_COMPETENCIES' | 'SPECIALIZED_COMPETENCIES';
  position?: string;
  passingScore: number;
  timeLimit?: number;
  headerText?: string;
  footerText?: string;
  questions: AssessmentQuestionInput[];
}

/**
 * Default General Competencies Assessment Template
 *
 * Evaluates core professional competencies applicable to all roles.
 */
export const defaultGCTemplate: DefaultAssessmentTemplate = {
  id: 'default-gc-template',
  name: 'General Competencies Assessment',
  slug: 'general-competencies',
  description: 'Evaluates core professional competencies including communication, problem-solving, teamwork, and adaptability.',
  type: 'GENERAL_COMPETENCIES',
  passingScore: 70,
  timeLimit: 30,
  headerText: 'Please answer all questions honestly. There are no right or wrong answers - we want to understand your work style and competencies.',
  footerText: 'Thank you for completing this assessment. Your responses will be reviewed by our hiring team.',
  questions: [
    // Communication Skills (20 points)
    {
      order: 1,
      type: 'MULTIPLE_CHOICE',
      text: 'When explaining a complex concept to someone unfamiliar with the topic, which approach do you find most effective?',
      helpText: 'Consider your typical communication style.',
      required: true,
      points: 10,
      section: 'Communication Skills',
      options: [
        { id: 'comm1-a', text: 'Use technical jargon to demonstrate expertise', points: 2 },
        { id: 'comm1-b', text: 'Break it down into simple terms with examples', points: 10 },
        { id: 'comm1-c', text: 'Provide detailed written documentation', points: 6 },
        { id: 'comm1-d', text: 'Let them figure it out on their own', points: 0 },
      ],
    },
    {
      order: 2,
      type: 'LIKERT_SCALE',
      text: 'I actively listen to others and ask clarifying questions before responding.',
      required: true,
      points: 10,
      section: 'Communication Skills',
      options: {
        minLabel: 'Strongly Disagree',
        maxLabel: 'Strongly Agree',
        pointsMapping: [0, 2, 5, 8, 10],
      },
    },

    // Problem Solving (20 points)
    {
      order: 3,
      type: 'MULTIPLE_CHOICE',
      text: 'When faced with a problem you have never encountered before, what is your first step?',
      required: true,
      points: 10,
      section: 'Problem Solving',
      options: [
        { id: 'prob1-a', text: 'Research and gather information about the problem', points: 10 },
        { id: 'prob1-b', text: 'Ask someone else to solve it', points: 2 },
        { id: 'prob1-c', text: 'Ignore it and hope it resolves itself', points: 0 },
        { id: 'prob1-d', text: 'Jump straight into trying solutions', points: 5 },
      ],
    },
    {
      order: 4,
      type: 'LIKERT_SCALE',
      text: 'I approach problems systematically, breaking them down into smaller, manageable parts.',
      required: true,
      points: 10,
      section: 'Problem Solving',
      options: {
        minLabel: 'Strongly Disagree',
        maxLabel: 'Strongly Agree',
        pointsMapping: [0, 2, 5, 8, 10],
      },
    },

    // Teamwork (20 points)
    {
      order: 5,
      type: 'MULTIPLE_CHOICE',
      text: 'In a team project, a colleague disagrees strongly with your approach. How do you handle it?',
      required: true,
      points: 10,
      section: 'Teamwork',
      options: [
        { id: 'team1-a', text: 'Insist on your approach since you know it is better', points: 2 },
        { id: 'team1-b', text: 'Listen to their perspective and find common ground', points: 10 },
        { id: 'team1-c', text: 'Let them have their way to avoid conflict', points: 4 },
        { id: 'team1-d', text: 'Escalate to management immediately', points: 1 },
      ],
    },
    {
      order: 6,
      type: 'LIKERT_SCALE',
      text: 'I regularly offer help to team members even when not asked.',
      required: true,
      points: 10,
      section: 'Teamwork',
      options: {
        minLabel: 'Strongly Disagree',
        maxLabel: 'Strongly Agree',
        pointsMapping: [0, 2, 5, 8, 10],
      },
    },

    // Adaptability (20 points)
    {
      order: 7,
      type: 'MULTIPLE_CHOICE',
      text: 'Your project requirements change significantly midway through. How do you react?',
      required: true,
      points: 10,
      section: 'Adaptability',
      options: [
        { id: 'adapt1-a', text: 'Refuse to accept the changes', points: 0 },
        { id: 'adapt1-b', text: 'Complain but eventually comply', points: 3 },
        { id: 'adapt1-c', text: 'Assess impact, adjust plan, and communicate with stakeholders', points: 10 },
        { id: 'adapt1-d', text: 'Start over from scratch without evaluation', points: 2 },
      ],
    },
    {
      order: 8,
      type: 'LIKERT_SCALE',
      text: 'I embrace learning new tools and technologies, even outside my comfort zone.',
      required: true,
      points: 10,
      section: 'Adaptability',
      options: {
        minLabel: 'Strongly Disagree',
        maxLabel: 'Strongly Agree',
        pointsMapping: [0, 2, 5, 8, 10],
      },
    },

    // Work Ethic (20 points)
    {
      order: 9,
      type: 'MULTIPLE_CHOICE',
      text: 'When you make a mistake at work, what do you typically do?',
      required: true,
      points: 10,
      section: 'Work Ethic',
      options: [
        { id: 'ethic1-a', text: 'Hide it and hope nobody notices', points: 0 },
        { id: 'ethic1-b', text: 'Blame external factors or others', points: 1 },
        { id: 'ethic1-c', text: 'Acknowledge it, fix it, and learn from it', points: 10 },
        { id: 'ethic1-d', text: 'Wait for someone else to point it out', points: 2 },
      ],
    },
    {
      order: 10,
      type: 'LIKERT_SCALE',
      text: 'I consistently meet deadlines and deliver quality work.',
      required: true,
      points: 10,
      section: 'Work Ethic',
      options: {
        minLabel: 'Strongly Disagree',
        maxLabel: 'Strongly Agree',
        pointsMapping: [0, 2, 5, 8, 10],
      },
    },
  ],
};

/**
 * All default assessment templates
 */
export const defaultAssessmentTemplates: DefaultAssessmentTemplate[] = [
  defaultGCTemplate,
];

/**
 * Get a default template by ID
 */
export function getDefaultTemplate(id: string): DefaultAssessmentTemplate | undefined {
  return defaultAssessmentTemplates.find((t) => t.id === id);
}
