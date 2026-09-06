import React, { useState, useMemo } from 'react';
import { StockCalculated, DhanApiCredentials } from '../types';
import { 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  ExternalLink,
  Target,
  ShieldCheck,
  Search,
  Filter,
  Cpu,
  RefreshCw,
  SlidersHorizontal,
  Clock,
  Sparkles,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2
} from 'lucide-react';

interface Props {
  stocks: StockCalculated[];
  credentials?: DhanApiCredentials;
  onSelectStockDetail: (stock: StockCalculated) => void;
  onOpenPositionSizer: (stock: StockCalculated) => void;
  onOpenRsiAnalyst?: (stock: StockCalculated) => void;
  onFetchSingleStock?: (stock: StockCalculated) => void;
  onFetchAll?: () => void;
  isBulkLoading?: boolean;
}

export type DataSourceMode = 'DAY_OHLC' | 'FIRST_15M' | 'FIRST_1M';
export type MatchAccuracyFilter = 'EXACT_ONLY' | 'ALL' | 'NEAR_ONLY';

export interface OpenHighLowAnalyzedStock extends StockCalculated {
  strategyType: 'OPEN_LOW' | 'OPEN_HIGH';
  effectiveOpen: number;
  effectiveHigh: number;
  effectiveLow: number;
  effectiveClose: number;
  difference: number;
  diffPct: number;
  isExact: boolean;
}

