import type { AnnotationObject } from "../types/annotations";
import type { CivilReferenceItem } from "../types/civil";
import type { LayoutLayer } from "../types/layers";
import type { PlacedMachine } from "../types/machine";
import { TECHNICAL_CSS_COLORS } from "../designSystem";
import { getLayerItemCounts } from "../utils/layers";
import { WorkbenchActionButton } from "./workbench/WorkbenchActionButton";

type LayersPanelProps = {
  layers: LayoutLayer[];
  placedMachines: PlacedMachine[];
  annotations: AnnotationObject[];
  civilReferences?: CivilReferenceItem[];
  selectedLayerId: string;
  onSelectLayer: (layerId: string) => void;
  onAddLayer: (name: string) => void;
  onRenameLayer: (layerId: string, name: string) => void;
  onDeleteLayer: (layerId: string) => void;
  onToggleVisibility: (layerId: string) => void;
  onToggleLocked: (layerId: string) => void;
  onIsolateLayer: (layerId: string) => void;
  onShowAllLayers: () => void;
};

export function LayersPanel({
  layers,
  placedMachines,
  annotations,
  civilReferences = [],
  selectedLayerId,
  onSelectLayer,
  onAddLayer,
  onRenameLayer,
  onDeleteLayer,
  onToggleVisibility,
  onToggleLocked,
  onIsolateLayer,
  onShowAllLayers
}: LayersPanelProps) {
  const counts = getLayerItemCounts(layers, placedMachines, annotations, civilReferences);

  return (
    <section className="layers-panel" data-testid="layers-panel" aria-label="Layers">
      <div className="layer-actions">
        <WorkbenchActionButton
          iconId="create"
          label="Add Layer"
          visibleLabel="Add Layer"
          data-testid="add-layer"
          onClick={() => {
            const name = window.prompt("Layer name");
            if (name?.trim()) {
              onAddLayer(name);
            }
          }}
        />
        <WorkbenchActionButton iconId="show" label="Show All Layers" onClick={onShowAllLayers} />
      </div>
      <div className="layer-list" aria-label="Layer list">
        {layers.map((layer) => {
          const itemCount = counts[layer.id]?.total ?? 0;
          return (
            <article
              className={`layer-row${selectedLayerId === layer.id ? " is-selected" : ""}${layer.visible ? "" : " is-hidden"}${layer.locked ? " is-locked" : ""}`}
              key={layer.id}
            >
              <button
                className="layer-main-button"
                type="button"
                data-testid={`layer-row-${layer.id}`}
                onClick={() => onSelectLayer(layer.id)}
              >
                <span className="layer-color" style={{ background: layer.color ?? TECHNICAL_CSS_COLORS.layerDefault }} aria-hidden="true" />
                <strong>{layer.name}</strong>
                <small>
                  {itemCount} item{itemCount === 1 ? "" : "s"} {layer.systemLayer ? "| default system" : ""}
                </small>
              </button>
              <div className="layer-row-actions">
                {!layer.systemLayer ? (
                  <>
                    <WorkbenchActionButton
                      iconId={layer.visible ? "show" : "hide"}
                      label={`${layer.visible ? "Hide" : "Show"} ${layer.name}`}
                      aria-pressed={layer.visible}
                      onClick={() => onToggleVisibility(layer.id)}
                    />
                    <WorkbenchActionButton
                      iconId={layer.locked ? "lock" : "unlock"}
                      label={`${layer.locked ? "Unlock" : "Lock"} ${layer.name}`}
                      aria-pressed={layer.locked}
                      onClick={() => onToggleLocked(layer.id)}
                    />
                  </>
                ) : null}
                <WorkbenchActionButton iconId="isolate" label={`Isolate ${layer.name}`} onClick={() => onIsolateLayer(layer.id)} />
                {!layer.systemLayer ? (
                  <>
                    <WorkbenchActionButton
                      iconId="rename"
                      label={`Rename ${layer.name}`}
                      onClick={() => {
                        const name = window.prompt("Layer name", layer.name);
                        if (name?.trim()) {
                          onRenameLayer(layer.id, name);
                        }
                      }}
                    />
                    <WorkbenchActionButton
                      iconId="delete"
                      label={`Delete ${layer.name}`}
                      tone="danger"
                      onClick={() => onDeleteLayer(layer.id)}
                    />
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
