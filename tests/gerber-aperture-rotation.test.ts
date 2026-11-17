import { expect, test } from "bun:test";
import type { AnyCircuitElement } from "circuit-json";
import { getGerberLayerString } from "lib/gerber-layer";
import { createGerberGroupMask } from "lib/gerber-mask";
import { renderGerberToSvg } from "lib/gerber-svg";
import { getMaskFromPng } from "lib/png-mask";
import { renderSvgToPng } from "lib/svg-to-png";

for (const rotation of [0, 30, 45, 90, 135, 270, -30]) {
  test(`preserves rounded pad geometry at ${rotation} degrees without rewriting export`, async () => {
    const pad = {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad",
      layer: "top",
      shape: "rotated_rect",
      width: 2.2,
      height: 0.24,
      corner_radius: 0.06,
      x: 0.3,
      y: -0.2,
      ccw_rotation: rotation,
      is_covered_with_solder_mask: false,
    } as AnyCircuitElement;
    const original = JSON.stringify(pad);
    const gerber = getGerberLayerString([pad], "top");
    if (rotation !== 0) expect(gerber).toContain(`%LR${rotation}*%`);
    const mask = await createGerberGroupMask({
      elements: [pad],
      layer: "top",
      width: 600,
      height: 600,
      bounds: { minX: -1.5, maxX: 1.5, minY: -1.5, maxY: 1.5 },
    });
    const angle = (rotation * Math.PI) / 180;
    // Probe in aperture-local coordinates, away from copper boundaries.
    const at = (u: number, v: number) => {
      const x = 0.3 + u * Math.cos(angle) - v * Math.sin(angle);
      const y = -0.2 + u * Math.sin(angle) + v * Math.cos(angle);
      return mask[
        Math.floor((1.5 - y) * 200) * 600 + Math.floor((x + 1.5) * 200)
      ];
    };
    expect(at(0.8, 0)).toBe(1);
    expect(at(-0.8, 0)).toBe(1);
    expect(at(0, 0.3)).toBe(0);
    expect(at(0, -0.3)).toBe(0);
    // Inside the nominal rectangle but outside its rounded corner.
    expect(at(1.095, 0.115)).toBe(0);
    expect(JSON.stringify(pad)).toBe(original);
  });
}

test("raw Gerber rotates a macro's clear hole about the flash, then resets for the next flash", async () => {
  const gerber = `%FSLAX26Y26*%
%MOMM*%
%AMHOLED*21,1,2,0.4,0,0,0*1,0,0.2,0.5,0,0*%
%ADD10HOLED*%
D10*
%LR45*%
X2000000Y3000000D03*
%LR0*%
X5000000Y3000000D03*
M02*`;
  const svg = await renderGerberToSvg(gerber);
  const [minX, minY, viewWidth, viewHeight] = svg
    .match(/viewBox="([^"]+)"/)![1]
    .split(" ")
    .map(Number);
  const width = Math.ceil(viewWidth / 5);
  const height = Math.ceil(viewHeight / 5);
  const png = renderSvgToPng(
    svg
      .replace(/\swidth="[^"]+"/, ` width="${width}"`)
      .replace(/\sheight="[^"]+"/, ` height="${height}"`),
  );
  const mask = getMaskFromPng(png);
  const at = (x: number, y: number) =>
    mask[
      Math.floor(((minY + viewHeight - y * 1000) / viewHeight) * height) *
        width +
        Math.floor(((x * 1000 - minX) / viewWidth) * width)
    ];
  const offset = 0.5 / Math.sqrt(2);
  expect(at(2, 3)).toBe(1);
  expect(at(2 + offset, 3 + offset)).toBe(0); // rotated clear hole
  expect(at(2 + 0.8 / Math.sqrt(2), 3 + 0.8 / Math.sqrt(2))).toBe(1);
  expect(at(2.8, 3)).toBe(0); // no phantom horizontal copper
  expect(at(5, 3)).toBe(1);
  expect(at(5.5, 3)).toBe(0); // LR0 restores the horizontal hole
  expect(at(5.8, 3)).toBe(1);
  expect(at(5 + offset, 3 + offset)).toBe(0);
});
