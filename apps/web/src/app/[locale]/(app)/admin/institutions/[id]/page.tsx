import { InstitutionDetailPage } from '@/components/platform/institution-detail-page';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <InstitutionDetailPage id={(await params).id} />;
}
