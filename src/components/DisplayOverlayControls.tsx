import type { OverlaySettings } from "../types/overlays";

type DisplayOverlayControlsProps = {
  settings: OverlaySettings;
  onChange: (settings: OverlaySettings) => void;
};

export function DisplayOverlayControls({ settings, onChange }: DisplayOverlayControlsProps) {
  const updateSetting = (key: keyof OverlaySettings, value: boolean) => {
    onChange({
      ...settings,
      [key]: value
    });
  };

  return (
    <section className="overlay-controls" aria-label="Display and overlay controls" data-testid="overlay-controls">
      <label>
        <input
          type="checkbox"
          checked={settings.showLabels}
          onChange={(event) => updateSetting("showLabels", event.target.checked)}
        />
        <span>Show Labels</span>
      </label>
      <label>
        <input
          type="checkbox"
          checked={settings.showSelectionBox}
          onChange={(event) => updateSetting("showSelectionBox", event.target.checked)}
        />
        <span>Show Selection Box</span>
      </label>
      <label>
        <input
          type="checkbox"
          checked={settings.showMetadataBox}
          onChange={(event) => updateSetting("showMetadataBox", event.target.checked)}
        />
        <span>Show Metadata Box</span>
      </label>
      <label>
        <input
          type="checkbox"
          checked={settings.showCollisionEnvelope}
          onChange={(event) => updateSetting("showCollisionEnvelope", event.target.checked)}
        />
        <span>Show Collision Envelope</span>
      </label>
      <label>
        <input
          type="checkbox"
          checked={settings.showClearanceEnvelope}
          onChange={(event) => updateSetting("showClearanceEnvelope", event.target.checked)}
        />
        <span>Show Clearance Envelope</span>
      </label>
    </section>
  );
}
