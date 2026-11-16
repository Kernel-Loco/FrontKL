// Página pública de los términos de uso. Todo su texto sale de src/config/legal.ts.
import { DocumentoLegal } from "@/components/DocumentoLegal";
import { TERMINOS } from "@/config/legal";

export const metadata = { title: "Términos de uso" };

export default function TerminosPage() {
  return <DocumentoLegal documento={TERMINOS} etiqueta="Términos" />;
}
