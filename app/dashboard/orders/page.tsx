import { Suspense } from 'react';
import OrdersTable from '@/components/orders/OrdersTable';
import { Skeleton } from '@/components/ui/skeleton';

export default function OrdersPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 md:pt-6">
      <Suspense fallback={<OrdersTableSkeleton />}>
        <OrdersTable />
      </Suspense>
    </div>
  );
}

function OrdersTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="flex gap-4">
        <Skeleton className="flex-1 h-10" />
        <Skeleton className="w-[200px] h-10" />
        <Skeleton className="w-[200px] h-10" />
        <Skeleton className="w-10 h-10" />
      </div>
      <Skeleton className="h-[400px] w-full" />
      <div className="grid grid-cols-4 gap-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    </div>
  );
}