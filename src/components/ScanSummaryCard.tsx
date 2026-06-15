import * as React from "react";
import { Loader2, TriangleAlert, FolderSearch } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { scan, type ScanResponse } from "../lib/api";

export function ScanSummaryCard({ path }: { path: string }) {
  const [data, setData] = React.useState<ScanResponse | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!path) {
      setData(null);
      setError("");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    scan(path)
      .then((r) => !cancelled && setData(r))
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (!path) return null;

  return (
    <Card className="px-4 py-3">
      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
        <FolderSearch className="size-3.5" /> Source scan
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> scanning…
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 text-[13px] text-danger">
          <TriangleAlert className="size-4" /> {error}
        </div>
      )}

      {data && !loading && !error && (
        <>
          <div className="mb-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-medium">{data.file_count}</span>
            <span className="text-xs text-muted-foreground">DICOM files</span>
          </div>
          {data.series.length > 0 && (
            <div className="mb-2.5 font-mono text-xs text-muted-foreground">
              {data.series.map((s) => (
                <div key={s.name} className="flex justify-between">
                  <span>
                    {s.name} <span className="text-muted-foreground/60">({s.modality})</span>
                  </span>
                  <span>{s.count}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary">{data.series.length} series</Badge>
            <Badge variant="secondary">
              {data.study_count} stud{data.study_count === 1 ? "y" : "ies"}
            </Badge>
            {data.modalities.length > 0 && <Badge variant="secondary">{data.modalities.join(" / ")}</Badge>}
            {data.shared_frame_of_reference && <Badge variant="success">shared frame</Badge>}
          </div>
        </>
      )}
    </Card>
  );
}
