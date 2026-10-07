import { MySchedulePage } from '@/components/schedule/schedule-page';
import { getViewer } from '@/lib/viewer';

export default async function Page() {
  const viewer = await getViewer();
  return <MySchedulePage role="teacher" teacherId={viewer?.session.userId} />;
}
