import type { SubjectColor } from '@tadriss/shared';

/** Subject colour tokens → design-system classes. Never raw colours (rule 13). */
export const subjectTone: Record<SubjectColor, string> = {
  primary: 'border-primary/30 bg-primary-soft text-primary',
  accent: 'border-accent/30 bg-accent-soft text-accent',
  info: 'border-info/30 bg-info-soft text-info',
  success: 'border-success/30 bg-success-soft text-success',
  warning: 'border-warning/30 bg-warning-soft text-warning',
};

/** Swatch for the colour picker (solid token fill). */
export const subjectSwatch: Record<SubjectColor, string> = {
  primary: 'bg-primary',
  accent: 'bg-accent',
  info: 'bg-info',
  success: 'bg-success',
  warning: 'bg-warning',
};
