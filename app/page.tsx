// import { SignOut } from "@/components/sign-out";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();

  if (!session) {
    redirect("/sign-in");
  }

  if (session.user.role === "admin") {
    redirect("/dashboard");
  } else {
    redirect("/shop");
  }
}
