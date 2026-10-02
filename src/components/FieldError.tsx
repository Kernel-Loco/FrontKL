import { CircleAlert } from "lucide-react";

/** Mensaje de error de un campo, legible sobre el fondo oscuro. */
export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-[13px] font-medium text-red-300">
      <CircleAlert aria-hidden="true" className="mt-px h-3.5 w-3.5 shrink-0" />
      {message}
    </p>
  );
}
