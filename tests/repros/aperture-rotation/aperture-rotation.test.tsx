import { expect, test } from "bun:test";
import { getGerberLayerString } from "lib/gerber-layer";
import { findBitmapShorts, renderBitmapShortDebug } from "lib/index";
import { writeOrCompareBinarySnapshot } from "tests/fixtures/bitmap-snapshot";
import { comparisonPng } from "./comparison";
import { boardWithVia, cases } from "./fixture";

test("snapshot the same rotated copper through PCB and Gerber rendering", async () => {
  const rows = [];
  for (const scenario of cases) {
    const circuitJson = await boardWithVia(scenario.x, scenario.y);
    const options = { layer: "top" as const, width: 320, height: 320 };
    const pcb = await renderBitmapShortDebug(circuitJson, {
      ...options,
      mode: "pcb",
    });
    const gerber = await renderBitmapShortDebug(circuitJson, {
      ...options,
      mode: "gerber",
    });
    expect(pcb.shorts).toHaveLength(scenario.expected);
    // Prove rotation survives export. The failure is after this boundary.
    expect(getGerberLayerString(circuitJson, "top")).toContain("%LR45*%");
    rows.push({
      title:
        scenario.name === "contact"
          ? "A. Via on the diagonal pad - must report 1 short"
          : "B. Via beside the diagonal pad - must report 0 shorts",
      pcb,
      gerber,
    });
  }
  await writeOrCompareBinarySnapshot(
    import.meta.path,
    "comparison",
    comparisonPng(rows),
  );
});

for (const scenario of cases) {
  // Executed expected failures: remove .failing in the stacked fix. These
  // assertions describe correct behavior, rather than blessing the defect.
  test.failing(`Gerber ${scenario.name}: detects ${scenario.expected} shorts`, async () => {
    const circuitJson = await boardWithVia(scenario.x, scenario.y);
    const shorts = await findBitmapShorts(circuitJson, {
      mode: "gerber",
      layer: "top",
      pixelsPerMm: 100,
    });
    expect(shorts).toHaveLength(scenario.expected);
  });
}
