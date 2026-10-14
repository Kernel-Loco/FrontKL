import type { Metadata } from "next";
import { AuthTitle } from "@/components/auth/AuthTitle";
import { LoginForm } from "@/components/auth/forms/LoginForm";
import { Notice } from "@/components/auth/Notice";
import { SsoButton } from "@/components/auth/SsoButton";
import { Divider } from "@/components/Divider";

export const metadata: Metadata = { title: "Iniciar sesión" };

const NOTICES: Record<string, string> = {
  expired: "Tu sesión expiró por inactividad. Vuelve a iniciar sesión.",
  registered: "Cuenta creada con rol Analista. Ya puedes iniciar sesión.",
  reset: "Tu contraseña se actualizó. Inicia sesión con la nueva.",
  logout: "Cerraste sesión correctamente.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ notice?: string | string[] }> }) {
  const { notice } = await searchParams;
  const message = typeof notice === "string" ? NOTICES[notice] : undefined;

  return (
    <div className="space-y-6">
      <AuthTitle eyebrow="Acceso seguro" description="Ingresa tus credenciales para entrar a tu espacio de trabajo.">
        Iniciar sesión
      </AuthTitle>
      {message && <Notice>{message}</Notice>}
      <LoginForm />
      <Divider label="o inicia sesión con" />
      <SsoButton />
    </div>
  );
}
