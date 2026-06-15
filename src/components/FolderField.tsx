import * as React from "react";
import { FolderOpen } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { StorageFolderBrowser } from "./StorageFolderBrowser";
import { STORAGE_ROOT } from "../lib/config";

interface Props {
  label: string;
  value: string;
  onChange: (rel: string) => void;
  allowCreate?: boolean;
  placeholder?: string;
}

export function FolderField({ label, value, onChange, allowCreate, placeholder }: Props) {
  const [open, setOpen] = React.useState(false);
  return (
    <div>
      <label className="mb-1.5 block text-sm text-muted-foreground">{label}</label>
      <div className="flex gap-2">
        <Input
          readOnly
          value={value ? `${STORAGE_ROOT}/${value}` : ""}
          placeholder={placeholder ?? "No folder selected"}
          className="font-mono text-[13px]"
        />
        <Button variant="outline" onClick={() => setOpen(true)} className="shrink-0">
          <FolderOpen className="size-4" /> Browse
        </Button>
      </div>
      <StorageFolderBrowser open={open} onOpenChange={setOpen} allowCreate={allowCreate} onSelect={onChange} />
    </div>
  );
}
