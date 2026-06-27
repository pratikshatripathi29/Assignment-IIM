import { ChatGroq } from "@langchain/groq";

if (!process.env.GROQ_API_KEY) {
  console.warn("llm.ts: GROQ_API_KEY is not defined in environment variables");
}

export const fastModel = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: "llama-3.1-8b-instant",
  temperature: 0.2,
});

export const reasoningModel = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: "llama-3.3-70b-versatile",
  temperature: 0.1,
});

/**
 * Invokes an LLM model with automatic retry on rate limits (429 errors).
 * Parses the required wait duration from Groq's error message if present.
 */
export async function invokeWithRetry(
  model: any,
  messages: any[],
  maxRetries = 5
): Promise<any> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await model.invoke(messages);
    } catch (error: any) {
      attempt++;
      const errorMessage = error.message || JSON.stringify(error);
      const isRateLimit = 
        errorMessage.includes("429") || 
        errorMessage.includes("rate_limit") || 
        error.status === 429 ||
        (error.response && error.response.status === 429);

      if (isRateLimit && attempt < maxRetries) {
        let sleepMs = 4000; // default fallback sleep: 4 seconds
        
        // Parse reset time from Groq message (e.g. "try again in 15.54s", "try again in 22m14.016s")
        const match = errorMessage.match(/try again in (?:(\d+)m)?([\d.]+)(s|ms)/i);
        if (match) {
          const minutes = match[1] ? parseInt(match[1], 10) : 0;
          const seconds = parseFloat(match[2]);
          const unit = match[3];
          
          if (unit === "s") {
            sleepMs = (minutes * 60 + seconds) * 1000;
          } else {
            sleepMs = (minutes * 60 * 1000) + seconds;
          }
          sleepMs += 1000; // add a 1 second buffer
        }

        // If the rate limit wait time is too long (e.g. > 45 seconds), throw immediately to prevent timeouts
        if (sleepMs > 45000) {
          throw new Error(
            `Rate limit requires a wait of ${Math.round(sleepMs / 1000)}s (Groq Daily Token Limit exceeded).`
          );
        }
        
        console.warn(
          `[Groq Rate Limit] Hit 429 on model. Sleeping for ${Math.round(sleepMs)}ms before retry ${attempt}/${maxRetries}...`
        );
        await new Promise((resolve) => setTimeout(resolve, sleepMs));
      } else {
        throw error;
      }
    }
  }
  throw new Error("Max retries reached for LLM invocation due to rate limits.");
}
