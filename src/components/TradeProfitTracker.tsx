import React, { useState, useMemo } from 'react';
import { StockTradeJourney, StockCalculated, TradeTrajectoryVerdict } from '../types';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  ShieldCheck, 
  Sparkles, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  Maximize2, 
  Minimize2, 
  RotateCcw, 
  ExternalLink, 
  Zap, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  Flame, 
  Percent, 
  Calculator,
  Compass,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  SlidersHorizontal,
  Search
} from 'lucide-react';

interface TradeProfitTrackerProps {
  tradeJourneys: Record<string, StockTradeJourney>;
  stocks: StockCalculated[];
  onSelectStockDetail?: (stock: StockCalculated) => void;
  onOpenPositionSizer?: (stock: StockCalculated) => void;
  onOpenRsiAnalyst?: (stock: StockCalculated) => void;
  onClearJourneys?: () => void;
}

export const TradeProfitTracker: React.FC<TradeProfitTrackerProps> = ({
  tradeJourneys,
  stocks,
  onSelectStockDetail,
  onOpenPositionSizer,
  onOpenRsiAnalyst,
  onClearJourneys
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'IN_PROFIT' | 'TARGET_HIT' | 'PULLBACK' | 'EXIT_ALERT'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedCardIds, setExpandedCardIds] = useState<Set<string>>(new Set());

  // Stock lookup map
  const stockMap = useMemo(() => {
    const map = new Map<string, StockCalculated>();
    stocks.forEach((s) => map.set(s.id, s));
    return map;
  }, [stocks]);

  const journeyList = useMemo(() => {
    return Object.values(tradeJourneys);
  }, [tradeJourneys]);

  // Filter & Search Logic
  const filteredJourneys = useMemo(() => {
    return journeyList.filter((j) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSymbol = j.symbol.toLowerCase().includes(q);
        const matchesName = j.companyName.toLowerCase().includes(q);
        if (!matchesSymbol && !matchesName) return false;
      }

      // Filter tabs
      if (activeFilter === 'IN_PROFIT') {
        return j.currentPnLPercent > 0.1;
      }
      if (activeFilter === 'TARGET_HIT') {
        return j.verdict === 'TARGET_1_HIT' || j.verdict === 'TARGET_2_HIT';
      }
      if (activeFilter === 'PULLBACK') {
        return j.verdict === 'HEALTHY_PULLBACK';
      }
      if (activeFilter === 'EXIT_ALERT') {
        return j.verdict === 'EXIT_INVALIDATED' || j.verdict === 'MOMENTUM_COOLING';
      }

      return true;
    }).sort((a, b) => {
      // Sort by highest profit % first, then confidence score
      if (b.currentPnLPercent !== a.currentPnLPercent) {
        return b.currentPnLPercent - a.currentPnLPercent;
      }
      return b.confidenceScore - a.confidenceScore;
    });
  }, [journeyList, activeFilter, searchQuery]);

  // Counts
  const counts = useMemo(() => {
    let inProfit = 0;
    let targetHit = 0;
    let pullback = 0;
    let exitAlert = 0;

    journeyList.forEach((j) => {
      if (j.currentPnLPercent > 0.1) inProfit++;
      if (j.verdict === 'TARGET_1_HIT' || j.verdict === 'TARGET_2_HIT') targetHit++;
      if (j.verdict === 'HEALTHY_PULLBACK') pullback++;
      if (j.verdict === 'EXIT_INVALIDATED' || j.verdict === 'MOMENTUM_COOLING') exitAlert++;
    });

    return { total: journeyList.length, inProfit, targetHit, pullback, exitAlert };
  }, [journeyList]);

  const toggleCard = (id: string) => {
    setExpandedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleExpandAll = () => {
    if (expandedCardIds.size === filteredJourneys.length) {
      setExpandedCardIds(new Set());
    } else {
      setExpandedCardIds(new Set(filteredJourneys.map((j) => j.stockId)));
    }
  };

  if (journeyList.length === 0) {
    return null;
  }

  return (
    <div id="trade-confidence-tracker" className="bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl text-slate-100 my-6 transition-all">
      
      {/* 1. MASTER HEADER & EXPAND/COLLAPSE */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${isExpanded ? 'pb-5 border-b border-slate-800' : ''}`}>
        <div className="flex items-start sm:items-center gap-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/30 transition-all shrink-0 cursor-pointer shadow-inner"
            title={isExpanded ? "Contract Section" : "Expand Section"}
          >
            {isExpanded ? <Minimize2 className="w-5 h-5 text-indigo-300" /> : <Maximize2 className="w-5 h-5 text-indigo-300 animate-pulse" />}
          </button>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                Live Trade Profit &amp; Timing Journey Tracker
              </span>
              <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-emerald-950/90 text-emerald-300 border border-emerald-700/80 shadow-2xs">
                {counts.inProfit} In Profit 🚀
              </span>
              {counts.targetHit > 0 && (
                <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-amber-950/90 text-amber-300 border border-amber-600/80 shadow-2xs flex items-center gap-1">
                  <Target className="w-3 h-3 text-amber-400" />
                  {counts.targetHit} Targets Reached 🎯
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight mt-1 flex items-center gap-2">
              <span>Track Timings, Trade Confidence &amp; Profit Trajectory</span>
              <span className="text-xs font-medium text-slate-400 font-sans">
                (Tracks every fetch timestamp from entry to targets)
              </span>
            </h2>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
          {onClearJourneys && (
            <button
              onClick={onClearJourneys}
              className="text-xs font-bold text-slate-400 hover:text-rose-300 bg-slate-800/80 hover:bg-rose-950/60 px-3 py-1.5 rounded-xl border border-slate-700 hover:border-rose-700/60 flex items-center gap-1.5 transition-all"
              title="Reset session fetch history"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset History</span>
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs font-extrabold text-indigo-300 hover:text-white bg-indigo-950/80 hover:bg-indigo-900 px-3.5 py-1.5 rounded-xl border border-indigo-700/60 flex items-center gap-1.5 transition-all shadow-sm"
          >
            <span>{isExpanded ? 'Collapse Hub' : 'Expand Hub'}</span>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="pt-5 space-y-5 animate-fade-in">
          
          {/* 2. FILTER TABS & SEARCH BAR */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 bg-slate-950/80 rounded-2xl border border-slate-800/80">
            {/* Filter Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setActiveFilter('ALL')}
                className={`text-xs font-extrabold px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${
                  activeFilter === 'ALL'
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-md ring-2 ring-indigo-400/40'
                    : 'bg-slate-900 text-slate-300 hover:text-white border-slate-800 hover:bg-slate-800'
                }`}
              >
                <span>All Active Tracks</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-900/80 text-indigo-200">{counts.total}</span>
              </button>

              <button
                onClick={() => setActiveFilter('IN_PROFIT')}
                className={`text-xs font-extrabold px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${
                  activeFilter === 'IN_PROFIT'
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-md ring-2 ring-emerald-400/40'
                    : 'bg-slate-900 text-emerald-400 hover:text-emerald-300 border-slate-800 hover:bg-slate-800'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>In Profit (Green)</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300">{counts.inProfit}</span>
              </button>

              <button
                onClick={() => setActiveFilter('TARGET_HIT')}
                className={`text-xs font-extrabold px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${
                  activeFilter === 'TARGET_HIT'
                    ? 'bg-amber-600 text-white border-amber-400 shadow-md ring-2 ring-amber-400/40'
                    : 'bg-slate-900 text-amber-400 hover:text-amber-300 border-slate-800 hover:bg-slate-800'
                }`}
              >
                <Target className="w-3.5 h-3.5" />
                <span>Targets Reached</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-950 text-amber-300">{counts.targetHit}</span>
              </button>

              <button
                onClick={() => setActiveFilter('PULLBACK')}
                className={`text-xs font-extrabold px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${
                  activeFilter === 'PULLBACK'
                    ? 'bg-sky-600 text-white border-sky-400 shadow-md ring-2 ring-sky-400/40'
                    : 'bg-slate-900 text-sky-400 hover:text-sky-300 border-slate-800 hover:bg-slate-800'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Healthy Pullback</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-950 text-sky-300">{counts.pullback}</span>
              </button>

              <button
                onClick={() => setActiveFilter('EXIT_ALERT')}
                className={`text-xs font-extrabold px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${
                  activeFilter === 'EXIT_ALERT'
                    ? 'bg-rose-700 text-white border-rose-400 shadow-md ring-2 ring-rose-400/40'
                    : 'bg-slate-900 text-rose-400 hover:text-rose-300 border-slate-800 hover:bg-slate-800'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Cooling / Exit</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-950 text-rose-300">{counts.exitAlert}</span>
              </button>
            </div>

            {/* Search & Expand All */}
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter stock..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 focus:border-indigo-500 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none"
                />
              </div>

              <button
                onClick={toggleExpandAll}
                className="text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-xl border border-slate-700 whitespace-nowrap transition-all"
              >
                {expandedCardIds.size === filteredJourneys.length ? 'Collapse Details' : 'Expand Details'}
              </button>
            </div>
          </div>

          {/* 3. STOCK JOURNEY CARDS LIST */}
          <div className="space-y-4">
            {filteredJourneys.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/60 border border-slate-800/80 rounded-2xl text-slate-400">
                No stocks match the selected filter tab.
              </div>
            ) : (
              filteredJourneys.map((journey) => {
                const stockObj = stockMap.get(journey.stockId);
                const isCardOpen = expandedCardIds.has(journey.stockId);
                const isGreen = journey.currentPnLPercent >= 0;

                return (
                  <div
                    key={journey.stockId}
                    className={`bg-slate-950/90 border rounded-2xl transition-all shadow-lg overflow-hidden ${
                      journey.verdict === 'TARGET_2_HIT'
                        ? 'border-purple-600/80 ring-1 ring-purple-500/40 bg-gradient-to-r from-slate-950 via-purple-950/20 to-slate-950'
                        : journey.verdict === 'TARGET_1_HIT'
                        ? 'border-emerald-500/80 ring-1 ring-emerald-400/30'
                        : journey.verdict === 'EXIT_INVALIDATED'
                        ? 'border-rose-600/70 bg-rose-950/10'
                        : isGreen
                        ? 'border-emerald-800/60 hover:border-emerald-600/80'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Top Row: Symbol, Trigger vs Current, PnL, Confidence, Expand */}
                    <div className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-900/60 border-b border-slate-800/60">
                      
                      {/* Symbol & Inception Time */}
                      <div className="flex items-start sm:items-center gap-3">
                        <div className={`p-2.5 rounded-xl border flex flex-col items-center justify-center shrink-0 ${
                          isGreen ? 'bg-emerald-950/90 border-emerald-600/60 text-emerald-400' : 'bg-rose-950/90 border-rose-600/60 text-rose-400'
                        }`}>
                          {journey.signalType === 'BULLISH' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                          <span className="text-[9px] font-black uppercase mt-0.5">{journey.signalType}</span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-base sm:text-lg font-black text-white font-mono">{journey.symbol}</span>
                            <span className="text-xs text-slate-400 truncate max-w-[160px] font-medium">{journey.companyName}</span>
                            
                            {/* Inception Trigger Badge */}
                            <span className="text-[10px] font-bold text-indigo-300 bg-indigo-950/90 border border-indigo-700/60 px-2 py-0.5 rounded-lg flex items-center gap-1 font-mono">
                              <Clock className="w-3 h-3 text-indigo-400" />
                              Triggered @ {journey.inceptionTime} (₹{journey.inceptionPrice.toFixed(2)})
                            </span>
                          </div>

                          {/* Key levels */}
                          <div className="text-xs text-slate-400 flex items-center gap-3 mt-1 font-mono flex-wrap">
                            <span>CMP: <strong className="text-white">₹{journey.latestPrice.toFixed(2)}</strong></span>
                            <span>Target 1: <strong className="text-emerald-400">₹{journey.target1.toFixed(2)}</strong></span>
                            <span>Target 2: <strong className="text-emerald-300">₹{journey.target2.toFixed(2)}</strong></span>
                            <span>Stop Loss: <strong className="text-rose-400">₹{journey.stopLoss.toFixed(2)}</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Profit Badge, Confidence Score, Verdict, Expand */}
                      <div className="flex items-center gap-3 self-end lg:self-auto flex-wrap">
                        
                        {/* PnL Badge */}
                        <div className={`px-3 py-1.5 rounded-xl border text-right font-mono ${
                          isGreen 
                            ? 'bg-emerald-950/90 border-emerald-500/80 text-emerald-300 shadow-sm' 
                            : 'bg-rose-950/90 border-rose-500/80 text-rose-300 shadow-sm'
                        }`}>
                          <div className="text-xs font-black flex items-center justify-end gap-1">
                            {isGreen ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                            <span>{isGreen ? '+' : ''}{journey.currentPnLPercent.toFixed(2)}%</span>
                            <span className="text-[10px] opacity-80">({isGreen ? '+' : ''}₹{journey.currentPnLAmount.toFixed(2)})</span>
                          </div>
                          <div className="text-[9.5px] text-slate-400 font-sans">
                            Peak: +{journey.peakPnLPercent.toFixed(2)}%
                          </div>
                        </div>

                        {/* Confidence Meter */}
                        <div className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-center min-w-[90px]">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Confidence</div>
                          <div className={`text-xs font-black ${
                            journey.confidenceScore >= 75 ? 'text-emerald-400' : journey.confidenceScore >= 50 ? 'text-amber-400' : 'text-rose-400'
                          }`}>
                            {journey.confidenceScore}% High
                          </div>
                        </div>

                        {/* Trajectory Verdict Badge */}
                        <div className={`px-2.5 py-1 rounded-xl border text-xs font-black ${journey.verdictBadgeClass}`}>
                          {journey.verdictTitle}
                        </div>

                        {/* Expand Button */}
                        <button
                          onClick={() => toggleCard(journey.stockId)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          title="Toggle Timings &amp; Fetch History"
                        >
                          {isCardOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Middle Actionable Directive (Always Visible) */}
                    <div className="px-4 py-2.5 bg-slate-950/80 flex items-start sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                        <p className="font-semibold text-slate-200">
                          <strong className="text-indigo-300">Actionable Rule:</strong> {journey.actionableGuidance}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {stockObj && onOpenPositionSizer && (
                          <button
                            onClick={() => onOpenPositionSizer(stockObj)}
                            className="text-[11px] font-bold text-indigo-300 hover:text-white bg-indigo-950/60 hover:bg-indigo-900 px-2 py-1 rounded-lg border border-indigo-700/60 flex items-center gap-1 transition-all"
                            title="Calculate lot & risk size"
                          >
                            <Calculator className="w-3 h-3" />
                            <span>Size</span>
                          </button>
                        )}
                        {stockObj && onSelectStockDetail && (
                          <button
                            onClick={() => onSelectStockDetail(stockObj)}
                            className="text-[11px] font-bold text-emerald-300 hover:text-white bg-emerald-950/60 hover:bg-emerald-900 px-2 py-1 rounded-lg border border-emerald-700/60 flex items-center gap-1 transition-all"
                            title="View Stock Detail"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Details</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expanded Detail Panel: Visual Profit Roadmap & Fetch-by-Fetch Timeline */}
                    {isCardOpen && (
                      <div className="p-4 bg-slate-900/40 border-t border-slate-800 space-y-4 animate-fade-in">
                        
                        {/* 1. Visual Target Roadmap Bar */}
                        <div className="p-3.5 bg-slate-950/90 rounded-xl border border-slate-800 space-y-2">
                          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <Target className="w-3.5 h-3.5 text-indigo-400" />
                              Profit Roadmap &amp; Execution Levels
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {journey.keySupportResistance}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-xs">
                            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-center">
                              <span className="text-[10px] text-slate-400 block font-sans">1. Inception / Entry</span>
                              <strong className="text-white text-sm">₹{journey.inceptionPrice.toFixed(2)}</strong>
                              <span className="text-[9.5px] text-indigo-400 block mt-0.5">@{journey.inceptionTime}</span>
                            </div>

                            <div className={`p-2 rounded-lg border text-center ${
                              journey.latestPrice >= journey.target1 ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-300'
                            }`}>
                              <span className="text-[10px] text-slate-400 block font-sans">2. Target 1 (+1.5%)</span>
                              <strong className="text-emerald-400 text-sm">₹{journey.target1.toFixed(2)}</strong>
                              <span className="text-[9.5px] block mt-0.5 font-sans font-bold">
                                {journey.latestPrice >= journey.target1 ? '✅ Hit / Lock 40%' : '🎯 In Sight'}
                              </span>
                            </div>

                            <div className={`p-2 rounded-lg border text-center ${
                              journey.latestPrice >= journey.target2 ? 'bg-purple-950/80 border-purple-600 text-yellow-300 font-bold' : 'bg-slate-900 border-slate-800 text-slate-300'
                            }`}>
                              <span className="text-[10px] text-slate-400 block font-sans">3. Target 2 (+3.0%)</span>
                              <strong className="text-purple-300 text-sm">₹{journey.target2.toFixed(2)}</strong>
                              <span className="text-[9.5px] block mt-0.5 font-sans font-bold">
                                {journey.latestPrice >= journey.target2 ? '🏆 Super Target Hit' : '🚀 Next Target'}
                              </span>
                            </div>

                            <div className="p-2 rounded-lg bg-rose-950/40 border border-rose-800/60 text-center">
                              <span className="text-[10px] text-rose-300 block font-sans">4. Hard Stop Loss</span>
                              <strong className="text-rose-400 text-sm">₹{journey.stopLoss.toFixed(2)}</strong>
                              <span className="text-[9.5px] text-slate-400 block mt-0.5 font-sans">
                                {journey.latestPrice < journey.stopLoss ? '🔴 Breached' : '🛡️ Protected'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 2. Chronological Fetch Timings History */}
                        <div className="space-y-2">
                          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-emerald-400" />
                              Fetch-by-Fetch Timing Audit Trail ({journey.fetchSnapshots.length} Fetches Tracked)
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Every fetch logs price, RSI &amp; PnL change
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-2 pt-1">
                            {journey.fetchSnapshots.map((snap, idx) => {
                              const isSnapGreen = snap.pnlFromTriggerPct >= 0;
                              const isLatest = idx === journey.fetchSnapshots.length - 1;

                              return (
                                <div
                                  key={`${snap.timeStr}-${idx}`}
                                  className={`p-2 rounded-xl border text-xs font-mono transition-all flex flex-col justify-between ${
                                    isLatest
                                      ? 'bg-indigo-950/90 border-indigo-400 ring-2 ring-indigo-400/50 shadow-md'
                                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-[10px] font-bold text-slate-400">{snap.timeStr}</span>
                                    {isLatest && <span className="text-[9px] bg-indigo-600 text-white px-1 rounded font-sans font-bold">LATEST</span>}
                                  </div>

                                  <div className="text-sm font-black text-white mt-1">
                                    ₹{snap.price.toFixed(2)}
                                  </div>

                                  <div className="flex items-center justify-between gap-2 mt-1 text-[10px]">
                                    <span className={`font-bold ${isSnapGreen ? 'text-emerald-400' : 'text-rose-400'}`}>
                                      {isSnapGreen ? '+' : ''}{snap.pnlFromTriggerPct.toFixed(2)}%
                                    </span>
                                    {snap.rsi && (
                                      <span className="text-slate-400">
                                        RSI: {snap.rsi.toFixed(1)}
                                      </span>
                                    )}
                                  </div>

                                  <div className="mt-1 pt-1 border-t border-slate-800/80 text-[9px] text-slate-400 font-sans flex items-center justify-between">
                                    <span>{snap.trend}</span>
                                    {snap.target1Hit && <span className="text-emerald-400 font-bold">🎯 T1</span>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                      </div>
                    )}

                  </div>
                );
              })
            )}
          </div>

        </div>
      )}

    </div>
  );
};
