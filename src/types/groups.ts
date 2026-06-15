export type ObjectGroup = {
  id: string;
  name: string;
  description?: string;
  objectIds: string[];
  annotationIds?: string[];
  layerId?: string;
  collapsed?: boolean;
  createdAt: string;
  updatedAt: string;
};
