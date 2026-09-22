import { useState } from "react";
import type { AnyAssetBrowserRecord, AssetBrowserRecord } from "../../assetBrowser";
import { WorkbenchIcon } from "../../workbench/icons";
import { WorkbenchActionButton } from "../workbench/WorkbenchActionButton";

type AssetBrowserCardProps = {
  onCreateVariant?: (record: AssetBrowserRecord) => Promise<void>;
  record: AnyAssetBrowserRecord;
  favorite: boolean;
  onToggleFavorite: (assetKey: string) => void;
  onAdd: (record: AnyAssetBrowserRecord) => Promise<boolean>;
};

const formatDimensions = (record: AnyAssetBrowserRecord) => {
  const { widthMm, depthMm, heightMm } = record.dimensionsMm;
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
  const thumbnailPath = record.kind === "machine" && record.item.thumbnailPath && !thumbnailFailed
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
      data-asset-kind={record.kind}
    >
      <div className="asset-card-visual" aria-hidden="true">
        {thumbnailPath ? (
          <img
            src={thumbnailPath}
            alt=""
            onError={() => setThumbnailFailed(true)}
          />
        ) : (
          <span title={record.kind === "machine" ? formatPlaceholderLabel(record) : "Build reference"}>
            <WorkbenchIcon iconId="asset" />
          </span>
        )}
      </div>
      <div className="asset-card-content">
        <strong title={record.name}>{record.name}</strong>
        <span title={`${record.category} / ${record.familyLabel}`}>
          {record.category} · {record.familyLabel}
        </span>
        <small>{formatDimensions(record)}</small>
        <small className="asset-card-source" title={record.libraryName}>{record.sourceLabel}</small>
      </div>
      <div className="asset-card-actions">
        {onCreateVariant && record.kind === "machine" ? (
          <WorkbenchActionButton
            iconId="custom-variant"
            label={`Create Custom Variant of ${record.name}`}
            onClick={() => void onCreateVariant(record)}
          />
        ) : null}
        <WorkbenchActionButton
          className="asset-favorite-button"
          iconId="favorite"
          label={`${favorite ? "Remove" : "Add"} ${record.name} ${favorite ? "from" : "to"} favorites`}
          aria-pressed={favorite}
          onClick={() => onToggleFavorite(record.assetKey)}
        />
        <WorkbenchActionButton
          className={`${record.kind === "machine" ? "machine-card" : "build-card"} asset-card-add`}
          iconId="add"
          label={`Add ${record.name} to layout`}
          disabled={isAdding}
          onClick={() => void addAsset()}
        />
      </div>
    </article>
  );
}
