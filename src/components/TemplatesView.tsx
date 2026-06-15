import * as React from "react";
import { ArrowRight, Loader2, TriangleAlert, Trash2, Bookmark } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  listTemplates,
  listSavedTemplates,
  deleteSavedTemplate,
  type TemplateInfo,
  type SavedTemplate,
} from "../lib/api";

interface Props {
  onUseScenario: (scenarioType: string) => void;
  onUseSaved: (template: SavedTemplate) => void;
}

export function TemplatesView({ onUseScenario, onUseSaved }: Props) {
  const [builtins, setBuiltins] = React.useState<TemplateInfo[]>([]);
  const [saved, setSaved] = React.useState<SavedTemplate[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const load = React.useCallback(() => {
    setLoading(true);
    setError("");
    Promise.all([listTemplates(), listSavedTemplates()])
      .then(([b, s]) => {
        setBuiltins(b);
        setSaved(s);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(load, [load]);

  function remove(id: string) {
    deleteSavedTemplate(id).then(load).catch((e: Error) => setError(e.message));
  }

  return (
    <div>
      <h1 className="mb-4 text-base font-medium">Templates</h1>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> loading…
        </div>
      )}
      {error && (
        <div className="mb-3 flex items-center gap-2 text-sm text-danger">
          <TriangleAlert className="size-4" /> {error}
        </div>
      )}

      {!loading && (
        <>
          {saved.length > 0 && (
            <div className="mb-6">
              <div className="mb-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Bookmark className="size-4" /> Saved templates
              </div>
              <Card className="overflow-hidden">
                {saved.map((t) => (
                  <div key={t.id} className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-b-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{t.name}</span>
                        {t.scenario && <Badge variant="secondary">{t.scenario}</Badge>}
                        {t.input_path && <Badge variant="outline">input: {t.input_path}</Badge>}
                      </div>
                      {t.description && <p className="truncate text-[13px] text-muted-foreground">{t.description}</p>}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => onUseSaved(t)}>
                      Use <ArrowRight className="size-4" />
                    </Button>
                    <button
                      aria-label="Delete template"
                      onClick={() => remove(t.id)}
                      className="text-muted-foreground transition-colors hover:text-danger"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </Card>
            </div>
          )}

          <div className="mb-2 text-sm text-muted-foreground">Built-in templates</div>
          <Card className="overflow-hidden">
            {builtins.map((t) => (
              <div key={t.name} className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-b-0">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[13px] font-medium">{t.name}</span>
                    <Badge variant="secondary">{t.category}</Badge>
                  </div>
                  <p className="truncate text-[13px] text-muted-foreground">{t.description}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => onUseScenario(t.scenario_type)}>
                  Use <ArrowRight className="size-4" />
                </Button>
              </div>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}
