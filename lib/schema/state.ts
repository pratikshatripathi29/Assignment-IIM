import { z } from "zod";

/**
 * Schema for the final investment decision output by the agent.
 * This is kept standalone for reuse in structured LLM calls.
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
