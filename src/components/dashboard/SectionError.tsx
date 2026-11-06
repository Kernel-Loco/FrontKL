"use client";

import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { messageForStatus, messageFromDigest } from "@/services/errors";

export interface SectionErrorProps {
  error: unknown;
  retry: () => void;
  /** Nombre de la sección, para el título. */
  section?: string;
}

/**
 * Mensaje para el usuario. Next oculta el texto de los errores del servidor en producción
 * (solo llega `digest`), así que solo se usa el de un ServiceError que sí lo traiga.
 */
function messageFor(error: unknown) {
  const fromDigest = messageFromDigest(error);
  if (fromDigest) return fromDigest;
  if (error instanceof Error && error.name === "ServiceError" && !error.message.startsWith("An error occurred in the Server Components render")) {
    return error.message;
  }
  return messageForStatus(503) ?? "";
}

/** Falla de una sección del panel: el menú lateral sigue visible porque el layout no se cae. */
export function SectionError({ error, retry, section }: SectionErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="mx-auto mt-8 max-w-lg rounded-xl border border-lt-border bg-lt-surface p-8 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-lt-amber/10">
        <TriangleAlert aria-hidden="true" className="h-7 w-7 text-lt-amber" />
      </div>
      <h1 className="text-xl font-bold text-lt-text">{section ? `No pudimos cargar ${section}` : "Algo salió mal"}</h1>
      <p className="mt-2 text-sm text-lt-muted">{messageFor(error)}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className="inline-flex items-center rounded-lg bg-gradient-to-r from-lt-indigo to-lt-teal px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
        >
          Reintentar
        </button>
        <Link href="/dashboard" className="text-sm font-medium text-lt-muted underline underline-offset-2 hover:text-lt-text">
          Ir al dashboard
        </Link>
      </div>
    </div>
  );
}
