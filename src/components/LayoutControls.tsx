import { useRef, useState } from "react";
import type { AtrVisuLayout } from "../types/machine";

type LayoutControlsProps = {
  onExportLayout: () => void;
  onImportLayout: (layout: AtrVisuLayout) => void;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const isLayout = (value: unknown): value is AtrVisuLayout => {
  if (!isRecord(value)) {
    return false;
  }

  return value.appName === "AtrVisu" && value.version === 1 && Array.isArray(value.objects);
};

export function LayoutControls({ onExportLayout, onImportLayout }: LayoutControlsProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<string>("");

  const importFile = async (file?: File) => {
    if (!file) {
      return;
    }

    const rawJson = await file.text();
    const parsedLayout = JSON.parse(rawJson) as unknown;

    if (!isLayout(parsedLayout)) {
      throw new Error("Selected file is not an AtrVisu layout.");
    }

    onImportLayout(parsedLayout);
    setStatus(`Imported ${parsedLayout.objects.length} object${parsedLayout.objects.length === 1 ? "" : "s"}.`);
  };

  return (
    <section className="layout-section" aria-label="Layout file actions">
      <button className="layout-button" type="button" onClick={onExportLayout}>
        Export Layout
      </button>
      <button className="layout-button" type="button" onClick={() => inputRef.current?.click()}>
        Import Layout
      </button>
      <input
        ref={inputRef}
        className="file-input"
        type="file"
        accept="application/json,.json"
        aria-label="Import Layout File"
        onChange={(event) => {
          void importFile(event.target.files?.[0])
            .catch((error: unknown) => {
              setStatus(error instanceof Error ? error.message : "Could not import layout.");
            })
            .finally(() => {
              event.target.value = "";
            });
        }}
      />
      {status ? <p className="layout-status">{status}</p> : null}
    </section>
  );
}
