import { ShieldCheck, Users, Activity, Layers, Server, TriangleAlert, FileCode2, type LucideIcon } from "lucide-react";
import { Card } from "./ui/card";
import { SCENARIOS } from "../lib/scenarios";

const ICONS: Record<string, LucideIcon> = {
  deidentify: ShieldCheck,
  cohort: Users,
  longitudinal: Activity,
  multi_series: Layers,
  pacs_stress: Server,
  malformed: TriangleAlert,
  raw_config: FileCode2,
};

export function ScenarioPicker({ onPick }: { onPick: (type: string) => void }) {
  return (
    <div>
      <h1 className="mb-1 text-base font-medium">New job</h1>
      <p className="mb-4 text-sm text-muted-foreground">Choose a scenario to forge a new set of DICOM files.</p>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
        {SCENARIOS.map((s) => {
          const Icon = ICONS[s.type] ?? FileCode2;
          return (
            <button key={s.type} onClick={() => onPick(s.type)} className="text-left">
              <Card className="h-full px-4 py-3.5 transition-colors hover:border-border hover:bg-muted/40">
                <Icon className="mb-2 size-5 text-primary" />
                <div className="mb-1 font-medium">{s.title}</div>
                <p className="text-[13px] leading-relaxed text-muted-foreground">{s.description}</p>
              </Card>
            </button>
          );
        })}
      </div>
    </div>
  );
}
