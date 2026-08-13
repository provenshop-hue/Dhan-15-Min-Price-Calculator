import React, { useState, useMemo } from 'react';
import { StockCalculated } from '../types';
import { analyzeBullishCombinations, BullishSectionAnalysis } from '../utils/bullishCombinations';
import { 
  TrendingUp, 
  Flame, 
  Layers, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  SlidersHorizontal, 
  ExternalLink, 
  ArrowUpRight, 
  Activity,
  Zap,
  BarChart2,
  Filter,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface BullishFilterSectionProps {
  stocks: StockCalculated[];
  onSelectStockDetail?: (stock: StockCalculated) => void;
  onOpenPositionSizer?: (stock: StockCalculated) => void;
  onSelectFilter?: (filterKey: 'BULLISH_COMBO_1' | 'BULLISH_COMBO_2' | 'BULLISH_COMBO_3' | 'BULLISH_COMBO_ALL' | 'BULLISH_COMBO_ANY' | 'ALL') => void;
  activeFilter?: string;
}

export const BullishFilterSection: React.FC<BullishFilterSectionProps> = ({
  stocks,
  onSelectStockDetail,
  onOpenPositionSizer,
  onSelectFilter,
  activeFilter = 'ALL'
}) => {
  const [selectedComboFilter, setSelectedComboFilter] = useState<'ALL' | 'COMBO_1' | 'COMBO_2' | 'COMBO_3' | 'ALL_THREE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedStockId, setExpandedStockId] = useState<string | null>(null);

  // Compute analyses for all stocks
  const analyzedStocks = useMemo(() => {
    return stocks.map((s) => ({
      stock: s,
      analysis: analyzeBullishCombinations(s)
    }));
  }, [stocks]);

  // Counts
  const counts = useMemo(() => {
    let combo1Count = 0;
    let combo2Count = 0;
    let combo3Count = 0;
    let triplePowerCount = 0;
    let anyCount = 0;

    analyzedStocks.forEach(({ analysis }) => {
      if (analysis.combo1.isMatch) combo1Count++;
      if (analysis.combo2.isMatch) combo2Count++;
      if (analysis.combo3.isMatch) combo3Count++;
      if (analysis.isAllCombosMet) triplePowerCount++;
      if (analysis.isAnyComboMet) anyCount++;
    });

    return { combo1Count, combo2Count, combo3Count, triplePowerCount, anyCount };
  }, [analyzedStocks]);

  // Filtered list
  const filteredList = useMemo(() => {
    return analyzedStocks.filter(({ stock, analysis }) => {
      // Search text
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSymbol = stock.symbol.toLowerCase().includes(q);
        const matchesName = stock.companyName.toLowerCase().includes(q);
        if (!matchesSymbol && !matchesName) return false;
      }

      if (selectedComboFilter === 'COMBO_1') return analysis.combo1.isMatch;
      if (selectedComboFilter === 'COMBO_2') return analysis.combo2.isMatch;
      if (selectedComboFilter === 'COMBO_3') return analysis.combo3.isMatch;
      if (selectedComboFilter === 'ALL_THREE') return analysis.isAllCombosMet;
      
      // Default 'ALL': show stocks that match at least 1 combination
      return analysis.isAnyComboMet;
    });
  }, [analyzedStocks, selectedComboFilter, searchQuery]);

  return (
    <div className="bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-2xl text-slate-100 my-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-emerald-400 fill-current animate-pulse" />
              Technical Momentum Screener
            </span>
            <span className="text-xs text-slate-400">({stocks.length} Total Stocks Monitored)</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Bullish Combinations Screener
            <span className="text-sm font-semibold px-2.5 py-0.5 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-800/80">
              {counts.anyCount} Qualified
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Multi-indicator trend alignment filtering using 9/20/50 EMAs, RSI 55–70 momentum breakouts, and MACD bullish crossovers.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectedComboFilter('ALL');
              if (onSelectFilter) onSelectFilter('BULLISH_COMBO_ANY');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
              selectedComboFilter === 'ALL'
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/20 font-black'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            All Bullish ({counts.anyCount})
          </button>
          <button
            onClick={() => {
              setSelectedComboFilter('ALL_THREE');
              if (onSelectFilter) onSelectFilter('BULLISH_COMBO_ALL');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
              selectedComboFilter === 'ALL_THREE'
                ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-lg shadow-amber-400/20 font-black'
                : 'bg-amber-950/40 text-amber-300 border-amber-800/60 hover:bg-amber-900/50'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400 fill-current" />
            Triple Power ({counts.triplePowerCount})
          </button>
        </div>
      </div>

      {/* 3 Combination Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
        {/* Combination 1 */}
        <div 
          onClick={() => {
            setSelectedComboFilter('COMBO_1');
            if (onSelectFilter) onSelectFilter('BULLISH_COMBO_1');
          }}
          className={`cursor-pointer transition-all rounded-2xl p-4 border relative overflow-hidden group ${
            selectedComboFilter === 'COMBO_1'
              ? 'bg-emerald-950/60 border-emerald-500 ring-2 ring-emerald-500/30 shadow-xl'
              : 'bg-slate-800/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/70'
          }`}
        >
          <div className="flex items-start justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase text-emerald-400 tracking-wider bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/80">
              Combination 1
            </span>
            <span className="text-xs font-black px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {counts.combo1Count} Stocks
            </span>
          </div>

          <h3 className="text-base font-bold text-white mb-2 group-hover:text-emerald-300 transition-colors flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-emerald-400" />
            Triple EMA Stack & Pullback
          </h3>

          <ul className="space-y-1.5 text-xs text-slate-300">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="font-semibold text-slate-100">9 EMA &gt; 20 EMA &gt; 50 EMA</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Price above all three EMAs</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>EMAs rising sloped upward</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Pullback respects 9/20 EMA support</span>
            </li>
          </ul>

          <div className="mt-3 pt-2.5 border-t border-slate-700/50 flex items-center justify-between text-[11px] text-emerald-400 font-semibold">
            <span>Filter by Combo 1</span>
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </div>

        {/* Combination 2 */}
        <div 
          onClick={() => {
            setSelectedComboFilter('COMBO_2');
            if (onSelectFilter) onSelectFilter('BULLISH_COMBO_2');
          }}
          className={`cursor-pointer transition-all rounded-2xl p-4 border relative overflow-hidden group ${
            selectedComboFilter === 'COMBO_2'
              ? 'bg-blue-950/60 border-blue-500 ring-2 ring-blue-500/30 shadow-xl'
              : 'bg-slate-800/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/70'
          }`}
        >
          <div className="flex items-start justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase text-blue-400 tracking-wider bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800/80">
              Combination 2
            </span>
            <span className="text-xs font-black px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
              {counts.combo2Count} Stocks
            </span>
          </div>

          <h3 className="text-base font-bold text-white mb-2 group-hover:text-blue-300 transition-colors flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-blue-400" />
            RSI 55–70 Higher Highs
          </h3>

          <ul className="space-y-1.5 text-xs text-slate-300">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span className="font-semibold text-slate-100">RSI preferably 55–70</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span>Price making higher highs</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span>RSI also making higher highs</span>
            </li>
            <li className="flex items-center gap-2 text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400/60" />
              <span>Bullish momentum confirmation</span>
            </li>
          </ul>

          <div className="mt-3 pt-2.5 border-t border-slate-700/50 flex items-center justify-between text-[11px] text-blue-400 font-semibold">
            <span>Filter by Combo 2</span>
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </div>

        {/* Combination 3 */}
        <div 
          onClick={() => {
            setSelectedComboFilter('COMBO_3');
            if (onSelectFilter) onSelectFilter('BULLISH_COMBO_3');
          }}
          className={`cursor-pointer transition-all rounded-2xl p-4 border relative overflow-hidden group ${
            selectedComboFilter === 'COMBO_3'
              ? 'bg-purple-950/60 border-purple-500 ring-2 ring-purple-500/30 shadow-xl'
              : 'bg-slate-800/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/70'
          }`}
        >
          <div className="flex items-start justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase text-purple-400 tracking-wider bg-purple-950/80 px-2 py-0.5 rounded border border-purple-800/80">
              Combination 3
            </span>
            <span className="text-xs font-black px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              {counts.combo3Count} Stocks
            </span>
          </div>

          <h3 className="text-base font-bold text-white mb-2 group-hover:text-purple-300 transition-colors flex items-center gap-1.5">
            <BarChart2 className="w-4 h-4 text-purple-400" />
            MACD Crossover &amp; Zero Line
          </h3>

          <ul className="space-y-1.5 text-xs text-slate-300">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              <span className="font-semibold text-slate-100">MACD bullish crossover</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              <span>MACD above zero line</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              <span>Histogram increasing</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              <span>Price above major MAs (20/50 EMA)</span>
            </li>
          </ul>

          <div className="mt-3 pt-2.5 border-t border-slate-700/50 flex items-center justify-between text-[11px] text-purple-400 font-semibold">
            <span>Filter by Combo 3</span>
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </div>
      </div>

      {/* Filter Bar & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950/80 p-3 rounded-2xl border border-slate-800 mb-4">
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <span className="text-xs font-bold text-slate-400 flex items-center gap-1 whitespace-nowrap">
            <Filter className="w-3.5 h-3.5 text-emerald-400" /> View Mode:
          </span>
          <button
            onClick={() => setSelectedComboFilter('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              selectedComboFilter === 'ALL'
                ? 'bg-slate-800 text-white border border-slate-700 shadow-2xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Matching ({counts.anyCount})
          </button>
          <button
            onClick={() => setSelectedComboFilter('COMBO_1')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              selectedComboFilter === 'COMBO_1'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-emerald-400 hover:bg-emerald-950/50'
            }`}
          >
            Combo 1: 9/20/50 EMA ({counts.combo1Count})
          </button>
          <button
            onClick={() => setSelectedComboFilter('COMBO_2')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              selectedComboFilter === 'COMBO_2'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-blue-400 hover:bg-blue-950/50'
            }`}
          >
            Combo 2: RSI 55-70 ({counts.combo2Count})
          </button>
          <button
            onClick={() => setSelectedComboFilter('COMBO_3')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              selectedComboFilter === 'COMBO_3'
                ? 'bg-purple-600 text-white shadow-2xs'
                : 'text-purple-400 hover:bg-purple-950/50'
            }`}
          >
            Combo 3: MACD ({counts.combo3Count})
          </button>
          <button
            onClick={() => setSelectedComboFilter('ALL_THREE')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              selectedComboFilter === 'ALL_THREE'
                ? 'bg-amber-500 text-slate-950 font-black shadow-2xs'
                : 'text-amber-400 hover:bg-amber-950/50'
            }`}
          >
            🔥 All 3 Met ({counts.triplePowerCount})
          </button>
        </div>

        <input
          type="text"
          placeholder="Search symbol..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-48 bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-emerald-500"
        />
      </div>

      {/* Stock Cards List */}
      {filteredList.length === 0 ? (
        <div className="bg-slate-950/60 rounded-2xl border border-slate-800 p-8 text-center text-slate-400">
          <Zap className="w-8 h-8 text-slate-600 mx-auto mb-2 animate-bounce" />
          <p className="text-sm font-semibold">No stocks currently match the selected Bullish Combination filter.</p>
          <p className="text-xs text-slate-500 mt-1">Try switching to "All Matching" or fetch fresh 15-minute market candle data.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredList.map(({ stock, analysis }) => {
            const isExpanded = expandedStockId === stock.id;
            const open = stock.openPrice || 0;
            const close = stock.closePrice || 0;
            const pct = stock.pctChange || 0;

            return (
              <div 
                key={stock.id}
                className="bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition-all shadow-md"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  {/* Symbol & Info */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center font-black text-xs text-emerald-400 shadow-inner">
                      {stock.symbol.slice(0, 3)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-base text-white tracking-wide">{stock.symbol}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${analysis.badgeClass}`}>
                          {analysis.summaryBadge}
                        </span>
                        {analysis.isAllCombosMet && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 text-[10px] font-extrabold border border-amber-400/30 flex items-center gap-1">
                            <Flame className="w-3 h-3 text-amber-400 fill-current" /> TRIPLE
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{stock.companyName}</span>
                        <span>&bull;</span>
                        <span className="font-mono">LTP: ₹{close.toFixed(2)}</span>
                        <span className={`font-bold ${pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          ({pct >= 0 ? '+' : ''}{pct.toFixed(2)}%)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Combination Indicator Badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Combo 1 Badge */}
                    <div className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 border ${
                      analysis.combo1.isMatch 
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-700/80 shadow-2xs' 
                        : 'bg-slate-900 text-slate-500 border-slate-800'
                    }`}>
                      {analysis.combo1.isMatch ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 fill-current" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-slate-600" />
                      )}
                      <span>Combo 1: 9/20/50 EMA</span>
                    </div>

                    {/* Combo 2 Badge */}
                    <div className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 border ${
                      analysis.combo2.isMatch 
                        ? 'bg-blue-950 text-blue-300 border-blue-700/80 shadow-2xs' 
                        : 'bg-slate-900 text-slate-500 border-slate-800'
                    }`}>
                      {analysis.combo2.isMatch ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 fill-current" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-slate-600" />
                      )}
                      <span>Combo 2: RSI 55-70</span>
                    </div>

                    {/* Combo 3 Badge */}
                    <div className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 border ${
                      analysis.combo3.isMatch 
                        ? 'bg-purple-950 text-purple-300 border-purple-700/80 shadow-2xs' 
                        : 'bg-slate-900 text-slate-500 border-slate-800'
                    }`}>
                      {analysis.combo3.isMatch ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 fill-current" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-slate-600" />
                      )}
                      <span>Combo 3: MACD</span>
                    </div>

                    {/* Toggle Breakdown */}
                    <button
                      onClick={() => setExpandedStockId(isExpanded ? null : stock.id)}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors ml-1"
                      title="Toggle Detailed Combination Rules Breakdown"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details Breakdown */}
                {isExpanded && (
                  <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-slate-900/60 p-3 rounded-xl">
                    {/* Combo 1 Breakdown */}
                    <div className="space-y-1">
                      <div className="font-bold text-emerald-400 flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5" /> Combo 1 Details:
                      </div>
                      <div className="text-slate-300 space-y-0.5 font-mono text-[11px]">
                        <div>9 EMA: ₹{analysis.combo1.ema9.toFixed(1)}</div>
                        <div>20 EMA: ₹{analysis.combo2.isMatch ? analysis.combo1.ema20.toFixed(1) : analysis.combo1.ema20.toFixed(1)}</div>
                        <div>50 EMA: ₹{analysis.combo1.ema50.toFixed(1)}</div>
                        <div className="text-slate-400 mt-1">{analysis.combo1.details}</div>
                      </div>
                    </div>

                    {/* Combo 2 Breakdown */}
                    <div className="space-y-1">
                      <div className="font-bold text-blue-400 flex items-center gap-1">
                        <Activity className="w-3.5 h-3.5" /> Combo 2 Details:
                      </div>
                      <div className="text-slate-300 space-y-0.5 font-mono text-[11px]">
                        <div>Current RSI: {analysis.combo2.rsi.toFixed(1)}</div>
                        <div>RSI 55-70 Zone: {analysis.combo2.isRsiInZone ? 'YES' : 'NO'}</div>
                        <div>Price HH: {analysis.combo2.isPriceHigherHighs ? 'YES' : 'NO'}</div>
                        <div>RSI HH: {analysis.combo2.isRsiHigherHighs ? 'YES' : 'NO'}</div>
                      </div>
                    </div>

                    {/* Combo 3 Breakdown */}
                    <div className="space-y-1">
                      <div className="font-bold text-purple-400 flex items-center gap-1">
                        <BarChart2 className="w-3.5 h-3.5" /> Combo 3 Details:
                      </div>
                      <div className="text-slate-300 space-y-0.5 font-mono text-[11px]">
                        <div>MACD: {analysis.combo3.macd.toFixed(2)}</div>
                        <div>Signal: {analysis.combo3.signal.toFixed(2)}</div>
                        <div>Histogram: {analysis.combo3.histogram.toFixed(2)}</div>
                        <div>Above Zero: {analysis.combo3.isAboveZero ? 'YES' : 'NO'}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
