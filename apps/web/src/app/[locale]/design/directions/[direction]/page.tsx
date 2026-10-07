import { notFound } from 'next/navigation';
import { DirectionGallery, type DirectionId } from '@/components/directions/direction-gallery';

const directionIds: DirectionId[] = ['a', 'b', 'c', 'd'];

export const dynamicParams = false;

export function generateStaticParams() {
  return directionIds.map((direction) => ({ direction }));
}

export default async function DirectionPage({
  params,
}: {
  params: Promise<{ direction: string }>;
}) {
  const { direction } = await params;

  if (process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV !== 'preview') {
    notFound();
  }

  if (!directionIds.includes(direction as DirectionId)) {
    notFound();
  }

  return <DirectionGallery direction={direction as DirectionId} />;
}
