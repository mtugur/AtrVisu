import { useState } from "react";
import { CopyPlus } from "lucide-react";
import type { AssetBrowserRecord } from "../../assetBrowser";
import { WorkbenchIcon } from "../../workbench/icons";

type AssetBrowserCardProps = {
  onCreateVariant?: (record: AssetBrowserRecord) => Promise<void>;
  record: AssetBrowserRecord;
  favorite: boolean;
  onToggleFavorite: (assetKey: string) => void;
  onAdd: (record: AssetBrowserRecord) => Promise<boolean>;
};

const formatDimensions = (record: AssetBrowserRecord) => {
  const widthMm = record.item.widthMm ?? record.item.width * 1000;
  const depthMm = record.item.depthMm ?? record.item.depth * 1000;
  const heightMm = record.item.heightMm ?? record.item.height * 1000;
  return `W ${widthMm.toLocaleString("en-US")} × D ${depthMm.toLocaleString("en-US")} × H ${heightMm.toLocaleString("en-US")} mm`;
};

const formatPlaceholderLabel = (record: AssetBrowserRecord) =>
  record.item.placeholderVisualType
    ?.replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
  || "Equipment";

export function AssetBrowserCard({
  record,
  favorite,
  onToggleFavorite,
  onCreateVariant,
  onAdd
}: AssetBrowserCardProps) {
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const thumbnailPath = record.item.thumbnailPath && !thumbnailFailed
    ? record.item.thumbnailPath
    : null;

  const addAsset = async () => {
    if (isAdding) {
      return;
    }
    setIsAdding(true);
    try {
      await onAdd(record);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <article
      className="asset-card"
      data-testid={`asset-card-${record.assetKey}`}
      data-asset-key={record.assetKey}
    >
      <div className="asset-card-visual" aria-hidden="true">
        {thumbnailPath ? (
          <img
            src={thumbnailPath}
            alt=""
            onError={() => setThumbnailFailed(true)}
          />
        ) : (
          <span title={formatPlaceholderLabel(record)}>
            <WorkbenchIcon iconId="asset" />
          </span>
        )}
      </div>
      <div className="asset-card-content">
        <strong title={record.item.name}>{record.item.name}</strong>
        <span title={`${record.item.category} / ${record.familyLabel}`}>
          {record.item.category} · {record.familyLabel}
        </span>
        <small>{formatDimensions(record)}</small>
        <small className="asset-card-source" title={record.libraryName}>{record.sourceLabel}</small>
      </div>
      <div className="asset-card-actions">
        {onCreateVariant && <button type="button" title="Create Custom Variant" aria-label={`Create Custom Variant of ${record.item.name}`} onClick={() => void onCreateVariant(record)}><CopyPlus size={16} /></button>}
        <button
          className="asset-favorite-button"
          type="button"
          aria-label={`${favorite ? "Remove" : "Add"} ${record.item.name} ${favorite ? "from" : "to"} favorites`}
          aria-pressed={favorite}
          title={favorite ? "Remove from favorites" : "Add to favorites"}
          onClick={() => onToggleFavorite(record.assetKey)}
        >
          <WorkbenchIcon iconId="favorite" />
        </button>
        <button
          className="machine-card asset-card-add"
          type="button"
          title={`Add ${record.item.name}`}
          aria-label={`Add ${record.item.name} to layout`}
          disabled={isAdding}
          onClick={() => void addAsset()}
        >
          <WorkbenchIcon iconId="add" />
          <span>{isAdding ? "Adding…" : "Add"}</span>
        </button>
      </div>
    </article>
  );
}
