// Copia de los JSON de ejemplo del contrato de API v1 de BackKL (docs/api_v1/, #21), con los
// datos demo de Acme Demo. Los campos marcados «Propuesto» en src/types/api.ts todavía no están
// en BackKL: van aquí con valores coherentes con la base y hay que agregarlos al contrato.
import type { DomainFindings, DomainScore, FindingExplanation, ListResponse, Domain, ScoreHistory, ScoringWeights } from "@/types";

/** docs/api_v1/dominios.json */
export const mockDomains: ListResponse<Domain> = {
  "items": [
    {
      "id": "40000000-0000-4000-8000-000000000001",
      "fqdn": "acme-demo.mx",
      "status": "verified",
      "authorization": {
        "status": "valid",
        "valid_from": "2026-09-01",
        "valid_until": "2026-12-31",
        "signer_email": "security@acme-demo.mx"
      },
      "txt": {
        "status": "verified",
        "checked_at": "2026-09-30T14:19:20-06:00"
      },
      "scan_eligibility": {
        "can_scan": true,
        "reasons": []
      },
      "score": 68,
      "band": "high",
      "open_findings": {
        "critical": 1,
        "high": 2,
        "medium": 1,
        "low": 0
      },
      "last_scan_at": "2026-09-30T14:20:00-06:00",
      "next_scan_at": "2026-10-07T14:20:00-06:00"
    },
    {
      "id": "40000000-0000-4000-8000-000000000002",
      "fqdn": "acme-tienda.mx",
      "status": "verified",
      "authorization": {
        "status": "valid",
        "valid_from": "2026-09-01",
        "valid_until": "2026-12-31",
        "signer_email": "security@acme-demo.mx"
      },
      "txt": {
        "status": "verified",
        "checked_at": "2026-09-29T09:11:30-06:00"
      },
      "scan_eligibility": {
        "can_scan": true,
        "reasons": []
      },
      "score": 54,
      "band": "medium",
      "open_findings": {
        "critical": 0,
        "high": 0,
        "medium": 0,
        "low": 0
      },
      "last_scan_at": "2026-09-29T09:12:00-06:00",
      "next_scan_at": "2026-10-06T09:12:00-06:00"
    },
    {
      "id": "40000000-0000-4000-8000-000000000003",
      "fqdn": "acme-portal.mx",
      "status": "verified",
      "authorization": {
        "status": "valid",
        "valid_from": "2026-09-01",
        "valid_until": "2026-12-31",
        "signer_email": "security@acme-demo.mx"
      },
      "txt": {
        "status": "verified",
        "checked_at": "2026-09-27T18:44:10-06:00"
      },
      "scan_eligibility": {
        "can_scan": true,
        "reasons": []
      },
      "score": 31,
      "band": "low",
      "open_findings": {
        "critical": 0,
        "high": 0,
        "medium": 0,
        "low": 0
      },
      "last_scan_at": "2026-09-27T18:45:00-06:00",
      "next_scan_at": "2026-10-04T18:45:00-06:00"
    },
    {
      "id": "40000000-0000-4000-8000-000000000004",
      "fqdn": "partner-example.com",
      "status": "pending_verification",
      "authorization": {
        "status": "missing",
        "valid_from": null,
        "valid_until": null,
        "signer_email": null
      },
      "txt": {
        "status": "missing",
        "checked_at": "2026-10-01T16:10:00-06:00"
      },
      "scan_eligibility": {
        "can_scan": false,
        "reasons": [
          "authorization_missing",
          "txt_not_verified"
        ]
      },
      "score": null,
      "band": null,
      "open_findings": {
        "critical": 0,
        "high": 0,
        "medium": 0,
        "low": 0
      },
      "last_scan_at": null,
      "next_scan_at": null
    },
    {
      "id": "40000000-0000-4000-8000-000000000005",
      "fqdn": "old-example.net",
      "status": "paused",
      "authorization": {
        "status": "expired",
        "valid_from": "2025-08-15",
        "valid_until": "2026-08-15",
        "signer_email": "it@old-example.net"
      },
      "txt": {
        "status": "verified",
        "checked_at": "2026-10-01T06:00:00-06:00"
      },
      "scan_eligibility": {
        "can_scan": false,
        "reasons": [
          "authorization_expired",
          "domain_paused"
        ]
      },
      "score": null,
      "band": null,
      "open_findings": {
        "critical": 0,
        "high": 0,
        "medium": 0,
        "low": 0
      },
      "last_scan_at": null,
      "next_scan_at": null
    }
  ],
  "total": 5
};

