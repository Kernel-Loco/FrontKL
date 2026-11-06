import { ExternalLink, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";

const HIBP_DASHBOARD = "https://haveibeenpwned.com/Dashboard";

/** Guía para que el socio verifique su dominio en HIBP, requisito de la búsqueda de fugas por dominio. */
export function HibpVerificationGuide() {
  return (
    <Card title="Cómo verificar el dominio en HIBP" icon={<ShieldCheck aria-hidden="true" className="h-4 w-4" />}>
      <p className="text-sm text-lt-muted">
        Para ver las fugas de datos de un dominio, Have I Been Pwned (HIBP) pide demostrar que el dominio es de quien lo consulta. Esta verificación es aparte
        del registro TXT de Lowtide y se hace en el sitio de HIBP.
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
        <li>Cuando HIBP marque el dominio como verificado, ya se pueden consultar sus fugas.</li>
      </ol>
      <p className="mt-4 text-xs text-lt-muted">
        Los métodos disponibles y los planes de HIBP para dominios grandes pueden cambiar; revisa las instrucciones vigentes en su sitio.
      </p>
    </Card>
  );
}
