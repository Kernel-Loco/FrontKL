import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/session/server";

// proxy.ts ya redirige "/"; esto es un respaldo por si cambia su matcher.
export default async function Home() {
  const session = await getServerSession();
  redirect(session ? "/dashboard" : "/login");
}
