import * as React from "react";
import { Input } from "./ui/input";
import { Select } from "./ui/select";

export type Params = Record<string, unknown>;

const MALFORMED_FLAVORS: { id: string; label: string; group: "value" | "byte" }[] = [
  { id: "missing_sop_uid", label: "Missing SOPInstanceUID (Type-1)", group: "value" },
  { id: "empty_sop_uid", label: "Empty SOPInstanceUID", group: "value" },
  { id: "bad_uid_format", label: "Bad UID format", group: "value" },
  { id: "invalid_modality", label: "Invalid Modality (illegal CS)", group: "value" },
  { id: "overlong_patient_id", label: "Over-long PatientID (>64)", group: "value" },
  { id: "invalid_study_date", label: "Invalid StudyDate", group: "value" },
  { id: "missing_modality", label: "Missing Modality (Type-1)", group: "value" },
  { id: "truncated", label: "Truncated file (body cut off)", group: "byte" },
  { id: "bad_magic", label: "Corrupt DICM magic", group: "byte" },
  { id: "junk_prefix", label: "Junk bytes prepended", group: "byte" },
  { id: "missing_preamble", label: "Missing 128-byte preamble", group: "byte" },
];

export function defaultScenarioParams(scenario: string, fromInit?: Params): Params {
  if (fromInit) return { ...fromInit };
  switch (scenario) {
    case "cohort":
      return { count: 10, patient_id_prefix: "COHORT" };
    case "deidentify":
      return { patient_birth_date: "19650312", study_date: "20240105", pseudonym_id: "ANON-001", pseudonym_name: "ANON^ANON", remove_tags: "InstitutionName,ReferringPhysicianName" };
    case "longitudinal":
      return { patient_id: "PAT001", patient_name: "DOE^JOHN", n_visits: 3, first_date: "20240105", interval_days: 42, uid_mode: "regen" };
    case "multi_series":
      return { patient_id: "PAT001", study_date: "20240105", series: "pre_contrast,post_contrast", shared_frame_of_reference: true };
    case "pacs_stress":
      return { factory: "duplicate_sop_uid", label: "pacs_stress", study_dates: "20240105,20240212", original_serial: "SN12345", new_serial: "SN99999" };
    case "malformed":
      return { flavors: MALFORMED_FLAVORS.map((f) => f.id).join(",") };
    default:
      return {};
  }
}

