import axios from "axios";

export interface SearchResult {
  title: string;
  url: string;
  content: string;
}

/**
 * Searches the web using the Tavily Search API.
 * Never throws — logs a warning and returns an empty array on failure.
 */
export async function webResearch(query: string, maxResults = 5): Promise<SearchResult[]> {
  try {
    if (!query || typeof query !== "string") {
      console.warn("webResearch: A valid query string is required");
      return [];
    }

    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
      console.warn("webResearch: TAVILY_API_KEY is not defined in environment variables");
      return [];
    }

    const response = await axios.post("https://api.tavily.com/search", {
      api_key: apiKey,
      query,
      search_depth: "advanced",
      max_results: maxResults,
    });

    if (response.status !== 200 || !response.data || !Array.isArray(response.data.results)) {
      console.warn(`webResearch: Received invalid response from Tavily API (status ${response.status})`);
      return [];
    }

    return response.data.results.map((item: any) => ({
      title: item.title || "",
      url: item.url || "",
      content: item.content || "",
    }));
  } catch (error: any) {
    console.warn("Warning in webResearch:", error.message || error);
    return [];
  }
}
