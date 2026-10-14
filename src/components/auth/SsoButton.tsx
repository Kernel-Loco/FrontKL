"use client";

import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";

/** Inicio de sesión empresarial (SSO). Todavía no está disponible. */
export function SsoButton() {
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(timer);
  }, [notice]);

  return (
    <div>
      <button
        type="button"
        // TODO: conectar con backend — iniciar SSO (SAML/OIDC) en FastAPI.
        onClick={() => setNotice("El inicio de sesión empresarial (SSO) estará disponible próximamente.")}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-lt-line bg-lt-paper px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
      >
        <Building2 aria-hidden="true" className="h-4 w-4 text-slate-500" />
        Inicio de sesión único (SSO) · Empresas
      </button>
      <p aria-live="polite" className="mt-2 min-h-4 text-center text-xs text-slate-500">
        {notice}
      </p>
    </div>
  );
}
