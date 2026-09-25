import type { LayoutLevel } from "../types/levels";
import { WorkbenchActionButton } from "./workbench/WorkbenchActionButton";

type LevelsPanelProps = {
  levels: readonly LayoutLevel[];
  activeLevelId: string;
  onAddLevel: (name: string, elevationMm: number) => void;
  onRenameLevel: (levelId: string, name: string) => void;
  onSetDatum: (levelId: string, elevationMm: number) => void;
  onDeleteLevel: (levelId: string) => void;
  onSetActiveLevel: (levelId: string) => void;
};

const readDatum = (message: string, current = 0) => {
  const value = window.prompt(message, String(current));
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export function LevelsPanel({
  levels,
  activeLevelId,
  onAddLevel,
  onRenameLevel,
  onSetDatum,
  onDeleteLevel,
  onSetActiveLevel
}: LevelsPanelProps) {
  return (
    <section className="layers-panel" data-testid="levels-panel" aria-label="Levels">
      <div className="layer-actions">
        <WorkbenchActionButton
          iconId="create"
          label="Add Level"
          visibleLabel="Add Level"
          data-testid="add-level"
          onClick={() => {
            const name = window.prompt("Level name");
            if (!name?.trim()) return;
            const elevationMm = readDatum("Level datum (mm)");
            if (elevationMm !== null) onAddLevel(name, elevationMm);
          }}
        />
      </div>
      <div className="layer-list" aria-label="Level list">
        {levels.map((level) => {
          const active = level.id === activeLevelId;
          return (
            <article className={`layer-row${active ? " is-selected" : ""}`} key={level.id} data-testid={`level-row-${level.id}`}>
              <button className="layer-main-button" type="button" onClick={() => onSetActiveLevel(level.id)}>
                <strong>{level.name}</strong>
                <small>{level.elevationMm} mm datum{active ? " | active" : ""}</small>
              </button>
              <div className="layer-row-actions">
                {!active ? <WorkbenchActionButton iconId="apply" label={`Set ${level.name} active`} onClick={() => onSetActiveLevel(level.id)} /> : null}
                {!level.systemLevel ? (
                  <>
                    <WorkbenchActionButton iconId="rename" label={`Rename ${level.name}`} onClick={() => {
                      const name = window.prompt("Level name", level.name);
                      if (name?.trim()) onRenameLevel(level.id, name);
                    }} />
                    <WorkbenchActionButton iconId="measurement" label={`Set ${level.name} datum`} onClick={() => {
                      const datum = readDatum("Level datum (mm)", level.elevationMm);
                      if (datum !== null) onSetDatum(level.id, datum);
                    }} />
                    <WorkbenchActionButton iconId="delete" label={`Delete ${level.name}`} tone="danger" onClick={() => onDeleteLevel(level.id)} />
                  </>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
