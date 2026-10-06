import type { Role } from '@tadriss/shared';
import {
  BarChart3,
  BookOpen,
  Building2,
  CalendarCheck,
  ClipboardList,
  Clock,
  CreditCard,
  FolderOpen,
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { Messages } from '@/i18n/messages';

export type NavItem = {
  key: keyof Messages['shell']['nav'];
  href: string;
  icon: LucideIcon;
  /** false = module not built yet: rendered disabled with a "soon" pill, never a dead link. */
  available: boolean;
};
export type NavGroup = { key: keyof Messages['shell']['groups']; items: NavItem[] };

const item = (key: NavItem['key'], href: string, icon: LucideIcon, available = false): NavItem => ({
  key,
  href,
  icon,
  available,
});

const admin: NavGroup[] = [
  { key: 'overview', items: [item('dashboard', '/dashboard', LayoutDashboard, true)] },
  {
    key: 'school',
    items: [
      item('students', '/dashboard/students', Users),
      item('teachers', '/dashboard/teachers', GraduationCap),
      item('classes', '/dashboard/classes', BookOpen),
      item('schedule', '/dashboard/schedule', Clock),
    ],
  },
  {
    key: 'daily',
    items: [
      item('attendance', '/dashboard/attendance', CalendarCheck),
      item('grades', '/dashboard/grades', BarChart3),
      item('finance', '/dashboard/finance', CreditCard),
    ],
  },
  {
    key: 'communication',
    items: [
      item('announcements', '/dashboard/announcements', Megaphone),
      item('messages', '/dashboard/messages', MessageSquare),
      item('documents', '/dashboard/documents', FolderOpen),
    ],
  },
];

const teacher: NavGroup[] = [
  { key: 'overview', items: [item('dashboard', '/teacher', LayoutDashboard, true)] },
  {
    key: 'daily',
    items: [
      item('classes', '/teacher/classes', BookOpen),
      item('schedule', '/teacher/schedule', Clock),
      item('attendance', '/teacher/attendance', CalendarCheck),
      item('homework', '/teacher/homework', ClipboardList),
      item('grades', '/teacher/grades', BarChart3),
    ],
  },
  { key: 'communication', items: [item('messages', '/teacher/messages', MessageSquare)] },
];

const student: NavGroup[] = [
  { key: 'overview', items: [item('dashboard', '/student', LayoutDashboard, true)] },
  {
    key: 'daily',
    items: [
      item('schedule', '/student/schedule', Clock),
      item('homework', '/student/homework', ClipboardList),
      item('attendance', '/student/attendance', CalendarCheck),
      item('grades', '/student/grades', BarChart3),
      item('payments', '/student/payments', CreditCard),
    ],
  },
  { key: 'communication', items: [item('messages', '/student/messages', MessageSquare)] },
];

const superAdmin: NavGroup[] = [
  { key: 'overview', items: [item('dashboard', '/admin', LayoutDashboard, true)] },
  { key: 'platform', items: [item('institutions', '/admin/institutions', Building2)] },
];

/** Nav sets by role. Passed across the server→client boundary by name only (icons are functions). */
export const navSets: Record<Role, NavGroup[]> = {
  institution_admin: admin,
  teacher,
  student,
  super_admin: superAdmin,
};
export type NavSet = Role;

export const settingsItem: NavItem = item('settings', '/dashboard/settings', Settings);
