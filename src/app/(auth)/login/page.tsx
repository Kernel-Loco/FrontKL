import type { Metadata } from "next";
import { AuthTitle } from "@/components/auth/AuthTitle";
import { LoginForm } from "@/components/auth/forms/LoginForm";
import { Notice } from "@/components/auth/Notice";
import { SsoButton } from "@/components/auth/SsoButton";
import { Divider } from "@/components/Divider";
import { tx, localized } from "@/i18n/tx";

export const metadata: Metadata = localized({ title: "Iniciar sesión" });

const NOTICES: Record<string, string> = localized({
  expired: "Tu sesión expiró por inactividad. Vuelve a iniciar sesión.",
  max: "Tu sesión llegó a su duración máxima de 8 horas. Vuelve a iniciar sesión.",
  ended: "Tu sesión ya no es válida: venció por inactividad, llegó a su máximo de 8 horas o se cerró en otro lado. Vuelve a iniciar sesión.",
  registered: "Cuenta creada con rol Analista. Ya puedes iniciar sesión.",
  reset: "Tu contraseña se actualizó y se cerraron todas tus sesiones. Inicia sesión con la nueva.",
  reset_passkeys: "Tu contraseña se actualizó, se cerraron todas tus sesiones y se borraron tus passkeys. Inicia sesión con la nueva y vuelve a registrarlas desde tu perfil.",
  logout: "Cerraste sesión correctamente.",
});

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ notice?: string | string[] }> }) {
  const { notice } = await searchParams;
  const message = typeof notice === "string" ? NOTICES[notice] : undefined;

  return (
    <div className="space-y-6">
      <AuthTitle eyebrow={tx("Acceso seguro")} description={tx("Ingresa tus credenciales para entrar a tu espacio de trabajo.")}>
        {tx("Iniciar sesión")}</AuthTitle>
      {message && <Notice>{message}</Notice>}
      <LoginForm />
      <Divider label={tx("o inicia sesión con")} />
      <SsoButton />
    </div>
  );
}
