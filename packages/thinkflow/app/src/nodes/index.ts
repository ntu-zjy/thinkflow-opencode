import type { NodeTypes } from "@xyflow/react"
import { InputNode } from "./InputNode"
import { AgentNode } from "./AgentNode"
import { OutputNode } from "./OutputNode"

export const nodeTypes: NodeTypes = {
  input: InputNode,
  agent: AgentNode,
  output: OutputNode,
}

export { InputNode, AgentNode, OutputNode }
