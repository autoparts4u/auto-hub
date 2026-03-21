import { ActivityProvider } from "@/components/activity/ActivityProvider";
import { auth } from "@/lib/auth";
import { getOrCreateActivitySession } from "@/lib/activity/session";
import { headers } from "next/headers";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  // Логируем только обычных пользователей (не админов)
  if (!session?.user?.id || session.user.role !== "user") {
    return <>{children}</>;
  }

  const headersList = await headers();
  const userAgent = headersList.get("user-agent") ?? undefined;
  const ipAddress = (
    headersList.get("cf-connecting-ip") ??
    headersList.get("x-real-ip") ??
    headersList.get("x-forwarded-for")?.split(",")[0]
  )?.trim() ?? undefined;

  const sessionId = await getOrCreateActivitySession(
    session.user.id,
    userAgent,
    ipAddress
  );

  return (
    <ActivityProvider sessionId={sessionId}>
      {children}
    </ActivityProvider>
  );
}