export function scenarioSummary(scenario: string, p: Params): string {
  switch (scenario) {
    case "cohort":
      return `${Number(p.count) || 0} patients — ${p.patient_id_prefix || "COHORT"}-001 …`;
    case "deidentify":
      return `Safe Harbor de-identification → ${p.pseudonym_id} (cohort auto-detected from dates)`;
    case "longitudinal":
      return `${Number(p.n_visits) || 0} visits for ${p.patient_id} from ${p.first_date}, every ${p.interval_days}d`;
    case "multi_series":
      return `${String(p.series || "").split(",").filter(Boolean).length} series${p.shared_frame_of_reference ? " · shared frame" : ""}`;
    case "pacs_stress":
      return `${p.factory}`;
    case "malformed":
      return `${String(p.flavors || "").split(",").filter(Boolean).length} non-conformant flavor(s) — one output folder each`;
    default:
      return "";
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

export function ScenarioConfig({
  scenario,
  params,
  onChange,
}: {
  scenario: string;
  params: Params;
  onChange: (p: Params) => void;
}) {
  const set = (k: string, v: unknown) => onChange({ ...params, [k]: v });
  const str = (k: string) => String(params[k] ?? "");

  if (scenario === "cohort") {
    return (
      <div className="grid max-w-md grid-cols-2 gap-4">
        <Field label="Number of patients">
          <Input value={str("count")} onChange={(e) => set("count", e.target.value)} className="font-mono" />
        </Field>
        <Field label="Patient ID prefix">
          <Input value={str("patient_id_prefix")} onChange={(e) => set("patient_id_prefix", e.target.value)} className="font-mono" />
        </Field>
      </div>
    );
  }

  if (scenario === "malformed") {
    const selected = String(params.flavors || "").split(",").map((s) => s.trim()).filter(Boolean);
    const toggle = (id: string) => {
      const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
      set("flavors", next.join(","));
    };
    return (
      <div className="max-w-xl space-y-4">
        <p className="text-[13px] text-muted-foreground">
          Each selected flaw produces one output sub-folder of intentionally non-conformant files (for testing parsers
          and validators).
        </p>
        {(["value", "byte"] as const).map((g) => (
          <div key={g} className="space-y-1.5">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {g === "value" ? "Value & structure (pydicom-readable)" : "Byte-level (raw file corruption)"}
            </div>
            {MALFORMED_FLAVORS.filter((f) => f.group === g).map((f) => (
              <label key={f.id} className="flex items-center gap-2 text-[13px]">
                <input type="checkbox" checked={selected.includes(f.id)} onChange={() => toggle(f.id)} />
                <span className="font-mono">{f.id}</span>
                <span className="text-muted-foreground">— {f.label}</span>
              </label>
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (scenario === "deidentify") {
    return (
      <div className="max-w-xl space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Patient birth date (YYYYMMDD)">
            <Input value={str("patient_birth_date")} onChange={(e) => set("patient_birth_date", e.target.value)} className="font-mono" />
          </Field>
          <Field label="Study date (YYYYMMDD)">
            <Input value={str("study_date")} onChange={(e) => set("study_date", e.target.value)} className="font-mono" />
          </Field>
          <Field label="Pseudonym (PatientID)">
            <Input value={str("pseudonym_id")} onChange={(e) => set("pseudonym_id", e.target.value)} className="font-mono" />
          </Field>
          <Field label="Pseudonym name (PatientName)">
            <Input value={str("pseudonym_name")} onChange={(e) => set("pseudonym_name", e.target.value)} className="font-mono" />
          </Field>
        </div>
        <Field label="Extra tags to remove (comma-separated keywords)">
          <Input value={str("remove_tags")} onChange={(e) => set("remove_tags", e.target.value)} className="font-mono" />
        </Field>
        <p className="text-[13px] text-muted-foreground">
          Cohort (pediatric / adult / 90+) is auto-detected from the dates, and birth-date handling follows Safe Harbor
          rules. UIDs are regenerated deterministically.
        </p>
      </div>
    );
  }

  if (scenario === "longitudinal") {
    return (
      <div className="grid max-w-xl grid-cols-2 gap-4">
        <Field label="Patient ID">
          <Input value={str("patient_id")} onChange={(e) => set("patient_id", e.target.value)} className="font-mono" />
        </Field>
        <Field label="Patient name (PN)">
          <Input value={str("patient_name")} onChange={(e) => set("patient_name", e.target.value)} className="font-mono" />
        </Field>
        <Field label="Number of visits">
          <Input value={str("n_visits")} onChange={(e) => set("n_visits", e.target.value)} className="font-mono" />
        </Field>
        <Field label="First visit date (YYYYMMDD)">
          <Input value={str("first_date")} onChange={(e) => set("first_date", e.target.value)} className="font-mono" />
        </Field>
        <Field label="Interval between visits (days)">
          <Input value={str("interval_days")} onChange={(e) => set("interval_days", e.target.value)} className="font-mono" />
        </Field>
        <Field label="UID mode">
          <Select value={str("uid_mode")} onChange={(e) => set("uid_mode", e.target.value)}>
            <option value="regen">regen</option>
            <option value="deterministic">deterministic</option>
          </Select>
        </Field>
      </div>
    );
  }

  if (scenario === "multi_series") {
    return (
      <div className="max-w-xl space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Patient ID">
            <Input value={str("patient_id")} onChange={(e) => set("patient_id", e.target.value)} className="font-mono" />
          </Field>
          <Field label="Study date (YYYYMMDD)">
            <Input value={str("study_date")} onChange={(e) => set("study_date", e.target.value)} className="font-mono" />
          </Field>
        </div>
        <Field label="Series labels (comma-separated)">
          <Input value={str("series")} onChange={(e) => set("series", e.target.value)} className="font-mono" placeholder="pre_contrast,post_contrast" />
        </Field>
        <label className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <input
            type="checkbox"
            checked={Boolean(params.shared_frame_of_reference)}
            onChange={(e) => set("shared_frame_of_reference", e.target.checked)}
          />
          Shared frame of reference (series share spatial frame)
        </label>
      </div>
    );
  }

  if (scenario === "pacs_stress") {
    const factory = str("factory");
    return (
      <div className="max-w-xl space-y-4">
        <Field label="Edge case">
          <Select value={factory} onChange={(e) => set("factory", e.target.value)}>
            <option value="duplicate_sop_uid">Duplicate SOP UID (re-send)</option>
            <option value="reused_study_uid">Reused Study UID across dates</option>
            <option value="scanner_replacement">Scanner replacement</option>
            <option value="partial_series_resend">Partial series re-send</option>
          </Select>
        </Field>
        {factory === "reused_study_uid" && (
          <Field label="Study dates (comma-separated YYYYMMDD, ≥2)">
            <Input value={str("study_dates")} onChange={(e) => set("study_dates", e.target.value)} className="font-mono" />
          </Field>
        )}
        {factory === "scanner_replacement" && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Original serial">
              <Input value={str("original_serial")} onChange={(e) => set("original_serial", e.target.value)} className="font-mono" />
            </Field>
            <Field label="New serial">
              <Input value={str("new_serial")} onChange={(e) => set("new_serial", e.target.value)} className="font-mono" />
            </Field>
          </div>
        )}
        <Field label="Label">
          <Input value={str("label")} onChange={(e) => set("label", e.target.value)} className="font-mono" />
        </Field>
      </div>
    );
  }

  return null;
}
