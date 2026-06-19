// AtrVisu Platform Contracts Draft v3.0
// Bu dosya çalışma kodu değil, contract-first taslak referansıdır.

export type EntityId = string;
export type CommandId = string;
export type PanelId = string;

export type EntityType =
  | 'machine'
  | 'civil'
  | 'annotation'
  | 'group'
  | 'zone'
  | 'conveyor'
  | 'robot'
  | 'sensor';

export interface TransformMm {
  xMm: number;
  yMm: number;
  zMm: number;
  rotationDeg: number;
}

export interface LayoutEntity {
  id: EntityId;
  type: EntityType;
  name: string;
  transform: TransformMm;
  layerId: string;
  isVisible: boolean;
  isLocked: boolean;
  metadata: Record<string, unknown>;
  properties: Record<string, unknown>;
  parentId: EntityId | null;
  children: EntityId[];
  meshInstanceIds: string[];
}

export interface CommandContext {
  selectedEntityIds: EntityId[];
  primaryEntityId: EntityId | null;
  appMode: 'idle' | 'insert' | 'drag' | 'measure' | 'simulate';
}

export interface CommandDefinition {
  id: CommandId;
  label: string;
  tooltip: string;
  icon?: string;
  shortcut?: string;
  locations: Array<'menu' | 'toolbar' | 'contextMenu'>;
  isEnabled(context: CommandContext): boolean;
  execute(context: CommandContext): void | Promise<void>;
}

export interface PanelDefinition {
  id: PanelId;
  title: string;
  defaultDock: 'left' | 'right' | 'bottom' | 'modal' | 'floating';
  isClosable: boolean;
  isCollapsible: boolean;
  featureId: string;
}

export interface SelectionState {
  orderedSelectedEntityIds: EntityId[];
  primaryEntityId: EntityId | null;
}

export interface ViewportContract {
  onContainerResize(widthPx: number, heightPx: number): void;
  getCameraSnapshot(): unknown;
  restoreCameraSnapshot(snapshot: unknown): void;
  raycast(normalizedX: number, normalizedY: number): EntityId[];
}
