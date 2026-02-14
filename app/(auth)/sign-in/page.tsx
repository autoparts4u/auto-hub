import { auth } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";

import { signIn } from "@/lib/auth";
import { GoogleSignIn } from "@/components/google-sign-in";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { executeAction } from "@/lib/executeAction";

const Page = async () => {
  const session = await auth();
  if (session) redirect("/");

  return (
    <div className="min-h-screen flex justify-center pt-[15vh] px-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-bold text-center mb-6">Войти</h1>

        <GoogleSignIn />
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-background px-2 text-muted-foreground">
              Или продолжить с email
            </span>
          </div>
        </div>

        <form
          className="space-y-4"
          action={async (formData) => {
            "use server";
            await executeAction({
              actionFn: async () => {
                await signIn("credentials", formData);
              },
            });
          }}
        >
          <Input
            name="email"
            placeholder="Email"
            type="email"
            required
            autoComplete="email"
          />
          <Input
            className="hidden" // TODO
            name="phone"
            placeholder="Телефон"
            type="tel"
            // required
            autoComplete="tel"
          />
          <Input
            name="password"
            placeholder="Пароль"
            type="password"
            required
            autoComplete="current-password"
          />
          <Button className="w-full bg-green-500 hover:bg-green-400 cursor-pointer" type="submit">
            Войти
          </Button>
        </form>
        <Button asChild className="w-full bg-blue-500 text-white hover:bg-blue-400 hover:text-white cursor-pointer" variant="outline">
          <Link href="/sign-up">Нет аккаунта? Зарегистрироваться</Link>
        </Button>
      </div>
    </div>
  );
};

export default Page;
