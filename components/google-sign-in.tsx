import { signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";
// import { Github } from "@/components/ui/github";

const GoogleSignIn = () => {
  return (
    <form
      action={async () => {
        "use server";
        await signIn("google");
      }}
    >
      <Button className="w-full" variant="outline">
         {/* <Github /> */}
        Continue with GitHub
      </Button>
    </form>
  );
};

export { GoogleSignIn };