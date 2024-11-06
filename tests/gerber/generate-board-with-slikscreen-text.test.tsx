import { test, expect } from "bun:test"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import {
  stringifyGerberCommandLayers,
  stringifyGerberCommands,
} from "src/gerber/stringify-gerber"
import { maybeOutputGerber } from "tests/fixtures/maybe-output-gerber"
import gerberToSvg from "gerber-to-svg"
import type { AnyCircuitElement } from "circuit-json"
import {
  convertSoupToExcellonDrillCommands,
  stringifyExcellonDrill,
} from "src/excellon-drill"
import { Circuit } from "@tscircuit/core"

test("Generate simple board with a multi-layer trace", async () => {
  const circuit = new Circuit()
  circuit.add(
    <board
      width={160}
      height={40}
      outline={[
        { x: -80, y: -5 },
        { x: -80, y: 20 },
        { x: 30, y: 20 },
        { x: 30, y: -20 },
        { x: 20, y: -5 },
      ]}
    >
      <platedhole
        name="H1"
        shape="circle"
        holeDiameter={1}
        outerDiameter={2}
        pcbX={27}
        pcbY={-12}
      />
      <hole name="H1" diameter={0.2} pcbX={-30} pcbY={15} />
      <hole name="H1" diameter={0.2} pcbX={-30} pcbY={12} />

      <silkscreentext
        text="large gerber text**"
        fontSize={4}
        layer={"top"}
        pcbX={-20}
        pcbY={0}
      />
      <silkscreentext
        text="medium gerber text."
        fontSize={2}
        layer={"top"}
        pcbX={-30}
        pcbY={5}
      />
      <silkscreentext
        text="small gerber text"
        fontSize={1}
        layer={"top"}
        pcbX={-30}
        pcbY={10}
      />
      <silkscreentext
        text="][[]][><][[]]["
        fontSize={0.5}
        anchorAlignment="center"
        layer={"top"}
        pcbX={-30}
        pcbY={12}
      />
      <silkscreentext
        text="bottom left[]"
        fontSize={0.5}
        anchorAlignment="bottom_left"
        layer={"top"}
        pcbX={-30}
        pcbY={15}
      />
      <silkscreentext
        text="[]bottom right"
        fontSize={0.5}
        anchorAlignment="bottom_right"
        layer={"top"}
        pcbX={-30}
        pcbY={15}
      />
      <silkscreentext
        text="top left[]"
        fontSize={0.5}
        anchorAlignment="top_left"
        layer={"top"}
        pcbX={-30}
        pcbY={15}
      />
      <silkscreentext
        text="[]top right"
        fontSize={0.5}
        anchorAlignment="top_right"
        layer={"top"}
        pcbX={-30}
        pcbY={15}
      />
    </board>,
  )
  const soup = circuit.getCircuitJson()

  const gerber_cmds = convertSoupToGerberCommands(soup)
  const excellon_drill_cmds = convertSoupToExcellonDrillCommands({
    circuitJson: soup,
    is_plated: true,
  })

  const gerberOutput = stringifyGerberCommandLayers(gerber_cmds)
  const excellonDrillOutput = stringifyExcellonDrill(excellon_drill_cmds)

  await maybeOutputGerber(gerberOutput, excellonDrillOutput)

  expect(gerberOutput).toMatchGerberSnapshot(
    import.meta.path,
    "silkscreen-text",
  )
})
