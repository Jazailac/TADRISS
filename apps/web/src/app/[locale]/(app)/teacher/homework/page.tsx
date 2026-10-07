import {
  TeacherHomeworkPage,
  type TeacherHomeworkParams,
} from '@/components/homework/teacher-homework-page';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<TeacherHomeworkParams>;
}) {
  return <TeacherHomeworkPage params={await searchParams} />;
}
