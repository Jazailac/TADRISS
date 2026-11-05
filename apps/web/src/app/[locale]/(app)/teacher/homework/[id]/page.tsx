import { HomeworkDetailPage } from '@/components/homework/homework-detail-page';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <HomeworkDetailPage id={(await params).id} />;
}
