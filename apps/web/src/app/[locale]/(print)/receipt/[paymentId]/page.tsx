import { ReceiptPage } from '@/components/finance/receipt-page';

export default async function Page({ params }: { params: Promise<{ paymentId: string }> }) {
  return <ReceiptPage paymentId={(await params).paymentId} />;
}
