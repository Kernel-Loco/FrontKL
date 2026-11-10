// Revisa la lista de funciones simuladas del portal (#190, RC-308). FrontKL no tiene pruebas:
// esto se corre a mano con `npm run revisar:simulado`. Termina con 1 si algo falla.
//
// 1. Toda función de src/ que llama a `mockDelay` está en FUNCIONES_SIMULADAS (src/config/simulado.ts).
// 2. La lista no trae funciones que ya no llaman a `mockDelay` ni nombres repetidos.
// 3. Cada pantalla de src/app (page, layout, template, error, not-found o default) nombra en un <AvisoSimulado>
//    suyo las funciones simuladas que usa, ella o sus componentes. Basta un aviso en el archivo: no revisa en
//    qué rama del JSX está ni si la función va en `acciones` o en `datos`.
// 4. Ninguna llave o token inventado se parece a uno real (`lt_live_`).
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(RAIZ, "src");
const LISTA = join(SRC, "config", "simulado.ts");
const ruta = (archivo) => relative(RAIZ, archivo).replaceAll("\\", "/");

function archivos(carpeta) {
  return readdirSync(carpeta, { withFileTypes: true }).flatMap((entrada) => {
    const completo = join(carpeta, entrada.name);
    if (entrada.isDirectory()) return archivos(completo);
    return /\.tsx?$/.test(entrada.name) ? [completo] : [];
  });
}

const fuentes = archivos(SRC).map((archivo) => ({
  archivo,
  ast: ts.createSourceFile(archivo, readFileSync(archivo, "utf8"), ts.ScriptTarget.Latest, true),
}));

/** Nombre de la función de primer nivel que contiene al nodo (o null si está suelto en el módulo). */
function funcionQueContiene(nodo) {
  let nombre = null;
  for (let actual = nodo.parent; actual && !ts.isSourceFile(actual); actual = actual.parent) {
    if (ts.isFunctionDeclaration(actual) && actual.name) nombre = actual.name.text;
    else if (ts.isVariableDeclaration(actual) && ts.isIdentifier(actual.name)) nombre = actual.name.text;
    else if (ts.isMethodDeclaration(actual) && ts.isIdentifier(actual.name)) nombre = actual.name.text;
  }
  return nombre;
}

function recorrer(nodo, visita) {
  visita(nodo);
  ts.forEachChild(nodo, (hijo) => recorrer(hijo, visita));
}

// --- Funciones que llaman a mockDelay ---
const conMockDelay = new Map(); // nombre -> archivo
const errores = [];
for (const { archivo, ast } of fuentes) {
  recorrer(ast, (nodo) => {
    if (ts.isImportDeclaration(nodo) && ts.isStringLiteral(nodo.moduleSpecifier) && /(^|\/)lib\/mock$/.test(nodo.moduleSpecifier.text)) {
      const nombres = nodo.importClause?.namedBindings;
      const conAlias = nombres && ts.isNamedImports(nombres) && nombres.elements.some((e) => e.propertyName);
      if (!nombres || !ts.isNamedImports(nombres) || conAlias) errores.push(`${ruta(archivo)}: importa mockDelay con otro nombre. Impórtala como { mockDelay }.`);
      return;
    }
    // Cualquier uso del nombre cuenta, no solo la llamada: así tampoco se escapa `const esperar = mockDelay`.
    if (!ts.isIdentifier(nodo) || nodo.text !== "mockDelay" || ts.isImportSpecifier(nodo.parent)) return;
    const nombre = funcionQueContiene(nodo);
    if (nombre === null) errores.push(`${ruta(archivo)}: hay un mockDelay fuera de una función con nombre.`);
    else if (nombre !== "mockDelay") conMockDelay.set(nombre, archivo);
  });
}

// --- La lista ---
const astLista = fuentes.find((f) => f.archivo === LISTA)?.ast;
let lista = null;
if (astLista) {
  recorrer(astLista, (nodo) => {
    if (ts.isVariableDeclaration(nodo) && ts.isIdentifier(nodo.name) && nodo.name.text === "FUNCIONES_SIMULADAS" && nodo.initializer && ts.isArrayLiteralExpression(nodo.initializer)) {
      lista = nodo.initializer.elements.filter(ts.isStringLiteral).map((e) => e.text);
    }
  });
}
if (lista === null) {
  console.error(`No encontré FUNCIONES_SIMULADAS en ${ruta(LISTA)}.`);
  process.exit(1);
}

for (const [nombre, archivo] of conMockDelay) {
  if (!lista.includes(nombre)) errores.push(`${ruta(archivo)}: ${nombre} llama a mockDelay y no está en FUNCIONES_SIMULADAS.`);
}
for (const nombre of lista) {
  if (!conMockDelay.has(nombre)) errores.push(`${ruta(LISTA)}: ${nombre} está en la lista y ya no llama a mockDelay. Bórrala de la lista.`);
}
for (const nombre of new Set(lista.filter((n, i) => lista.indexOf(n) !== i))) {
  errores.push(`${ruta(LISTA)}: ${nombre} está repetida en la lista.`);
}

