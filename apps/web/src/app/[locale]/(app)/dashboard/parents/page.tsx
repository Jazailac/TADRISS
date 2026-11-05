import { PeoplePage, type PeopleSearchParams } from '@/components/people/people-page';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<PeopleSearchParams>;
}) {
  return <PeoplePage role="parent" basePath="/dashboard/parents" params={await searchParams} />;
}
