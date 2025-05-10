import type { AnyCircuitElement } from "circuit-json"
import { pairs } from "../utils/pairs"
import { gerberBuilder } from "../gerber-builder"
import type { LayerToGerberCommandsMap } from "./GerberLayerName"
import { defineCommonMacros } from "./define-common-macros"
import {
  defineAperturesForLayer,
  getApertureConfigFromCirclePcbHole,
  getApertureConfigFromPcbPlatedHole,
  getApertureConfigFromPcbSilkscreenPath,
  getApertureConfigFromPcbSilkscreenText,
  getApertureConfigFromPcbSmtpad,
  getApertureConfigFromPcbSolderPaste,
  getApertureConfigFromPcbVia,
} from "./defineAperturesForLayer"
import { findApertureNumber } from "./findApertureNumber"
import { getCommandHeaders } from "./getCommandHeaders"
import { getGerberLayerName } from "./getGerberLayerName"
import { lineAlphabet } from "@tscircuit/alphabet"
import {
  applyToPoint,
  compose,
  rotate,
  translate,
  type Matrix,
} from "transformation-matrix"

/**
 * Converts tscircuit soup to arrays of Gerber commands for each layer
 */
export const convertSoupToGerberCommands = (
  soup: AnyCircuitElement[],
  opts: { flip_y_axis?: boolean } = {},
): LayerToGerberCommandsMap => {
  opts.flip_y_axis ??= false
  const glayers: LayerToGerberCommandsMap = {
    F_Cu: getCommandHeaders({
      layer: "top",
      layer_type: "copper",
    }),
    F_SilkScreen: getCommandHeaders({
      layer: "top",
      layer_type: "silkscreen",
    }),
    F_Mask: getCommandHeaders({
      layer: "top",
      layer_type: "soldermask",
    }),
    F_Paste: getCommandHeaders({
      layer: "top",
      layer_type: "paste",
    }),
    B_Cu: getCommandHeaders({
      layer: "bottom",
      layer_type: "copper",
    }),
    B_SilkScreen: getCommandHeaders({
      layer: "bottom",
      layer_type: "silkscreen",
    }),
    B_Mask: getCommandHeaders({
      layer: "bottom",
      layer_type: "soldermask",
    }),
    B_Paste: getCommandHeaders({
      layer: "bottom",
      layer_type: "paste",
    }),
    Edge_Cuts: getCommandHeaders({
      layer: "edgecut",
    }),
  }

  for (const glayer_name of [
    "F_Cu",
    "B_Cu",
    "F_Mask",
    "B_Mask",
    "F_Paste",
    "B_Paste",
    "F_SilkScreen",
    "B_SilkScreen",
  ] as const) {
    const glayer = glayers[glayer_name]
    defineCommonMacros(glayer)
    defineAperturesForLayer({
      soup,
      glayer,
      glayer_name,
    })
  }

  // Edgecuts has a single aperature
  glayers.Edge_Cuts.push(
    ...gerberBuilder()
      .add("define_aperture_template", {
        aperture_number: 10,
        standard_template_code: "C",
        diameter: 0.05, //mm
      })
      .build(),
  )

  /**
   * "maybe flip y axis" to handle y axis negating
   */
  const mfy = (y: number) => (opts.flip_y_axis ? -y : y)

  for (const layer of ["top", "bottom", "edgecut"] as const) {
    for (const element of soup) {
      if (element.type === "pcb_trace") {
        const { route } = element
        for (const [a, b] of pairs(route)) {
          // TODO b kind of matters here, this doesn't handle a bunch of cases
          // but the definition of a route is also kind of broken, a "wire" is
          // a relationship between two points and can't really be a type of
          // point
          if (a.route_type === "wire") {
            if (a.layer === layer) {
              const glayer = glayers[getGerberLayerName(layer, "copper")]
              glayer.push(
                ...gerberBuilder()
                  .add("select_aperture", {
                    aperture_number: findApertureNumber(glayer, {
                      trace_width: a.width,
                    }),
                  })
                  .add("move_operation", { x: a.x, y: mfy(a.y) })
                  .add("plot_operation", { x: b.x, y: mfy(b.y) })
                  .build(),
              )
            }
          }
        }
      } else if (element.type === "pcb_silkscreen_path") {
        if (element.layer === layer) {
          const glayer = glayers[getGerberLayerName(layer, "silkscreen")]
          const apertureConfig = getApertureConfigFromPcbSilkscreenPath(element)
          const gerber = gerberBuilder().add("select_aperture", {
            aperture_number: findApertureNumber(glayer, apertureConfig),
          })
          // Move to the first point
          if (element.route.length > 0) {
            gerber.add("move_operation", {
              x: element.route[0].x,
              y: mfy(element.route[0].y),
            })
          }

          // Plot lines to subsequent points
          for (let i = 1; i < element.route.length; i++) {
            gerber.add("plot_operation", {
              x: element.route[i].x,
              y: mfy(element.route[i].y),
            })
          }

          glayer.push(...gerber.build())
        }
      } else if (element.type === "pcb_silkscreen_text") {
        if (element.layer === layer) {
          const glayer = glayers[getGerberLayerName(layer, "silkscreen")]
          const apertureConfig = getApertureConfigFromPcbSilkscreenText(element)
          const gerber = gerberBuilder().add("select_aperture", {
            aperture_number: findApertureNumber(glayer, apertureConfig),
          })

          const fontSize = element.font_size
          const letterSpacing = fontSize * 0.4
          const spaceWidth = fontSize * 0.5
          const upperText = element.text.toUpperCase()

          const textWidth =
            upperText.split("").reduce((width, char) => {
              return (
                width + (char === " " ? spaceWidth : fontSize) + letterSpacing
              )
            }, 0) - letterSpacing

          const textHeight = fontSize

          // Step 1: determine top-left of text box
          let baseX = element.anchor_position.x
          let baseY = element.anchor_position.y

          switch (element.anchor_alignment || "center") {
            case "top_right":
              baseX -= 0
              baseY -= 0
              break
            case "top_left":
              baseX -= textWidth
              baseY -= 0
              break
            case "bottom_right":
              baseX -= 0
              baseY -= textHeight
              break
            case "bottom_left":
              baseX -= textWidth
              baseY -= textHeight
              break
            case "center":
            default:
              baseX -= textWidth / 2
              baseY -= textHeight / 2
              break
          }

          // Step 2: compute transform center (middle of the text box)
          const centerX = baseX + textWidth / 2
          const centerY = baseY + textHeight / 2

          let rotationDegrees = element.ccw_rotation || 0
          const isBottom = element.layer === "bottom"

          const transforms: Matrix[] = []

          if (isBottom) {
            transforms.push(
              translate(centerX, centerY),
              { a: -1, b: 0, c: 0, d: 1, e: 0, f: 0 }, // horizontal flip
              translate(-centerX, -centerY),
            )
            rotationDegrees = -rotationDegrees
          }

          if (rotationDegrees) {
            const rad = (rotationDegrees * Math.PI) / 180
            transforms.push(
              translate(centerX, centerY),
              rotate(rad),
              translate(-centerX, -centerY),
            )
          }

          const transformMatrix =
            transforms.length > 0 ? compose(...transforms) : undefined

          for (let i = 0; i < upperText.length; i++) {
            const char = upperText[i]
            if (char === " ") continue

            const xOffset = i * (fontSize + letterSpacing)
            const letterPaths = lineAlphabet[char] || []

            for (const { x1, y1, x2, y2 } of letterPaths) {
              const rawStart = {
                x: baseX + xOffset + x1 * fontSize,
                y: baseY + y1 * fontSize,
              }
              const rawEnd = {
                x: baseX + xOffset + x2 * fontSize,
                y: baseY + y2 * fontSize,
              }

              const p1 = transformMatrix
                ? applyToPoint(transformMatrix, rawStart)
                : rawStart
              const p2 = transformMatrix
                ? applyToPoint(transformMatrix, rawEnd)
                : rawEnd

              gerber.add("move_operation", { x: p1.x, y: mfy(p1.y) })
              gerber.add("plot_operation", { x: p2.x, y: mfy(p2.y) })
            }
          }

          glayer.push(...gerber.build())
        }
      } else if (element.type === "pcb_smtpad") {
        if (element.layer === layer) {
          for (const glayer of [
            glayers[getGerberLayerName(layer, "copper")],
            glayers[getGerberLayerName(layer, "soldermask")],
          ]) {
            const apertureConfig = getApertureConfigFromPcbSmtpad(element)
            const apertureNumber = findApertureNumber(glayer, apertureConfig)
            const gb = gerberBuilder().add("select_aperture", {
              aperture_number: apertureNumber,
            })

            if (element.shape === "rotated_rect" && element.ccw_rotation) {
              gb.add("load_rotation", {
                rotation_degrees: element.ccw_rotation,
              })
            }

            gb.add("flash_operation", { x: element.x, y: mfy(element.y) })

            if (element.shape === "rotated_rect" && element.ccw_rotation) {
              // Reset rotation
              gb.add("load_rotation", { rotation_degrees: 0 })
            }

            glayer.push(...gb.build())
          }
        }
      } else if (element.type === "pcb_solder_paste") {
        if (element.layer === layer) {
          for (const glayer of [glayers[getGerberLayerName(layer, "paste")]]) {
            glayer.push(
              ...gerberBuilder()
                .add("select_aperture", {
                  aperture_number: findApertureNumber(
                    glayer,
                    getApertureConfigFromPcbSolderPaste(element),
                  ),
                })
                .add("flash_operation", { x: element.x, y: mfy(element.y) })
                .build(),
            )
          }
        }
      } else if (element.type === "pcb_plated_hole") {
        if (element.layers.includes(layer as any)) {
          for (const glayer of [
            glayers[getGerberLayerName(layer, "copper")],
            glayers[getGerberLayerName(layer, "soldermask")],
          ]) {
            if (element.shape === "pill") {
              // For pill shapes, use a circular aperture and draw the connecting line
              const circleApertureConfig = {
                standard_template_code: "C" as const,
                diameter:
                  element.outer_width > element.outer_height
                    ? element.outer_height
                    : element.outer_width,
              }

              // Find existing aperture number or get next available
              let aperture_number = 10
              try {
                aperture_number = findApertureNumber(
                  glayer,
                  circleApertureConfig,
                )
              } catch {
                aperture_number =
                  Math.max(
                    ...glayer
                      .filter((cmd) => "aperture_number" in cmd)
                      .map((cmd) => (cmd as any).aperture_number),
                    9,
                  ) + 1

                // Add the aperture definition
                glayer.push(
                  ...gerberBuilder()
                    .add("define_aperture_template", {
                      aperture_number,
                      ...circleApertureConfig,
                    })
                    .build(),
                )
              }

              const gb = gerberBuilder().add("select_aperture", {
                aperture_number,
              })

              if (element.outer_width > element.outer_height) {
                // Horizontal pill
                const offset = (element.outer_width - element.outer_height) / 2
                gb.add("flash_operation", {
                  x: element.x - offset,
                  y: mfy(element.y),
                })
                  .add("move_operation", {
                    x: element.x - offset,
                    y: mfy(element.y),
                  })
                  .add("plot_operation", {
                    x: element.x + offset,
                    y: mfy(element.y),
                  })
                  .add("flash_operation", {
                    x: element.x + offset,
                    y: mfy(element.y),
                  })
              } else {
                // Vertical pill
                const offset = (element.outer_height - element.outer_width) / 2
                gb.add("flash_operation", {
                  x: element.x,
                  y: mfy(element.y - offset),
                })
                  .add("move_operation", {
                    x: element.x,
                    y: mfy(element.y - offset),
                  })
                  .add("plot_operation", {
                    x: element.x,
                    y: mfy(element.y + offset),
                  })
                  .add("flash_operation", {
                    x: element.x,
                    y: mfy(element.y + offset),
                  })
              }

              glayer.push(...gb.build())
            } else {
              const apertureConfig = getApertureConfigFromPcbPlatedHole(element)
              glayer.push(
                ...gerberBuilder()
                  .add("select_aperture", {
                    aperture_number: findApertureNumber(glayer, apertureConfig),
                  })
                  .add("flash_operation", { x: element.x, y: mfy(element.y) })
                  .build(),
              )
            }
          }
        }
      } else if (element.type === "pcb_hole") {
        if (layer !== "edgecut") {
          for (const glayer of [
            glayers[getGerberLayerName(layer, "soldermask")],
          ]) {
            if (element.hole_shape !== "circle") {
              console.warn(
                "NOT IMPLEMENTED: drawing gerber for non-round holes",
              )
              continue
            }
            glayer.push(
              ...gerberBuilder()
                .add("select_aperture", {
                  aperture_number: findApertureNumber(
                    glayer,
                    getApertureConfigFromCirclePcbHole(element),
                  ),
                })
                .add("flash_operation", { x: element.x, y: mfy(element.y) })
                .build(),
            )
          }
        }
      } else if (element.type === "pcb_via") {
        if (element.layers.includes(layer as any)) {
          for (const glayer of [glayers[getGerberLayerName(layer, "copper")]]) {
            glayer.push(
              ...gerberBuilder()
                .add("select_aperture", {
                  aperture_number: findApertureNumber(
                    glayer,
                    getApertureConfigFromPcbVia(element),
                  ),
                })
                .add("flash_operation", { x: element.x, y: mfy(element.y) })
                .build(),
            )
          }
        }
      } else if (element.type === "pcb_board" && layer === "edgecut") {
        const glayer = glayers.Edge_Cuts
        const { width, height, center, outline } = element
        const gerberBuild = gerberBuilder().add("select_aperture", {
          aperture_number: 10,
        })
        if (outline && outline.length > 2) {
          gerberBuild.add("move_operation", outline[0])
          for (let i = 1; i < outline.length; i++) {
            gerberBuild.add("plot_operation", outline[i])
          }
        } else {
          gerberBuild
            .add("move_operation", {
              x: center.x - width / 2,
              y: mfy(center.y - height / 2),
            })
            .add("plot_operation", {
              x: center.x + width / 2,
              y: mfy(center.y - height / 2),
            })
            // .add("move_operation", {
            //   x: center.x + width / 2,
            //   y: center.y - height / 2,
            // })
            .add("plot_operation", {
              x: center.x + width / 2,
              y: mfy(center.y + height / 2),
            })
            // .add("move_operation", {
            //   x: center.x + width / 2,
            //   y: center.y + height / 2,
            // })
            .add("plot_operation", {
              x: center.x - width / 2,
              y: mfy(center.y + height / 2),
            })
            // .add("move_operation", {
            //   x: center.x - width / 2,
            //   y: center.y + height / 2,
            // })
            .add("plot_operation", {
              x: center.x - width / 2,
              y: mfy(center.y - height / 2),
            })
        }

        glayer.push(...gerberBuild.build())
      }
    }
  }

  for (const key of Object.keys(glayers)) {
    glayers[key as keyof LayerToGerberCommandsMap].push(
      ...gerberBuilder().add("end_of_file", {}).build(),
    )
  }

  return glayers
}