/** docs/api_v1/hallazgos.json */
export const mockFindings: DomainFindings = {
  "domain": "acme-demo.mx",
  "items": [
    {
      "id": "80000000-0000-4000-8000-000000000001",
      "title": "12 correos de la empresa aparecen en brechas de datos públicas",
      "asset": "acme-demo.mx",
      "asset_type": "domain",
      "category": "data_leaks",
      "rule_code": "breach_exposure",
      "source": "hibp",
      "severity": "critical",
      "base_severity": "critical",
      "status": "open",
      "recurrence": "new",
      "cve_id": null,
      "cvss": null,
      "epss": null,
      "in_kev": false,
      "evidence": {
        "emails_exposed": 12,
        "breach_name": "DemoBreach-2026",
        "breach_date": "2026-06-18",
        "data_classes": [
          "Email addresses",
          "Passwords",
          "Usernames"
        ]
      },
      "caracteristicas": {
        "tipo": "correos_en_brecha",
        "antiguedad_dias": 104,
        "exposicion": "publica",
        "sensibilidad": "alta"
      },
      "detected_at": "2026-09-30T14:22:10-06:00",
      "last_scan_id": "60000000-0000-4000-8000-000000000001"
    },
    {
      "id": "80000000-0000-4000-8000-000000000002",
      "title": "El subdominio dev.acme-demo.mx tiene el certificado TLS vencido",
      "asset": "dev.acme-demo.mx",
      "asset_type": "subdomain",
      "category": "infrastructure",
      "rule_code": "cert_expired",
      "source": "shodan",
      "severity": "high",
      "base_severity": "high",
      "status": "open",
      "recurrence": "new",
      "cve_id": null,
      "cvss": null,
      "epss": null,
      "in_kev": false,
      "evidence": {
        "port": 443,
        "not_after": "2026-09-12"
      },
      "caracteristicas": {
        "tipo": "certificado_vencido",
        "antiguedad_dias": 18,
        "exposicion": "publica",
        "sensibilidad": "media"
      },
      "detected_at": "2026-09-30T14:22:30-06:00",
      "last_scan_id": "60000000-0000-4000-8000-000000000001"
    },
    {
      "id": "80000000-0000-4000-8000-000000000003",
      "title": "El sitio usa una versión vieja de su CMS con vulnerabilidades conocidas",
      "asset": "www.acme-demo.mx",
      "asset_type": "subdomain",
      "category": "infrastructure",
      "rule_code": "outdated_software",
      "source": "shodan",
      "severity": "high",
      "base_severity": "high",
      "status": "open",
      "recurrence": "new",
      "cve_id": null,
      "cvss": null,
      "epss": null,
      "in_kev": false,
      "evidence": {
        "port": 443,
        "cms_version_status": "outdated"
      },
      "caracteristicas": {
        "tipo": "software_desactualizado",
        "antiguedad_dias": 28,
        "exposicion": "directa",
        "sensibilidad": "media"
      },
      "detected_at": "2026-09-30T14:22:30-06:00",
      "last_scan_id": "60000000-0000-4000-8000-000000000001"
    },
    {
      "id": "80000000-0000-4000-8000-000000000004",
      "title": "Falta el registro DMARC en acme-demo.mx",
      "asset": "acme-demo.mx",
      "asset_type": "domain",
      "category": "configuration",
      "rule_code": "dmarc_missing",
      "source": "dns",
      "severity": "medium",
      "base_severity": "medium",
      "status": "open",
      "recurrence": "recurring",
      "cve_id": null,
      "cvss": null,
      "epss": null,
      "in_kev": false,
      "evidence": {
        "record": "_dmarc.acme-demo.mx",
        "observed": "NXDOMAIN"
      },
      "caracteristicas": {
        "tipo": "dmarc_faltante",
        "antiguedad_dias": 28,
        "exposicion": "publica",
        "sensibilidad": "media"
      },
      "detected_at": "2026-09-02T10:30:00-06:00",
      "last_scan_id": "60000000-0000-4000-8000-000000000001"
    }
  ],
  "total": 4
};

