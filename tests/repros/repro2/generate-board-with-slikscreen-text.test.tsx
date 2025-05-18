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
    <board width={30} height={10}>
      <capacitor
        capacitance="1000pF"
        footprint="0603"
        name="C3"
        schX={4}
        schY={2}
        pcbY={3}
        pcbX={7.955}
        layer={"bottom"}
        supplierPartNumbers={{
          jlcpcb: ["C577419"],
        }}
        pcbRotation={90}
      />
      <chip
        name="JP2"
        pcbX={11}
        footprint={
          <footprint>
            <silkscreentext text="T1OUT" fontSize={0.4} pcbY={-1.3} />
            <silkscreentext
              text="T2OUT"
              fontSize={0.4}
              pcbY={-1.3}
              pcbX={-2.54}
            />
            <silkscreentext
              text="R1IN"
              fontSize={0.4}
              pcbY={-1.3}
              pcbX={-5.08}
            />
            <silkscreentext
              text="R2IN"
              fontSize={0.4}
              pcbY={-1.3}
              pcbX={-7.62}
            />
            <silkscreentext
              text="VCC"
              fontSize={0.4}
              pcbY={-1.3}
              pcbX={-10.16}
            />
            <silkscreentext
              text="GND"
              fontSize={0.4}
              pcbY={-1.3}
              pcbX={-12.7}
            />
            <silkscreentext
              text="T1IN"
              fontSize={0.4}
              pcbY={-1.3}
              pcbX={-15.24}
            />
            <silkscreentext
              text="T2IN"
              fontSize={0.4}
              pcbY={-1.3}
              pcbX={-17.78}
            />
            <silkscreentext
              text="R1OUT"
              fontSize={0.4}
              pcbY={-1.3}
              pcbX={-20.32}
            />
            <silkscreentext
              text="R2OUT"
              fontSize={0.4}
              pcbY={-1.3}
              pcbX={-22.86}
            />

            <platedhole
              pcbX={0}
              holeDiameter="1mm"
              outerDiameter="2mm"
              portHints={["JP2-1", "pin1"]}
              shape="circle"
            />
            <platedhole
              pcbX={-2.54}
              holeDiameter="1mm"
              outerDiameter="2mm"
              portHints={["JP2-2", "pin2"]}
              shape="circle"
            />
            <platedhole
              pcbX={-5.08}
              holeDiameter="1mm"
              outerDiameter="2mm"
              portHints={["JP2-3", "pin3"]}
              shape="circle"
            />
            <platedhole
              pcbX={-7.62}
              holeDiameter="1mm"
              outerDiameter="2mm"
              portHints={["JP2-4", "pin4"]}
              shape="circle"
            />
            <platedhole
              pcbX={-10.16}
              holeDiameter="1mm"
              outerDiameter="2mm"
              portHints={["JP2-5", "pin5"]}
              shape="circle"
            />
            <platedhole
              pcbX={-12.7}
              holeDiameter="1mm"
              outerDiameter="2mm"
              portHints={["JP2-6", "pin6"]}
              shape="circle"
            />
            <platedhole
              pcbX={-15.24}
              holeDiameter="1mm"
              outerDiameter="2mm"
              portHints={["JP2-7", "pin7"]}
              shape="circle"
            />
            <platedhole
              pcbX={-17.78}
              holeDiameter="1mm"
              outerDiameter="2mm"
              portHints={["JP2-8", "pin8"]}
              shape="circle"
            />
            <platedhole
              pcbX={-20.32}
              holeDiameter="1mm"
              outerDiameter="2mm"
              portHints={["JP2-9", "pin9"]}
              shape="circle"
            />
            <platedhole
              pcbX={-22.86}
              holeDiameter="1mm"
              outerDiameter="2mm"
              portHints={["JP2-10", "pin10"]}
              shape="circle"
            />
          </footprint>
        }
      />
    </board>,
  )
  const soup = circuit.getCircuitJson()

  const gerber_cmds = convertSoupToGerberCommands(soup as any)
  const excellon_drill_cmds = convertSoupToExcellonDrillCommands({
    circuitJson: soup as any,
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
