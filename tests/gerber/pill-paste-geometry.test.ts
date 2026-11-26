import { expect, test } from "bun:test"
import type { AnyCircuitElement, PcbSolderPaste } from "circuit-json"
import gerberToSvg from "gerber-to-svg"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

const board: AnyCircuitElement = {
  type: "pcb_board",
  pcb_board_id: "board",
  center: { x: 0, y: 0 },
  width: 10,
  height: 10,
  num_layers: 2,
  thickness: 1.6,
  material: "fr4",
}

const expectPillGeometry = async (
  paste: Extract<PcbSolderPaste, { shape: "pill" | "rotated_pill" }>,
  rotation: number,
  flip_y_axis: boolean,
  extraElements: AnyCircuitElement[] = [],
) => {
  const layer = paste.layer === "top" ? "F_Paste" : "B_Paste"
  const commands = convertSoupToGerberCommands(
    [board, paste, ...extraElements],
    { flip_y_axis },
  )
  const output = stringifyGerberCommandLayers(commands)[layer]
  expect(output).not.toContain("%LR")
  expect(
    commands[layer].filter((command) => command.command_code === "D03"),
  ).toEqual([
    { command_code: "D03", x: paste.x, y: flip_y_axis ? -paste.y : paste.y },
  ])

  // Independent CAM readback: gerber-to-svg ignores LR. Its bounds must still
  // match the analytically rotated capsule, including the reflected center.
  const svg = await new Promise<string>((resolve, reject) => {
    gerberToSvg(output, {}, (error, svg) =>
      error ? reject(error) : resolve(svg),
    )
  })
  const viewBox = svg
    .match(/viewBox="([^"]+)"/)![1]
    .split(/\s+/)
    .map(Number)
  const angle = (rotation * Math.PI) / 180
  const horizontal = paste.width >= paste.height
  const radius = Math.min(paste.width, paste.height) / 2
  const offset = Math.abs(paste.width - paste.height) / 2
  const selected = commands[layer].find(
    (command) => command.command_code === "D",
  )!
  const aperture = commands[layer].find(
    (command) =>
      command.command_code === "ADD" &&
      command.aperture_number === selected.aperture_number,
  )!
  if (
    aperture.command_code === "ADD" &&
    "macro_name" in aperture &&
    aperture.macro_name === "ROTATEDPILL"
  ) {
    // Bounds alone cannot distinguish +angle from -angle. Check the actual
    // aperture endpoints too, so Y reflection must preserve the orientation.
    expect(aperture.offset_x).toBeCloseTo(
      offset * (horizontal ? Math.cos(angle) : -Math.sin(angle)),
      6,
    )
    expect(aperture.offset_y).toBeCloseTo(
      offset *
        (horizontal ? Math.sin(angle) : Math.cos(angle)) *
        (flip_y_axis ? -1 : 1),
      6,
    )
  }
  const halfWidth =
    radius + offset * Math.abs(horizontal ? Math.cos(angle) : Math.sin(angle))
  const halfHeight =
    radius + offset * Math.abs(horizontal ? Math.sin(angle) : Math.cos(angle))
  // The renderer reports its bounds in the original Gerber coordinate frame.
  const expected = [
    paste.x - halfWidth,
    (flip_y_axis ? -paste.y : paste.y) - halfHeight,
    2 * halfWidth,
    2 * halfHeight,
  ]
  viewBox.forEach((value, index) =>
    expect(value / 1000).toBeCloseTo(expected[index], 5),
  )
}

for (const layer of ["top", "bottom"] as const) {
  for (const flip of [false, true]) {
    for (const [width, height] of [
      [0.63, 0.196],
      [0.196, 0.63],
      [0.4, 0.4],
    ]) {
      for (const rotation of [0, 30, 90, -45, 180, 270, 450]) {
        test(`pill paste geometry: ${layer}, ${width}x${height}, ${rotation} degrees, flip=${flip}`, async () => {
          await expectPillGeometry(
            {
              type: "pcb_solder_paste",
              pcb_solder_paste_id: "paste",
              layer,
              shape: "rotated_pill",
              x: 1.2,
              y: -0.8,
              width,
              height,
              radius: Math.min(width, height) / 2,
              ccw_rotation: rotation,
            },
            rotation,
            flip,
          )
        })
      }
    }

    for (const rotation of [0, 30, 90, 270]) {
      test(`legacy pill paste inherits plated-hole rotation: ${layer}, ${rotation} degrees, flip=${flip}`, async () => {
        const paste = {
          type: "pcb_solder_paste" as const,
          pcb_solder_paste_id: "legacy_paste",
          layer,
          shape: "pill" as const,
          x: 1.2,
          y: -0.8,
          width: 0.196,
          height: 0.63,
          radius: 0.098,
        }
        const hole: AnyCircuitElement = {
          type: "pcb_plated_hole",
          pcb_plated_hole_id: "hole",
          shape: "pill",
          x: paste.x,
          y: paste.y,
          layers: ["top", "bottom"],
          outer_width: 0.28,
          outer_height: 0.9,
          hole_width: 0.1,
          hole_height: 0.5,
          ccw_rotation: rotation,
        }
        await expectPillGeometry(paste, rotation, flip, [hole])
        // An explicit zero must override the coincident plated hole.
        await expectPillGeometry(
          { ...paste, shape: "rotated_pill", ccw_rotation: 0 },
          0,
          flip,
          [hole],
        )
      })
    }
  }
}
