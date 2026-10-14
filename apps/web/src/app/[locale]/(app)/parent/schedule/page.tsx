import { MySchedulePage } from '@/components/schedule/schedule-page';
import { WithChild } from '@/components/parent/with-child';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ child?: string }>;
}) {
  const sp = await searchParams;
  return (
    <WithChild
      path="/parent/schedule"
      childParam={sp.child}
      render={(child) => <MySchedulePage role="student" classId={child.classId} base="/parent" />}
    />
  );
}
