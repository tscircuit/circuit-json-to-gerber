import { useState, useCallback } from "react"
import { createRoot } from "react-dom/client"
import type { AnyCircuitElement } from "circuit-json"
import { convertSoupToGerberCommands } from "../src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "../src/gerber/stringify-gerber"
import {
  convertSoupToExcellonDrillCommands,
  stringifyExcellonDrill,
} from "../src/excellon-drill"
import { parseGerberFile, renderGerberToSvg } from "gerberts"

type GerberOutput = Record<string, string>
type SvgOutput = Record<string, string>

function App() {
  const [gerberOutput, setGerberOutput] = useState<GerberOutput | null>(null)
  const [svgOutput, setSvgOutput] = useState<SvgOutput | null>(null)
  const [selectedLayer, setSelectedLayer] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string>("")
  const [isDragging, setIsDragging] = useState(false)

  const processFile = useCallback(async (file: File) => {
    setIsLoading(true)
    setError(null)
    setFileName(file.name.replace(/\.json$/, ""))

    try {
      const text = await file.text()
      const json = JSON.parse(text) as AnyCircuitElement[]

      // Convert to Gerber
      const gerberCmds = convertSoupToGerberCommands(json)
      const gerberStrings = stringifyGerberCommandLayers(gerberCmds)

      // Convert to Excellon Drill
      const drillCmds = convertSoupToExcellonDrillCommands({
        circuitJson: json,
        is_plated: true,
      })
      const drillCmdsNpth = convertSoupToExcellonDrillCommands({
        circuitJson: json,
        is_plated: false,
      })

      const fullOutput: GerberOutput = {
        ...gerberStrings,
        "drill.drl": stringifyExcellonDrill(drillCmds),
        "drill_npth.drl": stringifyExcellonDrill(drillCmdsNpth),
      }

      // Convert gerbers to SVGs using gerberts
      const svgs: SvgOutput = {}
      for (const [name, content] of Object.entries(fullOutput)) {
        // Skip drill files for now (they need different parsing)
        if (name.endsWith(".drl")) continue
        try {
          const gerberFile = parseGerberFile(content)
          let svg = renderGerberToSvg(gerberFile, {
            strokeColor: "#00ff00",
            fillColor: "#00ff00",
            backgroundColor: "#1a1a1a",
            padding: 1,
          })
          // Replace fixed width/height with 100% to fill container
          svg = svg.replace(/width="[^"]*"/, 'width="100%"')
          svg = svg.replace(/height="[^"]*"/, 'height="100%"')
          svgs[name] = svg
        } catch (e) {
          console.warn(`Failed to render ${name} to SVG:`, e)
        }
      }

      setSvgOutput(svgs)
      // Select first layer by default
      const firstLayer = Object.keys(svgs)[0]
      if (firstLayer) {
        setSelectedLayer(firstLayer)
      }

      setGerberOutput(fullOutput)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process file")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return
      await processFile(file)
    },
    [processFile],
  )

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault()
      event.stopPropagation()
      setIsDragging(false)

      const file = event.dataTransfer.files?.[0]
      if (!file) return

      if (!file.name.endsWith(".json")) {
        setError("Please drop a JSON file")
        return
      }

      await processFile(file)
    },
    [processFile],
  )

  const handleDownloadZip = useCallback(async () => {
    if (!gerberOutput) return

    // Dynamically import JSZip
    const JSZip = (await import("jszip")).default
    const zip = new JSZip()

    // Map layer names to proper Gerber extensions
    const extensionMap: Record<string, string> = {
      F_Cu: "GTL",
      B_Cu: "GBL",
      F_Mask: "GTS",
      B_Mask: "GBS",
      F_SilkScreen: "GTO",
      B_SilkScreen: "GBO",
      F_Paste: "GTP",
      B_Paste: "GBP",
      Edge_Cuts: "GKO",
    }

    for (const [name, content] of Object.entries(gerberOutput)) {
      if (name.endsWith(".drl")) {
        zip.file(name, content)
      } else {
        const ext = extensionMap[name] || "gbr"
        zip.file(`${name}.${ext}`, content)
      }
    }

    const blob = await zip.generateAsync({ type: "blob" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${fileName || "gerbers"}.zip`
    a.click()
    URL.revokeObjectURL(url)
  }, [gerberOutput, fileName])

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-center">
          Circuit JSON to Gerber Converter
        </h1>

        {/* File Upload */}
        <div className="mb-8">
          <label
            className="block mb-4"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div
              className={`flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                isDragging
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-gray-600 hover:border-blue-500"
              }`}
            >
              <div className="text-center">
                <svg
                  className={`mx-auto h-12 w-12 ${isDragging ? "text-blue-400" : "text-gray-400"}`}
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                  aria-labelledby="upload-icon-title"
                >
                  <title id="upload-icon-title">Upload file</title>
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p
                  className={`mt-2 text-sm ${isDragging ? "text-blue-400" : "text-gray-400"}`}
                >
                  {isLoading
                    ? "Processing..."
                    : isDragging
                      ? "Drop your file here"
                      : "Click or drag & drop Circuit JSON file"}
                </p>
              </div>
            </div>
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileUpload}
              disabled={isLoading}
            />
          </label>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-8 p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
            {error}
          </div>
        )}

        {/* Results Section */}
        {gerberOutput && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Preview Section */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Preview</h2>

              {/* Layer Selector */}
              {svgOutput && Object.keys(svgOutput).length > 0 && (
                <div className="mb-4">
                  <select
                    value={selectedLayer}
                    onChange={(e) => setSelectedLayer(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    {Object.keys(svgOutput).map((layer) => (
                      <option key={layer} value={layer}>
                        {layer}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* SVG Preview */}
              <div className="bg-gray-900 rounded-lg p-4 h-[400px] flex items-center justify-center overflow-hidden">
                {svgOutput && selectedLayer && svgOutput[selectedLayer] ? (
                  <div
                    className="w-full h-full"
                    dangerouslySetInnerHTML={{
                      __html: svgOutput[selectedLayer],
                    }}
                  />
                ) : (
                  <>
                    <svg
                      className="w-16 h-16 text-gray-600 mb-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <p className="text-gray-500 text-center">
                      No preview available
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Layers List & Download */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Generated Files</h2>

              {/* Download Button */}
              <button
                type="button"
                onClick={handleDownloadZip}
                className="w-full mb-6 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Download Gerber ZIP
              </button>

              {/* File List */}
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {Object.entries(gerberOutput).map(([name, content]) => (
                  <div
                    key={name}
                    className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <svg
                        className="w-5 h-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <span className="text-sm font-mono">{name}</span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {(content.length / 1024).toFixed(1)} KB
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        {!gerberOutput && !isLoading && (
          <div className="text-center text-gray-400 mt-8">
            <p className="mb-2">
              Upload a Circuit JSON file to convert it to Gerber format.
            </p>
            <p className="text-sm">
              Circuit JSON files can be exported from{" "}
              <a
                href="https://tscircuit.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                tscircuit
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

const root = createRoot(document.getElementById("root")!)
root.render(<App />)
