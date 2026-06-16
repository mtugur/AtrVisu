import type { CivilReferenceType } from "../types/civil";

type CivilReferencePanelProps = {
  onAddCivilReference: (type: CivilReferenceType) => void;
};

const civilAddActions: Array<{ type: CivilReferenceType; label: string }> = [
  { type: "column", label: "Add Column" },
  { type: "wall", label: "Add Wall" },
  { type: "floor-area", label: "Add Floor Area" },
  { type: "walkway", label: "Add Walkway" },
  { type: "restricted-area", label: "Add Restricted Area" },
  { type: "reference-zone", label: "Add Reference Zone" }
];

export function CivilReferencePanel({ onAddCivilReference }: CivilReferencePanelProps) {
  return (
    <section className="civil-reference-panel" data-testid="civil-reference-panel" aria-label="Building and civil references">
      <div className="alignment-button-grid">
        {civilAddActions.map((action) => (
          <button
            key={action.type}
            type="button"
            data-testid={`add-civil-${action.type}`}
            onClick={() => onAddCivilReference(action.type)}
          >
            {action.label}
          </button>
        ))}
      </div>
      <p className="collision-note">
        Civil references are layout guides. Assign them to a Civil layer and lock that layer when they should stay fixed.
      </p>
    </section>
  );
}
