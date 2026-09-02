import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArcRotateCamera, Engine, HemisphericLight, MeshBuilder, Scene, StandardMaterial, Vector3, type Mesh } from "@babylonjs/core";
import { createPortal } from "react-dom";
import { Upload, X } from "lucide-react";
import { useModalFocus } from "./common/useModalFocus";
import { customAssets, type NativeAssetDraft } from "../nativeAssets/customAssets";
import { DEFAULT_IMPORT_CALIBRATION, projectModelCalibration, validateGlb, type ModelBounds, type ModelCalibration } from "../nativeAssets/modelContract";
import { calibrateImportedRoot, loadImportedModelRoot } from "../nativeAssets/modelRendering";
import { openAtrVisuDatabase } from "../utils/storage/indexedDb";
import { MACHINE_CATEGORIES } from "../utils/libraryValidation";
import { createTechnicalColor3, createTechnicalColor4 } from "../designSystem/technicalPaletteBabylon";

const STEPS = ["File & Preview", "Units & Orientation", "Asset Metadata", "Validate & Save"];
const errorText = (error: unknown) => error instanceof Error ? error.message : "The model could not be imported.";
type LoadedModel = Awaited<ReturnType<typeof loadImportedModelRoot>>;

function ModelPreview({ bytes, unit, calibration, onBounds, onError }: {
  bytes: ArrayBuffer; unit: "mm" | "m"; calibration: ModelCalibration;
  onBounds: (bounds: ModelBounds) => void; onError: (message: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modelRef = useRef<LoadedModel | null>(null);
  const cameraRef = useRef<ArcRotateCamera | null>(null);
  const floorRef = useRef<Mesh | null>(null);
  const latest = useRef({ unit, calibration, onBounds, onError });
  const [ready, setReady] = useState(false);
  useLayoutEffect(() => { latest.current = { unit, calibration, onBounds, onError }; });
  const update = () => {
    const model = modelRef.current;
    const camera = cameraRef.current;
    if (!model || !camera) return;
    try {
      const projection = calibrateImportedRoot(model.root, model.bounds, latest.current.unit, latest.current.calibration);
      const span = Math.max(projection.widthMm, projection.depthMm, projection.heightMm) / 1000;
      const bounds = model.root.getHierarchyBoundingVectors(true);
      camera.setTarget(Vector3.Center(bounds.min, bounds.max), false, true, true);
      camera.minZ = span / 1000;
      camera.maxZ = span * 100;
      camera.lowerRadiusLimit = span * 0.1;
      camera.upperRadiusLimit = span * 10;
      camera.radius = span * 2.4;
      if (floorRef.current) {
        floorRef.current.scaling.set(span * 2, 1, span * 2);
        floorRef.current.position.y = -span / 10000;
      }
    } catch { /* Invalid axis combinations are shown by the wizard, without destroying the loaded model. */ }
  };
  useEffect(() => {
    const canvas = canvasRef.current!;
    const engine = new Engine(canvas, true);
    const scene = new Scene(engine);
    scene.clearColor = createTechnicalColor4("sceneClear");
    const camera = new ArcRotateCamera("import-preview-camera", -Math.PI / 3, Math.PI / 3, 6, Vector3.Zero(), scene);
    camera.attachControl(canvas, true);
    cameraRef.current = camera;
    new HemisphericLight("import-preview-light", new Vector3(0, 1, 0), scene);
    const floor = MeshBuilder.CreateGround("import-preview-floor", { width: 1, height: 1 }, scene);
    const floorMaterial = new StandardMaterial("import-preview-floor-material", scene);
    floorMaterial.diffuseColor = createTechnicalColor3("sceneGround");
    floorMaterial.alpha = 0.4;
    floor.material = floorMaterial;
    floor.isPickable = false;
    floorRef.current = floor;
    const url = URL.createObjectURL(new Blob([bytes], { type: "model/gltf-binary" }));
    let closed = false;
    setReady(false);
    void loadImportedModelRoot(scene, url, "import-preview-model").then((model) => {
      if (closed) { model.root.dispose(); return; }
      modelRef.current = model;
      latest.current.onBounds(model.bounds);
      update();
      setReady(true);
    }).catch((error: unknown) => { if (!closed) latest.current.onError(errorText(error)); })
      .finally(() => URL.revokeObjectURL(url));
    engine.runRenderLoop(() => scene.render());
    const resize = new ResizeObserver(() => engine.resize());
    resize.observe(canvas);
    return () => {
      closed = true;
      resize.disconnect();
      modelRef.current = null;
      cameraRef.current = null;
      floorRef.current = null;
      scene.dispose();
      engine.dispose();
      URL.revokeObjectURL(url);
    };
  }, [bytes]);
  useEffect(update, [unit, calibration]);
  return <canvas ref={canvasRef} className="native-asset-preview" aria-label="Imported model preview" data-testid="native-asset-preview" data-ready={ready} />;
}

export function NativeAssetImport({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [fileName, setFileName] = useState("");
  const [bytes, setBytes] = useState<ArrayBuffer | null>(null);
  const [bounds, setBounds] = useState<ModelBounds | null>(null);
  const [unit, setUnit] = useState<"mm" | "m">("m");
  const [calibration, setCalibration] = useState(DEFAULT_IMPORT_CALIBRATION);
  const [metadata, setMetadata] = useState({ name: "", category: "", productFamilyCode: "", machineType: "", variant: "", tags: "" });
  const [error, setError] = useState("");
  const [storageReady, setStorageReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
  const close = () => { if (!busy) onClose(); };
  const dialogRef = useModalFocus<HTMLElement>(close);
  useEffect(() => {
    let active = true;
    void openAtrVisuDatabase().then(() => { if (active) setStorageReady(true); })
      .catch(() => { if (active) setError("Model storage is unavailable in this browser."); });
    return () => { active = false; generation.current++; };
  }, []);
  let projection: ReturnType<typeof projectModelCalibration> | null = null;
  let calibrationError = "";
  if (bounds) {
    try { projection = projectModelCalibration(bounds, unit, calibration); }
    catch (caught) { calibrationError = errorText(caught); }
  }
  const valid = !!bytes && !!projection && !!metadata.name.trim() && !!metadata.category.trim() && storageReady && !error;
  const chooseFile = async (file: File) => {
    const request = ++generation.current;
    setError(""); setBytes(null); setBounds(null); setFileName(file.name); setStep(0);
    try {
      if (!file.name.toLowerCase().endsWith(".glb")) throw new Error("Choose a .glb file.");
      const content = await file.arrayBuffer();
      validateGlb(content);
      if (request !== generation.current) return;
      setBytes(content);
      setMetadata((current) => ({ ...current, name: file.name.replace(/\.glb$/i, "") }));
    } catch (caught) { if (request === generation.current) setError(errorText(caught)); }
  };
  const save = async () => {
    if (!valid || !bounds || !bytes || busy) return;
    setBusy(true);
    try {
      const draft: NativeAssetDraft = { ...metadata, bounds, unit, calibration };
      await customAssets.importAsset(draft, bytes, fileName);
      onClose();
    } catch (caught) { setError(`Could not save the asset: ${errorText(caught)}`); }
    finally { setBusy(false); }
  };
  return createPortal(<div className="manager-backdrop">
    <section ref={dialogRef} className="manager-dialog native-asset-dialog" role="dialog" aria-modal="true" aria-label="Import 3D Asset" data-testid="native-asset-import">
      <header className="manager-header"><h2>Import 3D Asset</h2><button type="button" title="Close import" aria-label="Close import" disabled={busy} onClick={close}><X size={18} /></button></header>
      <ol className="native-asset-steps">{STEPS.map((label, index) => <li key={label} aria-current={step === index ? "step" : undefined}>{index + 1}. {label}</li>)}</ol>
      <div className="native-asset-body">
        {bytes ? <ModelPreview bytes={bytes} unit={unit} calibration={calibration} onBounds={setBounds} onError={setError} /> : <div className="native-asset-empty"><Upload size={32} /><span>GLB model preview</span></div>}
        <div className="native-asset-fields">
          {step === 0 && <><label>GLB file<input type="file" accept=".glb" aria-label="GLB file" onChange={(event) => { const file = event.target.files?.[0]; if (file) void chooseFile(file); event.target.value = ""; }} /></label>{fileName && <p>{fileName}{bytes ? ` (${(bytes.byteLength / 1024).toFixed(1)} KB)` : ""}</p>}</>}
          {step === 1 && <><label>Model units<select aria-label="Model units" value={unit} onChange={(event) => setUnit(event.target.value as "mm" | "m")}><option value="m">m</option><option value="mm">mm</option></select></label>
            <label>Forward axis<select aria-label="Forward axis" value={calibration.forwardAxis} onChange={(event) => setCalibration({ ...calibration, forwardAxis: event.target.value as ModelCalibration["forwardAxis"] })}>{["x+", "x-", "z+", "z-"].map((axis) => <option key={axis}>{axis}</option>)}</select></label>
            <label>Up axis<select aria-label="Up axis" value={calibration.upAxis} onChange={(event) => setCalibration({ ...calibration, upAxis: event.target.value as ModelCalibration["upAxis"] })}>{["y+", "z+", "x+"].map((axis) => <option key={axis}>{axis}</option>)}</select></label>
            {([ ["bottomOnFloor", "Bottom on floor"], ["centerOnFootprint", "Center on footprint"] ] as const).map(([key, label]) => <label key={key}><input type="checkbox" checked={calibration[key]} onChange={(event) => setCalibration({ ...calibration, [key]: event.target.checked })} />{label}</label>)}<span>Aspect ratio preserved</span></>}
          {step === 2 && <>{([ ["name", "Name"], ["category", "Category"], ["productFamilyCode", "Family"], ["machineType", "Machine type"], ["variant", "Variant"], ["tags", "Tags"] ] as const).map(([key, label]) => <label key={key}>{label}<input aria-label={label} required={key === "name" || key === "category"} list={key === "category" ? "native-asset-categories" : undefined} value={metadata[key]} onChange={(event) => setMetadata({ ...metadata, [key]: event.target.value })} /></label>)}<datalist id="native-asset-categories">{MACHINE_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</datalist></>}
          {projection && <output aria-label="Calibrated dimensions">W {projection.widthMm.toFixed(1)} / D {projection.depthMm.toFixed(1)} / H {projection.heightMm.toFixed(1)} mm</output>}
          {step === 3 && <dl><dt>Model</dt><dd>Renderable GLB</dd><dt>Units / orientation</dt><dd>{unit} / forward {calibration.forwardAxis}, up {calibration.upAxis}</dd><dt>Floor / footprint</dt><dd>{calibration.bottomOnFloor ? "On floor" : "Original origin"} / {calibration.centerOnFootprint ? "Centered" : "Original origin"}</dd><dt>Category / family</dt><dd>{metadata.category} / {metadata.productFamilyCode || "Not supplied"}</dd><dt>Identity</dt><dd>New unique Project Custom asset</dd><dt>Model storage</dt><dd>{storageReady ? "Ready" : "Unavailable"}</dd></dl>}
          {(error || calibrationError) && <p role="alert">{error || calibrationError}</p>}
        </div>
      </div>
      <footer className="manager-footer"><button type="button" disabled={step === 0 || busy} onClick={() => setStep(step - 1)}>Back</button>{step < 3 ? <button type="button" disabled={!bounds || !!error || !!calibrationError || (step === 2 && (!metadata.name.trim() || !metadata.category.trim()))} onClick={() => setStep(step + 1)}>Next</button> : <button type="button" className="primary-action" disabled={!valid || busy} onClick={() => void save()}>{busy ? "Saving..." : "Validate & Save"}</button>}</footer>
    </section>
  </div>, document.body);
}
