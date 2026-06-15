import * as React from "react";
import { Plug, CircleCheck, Loader2, TriangleAlert } from "lucide-react";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { getApiConfig, setApiConfig } from "../lib/config";
import { getHealth, type Health } from "../lib/api";

type TestState = { kind: "idle" } | { kind: "testing" } | { kind: "ok"; health: Health } | { kind: "err"; msg: string };

export function Settings() {
  const initial = getApiConfig();
  const [url, setUrl] = React.useState(initial.baseUrl);
  const [key, setKey] = React.useState(initial.apiKey);
  const [test, setTest] = React.useState<TestState>({ kind: "idle" });

  function runTest() {
    setApiConfig({ baseUrl: url.trim(), apiKey: key.trim() });
    setTest({ kind: "testing" });
    getHealth()
      .then((health) => setTest({ kind: "ok", health }))
      .catch((e: Error) => setTest({ kind: "err", msg: e.message }));
  }

  return (
    <div className="max-w-xl">
      <h1 className="mb-4 text-base font-medium">Settings</h1>
      <Card className="px-5 py-5">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-muted-foreground">API base URL</label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} className="font-mono text-[13px]" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-muted-foreground">API key (X-API-Key)</label>
            <Input
              value={key}
              onChange={(e) => setKey(e.target.value)}
              type="password"
              placeholder="leave blank for unauthenticated backend"
              className="font-mono text-[13px]"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button variant="outline" onClick={runTest} disabled={test.kind === "testing"}>
              {test.kind === "testing" ? <Loader2 className="size-4 animate-spin" /> : <Plug className="size-4" />}
              Test &amp; save
            </Button>
            {test.kind === "ok" && (
              <Badge variant="success">
                <CircleCheck className="size-3" /> connected · v{test.health.version} · storage {test.health.storage_root}
              </Badge>
            )}
            {test.kind === "err" && (
              <Badge variant="warning">
                <TriangleAlert className="size-3" /> {test.msg}
              </Badge>
            )}
          </div>
        </div>
      </Card>
      <p className="mt-3 text-[13px] text-muted-foreground">
        Saved to local storage and sent as <span className="font-mono">X-API-Key</span> on every request. The default
        points at the local Docker backend (<span className="font-mono">http://localhost:8472</span>).
      </p>
    </div>
  );
}
