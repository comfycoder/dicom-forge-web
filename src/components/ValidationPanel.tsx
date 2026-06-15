import * as React from "react";
import { Loader2, CircleCheck, CircleX } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { validateConfig, type ValidateResponse } from "../lib/api";

export function ValidationPanel({ configPath }: { configPath: string }) {
  const [data, setData] = React.useState<ValidateResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    validateConfig(configPath)
      .then((r) => !cancelled && setData(r))
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [configPath]);

  return (
    <Card className="px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Config validation — <span className="font-mono">{configPath}</span>
        </span>
        {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        {data?.valid && (
          <Badge variant="success">
            <CircleCheck className="size-3" /> valid
          </Badge>
        )}
        {data && !data.valid && (
          <Badge variant="warning">
            <CircleX className="size-3" /> invalid
          </Badge>
        )}
      </div>

      {error && <div className="text-[13px] text-danger">{error}</div>}

      {data?.valid &&
        data.sets.map((s) => (
          <div key={s.name} className="flex items-center justify-between border-t border-border py-1.5 text-[13px] first:border-t-0">
            <span className="font-mono">{s.name}</span>
            <span className="text-muted-foreground">
              {s.tag_count} tag{s.tag_count === 1 ? "" : "s"}
              {s.org_root ? ` · org ${s.org_root}` : ""}
            </span>
          </div>
        ))}

      {data && !data.valid &&
        data.errors.map((e, i) => (
          <div key={i} className="border-t border-border py-1.5 font-mono text-[12px] text-danger first:border-t-0">
            {e}
          </div>
        ))}
    </Card>
  );
}
