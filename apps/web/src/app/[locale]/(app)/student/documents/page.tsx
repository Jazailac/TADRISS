import { DocumentsPage, type DocumentsParams } from '@/components/documents/documents-page';

export default async function Page({ searchParams }: { searchParams: Promise<DocumentsParams> }) {
  return <DocumentsPage area="student" params={await searchParams} />;
}
