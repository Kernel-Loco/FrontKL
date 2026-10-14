"use client";

import { useId } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SELECT } from "@/components/ui/Field";

/** Cambia el dominio de la pantalla actual (parámetro ?dominio=). */
export function DomainPicker({ domains, value }: { domains: string[]; value: string }) {
  const id = useId();
  const router = useRouter();
  const pathname = usePathname();
  if (domains.length < 2) return null;
  return (
    <div className="w-full sm:w-56">
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-lt-muted">
        Dominio
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => router.push(`${pathname}?dominio=${encodeURIComponent(e.target.value)}`)}
        className={`${SELECT} font-mono text-[13px]`}
      >
        {domains.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
    </div>
  );
}
