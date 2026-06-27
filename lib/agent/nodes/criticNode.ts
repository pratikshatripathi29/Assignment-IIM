import { ResearchState, llmDecisionSchema } from "../../schema/state";
import { reasoningModel, fastModel, invokeWithRetry } from "../llm";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

/**
 * Parses bulleted strings (possibly separated by newlines and containing bullet marks)
 * into a clean array of strings.
 */
function parseBullets(text: string): string[] {
  if (!text) return [];
  return text
    .split(/\n+/)
    .map(s => s.replace(/^[-*•\s\d.]+\s*/, "").trim())
    .filter(Boolean);
}

/**
 * Critic node that acts as a devil's advocate reviewer.
 * Challenges the proposed decision by identifying the strongest counter-argument,
 * and outputs the finalized (maintained or revised) decision.
 */
export async function criticNode(state: ResearchState): Promise<Partial<ResearchState>> {
  try {
    const decision = state.decision;
    if (!decision) {
      return {
        errors: [...state.errors, "criticNode: No decision found in state to critique."],
      };
    }

    const synthesis = state.synthesis || "No research brief available.";
    const financialSummary = state.financialData?.summary || "N/A";
    const marketSummary = state.marketData?.summary || "N/A";
    const newsSummary = state.newsData?.summary || "N/A";
    const riskSummary = state.riskData?.summary || "N/A";

    // Extract verifiable raw URLs from state to prevent hallucinations
    const verifiableUrls: string[] = [];
    interface RawFinancialData {
      secFilings?: Array<{ primaryDocumentUrl?: string }> | null;
      keyMetrics?: any;
    }
    interface SearchResultData {
      searchResults?: Array<{ url?: string }> | null;
    }

    const rawFin = state.financialData?.raw as RawFinancialData | undefined;
    if (rawFin?.secFilings) {
      const filings = rawFin.secFilings;
      if (Array.isArray(filings)) {
        filings.forEach((filing: any) => {
          if (filing && filing.primaryDocumentUrl) {
            verifiableUrls.push(filing.primaryDocumentUrl);
          }
        });
      }
    }

    const rawMarket = state.marketData?.raw as SearchResultData | undefined;
    const rawNews = state.newsData?.raw as SearchResultData | undefined;
    const rawRisk = state.riskData?.raw as SearchResultData | undefined;

    const rawSearchSources = [
      rawMarket?.searchResults,
      rawNews?.searchResults,
      rawRisk?.searchResults,
    ];

    rawSearchSources.forEach((results) => {
      if (Array.isArray(results)) {
        results.forEach((item: any) => {
          if (item && item.url) {
            verifiableUrls.push(item.url);
          }
        });
      }
    });

    const uniqueVerifiableUrls = Array.from(new Set(verifiableUrls));

    const systemPrompt = `You are a skeptical, devil's-advocate investment reviewer.
Your job is to challenge the proposed investment decision using the provided research brief.

Evaluation Steps:
1. Identify the single strongest counter-argument to the proposed verdict:
   - If verdict is "invest": find the single most compelling reason to PASS or WATCH (e.g., hidden risks, high leverage, pending litigation, high P/E valuation).
   - If verdict is "pass": find the single most compelling reason to INVEST or WATCH (e.g., strong moat, vertical integration, rapid growth, low price-to-earnings).
   - If verdict is "watch": find the strongest argument for a definitive buy or sell.
2. Evaluate whether this counter-argument is significant enough to alter the proposed decision or reduce its confidence.
3. Output the finalized decision (either revised or confirmed/refined) conforming to the schema.

CRITICAL SEMANTIC RULES:
- "pass" means decline to invest (recommending AGAINST buying). Do NOT use "pass" to mean "passes the test" or as a positive endorsement. If your reasoning text argues the company is a good/attractive investment opportunity, the verdict MUST be "invest", NOT "pass".
- "invest" means recommending TO invest (buy the stock).
- "watch" means insufficient/mixed signals to decide either way (watchlist).
- Make sure the reasoning text's conclusion direction always matches the chosen verdict. If the reasoning leans positive, the verdict should be 'invest'. If the reasoning leans negative, the verdict should be 'pass'. If mixed/neutral, it should be 'watch'.

CRITICAL INSTRUCTIONS FOR REASONING FIELD:
- You MUST append a short note at the very end of the 'reasoning' field in this format: 
  "\\n\\n[Critic Review: Counter-argument considered: <describe counter-argument>. Verdict was <revised/maintained> because <reason>.]"
- Make sure this critique is appended as plain text.

CRITICAL INSTRUCTIONS FOR SOURCES:
- The 'sources' array MUST only contain actual URL strings selected from the provided "AVAILABLE VERIFIABLE SOURCE URLS" list.
- Do NOT use markdown links, parentheses containing URLs, or formatting like "[Link text](url)" inside the JSON fields or at the end of the JSON object.
- Do NOT invent, guess, or copy example URLs that are not in the provided list.`;

    const humanPrompt = `Evaluate and challenge the proposed investment decision for "${state.companyName}" (${state.ticker || "N/A"}).

PROPOSED INVESTMENT DECISION:
${JSON.stringify(decision, null, 2)}

---
INVESTMENT BRIEF SYNTHESIS:
${synthesis}

---
FINANCIAL SUMMARY:
${financialSummary}

---
MARKET POSITIONING SUMMARY:
${marketSummary}

---
RECENT NEWS SUMMARY:
${newsSummary}

---
RISK AND CONTROVERSY SUMMARY:
${riskSummary}

---
AVAILABLE VERIFIABLE SOURCE URLS:
${uniqueVerifiableUrls.length > 0 ? uniqueVerifiableUrls.map(url => `- ${url}`).join("\n") : "No verifiable source URLs available."}
---

Produce the revised or confirmed decision object. Select elements for the 'sources' array ONLY from the "AVAILABLE VERIFIABLE SOURCE URLS" list above. Do not include any other URLs or names.`;

    let rawLlmOutput;
    try {
      const structuredLlm = reasoningModel.withStructuredOutput(llmDecisionSchema);
      rawLlmOutput = await invokeWithRetry(structuredLlm, [
        new SystemMessage(systemPrompt),
        new HumanMessage(humanPrompt),
      ]);
    } catch (e: any) {
      console.warn("[criticNode] reasoningModel failed (likely Groq limit hit). Falling back to fastModel...", e.message || e);
      const fallbackLlm = fastModel.withStructuredOutput(llmDecisionSchema);
      rawLlmOutput = await invokeWithRetry(fallbackLlm, [
        new SystemMessage(systemPrompt),
        new HumanMessage(humanPrompt),
      ]);
    }

    // Transform raw output to conform to the state's decisionSchema shape (arrays of strings)
    const confidenceVal = typeof rawLlmOutput.confidence === "number" ? rawLlmOutput.confidence : parseInt(String(rawLlmOutput.confidence), 10);
    const finalizedDecision = {
      verdict: rawLlmOutput.verdict,
      confidence: isNaN(confidenceVal) ? 0 : Math.min(100, Math.max(0, confidenceVal)),
      bullCase: parseBullets(rawLlmOutput.bullCase),
      bearCase: parseBullets(rawLlmOutput.bearCase),
      risks: parseBullets(rawLlmOutput.risks),
      reasoning: rawLlmOutput.reasoning,
      sources: Array.isArray(rawLlmOutput.sources) ? rawLlmOutput.sources.map((s: any) => String(s).trim()) : [],
    };

    return {
      decision: finalizedDecision,
    };
  } catch (error: any) {
    return {
      errors: [...state.errors, `Error in criticNode: ${error.message || error}`],
    };
  }
}
