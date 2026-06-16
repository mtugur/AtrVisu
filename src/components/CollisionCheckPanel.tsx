import type { CollisionCheckResult, CollisionEntityRef, CollisionPair, CollisionSettings } from "../types/collision";

type CollisionCheckPanelProps = {
  settings: CollisionSettings;
  result: CollisionCheckResult;
  onChange: (settings: CollisionSettings) => void;
};

export const getCollisionEntityDisplayName = (entity: CollisionEntityRef | undefined, fallbackName?: string) => {
  const name = entity?.name ?? fallbackName;
  return typeof name === "string" && name.trim() ? name.trim() : "Unknown entity";
};

export const getCollisionEntityTypeLabel = (entity: CollisionEntityRef | undefined) => {
  if (entity?.typeLabel?.trim()) {
    return entity.typeLabel.trim();
  }
  return entity?.entityType === "civil" ? "Civil reference" : "Machine";
};

export const getCollisionPairKey = (pair: CollisionPair, index: number) => {
  const aType = pair.entityA?.entityType ?? "object";
  const bType = pair.entityB?.entityType ?? "object";
  const aId = pair.entityA?.id ?? pair.objectAId ?? `missing-a-${index}`;
  const bId = pair.entityB?.id ?? pair.objectBId ?? `missing-b-${index}`;
  return `${aType}:${aId}|${bType}:${bId}|${index}`;
};

export function CollisionCheckPanel({ settings, result, onChange }: CollisionCheckPanelProps) {
  const pairs = Array.isArray(result.pairs) ? result.pairs : [];

  return (
    <section className="collision-section" data-testid="collision-check-panel" aria-label="Collision check" translate="no">
      <label className="collision-toggle">
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(event) => onChange({ ...settings, enabled: event.target.checked })}
        />
        <span>Enable Collision Check</span>
      </label>
      <div className={`collision-summary${pairs.length > 0 ? " has-collisions" : ""}`}>
        <span>Collision Check: {settings.enabled ? "On" : "Off"}</span>
        <strong>
          <span>{pairs.length}</span>
          <span>{pairs.length === 1 ? " detected collision" : " detected collisions"}</span>
        </strong>
      </div>
      {settings.enabled && pairs.length > 0 ? (
        <ul className="collision-list">
          {pairs.map((pair, index) => (
            <li key={getCollisionPairKey(pair, index)}>
              <strong>
                <span>{getCollisionEntityDisplayName(pair.entityA, pair.objectAName)}</span>
                <span aria-hidden="true"> ↔ </span>
                <span>{getCollisionEntityDisplayName(pair.entityB, pair.objectBName)}</span>
              </strong>
              <span>
                <span>{getCollisionEntityTypeLabel(pair.entityA)}</span>
                <span> / </span>
                <span>{getCollisionEntityTypeLabel(pair.entityB)}</span>
              </span>
              <span>
                <span>{pair.severity ?? "error"}</span>
                <span>: </span>
                <span>{pair.reason || "Collision detected."}</span>
              </span>
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
