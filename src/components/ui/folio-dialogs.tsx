"use client";

import { useEffect, useRef, useState } from "react";

type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type PromptOptions = {
  title: string;
  label: string;
  value?: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

type Request =
  | { kind: "confirm"; options: ConfirmOptions; resolve: (value: boolean) => void }
  | { kind: "prompt"; options: PromptOptions; resolve: (value: string | null) => void };

let enqueueRequest: ((request: Request) => void) | null = null;

export function confirmFolio(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    if (!enqueueRequest) {
      resolve(false);
      return;
    }
    enqueueRequest({ kind: "confirm", options, resolve });
  });
}

export function promptFolio(options: PromptOptions): Promise<string | null> {
  return new Promise((resolve) => {
    if (!enqueueRequest) {
      resolve(null);
      return;
    }
    enqueueRequest({ kind: "prompt", options, resolve });
  });
}

export function FolioDialogs({ children }: { children: React.ReactNode }) {
  const queue = useRef<Request[]>([]);
  const [current, setCurrent] = useState<Request | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const finishRef = useRef<(value: boolean | string | null) => void>(() => {});

  function showNext() {
    setCurrent(queue.current.shift() ?? null);
  }

  useEffect(() => {
    enqueueRequest = (request) => {
      queue.current.push(request);
      setCurrent((active) => active ?? queue.current.shift() ?? null);
    };
    return () => {
      enqueueRequest = null;
      for (const request of queue.current) {
        if (request.kind === "confirm") request.resolve(false);
        else request.resolve(null);
      }
      queue.current = [];
    };
  }, []);

  function finish(value: boolean | string | null) {
    if (!current) return;
    if (current.kind === "confirm") current.resolve(value === true);
    else current.resolve(typeof value === "string" ? value : null);
    showNext();
  }

  useEffect(() => {
    finishRef.current = finish;
  });

  useEffect(() => {
    if (!current) return;
    const request: Request = current;
    const node = request.kind === "prompt" ? inputRef.current : cancelRef.current;
    node?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        finishRef.current(request.kind === "confirm" ? false : null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current]);

  return (
    <>
      {children}
      {current ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(30,26,22,0.46)] p-4"
          role="presentation"
          onMouseDown={() => finish(current.kind === "confirm" ? false : null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="folio-dialog-title"
            className="w-[min(28rem,100%)] rounded-lg border border-line bg-sheet p-5 text-ink shadow-[0_24px_80px_rgba(30,26,22,0.18)] sm:p-6"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2 id="folio-dialog-title" className="font-serif text-2xl tracking-tight">
              {current.options.title}
            </h2>
            {current.kind === "confirm" ? (
              <p className="mt-2 text-sm leading-6 text-muted">{current.options.message}</p>
            ) : (
              <label className="mt-4 block text-sm font-semibold">
                {current.options.label}
                <input
                  ref={inputRef}
                  key={current.options.value ?? ""}
                  defaultValue={current.options.value ?? ""}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    finish(inputRef.current?.value ?? "");
                  }}
                  className="mt-2 w-full rounded-md border border-line bg-sheet px-3 py-2 text-sm font-normal outline-none"
                />
              </label>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                ref={cancelRef}
                type="button"
                className="rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-ink/30"
                onClick={() => finish(current.kind === "confirm" ? false : null)}
              >
                {current.options.cancelLabel ?? "Cancel"}
              </button>
              <button
                type="button"
                className={`rounded-full px-4 py-2 text-sm font-semibold text-sheet ${
                  current.kind === "confirm" && current.options.danger ? "bg-danger" : "bg-ink"
                }`}
                onClick={() => finish(current.kind === "confirm" ? true : (inputRef.current?.value ?? ""))}
              >
                {current.options.confirmLabel ?? (current.kind === "confirm" ? "Confirm" : "Apply")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
