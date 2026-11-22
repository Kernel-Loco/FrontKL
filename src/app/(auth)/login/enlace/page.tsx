import type { Metadata } from "next";
import { AuthTitle } from "@/components/auth/AuthTitle";
import { LoginLinkForm } from "@/components/auth/forms/LoginLinkForm";

export const metadata: Metadata = { title: "Entrar con el enlace del correo" };

// Destino del enlace del correo (#28, RC-63): PORTAL_URL/login/enlace#t=<token>.
export default function LoginLinkPage() {
  return (
    <div className="space-y-6">
      <AuthTitle description="Pulsa el botón para entrar. El enlace vence en 15 minutos y sirve una sola vez.">
        Entrar con el enlace del correo
      </AuthTitle>
      <LoginLinkForm />
    </div>
  );
}
