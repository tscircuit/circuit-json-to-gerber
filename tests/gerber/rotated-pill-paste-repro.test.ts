import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import type { AnyGerberCommand } from "src/gerber/any_gerber_command"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

const angles = [30, 45, 90, 270]
const padWidth = 2.4
const padHeight = 1.1
const padRadius = 0.55

const rotatedPillPads = (layer: "top" | "bottom") =>
  angles.flatMap((angle, index) => {
    const x = -4.2 + index * 2.8
    const y = layer === "top" ? 3.5 : -3.5
    return [
      {
        type: "pcb_smtpad",
        pcb_smtpad_id: `pill_pad_${layer}_${angle}`,
        layer,
        shape: "rotated_pill",
        width: padWidth,
        height: padHeight,
        radius: padRadius,
        x,
        y,
        ccw_rotation: angle,
        is_covered_with_solder_mask: false,
      },
      {
        type: "pcb_solder_paste",
        pcb_solder_paste_id: `pill_paste_${layer}_${angle}`,
        layer,
        shape: "rotated_pill",
        width: padWidth,
        height: padHeight,
        radius: padRadius,
        x,
        y,
        ccw_rotation: angle,
        pcb_smtpad_id: `pill_pad_${layer}_${angle}`,
      },
    ]
  })

const platedHolePaste = ({
  layer,
  x,
  angle,
  pasteShape,
}: {
  layer: "top" | "bottom"
  x: number
  angle: number
  pasteShape: "pill" | "rect"
}) => {
  const y = layer === "top" ? 0.8 : -0.8
  return [
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: `plated_hole_${layer}_${pasteShape}`,
      shape: "pill",
      x,
      y,
      layers: ["top", "bottom"],
      outer_width: padWidth,
      outer_height: padHeight,
      hole_width: 1.6,
      hole_height: 0.6,
      ccw_rotation: angle,
      is_covered_with_solder_mask: false,
    },
    {
      type: "pcb_solder_paste",
      pcb_solder_paste_id: `plated_hole_paste_${layer}_${pasteShape}`,
      layer,
      shape: pasteShape,
      width: padWidth,
      height: padHeight,
      ...(pasteShape === "pill" ? { radius: padRadius } : {}),
      x,
      y,
    },
  ]
}

const circuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    center: { x: 0, y: 0 },
    width: 14,
    height: 14,
    num_layers: 2,
  },
  ...rotatedPillPads("top"),
  ...rotatedPillPads("bottom"),
  ...platedHolePaste({ layer: "top", x: -4.5, angle: 45, pasteShape: "pill" }),
  ...platedHolePaste({ layer: "top", x: 4.5, angle: 30, pasteShape: "rect" }),
  ...platedHolePaste({
    layer: "bottom",
    x: -4.5,
    angle: 45,
    pasteShape: "pill",
  }),
  ...platedHolePaste({
    layer: "bottom",
    x: 4.5,
    angle: 30,
    pasteShape: "rect",
  }),
] as AnyCircuitElement[]

const getFlashAperture = (
  commands: AnyGerberCommand[],
  x: number,
  y: number,
) => {
  const flashIndex = commands.findIndex(
    (command) =>
      command.command_code === "D03" && command.x === x && command.y === y,
  )
  expect(flashIndex).toBeGreaterThanOrEqual(0)
  let apertureNumber: number | undefined
  for (let index = flashIndex; index >= 0; index--) {
    const command = commands[index]
    if (command.command_code === "D") {
      apertureNumber = command.aperture_number
      break
    }
  }
  expect(apertureNumber).toBeDefined()
  const aperture = commands.find(
    (command) =>
      command.command_code === "ADD" &&
      command.aperture_number === apertureNumber,
  )
  expect(aperture).toBeDefined()
  const {
    aperture_number: _ignored,
    command_code: _code,
    ...geometry
  } = aperture as any
  return { apertureNumber, geometry }
}

const snapshotOptions = {
  colors: {
    F_Cu: "#cc9933",
    B_Cu: "#cc9933",
    F_Paste: "#999999",
    B_Paste: "#999999",
  },
  backgroundColor: "#111111",
  skipPasteRotationCompensation: true,
}

test("rotated pill solder paste depends on LR load rotation", async () => {
  const commands = convertSoupToGerberCommands(circuitJson)
  const gerberOutput = stringifyGerberCommandLayers(commands)

  for (const layer of ["F_Paste", "B_Paste"] as const) {
    expect(gerberOutput[layer]).toContain("%LR")
  }

  for (const layer of ["top", "bottom"] as const) {
    const copperName = layer === "top" ? "F_Cu" : "B_Cu"
    const pasteName = layer === "top" ? "F_Paste" : "B_Paste"
    const y = layer === "top" ? 3.5 : -3.5
    const copper = getFlashAperture(commands[copperName], -4.2, y)
    const paste = getFlashAperture(commands[pasteName], -4.2, y)
    expect(paste.geometry).not.toEqual(copper.geometry)
  }

  await expect(gerberOutput).toMatchCircuitJsonPcbAndGerberSnapshot(
    import.meta.path,
    "rotated-pill-paste-repro-top",
    circuitJson,
    ["F_Cu", "F_Paste"],
    snapshotOptions,
  )

  await expect(gerberOutput).toMatchCircuitJsonPcbAndGerberSnapshot(
    import.meta.path,
    "rotated-pill-paste-repro-bottom",
    circuitJson,
    ["B_Cu", "B_Paste"],
    snapshotOptions,
  )
})
