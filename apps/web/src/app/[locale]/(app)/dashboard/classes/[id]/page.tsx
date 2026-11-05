import { ClassDetail } from '@/components/classes/class-detail';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <ClassDetail id={(await params).id} area="admin" />;
}
