import Link from "next/link";
import { AVISO_SIMPLIFICADO } from "@/config/legal";

/** Aviso simplificado de la sección 5.2 de la política, con su enlace al aviso integral (RC-271). */
export function AvisoSimplificado({ className, linkClassName }: { className?: string; linkClassName?: string }) {
  return (
    <p className={className}>
      {AVISO_SIMPLIFICADO.antes}
      <Link href="/privacidad" className={linkClassName}>
        {AVISO_SIMPLIFICADO.url}
      </Link>
      {AVISO_SIMPLIFICADO.despues}
    </p>
  );
}
