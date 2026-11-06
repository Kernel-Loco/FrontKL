import Link from "next/link";

export const metadata = { title: "Página no encontrada" };

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center bg-lt-bg px-6 text-center text-lt-text">
      <p className="text-sm font-semibold text-lt-indigo-soft">Error 404</p>
      <h1 className="mt-1 text-2xl font-bold">Página no encontrada</h1>
      <p className="mt-2 text-sm text-lt-muted">La página que buscas no existe o ya no está disponible.</p>
      <Link
        href="/dashboard"
        className="mt-6 inline-flex items-center rounded-lg bg-gradient-to-r from-lt-indigo to-lt-teal px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
      >
        Ir al dashboard
      </Link>
    </main>
  );
}
