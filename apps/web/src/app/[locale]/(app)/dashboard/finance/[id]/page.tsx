import { InvoiceDetailPage } from '@/components/finance/invoice-detail-page';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <InvoiceDetailPage id={(await params).id} />;
}
