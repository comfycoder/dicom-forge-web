import * as React from "react";
import {
  Database,
  ChevronRight,
  ArrowUp,
  Folder,
  FolderPlus,
  ArrowRight,
  Home,
  Clock,
  Loader2,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { ClearableInput } from "./ui/clearable-input";
import { cn } from "../lib/utils";
import { STORAGE_ROOT } from "../lib/config";
import { browse, type BrowseEntry } from "../lib/api";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allowCreate?: boolean;
  onSelect: (relativePath: string) => void;
}

const QUICK: { label: string; parts: string[]; icon?: React.ComponentType<{ className?: string }> }[] = [
  { label: "root", parts: [], icon: Home },
  { label: "dicoms", parts: ["dicoms"] },
  { label: "outputs", parts: ["outputs"] },
  { label: "configs", parts: ["configs"], icon: Clock },
];

export function StorageFolderBrowser({ open, onOpenChange, allowCreate = true, onSelect }: Props) {
  const [parts, setParts] = React.useState<string[]>([]);
  const [selected, setSelected] = React.useState<string[] | null>(null);
  const [pathInput, setPathInput] = React.useState("");
  const [newName, setNewName] = React.useState("");
  const [entries, setEntries] = React.useState<BrowseEntry[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const load = React.useCallback((segs: string[]) => {
    setLoading(true);
    setError("");
    browse(segs.join("/"))
      .then((r) => setEntries(r.entries.filter((e) => e.is_dir)))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    if (open) load(parts);
  }, [open, parts, load]);

  const selectedRel = selected ? selected.join("/") : "";

  function goToPath() {
    const rel = pathInput.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
    const segs = rel ? rel.split("/").filter(Boolean) : [];
    if (segs.some((s) => s === "..")) {
      setError("Path may not contain '..'.");
      return;
    }
    setParts(segs);
    setSelected(segs.length ? segs : null);
  }

  function createFolder() {
    const name = newName.trim();
    if (!name) return;
    if (name === "." || name === ".." || /[\\/]/.test(name)) {
      setError("Folder name must be a single name, with no path separators.");
      return;
    }
    // The output folder is created by the job run; here we just select the path.
    setSelected([...parts, name]);
    setNewName("");
    setError("");
  }

  function confirm() {
    if (selected) {
      onSelect(selectedRel);
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[560px] p-0">
        <div className="flex items-center justify-between border-b border-border px-3.5 py-3">
          <DialogTitle>Select folder</DialogTitle>
        </div>

        <div className="px-3.5 py-3">
          <div className="mb-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Database className="size-3.5" />
            <span>storage root</span>
            <span className="font-mono text-secondary-foreground/80">{STORAGE_ROOT}</span>
          </div>

          <div className="mb-2.5 flex flex-wrap items-center gap-1.5 font-mono text-[13px]">
            <button className="text-muted-foreground hover:text-foreground" onClick={() => { setParts([]); setSelected(null); }}>
              storage
            </button>
            {parts.map((p, i) => (
              <React.Fragment key={i}>
                <ChevronRight className="size-3.5 text-muted-foreground/60" />
                <button
                  className={cn(i === parts.length - 1 ? "font-medium" : "text-muted-foreground hover:text-foreground")}
                  onClick={() => setParts(parts.slice(0, i + 1))}
                >
                  {p}
                </button>
              </React.Fragment>
            ))}
          </div>

          <div className="mb-1.5 flex gap-2">
            <ClearableInput
              value={pathInput}
              onChange={(e) => setPathInput(e.target.value)}
              onClear={() => setPathInput("")}
              onKeyDown={(e) => e.key === "Enter" && goToPath()}
              placeholder="Type or paste a path, then Enter"
              aria-label="Path relative to storage root"
              className="font-mono text-[13px]"
            />
            <Button onClick={goToPath} className="shrink-0">
              <ArrowRight className="size-4" /> Go
            </Button>
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            <span className="self-center text-[11px] text-muted-foreground">quick:</span>
            {QUICK.map(({ label, parts: qp, icon: Icon }) => (
              <button
                key={label}
                onClick={() => { setParts(qp); setSelected(qp.length ? qp : null); }}
                className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground/80 hover:text-foreground"
              >
                {Icon ? <Icon className="size-3" /> : null}
                {label}
              </button>
            ))}
          </div>

          <div className="mb-2.5 min-h-[150px] overflow-hidden rounded-md border border-border">
            {parts.length > 0 && (
              <button
                onClick={() => { const up = parts.slice(0, -1); setParts(up); setSelected(up.length ? up : null); }}
                className="flex w-full items-center gap-2.5 border-b border-border px-3 py-2 text-[13px] text-muted-foreground hover:bg-muted"
              >
                <ArrowUp className="size-[15px]" /> ..
              </button>
            )}
            {loading ? (
              <div className="flex items-center gap-2 px-3 py-3 text-[13px] text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> loading…
              </div>
            ) : (
              entries.map((e) => {
                const isSelected = selected?.length === parts.length + 1 && selected[parts.length] === e.name;
                return (
                  <button
                    key={e.name}
                    onClick={() => setSelected([...parts, e.name])}
                    onDoubleClick={() => setParts([...parts, e.name])}
                    className={cn(
                      "flex w-full items-center gap-2.5 border-b border-border px-3 py-2 text-[13px] last:border-b-0",
                      isSelected ? "bg-accent" : "hover:bg-muted",
                    )}
                  >
                    <Folder className={cn("size-[15px]", isSelected ? "text-accent-foreground" : "text-muted-foreground")} />
                    <span className={cn("flex-1 text-left", isSelected && "text-accent-foreground")}>{e.name}</span>
                    {isSelected && <span className="font-mono text-[11px] text-accent-foreground">selected</span>}
                  </button>
                );
              })
            )}
            {!loading && entries.length === 0 && !error && (
              <div className="px-3 py-2 text-[13px] text-muted-foreground">no subfolders</div>
            )}
          </div>

          {allowCreate && (
            <div className="flex gap-2">
              <ClearableInput
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onClear={() => setNewName("")}
                onKeyDown={(e) => e.key === "Enter" && createFolder()}
                placeholder="New subfolder name (created on run)"
                aria-label="New subfolder name"
                className="text-[13px]"
              />
              <Button onClick={createFolder} className="shrink-0">
                <FolderPlus className="size-4" /> Create
              </Button>
            </div>
          )}

          {error && <p className="mt-2 text-xs text-danger">{error}</p>}
        </div>

        <div className="flex items-center justify-between rounded-b-lg border-t border-border bg-secondary px-3.5 py-3">
          <span className="text-xs text-muted-foreground">
            Selected <span className="font-mono text-foreground">{selectedRel || "—"}</span>
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button variant="default" onClick={confirm} disabled={!selected}>
              Select
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
