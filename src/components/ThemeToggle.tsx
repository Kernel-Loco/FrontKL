import { Moon, Sun } from "lucide-react";
import { tx } from "@/i18n/tx";

export type ThemeMode = "dark" | "light";

interface ThemeToggleProps {
  theme: ThemeMode;
  onToggle: () => void;
  compact?: boolean;
  className?: string;
}

export function ThemeToggle({ theme, onToggle, compact = false, className = "" }: ThemeToggleProps) {
  const Icon = theme === "dark" ? Sun : Moon;
  const label = theme === "dark" ? tx("Cambiar a modo claro") : tx("Cambiar a modo oscuro");

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      aria-pressed={theme === "light"}
      title={label}
      className={`inline-flex items-center gap-2 rounded-md text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${className || "px-2 py-2 text-lt-muted hover:bg-lt-raised hover:text-lt-text"}`}
    >
      <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
      {!compact && <span>{theme === "light" ? tx("Modo claro") : tx("Modo oscuro")}</span>}
    </button>
  );
}