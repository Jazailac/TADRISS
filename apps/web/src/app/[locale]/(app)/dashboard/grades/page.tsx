import { AdminGradesPage, type AdminGradesParams } from '@/components/grades/admin-grades-page';

export default async function Page({ searchParams }: { searchParams: Promise<AdminGradesParams> }) {
  return <AdminGradesPage params={await searchParams} />;
}
