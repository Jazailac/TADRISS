import {
  BarChart3,
  BookOpen,
  CalendarCheck,
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

export type NavItem = { key: keyof Messages['shell']['nav']; href: string; icon: LucideIcon };
export type NavGroup = { key: keyof Messages['shell']['groups']; items: NavItem[] };

/** Admin navigation. Teacher/student variants arrive with their phases. */
export const adminNav: NavGroup[] = [
  {
    key: 'overview',
    items: [{ key: 'dashboard', href: '/dashboard', icon: LayoutDashboard }],
  },
  {
    key: 'school',
    items: [
      { key: 'students', href: '/dashboard/students', icon: Users },
      { key: 'teachers', href: '/dashboard/teachers', icon: GraduationCap },
      { key: 'classes', href: '/dashboard/classes', icon: BookOpen },
      { key: 'schedule', href: '/dashboard/schedule', icon: Clock },
    ],
  },
  {
    key: 'daily',
    items: [
      { key: 'attendance', href: '/dashboard/attendance', icon: CalendarCheck },
      { key: 'grades', href: '/dashboard/grades', icon: BarChart3 },
      { key: 'finance', href: '/dashboard/finance', icon: CreditCard },
    ],
  },
  {
    key: 'communication',
    items: [
      { key: 'announcements', href: '/dashboard/announcements', icon: Megaphone },
      { key: 'messages', href: '/dashboard/messages', icon: MessageSquare },
      { key: 'documents', href: '/dashboard/documents', icon: FolderOpen },
    ],
  },
];

export const settingsItem: NavItem = {
  key: 'settings',
  href: '/dashboard/settings',
  icon: Settings,
};

/** Nav sets by role. Passed across the server→client boundary by name only (icons are functions). */
export const navSets = { admin: adminNav } as const;
export type NavSet = keyof typeof navSets;
