# AI Investment Research Agent

An app that takes a publicly traded company name, researches it using real financial
data and web search, and produces an Invest / Pass / Watch decision with reasoning.

Stack: Next.js 14+ (App Router, TypeScript), LangGraph.js for agent orchestration,
Groq as the LLM provider (via @langchain/groq), Zod for structured output validation.

Data sources:
- SEC EDGAR (company_tickers.json + submissions API) — official filings, free, no key
- Financial Modeling Prep free tier — key financial metrics
- Tavily Search API — general web research (news, competitors, risk signals)

Architecture: LangGraph state graph with a resolver node, four parallel research
nodes (financial, market, news, risk), an aggregator node, a decision node
(structured output against a rubric), and a critic node that challenges the
decision before finalizing. Results stream to the frontend via SSE as the graph runs.

Folder structure:
- /app — Next.js pages and API routes
- /lib/agent — LangGraph nodes, graph definition, LLM client setup
- /lib/tools — wrappers for SEC EDGAR, FMP, Tavily
- /lib/schema — Zod schemas / shared TypeScript types
- /components — React UI components

Always keep this file in mind when generating code in this project, and update it if
the architecture changes meaningfully.
