import { StudentPaymentsPage } from '@/components/finance/student-payments-page';
import { WithChild } from '@/components/parent/with-child';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ child?: string }>;
}) {
  const sp = await searchParams;
  return (
    <WithChild
      path="/parent/payments"
      childParam={sp.child}
      render={(child) => <StudentPaymentsPage studentId={child.id} base="/parent" />}
    />
  );
}
