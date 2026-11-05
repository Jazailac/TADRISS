import { StudentFilePage } from '@/components/people/student-file-page';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <StudentFilePage id={(await params).id} />;
}
