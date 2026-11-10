import type { AnyCircuitElement } from "circuit-json"
import type { AnyGerberCommand } from "../any_gerber_command"
import { gerberBuilder } from "../gerber-builder"

export interface CopperObjectAttributes {
  component?: string
  net?: string
}

const getPointKey = (x: number, y: number): string =>
  `${x.toFixed(4)}:${y.toFixed(4)}`

const normalizeAttrValue = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export const createCopperObjectAttributeResolver = (
  circuitJson: AnyCircuitElement[],
) => {
  const sourceComponentNameById = new Map<string, string>()
  const componentNameByPcbComponentId = new Map<string, string>()
  const sourcePortById = new Map<string, any>()
  const pcbPortById = new Map<string, any>()
  const netNameBySourceNetId = new Map<string, string>()
  const netNameByConnectivityKey = new Map<string, string>()
  const netNameBySourceTraceId = new Map<string, string>()
  const netNameBySourcePortId = new Map<string, string>()
  const netNameByPcbPortId = new Map<string, string>()
  const netNameByPcbTraceId = new Map<string, string>()
  const netNameByPointKey = new Map<string, string>()

  for (const element of circuitJson) {
    if (element.type === "source_component") {
      const name = normalizeAttrValue(element.name)
      if (name && element.source_component_id) {
        sourceComponentNameById.set(element.source_component_id, name)
      }
    } else if (element.type === "source_port") {
      if (element.source_port_id) {
        sourcePortById.set(element.source_port_id, element)
      }
    } else if (element.type === "pcb_port") {
      if (element.pcb_port_id) {
        pcbPortById.set(element.pcb_port_id, element)
      }
    } else if (element.type === "source_net") {
      const name = normalizeAttrValue(element.name)
      if (name && element.source_net_id) {
        netNameBySourceNetId.set(element.source_net_id, name)
        const connectivityKey = normalizeAttrValue(
          element.subcircuit_connectivity_map_key,
        )
        if (connectivityKey) {
          netNameByConnectivityKey.set(connectivityKey, name)
        }
      }
    }
  }

  for (const element of circuitJson) {
    if (element.type === "pcb_component") {
      const sourceComponentId = normalizeAttrValue(element.source_component_id)
      const componentName = sourceComponentId
        ? sourceComponentNameById.get(sourceComponentId)
        : undefined
      if (componentName && element.pcb_component_id) {
        componentNameByPcbComponentId.set(
          element.pcb_component_id,
          componentName,
        )
      }
    }
  }

  const getComponentNameForSourcePort = (
    sourcePort: any,
  ): string | undefined => {
    const sourceComponentId = normalizeAttrValue(
      sourcePort?.source_component_id,
    )
    return sourceComponentId
      ? sourceComponentNameById.get(sourceComponentId)
      : undefined
  }

  const getPinLabelForSourcePort = (sourcePort: any): string => {
    if (
      typeof sourcePort?.pin_number === "number" &&
      Number.isFinite(sourcePort.pin_number)
    ) {
      return String(sourcePort.pin_number)
    }
    const rawName = normalizeAttrValue(sourcePort?.name)
    if (rawName) {
      const stripped = rawName.replace(/^pin/i, "")
      return stripped.length > 0 ? stripped : rawName
    }
    return "1"
  }

  // Pass 1 over source_trace: propagate explicit source_net names
  for (const element of circuitJson) {
    if (element.type !== "source_trace") continue
    const connectivityKey = normalizeAttrValue(
      element.subcircuit_connectivity_map_key,
    )
    let netName = connectivityKey
      ? netNameByConnectivityKey.get(connectivityKey)
      : undefined

    if (!netName && Array.isArray(element.connected_source_net_ids)) {
      for (const netId of element.connected_source_net_ids) {
        const candidate = netNameBySourceNetId.get(netId)
        if (candidate) {
          netName = candidate
          break
        }
      }
    }

    if (netName) {
      if (element.source_trace_id) {
        netNameBySourceTraceId.set(element.source_trace_id, netName)
      }
      if (connectivityKey) {
        netNameByConnectivityKey.set(connectivityKey, netName)
      }
      if (Array.isArray(element.connected_source_port_ids)) {
        for (const portId of element.connected_source_port_ids) {
          netNameBySourcePortId.set(portId, netName)
        }
      }
    }
  }

  // Pass 2 over source_trace: derive deterministic KiCad-style net names for
  // traces connecting component ports without an explicit source_net.
  for (const element of circuitJson) {
    if (element.type !== "source_trace") continue
    const connectivityKey = normalizeAttrValue(
      element.subcircuit_connectivity_map_key,
    )
    let netName =
      (element.source_trace_id
        ? netNameBySourceTraceId.get(element.source_trace_id)
        : undefined) ??
      (connectivityKey
        ? netNameByConnectivityKey.get(connectivityKey)
        : undefined)

    if (!netName && Array.isArray(element.connected_source_port_ids)) {
      for (const portId of element.connected_source_port_ids) {
        const existing = netNameBySourcePortId.get(portId)
        if (existing) {
          netName = existing
          break
        }
      }
    }

    if (!netName && Array.isArray(element.connected_source_port_ids)) {
      const candidates: string[] = []
      for (const portId of element.connected_source_port_ids) {
        const sourcePort = sourcePortById.get(portId)
        const componentName = getComponentNameForSourcePort(sourcePort)
        if (componentName) {
          candidates.push(
            `Net-(${componentName}-Pad${getPinLabelForSourcePort(sourcePort)})`,
          )
        }
      }
      if (candidates.length > 0) {
        candidates.sort()
        netName = candidates[0]
      }
    }

    if (netName) {
      if (element.source_trace_id) {
        netNameBySourceTraceId.set(element.source_trace_id, netName)
      }
      if (connectivityKey) {
        netNameByConnectivityKey.set(connectivityKey, netName)
      }
      if (Array.isArray(element.connected_source_port_ids)) {
        for (const portId of element.connected_source_port_ids) {
          if (!netNameBySourcePortId.has(portId)) {
            netNameBySourcePortId.set(portId, netName)
          }
        }
      }
    }
  }

  for (const element of circuitJson) {
    if (element.type !== "source_port") continue
    const connectivityKey = normalizeAttrValue(
      element.subcircuit_connectivity_map_key,
    )
    if (connectivityKey && element.source_port_id) {
      const netName = netNameByConnectivityKey.get(connectivityKey)
      if (netName && !netNameBySourcePortId.has(element.source_port_id)) {
        netNameBySourcePortId.set(element.source_port_id, netName)
      }
    }
  }

  for (const element of circuitJson) {
    if (element.type !== "pcb_port") continue
    const connectivityKey = normalizeAttrValue(
      (element as any).subcircuit_connectivity_map_key,
    )
    const netName =
      (connectivityKey
        ? netNameByConnectivityKey.get(connectivityKey)
        : undefined) ??
      (element.source_port_id
        ? netNameBySourcePortId.get(element.source_port_id)
        : undefined)
    if (netName && element.pcb_port_id) {
      netNameByPcbPortId.set(element.pcb_port_id, netName)
    }
  }

  for (const element of circuitJson) {
    if (element.type !== "pcb_trace") continue
    const connectivityKey = normalizeAttrValue(
      (element as any).subcircuit_connectivity_map_key,
    )
    const sourceTraceId = normalizeAttrValue(element.source_trace_id)
    const connectionName = normalizeAttrValue((element as any).connection_name)

    let netName =
      (connectivityKey
        ? netNameByConnectivityKey.get(connectivityKey)
        : undefined) ??
      (sourceTraceId
        ? (netNameBySourceTraceId.get(sourceTraceId) ??
          netNameBySourceNetId.get(sourceTraceId))
        : undefined) ??
      (connectionName
        ? (netNameBySourceNetId.get(connectionName) ??
          netNameBySourceTraceId.get(connectionName))
        : undefined)

    if (!netName && Array.isArray(element.route)) {
      for (const point of element.route) {
        const startPortId = normalizeAttrValue((point as any).start_pcb_port_id)
        const endPortId = normalizeAttrValue((point as any).end_pcb_port_id)
        netName =
          (startPortId ? netNameByPcbPortId.get(startPortId) : undefined) ??
          (endPortId ? netNameByPcbPortId.get(endPortId) : undefined)
        if (netName) break
      }
    }

    if (netName) {
      if (element.pcb_trace_id) {
        netNameByPcbTraceId.set(element.pcb_trace_id, netName)
      }
      if (Array.isArray(element.route)) {
        for (const point of element.route) {
          const startPortId = normalizeAttrValue(
            (point as any).start_pcb_port_id,
          )
          const endPortId = normalizeAttrValue((point as any).end_pcb_port_id)
          if (startPortId && !netNameByPcbPortId.has(startPortId)) {
            netNameByPcbPortId.set(startPortId, netName)
          }
          if (endPortId && !netNameByPcbPortId.has(endPortId)) {
            netNameByPcbPortId.set(endPortId, netName)
          }
          if (
            "x" in point &&
            "y" in point &&
            typeof point.x === "number" &&
            typeof point.y === "number"
          ) {
            netNameByPointKey.set(getPointKey(point.x, point.y), netName)
          }
        }
      }
    }
  }

  const getComponentForElement = (
    element: AnyCircuitElement,
  ): string | undefined => {
    if (element.type !== "pcb_smtpad" && element.type !== "pcb_plated_hole") {
      return undefined
    }
    const pcbComponentId = normalizeAttrValue(element.pcb_component_id)
    if (pcbComponentId) {
      const fromPcbComponent = componentNameByPcbComponentId.get(pcbComponentId)
      if (fromPcbComponent) return fromPcbComponent
    }
    const pcbPortId = normalizeAttrValue(element.pcb_port_id)
    if (pcbPortId) {
      const pcbPort = pcbPortById.get(pcbPortId)
      const portComponentId = normalizeAttrValue(pcbPort?.pcb_component_id)
      if (portComponentId) {
        const fromPortComponent =
          componentNameByPcbComponentId.get(portComponentId)
        if (fromPortComponent) return fromPortComponent
      }
      const sourcePortId = normalizeAttrValue(pcbPort?.source_port_id)
      if (sourcePortId) {
        const sourcePort = sourcePortById.get(sourcePortId)
        const fromSourcePort = getComponentNameForSourcePort(sourcePort)
        if (fromSourcePort) return fromSourcePort
      }
    }
    return undefined
  }

  const getNetForElement = (element: AnyCircuitElement): string | undefined => {
    const connectivityKey = normalizeAttrValue(
      (element as any).subcircuit_connectivity_map_key,
    )
    if (connectivityKey) {
      const fromKey = netNameByConnectivityKey.get(connectivityKey)
      if (fromKey) return fromKey
    }

    if (element.type === "pcb_smtpad" || element.type === "pcb_plated_hole") {
      const pcbPortId = normalizeAttrValue(element.pcb_port_id)
      if (pcbPortId) {
        const fromPort = netNameByPcbPortId.get(pcbPortId)
        if (fromPort) return fromPort
      }
      if (
        "x" in element &&
        "y" in element &&
        typeof element.x === "number" &&
        typeof element.y === "number"
      ) {
        const fromPoint = netNameByPointKey.get(
          getPointKey(element.x, element.y),
        )
        if (fromPoint) return fromPoint
      }
      return undefined
    }

    if (element.type === "pcb_via") {
      const pcbTraceId = normalizeAttrValue(element.pcb_trace_id)
      if (pcbTraceId) {
        const fromTrace =
          netNameByPcbTraceId.get(pcbTraceId) ??
          netNameBySourceTraceId.get(pcbTraceId) ??
          netNameBySourceNetId.get(pcbTraceId)
        if (fromTrace) return fromTrace
      }
      const sourceNetId = normalizeAttrValue((element as any).source_net_id)
      if (sourceNetId) {
        const fromNet = netNameBySourceNetId.get(sourceNetId)
        if (fromNet) return fromNet
      }
      if (typeof element.x === "number" && typeof element.y === "number") {
        return netNameByPointKey.get(getPointKey(element.x, element.y))
      }
      return undefined
    }

    if (element.type === "pcb_trace") {
      if (element.pcb_trace_id) {
        const fromTrace = netNameByPcbTraceId.get(element.pcb_trace_id)
        if (fromTrace) return fromTrace
      }
      const sourceTraceId = normalizeAttrValue(element.source_trace_id)
      if (sourceTraceId) {
        return (
          netNameBySourceTraceId.get(sourceTraceId) ??
          netNameBySourceNetId.get(sourceTraceId)
        )
      }
      return undefined
    }

    if (element.type === "pcb_copper_pour") {
      const sourceNetId = normalizeAttrValue(element.source_net_id)
      if (sourceNetId) {
        return netNameBySourceNetId.get(sourceNetId)
      }
      return undefined
    }

    return undefined
  }

  const activeByLayer = new WeakMap<
    AnyGerberCommand[],
    CopperObjectAttributes
  >()

  const syncCopperObjectAttributes = (
    glayer: AnyGerberCommand[],
    next: CopperObjectAttributes = {},
  ) => {
    const current = activeByLayer.get(glayer) ?? {}
    const builder = gerberBuilder()

    if (next.component !== current.component) {
      if (next.component) {
        builder.add("add_attribute_on_object", {
          attribute_name: ".C",
          attribute_value: next.component,
        })
      } else if (current.component) {
        builder.add("delete_attribute", { attribute: ".C" })
      }
    }

    if (next.net !== current.net) {
      if (next.net) {
        builder.add("add_attribute_on_object", {
          attribute_name: ".N",
          attribute_value: next.net,
        })
      } else if (current.net) {
        builder.add("delete_attribute", { attribute: ".N" })
      }
    }

    const commands = builder.build()
    if (commands.length > 0) {
      glayer.push(...commands)
    }

    activeByLayer.set(glayer, {
      component: next.component,
      net: next.net,
    })
  }

  const getCopperObjectAttributes = (
    element: AnyCircuitElement,
  ): CopperObjectAttributes => ({
    component: getComponentForElement(element),
    net: getNetForElement(element),
  })

  return {
    getCopperObjectAttributes,
    syncCopperObjectAttributes,
  }
}

export const copperObjectAttributes = createCopperObjectAttributeResolver
