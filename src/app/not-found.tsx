import Link from "next/link";
import { tx, localized } from "@/i18n/tx";

export const metadata = localized({ title: "Página no encontrada" });

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center bg-lt-bg px-6 text-center text-lt-text">
      <p className="text-sm font-semibold text-lt-indigo-soft">{tx("Error 404")}</p>
      <h1 className="mt-1 text-2xl font-bold">{tx("Página no encontrada")}</h1>
      <p className="mt-2 text-sm text-lt-muted">{tx("La página que buscas no existe o ya no está disponible.")}</p>
      <Link
        href="/dashboard"
        className="mt-6 inline-flex items-center rounded-lg bg-lt-indigo px-4 py-2 text-sm font-semibold text-white hover:bg-lt-indigo/90"
      >
        {tx("Ir al dashboard")}</Link>
    </main>
  );
}
