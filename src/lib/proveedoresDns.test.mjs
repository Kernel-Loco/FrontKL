import assert from "node:assert/strict";
import { test } from "node:test";
import { proveedoresDns } from "./proveedoresDns.ts";

const raiz = (dns) => ({ type: "domain", value: "acme-demo.mx", attributes: { dns } });

test("muestra los registros MX y NS del dominio solicitado, incluidos servidores de terceros", () => {
  const assets = [
    { type: "subdomain", value: "acme-demo.mx", attributes: { dns: { ns: ["incorrecto.example"] } } },
    raiz({ mx: [{ prioridad: 10, host: "mail.acme-demo.mx" }, { prioridad: 30, host: "aspmx.l.google.com" }], ns: ["ns1.acme-demo.mx", "ns1.otro-dns.example"] }),
  ];
  assert.deepEqual(proveedoresDns(assets, "ACME-DEMO.MX."), {
    mx: { estado: "disponible", servidores: [{ host: "mail.acme-demo.mx", prioridad: 10 }, { host: "aspmx.l.google.com", prioridad: 30 }], incompleto: false },
    ns: { estado: "disponible", servidores: [{ host: "ns1.acme-demo.mx" }, { host: "ns1.otro-dns.example" }], incompleto: false },
  });
});

test("distingue listas vacías de registros no disponibles", () => {
  assert.deepEqual(proveedoresDns([raiz({ mx: [] })], "acme-demo.mx"), {
    mx: { estado: "disponible", servidores: [], incompleto: false },
    ns: { estado: "no_disponible" },
  });
  assert.deepEqual(proveedoresDns([raiz({ mx: true, ns: null })], "acme-demo.mx"), {
    mx: { estado: "no_disponible" }, ns: { estado: "no_disponible" },
  });
  assert.deepEqual(proveedoresDns([raiz({ mx: [] })], "otro.example"), {
    mx: { estado: "no_disponible" }, ns: { estado: "no_disponible" },
  });
});

test("conserva MX nulo y advierte sobre registros con formato desconocido", () => {
  assert.deepEqual(proveedoresDns([raiz({ mx: [{ prioridad: 0, host: "." }, { host: "sin-prioridad.example" }], ns: ["ns.example", null, ""] })], "acme-demo.mx"), {
    mx: { estado: "disponible", servidores: [{ host: ".", prioridad: 0 }], incompleto: true },
    ns: { estado: "disponible", servidores: [{ host: "ns.example" }], incompleto: true },
  });
  assert.deepEqual(proveedoresDns([raiz({ mx: [{ prioridad: -1, host: "mail.example" }] })], "acme-demo.mx").mx, {
    estado: "disponible", servidores: [], incompleto: true,
  });
});
