import Link from "next/link";

interface AuthPromptProps {
  text: string;
  linkText: string;
  href: string;
}

/** Texto tipo «¿Ya tienes cuenta? Inicia sesión». */
export function AuthPrompt({ text, linkText, href }: AuthPromptProps) {
  return (
    <p className="text-center text-sm text-slate-500">
      {text}{" "}
      <Link href={href} className="ml-1 rounded-sm font-semibold text-lt-primary hover:underline">
        {linkText}
      </Link>
    </p>
  );
}
