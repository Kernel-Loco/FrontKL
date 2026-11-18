// Página pública del aviso de privacidad. Todo su texto sale de src/config/legal.ts.
import { DocumentoLegal } from "@/components/DocumentoLegal";
import { PRIVACIDAD } from "@/config/legal";

export const metadata = { title: "Aviso de privacidad" };

export default function PrivacidadPage() {
  return (
    <DocumentoLegal documento={PRIVACIDAD} etiqueta="Privacidad">
      <section aria-labelledby="simplificado" className="border-l-2 border-lt-indigo-soft bg-lt-surface px-5 py-4">
        <h2 id="simplificado" className="text-sm font-semibold text-lt-text">
          Aviso simplificado
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-lt-muted">{PRIVACIDAD.simplificado}</p>
      </section>
    </DocumentoLegal>
  );
}
