import { evaluatePassword, type StrengthScore } from "@/lib/passwordStrength";

const BAR_COLORS: Record<StrengthScore, string> = {
  0: "bg-red-400",
  1: "bg-red-400",
  2: "bg-amber-300",
  3: "bg-lime-300",
  4: "bg-emerald-400",
};

interface PasswordStrengthProps {
  password: string;
  /** Datos del usuario que no deberían aparecer en la contraseña. */
  context?: string[];
}

export function PasswordStrength({ password, context }: PasswordStrengthProps) {
  if (!password) return null;
  const { score, label, hint } = evaluatePassword(password, context);

  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex gap-1" aria-hidden="true">
        {[1, 2, 3, 4].map((step) => (
          <span
            key={step}
            className={`h-1 flex-1 rounded-full ${score >= step || (score === 0 && step === 1) ? BAR_COLORS[score] : "bg-white/20"}`}
          />
        ))}
      </div>
      <p className="mt-1 text-xs text-white/90">
        Fortaleza: <span className="font-semibold">{label}</span>
        {hint && <span className="text-white/75"> · {hint}</span>}
      </p>
    </div>
  );
}
