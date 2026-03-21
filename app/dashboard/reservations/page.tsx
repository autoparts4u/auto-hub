import { ReservationsTable } from '@/components/reservations/ReservationsTable';

export default function ReservationsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 md:pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Бронирования</h2>
      </div>
      <ReservationsTable />
    </div>
  );
}
