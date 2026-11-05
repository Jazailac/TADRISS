import { AuditPage, type AuditParams } from '@/components/platform/audit-page';

export default async function Page({ searchParams }: { searchParams: Promise<AuditParams> }) {
  return <AuditPage params={await searchParams} />;
}
