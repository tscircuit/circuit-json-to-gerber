import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import type { AnyCircuitElement, PcbSolderPaste } from "circuit-json"
import { Fragment } from "react"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

const createCircuitJson = (layer: "top" | "bottom") => {
  const circuit = new Circuit()
  circuit.add(
    <board width={8} height={5} routingDisabled schematicDisabled>
      <silkscreentext
        text="PILL PASTE / #280"
        pcbY={2}
        fontSize={0.4}
        layer="top"
      />
      <silkscreentext
        text="GOLD: COPPER   GRAY: PASTE"
        pcbY={-2}
        fontSize={0.25}
        layer="top"
      />
      {[0, 30, 90, 270].map((rotation, column) => (
        <Fragment key={rotation}>
          <silkscreentext
            text={`${rotation} deg`}
            pcbX={-2.7 + column * 1.8}
            pcbY={1.25}
            fontSize={0.3}
            layer="top"
          />
          <chip
            name={`U${column + 1}`}
            pcbX={-2.7 + column * 1.8}
            pcbY={0.4}
            pcbRotation={rotation}
            footprint={
              <footprint>
                <smtpad
                  shape="pill"
                  width={0.9}
                  height={0.28}
                  radius={0.14}
                  layer={layer}
                  portHints={["pin1"]}
                />
              </footprint>
            }
          />
        </Fragment>
      ))}
      <silkscreentext
        text="90 deg / 0.5 mm pitch"
        pcbX={0}
        pcbY={-0.4}
        fontSize={0.3}
        layer="top"
      />
      {Array.from({ length: 6 }, (_, index) => (
        <chip
          key={index}
          name={`J${index + 1}`}
          pcbX={-1.25 + index * 0.5}
          pcbY={-1.1}
          pcbRotation={90}
          footprint={
            <footprint>
              <smtpad
                shape="pill"
                width={0.9}
                height={0.28}
                radius={0.14}
                layer={layer}
                portHints={["pin1"]}
              />
            </footprint>
          }
        />
      ))}
    </board>,
  )
  const circuitJson = circuit.getCircuitJson()
  // The pinned core emits pill copper but no pill paste. Add the 70% paste
  // openings from #280, preserving the TSX pads' positions and rotations.
  const paste: PcbSolderPaste[] = circuitJson.flatMap((pad) => {
    if (
      pad.type !== "pcb_smtpad" ||
      (pad.shape !== "pill" && pad.shape !== "rotated_pill")
    )
      return []
    return [
      {
        type: "pcb_solder_paste",
        pcb_solder_paste_id: `paste_${pad.pcb_smtpad_id}`,
        pcb_smtpad_id: pad.pcb_smtpad_id,
        pcb_component_id: pad.pcb_component_id,
        layer: pad.layer,
        x: pad.x,
        y: pad.y,
        width: pad.width * 0.7,
        height: pad.height * 0.7,
        radius: pad.radius * 0.7,
        ...(pad.shape === "rotated_pill"
          ? { shape: "rotated_pill" as const, ccw_rotation: pad.ccw_rotation }
          : { shape: "pill" as const }),
      },
    ]
  })
  expect(paste).toHaveLength(10)
  return [...circuitJson, ...paste]
}

const fixtures = {
  top: createCircuitJson("top"),
  bottom: createCircuitJson("bottom"),
}

for (const layer of ["top", "bottom"] as const) {
  const prefix = layer === "top" ? "F" : "B"
  test(`repro #280: ${layer} pill paste raw Gerber overlay`, async () => {
    const output = stringifyGerberCommandLayers(
      convertSoupToGerberCommands(fixtures[layer]),
    )
    // Unlike the stackup matcher, this renders the exported files directly;
    // it does not inject SVG rotations to compensate for unsupported LR.
    await expect(output).toMatchGerberLayerOverlaySnapshot(
      import.meta.path,
      `rotated-pill-paste-280-${layer}`,
      [`${prefix}_Cu`, `${prefix}_Paste`, "F_SilkScreen"],
      {
        backgroundColor: "#111827",
        colors: {
          [`${prefix}_Cu`]: "#e6b85c",
          [`${prefix}_Paste`]: "#b8c3d1",
          ["F_SilkScreen"]: "#f8fafc",
        },
      },
    )
  })

  for (const flip_y_axis of [false, true]) {
    test.failing(
      `#280: ${layer} 90 degree paste uses a vertical aperture without LR (flip=${flip_y_axis})`,
      () => {
        const pad = fixtures[layer]
          .filter((elm) => elm.type === "pcb_solder_paste")
          .find(
            (elm) =>
              elm.type === "pcb_solder_paste" &&
              elm.shape === "rotated_pill" &&
              elm.ccw_rotation === 90,
          )!
        if (pad.shape !== "rotated_pill")
          throw new Error("Expected rotated pill fixture")
        const circuitJson: AnyCircuitElement[] = [
          fixtures[layer].find((elm) => elm.type === "pcb_board")!,
          pad,
        ]
        const commands = convertSoupToGerberCommands(circuitJson, {
          flip_y_axis,
        })[`${prefix}_Paste`]
        const flash = commands.find(
          (command) => command.command_code === "D03",
        )!
        const select = commands.find((command) => command.command_code === "D")
        if (!select) throw new Error("Missing paste aperture selection")
        const aperture = commands.find(
          (command) =>
            command.command_code === "ADD" &&
            command.aperture_number === select.aperture_number,
        )
        expect(aperture).toMatchObject({ standard_template_code: "O" })
        if (
          !aperture ||
          !("standard_template_code" in aperture) ||
          aperture.standard_template_code !== "O"
        )
          throw new Error("Expected obround paste aperture")
        expect(aperture.x_size).toBeCloseTo(0.196, 6)
        expect(aperture.y_size).toBeCloseTo(0.63, 6)
        expect(flash).toMatchObject({
          x: pad.x,
          y: pad.y * (flip_y_axis ? -1 : 1),
        })
        expect(commands.some((command) => command.command_code === "LR")).toBe(
          false,
        )
      },
    )
  }
}