// --- Pantallas: cada archivo de ruta de src/app avisa de las funciones simuladas que usa, ella o sus componentes ---
const esServicio = (archivo) => ruta(archivo).startsWith("src/services/");

function resolver(desde, modulo) {
  const base = modulo.startsWith("@/") ? join(SRC, modulo.slice(2)) : modulo.startsWith(".") ? resolve(dirname(desde), modulo) : null;
  if (base === null) return null;
  const candidatos = [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")];
  return candidatos.find((c) => porArchivo.has(c)) ?? null;
}

const porArchivo = new Map(fuentes.map((f) => [f.archivo, { ...f, servicios: new Set(), locales: new Set(), avisadas: new Set() }]));
for (const info of porArchivo.values()) {
  recorrer(info.ast, (nodo) => {
    const esImport = ts.isImportDeclaration(nodo) && !nodo.importClause?.isTypeOnly;
    const esReexport = ts.isExportDeclaration(nodo) && !nodo.isTypeOnly;
    if ((esImport || esReexport) && nodo.moduleSpecifier && ts.isStringLiteral(nodo.moduleSpecifier)) {
      const destino = resolver(info.archivo, nodo.moduleSpecifier.text);
      const nombres = esImport ? nodo.importClause?.namedBindings : nodo.exportClause;
      if (destino && esServicio(destino)) {
        if (nombres && (ts.isNamedImports(nombres) || ts.isNamedExports(nombres))) {
          for (const elemento of nombres.elements) info.servicios.add((elemento.propertyName ?? elemento.name).text);
        } else if (!esServicio(info.archivo)) {
          errores.push(`${ruta(info.archivo)}: importa ${ruta(destino)} completo. Importa sus funciones por nombre para poder revisarlas.`);
        }
      } else if (destino) info.locales.add(destino);
    }
    if (ts.isCallExpression(nodo) && nodo.expression.kind === ts.SyntaxKind.ImportKeyword && nodo.arguments[0] && ts.isStringLiteral(nodo.arguments[0])) {
      const destino = resolver(info.archivo, nodo.arguments[0].text);
      if (destino && esServicio(destino)) errores.push(`${ruta(info.archivo)}: carga ${ruta(destino)} con import(). Importa sus funciones por nombre para poder revisarlas.`);
      else if (destino) info.locales.add(destino);
    }
    if ((ts.isJsxSelfClosingElement(nodo) || ts.isJsxOpeningElement(nodo)) && nodo.tagName.getText(info.ast) === "AvisoSimulado") {
      for (const atributo of nodo.attributes.properties) {
        if (!ts.isJsxAttribute(atributo) || !["acciones", "datos"].includes(atributo.name.getText(info.ast))) continue;
        recorrer(atributo, (hijo) => {
          if (ts.isStringLiteral(hijo)) info.avisadas.add(hijo.text);
        });
      }
    }
  });
}

/** Funciones de servicios que usa un archivo, directo o por los componentes que importa. */
function serviciosDe(archivo, vistos = new Set()) {
  if (vistos.has(archivo)) return new Map();
  vistos.add(archivo);
  const info = porArchivo.get(archivo);
  const resultado = new Map([...info.servicios].map((nombre) => [nombre, archivo]));
  for (const local of info.locales) {
    for (const [nombre, origen] of serviciosDe(local, vistos)) if (!resultado.has(nombre)) resultado.set(nombre, origen);
  }
  return resultado;
}

for (const info of porArchivo.values()) {
  if (!/^src\/app\/(.*\/)?(page|layout|template|error|not-found|default)\.tsx$/.test(ruta(info.archivo))) continue;
  for (const [nombre, origen] of serviciosDe(info.archivo)) {
    if (!lista.includes(nombre) || info.avisadas.has(nombre)) continue;
    const via = origen === info.archivo ? "" : ` (por ${ruta(origen)})`;
    errores.push(`${ruta(info.archivo)}: usa ${nombre}${via}, que es simulada, y su <AvisoSimulado> no la nombra.`);
  }
}

// --- Llaves que parecen reales ---
for (const { archivo, ast } of fuentes) {
  if (ast.text.includes("lt_live_")) errores.push(`${ruta(archivo)}: trae 'lt_live_'. Lo inventado lleva el prefijo CIRDAN_FAKE_.`);
}

if (errores.length > 0) {
  console.error(`revisar-simulado: ${errores.length} problema(s)`);
  for (const error of errores) console.error(`  - ${error}`);
  process.exit(1);
}
console.log(`revisar-simulado: bien. ${lista.length} funciones simuladas, todas en la lista y con aviso en cada pantalla que las usa.`);
