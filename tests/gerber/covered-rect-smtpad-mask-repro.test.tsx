import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { parseGerberFile } from "gerberts"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

const shapes = [
  {
    label: "rectangle",
    ccwRotationDegrees: 0,
    pad: { shape: "rect" as const, width: 4, height: 2 },
  },
  {
    label: "circle",
    ccwRotationDegrees: 0,
    pad: { shape: "circle" as const, radius: 1.5 },
  },
  {
    label: "rounded",
    ccwRotationDegrees: 0,
    pad: { shape: "rect" as const, width: 4, height: 2, cornerRadius: 0.5 },
  },
  {
    label: "rot. rect",
    ccwRotationDegrees: 45,
    pad: { shape: "rect" as const, width: 4, height: 2 },
  },
  {
    label: "pill",
    ccwRotationDegrees: 0,
    pad: { shape: "pill" as const, width: 4, height: 2, radius: 1 },
  },
  {
    label: "rot. pill",
    ccwRotationDegrees: 45,
    pad: { shape: "pill" as const, width: 4, height: 2, radius: 1 },
  },
  {
    label: "polygon",
    ccwRotationDegrees: 0,
    pad: {
      shape: "polygon" as const,
      points: [
        { x: -2, y: -1 },
        { x: 1, y: -1 },
        { x: 2, y: 1 },
        { x: -1, y: 1 },
      ],
    },
  },
]

test("covered smt pad soldermask repro", async () => {
  const circuit = new Circuit()
  circuit.add(
    <board width={82} height={28} routingDisabled>
      <silkscreentext
        text="SMT SOLDER MASK COVERAGE"
        pcbX={0}
        pcbY={10.5}
        fontSize={1.5}
      />
      <silkscreentext text="covered" pcbX={-37} pcbY={3} fontSize={1} />
      <silkscreentext text="exposed" pcbX={-37} pcbY={-4} fontSize={1} />
      <silkscreentext
        text="RED: COPPER ONLY    WHITE: MASK OPENING"
        pcbX={0}
        pcbY={-10.5}
        fontSize={1}
      />
      {shapes.map(({ label }, index) => (
        <silkscreentext
          key={label}
          text={label}
          pcbX={-25 + index * 9}
          pcbY={7}
          fontSize={0.8}
        />
      ))}
      {[
        { covered: true, y: 3 },
        { covered: false, y: -4 },
      ].map(({ covered, y }, row) =>
        shapes.map(({ ccwRotationDegrees, pad }, index) => (
          <chip
            key={`${row}-${index}`}
            name={`K${row}_${index}`}
            pcbX={-25 + index * 9}
            pcbY={y}
            pcbRotation={ccwRotationDegrees}
            footprint={
              <footprint>
                <smtpad
                  {...pad}
                  portHints={["pin1"]}
                  layer="top"
                  coveredWithSolderMask={covered}
                />
              </footprint>
            }
          />
        )),
      )}
    </board>,
  )
  await circuit.renderUntilSettled()
  const circuitJson = circuit.getCircuitJson()
  expect(
    circuitJson.filter((element) => element.type === "pcb_smtpad"),
  ).toHaveLength(14)
  expect(
    circuitJson.filter(
      (element) =>
        element.type === "pcb_smtpad" && element.is_covered_with_solder_mask,
    ),
  ).toHaveLength(7)
  const gerberOutput = stringifyGerberCommandLayers(
    convertSoupToGerberCommands(circuitJson),
  )
  expect(parseGerberFile(gerberOutput.F_Cu).operations.length).toBeGreaterThan(
    0,
  )
  await expect(gerberOutput).toMatchGerberLayerOverlaySnapshot(
    import.meta.path,
    "covered-rect-smtpad-mask-repro",
    ["F_Cu", "F_Mask", "F_SilkScreen"],
    {
      backgroundColor: "#111827",
      colors: { F_Cu: "#ef4444", F_Mask: "#f8fafc", F_SilkScreen: "#cbd5e1" },
    },
  )
})
