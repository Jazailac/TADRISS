import {
  AttendanceDayPage,
  type AttendanceDayParams,
} from '@/components/attendance/attendance-day-page';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<AttendanceDayParams>;
}) {
  return <AttendanceDayPage area="teacher" params={await searchParams} />;
}
