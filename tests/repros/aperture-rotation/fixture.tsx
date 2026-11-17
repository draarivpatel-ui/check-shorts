import { getTestFixture } from "tests/fixtures/get-test-fixture";

export const cases = [
  { name: "contact", x: 0.65, y: 0.65, expected: 1 },
  { name: "clear", x: 0.85, y: 0, expected: 0 },
] as const;

// The two electrically independent copper objects must not touch. Routing is
// disabled so that the fixture measures only the pad and via geometry.
export async function boardWithVia(x: number, y: number) {
  const { circuit } = getTestFixture();
  circuit.add(
    <board width={3} height={3} routingDisabled>
      <chip
        name="J1"
        footprint={
          <footprint>
            <smtpad
              portHints={["pin1"]}
              shape="rotated_rect"
              width={2.2}
              height={0.24}
              ccwRotation={45}
              cornerRadius={0.06}
              layer="top"
            />
          </footprint>
        }
      />
      <via
        name="V1"
        pcbX={x}
        pcbY={y}
        fromLayer="top"
        toLayer="bottom"
        outerDiameter={0.3}
        holeDiameter={0.15}
      />
    </board>,
  );
  await circuit.renderUntilSettled();
  return circuit.getCircuitJson();
}
