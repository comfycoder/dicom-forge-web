import * as React from "react";
import { Check, ArrowLeft, ArrowRight, Play, X, Loader2, TriangleAlert } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { FolderField } from "./FolderField";
import { TagEditor } from "./TagEditor";
import { ScanSummaryCard } from "./ScanSummaryCard";
import { ValidationPanel } from "./ValidationPanel";
import { ScenarioConfig, defaultScenarioParams, scenarioSummary, type Params } from "./ScenarioConfig";
import { cn } from "../lib/utils";
import { SCENARIOS } from "../lib/scenarios";
import { submitJob, type JobRequest } from "../lib/api";
import { defaultTagRows, mutationSpecToRows, rowsToMutationSet, type TagRow } from "../lib/mutations";

const CONFIG_PATH = "configs/anonymize.yaml";
const OUTPUT_PREFIX = "outputs/";

/** "My PET/CT Run" → "my_pet_ct_run" — lowercase words joined by underscores. */
function slugify(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const SPEC_SCENARIOS = new Set([
  "cohort",
  "deidentify",
  "longitudinal",
  "malformed",
  "multi_series",
  "pacs_stress",
]);

interface Props {
  scenario: string;
  initial?: JobRequest;
  onCancel: () => void;
  onSubmit: (jobId: string) => void;
}

export function Wizard({ scenario, initial, onCancel, onSubmit }: Props) {
  const usesSpec = SPEC_SCENARIOS.has(scenario);
  const steps = usesSpec
    ? ["Details", "Source", "Configure", "Output", "Review"]
    : ["Details", "Source", "Tags", "Output", "Review"];

  const [step, setStep] = React.useState(0);
  const [title, setTitle] = React.useState(initial?.name ?? "");
  const [description, setDescription] = React.useState(initial?.description ?? "");
  const [input, setInput] = React.useState(initial?.input_path ?? "dicoms/sample_petct");
  const [output, setOutput] = React.useState(initial?.output_path ?? "");
  // Once the user edits the output folder by hand, stop auto-deriving it from the title.
  const [outputTouched, setOutputTouched] = React.useState(Boolean(initial?.output_path));
  const [params, setParams] = React.useState<Params>(() =>
    defaultScenarioParams(scenario, initial?.scenario_spec?.params as Params | undefined),
  );
  const [rows, setRows] = React.useState<TagRow[]>(() =>
    initial?.mutation_sets?.[0] ? mutationSpecToRows(initial.mutation_sets[0]) : defaultTagRows(),
  );
  const [source, setSource] = React.useState<"inline" | "config">(initial?.config_path ? "config" : "inline");
  const [configPath] = React.useState(initial?.config_path ?? CONFIG_PATH);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitErr, setSubmitErr] = React.useState("");

  const meta = SCENARIOS.find((s) => s.type === scenario);
  const last = steps.length - 1;
  const slug = slugify(title);
  const derivedOutput = slug ? OUTPUT_PREFIX + slug : "";
  const finalOutput = (outputTouched ? output : derivedOutput) || OUTPUT_PREFIX + (slug || scenario);

  function changeTitle(v: string) {
    setTitle(v);
    if (!outputTouched) {
      const s = slugify(v);
      setOutput(s ? OUTPUT_PREFIX + s : "");
    }
  }

  function changeOutput(v: string) {
    setOutput(v);
    setOutputTouched(true);
  }

  function run() {
    setSubmitting(true);
    setSubmitErr("");
    const base = {
      input_path: input,
      output_path: finalOutput,
      name: title.trim() || slug || scenario,
      description: description.trim() || undefined,
      scenario,
      overwrite: true,
      seed: 123,
    };
    const body = usesSpec
      ? { ...base, scenario_spec: { type: scenario, params } }
      : source === "inline"
        ? { ...base, mutation_sets: [rowsToMutationSet("ui_inline", rows)] }
        : { ...base, config_path: configPath };
    submitJob(body)
      .then((j) => onSubmit(j.id))
      .catch((e: Error) => {
        setSubmitErr(e.message);
        setSubmitting(false);
      });
  }

  const cur = steps[step];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h1 className="text-base font-medium">{meta?.title ?? scenario}</h1>
          <Badge variant="secondary">{scenario}</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="size-4" /> Cancel
        </Button>
      </div>

      <div className="mb-5 flex items-center gap-1">
        {steps.map((s, i) => (
          <React.Fragment key={s}>
            <button
              onClick={() => i < step && setStep(i)}
              className={cn(
                "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px]",
                i === step ? "bg-accent text-accent-foreground" : "text-muted-foreground",
                i < step && "hover:bg-muted",
              )}
            >
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full text-[11px]",
                  i < step ? "bg-success text-background" : i === step ? "bg-primary text-primary-foreground" : "bg-muted",
                )}
              >
                {i < step ? <Check className="size-3" /> : i + 1}
              </span>
              {s}
            </button>
            {i < last && <div className="h-px w-4 bg-border" />}
          </React.Fragment>
        ))}
      </div>

      <Card className="mb-4 px-5 py-5">
        {cur === "Details" && (
          <div className="max-w-xl space-y-4">
            <div>
              <label className="mb-1.5 block text-sm text-muted-foreground">Title</label>
              <Input
                value={title}
                onChange={(e) => changeTitle(e.target.value)}
                placeholder="e.g. PET/CT anonymization run"
                autoFocus
              />
              <p className="mt-1.5 text-[12px] text-muted-foreground">
                Output folder:{" "}
                <span className="font-mono text-secondary-foreground/90">{finalOutput}</span>
                {!outputTouched && " (derived from the title; editable in the Output step)"}
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-muted-foreground">Description (optional)</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this run for?"
              />
            </div>
          </div>
        )}

        {cur === "Source" && (
          <div className="max-w-xl space-y-4">
            <FolderField label="Source study" value={input} onChange={setInput} />
            <ScanSummaryCard path={input} />
          </div>
        )}

        {cur === "Configure" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{meta?.description}</p>
            <ScenarioConfig scenario={scenario} params={params} onChange={setParams} />
          </div>
        )}

        {cur === "Tags" && <TagEditor rows={rows} onChange={setRows} />}

        {cur === "Output" && (
          <div className="max-w-xl space-y-4">
            <FolderField label="Output folder" value={finalOutput} onChange={changeOutput} allowCreate />
            <p className="text-[12px] text-muted-foreground">
              Defaults to <span className="font-mono">{OUTPUT_PREFIX + (slug || scenario)}</span>, derived from the title.
            </p>
            <div className="flex items-center gap-4 text-[13px] text-muted-foreground">
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked /> Overwrite existing
              </label>
              <span className="font-mono">seed: 123</span>
            </div>
          </div>
        )}

        {cur === "Review" && (
          <div className="space-y-3 text-sm">
            <Row k="Title" v={title.trim() || slug || scenario} />
            {description.trim() && <Row k="Description" v={description.trim()} />}
            <Row k="Scenario" v={meta?.title ?? scenario} />
            <Row k="Source" v={input} mono />
            <Row k="Output" v={finalOutput} mono />

            {usesSpec ? (
              <p className="text-[13px] text-muted-foreground">{scenarioSummary(scenario, params)}</p>
            ) : (
              <>
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-muted-foreground">Run from:</span>
                  <div className="inline-flex overflow-hidden rounded-md border border-border">
                    <button
                      onClick={() => setSource("inline")}
                      className={cn("px-3 py-1 text-[13px]", source === "inline" ? "bg-accent text-accent-foreground" : "hover:bg-muted")}
                    >
                      Inline tags
                    </button>
                    <button
                      onClick={() => setSource("config")}
                      className={cn("border-l border-border px-3 py-1 text-[13px]", source === "config" ? "bg-accent text-accent-foreground" : "hover:bg-muted")}
                    >
                      Config file
                    </button>
                  </div>
                </div>
                {source === "inline" ? (
                  <p className="text-[13px] text-muted-foreground">
                    Submits {rows.filter((r) => r.identifier.trim()).length} inline tag mutation(s) from the Tags step.
                  </p>
                ) : (
                  <>
                    <Row k="Config" v={configPath} mono />
                    <ValidationPanel configPath={configPath} />
                  </>
                )}
              </>
            )}

            {submitErr && (
              <div className="flex items-start gap-2 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-[13px] text-danger">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" /> {submitErr}
              </div>
            )}
          </div>
        )}
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          <ArrowLeft className="size-4" /> Back
        </Button>
        {step < last ? (
          <Button variant="default" onClick={() => setStep((s) => Math.min(last, s + 1))}>
            Next <ArrowRight className="size-4" />
          </Button>
        ) : (
          <Button variant="default" onClick={run} disabled={submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />} Run job
          </Button>
        )}
      </div>
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex justify-between border-b border-border pb-2.5">
      <span className="text-muted-foreground">{k}</span>
      <span className={mono ? "font-mono text-[13px]" : ""}>{v}</span>
    </div>
  );
}
