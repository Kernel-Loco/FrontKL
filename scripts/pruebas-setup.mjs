// Preparación de `npm test` (RC-374). Node corre los .ts del portal sin compilar, así que aquí:
// 1. Resuelve el alias @/ y las importaciones sin extensión (./config -> ./config.ts), como Next.
// 2. Al leer un .ts/.tsx de src/ con readFileSync, quita el envoltorio de traducción (tx("…"), localized(…)): las
//    pruebas revisan que el texto en español esté donde debe, como antes de traducir el portal.
import fs from "node:fs";
import { registerHooks, syncBuiltinESMExports } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SRC = path.resolve(fileURLToPath(new URL("../src/", import.meta.url)));
const EXTENSIONS = [".ts", ".tsx", "/index.ts", "/index.tsx"];

registerHooks({
  resolve(specifier, context, nextResolve) {
    let target = null;
    if (specifier.startsWith("@/")) target = path.join(SRC, specifier.slice(2));
    else if (/^\.\.?\//.test(specifier) && context.parentURL?.startsWith("file:") && !path.extname(specifier)) {
      target = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
    }
    if (target) {
      const found = [""].concat(EXTENSIONS).map((ext) => target + ext).find((f) => fs.existsSync(f) && fs.statSync(f).isFile());
      if (found) return nextResolve(pathToFileURL(found).href, context);
    }
    return nextResolve(specifier, context);
  },
});

const STRING = String.raw`"(?:[^"\\]|\\.)*"`;
/** El código fuente tal como estaba antes de envolver los textos para traducirlos. */
export function sinTx(source) {
  let out = source.replace(/^import \{ (?:tx|localized|tx, localized|localized, tx) \} from "@\/i18n\/tx";\r?\n/m, "");
  out = out.replace(new RegExp(String.raw`\{" "\}\{tx\((${STRING})\)\}`, "g"), (_, s) => " " + JSON.parse(s));
  out = out.replace(new RegExp(String.raw`\{tx\((${STRING})\)\}\{" "\}`, "g"), (_, s) => JSON.parse(s) + " ");
  out = out.replace(new RegExp(String.raw`=\{tx\((${STRING})\)\}`, "g"), (_, s) => "=" + s);
  out = out.replace(new RegExp(String.raw`\{tx\((${STRING})\)\}`, "g"), (_, s) => JSON.parse(s));
  out = out.replace(new RegExp(String.raw`\btx\((${STRING})\)`, "g"), (_, s) => s);
  out = out.replace(/\btx\(([A-Z_][A-Z0-9_]*)\)/g, "$1");
  // localized( … ) -> …, con su paréntesis de cierre
  let index;
  while ((index = out.indexOf("localized(")) !== -1) {
    let depth = 0, end = -1;
    for (let i = index + "localized".length; i < out.length; i++) {
      const c = out[i];
      if (c === '"' || c === "'" || c === "`") { const q = c; i++; while (i < out.length && out[i] !== q) { if (out[i] === "\\") i++; i++; } continue; }
      if (c === "(") depth++;
      else if (c === ")" && --depth === 0) { end = i; break; }
    }
    if (end === -1) break;
    out = out.slice(0, index) + out.slice(index + "localized(".length, end) + out.slice(end + 1);
  }
  return out;
}

const original = fs.readFileSync;
fs.readFileSync = function readFileSync(file, options) {
  const result = original.apply(this, arguments);
  const name = file instanceof URL ? fileURLToPath(file) : typeof file === "string" ? file : "";
  const text = typeof options === "string" || options?.encoding;
  if (text && /\.(ts|tsx)$/.test(name) && path.resolve(name).startsWith(SRC) && !name.includes(`${path.sep}i18n${path.sep}`)) return sinTx(result);
  return result;
};
syncBuiltinESMExports();
