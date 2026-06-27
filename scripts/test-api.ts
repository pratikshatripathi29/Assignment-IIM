async function main() {
  console.log("=== Testing SSE API Route (Nonsense Input) ===");
  try {
    const response = await fetch("http://localhost:3000/api/research", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ companyName: "asdfqwer123nonsense" })
    });

    if (!response.ok) {
      throw new Error(`Failed to request research: ${response.status} ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Response body is not readable.");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() || "";

      for (const part of parts) {
        if (!part.trim()) continue;
        console.log("Received SSE Packet:");
        console.log(part);
        console.log("-----------------------------------------");
      }
    }
  } catch (e: any) {
    console.error("API test failed:", e.message || e);
  }
}

main().catch(console.error);
