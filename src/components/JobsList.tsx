import * as React from "react";
import { Loader2, CircleCheck, CircleX, ChevronRight, TriangleAlert, RefreshCw, Trash2 } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { listJobs, deleteJob, type JobInfo, type JobState } from "../lib/api";

export function JobsList({ onOpen }: { onOpen: (job: JobInfo) => void }) {
  const [jobs, setJobs] = React.useState<JobInfo[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [confirm, setConfirm] = React.useState<JobInfo | null>(null);
  const [delOutput, setDelOutput] = React.useState(true);
  const [deleting, setDeleting] = React.useState(false);
  const [delErr, setDelErr] = React.useState("");

  const refresh = React.useCallback(() => {
    setLoading(true);
    setError("");
    listJobs()
      .then(setJobs)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(refresh, [refresh]);

  function askDelete(job: JobInfo) {
    setConfirm(job);
    setDelOutput(true);
    setDelErr("");
  }

  function doDelete() {
    if (!confirm) return;
    setDeleting(true);
    setDelErr("");
    deleteJob(confirm.id, delOutput)
      .then(() => {
        setDeleting(false);
        setConfirm(null);
        refresh();
      })
      .catch((e: Error) => {
        setDelErr(e.message);
        setDeleting(false);
      });
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-base font-medium">Jobs</h1>
        <Button variant="ghost" size="sm" onClick={refresh}>
          <RefreshCw className="size-4" /> Refresh
        </Button>
      </div>

      {error && (
        <div className="mb-3 flex items-center gap-2 text-sm text-danger">
          <TriangleAlert className="size-4" /> {error}
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="grid grid-cols-[120px_1fr_120px_110px_80px_140px_60px] gap-3 border-b border-border bg-muted/40 px-4 py-2 text-[11px] uppercase tracking-wide text-muted-foreground">
          <span>Job ID</span>
          <span>Name</span>
          <span>Scenario</span>
          <span>State</span>
          <span className="text-right">Files</span>
          <span>Created</span>
          <span></span>
        </div>

        {loading && (
          <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> loading…
          </div>
        )}

        {!loading &&
          jobs.map((j) => (
            <div
              key={j.id}
              role="button"
              tabIndex={0}
              onClick={() => onOpen(j)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onOpen(j);
                }
              }}
              className="grid w-full cursor-pointer grid-cols-[120px_1fr_120px_110px_80px_140px_60px] items-center gap-3 border-b border-border px-4 py-3 text-left text-sm transition-colors last:border-b-0 hover:bg-muted/40 focus-visible:outline-none focus-visible:bg-muted/40"
            >
              <span className="font-mono text-[13px] text-muted-foreground">{j.id.slice(0, 12)}</span>
              <span className="truncate text-[13px]">{j.request.name || "—"}</span>
              <span>
                {j.request.scenario ? (
                  <Badge variant="secondary">{j.request.scenario}</Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </span>
              <span>
                <StateBadge state={j.state} />
              </span>
              <span className="text-right font-mono text-[13px]">
                {j.progress.completed_files}/{j.progress.total_files}
              </span>
              <span className="text-[13px] text-muted-foreground">{fmtTime(j.created_at)}</span>
              <span className="flex items-center justify-end gap-1">
                <button
                  aria-label="Delete job"
                  title="Delete job"
                  onClick={(e) => {
                    e.stopPropagation();
                    askDelete(j);
                  }}
                  className="rounded-md p-1 text-muted-foreground hover:bg-danger/10 hover:text-danger"
                >
                  <Trash2 className="size-4" />
                </button>
                <ChevronRight className="size-4 text-muted-foreground" />
              </span>
            </div>
          ))}

        {!loading && jobs.length === 0 && !error && (
          <div className="px-4 py-3 text-sm text-muted-foreground">No jobs yet — start one from “New job”.</div>
        )}
      </Card>

      <Dialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent className="w-[460px] p-0">
          <div className="border-b border-border px-3.5 py-3">
            <DialogTitle>Delete job</DialogTitle>
          </div>
          <div className="space-y-3 px-3.5 py-3 text-sm">
            <p className="text-muted-foreground">
              Permanently remove <span className="font-mono">{confirm?.request.name || confirm?.id.slice(0, 12)}</span>{" "}
              from the database. This cannot be undone.
            </p>
            <label className="flex items-start gap-2 text-[13px]">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={delOutput}
                onChange={(e) => setDelOutput(e.target.checked)}
              />
              <span className="text-muted-foreground">
                Also delete the output folder (<span className="font-mono">{confirm?.request.output_path}</span>) and all
                files in it.
              </span>
            </label>
            {confirm && (confirm.state === "running" || confirm.state === "queued") && (
              <p className="text-[13px] text-warning">
                This job is {confirm.state}; deletion may be refused until it finishes.
              </p>
            )}
            {delErr && <p className="text-[13px] text-danger">{delErr}</p>}
          </div>
          <div className="flex justify-end gap-2 rounded-b-lg border-t border-border bg-secondary px-3.5 py-3">
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={doDelete} disabled={deleting}>
              {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function fmtTime(iso: string): string {
  try {
    const d = new Date(iso);
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  } catch {
    return "—";
  }
}

function StateBadge({ state }: { state: JobState }) {
  if (state === "running" || state === "queued")
    return (
      <Badge variant="info">
        <Loader2 className="size-3 animate-spin" /> {state}
      </Badge>
    );
  if (state === "completed")
    return (
      <Badge variant="success">
        <CircleCheck className="size-3" /> done
      </Badge>
    );
  return (
    <Badge variant="warning">
      <CircleX className="size-3" /> failed
    </Badge>
  );
}
