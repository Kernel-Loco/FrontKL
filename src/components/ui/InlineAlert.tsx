import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";

type Tone = "info" | "success" | "warning" | "error";

const STYLES: Record<Tone, { box: string; icon: string; Icon: typeof Info }> = {
  info: { box: "text-lt-muted", icon: "text-lt-muted", Icon: Info },
  success: { box: "text-lt-text", icon: "text-lt-green", Icon: CircleCheck },
  warning: { box: "text-lt-text", icon: "text-lt-amber", Icon: TriangleAlert },
  error: { box: "text-lt-red", icon: "text-lt-red", Icon: CircleAlert },
};

export function InlineAlert({ tone = "info", children, className = "" }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  const { box, icon, Icon } = STYLES[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex items-start gap-2 rounded-lg bg-lt-raised px-3 py-2.5 text-xs leading-relaxed ${box} ${className}`}
    >
      <Icon aria-hidden="true" className={`mt-px h-3.5 w-3.5 shrink-0 ${icon}`} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
