import type { FeatureId } from "../contracts";

export const criticalRegressionFeatureIds = [
  "project.exportJson",
  "project.importJson",
  "edit.undo",
  "edit.redo",
  "edit.deleteSelected",
  "library.addMachine",
  "library.manager",
  "selection.singleSelect",
  "selection.multiSelect",
  "object.movePlan",
  "object.rotateY",
  "annotations.create",
  "collision.check",
  "view.viewpoints",
  "panel.layers",
  "panel.groups",
  "civil.column"
] as const satisfies readonly FeatureId[];

