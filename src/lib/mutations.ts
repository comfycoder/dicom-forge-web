export type ActionId =
  | "set"
  | "remove"
  | "empty"
  | "shift_date"
  | "shift_time"
  | "shift_datetime"
  | "regex_replace"
  | "prefix"
  | "append"
  | "recompute_age"
  | "copy_from";

export type FieldId = "value" | "pattern" | "replacement" | "days" | "seconds" | "from_keyword";

export interface ActionSpec {
  id: ActionId;
  label: string;
  fields: FieldId[];
  /** True when the action transforms/sets a string we can preview. */
  previewable: boolean;
}

export const ACTIONS: ActionSpec[] = [
  { id: "set", label: "set", fields: ["value"], previewable: true },
  { id: "remove", label: "remove", fields: [], previewable: false },
  { id: "empty", label: "empty", fields: [], previewable: false },
  { id: "shift_date", label: "shift_date", fields: ["days"], previewable: false },
  { id: "shift_time", label: "shift_time", fields: ["seconds"], previewable: false },
  { id: "shift_datetime", label: "shift_datetime", fields: ["days", "seconds"], previewable: false },
  { id: "regex_replace", label: "regex_replace", fields: ["pattern", "replacement"], previewable: false },
  { id: "prefix", label: "prefix", fields: ["value"], previewable: true },
  { id: "append", label: "append", fields: ["value"], previewable: true },
  { id: "recompute_age", label: "recompute_age", fields: [], previewable: false },
  { id: "copy_from", label: "copy_from", fields: ["from_keyword"], previewable: false },
];

export const ACTION_BY_ID: Record<ActionId, ActionSpec> = Object.fromEntries(
  ACTIONS.map((a) => [a.id, a]),
) as Record<ActionId, ActionSpec>;

export type IdKind = "keyword" | "tag" | "path";

export interface TagRow {
  rid: string;
  idKind: IdKind;
  identifier: string;
  action: ActionId;
  value: string;
  pattern: string;
  replacement: string;
  days: string;
  seconds: string;
  fromKeyword: string;
}

export function newRow(partial: Partial<TagRow> = {}): TagRow {
  return {
    rid: Math.random().toString(36).slice(2, 9),
    idKind: "keyword",
    identifier: "",
    action: "set",
    value: "",
    pattern: "",
    replacement: "",
    days: "",
    seconds: "",
    fromKeyword: "",
    ...partial,
  };
}

export function defaultTagRows(): TagRow[] {
  return [
    newRow({ idKind: "keyword", identifier: "PatientID", action: "set", value: "{set}-{index+1:03d}" }),
    newRow({ idKind: "keyword", identifier: "InstanceNumber", action: "set", value: "{index+1}" }),
    newRow({ idKind: "keyword", identifier: "AccessionNumber", action: "regex_replace", pattern: "\\d", replacement: "0" }),
    newRow({ idKind: "keyword", identifier: "PatientBirthDate", action: "empty" }),
  ];
}

function num(s: string): number {
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? 0 : n;
}

/** Convert editor rows into an inline MutationSet spec for POST /api/jobs. */
export function rowsToMutationSet(name: string, rows: TagRow[]): import("./api").MutationSetSpec {
  const tags: import("./api").TagMutationSpec[] = [];
  for (const r of rows) {
    const id = r.identifier.trim();
    if (!id) continue;
    const spec: import("./api").TagMutationSpec = { action: r.action };
    if (r.idKind === "keyword") spec.keyword = id;
    else if (r.idKind === "tag") spec.tag = id;
    else spec.path = id;

    switch (r.action) {
      case "set":
        if (r.value.includes("{")) spec.value_template = r.value;
        else spec.value = r.value;
        break;
      case "prefix":
      case "append":
        spec.value = r.value;
        break;
      case "regex_replace":
        spec.pattern = r.pattern;
        spec.replacement = r.replacement;
        break;
      case "shift_date":
        spec.days = num(r.days);
        break;
      case "shift_time":
        spec.seconds = num(r.seconds);
        break;
      case "shift_datetime":
        if (r.days) spec.days = num(r.days);
        if (r.seconds) spec.seconds = num(r.seconds);
        break;
      case "copy_from":
        spec.from_keyword = r.fromKeyword;
        break;
    }
    tags.push(spec);
  }
  return { name, tags };
}

/** Reverse of rowsToMutationSet — turn a stored set back into editable rows. */
export function mutationSpecToRows(set: import("./api").MutationSetSpec): TagRow[] {
  return set.tags.map((t) => {
    const idKind: IdKind = t.path ? "path" : t.tag ? "tag" : "keyword";
    return newRow({
      idKind,
      identifier: t.path ?? t.tag ?? t.keyword ?? "",
      action: t.action as ActionId,
      value: t.value ?? t.value_template ?? "",
      pattern: t.pattern ?? "",
      replacement: t.replacement ?? "",
      days: t.days != null ? String(t.days) : "",
      seconds: t.seconds != null ? String(t.seconds) : "",
      fromKeyword: t.from_keyword ?? "",
    });
  });
}

export interface PreviewContext {
  index: number;
  total: number;
  set: string;
  source: Record<string, string>;
}

function pseudoUuid(index: number): string {
  let h = 0x811c9dc5 ^ index;
  let out = "";
  for (let i = 0; i < 32; i++) {
    h = Math.imul(h ^ (h >>> 15), 0x2545f491 + i);
    out += ((h >>> 28) & 0xf).toString(16);
  }
  return out;
}

/** Mini template resolver matching the engine's tokens, for live preview. */
export function resolveTemplate(tpl: string, ctx: PreviewContext): string {
  return tpl.replace(/\{([^}]+)\}/g, (_full, raw: string) => {
    const t = raw.trim();
    let m: RegExpExecArray | null;

    if ((m = /^index([+-]\d+)?(?::(.+))?$/.exec(t))) {
      const off = m[1] ? parseInt(m[1], 10) : 0;
      const val = ctx.index + off;
      const fmt = m[2];
      if (fmt) {
        const pad = /^0(\d+)d$/.exec(fmt);
        if (pad) return String(val).padStart(parseInt(pad[1], 10), "0");
      }
      return String(val);
    }
    if (t === "total") return String(ctx.total);
    if (t === "set") return ctx.set;
    if (t === "uuid") return pseudoUuid(ctx.index);
    if ((m = /^source\.([A-Za-z][A-Za-z0-9]*)(?:\[(-?\d*):(-?\d*)\])?$/.exec(t))) {
      let v = ctx.source[m[1]] ?? `<${m[1]}>`;
      if (m[2] !== undefined || m[3] !== undefined) {
        const s = m[2] ? parseInt(m[2], 10) : undefined;
        const e = m[3] ? parseInt(m[3], 10) : undefined;
        v = v.slice(s, e);
      }
      return v;
    }
    if (t.startsWith("env.")) return `$${t.slice(4)}`;
    return `{${raw}}`;
  });
}
