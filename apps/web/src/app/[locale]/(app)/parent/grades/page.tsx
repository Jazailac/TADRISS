import { StudentGradesPage } from '@/components/grades/student-grades-page';
import { WithChild } from '@/components/parent/with-child';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ child?: string; term?: string }>;
}) {
  const sp = await searchParams;
  return (
    <WithChild
      path="/parent/grades"
      childParam={sp.child}
      extraQuery={sp.term ? { term: sp.term } : {}}
      render={(child) => (
        <StudentGradesPage
          params={{ term: sp.term }}
          studentId={child.id}
          base="/parent"
          query={{ child: child.id }}
          hasClass={child.classId !== null}
        />
      )}
    />
  );
}
