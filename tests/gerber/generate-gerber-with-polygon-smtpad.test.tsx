import { test, expect } from "bun:test"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import {
  convertSoupToExcellonDrillCommands,
  stringifyExcellonDrill,
} from "src/excellon-drill"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"
import { maybeOutputGerber } from "tests/fixtures/maybe-output-gerber"
import { Circuit } from "@tscircuit/core"

test("Generate gerber with polygon smtpad", async () => {
  const circuit = new Circuit()
  circuit.add(
    <board width={20} height={20}>
      <smtpad
        shape="polygon"
        layer="top"
        points={[
          { x: 0, y: 2 },
          { x: -0.588, y: 0.809 },
          { x: -1.902, y: 0.618 },
          { x: -0.951, y: -0.309 },
          { x: -1.176, y: -1.618 },
          { x: 0, y: -1 },
          { x: 1.176, y: -1.618 },
          { x: 0.951, y: -0.309 },
          { x: 1.902, y: 0.618 },
          { x: 0.588, y: 0.809 },
        ]}
      />
    </board>,
  )

  const circuitJson = circuit.getCircuitJson()

  const gerber_cmds = convertSoupToGerberCommands(circuitJson as any)
  const excellon_drill_cmds = convertSoupToExcellonDrillCommands({
    circuitJson: circuitJson as any,
    is_plated: true,
  })

  const excellonDrillOutput = stringifyExcellonDrill(excellon_drill_cmds)
  const gerberOutput = stringifyGerberCommandLayers(gerber_cmds)

  await maybeOutputGerber(gerberOutput, excellonDrillOutput)

  const sanitizedFCu = gerberOutput.F_Cu.replace(
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g,
    "DATE",
  )
  expect(sanitizedFCu).toMatchInlineSnapshot(`
    "%TF.GenerationSoftware,tscircuit,circuit-json-to-gerber,0.0.23*%
    %TF.CreationDate,DATE*%
    %TF.SameCoordinates,Original*%
    %TF.FileFunction,Copper,L1,Top*%
    %TF.FilePolarity,Positive*%
    %FSLAX46Y46*%
    %MOMM*%
    G04 Gerber Fmt 4.6, Leading zero omitted, Abs format (unit mm)*
    G04 Created by tscircuit (builder) date DATE*
    G01*
    G04 APERTURE MACROS START*
    %AMHORZPILL*
    0 Horizontal pill (stadium) shape macro*
    0 Parameters:*
    0 $1 = Total width*
    0 $2 = Total height*
    0 $3 = Circle diameter (equal to height)*
    0 $4 = Circle center offset
    0 21 = Center Line(Exposure, Width, Height, Center X, Center Y, Rotation)*
    0 1 = Circle(Exposure, Diameter, Center X, Center Y, Rotation)*
        21,1,$1,$2,0.0,0.0,0.0*
        1,1,$3,0.0,-$4,0.0*
        1,1,$3,0.0,$4,0.0*%
    %AMVERTPILL*
    0 Vertical pill (stadium) shape macro*
    0 Parameters:*
    0 $1 = Total width*
    0 $2 = Total height*
    0 $3 = Circle diameter (equal to width)*
    0 $4 = Circle center offset
    0 21 = Center Line(Exposure, Width, Height, Center X, Center Y, Rotation)*
        21,1,$1,$2,0.0,0.0,0.0*
        1,1,$3,0.0,-$4,0.0*
        1,1,$3,0.0,$4,0.0*%
    %AMRoundRect*
    0 Rectangle with rounded corners*
    0 $1 Corner radius*
    0 $2 $3 $4 $5 $6 $7 $8 $9 X,Y Position of each corner*
    0 Polygon box body*
    4,1,4,$2,$3,$4,$5,$6,$7,$8,$9,$2,$3,0*
    0 Circles for rounded corners*
    1,1,$1+$1,$2,$3*
    1,1,$1+$1,$4,$5*
    1,1,$1+$1,$6,$7*
    1,1,$1+$1,$8,$9*
    0 Rectangles between the rounded corners*
    20,1,$1+$1,$2,$3,$4,$5,0*
    20,1,$1+$1,$4,$5,$6,$7,0*
    20,1,$1+$1,$6,$7,$8,$9,0*
    20,1,$1+$1,$8,$9,$2,$3,0*%
    G04 APERTURE MACROS END*
    G04 aperture START LIST*
    %TD*%
    G04 aperture END LIST*
    M02*"
  `)

  expect({
    ...gerberOutput,
    "drill.drl": excellonDrillOutput,
  }).toMatchGerberSnapshot(import.meta.path, "polygon-smtpad")
})
