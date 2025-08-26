import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ConfirmAccountPage() {
  const session = await auth();

  if (session?.user?.isConfirmed) {
    redirect("/shop");
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h1 className="text-2xl font-bold">Аккаунт не подтвержден</h1>
      <p>Ожидайте одобрения администратора.</p>
    </div>
  );
}
