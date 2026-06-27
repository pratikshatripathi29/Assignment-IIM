import { z } from "zod";

/**
 * Schema for the final investment decision output stored in state.
 */
export const decisionSchema = z.object({
  verdict: z.enum(["invest", "pass", "watch"]),
  confidence: z.number().min(0).max(100),
  bullCase: z.array(z.string()),
  bearCase: z.array(z.string()),
  risks: z.array(z.string()),
  reasoning: z.string(),
  sources: z.array(z.string()),
});

export type Decision = z.infer<typeof decisionSchema>;

/**
 * Robust JSON Schema-compatible structured schema passed to LLMs.
 * Avoids Zod preprocessors/transforms (which break JSON schema generation in LangChain).
 * Uses string fields for bulleted text, which is parsed manually into arrays.
 */
export const llmDecisionSchema = z.object({
  verdict: z.enum(["invest", "pass", "watch"]),
  confidence: z.number().describe("Confidence score as a number between 0 and 100."),
  bullCase: z.string().describe("Key positive thesis points as a bulleted list (one per line)."),
  bearCase: z.string().describe("Key negative concerns as a bulleted list (one per line)."),
  risks: z.string().describe("Specific risks to monitor as a bulleted list (one per line)."),
  reasoning: z.string().describe("Objective evaluation summary text."),
  sources: z.array(z.string()).describe("List of exact URLs from the provided AVAILABLE VERIFIABLE SOURCE URLS list."),
});

/**
 * Shared state for the LangGraph agent researching a public company.
 */
export const ResearchStateSchema = z.object({
  companyName: z.string(),
  ticker: z.string().nullable(),
  cik: z.string().nullable(), // SEC Central Index Key
  financialData: z
    .object({
      raw: z.unknown(),
      summary: z.string(),
    })
    .nullable(),
  marketData: z
    .object({
      raw: z.unknown(),
      summary: z.string(),
    })
    .nullable(),
  newsData: z
    .object({
      raw: z.unknown(),
      summary: z.string(),
    })
    .nullable(),
  riskData: z
    .object({
      raw: z.unknown(),
      summary: z.string(),
    })
    .nullable(),
  synthesis: z.string().nullable(),
  decision: decisionSchema.nullable(),
  errors: z.array(z.string()),
});

export type ResearchState = z.infer<typeof ResearchStateSchema>;
