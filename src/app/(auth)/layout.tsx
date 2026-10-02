import { AuthBackground } from "@/components/auth/AuthBackground";
import { Logo } from "@/components/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-cirdan-950 text-white [--focus-ring:#fff]">
      <AuthBackground />
      <main className="relative z-10 flex min-h-dvh items-center justify-center px-4 py-10">
        <div className="w-full max-w-[420px]">
          <div className="mb-5 flex justify-center">
            <Logo />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
