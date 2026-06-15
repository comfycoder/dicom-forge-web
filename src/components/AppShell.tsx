import * as React from "react";
import {
  Flame,
  LayoutDashboard,
  Plus,
  ListChecks,
  Layers,
  Settings,
  Database,
  Moon,
  Sun,
} from "lucide-react";
import { Badge } from "./ui/badge";
import { cn } from "../lib/utils";
import { STORAGE_ROOT } from "../lib/config";
import { getHealth, type Health } from "../lib/api";

type NavKey = "dashboard" | "new" | "jobs" | "templates" | "settings";

const NAV: { key: NavKey; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { key: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { key: "new", icon: Plus, label: "New job" },
  { key: "jobs", icon: ListChecks, label: "Jobs" },
  { key: "templates", icon: Layers, label: "Templates" },
  { key: "settings", icon: Settings, label: "Settings" },
];

interface AppShellProps {
  active: NavKey;
  onNavigate: (key: NavKey) => void;
  breadcrumb: string;
  children: React.ReactNode;
}

export function AppShell({ active, onNavigate, breadcrumb, children }: AppShellProps) {
  const [dark, setDark] = React.useState(false);
  const [health, setHealth] = React.useState<Health | null>(null);
  const [online, setOnline] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  // Poll the backend so the header reflects the real environment and live connection state.
  React.useEffect(() => {
    let cancelled = false;
    const check = () =>
      getHealth()
        .then((h) => !cancelled && (setHealth(h), setOnline(true)))
        .catch(() => !cancelled && setOnline(false));
    check();
    const id = setInterval(check, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const storageRoot = health?.storage_root ?? STORAGE_ROOT;

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border bg-card px-3.5 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5 text-sm">
          <Flame className="size-[18px] text-primary" />
          <span className="font-medium">DICOM Forge</span>
          <span className="text-muted-foreground/60">/</span>
          <span className="truncate text-muted-foreground">{breadcrumb}</span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {online === false ? (
            <Badge variant="danger">
              <span className="size-[7px] rounded-full bg-danger" />
              disconnected
            </Badge>
          ) : online === null ? (
            <Badge variant="secondary">
              <span className="size-[7px] rounded-full bg-muted-foreground" />
              connecting…
            </Badge>
          ) : (
            <Badge variant="success">
              <span className="size-[7px] rounded-full bg-success" />
              {health?.environment ?? "Unknown"} · connected
            </Badge>
          )}
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Database className="size-[15px]" />
            <span className="font-mono">{storageRoot}</span>
          </span>
          <button
            aria-label="Toggle theme"
            onClick={() => setDark((d) => !d)}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <nav className="flex w-[52px] flex-col items-center gap-1.5 border-r border-border bg-card py-2.5">
          {NAV.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              aria-label={label}
              title={label}
              onClick={() => onNavigate(key)}
              className={cn(
                "rounded-md p-2 transition-colors",
                active === key
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-[18px]" />
            </button>
          ))}
        </nav>

        <main className="min-w-0 flex-1 overflow-auto p-4">{children}</main>
      </div>
    </div>
  );
}

export type { NavKey };
