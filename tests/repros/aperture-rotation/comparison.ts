import {
  glyphAdvanceRatio,
  glyphWidthRatio,
  strokeWidthRatio,
  svgAlphabet,
} from "@tscircuit/alphabet";
import type { AnyCircuitElement } from "circuit-json";
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg";
import { encodeRgbaPng, type BitmapShortDebugRender } from "lib/index";
import { renderSvgToPng } from "lib/svg-to-png";
import { boardSize, powerPad, type cases } from "./fixture";

// Vector glyphs keep the captions independent of installed system fonts.
function label(text: string, x: number, y: number, size = 17) {
  let cursor = 0;
  const paths = [...text].map((character) => {
    const path = svgAlphabet[character as keyof typeof svgAlphabet];
    const svg = path
      ? `<path d="${path}" transform="translate(${cursor} 0)"/>`
      : "";
    cursor += glyphAdvanceRatio[character] ?? glyphWidthRatio;
    return svg;
  });
  return `<g fill="none" stroke="#172338" stroke-width="${strokeWidthRatio}" stroke-linecap="round" stroke-linejoin="round" transform="translate(${x} ${y}) scale(${size})">${paths.join("")}</g>`;
}

const imageData = (bytes: Uint8Array) =>
  `data:image/png;base64,${Buffer.from(bytes).toString("base64")}`;

export function comparisonPng(
  rows: {
    circuitJson: AnyCircuitElement[];
    scenario: (typeof cases)[number];
    pcb: BitmapShortDebugRender;
    gerber: BitmapShortDebugRender;
  }[],
) {
  const first = rows[0]!;
  const board = imageData(
    renderSvgToPng(
      convertCircuitJsonToPcbSvg(first.circuitJson, {
        layer: "top",
        width: 960,
        height: 768,
      }),
    ),
  );
  const gerberBoard = imageData(encodeRgbaPng(first.gerber));
  // Crop the same 3 x 3 mm window around U1.16 in each full-board bitmap.
  const zoomX = powerPad.x - 1.15;
  const zoomTop = powerPad.y + 1.3;
  const panels = rows.map(({ scenario, pcb, gerber }, row) => {
    const top = 540 + row * 386;
    const crop = (render: BitmapShortDebugRender, x: number, mode: string) => {
      const scale = render.width / boardSize.width;
      const px = (zoomX + boardSize.width / 2) * scale;
      const py = (boardSize.height / 2 - zoomTop) * scale;
      return `${label(`${mode}: ${render.shorts.length} shorts`, x, top + 32)}
        <svg x="${x}" y="${top + 64}" width="300" height="300" viewBox="${px} ${py} ${3 * scale} ${3 * scale}">
          <image width="${render.width}" height="${render.height}" href="${imageData(encodeRgbaPng(render))}"/>
        </svg>`;
    };
    const lines =
      scenario.name === "contact"
        ? [
            "VCC pad touches GND via.",
            "PCB detects the contact.",
            "Gerber misses the short.",
            "The diagonal pad becomes",
            "horizontal during rendering.",
          ]
        : [
            "GND via is clear of VCC.",
            "PCB reports no shorts.",
            "Gerber invents a contact.",
            "Same nets and components;",
            "only the via escape moves.",
          ];
    return `${label(scenario.name === "contact" ? "A. Contacting layout - expected 1 short" : "B. Separated layout - expected 0 shorts", 20, top, 20)}
      ${crop(pcb, 20, "PCB copper")}${crop(gerber, 350, "Gerber copper")}
      ${lines.map((line, i) => label(line, 680, top + 96 + i * 29, 17)).join("")}`;
  });
  return renderSvgToPng(`<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1350">
    <rect width="100%" height="100%" fill="#f7f9fc"/>
    ${label("Rotated IC: missed short and false alarm", 20, 14, 25)}
    ${label("Representative 20 x 16 mm board, not the customer's board", 20, 52, 17)}
    ${label("PCB layout - U1, C1, R1, D1, J1", 20, 88, 18)}
    ${label("Gerber checker - same board, case A", 520, 88, 18)}
    <image x="20" y="120" width="460" height="368" href="${board}"/>
    <image x="520" y="120" width="460" height="368" href="${gerberBoard}"/>
    ${label("U1 at 45 degrees; 1.4 x 0.35 mm rounded pads; GND via diameter 0.30 mm", 20, 500, 16)}
    ${panels.join("")}
    ${label("Close-ups are crops of full-board checker output. Pink rings mark detected shorts.", 20, 1310, 15)}
  </svg>`);
}
