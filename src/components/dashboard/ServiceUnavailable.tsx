"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { SectionError } from "./SectionError";

/**
 * La API no respondió al validar la sesión (#108, RC-225). El menú queda visible y Reintentar vuelve a
 * pedir toda la ruta, layout incluido, para que al volver la API el menú tome el rol y el nombre.
 */
export function ServiceUnavailable({ message }: { message: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  return <SectionError error={null} message={message} section="el panel" retry={() => startTransition(() => router.refresh())} />;
}