/** docs/api_v1/score.json */
export const mockScore: DomainScore = {
  "domain": "acme-demo.mx",
  "score_id": "a0000000-0000-4000-8000-000000000001",
  "score": 68,
  "band": "high",
  "weighted": 68,
  "floor": 60,
  "floor_applied": false,
  "critical_open": 1,
  "method": "rules",
  "rule_set_version": 1,
  "reason": "scan",
  "partial_coverage": false,
  "computed_at": "2026-09-30T14:24:30-06:00",
  "categories": [
    {
      "category": "infrastructure",
      "score": 80,
      "band": "critical",
      "weight": 0.3
    },
    {
      "category": "digital_identity",
      "score": 55,
      "band": "medium",
      "weight": 0.2
    },
    {
      "category": "configuration",
      "score": 30,
      "band": "low",
      "weight": 0.2
    },
    {
      "category": "data_leaks",
      "score": 90,
      "band": "critical",
      "weight": 0.3
    }
  ],
  "alert": {
    "threshold": 60,
    "triggered": true
  }
};

/** docs/api_v1/historico.json */
export const mockScoreHistory: ScoreHistory = {
  "domain": "acme-demo.mx",
  "items": [
    {
      "score_id": "a0000000-0000-4000-8000-0000000000a1",
      "computed_at": "2026-09-02T10:35:00-06:00",
      "score": 29,
      "band": "low",
      "weighted": 29,
      "floor": 0,
      "floor_applied": false,
      "critical_open": 0,
      "method": "rules",
      "rule_set_version": 1,
      "reason": "scan",
      "partial_coverage": false,
      "categories": {
        "infrastructure": 50,
        "digital_identity": 40,
        "configuration": 30,
        "data_leaks": 0
      },
      "new_findings": 2,
      "resolved_findings": 0
    },
    {
      "score_id": "a0000000-0000-4000-8000-0000000000a2",
      "computed_at": "2026-09-09T14:24:00-06:00",
      "score": 33,
      "band": "low",
      "weighted": 33,
      "floor": 0,
      "floor_applied": false,
      "critical_open": 0,
      "method": "rules",
      "rule_set_version": 1,
      "reason": "scan",
      "partial_coverage": false,
      "categories": {
        "infrastructure": 60,
        "digital_identity": 45,
        "configuration": 30,
        "data_leaks": 0
      },
      "new_findings": 1,
      "resolved_findings": 0
    },
    {
      "score_id": "a0000000-0000-4000-8000-0000000000a3",
      "computed_at": "2026-09-16T14:24:00-06:00",
      "score": 38,
      "band": "low",
      "weighted": 38,
      "floor": 0,
      "floor_applied": false,
      "critical_open": 0,
      "method": "rules",
      "rule_set_version": 1,
      "reason": "scan",
      "partial_coverage": true,
      "categories": {
        "infrastructure": 70,
        "digital_identity": 55,
        "configuration": 30,
        "data_leaks": 0
      },
      "new_findings": 1,
      "resolved_findings": 1
    },
    {
      "score_id": "a0000000-0000-4000-8000-0000000000a4",
      "computed_at": "2026-09-23T14:24:00-06:00",
      "score": 41,
      "band": "medium",
      "weighted": 41,
      "floor": 0,
      "floor_applied": false,
      "critical_open": 0,
      "method": "rules",
      "rule_set_version": 1,
      "reason": "scan",
      "partial_coverage": false,
      "categories": {
        "infrastructure": 80,
        "digital_identity": 55,
        "configuration": 30,
        "data_leaks": 0
      },
      "new_findings": 1,
      "resolved_findings": 0
    },
    {
      "score_id": "a0000000-0000-4000-8000-000000000001",
      "computed_at": "2026-09-30T14:24:30-06:00",
      "score": 68,
      "band": "high",
      "weighted": 68,
      "floor": 60,
      "floor_applied": false,
      "critical_open": 1,
      "method": "rules",
      "rule_set_version": 1,
      "reason": "scan",
      "partial_coverage": false,
      "categories": {
        "infrastructure": 80,
        "digital_identity": 55,
        "configuration": 30,
        "data_leaks": 90
      },
      "new_findings": 3,
      "resolved_findings": 0
    }
  ],
  "total": 5
};

