import { ReportCardPage } from '@/components/grades/report-card-page';

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ term?: string }>;
}) {
  const [{ studentId }, { term }] = await Promise.all([params, searchParams]);
  return <ReportCardPage studentId={studentId} term={term === '1' ? 1 : term === '2' ? 2 : null} />;
}
