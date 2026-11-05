import { DocumentsPage, type DocumentsParams } from '@/components/documents/documents-page';

export default async function Page({ searchParams }: { searchParams: Promise<DocumentsParams> }) {
  return <DocumentsPage area="parent" params={await searchParams} />;
}
