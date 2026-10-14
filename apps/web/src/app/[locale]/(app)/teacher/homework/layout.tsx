import type { ReactNode } from 'react';
import { ModuleGate } from '@/components/settings/module-gate';

export default function Layout({ children }: { children: ReactNode }) {
  return <ModuleGate module="homework">{children}</ModuleGate>;
}
