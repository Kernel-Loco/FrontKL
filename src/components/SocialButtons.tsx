"use client";

import { useEffect, useState } from "react";
import { FacebookIcon, GoogleIcon, XIcon } from "./auth/icons/BrandIcons";

const PROVIDERS = [
  { id: "google", name: "Google", Icon: GoogleIcon, iconClass: "h-7 w-7" },
  { id: "facebook", name: "Facebook", Icon: FacebookIcon, iconClass: "h-8 w-8" },
  { id: "x", name: "X", Icon: XIcon, iconClass: "h-8 w-8" },
] as const;

export function SocialButtons() {
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(timer);
  }, [notice]);

  return (
    <div>
      <div className="flex justify-center gap-6">
        {PROVIDERS.map(({ id, name, Icon, iconClass }) => (
          <button
            key={id}
            type="button"
            aria-label={`Continuar con ${name}`}
            // TODO: conectar con backend — iniciar OAuth/OIDC en FastAPI (GET /auth/oauth/{provider}).
            onClick={() => setNotice(`Inicio de sesión con ${name}: próximamente.`)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-md transition-transform hover:scale-105"
          >
            <Icon className={iconClass} />
          </button>
        ))}
      </div>
      <p aria-live="polite" className="mt-3 min-h-5 text-center text-sm text-white/90">
        {notice}
      </p>
    </div>
  );
}
