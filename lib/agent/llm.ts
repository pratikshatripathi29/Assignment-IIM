import { ChatGroq } from "@langchain/groq";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";

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
        
        // Parse reset time from Groq message (e.g. "try again in 15.54s" or "try again in 3.59s")
        const match = errorMessage.match(/try again in ([\d.]+)(s|ms)/i);
        if (match) {
          const value = parseFloat(match[1]);
          const unit = match[2];
          sleepMs = unit === "s" ? value * 1000 : value;
          sleepMs += 1000; // add a 1 second buffer
        }
        
        console.warn(
          `[Groq Rate Limit] Hit 429 on model ${model.id || ""}. Sleeping for ${Math.round(sleepMs)}ms before retry ${attempt}/${maxRetries}...`
        );
        await new Promise((resolve) => setTimeout(resolve, sleepMs));
      } else {
        throw error;
      }
    }
  }
  throw new Error("Max retries reached for LLM invocation due to rate limits.");
}
