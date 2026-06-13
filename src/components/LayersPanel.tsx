import type { AnnotationObject } from "../types/annotations";
import type { LayoutLayer } from "../types/layers";
import type { PlacedMachine } from "../types/machine";
import { getLayerItemCounts } from "../utils/layers";

type LayersPanelProps = {
  layers: LayoutLayer[];
  placedMachines: PlacedMachine[];
  annotations: AnnotationObject[];
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
  const counts = getLayerItemCounts(layers, placedMachines, annotations);

  return (
    <section className="layers-panel" data-testid="layers-panel" aria-label="Layers">
      <div className="layer-actions">
        <button
          type="button"
          data-testid="add-layer"
          onClick={() => {
            const name = window.prompt("Layer name");
            if (name?.trim()) {
              onAddLayer(name);
            }
          }}
        >
          Add Layer
        </button>
        <button type="button" onClick={onShowAllLayers}>
          Show All Layers
        </button>
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
                <span className="layer-color" style={{ background: layer.color ?? "#a8c978" }} aria-hidden="true" />
                <strong>{layer.name}</strong>
                <small>
                  {itemCount} item{itemCount === 1 ? "" : "s"} {layer.systemLayer ? "| system" : ""}
                </small>
              </button>
              <div className="layer-row-actions">
                <button type="button" onClick={() => onToggleVisibility(layer.id)}>
                  {layer.visible ? "Hide" : "Show"}
                </button>
                <button type="button" onClick={() => onToggleLocked(layer.id)}>
                  {layer.locked ? "Unlock" : "Lock"}
                </button>
                <button type="button" onClick={() => onIsolateLayer(layer.id)}>
                  Isolate
                </button>
                <button
                  type="button"
                  disabled={layer.systemLayer}
                  onClick={() => {
                    const name = window.prompt("Layer name", layer.name);
                    if (name?.trim()) {
                      onRenameLayer(layer.id, name);
                    }
                  }}
                >
                  Rename
                </button>
                <button
                  className="danger-action"
                  type="button"
                  disabled={layer.systemLayer}
                  onClick={() => onDeleteLayer(layer.id)}
                >
                  Delete
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
