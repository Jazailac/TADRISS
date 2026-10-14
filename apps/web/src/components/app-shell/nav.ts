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
  ScrollText,
  Settings,
  Upload,
  UserRound,
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
      item('parents', '/dashboard/parents', UserRound, true),
      item('import', '/dashboard/import', Upload, true),
      item('classes', '/dashboard/classes', BookOpen, true),
      item('schedule', '/dashboard/schedule', Clock, true),
      item('settings', '/dashboard/settings', Settings, true),
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
      item('announcements', '/dashboard/announcements', Megaphone, true),
      item('messages', '/dashboard/messages', MessageSquare, true),
      item('documents', '/dashboard/documents', FolderOpen, true),
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
  {
    key: 'communication',
    items: [
      item('announcements', '/teacher/announcements', Megaphone, true),
      item('messages', '/teacher/messages', MessageSquare, true),
      item('documents', '/teacher/documents', FolderOpen, true),
    ],
  },
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
  {
    key: 'communication',
    items: [
      item('announcements', '/student/announcements', Megaphone, true),
      item('messages', '/student/messages', MessageSquare, true),
      item('documents', '/student/documents', FolderOpen, true),
    ],
  },
];

const parent: NavGroup[] = [
  { key: 'overview', items: [item('dashboard', '/parent', LayoutDashboard, true)] },
  {
    key: 'daily',
    items: [
      item('schedule', '/parent/schedule', Clock, true),
      item('homework', '/parent/homework', ClipboardList, true),
      item('attendance', '/parent/attendance', CalendarCheck, true),
      item('grades', '/parent/grades', BarChart3, true),
      item('payments', '/parent/payments', CreditCard, true),
    ],
  },
  {
    key: 'communication',
    items: [
      item('announcements', '/parent/announcements', Megaphone, true),
      item('messages', '/parent/messages', MessageSquare, true),
      item('documents', '/parent/documents', FolderOpen, true),
    ],
  },
];

const superAdmin: NavGroup[] = [
  { key: 'overview', items: [item('dashboard', '/admin', LayoutDashboard, true)] },
  {
    key: 'platform',
    items: [
      item('institutions', '/admin/institutions', Building2, true),
      item('audit', '/admin/audit', ScrollText, true),
    ],
  },
];

/** Nav sets by role. Passed across the server→client boundary by name only (icons are functions). */
export const navSets: Record<Role, NavGroup[]> = {
  institution_admin: admin,
  teacher,
  student,
  parent,
  super_admin: superAdmin,
};
export type NavSet = Role;

/**
 * The nav item a pathname belongs to: the MOST SPECIFIC prefix, so `/dashboard/classes/abc` is
 * "Classes" rather than "Dashboard" (which is also a prefix of it).
 */
export function matchNav<T extends { href: string }>(items: T[], pathname: string): T | undefined {
  return items
    .filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
}
