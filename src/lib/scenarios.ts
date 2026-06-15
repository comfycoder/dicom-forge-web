export interface ScenarioCard {
  type: string;
  icon: string;
  title: string;
  description: string;
}

/** The scenario catalogue shown in the picker. */
export const SCENARIOS: ScenarioCard[] = [
  { type: "deidentify", icon: "user-shield", title: "De-identify", description: "Safe-harbor PHI removal with pseudonyms and date shifting." },
  { type: "cohort", icon: "users", title: "Cohort multiply", description: "Clone one study into N synthetic patients with unique identities and UIDs." },
  { type: "longitudinal", icon: "timeline", title: "Longitudinal", description: "Multiple visits for the same patient across a timeline." },
  { type: "multi_series", icon: "stack-2", title: "Multi-series", description: "Several series in one study sharing a frame of reference." },
  { type: "pacs_stress", icon: "server-bolt", title: "PACS stress", description: "Duplicate SOPs, reused study UIDs, scanner-swap edge cases." },
  { type: "malformed", icon: "alert-triangle", title: "Malformed", description: "Deliberately non-conformant files for parser/validator testing." },
  { type: "raw_config", icon: "file-code", title: "Raw config", description: "Run an existing YAML mutation config directly." },
];
