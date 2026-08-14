import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createCommercialOutputSnapshot } from "../commercialOutputs";
import { commercialOutputFixtureInput } from "../commercialOutputs/testFixtures";
import { CommercialOutputsModal } from "./CommercialOutputsModal";

describe("CommercialOutputsModal", () => {
  it("renders preflight identity, data gaps, and three live export controls", () => {
    const html = renderToStaticMarkup(createElement(CommercialOutputsModal, {
      snapshot: createCommercialOutputSnapshot(commercialOutputFixtureInput()),
      actions: { bom: { enabled: true }, plan: { enabled: true }, snapshot: { enabled: true } },
      onExport: vi.fn(),
      onClose: vi.fn()
    }));
    expect(html).toContain("ATARA Line / 01");
    expect(html).toContain("Production: West");
    expect(html).toContain("commercial fields are unknown");
    expect(html).toContain('data-testid="export-commercial-bom"');
    expect(html).toContain('data-testid="export-commercial-plan"');
    expect(html).toContain('data-testid="export-commercial-snapshot"');
  });

  it("exposes accessible disabled reasons when no meaningful output exists", () => {
    const fixture = commercialOutputFixtureInput();
    const html = renderToStaticMarkup(createElement(CommercialOutputsModal, {
      snapshot: createCommercialOutputSnapshot({ ...fixture, machines: [], civilReferences: [] }),
      actions: {
          bom: { enabled: false, reason: "Add equipment before exporting a BOM." },
          plan: { enabled: false, reason: "Add visible layout geometry before exporting a plan." },
          snapshot: { enabled: false, reason: "Add visible scene content before exporting a snapshot." }
      },
      onExport: vi.fn(),
      onClose: vi.fn()
    }));
    expect(html).toContain("Add equipment before exporting a BOM.");
    expect(html).toContain('aria-describedby="commercial-output-reason-bom"');
    expect((html.match(/disabled=""/g) ?? [])).toHaveLength(3);
  });
});
