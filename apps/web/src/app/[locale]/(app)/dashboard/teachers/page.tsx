import { PeoplePage, type PeopleSearchParams } from '@/components/people/people-page';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<PeopleSearchParams>;
}) {
  return <PeoplePage role="teacher" basePath="/dashboard/teachers" params={await searchParams} />;
}
