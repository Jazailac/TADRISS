import {
  TeacherGradesPage,
  type TeacherGradesParams,
} from '@/components/grades/teacher-grades-page';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<TeacherGradesParams>;
}) {
  return <TeacherGradesPage params={await searchParams} />;
}
