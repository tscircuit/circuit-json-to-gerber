import { expect, test } from "bun:test"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { gunzipSync } from "node:zlib"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToGerberFiles } from "src/convert-circuit-json-to-gerber-files"

const nativeBytes = gunzipSync(
  readFileSync(
    new URL(
      "./assets/am3352-sbc/am3352-sbc-v0.1.26.circuit.json.gz",
      import.meta.url,
    ),
  ),
)
const nativeCircuit = JSON.parse(nativeBytes.toString()) as AnyCircuitElement[]

// Inner copper pours cannot affect the outer solder-mask layers. Omit these
// large polygons to keep this visual reproduction practical in the test suite;
// the compressed fixture retains every byte of the downloaded native circuit.
const circuit = nativeCircuit.filter(
  (element) =>
    element.type !== "pcb_copper_pour" ||
    element.layer === "top" ||
    element.layer === "bottom",
)

const regionCount = (gerber: string) =>
  gerber.split("\n").filter((line) => line === "G36*").length

const toSnapshotLayers = (files: Record<string, string>) =>
  Object.fromEntries(
    Object.entries(files).map(([name, contents]) => [
      name.replace(/\.gbr$/, ""),
      contents,
    ]),
  )

test("AM3352 SBC native uncovered pours reproduce the missing top solder mask", async () => {
  expect(createHash("sha256").update(nativeBytes).digest("hex")).toBe(
    "50ef25b9c11cee983e3fde1113d07907515c20b562f1f0b0bb3159fee11e224c",
  )

  const originalFiles = convertCircuitJsonToGerberFiles(circuit)
  const coveredFiles = convertCircuitJsonToGerberFiles(
    circuit.map((element) =>
      element.type === "pcb_copper_pour"
        ? { ...element, covered_with_solder_mask: true }
        : element,
    ),
  )

  for (const files of [originalFiles, coveredFiles]) {
    expect(files["F_Mask.gbr"]).toContain("%TF.FileFunction,Soldermask,Top*%")
    expect(files["F_Mask.gbr"]).toContain("%TF.FilePolarity,Negative*%")
    expect(files["B_Mask.gbr"]).toContain("%TF.FileFunction,Soldermask,Bot*%")
    expect(files["B_Mask.gbr"]).toContain("%TF.FilePolarity,Negative*%")
  }

  // Each uncovered BRep pour contributes its outer region and hole regions
  // to the mask opening file. Covering pours must remove exactly those regions.
  for (const [layer, filename, expectedPours] of [
    ["top", "F_Mask.gbr", 22],
    ["bottom", "B_Mask.gbr", 17],
  ] as const) {
    const uncoveredPours = circuit.filter(
      (element) =>
        element.type === "pcb_copper_pour" &&
        element.layer === layer &&
        element.covered_with_solder_mask === false,
    )
    expect(uncoveredPours).toHaveLength(expectedPours)
    const pourRegionCount = uncoveredPours.reduce(
      (count, element) =>
        count +
        (element.type === "pcb_copper_pour" && element.shape === "brep"
          ? 1 + (element.brep_shape.inner_rings?.length ?? 0)
          : 0),
      0,
    )
    expect(
      regionCount(originalFiles[filename]) -
        regionCount(coveredFiles[filename]),
    ).toBe(pourRegionCount)
  }

  // Mask coverage is the only changed input: copper and drills must stay
  // identical. Strip timestamp comments and attributes before comparing.
  const geometry = (gerber: string) =>
    gerber
      .split("\n")
      .filter(
        (line) =>
          !line.startsWith("%TF.CreationDate,") &&
          !line.startsWith("G04 Created by") &&
          !line.startsWith("; DRILL file") &&
          !line.startsWith("; #@! TF.CreationDate,"),
      )
      .join("\n")
  for (const filename of [
    "F_Cu.gbr",
    "B_Cu.gbr",
    "drill-L1-L4.drl",
    "drill_npth.drl",
  ]) {
    expect(geometry(coveredFiles[filename])).toBe(
      geometry(originalFiles[filename]),
    )
  }

  // The first view captures the reported appearance; the second changes only
  // pour coverage and demonstrates the expected green surface with pad openings.
  await expect(toSnapshotLayers(originalFiles)).toMatchGerberSnapshot(
    import.meta.path,
    "am3352-sbc-native-mask",
  )
  await expect(toSnapshotLayers(coveredFiles)).toMatchGerberSnapshot(
    import.meta.path,
    "am3352-sbc-covered-pours",
  )
}, 300_000)
