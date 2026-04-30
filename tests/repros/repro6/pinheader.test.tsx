import { test, expect } from "bun:test"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"
import { maybeOutputGerber } from "tests/fixtures/maybe-output-gerber"
import {
  convertSoupToExcellonDrillCommands,
  stringifyExcellonDrill,
} from "src/excellon-drill"
import { Circuit } from "@tscircuit/core"

const boardWidth = "70mm"
const boardHeight = "36mm"
const xiaoRowSpacing = 20
const xiaoCenterX = -22.38
const drv8833RowSpacing = 17
const drv8833CenterX = 8

test("Generate pinheader board", async () => {
  const circuit = new Circuit()
  circuit.add(
    <board
      width={boardWidth}
      height={boardHeight}
      minViaHoleDiameter={1.5}
      minViaPadDiameter={2.6}
      minTraceWidth={0.33}
      minTraceToPadEdgeClearance={0.25}
    >
      {/* <hole
      name="FID1"
      pcbY={-fiducialX}
      pcbX={-fiducialY}
      diameter={fiducialPadDiameter}
    />
    <hole
      name="FID2"
      pcbY={fiducialX}
      pcbX={-fiducialY}
      diameter={fiducialPadDiameter}
    />
    <hole
      name="FID3"
      pcbY={-fiducialX}
      pcbX={fiducialY}
      diameter={fiducialPadDiameter}
    />
    <hole
      name="FID4"
      pcbY={fiducialX}
      pcbX={fiducialY}
      diameter={fiducialPadDiameter}
    /> */}

      <pinheader
        name="J_XIAO_LEFT"
        pinCount={7}
        gender="female"
        pcbX={xiaoCenterX - xiaoRowSpacing / 2}
        pcbY={0}
        pcbRotation={90}
        schX={-7}
        schY={1}
        pinLabels={[
          "D0_A0_GPIO26",
          "D1_A1_GPIO27",
          "D2_A2_GPIO28",
          "D3_A3_GPIO29",
          "D4_SDA_GPIO6",
          "D5_SCL_GPIO7",
          "D6_TX_GPIO0",
        ]}
        pinAttributes={{
          D0_A0_GPIO26: { doNotConnect: true },
          D1_A1_GPIO27: { doNotConnect: true },
          D2_A2_GPIO28: { doNotConnect: true },
          D3_A3_GPIO29: { doNotConnect: true },
          D4_SDA_GPIO6: { doNotConnect: true },
          D5_SCL_GPIO7: { doNotConnect: true },
          D6_TX_GPIO0: { doNotConnect: true },
        }}
        showSilkscreenPinLabels
      />

      <pinheader
        name="J_XIAO_RIGHT"
        pinCount={7}
        gender="female"
        pcbX={xiaoCenterX + xiaoRowSpacing / 2}
        pcbY={0}
        pcbRotation={90}
        schX={-4.5}
        schY={1}
        pinLabels={[
          "D7_RX_GPIO1_FAULT",
          "D8_SCK_GPIO2_AIN1",
          "D9_MISO_GPIO4_SLEEP",
          "D10_MOSI_GPIO3_AIN2",
          "3V3",
          "GND",
          "5V",
        ]}
        pinAttributes={{
          D7_RX_GPIO1_FAULT: { isGpio: true },
          D8_SCK_GPIO2_AIN1: { isGpio: true },
          D9_MISO_GPIO4_SLEEP: { isGpio: true },
          D10_MOSI_GPIO3_AIN2: { isGpio: true },
          "3V3": { providesPower: true, providesVoltage: "3.3V" },
          GND: { providesGround: true },
          "5V": { requiresPower: true, requiresVoltage: "5V" },
        }}
        showSilkscreenPinLabels
      />

      <pinheader
        name="J_DRV8833_LEFT"
        pinCount={8}
        gender="female"
        pcbX={drv8833CenterX - drv8833RowSpacing / 2}
        pcbY={0}
        pcbRotation={90}
        schX={0.8}
        schY={1}
        pinLabels={[
          "VMOTOR",
          "GND",
          "FAULT",
          "BIN1",
          "BIN2",
          "SLEEP",
          "AIN2",
          "AIN1",
        ]}
        pinAttributes={{
          BIN1: { doNotConnect: true },
          BIN2: { doNotConnect: true },
        }}
        showSilkscreenPinLabels
      />

      <pinheader
        name="J_DRV8833_RIGHT"
        pinCount={6}
        gender="female"
        pcbX={drv8833CenterX + drv8833RowSpacing / 2}
        pcbY={0}
        pcbRotation={90}
        schX={3}
        schY={1}
        pinLabels={["BSEN", "ASEN", "BOUT1", "BOUT2", "AOUT2", "AOUT1"]}
        pinAttributes={{
          BSEN: { doNotConnect: true },
          ASEN: { doNotConnect: true },
          BOUT1: { doNotConnect: true },
          BOUT2: { doNotConnect: true },
        }}
        showSilkscreenPinLabels
      />

      <pinheader
        name="J_VMOTOR"
        pinCount={2}
        gender="unpopulated"
        pitch="5.08mm"
        pcbX={29}
        pcbY={-12}
        pcbRotation={90}
        schX={6}
        schY={3}
        pinLabels={["VMOTOR_IN", "GND"]}
        showSilkscreenPinLabels
      />

      <pinheader
        name="J_MOTOR"
        pinCount={2}
        gender="unpopulated"
        pitch="5.08mm"
        pcbX={29}
        pcbY={8}
        pcbRotation={90}
        schX={6}
        schY={-1}
        pinLabels={["MOTOR_A", "MOTOR_B"]}
        showSilkscreenPinLabels
      />

      <capacitor
        name="C_VM_BULK"
        capacitance="10uF"
        footprint="0805"
        pcbX={22}
        pcbY={-14}
        pcbRotation={180}
        schX={3.5}
        schY={4.5}
      />
      <capacitor
        name="C_VM_HF"
        capacitance="0.1uF"
        footprint="0603"
        pcbX={22}
        pcbY={-11}
        pcbRotation={180}
        schX={3.5}
        schY={3.2}
      />

      <resistor
        name="R_PWR"
        resistance="2.2k"
        footprint="0603"
        pcbX={-7}
        pcbY={-14}
        schX={-2}
        schY={-3}
      />
      <led
        name="D_PWR"
        color="red"
        footprint="0603"
        pcbX={-2}
        pcbY={-14}
        schX={0}
        schY={-3}
      />

      {/* <trace from=".R_PWR > .pin1" to=".D_PWR > .pin1" /> */}

      <trace
        from=".J_XIAO_RIGHT > .D8_SCK_GPIO2_AIN1"
        to=".J_DRV8833_LEFT > .AIN1"
      />
      <trace
        from=".J_XIAO_RIGHT > .D10_MOSI_GPIO3_AIN2"
        to=".J_DRV8833_LEFT > .AIN2"
      />
      <trace
        from=".J_XIAO_RIGHT > .D9_MISO_GPIO4_SLEEP"
        to=".J_DRV8833_LEFT > .SLEEP"
      />
      <trace
        from=".J_XIAO_RIGHT > .D7_RX_GPIO1_FAULT"
        to=".J_DRV8833_LEFT > .FAULT"
      />

      <trace from=".J_VMOTOR > .pin1" to="net.VMOTOR" />
      <trace from=".J_DRV8833_LEFT > .VMOTOR" to="net.VMOTOR" />
      <trace from=".C_VM_BULK > .pin1" to="net.VMOTOR" />
      <trace from=".C_VM_HF > .pin1" to="net.VMOTOR" />

      <trace from=".J_XIAO_RIGHT > .GND" to="net.GND" />
      <trace from=".J_DRV8833_LEFT > .GND" to="net.GND" />
      <trace from=".J_VMOTOR > .pin2" to="net.GND" />
      <trace from=".C_VM_BULK > .pin2" to="net.GND" />
      <trace from=".C_VM_HF > .pin2" to="net.GND" />
      <trace from=".D_PWR > .cathode" to="net.GND" />

      <trace from=".J_XIAO_RIGHT > .5V" to="net.V5" />

      <trace from=".J_MOTOR > .pin1" to=".J_DRV8833_RIGHT > .AOUT1" />
      <trace from=".J_MOTOR > .pin2" to=".J_DRV8833_RIGHT > .AOUT2" />

      <trace from=".R_PWR > .pin1" to="net.VMOTOR" />
      <trace from=".R_PWR > .pin2" to=".D_PWR > .anode" />
    </board>,
  )
  const circuitJson = circuit.getCircuitJson()

  const gerber_cmds = convertSoupToGerberCommands(circuitJson)
  const excellon_drill_cmds_plated = convertSoupToExcellonDrillCommands({
    circuitJson: circuitJson,
    is_plated: true,
  })
  const excellon_drill_cmds_unplated = convertSoupToExcellonDrillCommands({
    circuitJson: circuitJson,
    is_plated: false,
  })

  const gerberOutput = stringifyGerberCommandLayers(gerber_cmds)
  const excellonDrillOutputPlated = stringifyExcellonDrill(
    excellon_drill_cmds_plated,
  )
  const excellonDrillOutputUnplated = stringifyExcellonDrill(
    excellon_drill_cmds_unplated,
  )

  await maybeOutputGerber(gerberOutput, excellonDrillOutputPlated)

  expect({
    ...gerberOutput,
    "drill_plated.drl": excellonDrillOutputPlated,
    "drill_unplated.drl": excellonDrillOutputUnplated,
  }).toMatchGerberSnapshot(import.meta.path, "pinheader")
})
