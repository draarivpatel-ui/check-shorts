import {
  glyphAdvanceRatio,
  glyphWidthRatio,
  strokeWidthRatio,
  svgAlphabet,
} from "@tscircuit/alphabet";
import { encodeRgbaPng, type BitmapShortDebugRender } from "lib/index";
import { renderSvgToPng } from "lib/svg-to-png";

// Use vector glyphs so snapshots do not depend on the host's installed fonts.
function label(text: string, x: number, y: number, size = 16) {
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

export function comparisonPng(
  rows: {
    title: string;
    pcb: BitmapShortDebugRender;
    gerber: BitmapShortDebugRender;
  }[],
) {
  const panels = rows.map(({ title, pcb, gerber }, row) => {
    const top = 100 + row * 396;
    const panel = (render: BitmapShortDebugRender, x: number, mode: string) => {
      const png = Buffer.from(encodeRgbaPng(render)).toString("base64");
      const count = render.shorts.length;
      return `${label(`${mode} - ${count} ${count === 1 ? "short" : "shorts"}`, x, top + 26)}
        <image x="${x}" y="${top + 54}" width="320" height="320" href="data:image/png;base64,${png}"/>`;
    };
    return `${label(title, 20, top, 17)}${panel(pcb, 20, "PCB")}${panel(gerber, 360, "Gerber")}`;
  });
  return renderSvgToPng(`<svg xmlns="http://www.w3.org/2000/svg" width="700" height="930">
    <rect width="100%" height="100%" fill="#f7f9fc"/>
    ${label("Same copper. Two renderers.", 20, 12, 23)}
    ${label("45 degree rounded pad, 2.2 x 0.24 mm", 20, 48)}
    ${label("Via diameter 0.30 mm; hole 0.15 mm", 20, 70)}
    ${panels.join("")}
    ${label("Pink ring = detected contact between separate nets", 20, 892, 15)}
  </svg>`);
}
