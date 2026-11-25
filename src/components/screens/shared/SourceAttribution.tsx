import { ExternalLink } from "lucide-react";
import type { Atribucion } from "@/lib/atribucion";

const LINK = "inline-flex items-center gap-1 text-lt-indigo-soft underline underline-offset-2";

/** «Fuente: Have I Been Pwned» con enlace a la fuente y a su licencia (RC-54). */
export function SourceAttribution({ atribucion, className = "" }: { atribucion: Atribucion; className?: string }) {
  return (
    <p className={`text-[11px] leading-relaxed text-lt-muted ${className}`}>
      <a href={atribucion.url} target="_blank" rel="noopener noreferrer" className={LINK}>
        {atribucion.text} <ExternalLink aria-hidden="true" className="h-3 w-3" />
      </a>
      {" "}·{" "}
      <a href={atribucion.licenseUrl} target="_blank" rel="noopener noreferrer license" className={LINK}>
        {atribucion.license}
      </a>
    </p>
  );
}
