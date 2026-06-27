import { StateGraph, START, END, Annotation } from "@langchain/langgraph";
import { ResearchState } from "../schema/state";
import { resolverNode } from "./nodes/resolverNode";
import { financialNode } from "./nodes/financialNode";
import { marketNode } from "./nodes/marketNode";
import { newsNode } from "./nodes/newsNode";
import { riskNode } from "./nodes/riskNode";
import { aggregatorNode } from "./nodes/aggregatorNode";
import { decisionNode } from "./nodes/decisionNode";
import { criticNode } from "./nodes/criticNode";

// Define the annotation state to match ResearchState structure
export const ResearchStateAnnotation = Annotation.Root({
  companyName: Annotation<string>(),
  ticker: Annotation<string | null>(),
  cik: Annotation<string | null>(),
  financialData: Annotation<{ raw: any; summary: string } | null>(),
  marketData: Annotation<{ raw: any; summary: string } | null>(),
  newsData: Annotation<{ raw: any; summary: string } | null>(),
  riskData: Annotation<{ raw: any; summary: string } | null>(),
  synthesis: Annotation<string | null>(),
  decision: Annotation<any>(),
  errors: Annotation<string[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
});

/**
 * Fallback node executed when the company name cannot be resolved.
 * Sets a placeholder decision indicating insufficient data.
 */
export async function failNode(state: typeof ResearchStateAnnotation.State): Promise<Partial<typeof ResearchStateAnnotation.State>> {
  return {
    decision: {
      verdict: "watch",
      confidence: 0,
      bullCase: [],
      bearCase: ["Failed to resolve company name or ticker to a valid SEC CIK."],
      risks: ["Target company could not be identified/resolved from search term."],
      reasoning: `The research agent failed to resolve the company term "${state.companyName}" to a valid SEC CIK index. No financial filings or metrics could be retrieved, and research was terminated.`,
      sources: []
    }
  };
}

// Build StateGraph workflow
const workflow = new StateGraph(ResearchStateAnnotation)
  .addNode("resolver", resolverNode)
  .addNode("financial", financialNode)
  .addNode("market", marketNode)
  .addNode("news", newsNode)
  .addNode("risk", riskNode)
  .addNode("aggregator", aggregatorNode)
  .addNode("decision_node", decisionNode) // Renamed from "decision" to avoid name collision with state channel
  .addNode("critic", criticNode)
  .addNode("fail", failNode);

// Define edges
workflow.addEdge(START, "resolver");

// Route conditionally from the resolver node
workflow.addConditionalEdges(
  "resolver",
  (state) => {
    // If resolver failed to find ticker/CIK, route directly to failNode
    if (!state.ticker || !state.cik) {
      return "fail";
    }
    // Otherwise, execute all research nodes concurrently (fan-out)
    return ["financial", "market", "news", "risk"];
  },
  ["financial", "market", "news", "risk", "fail"]
);

// Synchronize parallel execution outputs into the aggregator node (fan-in)
workflow.addEdge("financial", "aggregator");
workflow.addEdge("market", "aggregator");
workflow.addEdge("news", "aggregator");
workflow.addEdge("risk", "aggregator");

// Sequentially chain post-aggregation nodes
workflow.addEdge("aggregator", "decision_node");
workflow.addEdge("decision_node", "critic");
workflow.addEdge("critic", END);

// Fail node terminates graph immediately
workflow.addEdge("fail", END);

// Compile the executable graph
export const graph = workflow.compile();

/**
 * Invokes the graph and returns the final state of execution.
 */
export async function runResearch(companyName: string) {
  const initialState = {
    companyName,
    ticker: null,
    cik: null,
    financialData: null,
    marketData: null,
    newsData: null,
    riskData: null,
    synthesis: null,
    decision: null,
    errors: []
  };
  return await graph.invoke(initialState);
}

/**
 * Streams the updates as the nodes in the graph execute in real time.
 */
export async function streamResearch(companyName: string) {
  const initialState = {
    companyName,
    ticker: null,
    cik: null,
    financialData: null,
    marketData: null,
    newsData: null,
    riskData: null,
    synthesis: null,
    decision: null,
    errors: []
  };
  return await graph.stream(initialState, { streamMode: "updates" });
}
export type ResearchGraphType = typeof graph;
