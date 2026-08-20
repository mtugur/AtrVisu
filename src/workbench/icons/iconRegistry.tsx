import {
  Camera,
  CircleHelp,
  Copy,
  Info,
  Keyboard,
  Pencil,
  Plug,
  Redo2,
  Ruler,
  Save,
  SlidersHorizontal,
  Tag,
  Trash2,
  Undo2,
  type LucideIcon
} from "lucide-react";

export const WORKBENCH_ICON_IDS = [
  "save",
  "undo",
  "redo",
  "duplicate",
  "delete",
  "measurement",
  "labels",
  "connection-points",
  "viewpoints",
  "rename",
  "selection-tools",
  "help",
  "keyboard",
  "info"
] as const;

export type WorkbenchIconId = typeof WORKBENCH_ICON_IDS[number];

const iconById = Object.freeze({
  save: Save,
  undo: Undo2,
  redo: Redo2,
  duplicate: Copy,
  delete: Trash2,
  measurement: Ruler,
  labels: Tag,
  "connection-points": Plug,
  viewpoints: Camera,
  rename: Pencil,
  "selection-tools": SlidersHorizontal,
  help: CircleHelp,
  keyboard: Keyboard,
  info: Info
} satisfies Record<WorkbenchIconId, LucideIcon>);

export const isWorkbenchIconId = (iconId: string): iconId is WorkbenchIconId =>
  Object.prototype.hasOwnProperty.call(iconById, iconId);

export const getWorkbenchIcon = (iconId: string): LucideIcon | undefined =>
  isWorkbenchIconId(iconId) ? iconById[iconId] : undefined;

export const WorkbenchIcon = ({ iconId }: { iconId: string }) => {
  const Icon = getWorkbenchIcon(iconId);
  return Icon ? <Icon aria-hidden="true" focusable="false" /> : null;
};
