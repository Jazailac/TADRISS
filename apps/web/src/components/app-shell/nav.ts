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
      item('students', '/dashboard/students', Users, true),
      item('teachers', '/dashboard/teachers', GraduationCap, true),
      item('classes', '/dashboard/classes', BookOpen, true),
      item('schedule', '/dashboard/schedule', Clock, true),
    ],
  },
  {
    key: 'daily',
    items: [
      item('attendance', '/dashboard/attendance', CalendarCheck, true),
      item('grades', '/dashboard/grades', BarChart3, true),
      item('finance', '/dashboard/finance', CreditCard, true),
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
      item('classes', '/teacher/classes', BookOpen, true),
      item('schedule', '/teacher/schedule', Clock, true),
      item('attendance', '/teacher/attendance', CalendarCheck, true),
      item('homework', '/teacher/homework', ClipboardList, true),
      item('grades', '/teacher/grades', BarChart3, true),
    ],
  },
  { key: 'communication', items: [item('messages', '/teacher/messages', MessageSquare)] },
];

const student: NavGroup[] = [
  { key: 'overview', items: [item('dashboard', '/student', LayoutDashboard, true)] },
  {
    key: 'daily',
    items: [
      item('schedule', '/student/schedule', Clock, true),
      item('homework', '/student/homework', ClipboardList, true),
      item('attendance', '/student/attendance', CalendarCheck, true),
      item('grades', '/student/grades', BarChart3, true),
      item('payments', '/student/payments', CreditCard, true),
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

/**
 * The nav item a pathname belongs to: the MOST SPECIFIC prefix, so `/dashboard/classes/abc` is
 * "Classes" rather than "Dashboard" (which is also a prefix of it).
 */
export function matchNav<T extends { href: string }>(items: T[], pathname: string): T | undefined {
  return items
    .filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
}
