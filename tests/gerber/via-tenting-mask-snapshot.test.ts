import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

test("visualize top and bottom mask openings for all via tenting combinations", async () => {
  const circuit: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board",
      center: { x: 0, y: 0 },
      width: 24,
      height: 7,
      num_layers: 2,
      thickness: 1.6,
      material: "fr4",
    },
  ]
  const cases = [
    { label: "Neither", top: false, bottom: false },
    { label: "Top", top: true, bottom: false },
    { label: "Bottom", top: false, bottom: true },
    { label: "Both", top: true, bottom: true },
  ]
  for (const [index, tenting] of cases.entries()) {
    const x = index * 6 - 9
    circuit.push(
      {
        type: "pcb_via",
        pcb_via_id: `via_${index}`,
        x,
        y: -0.5,
        outer_diameter: 2,
        hole_diameter: 0.8,
        layers: ["top", "bottom"],
        tented_on_top: tenting.top,
        tented_on_bottom: tenting.bottom,
      },
      {
        type: "pcb_silkscreen_text",
        pcb_silkscreen_text_id: `label_${index}`,
        pcb_component_id: "labels",
        text: tenting.label,
        layer: "top",
        anchor_position: { x, y: 2 },
        anchor_alignment: "center",
        font: "tscircuit2024",
        font_size: 0.7,
      },
    )
  }
  const output = stringifyGerberCommandLayers(
    convertSoupToGerberCommands(circuit),
  )
  for (const side of ["F", "B"] as const) {
    // Gold marks actual mask openings; green disks locate covered vias.
    // Use the same front labels in both overlays to keep columns aligned.
    await expect(output).toMatchGerberLayerOverlaySnapshot(
      import.meta.path,
      `via-tenting-${side === "F" ? "top" : "bottom"}-mask-openings`,
      [`${side}_Cu`, `${side}_Mask`, "F_SilkScreen"],
      {
        backgroundColor: "#16382d",
        colors: {
          [`${side}_Cu`]: "#38644d",
          [`${side}_Mask`]: "#e5b65c",
          F_SilkScreen: "#ffffff",
        },
      },
    )
  }
})
