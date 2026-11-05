import type { AttendanceStatus } from '@tadriss/shared';
import { Check, Clock, FileCheck2, X, type LucideIcon } from 'lucide-react';
import type { Tone } from '../ui/badge';

export const statusMeta: Record<
  AttendanceStatus,
  { tone: Tone; icon: LucideIcon; selected: string; text: string }
> = {
  present: {
    tone: 'success',
    icon: Check,
    selected: 'bg-success-soft text-success ring-success/50',
    text: 'text-success',
  },
  late: {
    tone: 'warning',
    icon: Clock,
    selected: 'bg-warning-soft text-warning ring-warning/50',
    text: 'text-warning',
  },
  absent: {
    tone: 'danger',
    icon: X,
    selected: 'bg-danger-soft text-danger ring-danger/50',
    text: 'text-danger',
  },
  excused: {
    tone: 'info',
    icon: FileCheck2,
    selected: 'bg-info-soft text-info ring-info/50',
    text: 'text-info',
  },
};
