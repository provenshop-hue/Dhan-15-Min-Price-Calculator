import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  ShieldAlert, 
  ShieldCheck, 
  Calculator, 
  Copy, 
  Check, 
  Eye, 
  Activity, 
  ChevronDown, 
  ChevronUp, 
  Zap, 
  Clock, 
  Layers, 
  ArrowUpRight, 
  ArrowDownRight, 
  Flame, 
  CheckCircle2, 
  RefreshCw, 
  Sliders, 
  HelpCircle,
  BarChart2
} from 'lucide-react';
import { StockCalculated } from '../types';
import { analyzeTenFifteenPicks, TenFifteenTradePick } from '../utils/tenFifteenPicks';

interface TenFifteenPicksHubProps {
  stocks: StockCalculated[];
  onSelectStockDetail?: (stock: StockCalculated) => void;
  onOpenPositionSizer?: (stock: StockCalculated) => void;
  onOpenRsiAnalyst?: (stock: StockCalculated) => void;
  onRefreshAllPrices?: () => void;
  isLoading?: boolean;
}

export const TenFifteenPicksHub: React.FC<TenFifteenPicksHubProps> = ({
  stocks,
  onSelectStockDetail,
  onOpenPositionSizer,
  onOpenRsiAnalyst,
  onRefreshAllPrices,
  isLoading
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [filterMode, setFilterMode] = useState<'ALL' | 'BULLISH_ONLY' | 'BEARISH_ONLY'>('ALL');
  const [copiedTradeId, setCopiedTradeId] = useState<string | null>(null);
  const [isInfoOpen, setIsInfoOpen] = useState<boolean>(false);

  // Analyze 10:15 AM Picks
  const analysis = useMemo(() => {
    return analyzeTenFifteenPicks(stocks);
  }, [stocks]);

  const stockMap = useMemo(() => {
    const map = new Map<string, StockCalculated>();
    stocks.forEach((s) => map.set(s.id, s));
    return map;
  }, [stocks]);

  const handleCopySetup = (pick: TenFifteenTradePick) => {
    const planText = `⭐ 10:15 AM ${pick.direction} TRADE SETUP: ${pick.symbol}
CMP: ₹${pick.cmp.toFixed(2)} (${pick.pctChange >= 0 ? '+' : ''}${pick.pctChange.toFixed(2)}%)
Conviction Score: ${pick.convictionScore}%
--------------------------------------
Entry Zone: ${pick.tradeSetup.entryZone.label}
Stop Loss: ₹${pick.tradeSetup.stopLoss.toFixed(2)}
Target 1: ₹${pick.tradeSetup.target1.toFixed(2)}
Target 2: ₹${pick.tradeSetup.target2.toFixed(2)}
Target 3: ₹${pick.tradeSetup.target3.toFixed(2)}
Risk:Reward: ${pick.tradeSetup.riskRewardRatio}
--------------------------------------
Recommended Option: ${pick.tradeSetup.recommendedStrike}
Lot Size: ${pick.tradeSetup.lotSize}
Est. Target Profit: ₹${pick.tradeSetup.estProfitPerLot.toLocaleString('en-IN')}/lot
Calculations: Open Calc: ${pick.openCalc?.toFixed(4) || '-'} | Close Calc: ${pick.closeCalc?.toFixed(4) || '-'} | Total Calc: ${pick.totalCalc?.toFixed(4) || '-'}
Catalysts: ${pick.catalysts.join(' • ')}`;

    navigator.clipboard.writeText(planText);
    setCopiedTradeId(pick.stockId);
    setTimeout(() => setCopiedTradeId(null), 2500);
  };

  const getRankBadge = (rank: 1 | 2 | 3, direction: 'BULLISH' | 'BEARISH') => {
    if (direction === 'BULLISH') {
      if (rank === 1) {
        return (
          <span className="inline-flex items-center gap-1 bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-black text-[11px] px-2.5 py-0.5 rounded-lg shadow-sm">
            <Flame className="w-3.5 h-3.5 fill-current text-yellow-300 animate-pulse" />
            #1 Bullish Pick
          </span>
        );
      }
      if (rank === 2) {
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-[11px] px-2 py-0.5 rounded-lg">
            #2 Top Bullish
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[11px] px-2 py-0.5 rounded-lg">
          #3 Momentum Bull
        </span>
      );
    } else {
      if (rank === 1) {
        return (
          <span className="inline-flex items-center gap-1 bg-gradient-to-r from-rose-600 to-red-700 text-white font-black text-[11px] px-2.5 py-0.5 rounded-lg shadow-sm">
            <Flame className="w-3.5 h-3.5 fill-current text-yellow-300 animate-pulse" />
            #1 Bearish Pick
          </span>
        );
      }
      if (rank === 2) {
        return (
          <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-900 border border-rose-300 font-bold text-[11px] px-2 py-0.5 rounded-lg">
            #2 Top Short
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-800 border border-rose-200 font-bold text-[11px] px-2 py-0.5 rounded-lg">
          #3 Breakdown Short
        </span>
      );
    }
  };

  return (
    <section 
      id="ten-fifteen-picks-hub"
      className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden transition-all mb-6"
    >
      {/* Sleek Top Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white p-4 sm:p-5 relative">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Header Title & Clock Indicator */}
          <div className="flex items-start space-x-3.5">
            <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl shadow-md shrink-0 ring-2 ring-amber-400/30">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                  <span>10:15 AM DAILY POWER PICKS</span>
                </h2>
                <span className="bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                  3 Bullish &bull; 3 Bearish
                </span>
                <span className="bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  1st Hour Breakout Scan
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Calculated at 10:15 AM after the opening 1-hour discovery drive (09:15–10:15). Combines <strong>100% Bullish/Bearish move formulas</strong>, 15m breakouts, Open=Low/High, VWAP, and Gann calculations.
              </p>
            </div>
          </div>

          {/* Quick Metrics & Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Market Bias Badge */}
            <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs">
              <span className="text-slate-400 text-[11px] font-medium">10:15 AM Bias:</span>
              <span className={`font-black uppercase flex items-center gap-1 ${
                analysis.marketBias === 'BULLISH' 
                  ? 'text-emerald-400' 
                  : analysis.marketBias === 'BEARISH' 
                  ? 'text-rose-400' 
                  : 'text-amber-300'
              }`}>
                {analysis.marketBias === 'BULLISH' && <TrendingUp className="w-3.5 h-3.5" />}
                {analysis.marketBias === 'BEARISH' && <TrendingDown className="w-3.5 h-3.5" />}
                {analysis.marketBias}
              </span>
            </div>

            {/* Info modal trigger */}
            <button
              onClick={() => setIsInfoOpen(!isInfoOpen)}
              className="p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 text-xs transition-colors"
              title="Learn why 10:15 AM is the institutional trade window"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {/* Refresh Button */}
            {onRefreshAllPrices && (
              <button
                onClick={onRefreshAllPrices}
                disabled={isLoading}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-400/40 text-blue-200 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                title="Refresh 15m candle snapshot"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh Scan</span>
              </button>
            )}

            {/* Collapse Toggle */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl border border-slate-700 text-xs transition-colors"
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

        </div>

        {/* 10:15 AM Strategy Info Drawer */}
        {isInfoOpen && (
          <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-200 grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-700/60 animate-fade-in">
            <div>
              <div className="font-bold text-amber-300 flex items-center gap-1 mb-1">
                <Clock className="w-3.5 h-3.5" /> 1. The 10:15 AM Principle
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                By 10:15 AM IST (after four 15m candles), morning market opening noise and false wicks are resolved. Institutional volume trends establish the true day direction.
              </p>
            </div>
            <div>
              <div className="font-bold text-emerald-300 flex items-center gap-1 mb-1">
                <TrendingUp className="w-3.5 h-3.5" /> 2. 100% Bullish Formula
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Matches Close &gt; Open &bull; Close &gt; Prev Close &bull; Close &ge; High - (Range &times; 0.20) &bull; Body / Range &ge; 0.65 &bull; Open=Low &bull; Above VWAP.
              </p>
            </div>
            <div>
              <div className="font-bold text-rose-300 flex items-center gap-1 mb-1">
                <TrendingDown className="w-3.5 h-3.5" /> 3. 100% Bearish Formula
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Matches Close &lt; Open &bull; Close &lt; Prev Close &bull; Close &le; Low + (Range &times; 0.20) &bull; Body / Range &ge; 0.60 &bull; Open=High &bull; Below VWAP.
              </p>
            </div>
          </div>
        )}

        {/* Filter Tabs Strip */}
        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-700/80">
            <button
              onClick={() => setFilterMode('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                filterMode === 'ALL'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              All 6 Power Picks
            </button>
            <button
              onClick={() => setFilterMode('BULLISH_ONLY')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 ${
                filterMode === 'BULLISH_ONLY'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-300 hover:text-white hover:bg-emerald-900/40'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>3 Bullish Champions</span>
            </button>
            <button
              onClick={() => setFilterMode('BEARISH_ONLY')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 ${
                filterMode === 'BEARISH_ONLY'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-rose-300 hover:text-white hover:bg-rose-900/40'
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5" />
              <span>3 Bearish Breakdowns</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-300 flex items-center space-x-2">
            <span>Universe Scanned: <strong className="text-white">{analysis.scannedCount} Stocks</strong></span>
            <span>&bull;</span>
            <span>Timing: <strong className="text-amber-300">10:15 AM IST</strong></span>
          </div>
        </div>
      </div>

      {/* Main Content Area: Side-by-Side Dual Deck */}
      {isExpanded && (
        <div className="p-4 sm:p-6 bg-slate-50/60">
          <div className={`grid grid-cols-1 ${filterMode === 'ALL' ? 'lg:grid-cols-2' : 'grid-cols-1 max-w-4xl mx-auto'} gap-6`}>
            
            {/* LEFT DECK: TOP 3 BULLISH STOCKS */}
            {(filterMode === 'ALL' || filterMode === 'BULLISH_ONLY') && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                    <h3 className="text-sm font-black text-emerald-950 uppercase tracking-wide flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                      <span>Top 3 Bullish Stocks for the Day</span>
                    </h3>
                  </div>
                  <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-bold border border-emerald-300">
                    CALL (CE) Bias
                  </span>
                </div>

                {analysis.bullishPicks.length === 0 ? (
                  <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
                    No bullish candidates detected in current snapshot. Click "Fetch All 15m Candles" to sync live data.
                  </div>
                ) : (
                  analysis.bullishPicks.map((pick) => {
                    const originalStock = stockMap.get(pick.stockId);
                    const isCopied = copiedTradeId === pick.stockId;

                    return (
                      <div
                        key={`bullish_${pick.stockId}`}
                        className="bg-white rounded-2xl border-2 border-emerald-300/80 shadow-sm hover:shadow-md transition-all p-4 relative overflow-hidden"
                      >
                        {/* Subtle glowing ambient accent */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100/40 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />

                        {/* Top Row: Rank, Symbol, CMP, % Change */}
                        <div className="flex items-start justify-between gap-2 mb-3 relative z-10">
                          <div>
                            <div className="flex items-center space-x-2 mb-1">
                              {getRankBadge(pick.rank, 'BULLISH')}
                              <span className="text-xs font-bold text-slate-500 uppercase font-mono">
                                10:15 AM Signal
                              </span>
                            </div>
                            <div className="flex items-baseline space-x-2">
                              <h4 className="text-lg font-black text-slate-900 font-mono tracking-tight">
                                {pick.symbol}
                              </h4>
                              <span className="text-xs text-slate-500 truncate max-w-[140px] sm:max-w-[180px]">
                                {pick.companyName}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-lg font-extrabold text-slate-900 font-mono">
                              ₹{pick.cmp.toFixed(2)}
                            </div>
                            <span className="inline-flex items-center text-xs font-black px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                              {pick.pctChange >= 0 ? '+' : ''}{pick.pctChange.toFixed(2)}%
                            </span>
                          </div>
                        </div>

                        {/* Conviction Score Bar & Catalysts */}
                        <div className="mb-3.5 bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200/80">
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="font-bold text-emerald-900 flex items-center gap-1">
                              <Zap className="w-3.5 h-3.5 text-emerald-600" />
                              10:15 AM Conviction Score:
                            </span>
                            <span className="font-mono font-black text-emerald-950 text-sm">
                              {pick.convictionScore}%
                            </span>
                          </div>
                          
                          {/* Progress bar */}
                          <div className="w-full bg-emerald-200/80 h-2 rounded-full overflow-hidden mb-2">
                            <div 
                              className="bg-gradient-to-r from-emerald-500 to-teal-600 h-full rounded-full transition-all duration-300"
                              style={{ width: `${pick.convictionScore}%` }}
                            />
                          </div>

                          {/* Catalyst tags */}
                          <div className="flex flex-wrap gap-1.5">
                            {pick.catalysts.map((cat, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white text-emerald-800 border border-emerald-300/80 shadow-2xs"
                              >
                                {cat}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Gann & Modulo Values Grid */}
                        <div className="grid grid-cols-3 gap-2 mb-3.5 text-center">
                          <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                            <div className="text-[10px] text-slate-500 font-semibold uppercase">Open Calc</div>
                            <div className="font-mono text-xs font-black text-blue-700 mt-0.5">
                              {pick.openCalc !== null ? pick.openCalc.toFixed(4) : '-'}
                            </div>
                          </div>
                          <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                            <div className="text-[10px] text-slate-500 font-semibold uppercase">Close Calc</div>
                            <div className="font-mono text-xs font-black text-blue-700 mt-0.5">
                              {pick.closeCalc !== null ? pick.closeCalc.toFixed(4) : '-'}
                            </div>
                          </div>
                          <div className="p-2 bg-indigo-50/80 rounded-xl border border-indigo-200">
                            <div className="text-[10px] font-bold text-indigo-700 uppercase">Total (Sum)</div>
                            <div className="font-mono text-xs font-black text-indigo-950 mt-0.5">
                              {pick.totalCalc !== null ? pick.totalCalc.toFixed(4) : '-'}
                            </div>
                          </div>
                        </div>

                        {/* Actionable Intraday Trade Blueprint */}
                        <div className="bg-slate-900 text-white rounded-xl p-3.5 mb-3 shadow-sm border border-slate-800">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2 text-xs">
                            <span className="font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                              <Target className="w-3.5 h-3.5 text-amber-400" />
                              Actionable Plan: Long / Call (CE)
                            </span>
                            <span className="text-[11px] font-mono text-emerald-400 font-bold">
                              R:R {pick.tradeSetup.riskRewardRatio}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mb-2.5">
                            <div>
                              <div className="text-[10px] text-slate-400">Buy Entry Zone</div>
                              <div className="font-mono font-bold text-slate-200 text-xs truncate">
                                {pick.tradeSetup.entryZone.label}
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] text-rose-400">Stop Loss</div>
                              <div className="font-mono font-black text-rose-300 text-xs">
                                ₹{pick.tradeSetup.stopLoss.toFixed(2)}
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] text-emerald-400">Target 1 (1.2R)</div>
                              <div className="font-mono font-black text-emerald-300 text-xs">
                                ₹{pick.tradeSetup.target1.toFixed(2)}
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] text-emerald-400">Target 2 (2.2R)</div>
                              <div className="font-mono font-black text-emerald-300 text-xs">
                                ₹{pick.tradeSetup.target2.toFixed(2)}
                              </div>
                            </div>
                          </div>

                          {/* Recommended Option Strike Strip */}
                          <div className="bg-slate-800/90 rounded-lg p-2 flex items-center justify-between text-xs border border-slate-700/80">
                            <div className="flex items-center space-x-2">
                              <span className="px-2 py-0.5 bg-purple-500/30 text-purple-300 border border-purple-400/40 rounded-md font-mono font-black text-xs">
                                {pick.tradeSetup.recommendedStrike}
                              </span>
                              <span className="text-[11px] text-slate-300">
                                Lot: <strong>{pick.tradeSetup.lotSize}</strong>
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 mr-1">Est. T2 Profit:</span>
                              <strong className="text-emerald-400 font-mono font-bold">
                                +₹{pick.tradeSetup.estProfitPerLot.toLocaleString('en-IN')}
                              </strong>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                          <div className="flex items-center space-x-1.5">
                            {onOpenPositionSizer && originalStock && (
                              <button
                                onClick={() => onOpenPositionSizer(originalStock)}
                                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1"
                              >
                                <Calculator className="w-3.5 h-3.5" />
                                <span>Position Sizer</span>
                              </button>
                            )}
                            {onOpenRsiAnalyst && originalStock && (
                              <button
                                onClick={() => onOpenRsiAnalyst(originalStock)}
                                className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1"
                              >
                                <Activity className="w-3.5 h-3.5" />
                                <span>RSI Radar</span>
                              </button>
                            )}
                          </div>

                          <div className="flex items-center space-x-1.5">
                            <button
                              onClick={() => handleCopySetup(pick)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
                              title="Copy complete trade setup to clipboard"
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                            {onSelectStockDetail && originalStock && (
                              <button
                                onClick={() => onSelectStockDetail(originalStock)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
                                title="View full stock charts and levels"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* RIGHT DECK: TOP 3 BEARISH STOCKS */}
            {(filterMode === 'ALL' || filterMode === 'BEARISH_ONLY') && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-rose-200">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                    <h3 className="text-sm font-black text-rose-950 uppercase tracking-wide flex items-center gap-1.5">
                      <TrendingDown className="w-4 h-4 text-rose-600" />
                      <span>Top 3 Bearish Stocks for the Day</span>
                    </h3>
                  </div>
                  <span className="bg-rose-100 text-rose-800 text-xs px-2.5 py-0.5 rounded-full font-bold border border-rose-300">
                    PUT (PE) Bias
                  </span>
                </div>

                {analysis.bearishPicks.length === 0 ? (
                  <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
                    No bearish candidates detected in current snapshot. Click "Fetch All 15m Candles" to sync live data.
                  </div>
                ) : (
                  analysis.bearishPicks.map((pick) => {
                    const originalStock = stockMap.get(pick.stockId);
                    const isCopied = copiedTradeId === pick.stockId;

                    return (
                      <div
                        key={`bearish_${pick.stockId}`}
                        className="bg-white rounded-2xl border-2 border-rose-300/80 shadow-sm hover:shadow-md transition-all p-4 relative overflow-hidden"
                      >
                        {/* Subtle glowing ambient accent */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-100/40 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />

                        {/* Top Row: Rank, Symbol, CMP, % Change */}
                        <div className="flex items-start justify-between gap-2 mb-3 relative z-10">
                          <div>
                            <div className="flex items-center space-x-2 mb-1">
                              {getRankBadge(pick.rank, 'BEARISH')}
                              <span className="text-xs font-bold text-slate-500 uppercase font-mono">
                                10:15 AM Signal
                              </span>
                            </div>
                            <div className="flex items-baseline space-x-2">
                              <h4 className="text-lg font-black text-slate-900 font-mono tracking-tight">
                                {pick.symbol}
                              </h4>
                              <span className="text-xs text-slate-500 truncate max-w-[140px] sm:max-w-[180px]">
                                {pick.companyName}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-lg font-extrabold text-slate-900 font-mono">
                              ₹{pick.cmp.toFixed(2)}
                            </div>
                            <span className="inline-flex items-center text-xs font-black px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-300">
                              <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                              {pick.pctChange.toFixed(2)}%
                            </span>
                          </div>
                        </div>

                        {/* Conviction Score Bar & Catalysts */}
                        <div className="mb-3.5 bg-rose-50/70 p-2.5 rounded-xl border border-rose-200/80">
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="font-bold text-rose-900 flex items-center gap-1">
                              <Zap className="w-3.5 h-3.5 text-rose-600" />
                              10:15 AM Short Conviction:
                            </span>
                            <span className="font-mono font-black text-rose-950 text-sm">
                              {pick.convictionScore}%
                            </span>
                          </div>
                          
                          {/* Progress bar */}
                          <div className="w-full bg-rose-200/80 h-2 rounded-full overflow-hidden mb-2">
                            <div 
                              className="bg-gradient-to-r from-rose-500 to-red-600 h-full rounded-full transition-all duration-300"
                              style={{ width: `${pick.convictionScore}%` }}
                            />
                          </div>

                          {/* Catalyst tags */}
                          <div className="flex flex-wrap gap-1.5">
                            {pick.catalysts.map((cat, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white text-rose-800 border border-rose-300/80 shadow-2xs"
                              >
                                {cat}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Gann & Modulo Values Grid */}
                        <div className="grid grid-cols-3 gap-2 mb-3.5 text-center">
                          <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                            <div className="text-[10px] text-slate-500 font-semibold uppercase">Open Calc</div>
                            <div className="font-mono text-xs font-black text-blue-700 mt-0.5">
                              {pick.openCalc !== null ? pick.openCalc.toFixed(4) : '-'}
                            </div>
                          </div>
                          <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                            <div className="text-[10px] text-slate-500 font-semibold uppercase">Close Calc</div>
                            <div className="font-mono text-xs font-black text-blue-700 mt-0.5">
                              {pick.closeCalc !== null ? pick.closeCalc.toFixed(4) : '-'}
                            </div>
                          </div>
                          <div className="p-2 bg-indigo-50/80 rounded-xl border border-indigo-200">
                            <div className="text-[10px] font-bold text-indigo-700 uppercase">Total (Sum)</div>
                            <div className="font-mono text-xs font-black text-indigo-950 mt-0.5">
                              {pick.totalCalc !== null ? pick.totalCalc.toFixed(4) : '-'}
                            </div>
                          </div>
                        </div>

                        {/* Actionable Intraday Trade Blueprint */}
                        <div className="bg-slate-900 text-white rounded-xl p-3.5 mb-3 shadow-sm border border-slate-800">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2 text-xs">
                            <span className="font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1">
                              <Target className="w-3.5 h-3.5 text-rose-400" />
                              Actionable Plan: Short / Put (PE)
                            </span>
                            <span className="text-[11px] font-mono text-rose-400 font-bold">
                              R:R {pick.tradeSetup.riskRewardRatio}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mb-2.5">
                            <div>
                              <div className="text-[10px] text-slate-400">Short Entry Zone</div>
                              <div className="font-mono font-bold text-slate-200 text-xs truncate">
                                {pick.tradeSetup.entryZone.label}
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] text-rose-400">Stop Loss</div>
                              <div className="font-mono font-black text-rose-300 text-xs">
                                ₹{pick.tradeSetup.stopLoss.toFixed(2)}
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] text-emerald-400">Target 1 (1.2R)</div>
                              <div className="font-mono font-black text-emerald-300 text-xs">
                                ₹{pick.tradeSetup.target1.toFixed(2)}
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] text-emerald-400">Target 2 (2.2R)</div>
                              <div className="font-mono font-black text-emerald-300 text-xs">
                                ₹{pick.tradeSetup.target2.toFixed(2)}
                              </div>
                            </div>
                          </div>

                          {/* Recommended Option Strike Strip */}
                          <div className="bg-slate-800/90 rounded-lg p-2 flex items-center justify-between text-xs border border-slate-700/80">
                            <div className="flex items-center space-x-2">
                              <span className="px-2 py-0.5 bg-rose-500/30 text-rose-300 border border-rose-400/40 rounded-md font-mono font-black text-xs">
                                {pick.tradeSetup.recommendedStrike}
                              </span>
                              <span className="text-[11px] text-slate-300">
                                Lot: <strong>{pick.tradeSetup.lotSize}</strong>
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 mr-1">Est. T2 Profit:</span>
                              <strong className="text-emerald-400 font-mono font-bold">
                                +₹{pick.tradeSetup.estProfitPerLot.toLocaleString('en-IN')}
                              </strong>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                          <div className="flex items-center space-x-1.5">
                            {onOpenPositionSizer && originalStock && (
                              <button
                                onClick={() => onOpenPositionSizer(originalStock)}
                                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1"
                              >
                                <Calculator className="w-3.5 h-3.5" />
                                <span>Position Sizer</span>
                              </button>
                            )}
                            {onOpenRsiAnalyst && originalStock && (
                              <button
                                onClick={() => onOpenRsiAnalyst(originalStock)}
                                className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1"
                              >
                                <Activity className="w-3.5 h-3.5" />
                                <span>RSI Radar</span>
                              </button>
                            )}
                          </div>

                          <div className="flex items-center space-x-1.5">
                            <button
                              onClick={() => handleCopySetup(pick)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
                              title="Copy complete trade setup to clipboard"
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                            {onSelectStockDetail && originalStock && (
                              <button
                                onClick={() => onSelectStockDetail(originalStock)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
                                title="View full stock charts and levels"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                      </div>
                    );
                  })
                )}
              </div>
            )}

          </div>
        </div>
      )}
    </section>
  );
};
