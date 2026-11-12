import { ExternalLink, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";

const HIBP_DASHBOARD = "https://haveibeenpwned.com/Dashboard";
const HIBP_VERIFICATION_HELP = "https://support.haveibeenpwned.com/hc/en-au/articles/15543011690767-How-do-I-verify-my-domain";

/** Guía para que el socio verifique su dominio en HIBP, requisito de la búsqueda de fugas por dominio. */
export function HibpVerificationGuide() {
  return (
    <Card title="Cómo verificar el dominio en HIBP" icon={<ShieldCheck aria-hidden="true" className="h-4 w-4" />}>
      <p className="text-sm text-lt-muted">
        Para buscar fugas de datos, Have I Been Pwned (HIBP) pide demostrar que controlas el dominio. Haz esta verificación en HIBP: es independiente del
        registro TXT que solicita LowTide. Cada dominio se verifica por separado; verificar el dominio raíz no incluye sus subdominios.
      </p>
      <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-lt-text marker:text-lt-muted">
        <li>
          Entra a{" "}
          <a href={HIBP_DASHBOARD} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-lt-indigo-soft underline underline-offset-2">
            el panel de HIBP <ExternalLink aria-hidden="true" className="h-3 w-3" />
          </a>{" "}
          e inicia sesión con un correo de la organización.
        </li>
        <li>Agrega el dominio en la sección de búsqueda por dominio (Domain search).</li>
        <li>
          Elige uno de los métodos que ofrece HIBP para comprobar que controlas el dominio, como un correo a una dirección del dominio, una etiqueta
          meta, un archivo en la raíz del sitio o un registro TXT en el DNS.
        </li>
        <li>Completa la verificación y espera la confirmación de HIBP; los cambios DNS pueden tardar hasta 48 horas en propagarse.</li>
      </ol>
      <p className="mt-4 text-xs text-lt-muted">
        Consulta los pasos vigentes en la{" "}
        <a href={HIBP_VERIFICATION_HELP} target="_blank" rel="noopener noreferrer" className="text-lt-indigo-soft underline underline-offset-2">
          guía oficial de verificación de HIBP
        </a>
        .
      </p>
    </Card>
  );
}
