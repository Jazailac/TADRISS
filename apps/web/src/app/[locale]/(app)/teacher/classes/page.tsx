import { ClassesPage, type ClassesSearchParams } from '@/components/classes/classes-page';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<ClassesSearchParams>;
}) {
  return <ClassesPage area="teacher" params={await searchParams} />;
}
