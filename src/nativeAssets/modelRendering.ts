import { Matrix, Mesh, Quaternion, SceneLoader, Vector3, type Scene } from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import { assertModelBounds, orientationBasis, projectModelCalibration, type ModelBounds, type ModelCalibration } from "./modelContract";

export const loadImportedModelRoot = async (scene: Scene, url: string, name: string) => {
  const container = await SceneLoader.LoadAssetContainerAsync("", url, scene, undefined, ".glb");
  if (scene.isDisposed) { container.dispose(); throw new Error("Model preview was closed."); }
  try {
    const geometry = container.meshes.filter((mesh) => mesh.getTotalVertices() >= 3
      && (mesh.getTotalIndices() >= 3 || (mesh instanceof Mesh && mesh.isUnIndexed)));
    if (!geometry.length) throw new Error("The model contains no renderable geometry.");
    const root = new Mesh(name, scene);
    root.isPickable = false;
    container.addAllToScene();
    container.rootNodes.forEach((node) => { node.parent = root; });
    geometry.forEach((mesh) => mesh.computeWorldMatrix(true));
    const vectors = root.getHierarchyBoundingVectors(true);
    const bounds: ModelBounds = { min: [vectors.min.x, vectors.min.y, vectors.min.z], max: [vectors.max.x, vectors.max.y, vectors.max.z] };
    try { assertModelBounds(bounds); } catch (error) { root.dispose(); throw error; }
    root.onDisposeObservable.addOnce(() => container.dispose());
    return { root, bounds, meshes: container.meshes };
  } catch (error) { container.dispose(); throw error; }
};

export const calibrateImportedRoot = (root: Mesh, bounds: ModelBounds, unit: "m" | "mm", calibration: ModelCalibration) => {
  const [right, up, forward] = orientationBasis(calibration);
  const matrix = Matrix.FromValues(right[0], up[0], forward[0], 0,
    right[1], up[1], forward[1], 0, right[2], up[2], forward[2], 0, 0, 0, 0, 1);
  root.rotationQuaternion = Quaternion.FromRotationMatrix(matrix);
  root.scaling.setAll(unit === "mm" ? 0.001 : 1);
  const projection = projectModelCalibration(bounds, unit, calibration);
  root.position = Vector3.FromArray(projection.offsetMeters);
  root.computeWorldMatrix(true);
  return projection;
};
