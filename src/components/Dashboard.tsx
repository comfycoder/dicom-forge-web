import * as React from "react";
import { Plus, ChevronRight, Loader2, TriangleAlert, CircleCheck, CircleX, RefreshCw } from "lucide-react";
import { Card, Metric } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { listJobs, type JobInfo, type JobState } from "../lib/api";

export function Dashboard({ onNew, onOpenJob }: { onNew: () => void; onOpenJob: (id: string) => void }) {
  const [jobs, setJobs] = React.useState<JobInfo[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const refresh = React.useCallback(() => {
    setLoading(true);
    setError("");
    listJobs()
      .then(setJobs)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(refresh, [refresh]);

  const running = jobs.filter((j) => j.state === "running" || j.state === "queued").length;
  const failures = jobs.filter((j) => j.state === "failed").length;
  const filesForged = jobs.reduce((n, j) => n + (j.result?.total_success ?? j.progress.completed_files), 0);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-base font-medium">Dashboard</h1>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={refresh}>
            <RefreshCw className="size-4" /> Refresh
          </Button>
          <Button variant="default" size="sm" onClick={onNew}>
            <Plus className="size-4" /> New job
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-3 flex items-center gap-2 text-sm text-danger">
          <TriangleAlert className="size-4" /> {error}
        </div>
      )}

      <div className="mb-5 grid grid-cols-4 gap-3">
        <Metric label="Total jobs" value={jobs.length} />
        <Metric label="Running" value={running} />
        <Metric label="Files forged" value={filesForged.toLocaleString()} />
        <Metric label="Failures" value={failures} accent={failures > 0 ? "danger" : undefined} />
      </div>

      <div className="mb-2 text-sm text-muted-foreground">Recent jobs</div>
      <Card className="overflow-hidden">
        {loading && (
          <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> loading…
          </div>
        )}
        {!loading &&
          jobs.slice(0, 5).map((j) => (
            <button
              key={j.id}
              onClick={() => onOpenJob(j.id)}
              className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left text-sm transition-colors last:border-b-0 hover:bg-muted/40"
            >
              <span className="flex-1 truncate font-mono text-[13px]">{j.request.name || j.id.slice(0, 12)}</span>
              {j.request.scenario && <Badge variant="secondary">{j.request.scenario}</Badge>}
              <StateBadge state={j.state} />
              <span className="w-28 text-right font-mono text-[13px] text-muted-foreground">
                {j.progress.completed_files}/{j.progress.total_files} files
              </span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </button>
          ))}
        {!loading && jobs.length === 0 && !error && (
          <div className="px-4 py-3 text-sm text-muted-foreground">No jobs yet — start one from “New job”.</div>
        )}
      </Card>
    </div>
  );
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
