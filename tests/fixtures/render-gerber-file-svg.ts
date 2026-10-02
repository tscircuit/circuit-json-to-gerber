import gerberToSvg from "gerber-to-svg"

const ignoredMetadataWarning =
  /^block "%TF\.(?:GenerationSoftware|CreationDate|SameCoordinates|FileFunction|FilePolarity),[^"\r\n]*" was not recognized and was ignored$|^block "%TD" was not recognized and was ignored$/

export const renderGerberFileSvg = (
  gerber: string,
  id: string,
  color: string,
) =>
  new Promise<{
    svg: string
    viewBox: [number, number, number, number]
  }>((resolve, reject) => {
    const warnings: string[] = []
    const converter = gerberToSvg(
      gerber,
      { id, attributes: { color } },
      (error, svg) => {
        if (error) return reject(error)
        if (warnings.length) return reject(new Error(warnings.join("\n")))

        const [x, y, width, height] = converter.viewBox
        if (
          converter.units !== "mm" ||
          converter.viewBox.length !== 4 ||
          !converter.viewBox.every(Number.isFinite) ||
          width <= 0 ||
          height <= 0
        ) {
          return reject(new Error(`Invalid Gerber bounds or units for ${id}`))
        }
        resolve({ svg, viewBox: [x, y, width, height] })
      },
    )
    converter.on("warning", ({ message, line }) => {
      // Tracespace 4.2.8 ignores these X2 metadata attributes. A warning about
      // plotting, ignored geometry, or any other unsupported command must fail.
      if (!ignoredMetadataWarning.test(message)) {
        warnings.push(`${id}, line ${line}: ${message}`)
      }
    })
  })
