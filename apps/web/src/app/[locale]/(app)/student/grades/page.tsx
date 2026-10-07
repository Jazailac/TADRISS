import {
  StudentGradesPage,
  type StudentGradesParams,
} from '@/components/grades/student-grades-page';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<StudentGradesParams>;
}) {
  return <StudentGradesPage params={await searchParams} />;
}
