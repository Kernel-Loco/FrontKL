// Actividades del Anexo A de la carta de autorización (RC-59). La carta guarda cuáles autoriza y el orquestador
// no corre las fuentes de una actividad que no está marcada. La lista y la versión siguen a
// BackKL docs/plantilla_carta_autorizacion.md y cirdan/alcance_carta.py: si cambian allá, cambian aquí.

export const PLANTILLA_VIGENTE = 1;

export const ANEXO_A: readonly { id: number; label: string }[] = [
  { id: 1, label: "Subdominios, certificados y dominios parecidos (registros públicos de certificados y subfinder pasivo)" },
  { id: 2, label: "Registros DNS y configuración de SPF y DMARC (DNS público)" },
  { id: 3, label: "Registrador, vencimiento del dominio y ubicación de sus IPs (RDAP y WHOIS de respaldo)" },
  { id: 4, label: "Secretos expuestos y correos en commits (repositorios públicos de GitHub)" },
  { id: 5, label: "Servicios y dispositivos expuestos (Shodan e InternetDB, sin escanear)" },
  { id: 6, label: "Tecnologías web, servidor y versiones (visita web normal)" },
  { id: 7, label: "Correos del dominio en brechas conocidas (Have I Been Pwned)" },
  { id: 8, label: "Correos y perfiles públicos ligados al dominio" },
  { id: 9, label: "Documentación de APIs expuesta (hasta 10 rutas fijas, solo GET)" },
  { id: 10, label: "Almacenamiento en la nube público (comprobación anónima de buckets)" },
  { id: 11, label: "Imágenes de contenedores de Docker Hub declaradas en la carta" },
];

/** Las actividades marcadas en el formulario, en orden y sin repetir. Solo cuenta las del Anexo A. */
export function actividadesMarcadas(valores: readonly unknown[]): number[] {
  const validas = new Set(ANEXO_A.map((a) => a.id));
  const marcadas = new Set<number>();
  for (const valor of valores) {
    const id = typeof valor === "string" && /^\d{1,2}$/.test(valor) ? Number(valor) : NaN;
    if (validas.has(id)) marcadas.add(id);
  }
  return [...marcadas].sort((a, b) => a - b);
}
