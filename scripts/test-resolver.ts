import { resolveTicker } from "../lib/tools/resolveTicker";

async function main() {
  console.log("=== Testing resolveTicker ===");

  console.log('Input: "Apple"');
  const result1 = await resolveTicker("Apple");
  console.log("Result:", JSON.stringify(result1, null, 2));
  console.log("------------------------");

  console.log('Input: "Tesla"');
  const result2 = await resolveTicker("Tesla");
  console.log("Result:", JSON.stringify(result2, null, 2));
  console.log("------------------------");

  console.log('Input: "asdkjqwe123nonsense"');
  const result3 = await resolveTicker("asdkjqwe123nonsense");
  console.log("Result:", JSON.stringify(result3, null, 2));
  console.log("------------------------");
}

main().catch(console.error);
