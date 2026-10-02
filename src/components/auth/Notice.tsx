import { CircleAlert, Info } from "lucide-react";

interface NoticeProps {
  tone?: "info" | "error";
  children: React.ReactNode;
}

/** Mensaje en línea sobre el fondo oscuro (sesión expirada, error del servidor, etc.). */
export function Notice({ tone = "info", children }: NoticeProps) {
  const Icon = tone === "error" ? CircleAlert : Info;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex items-start gap-2 rounded-md border px-3 py-2.5 text-sm ${
        tone === "error" ? "border-red-300/70 bg-red-500/15 text-red-100" : "border-white/40 bg-white/10 text-white"
      }`}
    >
      <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
