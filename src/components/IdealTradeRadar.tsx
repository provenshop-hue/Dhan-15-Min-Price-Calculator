import React, { useState, useMemo } from 'react';
import { IdealOptionTrade, StockCalculated, StockTradeJourney } from '../types';
import { StockTimingHistoryAnalysis } from './StockTimingHistoryAnalysis';
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
  Search, 
  ChevronDown, 
  ChevronUp, 
  Maximize2, 
  Minimize2, 
  Zap, 
  Clock, 
  Layers, 
  Compass, 
  Coins, 
  Award,
  ArrowUpRight,
  ArrowDownRight,
  Flame,
  CheckCircle2,
  RefreshCw,
  Sliders
} from 'lucide-react';

interface IdealTradeRadarProps {
  idealTrades: IdealOptionTrade[];
  stocks: StockCalculated[];
  tradeJourneys: Record<string, StockTradeJourney>;
  onSelectStockDetail?: (stock: StockCalculated) => void;
  onOpenPositionSizer?: (stock: StockCalculated) => void;
  onOpenRsiAnalyst?: (stock: StockCalculated) => void;
  onRefreshAllPrices?: () => void;
  isLoading?: boolean;
}

export const IdealTradeRadar: React.FC<IdealTradeRadarProps> = ({
  idealTrades,
  stocks,
  tradeJourneys,
  onSelectStockDetail,
  onOpenPositionSizer,
  onOpenRsiAnalyst,
  onRefreshAllPrices,
  isLoading
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'ALL' | 'STOCKS_ONLY' | 'OPTIONS_ONLY' | 'CALL_CE' | 'PUT_PE' | 'PRIME_NOW'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedTradeId, setCopiedTradeId] = useState<string | null>(null);
  const [expandedTradeIds, setExpandedTradeIds] = useState<Set<string>>(new Set());
  // Store selected moneyness per stock: 'ATM' | 'ITM' | 'OTM'
  const [selectedMoneynessMap, setSelectedMoneynessMap] = useState<Record<string, 'ATM' | 'ITM' | 'OTM'>>({});

  // Stock Map
  const stockMap = useMemo(() => {
    const map = new Map<string, StockCalculated>();
    stocks.forEach((s) => map.set(s.id, s));
    return map;
  }, [stocks]);

  // Filtered Trades
  const filteredTrades = useMemo(() => {
    return idealTrades.filter((trade) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSymbol = trade.symbol.toLowerCase().includes(q);
        const matchesName = trade.companyName.toLowerCase().includes(q);
        const matchesStrike = trade.recommendedOptionStrike.toLowerCase().includes(q);
        if (!matchesSymbol && !matchesName && !matchesStrike) return false;
      }

      // Tab filters
      if (viewMode === 'CALL_CE') {
        return trade.direction === 'BULLISH_CE';
      }
      if (viewMode === 'PUT_PE') {
        return trade.direction === 'BEARISH_PE';
      }
      if (viewMode === 'PRIME_NOW') {
        return trade.timingStatus === 'PRIME_ENTRY_NOW' || trade.timingStatus === 'PULLBACK_RETEST';
      }

      return true;
    });
  }, [idealTrades, viewMode, searchQuery]);

  // Counts
  const counts = useMemo(() => {
    let ceCount = 0;
    let peCount = 0;
    let primeCount = 0;

    idealTrades.forEach((t) => {
      if (t.direction === 'BULLISH_CE') ceCount++;
      if (t.direction === 'BEARISH_PE') peCount++;
      if (t.timingStatus === 'PRIME_ENTRY_NOW' || t.timingStatus === 'PULLBACK_RETEST') primeCount++;
    });

    return { total: idealTrades.length, ceCount, peCount, primeCount };
  }, [idealTrades]);

  const toggleTradeCard = (id: string) => {
    setExpandedTradeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectMoneyness = (stockId: string, moneyness: 'ATM' | 'ITM' | 'OTM') => {
    setSelectedMoneynessMap((prev) => ({
      ...prev,
      [stockId]: moneyness
    }));
  };

  const getActiveStrikeContract = (trade: IdealOptionTrade): { contract: string; strike: number; label: string } => {
    const selected = selectedMoneynessMap[trade.stockId] || 'ATM';
    if (selected === 'ITM') {
      return {
        contract: trade.strikeLadder.itmContract,
        strike: trade.strikeLadder.itm,
        label: 'ITM (In-The-Money / High Delta)'
      };
    }
    if (selected === 'OTM') {
      return {
        contract: trade.strikeLadder.otmContract,
        strike: trade.strikeLadder.otm,
        label: 'OTM (Out-of-The-Money)'
      };
    }
    return {
      contract: trade.strikeLadder.atmContract,
      strike: trade.strikeLadder.atm,
      label: 'ATM (At-The-Money / Standard)'
    };
  };

  const handleCopyOptionOrder = (trade: IdealOptionTrade) => {
    const active = getActiveStrikeContract(trade);
    const text = `🎯 NSE OPTION CONTRACT: ${active.contract}
🏢 Stock: ${trade.symbol} (${trade.companyName}) | CMP: ₹${trade.spotPrice.toFixed(2)}
📌 Strike Type: ${active.label} (NSE Step: ${trade.strikeStep} pts)
💰 Est. Option Entry: ${trade.optionEntryRange} (LTP ~₹${trade.approxOptionLtp.toFixed(2)})
🎯 Option Target 1 (+38%): ₹${trade.optionTarget1.toFixed(2)} (+₹${trade.potentialGainPerLot.toLocaleString()}/lot)
🏆 Option Target 2 (+78%): ₹${trade.optionTarget2.toFixed(2)} (+₹${(trade.potentialGainPerLot * 2).toLocaleString()}/lot)
🛡️ Stop Loss (-28%): ₹${trade.optionStopLoss.toFixed(2)} (-₹${trade.riskPerLot.toLocaleString()}/lot)
📊 Lot Size: ${trade.lotSize} Qty | Capital: ~₹${trade.capitalRequiredPerLot.toLocaleString()}
⚖️ Risk:Reward: ${trade.riskRewardRatio} | Win Probability: ${trade.convictionScore}%`;

    navigator.clipboard.writeText(text).then(() => {
      setCopiedTradeId(`${trade.stockId}_opt`);
      setTimeout(() => setCopiedTradeId(null), 2500);
    });
  };

  const handleCopyStockOrder = (trade: IdealOptionTrade) => {
    const isBull = trade.direction === 'BULLISH_CE';
    const text = `📈 ${isBull ? 'BUY' : 'SELL'} SETUP: ${trade.symbol}
🏢 Company: ${trade.companyName} | CMP: ₹${trade.spotPrice.toFixed(2)}
🚀 Trigger: ${trade.stockAction} at ₹${trade.stockBuySellAbove.toFixed(2)}
🎯 Target 1: ₹${trade.stockTarget1.toFixed(2)} (+1.5%)
🏆 Target 2: ₹${trade.stockTarget2.toFixed(2)} (+3.0%)
🛡️ Stop Loss: ₹${trade.stockStopLoss.toFixed(2)}
📊 F&O Lot Size: ${trade.lotSize} Qty | Conviction: ${trade.convictionScore}%`;

    navigator.clipboard.writeText(text).then(() => {
      setCopiedTradeId(`${trade.stockId}_stk`);
      setTimeout(() => setCopiedTradeId(null), 2500);
    });
  };

  if (idealTrades.length === 0) {
    return null;
  }

  return (
    <div id="ideal-trade-radar-hub" className="bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-950 border-2 border-indigo-500/50 rounded-3xl p-4 sm:p-6 shadow-2xl text-slate-100 my-6 transition-all">
      
      {/* 1. TOP HEADER & OVERVIEW */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${isExpanded ? 'pb-5 border-b border-indigo-900/60' : ''}`}>
        <div className="flex items-start sm:items-center gap-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2.5 rounded-2xl bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 hover:bg-indigo-500/40 transition-all shrink-0 cursor-pointer shadow-inner"
            title={isExpanded ? "Collapse Section" : "Expand Section"}
          >
            {isExpanded ? <Minimize2 className="w-5 h-5 text-indigo-200" /> : <Maximize2 className="w-5 h-5 text-indigo-200 animate-pulse" />}
          </button>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/50 flex items-center gap-1.5 shadow-sm">
                <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
                Ideal Options &amp; High-Conviction Stocks to Trade NOW
              </span>
              <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-600/80 shadow-2xs">
                {counts.total} Top Setups
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-indigo-950 text-indigo-300 border border-indigo-700/60 hidden sm:inline-flex items-center gap-1">
                <Clock className="w-3 h-3 text-indigo-400" />
                Exact NSE Terminal Strikes
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight mt-1 flex items-center gap-2">
              <span>Historical Record Analysis &amp; High-Probability Profit Radar</span>
            </h2>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
          {onRefreshAllPrices && (
            <button
              onClick={onRefreshAllPrices}
              disabled={isLoading}
              className="text-xs font-black text-indigo-200 hover:text-white bg-indigo-900/80 hover:bg-indigo-800 px-3.5 py-2 rounded-xl border border-indigo-500/60 flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
              title="Refresh and re-analyze all stock & option setups"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Re-Analyze Setup</span>
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs font-extrabold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 px-3 py-2 rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all"
          >
            <span>{isExpanded ? 'Collapse Radar' : 'Expand Radar'}</span>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="pt-5 space-y-5 animate-fade-in">
          
          {/* 2. FILTER TABS & SEARCH BAR */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 bg-slate-950/90 rounded-2xl border border-indigo-900/40">
            {/* Filter Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setViewMode('ALL')}
                className={`text-xs font-black px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${
                  viewMode === 'ALL'
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-md ring-2 ring-indigo-400/40'
                    : 'bg-slate-900 text-slate-300 hover:text-white border-slate-800 hover:bg-slate-800'
                }`}
              >
                <span>All Trades</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-200">{counts.total}</span>
              </button>

              <button
                onClick={() => setViewMode('STOCKS_ONLY')}
                className={`text-xs font-black px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${
                  viewMode === 'STOCKS_ONLY'
                    ? 'bg-blue-600 text-white border-blue-400 shadow-md ring-2 ring-blue-400/40'
                    : 'bg-slate-900 text-blue-300 hover:text-white border-slate-800 hover:bg-slate-800'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>📈 Stocks (Cash / Futures)</span>
              </button>

              <button
                onClick={() => setViewMode('OPTIONS_ONLY')}
                className={`text-xs font-black px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${
                  viewMode === 'OPTIONS_ONLY'
                    ? 'bg-purple-600 text-white border-purple-400 shadow-md ring-2 ring-purple-400/40'
                    : 'bg-slate-900 text-purple-300 hover:text-white border-slate-800 hover:bg-slate-800'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>⚡ Options (CE / PE)</span>
              </button>

              <button
                onClick={() => setViewMode('CALL_CE')}
                className={`text-xs font-black px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${
                  viewMode === 'CALL_CE'
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-md ring-2 ring-emerald-400/40'
                    : 'bg-slate-900 text-emerald-400 hover:text-emerald-300 border-slate-800 hover:bg-slate-800'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Call (CE) / Long</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300">{counts.ceCount}</span>
              </button>

              <button
                onClick={() => setViewMode('PUT_PE')}
                className={`text-xs font-black px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${
                  viewMode === 'PUT_PE'
                    ? 'bg-rose-600 text-white border-rose-400 shadow-md ring-2 ring-rose-400/40'
                    : 'bg-slate-900 text-rose-400 hover:text-rose-300 border-slate-800 hover:bg-slate-800'
                }`}
              >
                <TrendingDown className="w-3.5 h-3.5" />
                <span>Put (PE) / Short</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-950 text-rose-300">{counts.peCount}</span>
              </button>

              <button
                onClick={() => setViewMode('PRIME_NOW')}
                className={`text-xs font-black px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${
                  viewMode === 'PRIME_NOW'
                    ? 'bg-amber-600 text-white border-amber-400 shadow-md ring-2 ring-amber-400/40'
                    : 'bg-slate-900 text-amber-400 hover:text-amber-300 border-slate-800 hover:bg-slate-800'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-amber-300" />
                <span>Prime Entry NOW</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-950 text-amber-300">{counts.primeCount}</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search symbol, strike, company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 focus:border-indigo-500 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none"
              />
            </div>
          </div>

          {/* 3. OPTION & STOCK CARDS LIST */}
          <div className="space-y-4">
            {filteredTrades.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/60 border border-slate-800/80 rounded-2xl text-slate-400">
                No trades match your active filter tab. Try switching to "All Trades" or refreshing prices.
              </div>
            ) : (
              filteredTrades.map((trade) => {
                const stockObj = stockMap.get(trade.stockId);
                const isCardOpen = expandedTradeIds.has(trade.stockId);
                const isBullish = trade.direction === 'BULLISH_CE';
                const isOptCopied = copiedTradeId === `${trade.stockId}_opt`;
                const isStkCopied = copiedTradeId === `${trade.stockId}_stk`;
                const activeStrike = getActiveStrikeContract(trade);
                const currentMoneyness = selectedMoneynessMap[trade.stockId] || 'ATM';

                return (
                  <div
                    key={trade.stockId}
                    className={`bg-slate-950 border-2 rounded-2xl transition-all shadow-xl overflow-hidden ${
                      isBullish
                        ? 'border-emerald-500/70 bg-gradient-to-r from-slate-950 via-emerald-950/15 to-slate-950 shadow-emerald-950/20'
                        : 'border-rose-500/70 bg-gradient-to-r from-slate-950 via-rose-950/15 to-slate-950 shadow-rose-950/20'
                    }`}
                  >
                    {/* Top Row: Symbol, Direction, Setup Tags, Actions */}
                    <div className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-900/80 border-b border-slate-800">
                      
                      {/* Left: Stock & Recommended Contract */}
                      <div className="flex items-start sm:items-center gap-3">
                        <div className={`p-3 rounded-2xl border flex flex-col items-center justify-center shrink-0 shadow-md ${
                          isBullish 
                            ? 'bg-emerald-950 border-emerald-500 text-emerald-400 ring-2 ring-emerald-500/20' 
                            : 'bg-rose-950 border-rose-500 text-rose-400 ring-2 ring-rose-500/20'
                        }`}>
                          {isBullish ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                          <span className="text-[10px] font-black uppercase mt-0.5">{trade.optionType}</span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Stock Name */}
                            <span className="text-base sm:text-lg font-black text-white font-mono tracking-tight">
                              {trade.symbol}
                            </span>

                            {/* Exact Active Option Contract Badge */}
                            <span className={`text-xs sm:text-sm font-black font-mono px-2.5 py-0.5 rounded-xl border flex items-center gap-1 shadow-sm ${
                              isBullish 
                                ? 'bg-emerald-900/90 text-yellow-300 border-emerald-400' 
                                : 'bg-rose-900/90 text-yellow-300 border-rose-400'
                            }`}>
                              <Target className="w-3.5 h-3.5 text-yellow-300" />
                              {activeStrike.contract}
                            </span>

                            <span className="text-xs text-slate-400 font-medium truncate max-w-[140px]">
                              {trade.companyName}
                            </span>

                            {/* Timing Status Pill */}
                            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-lg bg-indigo-950 text-indigo-300 border border-indigo-700/80 flex items-center gap-1 font-mono">
                              {trade.timingStatusLabel}
                            </span>
                          </div>

                          {/* Underlying Details & NSE Strike Step */}
                          <div className="text-xs text-slate-400 flex items-center gap-2.5 mt-1.5 font-mono flex-wrap">
                            <span>Spot CMP: <strong className="text-white">₹{trade.spotPrice.toFixed(2)}</strong></span>
                            <span>•</span>
                            <span className="text-indigo-300 font-bold bg-indigo-950/60 px-1.5 py-0.2 rounded border border-indigo-800/60 text-[11px]">
                              NSE Step: {trade.strikeStep} pts
                            </span>
                            <span>•</span>
                            <span>Lot Size: <strong className="text-slate-200">{trade.lotSize} Qty</strong></span>
                            <span>•</span>
                            <span>Option Capital: <strong className="text-cyan-300">₹{trade.capitalRequiredPerLot.toLocaleString()} / lot</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Conviction Meter, R:R, Quick Copy Buttons, Expand */}
                      <div className="flex items-center gap-2.5 self-end lg:self-auto flex-wrap">
                        
                        {/* Conviction Win Probability */}
                        <div className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-700 text-center shadow-inner">
                          <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Win Probability</div>
                          <div className={`text-xs sm:text-sm font-black flex items-center justify-center gap-1 ${
                            trade.convictionScore >= 85 ? 'text-emerald-400' : 'text-amber-400'
                          }`}>
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{trade.convictionScore}% High</span>
                          </div>
                        </div>

                        {/* Risk:Reward Pill */}
                        <div className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700 text-center font-mono">
                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">R : R</div>
                          <div className="text-xs font-black text-indigo-300">{trade.riskRewardRatio}</div>
                        </div>

                        {/* Copy Option Contract */}
                        <button
                          onClick={() => handleCopyOptionOrder(trade)}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-black flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
                            isOptCopied
                              ? 'bg-emerald-600 text-white border-emerald-400'
                              : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-400 hover:scale-105'
                          }`}
                          title="Copy full option contract details for trading terminal"
                        >
                          {isOptCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{isOptCopied ? 'Option Copied!' : 'Copy Option'}</span>
                        </button>

                        {/* Copy Stock Setup */}
                        <button
                          onClick={() => handleCopyStockOrder(trade)}
                          className={`px-2.5 py-1.5 rounded-xl border text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
                            isStkCopied
                              ? 'bg-emerald-700 text-white border-emerald-500'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600'
                          }`}
                          title="Copy Cash/Futures stock levels"
                        >
                          {isStkCopied ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3 text-slate-300" />}
                          <span>{isStkCopied ? 'Stock Copied!' : 'Copy Stock'}</span>
                        </button>

                        {/* Expand Card Details */}
                        <button
                          onClick={() => toggleTradeCard(trade.stockId)}
                          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                          title="Toggle full trade thesis and confluence audit"
                        >
                          {isCardOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Interactive Strike Ladder Selector (ATM / ITM / OTM) */}
                    <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-400 font-sans text-xs">
                        <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="font-semibold text-slate-300">Terminal Strike Selector:</span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* ITM Option Strike */}
                        <button
                          onClick={() => handleSelectMoneyness(trade.stockId, 'ITM')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-mono font-black border transition-all cursor-pointer ${
                            currentMoneyness === 'ITM'
                              ? 'bg-indigo-600 text-white border-indigo-400 shadow-xs'
                              : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
                          }`}
                          title="In-The-Money strike: Higher Delta, moves closer to 1:1 with spot price"
                        >
                          ITM: {trade.strikeLadder.itmContract}
                        </button>

                        {/* ATM Option Strike */}
                        <button
                          onClick={() => handleSelectMoneyness(trade.stockId, 'ATM')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-mono font-black border transition-all cursor-pointer ${
                            currentMoneyness === 'ATM'
                              ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-xs'
                              : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
                          }`}
                          title="At-The-Money strike: Standard high liquidity strike"
                        >
                          ⭐ ATM: {trade.strikeLadder.atmContract}
                        </button>

                        {/* OTM Option Strike */}
                        <button
                          onClick={() => handleSelectMoneyness(trade.stockId, 'OTM')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-mono font-black border transition-all cursor-pointer ${
                            currentMoneyness === 'OTM'
                              ? 'bg-indigo-600 text-white border-indigo-400 shadow-xs'
                              : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
                          }`}
                          title="Out-of-The-Money strike: Lower premium"
                        >
                          OTM: {trade.strikeLadder.otmContract}
                        </button>
                      </div>
                    </div>

                    {/* Middle Section: Dual Setup Grid (Stock Levels & Option Matrix) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800 bg-slate-950/80 border-b border-slate-800">
                      
                      {/* Left Pane: Stock Cash / Futures Setup */}
                      <div className="p-3.5 space-y-2">
                        <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800/80">
                          <span className="font-bold text-blue-400 flex items-center gap-1.5">
                            <Activity className="w-3.5 h-3.5" /> Stock (Cash / Futures) Setup
                          </span>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded font-mono ${
                            isBullish ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
                          }`}>
                            {trade.stockAction}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 font-mono text-xs pt-1">
                          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                            <span className="text-[9.5px] text-slate-400 block font-sans">Trigger Level</span>
                            <strong className="text-white text-xs block mt-0.5">₹{trade.stockBuySellAbove.toFixed(2)}</strong>
                          </div>
                          <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-emerald-300">
                            <span className="text-[9.5px] text-slate-400 block font-sans">Stock Target 1</span>
                            <strong className="text-emerald-300 text-xs block mt-0.5">₹{trade.stockTarget1.toFixed(2)}</strong>
                          </div>
                          <div className="p-2 rounded-lg bg-rose-950/60 border border-rose-800/60 text-rose-300">
                            <span className="text-[9.5px] text-slate-400 block font-sans">Stock SL</span>
                            <strong className="text-rose-300 text-xs block mt-0.5">₹{trade.stockStopLoss.toFixed(2)}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Right Pane: Option Contract Target Matrix */}
                      <div className="p-3.5 space-y-2">
                        <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800/80">
                          <span className="font-bold text-yellow-300 flex items-center gap-1.5 font-mono">
                            <Zap className="w-3.5 h-3.5 text-yellow-400" /> Option Targets for {activeStrike.contract}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 font-mono">
                            Est. LTP ~₹{trade.approxOptionLtp.toFixed(2)}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 font-mono text-xs pt-1">
                          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                            <span className="text-[9.5px] text-slate-400 block font-sans">Entry Range</span>
                            <strong className="text-yellow-300 text-xs block mt-0.5">{trade.optionEntryRange}</strong>
                          </div>
                          <div className="p-2 rounded-lg bg-emerald-950/80 border border-emerald-600/80 text-emerald-300">
                            <span className="text-[9.5px] text-slate-400 block font-sans">Target 1 (+38%)</span>
                            <strong className="text-emerald-300 text-xs block mt-0.5">₹{trade.optionTarget1.toFixed(2)}</strong>
                          </div>
                          <div className="p-2 rounded-lg bg-rose-950/80 border border-rose-700/80 text-rose-300">
                            <span className="text-[9.5px] text-slate-400 block font-sans">Option SL (-28%)</span>
                            <strong className="text-rose-300 text-xs block mt-0.5">₹{trade.optionStopLoss.toFixed(2)}</strong>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Bottom Directive & Quick Actions */}
                    <div className="px-4 py-2.5 bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                        <p className="font-medium text-slate-300 text-xs">
                          <strong className="text-white">Terminal Directive:</strong> Search <strong className="text-yellow-300 font-mono">"{activeStrike.contract}"</strong>. Enter in {trade.optionEntryRange}. Book 50% at ₹{trade.optionTarget1.toFixed(2)} &amp; trail SL.
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        {stockObj && onOpenPositionSizer && (
                          <button
                            onClick={() => onOpenPositionSizer(stockObj)}
                            className="text-[11px] font-black text-indigo-200 hover:text-white bg-indigo-950 hover:bg-indigo-900 px-3 py-1.5 rounded-xl border border-indigo-700/80 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                            title="Calculate lot & risk size"
                          >
                            <Calculator className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Size Lot &amp; Capital</span>
                          </button>
                        )}

                        {stockObj && onSelectStockDetail && (
                          <button
                            onClick={() => onSelectStockDetail(stockObj)}
                            className="text-[11px] font-black text-emerald-200 hover:text-white bg-emerald-950 hover:bg-emerald-900 px-3 py-1.5 rounded-xl border border-emerald-700/80 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                            title="View full technical details & ATM strike options"
                          >
                            <Eye className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Stock Details</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expanded Historical Confluence & Trade Thesis */}
                    {isCardOpen && (
                      <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-4 animate-fade-in">
                        
                        {/* Why This Will Profit Thesis */}
                        <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-800/60 text-xs space-y-1.5">
                          <div className="text-xs font-black text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                            Why This Trade Will Result In Profit (Mathematical Thesis)
                          </div>
                          <p className="text-slate-300 leading-relaxed font-medium">
                            {trade.whyThisWillProfit}
                          </p>
                        </div>

                        {/* Historical Audit Confluence Checklist */}
                        <div className="space-y-2">
                          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              Historical Record &amp; Technical Confluence Checklist ({trade.historicAuditConfluence.length} Rules Passed)
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              Verified against {trade.totalFetchesTracked} fetch cycles
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            {trade.historicAuditConfluence.map((item, idx) => (
                              <div
                                key={idx}
                                className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-medium flex items-start gap-2"
                              >
                                <span className="text-emerald-400 font-bold shrink-0 mt-0.5">✓</span>
                                <span className="text-slate-200">{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* ⏳ Ideal Time Analysis by Analysing Whole History */}
                        {stockObj && (
                          <div className="pt-2">
                            <StockTimingHistoryAnalysis 
                              stock={stockObj} 
                              tradeJourney={tradeJourneys[trade.stockId]} 
                            />
                          </div>
                        )}

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
