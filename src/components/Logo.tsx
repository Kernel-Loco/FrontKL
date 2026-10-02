interface LogoMarkProps {
  className?: string;
}

/** Círculo violeta con el velero blanco. */
export function LogoMark({ className = "h-11 w-11" }: LogoMarkProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true" focusable="false">
      <circle cx="24" cy="24" r="24" className="fill-cirdan-500" />
      <path d="M23 10v19h-8.5z" fill="#fff" />
      <path d="M25 14.5V29h7z" fill="#fff" fillOpacity="0.85" />
      <path d="M12 31.5h24c-1.5 4-5 5.5-12 5.5s-10.5-1.5-12-5.5z" fill="#fff" />
    </svg>
  );
}

const SIZES = {
  md: { mark: "h-9 w-9", text: "text-[1.75rem]" },
  lg: { mark: "h-11 w-11", text: "text-[2.4rem]" },
};

interface LogoProps {
  size?: keyof typeof SIZES;
  className?: string;
}

export function Logo({ size = "lg", className = "" }: LogoProps) {
  const s = SIZES[size];
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className={s.mark} />
      <span className={`font-logo font-medium leading-none tracking-tight text-white ${s.text}`}>Cirdan</span>
    </span>
  );
}
