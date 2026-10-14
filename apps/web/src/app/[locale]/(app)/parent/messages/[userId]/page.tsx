import { ThreadPage } from '@/components/communication/thread-page';

export default async function Page({ params }: { params: Promise<{ userId: string }> }) {
  return <ThreadPage area="parent" otherId={(await params).userId} />;
}
