import { SignOut } from "@/components/sign-out";
import { auth } from "@/lib/auth";

const ShopPage = async () => {
   const session = await auth();

   console.log(session?.user)

  return <div><SignOut/></div>;
};

export default ShopPage;
