import { expect, test } from "bun:test";
import { getGerberLayerString } from "lib/gerber-layer";
import { findBitmapShorts, renderBitmapShortDebug } from "lib/index";
import { writeOrCompareBinarySnapshot } from "tests/fixtures/bitmap-snapshot";
import { comparisonPng } from "./comparison";
import { controllerBoard, cases } from "./fixture";

// Both renderers receive the entire routed board, with its source connectivity.
// The close-ups are crops of those renders, not separately drawn test shapes.
test("snapshot a routed board with a rotated IC beside a GND escape via", async () => {
  const rows = [];
  for (const scenario of cases) {
    const circuitJson = await controllerBoard(scenario);
    const options = { layer: "top" as const, pixelsPerMm: 100 };
    const pcb = await renderBitmapShortDebug(circuitJson, {
      ...options,
      mode: "pcb",
    });
    const gerber = await renderBitmapShortDebug(circuitJson, {
      ...options,
      mode: "gerber",
    });
    expect(pcb.shorts).toHaveLength(scenario.expected);
    expect(gerber.shorts).toHaveLength(scenario.expected);
    if (scenario.name === "contact") {
      expect(pcb.shorts[0]!.firstOwnerLabels).toContain("U1.pin16");
      expect(pcb.shorts[0]!.secondOwnerLabels).toContain("C1.pin2");
    }
    expect(circuitJson.filter((e) => e.type === "pcb_trace")).toHaveLength(6);
    expect(circuitJson.filter((e) => e.type === "pcb_via")).toHaveLength(2);
    // The released exporter encodes rotation in the aperture coordinates,
    // which the stock renderer can read without support for LR commands.
    expect(getGerberLayerString(circuitJson, "top")).not.toContain("%LR");
    rows.push({ circuitJson, scenario, pcb, gerber });
  }
  await writeOrCompareBinarySnapshot(
    import.meta.path,
    "comparison",
    comparisonPng(rows),
  );
});

for (const scenario of cases) {
  test(`Gerber ${scenario.name}: detects ${scenario.expected} VCC-GND shorts`, async () => {
    const circuitJson = await controllerBoard(scenario);
    const shorts = await findBitmapShorts(circuitJson, {
      mode: "gerber",
      layer: "top",
      pixelsPerMm: 100,
    });
    expect(shorts).toHaveLength(scenario.expected);
  });
}
