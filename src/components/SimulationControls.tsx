type SimulationControlsProps = {
  isRunning: boolean;
  speed: number;
  onToggleRunning: () => void;
  onChangeSpeed: (speed: number) => void;
};

export function SimulationControls({
  isRunning,
  speed,
  onToggleRunning,
  onChangeSpeed
}: SimulationControlsProps) {
  return (
    <section className="simulation-section" aria-label="Product flow simulation">
      <button
        className={`simulation-button${isRunning ? " is-running" : ""}`}
        type="button"
        onClick={onToggleRunning}
      >
        {isRunning ? "Stop Simulation" : "Start Simulation"}
      </button>
      <label className="simulation-speed">
        <span>Simulation Speed</span>
        <input
          type="range"
          min="0.25"
          max="3"
          step="0.25"
          value={speed}
          onChange={(event) => onChangeSpeed(Number(event.target.value))}
        />
        <strong>{speed.toFixed(2)}x</strong>
      </label>
    </section>
  );
}
