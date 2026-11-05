import { RollCallPage } from '@/components/attendance/roll-call-page';

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slotId: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const [{ slotId }, { date }] = await Promise.all([params, searchParams]);
  return <RollCallPage area="admin" slotId={slotId} date={date} />;
}
