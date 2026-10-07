import { AnnouncementDetailPage } from '@/components/communication/announcement-detail-page';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <AnnouncementDetailPage area="student" id={(await params).id} />;
}
