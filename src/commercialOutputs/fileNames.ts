import type { CommercialOutputKind, CommercialOutputMetadata } from "./types";

const INVALID_FILE_NAME_CHARACTERS = /[<>:"/\\|?*\u0000-\u001f]/g;
const REPEATED_SEPARATOR = /[_\s-]+/g;

export const sanitizeCommercialOutputFilePart = (value: string, fallback = "Untitled") => {
  const sanitized = value
    .normalize("NFKC")
    .replace(INVALID_FILE_NAME_CHARACTERS, " ")
    .replace(REPEATED_SEPARATOR, "_")
    .replace(/^[_\.]+|[_\.]+$/g, "")
    .slice(0, 80);
  return sanitized || fallback;
};

const suffixByKind: Readonly<Record<CommercialOutputKind, { suffix: string; extension: string }>> = {
  bom: { suffix: "BOM", extension: "xlsx" },
  plan: { suffix: "Plan", extension: "pdf" },
  snapshot: { suffix: "3D", extension: "png" }
};

export const createCommercialOutputFileName = (
  metadata: Pick<CommercialOutputMetadata, "projectName" | "layoutName" | "revision">,
  kind: CommercialOutputKind
) => {
  const output = suffixByKind[kind];
  return [
    sanitizeCommercialOutputFilePart(metadata.projectName),
    sanitizeCommercialOutputFilePart(metadata.layoutName),
    sanitizeCommercialOutputFilePart(metadata.revision, "No_revision"),
    output.suffix
  ].join("_") + `.${output.extension}`;
};
