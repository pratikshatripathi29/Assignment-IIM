import React, { useState } from "react";
import { Decision } from "../lib/schema/state";

interface ReportViewProps {
  decision: Decision | null;
  synthesis: string;
}

export function ReportView({ decision, synthesis }: ReportViewProps) {
  const [briefOpen, setBriefOpen] = useState(false);

  if (!decision) {
    return (
      <div className="p-8 bg-zinc-900 border border-zinc-800 rounded text-zinc-500 font-mono text-xs text-center tracking-wider">
        NO ANALYSIS REPORT LOADED. PLEASE ENTER A TARGET COMPANY ABOVE.
      </div>
    );
  }

  const { verdict, confidence, bullCase, bearCase, risks, reasoning, sources } = decision;

  // Verdict-specific styling config
  const verdictConfig = {
    invest: {
      bg: "bg-emerald-950/30",
      text: "text-emerald-400",
      border: "border-emerald-800/50",
      bar: "bg-emerald-500",
      label: "INVEST (BUY)",
    },
    pass: {
      bg: "bg-rose-950/30",
      text: "text-rose-400",
      border: "border-rose-800/50",
      bar: "bg-rose-500",
      label: "PASS (DO NOT BUY)",
    },
    watch: {
      bg: "bg-amber-950/30",
      text: "text-amber-400",
      border: "border-amber-800/50",
      bar: "bg-amber-500",
      label: "WATCH (MONITOR)",
    },
  }[verdict];

  // Separate the reasoning text from the critic's review note for advanced styling
  const criticMatch = reasoning.match(/([\s\S]*?)(\n\n\[Critic Review:[\s\S]*?\])/i);
  const mainReasoning = criticMatch ? criticMatch[1].trim() : reasoning;
  const criticNote = criticMatch ? criticMatch[2].trim() : null;

  // Helper to extract a readable label from a source URL
  const formatSourceLabel = (url: string) => {
    try {
      if (url.includes("sec.gov")) {
        const formMatch = url.match(/tsla-|aapl-|nvda-|[a-z]+-10-k|[a-z]+-10-q/i);
        const formLabel = url.includes("10k") || url.includes("10-k") ? "10-K filing" : "10-Q filing";
        return `SEC EDGAR Official ${formLabel}`;
      }
      const parsed = new URL(url);
      return parsed.hostname.replace("www.", "");
    } catch {
      return url;
    }
  };

  return (
    <div className="space-y-8 font-mono text-zinc-300">
      
      {/* 1. Header Overview Dashboard */}
      <div className="bg-zinc-900 border border-zinc-800 rounded p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Verdict Badge */}
          <div className="space-y-2">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500 block">INVESTMENT VERDICT</span>
            <div className={`inline-flex items-center px-4 py-2 border rounded font-bold text-sm tracking-widest ${verdictConfig.bg} ${verdictConfig.text} ${verdictConfig.border}`}>
              {verdictConfig.label}
            </div>
          </div>

          {/* Confidence Score Meter */}
          <div className="flex-1 max-w-md space-y-2">
            <div className="flex justify-between text-[10px] tracking-widest text-zinc-500">
              <span>ANALYST CONFIDENCE</span>
              <span className="text-white font-bold">{confidence}%</span>
            </div>
            <div className="w-full bg-zinc-950 border border-zinc-800 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${verdictConfig.bar}`}
                style={{ width: `${confidence}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Bull Case vs. Bear Case */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Bull Case */}
        <div className="bg-zinc-900/50 border border-zinc-800/80 rounded p-6">
          <h3 className="text-xs font-bold tracking-widest text-emerald-400 uppercase border-b border-emerald-950 pb-3 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            BULL CASE / THESIS
          </h3>
          <ul className="space-y-3 text-xs leading-relaxed text-zinc-300">
            {bullCase.map((item, idx) => (
              <li key={idx} className="flex gap-2 items-start">
                <span className="text-emerald-500 select-none font-bold">+</span>
                <span>{item}</span>
              </li>
            ))}
            {bullCase.length === 0 && (
              <li className="text-zinc-600 italic">No significant positive catalyst surfaced.</li>
            )}
          </ul>
        </div>

        {/* Bear Case */}
        <div className="bg-zinc-900/50 border border-zinc-800/80 rounded p-6">
          <h3 className="text-xs font-bold tracking-widest text-rose-400 uppercase border-b border-rose-950 pb-3 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
            BEAR CASE / CONCERNS
          </h3>
          <ul className="space-y-3 text-xs leading-relaxed text-zinc-300">
            {bearCase.map((item, idx) => (
              <li key={idx} className="flex gap-2 items-start">
                <span className="text-rose-500 select-none font-bold">-</span>
                <span>{item}</span>
              </li>
            ))}
            {bearCase.length === 0 && (
              <li className="text-zinc-600 italic">No significant negative concerns flagged.</li>
            )}
          </ul>
        </div>
      </div>

      {/* 3. Risks Section */}
      <div className="bg-zinc-900/50 border border-zinc-800/80 rounded p-6">
        <h3 className="text-xs font-bold tracking-widest text-zinc-400 uppercase border-b border-zinc-800 pb-3 mb-4 flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full" />
          MONITORING RISK VECTORS
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {risks.map((risk, idx) => (
            <div key={idx} className="bg-zinc-950 border border-zinc-900 rounded p-4 flex items-start gap-2.5">
              <span className="text-[10px] text-zinc-600 font-bold bg-zinc-900 px-1.5 py-0.5 rounded-sm select-none border border-zinc-850">
                {(idx + 1).toString().padStart(2, "0")}
              </span>
              <p className="text-xs text-zinc-400 leading-relaxed pt-0.5">{risk}</p>
            </div>
          ))}
          {risks.length === 0 && (
            <p className="text-zinc-600 text-xs italic col-span-3">No specific risk vectors identified.</p>
          )}
        </div>
      </div>

      {/* 4. Reasoning Section */}
      <div className="bg-zinc-900/50 border border-zinc-800/80 rounded p-6 space-y-4">
        <h3 className="text-xs font-bold tracking-widest text-zinc-400 uppercase border-b border-zinc-800 pb-3 mb-4 flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full" />
          DECISION REASONING
        </h3>
        <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">{mainReasoning}</p>

        {/* Critic Review dialogue box */}
        {criticNote && (
          <div className="mt-6 p-4 bg-zinc-950 border border-zinc-900 rounded text-zinc-400 text-xs relative overflow-hidden">
            <div className="absolute top-0 right-0 text-[8px] bg-zinc-900 border-l border-b border-zinc-850 px-2 py-1 text-zinc-500 tracking-wider font-bold">
              DEVIL'S ADVOCATE REVIEW
            </div>
            <p className="leading-relaxed text-zinc-400 italic font-mono pt-2">
              {criticNote.replace("[Critic Review:", "").replace("]", "").trim()}
            </p>
          </div>
        )}
      </div>

      {/* 5. Collapsible Full Research Brief */}
      <div className="border border-zinc-800 rounded bg-zinc-900/30 overflow-hidden">
        <button
          onClick={() => setBriefOpen(!briefOpen)}
          className="w-full flex items-center justify-between px-6 py-4 bg-zinc-900 hover:bg-zinc-900/80 text-left font-bold text-xs tracking-wider uppercase text-zinc-400 select-none transition-colors duration-200 border-b border-zinc-850"
        >
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full" />
            FULL RESEARCH BRIEF SYNTHESIS
          </span>
          <span className="text-sm font-light text-zinc-500 transition-transform duration-200 transform">
            {briefOpen ? "[-]" : "[+]"}
          </span>
        </button>
        {briefOpen && (
          <div className="p-6 bg-zinc-950/40 text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap space-y-4">
            {synthesis}
          </div>
        )}
      </div>

      {/* 6. Sources Section */}
      {sources && sources.length > 0 && (
        <div className="bg-zinc-900/50 border border-zinc-800/80 rounded p-6">
          <h3 className="text-xs font-bold tracking-widest text-zinc-400 uppercase border-b border-zinc-800 pb-3 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full" />
            VERIFIABLE SOURCES CITED
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sources.map((source, idx) => (
              <a
                key={idx}
                href={source}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 bg-zinc-950 hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-850 rounded flex items-center justify-between group transition-all duration-200 text-xs"
              >
                <div className="truncate pr-4">
                  <span className="text-[10px] text-zinc-600 block mb-0.5 font-bold uppercase tracking-wider">
                    SOURCE {(idx + 1).toString().padStart(2, "0")}
                  </span>
                  <span className="text-zinc-300 font-semibold group-hover:text-white transition-colors truncate block">
                    {formatSourceLabel(source)}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0">
                  [GO ↗]
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