/** docs/api_v1/explicacion.json */
export const mockExplanation: FindingExplanation = {
  "finding_id": "80000000-0000-4000-8000-000000000001",
  "domain": "acme-demo.mx",
  "title": "12 correos de la empresa aparecen en brechas de datos públicas",
  "severity": "critical",
  "base_severity": "critical",
  "category": "data_leaks",
  "rule_code": "breach_exposure",
  "score_id": "a0000000-0000-4000-8000-000000000001",
  "computed_at": "2026-09-30T14:24:30-06:00",
  "method": "rules",
  "penalty": 24.0,
  "max_penalty": 40.0,
  "factors": [
    {
      "label": "La brecha es de hace menos de 6 meses",
      "points": 12
    },
    {
      "label": "Incluye cuentas de administrador",
      "points": 8
    },
    {
      "label": "La brecha incluye contraseñas",
      "points": 6
    },
    {
      "label": "El hallazgo ya se había visto antes",
      "points": -2
    }
  ],
  "caracteristicas": {
    "tipo": "correos_en_brecha",
    "antiguedad_dias": 104,
    "exposicion": "publica",
    "sensibilidad": "alta"
  },
  "summary": "Es crítico porque alguien de fuera puede usar ya esas contraseñas para entrar a cuentas de la empresa, sin pasos extra.",
  "recommendation": "Fuerza el cambio de contraseña de las cuentas afectadas y activa MFA en todas ellas.",
  "confidence": null,
  "shap": null
};

/** docs/api_v1/pesos.json */
export const mockWeights: ScoringWeights = {
  "rule_set_version": 1,
  "is_active": true,
  "activated_at": "2026-09-01T08:00:00-06:00",
  "validated_by": "Emilio",
  "category_weights": {
    "infrastructure": 0.3,
    "digital_identity": 0.2,
    "configuration": 0.2,
    "data_leaks": 0.3
  },
  "bands": [
    {
      "band": "low",
      "from": 0,
      "to": 39
    },
    {
      "band": "medium",
      "from": 40,
      "to": 59
    },
    {
      "band": "high",
      "from": 60,
      "to": 79
    },
    {
      "band": "critical",
      "from": 80,
      "to": 100
    }
  ],
  "floor": {
    "one_critical": 60,
    "two_or_more_critical": 80,
    "counts_statuses": [
      "open",
      "accepted_risk"
    ]
  },
  "alert_threshold_default": 60,
  "rules": [
    {
      "code": "breach_exposure",
      "category": "data_leaks",
      "base_severity": "critical",
      "weight": 1.0,
      "max_penalty": 40.0
    },
    {
      "code": "cert_expired",
      "category": "infrastructure",
      "base_severity": "high",
      "weight": 0.4,
      "max_penalty": 20.0
    },
    {
      "code": "outdated_software",
      "category": "infrastructure",
      "base_severity": "high",
      "weight": 0.4,
      "max_penalty": 25.0
    },
    {
      "code": "exposed_rdp",
      "category": "infrastructure",
      "base_severity": "high",
      "weight": 0.2,
      "max_penalty": 25.0
    },
    {
      "code": "dmarc_missing",
      "category": "configuration",
      "base_severity": "medium",
      "weight": 0.5,
      "max_penalty": 10.0
    },
    {
      "code": "spf_missing",
      "category": "configuration",
      "base_severity": "low",
      "weight": 0.5,
      "max_penalty": 8.0
    },
    {
      "code": "lookalike_domain",
      "category": "digital_identity",
      "base_severity": "medium",
      "weight": 1.0,
      "max_penalty": 15.0
    }
  ]
};
