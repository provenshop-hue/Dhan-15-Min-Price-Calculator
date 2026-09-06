import React, { useMemo, useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Filter, 
  ArrowUpDown, 
  Flame, 
  Zap, 
  Layers, 
  CheckCircle2, 
  XCircle, 
  ChevronDown, 
  ChevronUp, 
  Calculator, 
  Activity, 
  ExternalLink, 
  SlidersHorizontal, 
  Info, 
  Copy, 
  Check,
  Table as TableIcon,
  LayoutGrid,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { StockCalculated, StockTradeJourney } from '../types';
import { 
  analyzeStockEmaConfluence, 
  StockEmaAnalysis, 
  EmaScoreTier 
} from '../utils/emaConfluence';
import { parseTimeToMinutes } from '../utils/recentHitTiming';

interface Props {
  stocks: StockCalculated[];
  tradeJourneys?: Record<string, StockTradeJourney>;
  onSelectStockDetail: (stock: StockCalculated) => void;
  onOpenPositionSizer?: (stock: StockCalculated) => void;
  onOpenRsiAnalyst?: (stock: StockCalculated) => void;
}

export function EmaConfluenceScanner({
  stocks,
  tradeJourneys,
  onSelectStockDetail,
  onOpenPositionSizer,
  onOpenRsiAnalyst
}: Props) {
  // Navigation & Primary Filter State
  const [sideFilter, setSideFilter] = useState<'ALL' | 'BULLISH' | 'BEARISH' | 'STRONG_ONLY'>('BULLISH');
  const [tierFilter, setTierFilter] = useState<'ALL' | 'VERY_STRONG' | 'MODERATE' | 'WEAK_WAIT'>('ALL');
  const [timeFilter, setTimeFilter] = useState<'ALL' | '09:15' | '09:30' | '09:45' | '10:00_PLUS'>('ALL');
  const [priceFilter, setPriceFilter] = useState<'ALL' | 'UNDER_1000' | '1000_TO_2500' | 'ABOVE_2500'>('ALL');
  const [sortBy, setSortBy] = useState<'SCORE_DESC' | 'TIME_ASC' | 'TIME_DESC' | 'LOT_DESC' | 'PCT_DESC' | 'PRICE_DESC'>('SCORE_DESC');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');

  // Expanded Accordions State
  const [expandedTimelines, setExpandedTimelines] = useState<Set<string>>(new Set());
  const [expandedEmaStacks, setExpandedEmaStacks] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleTimeline = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setExpandedTimelines(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleEmaStack = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setExpandedEmaStacks(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyTradeSetup = (e: React.MouseEvent, analysis: StockEmaAnalysis) => {
    e.stopPropagation();
    const isBull = analysis.dominantSide === 'BULLISH';
    const activeScore = isBull ? analysis.bullishScore : analysis.bearishScore;
    const text = `📈 ${analysis.symbol} EMA CONFLUENCE SETUP
🏢 ${analysis.companyName} | CMP: ₹${analysis.price.toFixed(2)} (${analysis.pctChange > 0 ? '+' : ''}${analysis.pctChange.toFixed(2)}%)
🎯 Dominant Signal: ${isBull ? '🟢 Strong Bullish' : '🔴 Strong Bearish'} (Score: ${activeScore}/8)
⏱️ First Hit Time: ${analysis.hitTime} (${analysis.hitTrigger})
📦 F&O Lot Size: ${analysis.lotSize} Qty | Lot Value: ₹${analysis.contractValue.toLocaleString('en-IN')}
💡 Option Capital Estimate: ~₹${analysis.estOptionCapital.toLocaleString('en-IN')} / lot
📊 EMA Levels:
  • 9 EMA: ₹${analysis.ema9.toFixed(2)} (Slope: ${analysis.ema9Slope > 0 ? '+' : ''}${analysis.ema9Slope.toFixed(2)})
  • 20 EMA: ₹${analysis.ema20.toFixed(2)}
  • 50 EMA: ₹${analysis.ema50.toFixed(2)}
  • 200 EMA: ₹${analysis.ema200.toFixed(2)}
🔍 Structure: ${analysis.structureSummary}
${analysis.pullbackDetail !== 'No active pullback retest' ? `🔄 Pullback Action: ${analysis.pullbackDetail}` : ''}`;

    navigator.clipboard.writeText(text);
    setCopiedId(analysis.stock.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Run EMA Analysis across all stocks
  const analyzedStocks = useMemo(() => {
    return stocks.map(stock => {
      return analyzeStockEmaConfluence(stock, tradeJourneys);
    });
  }, [stocks, tradeJourneys]);

  // Overall Statistics
  const overallStats = useMemo(() => {
    const total = analyzedStocks.length;
    const strongBullish = analyzedStocks.filter(s => s.bullishScore >= 7).length;
    const strongBearish = analyzedStocks.filter(s => s.bearishScore >= 7).length;
    const modBullish = analyzedStocks.filter(s => s.bullishScore >= 5 && s.bullishScore < 7).length;
    const modBearish = analyzedStocks.filter(s => s.bearishScore >= 5 && s.bearishScore < 7).length;
    
    // Earliest hit time
    const activeHighConviction = analyzedStocks.filter(s => s.activeScore >= 5);
    const earliestTime = activeHighConviction.length > 0 
      ? [...activeHighConviction].sort((a, b) => parseTimeToMinutes(a.hitTime) - parseTimeToMinutes(b.hitTime))[0].hitTime 
      : '09:15 AM';

    const avgScore = total > 0 
      ? analyzedStocks.reduce((acc, s) => acc + s.activeScore, 0) / total 
      : 0;

    return {
      total,
      strongBullish,
      strongBearish,
      modBullish,
      modBearish,
      earliestTime,
      avgScore
    };
  }, [analyzedStocks]);

  // Filter and Sort
  const filteredStocks = useMemo(() => {
    return analyzedStocks
      .filter(s => {
        // Search Term
        if (!searchTerm) return true;
        const q = searchTerm.toLowerCase();
        return s.symbol.toLowerCase().includes(q) || s.companyName.toLowerCase().includes(q);
      })
      .filter(s => {
        // Side Filter
        if (sideFilter === 'BULLISH') return s.dominantSide === 'BULLISH' || s.bullishScore >= 3;
        if (sideFilter === 'BEARISH') return s.dominantSide === 'BEARISH' || s.bearishScore >= 3;
        if (sideFilter === 'STRONG_ONLY') return s.bullishScore >= 7 || s.bearishScore >= 7;
        return true;
      })
      .filter(s => {
        // Tier Filter
        if (tierFilter === 'ALL') return true;
        const currentTier = s.dominantSide === 'BULLISH' ? s.bullishTier : s.bearishTier;
        return currentTier === tierFilter;
      })
      .filter(s => {
        // Time Filter
        if (timeFilter === '09:15') return s.hitTime === '09:15 AM';
        if (timeFilter === '09:30') return s.hitTime === '09:30 AM';
        if (timeFilter === '09:45') return s.hitTime === '09:45 AM';
        if (timeFilter === '10:00_PLUS') return s.hitTime !== '09:15 AM' && s.hitTime !== '09:30 AM' && s.hitTime !== '09:45 AM';
        return true;
      })
      .filter(s => {
        // Price Filter
        if (priceFilter === 'UNDER_1000') return s.price < 1000;
        if (priceFilter === '1000_TO_2500') return s.price >= 1000 && s.price <= 2500;
        if (priceFilter === 'ABOVE_2500') return s.price > 2500;
        return true;
      })
      .sort((a, b) => {
        // Sorting
        if (sortBy === 'TIME_ASC') {
          return parseTimeToMinutes(a.hitTime) - parseTimeToMinutes(b.hitTime);
        }
        if (sortBy === 'TIME_DESC') {
          return parseTimeToMinutes(b.hitTime) - parseTimeToMinutes(a.hitTime);
        }
        if (sortBy === 'LOT_DESC') {
          return b.lotSize - a.lotSize;
        }
        if (sortBy === 'PCT_DESC') {
          return b.pctChange - a.pctChange;
        }
        if (sortBy === 'PRICE_DESC') {
          return b.price - a.price;
        }
        // Default: SCORE_DESC
        const scoreA = a.dominantSide === 'BULLISH' ? a.bullishScore : a.bearishScore;
        const scoreB = b.dominantSide === 'BULLISH' ? b.bullishScore : b.bearishScore;
        return scoreB - scoreA || b.pctChange - a.pctChange;
      });
  }, [analyzedStocks, searchTerm, sideFilter, tierFilter, timeFilter, priceFilter, sortBy]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-slate-900 rounded-3xl border border-slate-800 p-5 md:p-6 shadow-xl relative overflow-hidden">
        {/* Subtle Ambient Glow */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
          <div className="flex items-start gap-4">
            <div className="p-3.5 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 text-emerald-400 rounded-2xl shadow-inner shrink-0">
              <Layers className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-black text-white font-mono tracking-tight flex items-center gap-2">
                  EMA Confluence Scanner
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-emerald-400" />
                  9 &gt; 20 &gt; 50 &gt; 200 EMA Cascade
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Quantitative multi-EMA scoring system with <strong className="text-amber-300">Intraday Hit Time</strong>, <strong className="text-cyan-300">F&amp;O Lot Size</strong>, and slope trajectory tracking.
              </p>
            </div>
          </div>

          {/* Quick Stat Pill Widgets */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="px-3 py-2 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Earliest Hit Time</span>
                <span className="font-mono font-black text-amber-300 text-xs">{overallStats.earliestTime}</span>
              </div>
            </div>

            <div className="px-3 py-2 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 flex items-center gap-2.5">
              <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-400/80 block">Strong Bullish (7-8)</span>
                <span className="font-mono font-black text-emerald-300 text-xs">{overallStats.strongBullish} Stocks</span>
              </div>
            </div>

            <div className="px-3 py-2 rounded-2xl bg-rose-950/40 border border-rose-800/60 flex items-center gap-2.5">
              <TrendingDown className="w-4 h-4 text-rose-400 shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-bold text-rose-400/80 block">Strong Bearish (7-8)</span>
                <span className="font-mono font-black text-rose-300 text-xs">{overallStats.strongBearish} Stocks</span>
              </div>
            </div>
          </div>
        </div>

        {/* Methodology Educational Strip */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-xl p-3 flex items-start gap-2.5">
            <div className="p-1 rounded bg-emerald-500/20 text-emerald-300 shrink-0 mt-0.5">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-bold text-emerald-300">🟢 Strong Bullish Cascade Formula:</span>
              <p className="text-slate-300 text-[11px] mt-0.5">
                Price ↑ &gt; 9 EMA ↑ &gt; 20 EMA ↑ &gt; 50 EMA ↑ &gt; 200 EMA. Must have positive slopes, HH/HL structure &amp; volume expansion.
              </p>
            </div>
          </div>

          <div className="bg-rose-950/30 border border-rose-800/40 rounded-xl p-3 flex items-start gap-2.5">
            <div className="p-1 rounded bg-rose-500/20 text-rose-300 shrink-0 mt-0.5">
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-bold text-rose-300">🔴 Strong Bearish Cascade Formula:</span>
              <p className="text-slate-300 text-[11px] mt-0.5">
                Price ↓ &lt; 9 EMA ↓ &lt; 20 EMA ↓ &lt; 50 EMA ↓ &lt; 200 EMA. Must have negative slopes, LH/LL breakdown &amp; volume surge.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Controls & Filter Toolbar */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 space-y-3.5 shadow-sm">
        {/* Top Control Line: Search, View Mode, Side Toggle */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Side Mode Selector Buttons */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setSideFilter('BULLISH')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                sideFilter === 'BULLISH'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-300" />
              <span>🟢 Bullish Confluence</span>
              <span className="text-[10px] bg-emerald-950 px-1.5 py-0.2 rounded font-mono">
                {analyzedStocks.filter(s => s.dominantSide === 'BULLISH').length}
              </span>
            </button>

            <button
              onClick={() => setSideFilter('BEARISH')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                sideFilter === 'BEARISH'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5 text-rose-300" />
              <span>🔴 Bearish Confluence</span>
              <span className="text-[10px] bg-rose-950 px-1.5 py-0.2 rounded font-mono">
                {analyzedStocks.filter(s => s.dominantSide === 'BEARISH').length}
              </span>
            </button>

            <button
              onClick={() => setSideFilter('STRONG_ONLY')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                sideFilter === 'STRONG_ONLY'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
              <span>⚡ 7–8 Score Only</span>
              <span className="text-[10px] bg-slate-900 text-amber-300 px-1.5 py-0.2 rounded font-mono">
                {overallStats.strongBullish + overallStats.strongBearish}
              </span>
            </button>

            <button
              onClick={() => setSideFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                sideFilter === 'ALL'
                  ? 'bg-slate-700 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <span>All ({analyzedStocks.length})</span>
            </button>
          </div>

          {/* Search & Layout Toggle */}
          <div className="flex items-center gap-2">
            <div className="relative w-full md:w-64">
              <input
                type="text"
                placeholder="Search symbol or company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3.5 py-2 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setViewMode('CARDS')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'CARDS' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-white'
                }`}
                title="Grid Cards View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('TABLE')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'TABLE' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-white'
                }`}
                title="Dense Table View"
              >
                <TableIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Secondary Filter Row: Hit Time, Tiers, Price & Sort */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/70 text-xs">
          {/* Hit Time Filter */}
          <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1 pr-1">
              <Clock className="w-3 h-3" />
              Hit Time:
            </span>
            <button
              onClick={() => setTimeFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                timeFilter === 'ALL'
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              All Times
            </button>
            <button
              onClick={() => setTimeFilter('09:15')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                timeFilter === '09:15'
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'bg-slate-950 text-amber-300 hover:text-white border border-slate-800'
              }`}
            >
              🔔 09:15 AM
            </button>
            <button
              onClick={() => setTimeFilter('09:30')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                timeFilter === '09:30'
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'bg-slate-950 text-emerald-300 hover:text-white border border-slate-800'
              }`}
            >
              ⚡ 09:30 AM
            </button>
            <button
              onClick={() => setTimeFilter('09:45')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                timeFilter === '09:45'
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'bg-slate-950 text-teal-300 hover:text-white border border-slate-800'
              }`}
            >
              🚀 09:45 AM
            </button>
            <button
              onClick={() => setTimeFilter('10:00_PLUS')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                timeFilter === '10:00_PLUS'
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              10:00 AM+
            </button>
          </div>

          {/* Tier & Price Filter Group */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Score Tier Filter */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold uppercase text-slate-500">Tier:</span>
              <select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs rounded-xl px-2.5 py-1 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="ALL">All Tiers</option>
                <option value="VERY_STRONG">7–8: Very Strong</option>
                <option value="MODERATE">5–6: Moderate</option>
                <option value="WEAK_WAIT">3–4: Weak / Wait</option>
              </select>
            </div>

            {/* Price Filter */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold uppercase text-slate-500">Price:</span>
              <select
                value={priceFilter}
                onChange={(e) => setPriceFilter(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs rounded-xl px-2.5 py-1 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="ALL">All Prices</option>
                <option value="UNDER_1000">&lt; ₹1,000</option>
                <option value="1000_TO_2500">₹1,000 - ₹2,500</option>
                <option value="ABOVE_2500">&gt; ₹2,500</option>
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1 text-slate-400">
              <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] font-bold uppercase text-slate-500 hidden sm:inline">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 text-amber-300 font-mono text-xs rounded-xl px-2.5 py-1 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="SCORE_DESC">Confluence Score (Highest First)</option>
                <option value="TIME_ASC">Hit Time (Earliest 09:15 AM ⬆)</option>
                <option value="TIME_DESC">Hit Time (Latest ⬇)</option>
                <option value="LOT_DESC">Lot Size (Largest First)</option>
                <option value="PCT_DESC">% Gain (Highest First)</option>
                <option value="PRICE_DESC">Stock Price (Highest First)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Results Count Banner */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <div className="flex items-center gap-2">
          <span>Showing <strong className="text-white">{filteredStocks.length}</strong> matching stocks</span>
          {filteredStocks.length > 0 && (
            <span className="text-emerald-400">
              &bull; Top Score: {Math.max(...filteredStocks.map(s => s.dominantSide === 'BULLISH' ? s.bullishScore : s.bearishScore))}/8
            </span>
          )}
        </div>
      </div>

      {/* VIEW MODE: CARDS GRID */}
      {viewMode === 'CARDS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredStocks.map(analysis => {
            const isBull = analysis.dominantSide === 'BULLISH';
            const activeScore = isBull ? analysis.bullishScore : analysis.bearishScore;
            const activeConditions = isBull ? analysis.bullishConditions : analysis.bearishConditions;
            const isTimelineExpanded = expandedTimelines.has(analysis.stock.id);
            const isStackExpanded = expandedEmaStacks.has(analysis.stock.id);
            const isCopied = copiedId === analysis.stock.id;

            return (
              <div
                key={analysis.symbol}
                onClick={() => onSelectStockDetail(analysis.stock)}
                className={`group bg-slate-900 rounded-3xl border transition-all cursor-pointer overflow-hidden flex flex-col shadow-md hover:shadow-2xl ${
                  isBull 
                    ? 'border-emerald-500/30 hover:border-emerald-500/70 hover:shadow-[0_8px_30px_rgba(16,185,129,0.15)]' 
                    : 'border-rose-500/30 hover:border-rose-500/70 hover:shadow-[0_8px_30px_rgba(244,63,94,0.15)]'
                }`}
              >
                {/* 1. Card Top Strip: First Confluence Hit Time & Signal Badge */}
                <div className={`px-4 py-2.5 border-b flex items-center justify-between gap-2 ${
                  isBull 
                    ? 'bg-gradient-to-r from-amber-950/40 via-slate-950 to-emerald-950/50 border-emerald-900/40' 
                    : 'bg-gradient-to-r from-amber-950/40 via-slate-950 to-rose-950/50 border-rose-900/40'
                }`}>
                  <div className="flex items-center gap-1.5">
                    <div className="p-1 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10.5px] text-slate-400 font-semibold">Hit Time:</span>
                      <span className="text-xs font-black font-mono text-amber-300 tracking-wide">
                        {analysis.hitTime}
                      </span>
                      {analysis.isFresh && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      )}
                      {analysis.phaseBadge && (
                        <span className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded-full border ${analysis.phaseBadgeClass || 'bg-amber-500/20 text-amber-300 border-amber-500/30'}`}>
                          {analysis.phaseBadge}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Tier Pill */}
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${
                    activeScore >= 7
                      ? isBull ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' : 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                      : activeScore >= 5
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {isBull ? (activeScore >= 7 ? '🟢 7–8 Very Strong' : activeScore >= 5 ? '🟢 5–6 Bullish' : '🟡 3–4 Wait') : (activeScore >= 7 ? '🔴 7–8 Very Strong' : activeScore >= 5 ? '🔴 5–6 Bearish' : '🟡 3–4 Wait')}
                  </span>
                </div>

                {/* 2. Stock Header & LTP */}
                <div className="px-4 py-3 border-b border-slate-800/80 bg-slate-950/40 flex items-center justify-between">
                  <div>
                    <h3 className="font-black text-lg text-white font-mono flex items-center gap-1.5">
                      <span>{analysis.symbol}</span>
                      {isBull ? (
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-rose-400" />
                      )}
                    </h3>
                    <span className="text-xs text-slate-400 truncate max-w-[180px] block">
                      {analysis.companyName}
                    </span>
                  </div>

                  <div className={`px-3 py-1 rounded-xl text-xs font-black font-mono flex flex-col items-end border ${
                    analysis.pctChange >= 0
                      ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-950/60 text-rose-400 border-rose-500/30'
                  }`}>
                    <span className="text-white text-sm">₹{analysis.price.toFixed(2)}</span>
                    <span>{analysis.pctChange > 0 ? '+' : ''}{analysis.pctChange.toFixed(2)}%</span>
                  </div>
                </div>

                {/* 3. F&O Lot Size & Contract Specs Strip (Highlighted per user request) */}
                <div className="px-4 py-2.5 bg-gradient-to-r from-slate-950 via-cyan-950/20 to-slate-950 border-b border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                      <Layers className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">F&amp;O Lot Size</span>
                      <span className="font-mono font-black text-cyan-300 text-xs">
                        {analysis.lotSize.toLocaleString('en-IN')} Qty
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Lot Contract Value</span>
                    <span className="font-mono font-bold text-slate-200 text-xs">
                      ₹{analysis.contractValue.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="text-right pl-2 border-l border-slate-800">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Option Capital</span>
                    <span className="font-mono font-bold text-emerald-400 text-xs">
                      ~₹{analysis.estOptionCapital.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* 4. Trigger & Hit Reason Pill */}
                <div className="px-4 py-1.5 bg-slate-950/90 border-b border-slate-800/80 flex items-center justify-between text-[11px] gap-2">
                  <div className="flex items-center gap-1.5 min-w-0 text-slate-300 truncate">
                    <Zap className="w-3 h-3 text-amber-400 shrink-0" />
                    <span className="text-slate-400">Trigger:</span>
                    <span className="font-medium text-slate-200 truncate">{analysis.hitTrigger}</span>
                  </div>
                  <span className="font-mono text-[10.5px] font-bold text-emerald-400 shrink-0 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/60">
                    @ ₹{analysis.hitPrice.toFixed(2)}
                  </span>
                </div>

                {/* 5. Confluence Score Meter (0 to 8) */}
                <div className="px-4 pt-3 pb-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span>{isBull ? '🟢 Bullish Confluence Score' : '🔴 Bearish Confluence Score'}</span>
                      <span className="text-[10.5px] text-slate-500 font-normal">
                        ({Math.round((activeScore / 8) * 100)}% Agreement)
                      </span>
                    </span>
                    <span className={`text-sm font-black font-mono ${isBull ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {activeScore} / 8
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        activeScore >= 7
                          ? isBull ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-rose-500 to-red-400'
                          : activeScore >= 5
                          ? isBull ? 'bg-emerald-500' : 'bg-rose-500'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${(activeScore / 8) * 100}%` }}
                    />
                  </div>
                </div>

                {/* 6. EMA Cascade Visual Summary Strip */}
                <div className="px-4 py-2 mt-1">
                  <div className="bg-slate-950/80 rounded-xl p-2.5 border border-slate-800/90">
                    <div className="flex items-center justify-between mb-1.5 text-[10.5px] text-slate-400 font-semibold">
                      <span>EMA Cascade Trajectory:</span>
                      <span className={analysis.emaSlopesPositive ? 'text-emerald-400 font-bold' : analysis.emaSlopesNegative ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                        {isBull ? 'Price ↑ → 9 ↑ → 20 ↑ → 50 ↑ → 200' : 'Price ↓ → 9 ↓ → 20 ↓ → 50 ↓ → 200'}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-1 text-center font-mono text-[10.5px]">
                      <div className="bg-slate-900 rounded p-1 border border-slate-800">
                        <span className="text-[9px] text-slate-500 block">9 EMA</span>
                        <span className={analysis.price > analysis.ema9 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                          ₹{analysis.ema9.toFixed(1)}
                        </span>
                      </div>
                      <div className="bg-slate-900 rounded p-1 border border-slate-800">
                        <span className="text-[9px] text-slate-500 block">20 EMA</span>
                        <span className={analysis.price > analysis.ema20 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                          ₹{analysis.ema20.toFixed(1)}
                        </span>
                      </div>
                      <div className="bg-slate-900 rounded p-1 border border-slate-800">
                        <span className="text-[9px] text-slate-500 block">50 EMA</span>
                        <span className={analysis.price > analysis.ema50 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                          ₹{analysis.ema50.toFixed(1)}
                        </span>
                      </div>
                      <div className="bg-slate-900 rounded p-1 border border-slate-800">
                        <span className="text-[9px] text-slate-500 block">200 EMA</span>
                        <span className={analysis.price > analysis.ema200 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                          ₹{analysis.ema200.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 7. Checklist of 8 Mandatory Conditions */}
                <div className="px-4 py-2 flex-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2.5 gap-y-1.5 text-xs">
                    {activeConditions.map(cond => (
                      <div
                        key={cond.id}
                        className={`flex items-center justify-between p-1.5 rounded-lg border text-[11px] ${
                          cond.met 
                            ? isBull ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-200' : 'bg-rose-500/5 border-rose-500/20 text-slate-200'
                            : 'bg-slate-950/40 border-slate-800/60 text-slate-500'
                        }`}
                        title={cond.description}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          {cond.met ? (
                            <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isBull ? 'text-emerald-400' : 'text-rose-400'}`} />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                          )}
                          <span className={`truncate font-medium ${cond.met ? 'text-slate-200' : 'text-slate-500'}`}>
                            {cond.name}
                          </span>
                        </div>
                        <span className={`text-[10px] font-mono shrink-0 ml-1 font-bold ${
                          cond.met 
                            ? isBull ? 'text-emerald-400' : 'text-rose-400'
                            : 'text-slate-600'
                        }`}>
                          {cond.met ? '+1' : '0'}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Pullback Extra Detail Pill */}
                  {analysis.pullbackDetail !== 'No active pullback retest' && (
                    <div className="mt-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[10.5px] text-amber-200 flex items-start gap-1.5">
                      <Zap className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                      <span>{analysis.pullbackDetail}</span>
                    </div>
                  )}

                  {/* Intraday Milestones Timeline Dropdown */}
                  {analysis.milestones.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-800/60">
                      <button
                        onClick={(e) => toggleTimeline(e, analysis.stock.id)}
                        className="w-full text-[10.5px] font-bold text-slate-400 hover:text-amber-300 flex items-center justify-between py-1 transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-400" />
                          <span>Intraday Hit Progression ({analysis.milestones.length} Events)</span>
                        </span>
                        {isTimelineExpanded ? (
                          <ChevronUp className="w-3 h-3 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-3 h-3 text-slate-400" />
                        )}
                      </button>

                      {isTimelineExpanded && (
                        <div className="mt-2 space-y-1.5 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                          {analysis.milestones.map((ms, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-xs">
                              <span className={`font-mono text-[9.5px] px-1.5 py-0.2 rounded font-black shrink-0 ${
                                ms.isFirst 
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                                  : 'bg-slate-800 text-slate-300'
                              }`}>
                                {ms.time}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <span className={`text-[10.5px] font-semibold truncate ${ms.isFirst ? 'text-amber-200 font-bold' : 'text-slate-300'}`}>
                                    {ms.event}
                                  </span>
                                  <span className="font-mono text-[10px] text-emerald-400 shrink-0">
                                    ₹{ms.price.toFixed(2)}
                                  </span>
                                </div>
                                <p className="text-[9.5px] text-slate-400 leading-tight mt-0.5">{ms.detail}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 8. Card Footer Action Bar */}
                <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectStockDetail(analysis.stock);
                      }}
                      className="text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                      title="Open Technical Stock Modal"
                    >
                      <span>Analysis</span>
                      <ExternalLink className="w-3 h-3 text-emerald-400" />
                    </button>

                    <button
                      onClick={(e) => copyTradeSetup(e, analysis)}
                      className="text-[11px] font-bold text-slate-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
                      title="Copy setup to clipboard"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {onOpenPositionSizer && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenPositionSizer(analysis.stock);
                        }}
                        className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/60 flex items-center gap-1 cursor-pointer transition-colors"
                        title="Calculate Exact Lot Size & Margin"
                      >
                        <Calculator className="w-3 h-3" />
                        <span>Sizer ({analysis.lotSize})</span>
                      </button>
                    )}

                    {onOpenRsiAnalyst && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenRsiAnalyst(analysis.stock);
                        }}
                        className="text-[11px] font-bold text-blue-400 hover:text-blue-300 px-2 py-1 rounded-lg bg-blue-950/60 hover:bg-blue-900/60 border border-blue-800/60 flex items-center gap-1 cursor-pointer transition-colors"
                        title="Inspect 15m RSI Intraday Trajectory"
                      >
                        <Activity className="w-3 h-3" />
                        <span>RSI</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW MODE: COMPACT TECHNICAL TABLE */}
      {viewMode === 'TABLE' && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/90 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">Symbol &amp; Company</th>
                  <th className="py-3 px-3">LTP &amp; Change</th>
                  <th className="py-3 px-3">F&amp;O Lot Size &amp; Value</th>
                  <th className="py-3 px-3">Recent Hit Time</th>
                  <th className="py-3 px-3">EMA Confluence Score</th>
                  <th className="py-3 px-3">9 / 20 / 50 / 200 EMAs</th>
                  <th className="py-3 px-3">Slopes &amp; Trajectory</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 font-mono">
                {filteredStocks.map(analysis => {
                  const isBull = analysis.dominantSide === 'BULLISH';
                  const activeScore = isBull ? analysis.bullishScore : analysis.bearishScore;

                  return (
                    <tr 
                      key={analysis.symbol}
                      onClick={() => onSelectStockDetail(analysis.stock)}
                      className="hover:bg-slate-800/50 transition-colors cursor-pointer"
                    >
                      {/* Symbol */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-white text-sm flex items-center gap-1.5">
                          <span>{analysis.symbol}</span>
                          {isBull ? (
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                          {analysis.companyName}
                        </div>
                      </td>

                      {/* LTP */}
                      <td className="py-3 px-3">
                        <div className="text-white font-bold text-xs">₹{analysis.price.toFixed(2)}</div>
                        <div className={`text-[10px] font-bold ${analysis.pctChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {analysis.pctChange > 0 ? '+' : ''}{analysis.pctChange.toFixed(2)}%
                        </div>
                      </td>

                      {/* Lot Size & Value */}
                      <td className="py-3 px-3">
                        <div className="font-black text-cyan-300 text-xs">
                          {analysis.lotSize.toLocaleString()} Qty
                        </div>
                        <div className="text-[10px] text-slate-400">
                          ₹{analysis.contractValue.toLocaleString('en-IN')}
                        </div>
                      </td>

                      {/* Recent Hit Time */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-amber-400" />
                          <span className="font-black text-amber-300 text-xs">{analysis.hitTime}</span>
                          {analysis.isFresh && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          )}
                        </div>
                        <div className="text-[9.5px] text-slate-400 truncate max-w-[150px]">
                          {analysis.hitTrigger}
                        </div>
                        {analysis.phaseBadge && (
                          <div className="mt-0.5">
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border inline-block ${analysis.phaseBadgeClass || 'bg-amber-500/20 text-amber-300 border-amber-500/30'}`}>
                              {analysis.phaseBadge}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Confluence Score */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded font-black text-xs ${
                            activeScore >= 7 
                              ? isBull ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : activeScore >= 5
                              ? 'bg-blue-500/20 text-blue-300'
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {activeScore} / 8
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            {isBull ? 'Bullish' : 'Bearish'}
                          </span>
                        </div>
                      </td>

                      {/* EMAs */}
                      <td className="py-3 px-3 text-[11px]">
                        <div className="text-slate-300">
                          9: ₹{analysis.ema9.toFixed(1)} &bull; 20: ₹{analysis.ema20.toFixed(1)}
                        </div>
                        <div className="text-slate-400 text-[10px]">
                          50: ₹{analysis.ema50.toFixed(1)} &bull; 200: ₹{analysis.ema200.toFixed(1)}
                        </div>
                      </td>

                      {/* Slopes */}
                      <td className="py-3 px-3 text-[11px]">
                        <div className={analysis.emaSlopesPositive ? 'text-emerald-400 font-bold' : analysis.emaSlopesNegative ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                          {analysis.emaSlopesPositive ? '↗ Slopes Up (+)' : analysis.emaSlopesNegative ? '↘ Slopes Down (-)' : '→ Flat'}
                        </div>
                        <div className="text-[9.5px] text-slate-400 truncate max-w-[130px]">
                          {analysis.structureSummary}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {onOpenPositionSizer && (
                            <button
                              onClick={() => onOpenPositionSizer(analysis.stock)}
                              className="px-2 py-1 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 rounded text-emerald-300 text-[10px] font-bold transition-colors cursor-pointer"
                              title="Calculate Position & Lot Margin"
                            >
                              Sizer
                            </button>
                          )}
                          <button
                            onClick={() => onSelectStockDetail(analysis.stock)}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-200 text-[10px] font-bold transition-colors cursor-pointer"
                          >
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredStocks.length === 0 && (
        <div className="bg-slate-900/60 rounded-3xl border border-slate-800 p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Filter className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white font-mono">No Stocks Match Filter</h3>
          <p className="text-slate-400 text-xs max-w-md mx-auto mt-1">
            {searchTerm 
              ? `No stock matching "${searchTerm}" fulfills the selected EMA confluence criteria.`
              : 'Try selecting "All Tiers" or adjusting the time window to view more active setups.'}
          </p>
        </div>
      )}
    </div>
  );
}
