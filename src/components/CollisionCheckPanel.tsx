import type { CollisionCheckResult, CollisionSettings } from "../types/collision";

type CollisionCheckPanelProps = {
  settings: CollisionSettings;
  result: CollisionCheckResult;
  onChange: (settings: CollisionSettings) => void;
};

export function CollisionCheckPanel({ settings, result, onChange }: CollisionCheckPanelProps) {
  return (
    <section className="collision-section" data-testid="collision-check-panel" aria-label="Collision check">
      <label className="collision-toggle">
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(event) => onChange({ ...settings, enabled: event.target.checked })}
        />
        <span>Enable Collision Check</span>
      </label>
      <div className={`collision-summary${result.pairs.length > 0 ? " has-collisions" : ""}`}>
        <span>Collision Check: {settings.enabled ? "On" : "Off"}</span>
        <strong>{result.pairs.length} detected collision{result.pairs.length === 1 ? "" : "s"}</strong>
      </div>
      {settings.enabled && result.pairs.length > 0 ? (
        <ul className="collision-list">
          {result.pairs.map((pair) => (
            <li key={`${pair.objectAId}-${pair.objectBId}`}>
              <strong>
                {pair.objectAName} + {pair.objectBName}
              </strong>
              <span>{pair.severity}: {pair.reason}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="collision-note">
          {settings.enabled ? "No object-to-object envelope collisions detected." : "Collision checking is disabled."}
        </p>
      )}
    </section>
  );
}
