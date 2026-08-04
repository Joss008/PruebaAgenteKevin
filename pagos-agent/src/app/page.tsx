import { redirect } from "next/navigation";
import { auth } from "@/services/auth.service";

export default async function Home() {
  const session = await auth();
  redirect(session ? "/dashboard" : "/login");
}
