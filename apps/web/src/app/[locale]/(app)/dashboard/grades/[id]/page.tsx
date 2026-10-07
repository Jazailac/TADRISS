import { ExamDetailPage } from '@/components/grades/exam-detail-page';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <ExamDetailPage id={(await params).id} area="admin" />;
}
