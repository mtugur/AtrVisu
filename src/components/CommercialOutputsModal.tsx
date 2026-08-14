import { useState } from "react";
import type { CommercialOutputKind, CommercialOutputSnapshot } from "../commercialOutputs";

export type CommercialOutputActionState = {
  enabled: boolean;
  reason?: string;
};

type CommercialOutputsModalProps = {
  snapshot: CommercialOutputSnapshot;
  actions: Readonly<Record<CommercialOutputKind, CommercialOutputActionState>>;
  onExport: (kind: CommercialOutputKind) => Promise<void>;
  onClose: () => void;
};

const OUTPUT_ACTIONS = [
  { kind: "bom", label: "Export BOM Excel", detail: "Summary, grouped BOM, and placed equipment instances (.xlsx)" },
  { kind: "plan", label: "Export 2D Layout PDF", detail: "Measured A3 plan and equipment schedule (.pdf)" },
  { kind: "snapshot", label: "Export 3D Snapshot", detail: "Current presentation camera without editor chrome (.png)" }
] as const;

export function CommercialOutputsModal({ snapshot, actions, onExport, onClose }: CommercialOutputsModalProps) {
  const [pendingKind, setPendingKind] = useState<CommercialOutputKind | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const execute = async (kind: CommercialOutputKind) => {
    setPendingKind(kind);
    setErrorMessage("");
    try {
      await onExport(kind);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "The commercial output could not be created.");
    } finally {
      setPendingKind(null);
    }
  };

  return (
    <div className="manager-backdrop" data-testid="commercial-outputs-modal">
      <section className="manager-dialog commercial-outputs-dialog" role="dialog" aria-modal="true" aria-labelledby="commercial-outputs-title">
        <header className="manager-header">
          <div>
            <span>File Output</span>
            <h2 id="commercial-outputs-title">Commercial Outputs</h2>
          </div>
          <button type="button" data-testid="close-commercial-outputs" onClick={onClose}>Close</button>
        </header>
        <div className="commercial-outputs-body">
          <dl className="commercial-output-summary" aria-label="Commercial output preflight summary">
            <div><dt>Project</dt><dd>{snapshot.metadata.projectName}</dd></div>
            <div><dt>Layout</dt><dd>{snapshot.metadata.layoutName}</dd></div>
            <div><dt>Revision</dt><dd>{snapshot.metadata.revision}</dd></div>
            <div><dt>Equipment</dt><dd>{snapshot.equipmentCount}</dd></div>
            <div><dt>BOM groups</dt><dd>{snapshot.bomGroupCount}</dd></div>
            <div><dt>Data gaps</dt><dd>{snapshot.dataGapCount}</dd></div>
          </dl>
          {snapshot.dataGapCount > 0 ? (
            <p className="commercial-output-warning" role="status" data-testid="commercial-output-data-gap-warning">
              {snapshot.dataGapCount} commercial fields are unknown. Exports will preserve them as Unknown.
            </p>
          ) : null}
          {errorMessage ? <p className="commercial-output-error" role="alert">{errorMessage}</p> : null}
          <div className="commercial-output-actions" aria-label="Commercial output actions">
            {OUTPUT_ACTIONS.map((output) => {
              const state = actions[output.kind];
              const reasonId = `commercial-output-reason-${output.kind}`;
              const pending = pendingKind === output.kind;
              return (
                <div className="commercial-output-action" key={output.kind}>
                  <div>
                    <strong>{output.label}</strong>
                    <span>{output.detail}</span>
                    {!state.enabled && state.reason ? <small id={reasonId}>{state.reason}</small> : null}
                  </div>
                  <button
                    type="button"
                    data-testid={`export-commercial-${output.kind}`}
                    disabled={!state.enabled || pendingKind !== null}
                    aria-describedby={!state.enabled && state.reason ? reasonId : undefined}
                    title={!state.enabled ? state.reason : undefined}
                    onClick={() => { void execute(output.kind); }}
                  >
                    {pending ? "Preparing..." : output.label}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
