const LS_KEY = "dicomForge.apiConfig";

export interface ApiConfig {
  baseUrl: string;
  apiKey: string;
}

const DEFAULT: ApiConfig = {
  baseUrl: (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8472",
  apiKey: "",
};

export function getApiConfig(): ApiConfig {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return { ...DEFAULT, ...(JSON.parse(raw) as Partial<ApiConfig>) };
  } catch {
    /* ignore malformed storage */
  }
  return DEFAULT;
}

export function setApiConfig(cfg: ApiConfig): void {
  localStorage.setItem(LS_KEY, JSON.stringify(cfg));
}

/** Container-side storage root, shown in paths. Mirrors DICOMFORGE_STORAGE_ROOT. */
export const STORAGE_ROOT = "/mnt/storage";
