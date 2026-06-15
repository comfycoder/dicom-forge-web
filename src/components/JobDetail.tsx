import * as React from "react";
import { Loader2, Check, File as FileIcon, CircleCheck, CircleX, ArrowLeft, TriangleAlert, RotateCw, Copy, Bookmark, Trash2 } from "lucide-react";
import { Card, Metric } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { Progress } from "./ui/progress";
import { streamJob, getJob, submitJob, saveTemplate, deleteJob, type JobInfo, type JobRequest, type JobState } from "../lib/api";

interface JobDetailProps {
  jobId: string;
  onBack?: () => void;
  onOpenJob: (id: string) => void;
  onEdit: (req: JobRequest) => void;
}

export function JobDetail({ jobId, onBack, onOpenJob, onEdit }: JobDetailProps) {
  const [job, setJob] = React.useState<JobInfo | null>(null);
  const [error, setError] = React.useState("");
  const [rerunning, setRerunning] = React.useState(false);
  const [saveOpen, setSaveOpen] = React.useState(false);
  const [tplName, setTplName] = React.useState("");
  const [tplDesc, setTplDesc] = React.useState("");
  const [pinInput, setPinInput] = React.useState(false);
  const [savingTpl, setSavingTpl] = React.useState(false);
  const [tplErr, setTplErr] = React.useState("");
  const [delOpen, setDelOpen] = React.useState(false);
  const [delOutput, setDelOutput] = React.useState(true);
  const [deleting, setDeleting] = React.useState(false);
  const [delErr, setDelErr] = React.useState("");
  const log = React.useRef<string[]>([]);

  function rerun() {
    if (!job) return;
    setRerunning(true);
    submitJob({ ...job.request, overwrite: true })
      .then((nj) => onOpenJob(nj.id))
      .catch(() => setRerunning(false));
  }

  function openSave() {
    if (!job) return;
    setTplName(job.request.name || job.request.scenario || "");
    setTplDesc("");
    setPinInput(false);
    setTplErr("");
    setSaveOpen(true);
  }

  function saveAsTemplate() {
    if (!job) return;
    const r = job.request;
    setSavingTpl(true);
    setTplErr("");
    saveTemplate({
      name: tplName.trim() || r.name || r.scenario || "template",
      description: tplDesc.trim() || undefined,
      scenario: r.scenario ?? undefined,
      input_path: pinInput ? r.input_path : undefined,
      config_path: r.config_path,
      mutation_sets: r.mutation_sets,
      scenario_spec: r.scenario_spec,
    })
      .then(() => {
        setSavingTpl(false);
        setSaveOpen(false);
      })
      .catch((e: Error) => {
        setTplErr(e.message);
        setSavingTpl(false);
      });
  }

  function removeJob() {
    setDeleting(true);
    setDelErr("");
    deleteJob(jobId, delOutput)
      .then(() => {
        setDeleting(false);
        setDelOpen(false);
        onBack?.();
      })
      .catch((e: Error) => {
        setDelErr(e.message);
        setDeleting(false);
      });
  }

  React.useEffect(() => {
    log.current = [];
    setJob(null);
    setError("");
    setRerunning(false);
    // Seed with a one-shot fetch in case the stream is slow to first byte.
    getJob(jobId).then(setJob).catch((e: Error) => setError(e.message));
    const stop = streamJob(jobId, (info) => {
      const f = info.progress.current_file;
      if (f && log.current[0] !== f) log.current = [f, ...log.current].slice(0, 12);
      setError("");
      setJob(info);
    });
    return stop;
  }, [jobId]);

  if (!job) {
    return error ? (
      <div className="flex items-center gap-2 text-sm text-danger">
        <TriangleAlert className="size-4" /> {error}
      </div>
    ) : (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> connecting to job {jobId.slice(0, 12)}…
      </div>
    );
  }

  const p = job.progress;
  const done = job.state === "completed" || job.state === "failed";
  const overallPct = p.total_files ? (p.completed_files / p.total_files) * 100 : 0;
  const setSize = p.total_sets ? p.total_files / p.total_sets : p.total_files || 1;
  const setPct = setSize ? ((p.completed_files % setSize) / setSize) * 100 : 0;

  return (
    <div>
      <div className="mb-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {onBack && (
            <button aria-label="Back to jobs" onClick={onBack} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-4" />
            </button>
          )}
          <h1 className="font-mono text-base font-medium">{job.request.name || job.id.slice(0, 12)}</h1>
          <StateBadge state={job.state} />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">updated {fmtTime(job.updated_at)}</span>
          <Button variant="outline" size="sm" onClick={rerun} disabled={rerunning}>
            {rerunning ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCw className="size-3.5" />} Run again
          </Button>
          <Button variant="outline" size="sm" onClick={() => onEdit(job.request)}>
            <Copy className="size-3.5" /> Duplicate
          </Button>
          <Button variant="outline" size="sm" onClick={openSave}>
            <Bookmark className="size-3.5" /> Save as template
          </Button>
          <Button variant="destructive" size="sm" onClick={() => { setDelErr(""); setDelOutput(true); setDelOpen(true); }}>
            <Trash2 className="size-3.5" /> Delete
          </Button>
        </div>
      </div>

      <Dialog open={delOpen} onOpenChange={setDelOpen}>
        <DialogContent className="w-[460px] p-0">
          <div className="border-b border-border px-3.5 py-3">
            <DialogTitle>Delete job</DialogTitle>
          </div>
          <div className="space-y-3 px-3.5 py-3 text-sm">
            <p className="text-muted-foreground">
              Permanently remove <span className="font-mono">{job.request.name || job.id.slice(0, 12)}</span> from the
              database. This cannot be undone.
            </p>
            <label className="flex items-start gap-2 text-[13px]">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={delOutput}
                onChange={(e) => setDelOutput(e.target.checked)}
              />
              <span className="text-muted-foreground">
                Also delete the output folder (<span className="font-mono">{job.request.output_path}</span>) and all files
                in it.
              </span>
            </label>
            {delErr && <p className="text-[13px] text-danger">{delErr}</p>}
          </div>
          <div className="flex justify-end gap-2 rounded-b-lg border-t border-border bg-secondary px-3.5 py-3">
            <Button variant="ghost" onClick={() => setDelOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={removeJob} disabled={deleting}>
              {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="w-[460px] p-0">
          <div className="border-b border-border px-3.5 py-3">
            <DialogTitle>Save as template</DialogTitle>
          </div>
          <div className="space-y-3 px-3.5 py-3">
            <div>
              <label className="mb-1.5 block text-sm text-muted-foreground">Name</label>
              <Input value={tplName} onChange={(e) => setTplName(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-muted-foreground">Description (optional)</label>
              <Input value={tplDesc} onChange={(e) => setTplDesc(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <input type="checkbox" checked={pinInput} onChange={(e) => setPinInput(e.target.checked)} />
              Pin input path (<span className="font-mono">{job.request.input_path}</span>)
            </label>
            <p className="text-[12px] text-muted-foreground">
              Saves the mutation recipe{pinInput ? " and the input path" : ""}. Output is chosen fresh on each run.
            </p>
            {tplErr && <p className="text-[13px] text-danger">{tplErr}</p>}
          </div>
          <div className="flex justify-end gap-2 rounded-b-lg border-t border-border bg-secondary px-3.5 py-3">
            <Button variant="ghost" onClick={() => setSaveOpen(false)}>
              Cancel
            </Button>
            <Button variant="default" onClick={saveAsTemplate} disabled={savingTpl}>
              {savingTpl ? <Loader2 className="size-4 animate-spin" /> : <Bookmark className="size-4" />} Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-[1fr_200px] gap-4">
        <div>
          <div className="mb-1.5 flex justify-between text-[13px]">
            <span className="text-muted-foreground">Overall</span>
            <span className="font-mono">
              {p.completed_files} / {p.total_files} files · {Math.round(overallPct)}%
            </span>
          </div>
          <Progress value={overallPct} className="mb-3.5" />

          <div className="mb-1.5 flex justify-between text-[13px]">
            <span className="text-muted-foreground">
              Set {Math.min(p.completed_sets + 1, p.total_sets || 1)} of {p.total_sets || 1}
              {p.current_set && <span className="font-mono"> — {p.current_set}</span>}
            </span>
          </div>
          <Progress value={setPct} className="mb-2 h-1.5" indicatorClassName="bg-success" />
          {p.current_file && (
            <div className="mb-3.5 flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
              <FileIcon className="size-3.5" />
              {p.current_file}
            </div>
          )}

          {job.error && (
            <div className="mb-3 flex items-start gap-2 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-[13px] text-danger">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" /> {job.error}
            </div>
          )}

          <div className="mb-1.5 text-xs text-muted-foreground">Recent files</div>
          <Card className="px-2.5 py-2 font-mono text-xs leading-relaxed">
            {log.current.length > 0 ? (
              log.current.map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Check className="size-3 text-success" />
                  <span className="flex-1 truncate text-secondary-foreground/90">{f}</span>
                </div>
              ))
            ) : done ? (
              job.result ? (
                <div className="flex items-center gap-2">
                  <Check className="size-3 text-success" />
                  <span className="text-secondary-foreground/90">
                    {job.result.total_success} file{job.result.total_success === 1 ? "" : "s"} processed
                    {job.result.total_failure > 0 && `, ${job.result.total_failure} failed`}
                  </span>
                </div>
              ) : (
                <div className="text-muted-foreground">no file activity recorded</div>
              )
            ) : (
              <div className="text-muted-foreground">waiting for progress…</div>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="grid grid-cols-2 gap-2">
            <Metric label="Files" value={`${p.completed_files}/${p.total_files}`} />
            <Metric label="Sets" value={`${p.completed_sets}/${p.total_sets}`} />
          </div>
          {job.result && (
            <Card className="px-3 py-2.5">
              <div className="mb-2 text-xs text-muted-foreground">Result</div>
              <div className="space-y-1.5 text-[13px]">
                <Row k="Succeeded" v={job.result.total_success} good />
                <Row k="Failed" v={job.result.total_failure} bad={job.result.total_failure > 0} />
                <Row k="Mut. failures" v={job.result.total_mutation_failures} bad={job.result.total_mutation_failures > 0} />
                <Row k="Sets" v={job.result.sets.length} />
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ k, v, good, bad }: { k: string; v: number; good?: boolean; bad?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{k}</span>
      <span className={good ? "text-success" : bad ? "text-danger" : ""}>{v}</span>
    </div>
  );
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-GB", { hour12: false });
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
        <CircleCheck className="size-3" /> completed
      </Badge>
    );
  return (
    <Badge variant="warning">
      <CircleX className="size-3" /> failed
    </Badge>
  );
}
