"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type FileFieldProps = {
  accept?: string;
  required?: boolean;
  name?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
};

/** A visible Choose file button. The native control stays in the form so submit still receives the file. */
export function FileField({ accept, required, name = "file", inputRef }: FileFieldProps) {
  const localRef = useRef<HTMLInputElement>(null);
  const ref = inputRef ?? localRef;
  const [filename, setFilename] = useState<string | null>(null);

  useEffect(() => {
    const input = ref.current;
    const form = input?.form;
    if (!form) return;
    function clearName() {
      setFilename(null);
    }
    form.addEventListener("reset", clearName);
    return () => form.removeEventListener("reset", clearName);
  }, [ref]);

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <input
        ref={ref}
        name={name}
        type="file"
        accept={accept}
        required={required}
        className="sr-only"
        onChange={(event) => setFilename(event.target.files?.[0]?.name ?? null)}
      />
      <Button type="button" variant="secondary" onClick={() => ref.current?.click()}>
        Choose file
      </Button>
      <span className="min-w-0 truncate text-sm text-muted">{filename ?? "No file chosen"}</span>
    </div>
  );
}
