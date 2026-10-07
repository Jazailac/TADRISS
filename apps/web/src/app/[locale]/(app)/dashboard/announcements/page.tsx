import {
  AnnouncementsPage,
  type AnnouncementsParams,
} from '@/components/communication/announcements-page';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<AnnouncementsParams>;
}) {
  return <AnnouncementsPage area="dashboard" params={await searchParams} />;
}
