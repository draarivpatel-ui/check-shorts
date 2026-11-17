import { Fragment } from "react";
import { getTestFixture } from "tests/fixtures/get-test-fixture";

export const boardSize = { width: 20, height: 16 };
// U1.16 is the top-right pad of a 45-degree SOIC-style footprint.
export const powerPad = { x: (3.2 - 2.8) / Math.SQRT2, y: 6 / Math.SQRT2 };
export const cases = [
  { name: "contact", dx: 0.42, dy: 0.42, expected: 1 },
  { name: "clear", dx: 0.78, dy: 0.2, expected: 0 },
] as const;

type PathPoint =
  | string
  | { x: number; y: number; via?: boolean; toLayer?: "bottom" };
// pcbPath coordinates are relative to the starting component's transform.
function pathFrom(x: number, y: number, rotation: number, points: PathPoint[]) {
  const angle = (-rotation * Math.PI) / 180;
  return points.map((point) =>
    typeof point === "string"
      ? point
      : {
          ...point,
          x: (point.x - x) * Math.cos(angle) - (point.y - y) * Math.sin(angle),
          y: (point.x - x) * Math.sin(angle) + (point.y - y) * Math.cos(angle),
        },
  );
}

// Representative routed controller board, not the unavailable customer board.
// Both revisions have the same components and nets. Only the GND via and the
// last segment of its escape route move relative to U1.16 (VCC).
export async function controllerBoard(scenario: (typeof cases)[number]) {
  const { circuit } = getTestFixture();
  const via = { x: powerPad.x + scenario.dx, y: powerPad.y + scenario.dy };
  circuit.add(
    <board {...boardSize} routingDisabled>
      <net name="VCC" />
      <net name="GND" />
      <net name="LED" />
      <chip
        name="U1"
        pcbRotation={45}
        footprint={
          <footprint>
            {Array.from({ length: 16 }, (_, index) => (
              <Fragment key={index}>
                <smtpad
                  portHints={[`pin${index + 1}`]}
                  shape="rotated_rect"
                  width={1.4}
                  height={0.35}
                  ccwRotation={0}
                  cornerRadius={0.08}
                  pcbX={index < 8 ? -3.2 : 3.2}
                  pcbY={
                    index < 8 ? 2.8 - index * 0.8 : -2.8 + (index - 8) * 0.8
                  }
                  layer="top"
                />
              </Fragment>
            ))}
            <silkscreenpath
              route={[
                { x: -2.3, y: -3.2 },
                { x: 2.3, y: -3.2 },
                { x: 2.3, y: 3.2 },
                { x: -2.3, y: 3.2 },
                { x: -2.3, y: -3.2 },
              ]}
            />
          </footprint>
        }
      />
      <capacitor
        name="C1"
        capacitance="100nF"
        footprint="0603"
        pcbX={6}
        pcbY={6.5}
      />
      <resistor
        name="R1"
        resistance="1k"
        footprint="0603"
        pcbX={-6}
        pcbY={-5.5}
      />
      <led name="D1" footprint="0603" pcbX={-2} pcbY={-6.5} />
      <chip
        name="J1"
        pcbX={7}
        pcbY={-5}
        footprint={
          <footprint>
            {[1, 2].map((pin) => (
              <Fragment key={pin}>
                <platedhole
                  portHints={[`pin${pin}`]}
                  shape="circle"
                  holeDiameter={1}
                  outerDiameter={1.8}
                  pcbY={pin === 1 ? 1.27 : -1.27}
                />
              </Fragment>
            ))}
          </footprint>
        }
      />
      <trace from=".U1 > .pin16" to="net.VCC" />
      <trace from=".C1 > .pin2" to="net.GND" />
      <trace from=".U1 > .pin8" to="net.LED" />
      <trace
        from=".U1 > .pin16"
        to=".C1 > .pin1"
        thickness={0.2}
        pcbPath={pathFrom(0, 0, 45, [
          ".U1 > .pin16",
          { x: -0.5, y: 5.026 },
          { x: -1.4, y: 5.926 },
          { x: -1.4, y: 6.5 },
          ".C1 > .pin1",
        ])}
      />
      <trace
        from=".C1 > .pin2"
        to=".J1 > .pin2"
        thickness={0.2}
        pcbPath={pathFrom(6, 6.5, 0, [
          ".C1 > .pin2",
          { x: 7.2, y: 5.8 },
          { x: 3, y: 5.8 },
          { x: 3, y: via.y },
          via,
          { ...via, via: true, toLayer: "bottom" },
          via,
          { x: 5.5, y: 2 },
          { x: 5.5, y: -6.27 },
          ".J1 > .pin2",
        ])}
      />
      <trace
        from=".C1 > .pin1"
        to=".J1 > .pin1"
        thickness={0.2}
        pcbPath={pathFrom(6, 6.5, 0, [
          ".C1 > .pin1",
          { x: 4.5, y: 6.5 },
          { x: 4.5, y: 6.3 },
          { x: 4.5, y: 6.3, via: true, toLayer: "bottom" },
          { x: 4.5, y: 6.3 },
          { x: 8.5, y: 6 },
          { x: 8.5, y: -3.73 },
          ".J1 > .pin1",
        ])}
      />
      <trace
        from=".U1 > .pin8"
        to=".R1 > .pin1"
        thickness={0.2}
        pcbPath={pathFrom(0, 0, 45, [
          ".U1 > .pin8",
          { x: -1, y: -4.5 },
          { x: -6.95, y: -4.5 },
          ".R1 > .pin1",
        ])}
      />
      <trace
        from=".R1 > .pin2"
        to=".D1 > .pin1"
        thickness={0.2}
        pcbPath={pathFrom(-6, -5.5, 0, [
          ".R1 > .pin2",
          { x: -4, y: -5.5 },
          { x: -3, y: -6.5 },
          ".D1 > .pin1",
        ])}
      />
      <trace
        from=".D1 > .pin2"
        to=".J1 > .pin2"
        thickness={0.2}
        pcbPath={pathFrom(-2, -6.5, 0, [
          ".D1 > .pin2",
          { x: 1, y: -6.5 },
          { x: 2, y: -6.27 },
          ".J1 > .pin2",
        ])}
      />
    </board>,
  );
  await circuit.renderUntilSettled();
  return circuit.getCircuitJson();
}
