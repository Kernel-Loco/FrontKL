import Link from "next/link";

interface AuthPromptProps {
  text: string;
  linkText: string;
  href: string;
}

/** Texto tipo "don't have account? Sign Up". */
export function AuthPrompt({ text, linkText, href }: AuthPromptProps) {
  return (
    <p className="text-center text-sm text-white">
      {text}{" "}
      <Link href={href} className="ml-1.5 rounded-sm font-bold hover:underline">
        {linkText}
      </Link>
    </p>
  );
}
