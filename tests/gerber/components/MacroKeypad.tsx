import React from "react"
import { ArduinoProMicroBreakout } from "./ArduinoProMicroBreakout"
import { Key } from "./Key"

const MacroKeypad = () => {
  const keyPositions = Array.from({ length: 9 })
    .map((_, i) => ({
      keyNum: i + 1,
      col: i % 3,
      row: Math.floor(i / 3),
    }))
    .map((p) => ({
      ...p,
      x: p.col * 19.05 - 19.05,
      y: p.row * 19.05 - 19.05,
    }))

  const rowToMicroPin = {
    0: "D2",
    1: "D3",
    2: "D4",
  }
  const colToMicroPin = {
    0: "D5",
    1: "D6",
    2: "D7",
  }
  return (
    <board width="85mm" height="60mm">
      {keyPositions.map(({ keyNum, x, y }) => (
        <Key
          key={keyNum}
          name={`K${keyNum}`}
          keyNum={keyNum}
          pcbX={x - 12.5}
          pcbY={y + 2}
        />
      ))}
      <ArduinoProMicroBreakout key="u1" name="U1" pcbX={30.5} />
      {keyPositions.map(({ keyNum, row, col }) => (
        <trace
          // @ts-ignore
          key={`trace-${keyNum}-col`}
          from={`.SW${keyNum} .pin1`}
          to={`.U1 .${colToMicroPin[col as 0 | 1 | 2]}`}
        />
      ))}
      {keyPositions.map(({ keyNum, row, col }) => (
        <trace
          // @ts-ignore
          key={`trace-${keyNum}-row`}
          from={`.D${keyNum} .pin2`}
          to={`.U1 .${rowToMicroPin[row as 0 | 1 | 2]}`}
        />
      ))}
    </board>
  )
}

export default MacroKeypad
