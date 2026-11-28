import type { Metadata } from "next";
import { AuthTitle } from "@/components/auth/AuthTitle";
import { LoginLinkForm } from "@/components/auth/forms/LoginLinkForm";
import { tx, localized } from "@/i18n/tx";

export const metadata: Metadata = localized({ title: "Entrar con el enlace del correo" });

// Destino del enlace del correo (#28, RC-63): PORTAL_URL/login/enlace#t=<token>.
export default function LoginLinkPage() {
  return (
    <div className="space-y-6">
      <AuthTitle description={tx("Pulsa el botón para entrar. El enlace vence en 15 minutos y sirve una sola vez.")}>
        {tx("Entrar con el enlace del correo")}</AuthTitle>
      <LoginLinkForm />
    </div>
  );
}
