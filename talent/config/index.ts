/**
 * Configuration Index
 *
 * Re-exports all configuration modules for convenient importing.
 * Usage: import { branding, strings, recruitment } from '@/config';
 */

export { branding } from './branding';
export { strings } from './strings';
export { recruitment, formatScoreDisplay } from './recruitment';
export {
  formTemplates,
  standardApplicationTemplate,
  minimalApplicationTemplate,
  extendedApplicationTemplate,
  getTemplateById,
  getDefaultTemplate,
  fieldTypeLabels,
  fieldTypeIcons,
  generateSlug,
  isValidSlug,
} from './form-templates';
export {
  defaultAssessmentTemplates,
  defaultGCTemplate,
  getDefaultTemplate as getDefaultAssessmentTemplate,
} from './assessment-templates';

export type { Branding } from './branding';
export type { Strings } from './strings';
export type { Recruitment, Stage, Position } from './recruitment';
export type { DefaultAssessmentTemplate } from './assessment-templates';