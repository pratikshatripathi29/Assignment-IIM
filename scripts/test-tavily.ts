import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { webResearch } from "../lib/tools/webResearch";

async function main() {
  console.log("TAVILY_API_KEY present:", !!process.env.TAVILY_API_KEY);
  
  console.log("\n=== Test 1: Default maxResults (should be 5) ===");
  const results1 = await webResearch("Apple Inc recent news competitors risks 2026");
  console.log("Test 1 results count:", results1.length);
  results1.forEach((res, i) => console.log(`  [${i + 1}] ${res.title} (${res.url.substring(0, 50)}...)`));

  console.log("\n=== Test 2: Requesting maxResults = 7 ===");
  const results2 = await webResearch("Microsoft competitor analysis 2026", 7);
  console.log("Test 2 results count:", results2.length);
  results2.forEach((res, i) => console.log(`  [${i + 1}] ${res.title} (${res.url.substring(0, 50)}...)`));

  console.log("\n=== Test 3: Requesting maxResults = 1 (Nonsense Query) ===");
  const results3 = await webResearch("asdfasdfasdfasdfasd qwerqwerqwerqwer", 1);
  console.log("Test 3 results count:", results3.length);
  results3.forEach((res, i) => console.log(`  [${i + 1}] ${res.title} (${res.url.substring(0, 50)}...)`));
}

main().catch(console.error);
