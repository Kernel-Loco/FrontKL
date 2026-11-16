"use client";

import { useEffect, useRef, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SectionError } from "./SectionError";

/**
 * La API no respondió al validar la sesión (#108, RC-225). El menú queda visible y Reintentar vuelve a
 * pedir toda la ruta, layout incluido, para que al volver la API el menú tome el rol y el nombre.
 * Al navegar desde el menú Next no vuelve a correr el layout compartido, y este no pinta children: sin el
 * refresh la URL cambiaba pero seguía este aviso aunque la API ya hubiera vuelto (revisión del 15 nov, #2).
 */
export function ServiceUnavailable({ message }: { message: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const shownAt = useRef(pathname);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (pathname === shownAt.current) return;
    shownAt.current = pathname;
    startTransition(() => router.refresh());
  }, [pathname, router]);

  return <SectionError error={null} message={message} section="el panel" retry={() => startTransition(() => router.refresh())} />;
}
