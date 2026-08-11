import { signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";
// import { Github } from "@/components/ui/github";

const GoogleSignIn = () => {
  return (
    <form
      action={async () => {
        "use server";
        // "/" сам разводит по ролям: админ → /dashboard/autoparts, клиент → /shop
        await signIn("google", { redirectTo: "/" });
      }}
    >
      <Button className="w-full" variant="outline">
         {/* <Github /> */}
        Продолжить с Google
      </Button>
    </form>
  );
};

export { GoogleSignIn };