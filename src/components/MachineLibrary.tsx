import { machineLibrary } from "../data/machines";
import type { MachineDefinition } from "../types/machine";

type MachineLibraryProps = {
  onAddMachine: (machine: MachineDefinition) => void;
};

export function MachineLibrary({ onAddMachine }: MachineLibraryProps) {
  return (
    <section className="library-section" aria-label="Machine library">
      <header className="panel-header">
        <span className="panel-kicker">AtrVisu</span>
        <h1>Machine Library</h1>
      </header>

      <div className="panel-search">
        <span aria-hidden="true">+</span>
        <input type="search" placeholder="Search machines" aria-label="Search machines" />
      </div>

      <section className="machine-list" aria-label="Available machines">
        {machineLibrary.map((machine) => (
          <button
            className="machine-card"
            key={machine.id}
            type="button"
            onClick={() => onAddMachine(machine)}
            title={`Add ${machine.name}`}
          >
            <span
              className="machine-icon"
              style={{ backgroundColor: machine.defaultColor }}
              aria-hidden="true"
            >
              {machine.name.slice(0, 1)}
            </span>
            <span className="machine-content">
              <strong>{machine.name}</strong>
              <span>{machine.category}</span>
              <small>
                {machine.width} x {machine.depth} x {machine.height} m
              </small>
            </span>
          </button>
        ))}
      </section>
    </section>
  );
}
