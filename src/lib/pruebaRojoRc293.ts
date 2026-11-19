// Prueba de RC-293: rompe a propósito npm run lint (no-var) y npm run build (TS2322). No se fusiona.
var numero: number = "texto";

export default numero;
