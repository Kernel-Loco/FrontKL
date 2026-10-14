import { CircleAlert, Info } from "lucide-react";

interface NoticeProps {
  tone?: "info" | "error";
  children: React.ReactNode;
}

/** Mensaje en línea del acceso (sesión expirada, error del servidor, etc.). */
export function Notice({ tone = "info", children }: NoticeProps) {
  const Icon = tone === "error" ? CircleAlert : Info;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm ${
        tone === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-blue-200 bg-blue-50 text-blue-900"
      }`}
    >
      <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
