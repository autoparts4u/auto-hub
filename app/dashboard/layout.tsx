import { Sidebar } from "@/components/layout/sidebar";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || session.user.role !== "admin") redirect("/shop");

  return (
    <div className="relative min-h-screen md:flex">
      <Sidebar />
      <main className="flex-1 p-4 md:p-6">
        <Breadcrumbs />
        {children}
      </main>
    </div>
  );
}