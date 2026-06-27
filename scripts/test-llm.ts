import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  console.log("GROQ_API_KEY present:", !!process.env.GROQ_API_KEY);

  // Use dynamic imports to ensure dotenv.config() runs first
  const { fastModel, reasoningModel } = await import("../lib/agent/llm");
  const { HumanMessage } = await import("@langchain/core/messages");

  console.log("=== Testing Fast Model (llama-3.1-8b-instant) ===");
  try {
    const res = await fastModel.invoke([
      new HumanMessage("Simplify: The quick brown fox jumps over the lazy dog.")
    ]);
    console.log("Fast model response:", res.content);
  } catch (e: any) {
    console.error("Fast model failed:", e.message || e);
  }

  console.log("\n=== Testing Reasoning Model (llama-3.3-70b-versatile) ===");
  try {
    const res = await reasoningModel.invoke([
      new HumanMessage("What is the primary difference between a bull market and a bear market in 1 sentence?")
    ]);
    console.log("Reasoning model response:", res.content);
  } catch (e: any) {
    console.error("Reasoning model failed:", e.message || e);
  }
}

main().catch(console.error);
