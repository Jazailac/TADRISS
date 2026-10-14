import { MyAttendancePage } from '@/components/attendance/my-attendance-page';
import { WithChild } from '@/components/parent/with-child';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ child?: string }>;
}) {
  const sp = await searchParams;
  return (
    <WithChild
      path="/parent/attendance"
      childParam={sp.child}
      render={(child) => <MyAttendancePage studentId={child.id} base="/parent" />}
    />
  );
}
