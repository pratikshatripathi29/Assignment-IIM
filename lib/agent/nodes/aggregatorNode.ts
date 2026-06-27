import { ResearchState } from "../../schema/state";
import { fastModel, invokeWithRetry } from "../llm";
import { HumanMessage } from "@langchain/core/messages";

/**
 * Aggregator node that synthesizes the summaries from the parallel research nodes
 * (financial, market, news, risk) into a unified, well-structured research brief.
 */
export async function aggregatorNode(state: ResearchState): Promise<Partial<ResearchState>> {
  try {
    const financialSummary = state.financialData?.summary || "No financial summary available.";
    const marketSummary = state.marketData?.summary || "No market summary available.";
    const newsSummary = state.newsData?.summary || "No recent news summary available.";
    const riskSummary = state.riskData?.summary || "No risk assessment available.";

    const prompt = `You are a senior investment analyst. Combine the following research summaries for ${state.companyName} into a single, cohesive, well-structured investment research brief.
    
---
1. Financial Health Summary:
${financialSummary}

---
2. Market Position & Competitive Dynamics:
${marketSummary}

---
3. Recent News & Developments:
${newsSummary}

---
4. Key Risks & Controversies:
${riskSummary}
---

Your research brief should be structured into 3-4 cohesive paragraphs. Write in a formal, professional, and objective investment tone. Highlight the key intersections between these areas (e.g., how financial strength mitigates regulatory risks, or how market competition impacts future growth).`;

    const response = await invokeWithRetry(fastModel, [new HumanMessage(prompt)]);
    const synthesis = typeof response.content === "string" ? response.content.trim() : JSON.stringify(response.content);

    return {
      synthesis,
    };
  } catch (error: any) {
    return {
      errors: [...state.errors, `Error in aggregatorNode: ${error.message || error}`],
    };
  }
}
