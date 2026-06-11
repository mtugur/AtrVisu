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
      <label>
        <input
          type="checkbox"
          checked={settings.showConnectionPoints}
          onChange={(event) => updateSetting("showConnectionPoints", event.target.checked)}
        />
        <span>Show Connection Points</span>
      </label>
      <label className="overlay-select-field">
        <span>Connection Point Display Mode</span>
        <select
          value={settings.connectionPointDisplayMode}
          disabled={!settings.showConnectionPoints}
          onChange={(event) =>
            onChange({
              ...settings,
              connectionPointDisplayMode: event.target.value === "all" ? "all" : "selected"
            })
          }
        >
          <option value="selected">Selected object only</option>
          <option value="all">All objects</option>
        </select>
      </label>
      <p className="overlay-help">
        Connection points are shown for the selected object by default. Position is local point location; direction is
        where the port, flow, or connection faces.
      </p>
      <div className="axis-help" aria-label="Plan coordinate legend">
        <span>X- &lt;- Plan X -&gt; X+</span>
        <span>Y- &lt;- Plan Y -&gt; Y+</span>
        <span>Z+ = elevation up</span>
      </div>
    </section>
  );
}
