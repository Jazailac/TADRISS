import { InstitutionsPage, type InstitutionsParams } from '@/components/platform/institutions-page';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<InstitutionsParams>;
}) {
  return <InstitutionsPage params={await searchParams} />;
}
