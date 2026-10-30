// Severidad y fuente de los hallazgos, compartidas por los tipos de la API (api.ts).

export type Severity = "critical" | "high" | "medium" | "low";

/** Fuente OSINT que originó el hallazgo: `data_sources.code` de la base. */
export type FindingSource = "ct_logs" | "dns" | "whois" | "shodan" | "github" | "censys" | "hibp";