export function OpenHighLowScanner({
  stocks,
  credentials,
  onSelectStockDetail,
  onOpenPositionSizer,
  onOpenRsiAnalyst,
  onFetchSingleStock,
  onFetchAll,
  isBulkLoading = false
}: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'OPEN_LOW' | 'OPEN_HIGH'>('ALL');
  const [matchAccuracy, setMatchAccuracy] = useState<MatchAccuracyFilter>('EXACT_ONLY');
  const [dataSource, setDataSource] = useState<DataSourceMode>('DAY_OHLC');
  const [priceAbove1000, setPriceAbove1000] = useState(false);
  const [refreshingSymbol, setRefreshingSymbol] = useState<string | null>(null);

  // Scan stocks based on selected data source and accuracy mode
  const { allScanned, exactMatchesCount, openLowCount, openHighCount } = useMemo(() => {
    let exactCount = 0;
    let olCount = 0;
    let ohCount = 0;

    const list: OpenHighLowAnalyzedStock[] = [];

    stocks.forEach((s) => {
      // Pick OHLC according to user-selected source mode
      let open: number | undefined;
      let high: number | undefined;
      let low: number | undefined;
      let close: number | undefined;

      if (dataSource === 'DAY_OHLC') {
        // Official NSE Day Session from Dhan Live Marketfeed / Intraday API
        open = s.dayOpen ?? s.openPrice;
        high = s.dayHigh ?? s.highPrice;
        low = s.dayLow ?? s.lowPrice;
        close = s.dayClose ?? s.ltp ?? s.closePrice;
      } else if (dataSource === 'FIRST_15M') {
        // 09:15 AM - 09:30 AM First 15m Candle
        open = s.first15mOpen ?? s.openPrice;
        high = s.first15mHigh ?? s.highPrice;
        low = s.first15mLow ?? s.lowPrice;
        close = s.first15mClose ?? s.closePrice;
      } else {
        // 09:15 AM - 09:16 AM 1-Minute Candle
        open = s.first1mOpen ?? s.first15mOpen ?? s.openPrice;
        high = s.first1mHigh ?? s.first15mHigh ?? s.highPrice;
        low = s.first1mLow ?? s.first15mLow ?? s.lowPrice;
        close = s.first1mClose ?? s.closePrice;
      }

      if (
        open === undefined || open === null || open <= 0 ||
        high === undefined || high === null || high <= 0 ||
        low === undefined || low === null || low <= 0
      ) {
        return;
      }

      const diffLow = Math.round(Math.abs(open - low) * 100) / 100;
      const diffHigh = Math.round(Math.abs(open - high) * 100) / 100;

      // Pure exact: 0.00 difference (Open === Low or Open === High down to the exact paise)
      const isPureExactLow = Math.round(open * 100) === Math.round(low * 100) || diffLow === 0;
      const isPureExactHigh = Math.round(open * 100) === Math.round(high * 100) || diffHigh === 0;

      // Exact match on NSE: difference is within 1 tick (₹0.05) or rounds to identical paise
      const isExactLow = isPureExactLow || diffLow <= 0.05;
      const isExactHigh = isPureExactHigh || diffHigh <= 0.05;

      // Near match tolerance: <= 0.10% variance (or <= 0.20 pts for sub-₹200 penny stocks)
      const isNearLow = !isExactLow && ((diffLow / open) * 100 <= 0.10 || diffLow <= 0.20);
      const isNearHigh = !isExactHigh && ((diffHigh / open) * 100 <= 0.10 || diffHigh <= 0.20);

      // Disqualify if low broke below open by more than tolerance for Open=Low
      const validOpenLow = (isExactLow || isNearLow) && low >= open - 0.05;
      // Disqualify if high spiked above open by more than tolerance for Open=High
      const validOpenHigh = (isExactHigh || isNearHigh) && high <= open + 0.05;

      if (!validOpenLow && !validOpenHigh) return;

      // If both qualify (rare doji), prefer the tighter variance
      let strategyType: 'OPEN_LOW' | 'OPEN_HIGH';
      let difference: number;
      let isExact: boolean;

      if (validOpenLow && validOpenHigh) {
        if (diffLow <= diffHigh) {
          strategyType = 'OPEN_LOW';
          difference = diffLow;
          isExact = isExactLow;
        } else {
          strategyType = 'OPEN_HIGH';
          difference = diffHigh;
          isExact = isExactHigh;
        }
      } else if (validOpenLow) {
        strategyType = 'OPEN_LOW';
        difference = diffLow;
        isExact = isExactLow;
      } else {
        strategyType = 'OPEN_HIGH';
        difference = diffHigh;
        isExact = isExactHigh;
      }

      if (isExact) exactCount++;
      if (strategyType === 'OPEN_LOW') olCount++;
      else ohCount++;

      const diffPct = open > 0 ? (difference / open) * 100 : 0;

      list.push({
        ...s,
        strategyType,
        effectiveOpen: open,
        effectiveHigh: high,
        effectiveLow: low,
        effectiveClose: close ?? open,
        difference,
        diffPct,
        isExact
      });
    });

    // Primary sort: Exact matches first, then lowest difference ascending
    list.sort((a, b) => {
      if (a.isExact && !b.isExact) return -1;
      if (!a.isExact && b.isExact) return 1;
      return a.difference - b.difference || a.diffPct - b.diffPct;
    });

    return {
      allScanned: list,
      exactMatchesCount: exactCount,
      openLowCount: olCount,
      openHighCount: ohCount
    };
  }, [stocks, dataSource]);

  // Filtered by user selections
  const filteredStocks = useMemo(() => {
    return allScanned.filter((s) => {
      // Strategy filter
      if (filterType !== 'ALL' && s.strategyType !== filterType) return false;

      // Match accuracy filter
      if (matchAccuracy === 'EXACT_ONLY' && !s.isExact) return false;
      if (matchAccuracy === 'NEAR_ONLY' && s.isExact) return false;

      // Price filter
      if (priceAbove1000) {
        const p = s.effectiveClose || s.effectiveOpen;
        if (p <= 1000) return false;
      }

      // Search term
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          s.symbol.toLowerCase().includes(q) ||
          (s.companyName && s.companyName.toLowerCase().includes(q))
        );
      }

      return true;
    });
  }, [allScanned, filterType, matchAccuracy, priceAbove1000, searchTerm]);

  // Top AI Recommendation: Best exact Open=Low with strongest RSI / volume confirmation
  const topRecommendation = useMemo(() => {
    const candidates = filteredStocks.filter((s) => s.strategyType === 'OPEN_LOW' && s.isExact);
    if (candidates.length === 0) {
      return filteredStocks.find((s) => s.strategyType === 'OPEN_LOW') || filteredStocks[0];
    }
    return candidates.sort((a, b) => {
      const rsiA = a.rsi ?? 50;
      const rsiB = b.rsi ?? 50;
      const volA = a.volumeRatio ?? 1;
      const volB = b.volumeRatio ?? 1;
      return (rsiB * 0.6 + volB * 20) - (rsiA * 0.6 + volA * 20);
    })[0];
  }, [filteredStocks]);

  const handleSingleRefresh = async (stock: StockCalculated) => {
    if (!onFetchSingleStock) return;
    setRefreshingSymbol(stock.symbol);
    try {
      await onFetchSingleStock(stock);
    } finally {
      setRefreshingSymbol(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        
        <div className="relative z-10 space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-500/20 text-cyan-400 rounded-xl ring-1 ring-cyan-500/30">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Open = High / Low Scanner
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Dhan Real-Time OHLC
                </span>
              </h1>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Identifies stocks where the opening price perfectly equals the session Low or High. 
            <strong className="text-emerald-400 font-semibold ml-1">Open = Low (Bullish)</strong> signals relentless buyer dominance. 
            <strong className="text-rose-400 font-semibold ml-1">Open = High (Bearish)</strong> signals intense selling pressure from the opening bell.
          </p>
        </div>

        {/* Global Action & Search */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full lg:w-auto relative z-10">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search symbol..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-sm text-white rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-cyan-500/50 transition-colors placeholder:text-slate-600 font-medium"
            />
          </div>

          {onFetchAll && (
            <button
              onClick={onFetchAll}
              disabled={isBulkLoading}
              className={`px-4 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md ${
                isBulkLoading 
                  ? 'bg-cyan-900/60 text-cyan-300 cursor-not-allowed border border-cyan-700/50' 
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-950/50 active:scale-95'
              }`}
              title="Sync Real-Time OHLC from Dhan API"
            >
              <RefreshCw className={`w-4 h-4 ${isBulkLoading ? 'animate-spin' : ''}`} />
              <span className="whitespace-nowrap">{isBulkLoading ? 'Syncing Dhan...' : 'Sync Dhan OHLC'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Control Strip: Data Source Selection & Accuracy Toggle */}
      <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow-md flex flex-wrap items-center justify-between gap-4">
        {/* Data Source Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mr-1">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            Source:
          </span>
          <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800">
            <button
              onClick={() => setDataSource('DAY_OHLC')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                dataSource === 'DAY_OHLC'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Official NSE Exchange Day OHLC via Dhan Marketfeed API (Most Accurate)"
            >
              Official Day OHLC (NSE)
            </button>
            <button
              onClick={() => setDataSource('FIRST_15M')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                dataSource === 'FIRST_15M'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="9:15 AM - 9:30 AM 15-Minute Candle"
            >
              First 15m Candle
            </button>
            <button
              onClick={() => setDataSource('FIRST_1M')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                dataSource === 'FIRST_1M'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="9:15 AM - 9:16 AM 1-Minute Opening Candle"
            >
              First 1m Candle
            </button>
          </div>
        </div>

        {/* Match Precision Toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mr-1">
            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
            Accuracy:
          </span>
          <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800">
            <button
              onClick={() => setMatchAccuracy('EXACT_ONLY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                matchAccuracy === 'EXACT_ONLY'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-400/80 hover:text-emerald-300'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Exact Only (Diff ≤ ₹0.05)</span>
              <span className="ml-1 px-1.5 py-0.2 bg-emerald-950/80 rounded-full text-[10px]">
                {exactMatchesCount}
              </span>
            </button>
            <button
              onClick={() => setMatchAccuracy('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                matchAccuracy === 'ALL'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Matches ({allScanned.length})
            </button>
            <button
              onClick={() => setMatchAccuracy('NEAR_ONLY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                matchAccuracy === 'NEAR_ONLY'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Near Matches (Diff ≤ 0.10%)
            </button>
          </div>
        </div>
      </div>

      {/* AI Recommendation Banner (Top Exact Pick) */}
      {topRecommendation && (
        <div
          onClick={() => onSelectStockDetail(topRecommendation)}
          className="bg-gradient-to-r from-emerald-950/50 via-slate-900 to-slate-900 border-2 border-emerald-500/40 hover:border-emerald-400 rounded-2xl p-5 sm:p-6 shadow-[0_8px_30px_rgba(16,185,129,0.15)] relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-5 cursor-pointer transition-all group"
        >
          <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          
          <div className="flex items-center gap-4 relative z-10">
            <div className="p-3.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30 group-hover:scale-105 transition-transform">
              <Sparkles className="w-7 h-7" />
            </div>
            <div>
              <div className="text-emerald-400 font-extrabold uppercase tracking-widest text-[11px] flex items-center gap-1.5 mb-1">
                <Zap className="w-3.5 h-3.5" /> High-Probability Institutional Setup
              </div>
              <div className="flex items-baseline gap-3">
                <h2 className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
                  {topRecommendation.symbol}
                </h2>
                <span className="text-sm font-bold font-mono text-emerald-300">
                  ₹{topRecommendation.effectiveClose?.toFixed(2)}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-400 font-mono font-bold border border-emerald-800">
                  {topRecommendation.pctChange !== undefined && topRecommendation.pctChange > 0 ? '+' : ''}
                  {topRecommendation.pctChange?.toFixed(2)}%
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                {topRecommendation.isExact ? (
                  <strong className="text-emerald-300">
                    🎯 Exact Open = Low match! Open ₹{topRecommendation.effectiveOpen.toFixed(2)} equals Low ₹{topRecommendation.effectiveLow.toFixed(2)} (₹0.00 Diff).
                  </strong>
                ) : (
                  <span>
                    Open ₹{topRecommendation.effectiveOpen.toFixed(2)} vs Low ₹{topRecommendation.effectiveLow.toFixed(2)} (Diff: ₹{topRecommendation.difference.toFixed(2)}).
                  </span>
                )}
                {topRecommendation.rsi && ` RSI is ${topRecommendation.rsi.toFixed(1)}.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 relative z-10 w-full md:w-auto justify-end">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenPositionSizer(topRecommendation);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md transition-all active:scale-95"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Plan Trade</span>
            </button>
            {onOpenRsiAnalyst && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenRsiAnalyst(topRecommendation);
                }}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors"
                title="View 15m RSI Timeline"
              >
                <Activity className="w-4 h-4 text-cyan-400" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filter Tabs Strip */}
      <div className="flex space-x-2 overflow-x-auto no-scrollbar pb-1">
        <button
          onClick={() => setFilterType('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-sm flex items-center space-x-2 ${
            filterType === 'ALL'
              ? 'bg-slate-700 text-white shadow-md' 
              : 'bg-slate-900/50 text-slate-400 hover:bg-slate-800 border border-slate-800/50'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          <span>All Directions ({allScanned.length})</span>
        </button>
        <button
          onClick={() => setFilterType('OPEN_LOW')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-sm flex items-center space-x-2 ${
            filterType === 'OPEN_LOW'
              ? 'bg-emerald-600 text-white border-emerald-400 shadow-md ring-2 ring-emerald-500/20' 
              : 'bg-emerald-950/20 text-emerald-400/80 border border-emerald-900/50 hover:bg-emerald-900/40'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>🟢 Open = Low ({openLowCount})</span>
        </button>
        <button
          onClick={() => setFilterType('OPEN_HIGH')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-sm flex items-center space-x-2 ${
            filterType === 'OPEN_HIGH'
              ? 'bg-rose-600 text-white border-rose-400 shadow-md ring-2 ring-rose-500/20' 
              : 'bg-rose-950/20 text-rose-400/80 border border-rose-900/50 hover:bg-rose-900/40'
          }`}
        >
          <TrendingDown className="w-3.5 h-3.5" />
          <span>🔴 Open = High ({openHighCount})</span>
        </button>
        <button
          onClick={() => setPriceAbove1000(!priceAbove1000)}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-sm flex items-center space-x-2 ${
            priceAbove1000
              ? 'bg-fuchsia-600 text-white border-fuchsia-400 shadow-md ring-2 ring-fuchsia-500/20' 
              : 'bg-fuchsia-950/20 text-fuchsia-400/80 border border-fuchsia-900/50 hover:bg-fuchsia-900/40'
          }`}
        >
          <span>💰 Price &gt; ₹1,000</span>
        </button>
      </div>

      {/* Scanner Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredStocks.map((stock) => {
          const isBull = stock.strategyType === 'OPEN_LOW';
          const pctChange =
            stock.pctChange !== undefined
              ? stock.pctChange
              : stock.effectiveOpen > 0
              ? ((stock.effectiveClose - stock.effectiveOpen) / stock.effectiveOpen) * 100
              : 0;

          const isRefreshing = refreshingSymbol === stock.symbol;

          return (
            <div 
              key={stock.symbol}
              onClick={() => onSelectStockDetail(stock)}
              className={`group bg-slate-900 rounded-2xl border-2 transition-all cursor-pointer overflow-hidden flex flex-col justify-between ${
                isBull 
                  ? 'border-emerald-500/25 hover:border-emerald-400 hover:shadow-[0_8px_30px_rgba(16,185,129,0.18)]' 
                  : 'border-rose-500/25 hover:border-rose-400 hover:shadow-[0_8px_30px_rgba(244,63,94,0.18)]'
              }`}
            >
              <div>
                {/* Card Header */}
                <div className={`px-4 py-3 border-b flex items-center justify-between ${
                  isBull ? 'border-emerald-500/15 bg-emerald-500/5' : 'border-rose-500/15 bg-rose-500/5'
                }`}>
                  <div className="flex flex-col">
                    <h3 className="font-bold text-lg text-white font-mono flex items-center gap-2">
                      {stock.symbol}
                      {isBull ? (
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-rose-400" />
                      )}
                    </h3>
                    <span className="text-xs text-slate-400 truncate max-w-[140px]">
                      {stock.companyName}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className={`px-2.5 py-1 rounded-lg text-xs font-black font-mono shadow-sm flex flex-col items-end ${
                      pctChange >= 0
                        ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-950/80 text-rose-400 border border-rose-500/30'
                    }`}>
                      <span className="text-white text-sm">
                        ₹{stock.effectiveClose.toFixed(2)}
                      </span>
                      <span>{pctChange > 0 ? '+' : ''}{pctChange.toFixed(2)}%</span>
                    </div>

                    {onFetchSingleStock && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSingleRefresh(stock);
                        }}
                        disabled={isRefreshing}
                        className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                        title="Refresh Dhan OHLC for this stock"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Match Details Banner */}
                <div className="p-4 space-y-3">
                  {/* Accuracy Badge */}
                  {stock.isExact ? (
                    <div className={`rounded-xl p-2.5 text-center flex items-center justify-center gap-2 border font-black text-xs uppercase tracking-wider ${
                      isBull
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm'
                    }`}>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>EXACT MATCH (₹0.00 Diff)</span>
                    </div>
                  ) : (
                    <div className="rounded-xl p-2 text-center bg-slate-950/70 border border-slate-800 text-[11px] text-slate-300 font-mono">
                      Near Match: Diff ₹{stock.difference.toFixed(2)} ({stock.diffPct.toFixed(2)}%)
                    </div>
                  )}

                  {/* OHLC Comparison Box */}
                  <div className={`p-3 rounded-xl border ${
                    isBull ? 'bg-emerald-950/20 border-emerald-500/20' : 'bg-rose-950/20 border-rose-500/20'
                  }`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                        {isBull ? 'Open = Low Setup' : 'Open = High Setup'}
                      </span>
                      <span className={`text-[11px] font-black font-mono ${isBull ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isBull ? 'BULLISH' : 'BEARISH'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                        <div className="text-[10px] uppercase text-slate-500 font-sans font-bold">Open Price</div>
                        <div className="text-white font-bold mt-0.5">₹{stock.effectiveOpen.toFixed(2)}</div>
                      </div>
                      <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                        <div className="text-[10px] uppercase text-slate-500 font-sans font-bold">
                          {isBull ? 'Session Low' : 'Session High'}
                        </div>
                        <div className={`font-bold mt-0.5 ${isBull ? 'text-emerald-400' : 'text-rose-400'}`}>
                          ₹{isBull ? stock.effectiveLow.toFixed(2) : stock.effectiveHigh.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Additional Indicators Strip */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800">
                      <div className="text-[10px] uppercase text-slate-500 font-bold mb-0.5">Lot Size</div>
                      <div className="text-xs font-mono font-black text-indigo-400">
                        {stock.lotSizeAug2026 ?? stock.lotSizeJul2026 ?? stock.lotSizeJun2026 ?? '-'}
                      </div>
                    </div>
                    <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800">
                      <div className="text-[10px] uppercase text-slate-500 font-bold mb-0.5">RSI (14)</div>
                      <div className={`text-xs font-mono font-black ${
                        (stock.rsi ?? 50) >= 60 ? 'text-emerald-400' : (stock.rsi ?? 50) <= 40 ? 'text-rose-400' : 'text-slate-300'
                      }`}>
                        {stock.rsi !== undefined && stock.rsi !== null ? stock.rsi.toFixed(1) : '-'}
                      </div>
                    </div>
                    <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800">
                      <div className="text-[10px] uppercase text-slate-500 font-bold mb-0.5">Vol Ratio</div>
                      <div className={`text-xs font-mono font-black ${
                        (stock.volumeRatio ?? 1) >= 1.5 ? 'text-amber-400' : 'text-slate-300'
                      }`}>
                        {stock.volumeRatio !== undefined ? `${stock.volumeRatio.toFixed(1)}x` : '-'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="p-4 pt-0 flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenPositionSizer(stock);
                  }}
                  className={`flex-1 font-bold text-xs py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 ${
                    isBull 
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white' 
                      : 'bg-rose-600 hover:bg-rose-500 text-white'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Plan Trade
                </button>

                {onOpenRsiAnalyst && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenRsiAnalyst(stock);
                    }}
                    className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors border border-slate-700"
                    title="15m RSI Timeline"
                  >
                    <Activity className="w-4 h-4 text-cyan-400" />
                  </button>
                )}

                {stock.screenerUrl && (
                  <a
                    href={stock.screenerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors border border-slate-700"
                    title="External Screener Chart"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredStocks.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-slate-500" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No Matching Stocks Found</h3>
          <p className="text-slate-400 max-w-md mx-auto text-sm">
            {searchTerm 
              ? `No stocks matching "${searchTerm}" found in this scan.`
              : matchAccuracy === 'EXACT_ONLY'
              ? `No stocks currently have an exact 0.00 difference (Open = Low or Open = High). Try switching to "All Matches" to view near matches, or click "Sync Dhan OHLC" to pull the latest exchange feeds.`
              : `No stocks currently meet the Open = ${filterType === 'OPEN_LOW' ? 'Low' : filterType === 'OPEN_HIGH' ? 'High' : 'High/Low'} criteria based on the current data source.`}
          </p>
          {onFetchAll && (
            <button
              onClick={onFetchAll}
              disabled={isBulkLoading}
              className="mt-5 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl inline-flex items-center gap-2 shadow-md transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${isBulkLoading ? 'animate-spin' : ''}`} />
              <span>Fetch Latest Dhan Live Data</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
