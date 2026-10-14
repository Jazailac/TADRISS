import { StudentHomeworkPage } from '@/components/homework/student-homework-page';
import { WithChild } from '@/components/parent/with-child';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ child?: string }>;
}) {
  const sp = await searchParams;
  return (
    <WithChild
      path="/parent/homework"
      childParam={sp.child}
      render={(child) => (
        <StudentHomeworkPage
          studentId={child.id}
          classId={child.classId}
          hasClass={child.classId !== null}
          base="/parent"
        />
      )}
    />
  );
}
