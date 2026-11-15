"use client";

// Reemplaza al layout raíz cuando éste falla: define su propio <html> y no tiene los estilos globales.
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, minHeight: "100dvh", display: "grid", placeItems: "center", background: "#0a0b0f", color: "#e8eaf2", fontFamily: "system-ui, sans-serif" }}>
        <main role="alert" style={{ maxWidth: 420, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 22, margin: "0 0 8px" }}>Algo salió mal</h1>
          <p style={{ color: "#9196ab", fontSize: 14, margin: "0 0 24px" }}>
            Ocurrió un error inesperado. Intenta de nuevo en unos momentos.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{ background: "#4b6fe8", color: "#fff", border: 0, borderRadius: 8, padding: "8px 16px", fontWeight: 600, cursor: "pointer" }}
          >
            Reintentar
          </button>
        </main>
      </body>
    </html>
  );
}
