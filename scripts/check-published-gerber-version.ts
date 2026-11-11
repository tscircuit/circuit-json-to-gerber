import packageJson from "../package.json" with { type: "json" }

// Resolve the built artifact at runtime so source typechecks need no dist folder.
const { convertSoupToGerberCommands, stringifyGerberCommandLayers } =
  await import(new URL("../dist/index.js", import.meta.url).href)

const gerberFiles = stringifyGerberCommandLayers(
  convertSoupToGerberCommands([
    {
      type: "pcb_board",
      pcb_board_id: "board",
      center: { x: 0, y: 0 },
      width: 10,
      height: 10,
      num_layers: 2,
    },
  ]),
)

const expectedHeader = `%TF.GenerationSoftware,tscircuit,circuit-json-to-gerber,${packageJson.version}*%`
if (!gerberFiles.F_Cu.includes(expectedHeader)) {
  throw new Error(
    `Built Gerber header does not contain ${expectedHeader}. Rebuild after bumping the version.`,
  )
}
console.log(`Verified published Gerber version ${packageJson.version}`)
