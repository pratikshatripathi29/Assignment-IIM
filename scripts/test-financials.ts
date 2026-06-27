import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { getSecFilingsSummary, getKeyMetrics } from "../lib/tools/financialData";

async function main() {
  console.log("FMP_API_KEY present:", !!process.env.FMP_API_KEY);
  
  console.log("=== Testing SEC Filings Summary ===");
  const filings = await getSecFilingsSummary("320193"); // Apple
  console.log("Apple SEC Filings (Top 2):", JSON.stringify(filings?.slice(0, 2), null, 2));

  console.log("\n=== Testing FMP Key Metrics (Stable API) ===");
  const metrics = await getKeyMetrics("AAPL");
  console.log("Apple Key Metrics:", JSON.stringify(metrics, null, 2));
}

main().catch(console.error);
