import axios from "axios";

export interface ResolvedTicker {
  ticker: string;
  cik: string;
  title: string;
}

interface SECTickerEntry {
  cik_str: number;
  ticker: string;
  title: string;
}

// In-memory cache variables
let cachedEntries: SECTickerEntry[] | null = null;
let lastFetchedTime = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const SEC_TICKERS_URL = "https://www.sec.gov/files/company_tickers.json";

/**
 * Normalizes a string by converting to lowercase, removing non-alphanumeric
 * characters except spaces, collapsing multiple spaces, and trimming.
 */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Computes the Levenshtein distance between two strings.
 */
function getLevenshteinDistance(s1: string, s2: string): number {
  const len1 = s1.length;
  const len2 = s2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return matrix[len1][len2];
}

/**
 * Calculates a similarity score between 0.0 and 1.0.
 */
function calculateSimilarity(query: string, title: string): number {
  const q = normalize(query);
  const t = normalize(title);

  if (q === t) return 1.0;
  if (!q || !t) return 0;

  // Substring match
  if (t.includes(q)) {
    // If the query is directly inside the title (e.g. "apple" in "apple inc")
    return 0.8 + 0.2 * (q.length / t.length);
  }
  if (q.includes(t)) {
    // If the title is inside the query
    return 0.7 + 0.2 * (t.length / q.length);
  }

  // Token overlap matching
  const qTokens = q.split(" ").filter(Boolean);
  const tTokens = t.split(" ").filter(Boolean);

  let matches = 0;
  for (const token of qTokens) {
    if (tTokens.includes(token)) {
      matches++;
    }
  }

  if (matches > 0) {
    const tokenMatchRatio = matches / Math.max(qTokens.length, tTokens.length);
    return tokenMatchRatio * 0.7; // Cap at 0.7 since substring is stronger
  }

  // Levenshtein distance fallback
  const levDist = getLevenshteinDistance(q, t);
  const maxLen = Math.max(q.length, t.length);
  if (maxLen === 0) return 0;
  return (1 - levDist / maxLen) * 0.5; // Scale down fallback
}

/**
 * Resolves a company name to its SEC ticker, CIK (padded to 10 digits), and official title.
 * Fetches data from SEC and caches it in memory for up to 24 hours.
 * This function never throws; it returns null on failure or if no confident match is found.
 */
export async function resolveTicker(companyName: string): Promise<ResolvedTicker | null> {
  try {
    if (!companyName || typeof companyName !== "string") {
      return null;
    }

    const now = Date.now();
    const shouldFetch = !cachedEntries || now - lastFetchedTime > CACHE_DURATION;

    if (shouldFetch) {
      const userAgent =
        process.env.SEC_USER_AGENT || "InvestmentResearchAgent contact@example.com";

      const response = await axios.get<Record<string, SECTickerEntry>>(SEC_TICKERS_URL, {
        headers: {
          "User-Agent": userAgent,
          "Accept-Encoding": "gzip, deflate",
        },
      });

      if (response.status === 200 && response.data) {
        // Convert the SEC JSON dictionary into a flat array of entries
        cachedEntries = Object.values(response.data);
        lastFetchedTime = now;
      }
    }

    if (!cachedEntries || cachedEntries.length === 0) {
      return null;
    }

    const cleanQuery = companyName.trim().toLowerCase();

    // 1. Check for exact ticker matches first (e.g., query is "AAPL" or "MSFT")
    const exactTickerMatch = cachedEntries.find(
      (entry) => entry.ticker.toLowerCase() === cleanQuery
    );
    if (exactTickerMatch) {
      return {
        ticker: exactTickerMatch.ticker,
        cik: String(exactTickerMatch.cik_str).padStart(10, "0"),
        title: exactTickerMatch.title,
      };
    }

    // 2. Fuzzy match against the company "title" (name)
    let bestMatch: SECTickerEntry | null = null;
    let highestScore = 0;
    const CONFIDENCE_THRESHOLD = 0.6;

    for (const entry of cachedEntries) {
      const score = calculateSimilarity(companyName, entry.title);
      if (score > highestScore) {
        highestScore = score;
        bestMatch = entry;
      }
    }

    if (bestMatch && highestScore >= CONFIDENCE_THRESHOLD) {
      return {
        ticker: bestMatch.ticker,
        cik: String(bestMatch.cik_str).padStart(10, "0"),
        title: bestMatch.title,
      };
    }

    return null;
  } catch (error) {
    // Fail silently and return null per requirements
    console.error("Error resolving ticker:", error);
    return null;
  }
}
