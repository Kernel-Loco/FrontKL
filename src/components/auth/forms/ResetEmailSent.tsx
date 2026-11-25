"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Notice } from "@/components/auth/Notice";
import { Spinner } from "@/components/Spinner";
import { useFlowState } from "@/hooks/useFlowState";

function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return email;
  return `${user.slice(0, 2)}${"•".repeat(Math.max(user.length - 2, 1))}@${domain}`;
}

/** «Revisa tu correo» (RC-335): el texto de la API, el mismo exista o no la cuenta. No dice si el correo tiene cuenta.
 * Pedir otro enlace vuelve al formulario, porque cada pedido lleva su propio captcha. */
export function ResetEmailSent() {
  const router = useRouter();
  const { ready, data } = useFlowState("reset");

  useEffect(() => {
    if (ready && !data) router.replace("/forgot-password");
  }, [ready, data, router]);

  if (!ready || !data) {
    return (
      <div className="flex justify-center py-8" role="status" aria-label="Cargando">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600">
        Lo pediste para <strong className="font-semibold text-lt-ink">{maskEmail(data.email)}</strong>.
      </p>
      <Notice>{data.detail}</Notice>
      <p className="text-sm text-slate-600">Abre el enlace en este mismo navegador. Si pides otro, el anterior deja de servir.</p>
      <div className="space-y-3 text-center text-sm">
        <Link href="/forgot-password" className="block font-semibold text-lt-primary hover:underline">
          Pedir otro enlace
        </Link>
        <Link href="/login" className="block font-medium text-slate-500 hover:underline">
          Volver a iniciar sesión
        </Link>
      </div>
    </div>
  );
}
