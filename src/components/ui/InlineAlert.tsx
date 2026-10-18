import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";

type Tone = "info" | "success" | "warning" | "error";

const STYLES: Record<Tone, { box: string; Icon: typeof Info }> = {
  info: { box: "border-lt-border bg-lt-raised text-lt-muted", Icon: Info },
  success: { box: "border-lt-green/30 bg-lt-green/10 text-lt-green", Icon: CircleCheck },
  warning: { box: "border-lt-amber/30 bg-lt-amber/10 text-lt-amber", Icon: TriangleAlert },
  error: { box: "border-lt-red/30 bg-lt-red/10 text-lt-red", Icon: CircleAlert },
};

export function InlineAlert({ tone = "info", children, className = "" }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  const { box, Icon } = STYLES[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs leading-relaxed ${box} ${className}`}
    >
      <Icon aria-hidden="true" className="mt-px h-3.5 w-3.5 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
