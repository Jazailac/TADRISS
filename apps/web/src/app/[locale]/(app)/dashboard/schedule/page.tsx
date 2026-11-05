import { AdminSchedulePage, type SchedulePageParams } from '@/components/schedule/schedule-page';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SchedulePageParams>;
}) {
  return <AdminSchedulePage params={await searchParams} />;
}
