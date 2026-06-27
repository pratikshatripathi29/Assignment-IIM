import axios from "axios";

export interface SecFilingSummary {
  form: string;
  filingDate: string;
  accessionNumber: string;
  primaryDocumentUrl: string;
}

export interface KeyFinancialMetrics {
  revenue: number | null;
  netIncome: number | null;
  grossMargin: number | null;
  debtToEquity: number | null;
  peRatio: number | null;
  oneYearPerformance: number | null;
}

/**
 * Fetches SEC's submission history for a given CIK and extracts a summary
 * of the most recent 10-K and 10-Q filings.
 * CIK must be zero-padded to 10 digits.
 * Never throws — logs a warning and returns null on failure.
 */
export async function getSecFilingsSummary(cik: string): Promise<SecFilingSummary[] | null> {
  try {
    if (!cik || typeof cik !== "string") {
      console.warn("getSecFilingsSummary: A valid CIK string is required");
      return null;
    }

    const paddedCik = cik.padStart(10, "0");
    const url = `https://data.sec.gov/submissions/CIK${paddedCik}.json`;
    const userAgent = process.env.SEC_USER_AGENT || "InvestmentResearchAgent contact@example.com";

    const response = await axios.get(url, {
      headers: {
        "User-Agent": userAgent,
        "Accept-Encoding": "gzip, deflate",
      },
    });

    if (response.status !== 200 || !response.data) {
      console.warn(`getSecFilingsSummary: Received status ${response.status} from SEC EDGAR API`);
      return null;
    }

    const data = response.data;
    if (!data.filings || !data.filings.recent) {
      console.warn("getSecFilingsSummary: No filings found in SEC response");
      return null;
    }

    const recent = data.filings.recent;
    const numFilings = recent.form?.length || 0;
    const summaries: SecFilingSummary[] = [];

    const unpaddedCik = parseInt(cik, 10).toString();

    for (let i = 0; i < numFilings; i++) {
      const form = recent.form[i];
      if (form === "10-K" || form === "10-Q") {
        const filingDate = recent.filingDate[i];
        const accessionNumber = recent.accessionNumber[i];
        const primaryDocument = recent.primaryDocument[i];

        if (accessionNumber && primaryDocument) {
          const accessionNoDashes = accessionNumber.replace(/-/g, "");
          const primaryDocumentUrl = `https://www.sec.gov/Archives/edgar/data/${unpaddedCik}/${accessionNoDashes}/${primaryDocument}`;

          summaries.push({
            form,
            filingDate,
            accessionNumber,
            primaryDocumentUrl,
          });
        }
      }
    }

    return summaries.length > 0 ? summaries : null;
  } catch (error: any) {
    console.warn(`getSecFilingsSummary: Error fetching SEC filings for CIK ${cik}:`, error.message || error);
    return null;
  }
}

/**
 * Fetches key financial metrics for a ticker from FMP stable API:
 * revenue, net income, gross margin, debt-to-equity, P/E ratio, and 1-year price performance.
 * Never throws — logs a warning and returns null/partial data on failure.
 */
export async function getKeyMetrics(ticker: string): Promise<KeyFinancialMetrics | null> {
  try {
    if (!ticker || typeof ticker !== "string") {
      console.warn("getKeyMetrics: A valid ticker string is required");
      return null;
    }

    const apiKey = process.env.FMP_API_KEY;
    if (!apiKey) {
      console.warn("getKeyMetrics: FMP_API_KEY is not defined in environment variables");
      return null;
    }

    const upperTicker = ticker.toUpperCase();
    const metrics: KeyFinancialMetrics = {
      revenue: null,
      netIncome: null,
      grossMargin: null,
      debtToEquity: null,
      peRatio: null,
      oneYearPerformance: null,
    };

    // 1. Fetch Income Statement (Stable API)
    try {
      const incomeUrl = `https://financialmodelingprep.com/stable/income-statement?symbol=${upperTicker}&limit=1&apikey=${apiKey}`;
      const response = await axios.get(incomeUrl);
      if (response.status === 200 && Array.isArray(response.data) && response.data.length > 0) {
        const item = response.data[0];
        metrics.revenue = item.revenue ?? null;
        metrics.netIncome = item.netIncome ?? null;
        if (item.revenue && item.grossProfit !== undefined) {
          metrics.grossMargin = item.grossProfit / item.revenue;
        }
      }
    } catch (e: any) {
      console.warn(`getKeyMetrics: Failed to fetch income statement for ${upperTicker}:`, e.message || e);
    }

    // 2. Fetch Ratios TTM (Stable API — contains P/E and Debt-to-Equity)
    try {
      const ratiosUrl = `https://financialmodelingprep.com/stable/ratios-ttm?symbol=${upperTicker}&apikey=${apiKey}`;
      const response = await axios.get(ratiosUrl);
      if (response.status === 200 && Array.isArray(response.data) && response.data.length > 0) {
        const item = response.data[0];
        metrics.debtToEquity = item.debtToEquityRatioTTM ?? null;
        metrics.peRatio = item.priceToEarningsRatioTTM ?? null;
        if (metrics.grossMargin === null && item.grossProfitMarginTTM !== undefined) {
          metrics.grossMargin = item.grossProfitMarginTTM;
        }
      }
    } catch (e: any) {
      console.warn(`getKeyMetrics: Failed to fetch ratios for ${upperTicker}:`, e.message || e);
    }

    // 3. Fetch Stock Price Change (Stable API)
    try {
      const priceChangeUrl = `https://financialmodelingprep.com/stable/stock-price-change?symbol=${upperTicker}&apikey=${apiKey}`;
      const response = await axios.get(priceChangeUrl);
      if (response.status === 200 && Array.isArray(response.data) && response.data.length > 0) {
        const item = response.data[0];
        metrics.oneYearPerformance = item["1Y"] ?? null;
      }
    } catch (e: any) {
      console.warn(`getKeyMetrics: Failed to fetch price change for ${upperTicker}:`, e.message || e);
    }

    // If all metrics are null, return null, otherwise return the partial/complete metrics
    const allNull = Object.values(metrics).every((val) => val === null);
    return allNull ? null : metrics;
  } catch (error: any) {
    console.warn(`getKeyMetrics: General error for ticker ${ticker}:`, error.message || error);
    return null;
  }
}
