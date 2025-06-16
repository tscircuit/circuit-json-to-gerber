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
import type { PcbCutout } from "circuit-json"
import { findApertureNumber } from "./findApertureNumber"
import { getCommandHeaders } from "./getCommandHeaders"
import { getGerberLayerName } from "./getGerberLayerName"
import { lineAlphabet } from "@tscircuit/alphabet"
import {
  applyToPoint,
  compose,
  identity,
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
          // The acctual Uppercase letters are 70% of the font size
          // sources: https://forum.generic-mapping-tools.org/t/what-exactly-is-the-custom-font-s-height-point-size-ratio/1265/2?utm_source=chatgpt.com
          const CAP_HEIGHT_SCALE = 0.7 // Adjust based on your font's metrics
          const glayer = glayers[getGerberLayerName(layer, "silkscreen")]
          const apertureConfig = getApertureConfigFromPcbSilkscreenText(element)
          const gerber = gerberBuilder().add("select_aperture", {
            aperture_number: findApertureNumber(glayer, apertureConfig),
          })

          let initialX = element.anchor_position.x
          let initialY = element.anchor_position.y
          const fontSize = element.font_size * CAP_HEIGHT_SCALE
          const letterSpacing = fontSize * 0.4
          const spaceWidth = fontSize * 0.5

          const textWidth =
            element.text.split("").reduce((width, char) => {
              if (char === " ") {
                return width + spaceWidth + letterSpacing
              }
              return width + fontSize + letterSpacing
            }, 0) - letterSpacing

          const textHeight = fontSize
          switch (element.anchor_alignment || "center") {
            case "top_right":
              break
            case "top_left":
              initialX -= textWidth
              break
            case "bottom_right":
              initialY -= textHeight
              break
            case "bottom_left":
              initialX -= textWidth
              initialY -= textHeight
              break
            case "center":
              initialX -= textWidth / 2
              initialY -= textHeight / 2
              break
          }

          let anchoredX = initialX
          const anchoredY = initialY

          let rotation = element.ccw_rotation || 0
          const cx = anchoredX + textWidth / 2
          const cy = anchoredY + textHeight / 2
          const transforms: Matrix[] = []

          // Apply mirroring and rotation for the bottom layer only
          if (element.layer === "bottom") {
            transforms.push(
              translate(cx, cy),
              { a: -1, b: 0, c: 0, d: 1, e: 0, f: 0 }, // Horizontal flip
              translate(-cx, -cy),
            )
            rotation = -rotation // Reverse rotation for bottom layer
          }

          // Apply rotation if present
          if (rotation) {
            const rad = (rotation * Math.PI) / 180
            transforms.push(
              translate(cx, cy), // Translate to center of rotation
              rotate(rad), // Apply rotation
              translate(-cx, -cy), // Translate back
            )
          }

          // Process each character in the text
          for (const char of element.text.toUpperCase()) {
            if (char === " ") {
              anchoredX += spaceWidth + letterSpacing
              continue
            }

            const letterPaths = lineAlphabet[char] || []
            for (const path of letterPaths) {
              const x1 = anchoredX + path.x1 * fontSize
              const y1 = anchoredY + path.y1 * fontSize
              const x2 = anchoredX + path.x2 * fontSize
              const y2 = anchoredY + path.y2 * fontSize

              // Apply transformations after positioning
              let p1 = { x: x1, y: y1 }
              let p2 = { x: x2, y: y2 }

              if (transforms.length > 0) {
                const transformMatrix = compose(...transforms)
                p1 = applyToPoint(transformMatrix, p1)
                p2 = applyToPoint(transformMatrix, p2)
              }

              gerber.add("move_operation", { x: p1.x, y: mfy(p1.y) })
              gerber.add("plot_operation", { x: p2.x, y: mfy(p2.y) })
            }

            anchoredX += fontSize + letterSpacing // Move to next character position
          }
          glayer.push(...gerber.build())
        }
      } else if (element.type === "pcb_smtpad" && element.shape !== "polygon") {
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
      } else if (element.type === "pcb_smtpad" && element.shape === "polygon") {
        if (element.layer === layer) {
          for (const glayer of [
            glayers[getGerberLayerName(layer, "copper")],
            glayers[getGerberLayerName(layer, "soldermask")],
          ]) {
            const gb = gerberBuilder()
              .add("select_aperture", { aperture_number: 10 })
              .add("start_region_statement", {})

            if (element.points.length > 0) {
              gb.add("move_operation", {
                x: element.points[0].x,
                y: mfy(element.points[0].y),
              })
              for (let i = 1; i < element.points.length; i++) {
                gb.add("plot_operation", {
                  x: element.points[i].x,
                  y: mfy(element.points[i].y),
                })
              }
              gb.add("plot_operation", {
                x: element.points[0].x,
                y: mfy(element.points[0].y),
              })
            }

            gb.add("end_region_statement", {})

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
      } else if (element.type === "pcb_cutout") {
        if (layer === "edgecut") {
          const ec_layer = glayers.Edge_Cuts
          const cutout_builder = gerberBuilder().add("select_aperture", {
            aperture_number: 10,
          })

          const el = element as PcbCutout

          if (el.shape === "rect") {
            const { center, width, height, rotation } = el
            const w = width / 2
            const h = height / 2

            const points = [
              { x: -w, y: h }, // Top-left
              { x: w, y: h }, // Top-right
              { x: w, y: -h }, // Bottom-right
              { x: -w, y: -h }, // Bottom-left
            ]

            let transformMatrix = identity()
            if (rotation) {
              const angle_rad = (rotation * Math.PI) / 180
              transformMatrix = rotate(angle_rad)
            }
            transformMatrix = compose(
              translate(center.x, center.y),
              transformMatrix,
            )

            const transformedPoints = points.map((p) =>
              applyToPoint(transformMatrix, p),
            )

            cutout_builder.add("move_operation", {
              x: transformedPoints[0].x,
              y: mfy(transformedPoints[0].y),
            })
            for (let i = 1; i < transformedPoints.length; i++) {
              cutout_builder.add("plot_operation", {
                x: transformedPoints[i].x,
                y: mfy(transformedPoints[i].y),
              })
            }
            cutout_builder.add("plot_operation", {
              x: transformedPoints[0].x,
              y: mfy(transformedPoints[0].y),
            })
          } else if (el.shape === "circle") {
            const { center, radius } = el
            const numSegments = 36
            const angleStep = (2 * Math.PI) / numSegments
            const points: Array<{ x: number; y: number }> = []

            for (let i = 0; i < numSegments; i++) {
              points.push({
                x: center.x + radius * Math.cos(i * angleStep),
                y: center.y + radius * Math.sin(i * angleStep),
              })
            }

            cutout_builder.add("move_operation", {
              x: points[0].x,
              y: mfy(points[0].y),
            })
            for (let i = 1; i < points.length; i++) {
              cutout_builder.add("plot_operation", {
                x: points[i].x,
                y: mfy(points[i].y),
              })
            }
            cutout_builder.add("plot_operation", {
              x: points[0].x,
              y: mfy(points[0].y),
            })
          } else if (el.shape === "polygon") {
            const { points } = el
            if (points.length > 0) {
              cutout_builder.add("move_operation", {
                x: points[0].x,
                y: mfy(points[0].y),
              })
              for (let i = 1; i < points.length; i++) {
                cutout_builder.add("plot_operation", {
                  x: points[i].x,
                  y: mfy(points[i].y),
                })
              }
              cutout_builder.add("plot_operation", {
                x: points[0].x,
                y: mfy(points[0].y),
              })
            }
          }
          ec_layer.push(...cutout_builder.build())
        }
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
