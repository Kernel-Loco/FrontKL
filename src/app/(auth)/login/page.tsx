import type { Metadata } from "next";
import Link from "next/link";
import { AuthPrompt } from "@/components/auth/AuthLinks";
import { AuthTitle } from "@/components/auth/AuthTitle";
import { LoginForm } from "@/components/auth/forms/LoginForm";
import { Notice } from "@/components/auth/Notice";
import { Divider } from "@/components/Divider";
import { SocialButtons } from "@/components/SocialButtons";

export const metadata: Metadata = { title: "Login" };

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
      <AuthTitle>Login</AuthTitle>
      {message && <Notice>{message}</Notice>}
      <LoginForm />
      <div className="space-y-4">
        <p className="text-center">
          <Link href="/forgot-password" className="rounded-sm text-sm text-white hover:underline">
            Forgot password?
          </Link>
        </p>
        <AuthPrompt text="don't have account?" linkText="Sign Up" href="/signup" />
      </div>
      <Divider />
      <SocialButtons />
    </div>
  );
}
