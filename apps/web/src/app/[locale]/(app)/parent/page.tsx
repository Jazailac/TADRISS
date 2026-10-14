import { ParentHome } from '@/components/home/parent-home';

export default async function Home({ searchParams }: { searchParams: Promise<{ child?: string }> }) {
  return <ParentHome childParam={(await searchParams).child} />;
}
