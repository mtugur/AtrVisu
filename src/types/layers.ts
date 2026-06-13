export type LayoutLayer = {
  id: string;
  name: string;
  description?: string;
  visible: boolean;
  locked: boolean;
  color?: string;
  systemLayer?: boolean;
  createdAt: string;
  updatedAt: string;
};

export const DEFAULT_LAYER_ID = "default";
