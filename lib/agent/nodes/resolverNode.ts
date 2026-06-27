import { ResearchState } from "../../schema/state";
import { resolveTicker } from "../../tools/resolveTicker";

export async function resolverNode(state: ResearchState): Promise<Partial<ResearchState>> {
  try {
    if (!state.companyName) {
      return {
        errors: [...state.errors, "resolverNode: companyName is not defined in the state."],
      };
    }

    const resolved = await resolveTicker(state.companyName);
    if (!resolved) {
      return {
        ticker: null,
        cik: null,
        errors: [...state.errors, `Failed to resolve ticker/CIK for company: ${state.companyName}`],
      };
    }

    return {
      ticker: resolved.ticker,
      cik: resolved.cik,
    };
  } catch (error: any) {
    return {
      errors: [...state.errors, `Error in resolverNode: ${error.message || error}`],
    };
  }
}
