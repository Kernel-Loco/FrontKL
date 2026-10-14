import { Moon, Sun } from "lucide-react";

export type ThemeMode = "dark" | "light";

interface ThemeToggleProps {
  theme: ThemeMode;
  onToggle: () => void;
  compact?: boolean;
  className?: string;
}

export function ThemeToggle({ theme, onToggle, compact = false, className = "" }: ThemeToggleProps) {
  const Icon = theme === "dark" ? Sun : Moon;
  const target = theme === "dark" ? "claro" : "oscuro";

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`Cambiar a modo ${target}`}
      aria-pressed={theme === "light"}
      title={`Cambiar a modo ${target}`}
      className={`inline-flex items-center gap-2 rounded-md text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${className || "px-2 py-2 text-lt-muted hover:bg-lt-raised hover:text-lt-text"}`}
    >
      <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
      {!compact && <span>Modo {theme === "light" ? "claro" : "oscuro"}</span>}
    </button>
  );
}