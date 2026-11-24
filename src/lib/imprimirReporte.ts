// Reporte ejecutivo en PDF (#45, RC-70 punto 4): sale del mismo HTML que la API entrega con ?formato=html
// (BackKL cirdan/reporte.py, html()), no de otro armado en el portal. El HTML trae su @page A4, sus topes de texto,
// la letra del score y la atribución de Have I Been Pwned. El portal lo carga en un iframe fuera de la vista y abre la
// impresión del navegador, donde se elige 'Guardar como PDF'.
// Sin imports con @/ de valores, así node --test lo carga.

/** El iframe no corre scripts (sandbox sin allow-scripts). allow-same-origin deja que el portal llame a print() y
 * allow-modals deja abrir el diálogo de impresión. El HTML de la API no trae scripts ni recursos externos. */
export const SANDBOX = "allow-same-origin allow-modals";

/**
 * Carga `html` en un iframe oculto y abre su impresión. Resuelve cuando se abrió el diálogo. Con `signal` abortado
 * antes de cargar, quita el iframe y no imprime. Devuelve una función que quita el iframe (por ejemplo, al desmontar).
 * Sin temporizador: en los navegadores donde print() no bloquea, el diálogo puede seguir abierto mucho rato. Si
 * afterprint no llega, el iframe se quita en la siguiente impresión o al desmontar el botón (ReportButton).
 */
export function printReportHtml(html: string, doc: Document = document, signal?: AbortSignal): Promise<() => void> {
  return new Promise((resolve, reject) => {
    const frame = doc.createElement("iframe");
    frame.setAttribute("sandbox", SANDBOX);
    frame.setAttribute("aria-hidden", "true");
    frame.setAttribute("title", "Reporte ejecutivo para imprimir");
    frame.tabIndex = -1;
    // Fuera de la vista pero con tamaño de hoja: con display:none o 0 px algunos navegadores imprimen la hoja en blanco.
    frame.style.cssText = "position:fixed;left:-10000px;top:0;width:210mm;height:297mm;border:0;";
    const remove = () => frame.remove();
    frame.addEventListener("load", () => {
      const win = frame.contentWindow;
      if (signal?.aborted || !win) {
        remove();
        if (win) resolve(remove);
        else reject(new Error("El navegador no pudo preparar el reporte para imprimir."));
        return;
      }
      win.addEventListener("afterprint", remove, { once: true });
      try {
        win.focus();
        win.print();
        resolve(remove);
      } catch (error) {
        remove();
        reject(error);
      }
    }, { once: true });
    frame.srcdoc = html;
    doc.body.appendChild(frame);
  });
}
