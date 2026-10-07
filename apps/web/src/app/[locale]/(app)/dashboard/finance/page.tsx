import { AdminFinancePage, type AdminFinanceParams } from '@/components/finance/admin-finance-page';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<AdminFinanceParams>;
}) {
  return <AdminFinancePage params={await searchParams} />;
}
