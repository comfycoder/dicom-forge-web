import { Plus, Trash2, ArrowRight } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select } from "./ui/select";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import {
  ACTIONS,
  ACTION_BY_ID,
  newRow,
  resolveTemplate,
  type FieldId,
  type IdKind,
  type TagRow,
  type PreviewContext,
} from "../lib/mutations";

type StrField = "value" | "pattern" | "replacement" | "days" | "seconds" | "fromKeyword";

const PREVIEW: PreviewContext = {
  index: 0,
  total: 24,
  set: "patient_001",
  source: { PatientID: "PAT001", PatientName: "DOE^JOHN", StudyDate: "20240105", PatientBirthDate: "19650312" },
};

interface TagEditorProps {
  rows: TagRow[];
  onChange: (rows: TagRow[]) => void;
}

export function TagEditor({ rows, onChange }: TagEditorProps) {
  function update(rid: string, patch: Partial<TagRow>) {
    onChange(rows.map((r) => (r.rid === rid ? { ...r, ...patch } : r)));
  }
  function remove(rid: string) {
    onChange(rows.filter((r) => r.rid !== rid));
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Tag mutations — preview resolves per-instance tokens for the first file in the set.
        </p>
        <Button variant="outline" size="sm" onClick={() => onChange([...rows, newRow()])}>
          <Plus className="size-4" /> Add mutation
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-[150px_1fr_120px_1fr_32px] items-center gap-2 border-b border-border bg-muted/40 px-3 py-2 text-[11px] uppercase tracking-wide text-muted-foreground">
          <span>Identifier</span>
          <span></span>
          <span>Action</span>
          <span>Preview (index 0)</span>
          <span></span>
        </div>

        {rows.map((r) => {
          const spec = ACTION_BY_ID[r.action];
          return (
            <div
              key={r.rid}
              className="grid grid-cols-[150px_1fr_120px_1fr_32px] items-start gap-2 border-b border-border px-3 py-2.5 last:border-b-0"
            >
              <Select
                value={r.idKind}
                onChange={(e) => update(r.rid, { idKind: e.target.value as IdKind })}
                className="h-8 text-[13px]"
              >
                <option value="keyword">keyword</option>
                <option value="tag">tag</option>
                <option value="path">path</option>
              </Select>

              <Input
                value={r.identifier}
                onChange={(e) => update(r.rid, { identifier: e.target.value })}
                placeholder={r.idKind === "path" ? "Seq[0].Leaf" : r.idKind === "tag" ? "(0010,0020)" : "PatientID"}
                className="h-8 font-mono text-[13px]"
              />

              <Select
                value={r.action}
                onChange={(e) => update(r.rid, { action: e.target.value as TagRow["action"] })}
                className="h-8 text-[13px]"
              >
                {ACTIONS.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </Select>

              <div className="min-w-0">
                <Fields row={r} update={update} />
                <PreviewCell row={r} previewable={spec.previewable} />
              </div>

              <button
                aria-label="Remove mutation"
                onClick={() => remove(r.rid)}
                className="mt-1 text-muted-foreground transition-colors hover:text-danger"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          );
        })}
      </Card>
    </div>
  );
}

function Fields({ row, update }: { row: TagRow; update: (rid: string, patch: Partial<TagRow>) => void }) {
  const fields = ACTION_BY_ID[row.action].fields;
  if (fields.length === 0) {
    return <span className="text-[13px] text-muted-foreground">no parameters</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {fields.map((f) => (
        <Input
          key={f}
          value={row[fieldKey(f)]}
          onChange={(e) => update(row.rid, patchFor(f, e.target.value))}
          placeholder={f}
          className="h-8 w-[120px] font-mono text-[13px]"
        />
      ))}
    </div>
  );
}

function patchFor(f: FieldId, val: string): Partial<TagRow> {
  switch (f) {
    case "value":
      return { value: val };
    case "pattern":
      return { pattern: val };
    case "replacement":
      return { replacement: val };
    case "days":
      return { days: val };
    case "seconds":
      return { seconds: val };
    case "from_keyword":
      return { fromKeyword: val };
    default:
      return {};
  }
}

function PreviewCell({ row, previewable }: { row: TagRow; previewable: boolean }) {
  if (!previewable) {
    return null;
  }
  const resolved = resolveTemplate(row.value, PREVIEW);
  return (
    <div className="mt-1.5 flex items-center gap-1.5 font-mono text-[12px]">
      <Badge variant="info" className="shrink-0">
        {row.identifier || "tag"}
      </Badge>
      <ArrowRight className="size-3 shrink-0 text-muted-foreground" />
      <span className="truncate text-success">{resolved || "—"}</span>
    </div>
  );
}

function fieldKey(f: FieldId): StrField {
  switch (f) {
    case "value":
      return "value";
    case "pattern":
      return "pattern";
    case "replacement":
      return "replacement";
    case "days":
      return "days";
    case "seconds":
      return "seconds";
    case "from_keyword":
      return "fromKeyword";
    default:
      return "value";
  }
}
