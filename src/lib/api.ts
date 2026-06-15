import { getApiConfig } from "./config";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const { baseUrl, apiKey } = getApiConfig();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init?.headers as Record<string, string>) ?? {}),
  };
  if (apiKey) headers["X-API-Key"] = apiKey;

  const res = await fetch(baseUrl + path, { ...init, headers });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = (await res.json()) as { detail?: string };
      if (body.detail) detail = body.detail;
    } catch {
      /* non-JSON error */
    }
    throw new Error(`${res.status} ${detail}`);
  }
  return (await res.json()) as T;
}

// ── Types (mirror the FastAPI schemas) ────────────────────────────────────────

export interface Health {
  status: string;
  version: string;
  environment: string;
  storage_root: string;
  auth_required: boolean;
}

export interface TemplateInfo {
  name: string;
  description: string;
  category: string;
  scenario_type: string;
  required_params: string[];
  optional_params: string[];
}

export interface BrowseEntry {
  name: string;
  is_dir: boolean;
}
export interface BrowseResponse {
  path: string;
  entries: BrowseEntry[];
}

export interface SeriesInfo {
  name: string;
  modality: string;
  count: number;
}
export interface ScanResponse {
  path: string;
  file_count: number;
  series: SeriesInfo[];
  study_count: number;
  modalities: string[];
  shared_frame_of_reference: boolean;
}

export interface MutationSetSummary {
  name: string;
  description: string | null;
  purpose: string | null;
  tag_count: number;
  org_root: string | null;
}
export interface ValidateResponse {
  valid: boolean;
  sets: MutationSetSummary[];
  errors: string[];
}

export type JobState = "queued" | "running" | "completed" | "failed";

export interface JobProgress {
  total_files: number;
  completed_files: number;
  total_sets: number;
  completed_sets: number;
  current_set: string | null;
  current_file: string | null;
}

export interface RunSummary {
  total_success: number;
  total_failure: number;
  total_mutation_failures: number;
  sets: { name: string; output_dir: string; success: number; failure: number; mutation_failures: number }[];
}

export interface JobInfo {
  id: string;
  state: JobState;
  created_at: string;
  updated_at: string;
  request: JobRequest;
  progress: JobProgress;
  result: RunSummary | null;
  error: string | null;
}

export interface TagMutationSpec {
  keyword?: string;
  tag?: string;
  path?: string;
  action: string;
  value?: string;
  value_template?: string;
  days?: number;
  seconds?: number;
  pattern?: string;
  replacement?: string;
  from_keyword?: string;
  to_keyword?: string;
}

export interface MutationSetSpec {
  name: string;
  description?: string;
  tags: TagMutationSpec[];
}

export interface JobRequest {
  input_path: string;
  output_path: string;
  name?: string | null;
  description?: string | null;
  scenario?: string | null;
  config_path?: string;
  template?: { name: string; params: Record<string, unknown> };
  mutation_sets?: MutationSetSpec[];
  scenario_spec?: { type: string; params: Record<string, unknown> };
  overwrite?: boolean;
  seed?: number | null;
}

// ── Endpoints ─────────────────────────────────────────────────────────────────

export const getHealth = () => req<Health>("/api/health");
export const listTemplates = () => req<TemplateInfo[]>("/api/templates");
export const browse = (path: string) =>
  req<BrowseResponse>("/api/browse", { method: "POST", body: JSON.stringify({ path }) });
export const scan = (path: string) =>
  req<ScanResponse>("/api/scan", { method: "POST", body: JSON.stringify({ path }) });
export const validateConfig = (configPath: string) =>
  req<ValidateResponse>("/api/validate", { method: "POST", body: JSON.stringify({ config_path: configPath }) });
export const listJobs = () => req<JobInfo[]>("/api/jobs");
export const getJob = (id: string) => req<JobInfo>(`/api/jobs/${id}`);
export const submitJob = (body: JobRequest) =>
  req<JobInfo>("/api/jobs", { method: "POST", body: JSON.stringify(body) });

/**
 * Stream a job's progress over SSE using fetch (native EventSource can't send the
 * X-API-Key header). Returns an abort function.
 */
export interface SavedTemplate {
  id: string;
  name: string;
  description: string | null;
  scenario: string | null;
  input_path: string | null;
  config_path?: string | null;
  mutation_sets?: MutationSetSpec[] | null;
  scenario_spec?: { type: string; params: Record<string, unknown> } | null;
  created_at: string;
}

export interface SaveTemplateRequest {
  name: string;
  description?: string;
  scenario?: string;
  input_path?: string;
  config_path?: string;
  mutation_sets?: MutationSetSpec[];
  scenario_spec?: { type: string; params: Record<string, unknown> };
}

export const listSavedTemplates = () => req<SavedTemplate[]>("/api/saved-templates");
export const saveTemplate = (body: SaveTemplateRequest) =>
  req<SavedTemplate>("/api/saved-templates", { method: "POST", body: JSON.stringify(body) });

export async function deleteSavedTemplate(id: string): Promise<void> {
  const { baseUrl, apiKey } = getApiConfig();
  const headers: Record<string, string> = {};
  if (apiKey) headers["X-API-Key"] = apiKey;
  const res = await fetch(`${baseUrl}/api/saved-templates/${id}`, { method: "DELETE", headers });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
}

export async function deleteJob(id: string, deleteOutput = true): Promise<{ deleted: boolean; output_removed: boolean }> {
  return req<{ deleted: boolean; output_removed: boolean }>(
    `/api/jobs/${id}?delete_output=${deleteOutput}`,
    { method: "DELETE" },
  );
}

export function streamJob(id: string, onEvent: (info: JobInfo) => void): () => void {
  const { baseUrl, apiKey } = getApiConfig();
  const ctrl = new AbortController();

  (async () => {
    const headers: Record<string, string> = {};
    if (apiKey) headers["X-API-Key"] = apiKey;
    const res = await fetch(`${baseUrl}/api/jobs/${id}/events`, { headers, signal: ctrl.signal });
    if (!res.body) return;
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (line.startsWith("data:")) {
          try {
            onEvent(JSON.parse(line.slice(5).trim()) as JobInfo);
          } catch {
            /* ignore keep-alive / partial */
          }
        }
      }
    }
  })().catch(() => {
    /* aborted or network error */
  });

  return () => ctrl.abort();
}
