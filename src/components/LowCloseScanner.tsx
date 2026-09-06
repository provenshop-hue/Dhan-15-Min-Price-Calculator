import React, { useState, useMemo } from 'react';
import { StockCalculated, DhanApiCredentials } from '../types';
import {
  Scale,
  TrendingDown,
  TrendingUp,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  Calculator,
  Target,
  BarChart3,
  ShieldCheck,
  AlertCircle,
  Clock,
  Zap,
  Flame,
  HelpCircle,
  SlidersHorizontal,
  ChevronRight,
  ArrowDownRight
} from 'lucide-react';

interface Props {
  stocks: StockCalculated[];
  credentials?: DhanApiCredentials;
  onSelectStockDetail: (stock: StockCalculated) => void;
  onOpenPositionSizer?: (stock: StockCalculated) => void;
  onOpenRsiAnalyst?: (stock: StockCalculated) => void;
  onFetchSingleStock?: (stock: StockCalculated) => void;
  onFetchAll?: () => void;
  isBulkLoading?: boolean;
}

export interface LowCloseAnalyzedStock extends StockCalculated {
  effectiveOpen: number;
  effectiveHigh: number;
  effectiveLow: number;
  effectiveClose: number;
  diff: number;
  diffPct: number;
  isExactMatch: boolean;
  candleRange: number;
  candleType: 'BEARISH_MARUBOZU' | 'RED_CANDLE' | 'FLAT_BOTTOM_DOJI' | 'GREEN_CANDLE';
}

export function LowCloseScanner({
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
  const [matchFilter, setMatchFilter] = useState<'ALL' | 'EXACT_ONLY' | 'NEAR_ONLY'>('ALL');
  const [minPrice, setMinPrice] = useState<number>(1000);
  const [sortBy, setSortBy] = useState<'DIFF_ASC' | 'PRICE_DESC' | 'PCT_ASC' | 'VOL_DESC'>('DIFF_ASC');
  const [showGuide, setShowGuide] = useState(false);

  // Scan stocks where price > 1000 and Low == Close
  const { allAbove1000Count, scannedStocks } = useMemo(() => {
    let countAbove1000 = 0;

    const list: LowCloseAnalyzedStock[] = [];

    stocks.forEach((s) => {
      // Use official NSE Day Session data from Dhan API as primary
      const open = s.dayOpen ?? s.openPrice ?? s.first15mOpen ?? s.first1mOpen;
      const high = s.dayHigh ?? s.highPrice ?? s.first15mHigh ?? s.first1mHigh;
      const low = s.dayLow ?? s.lowPrice ?? s.first15mLow ?? s.first1mLow;
      const close = s.dayClose ?? s.ltp ?? s.closePrice ?? s.first15mClose ?? s.first1mClose;

      if (open == null || high == null || low == null || close == null) {
        return;
      }

      // Check price threshold (> 1000)
      if (close > 1000 || open > 1000) {
        countAbove1000++;
      }

      // Filter by minimum price requirement (> 1000)
      if (close <= minPrice) {
        return;
      }

      const diff = Math.round(Math.abs(close - low) * 100) / 100;
      const diffPct = close > 0 ? (diff / close) * 100 : 0;

      // Exact match: 0.00 pure difference or within NSE tick (₹0.05)
      const isPureExact = Math.round(close * 100) === Math.round(low * 100) || diff === 0;
      const isExactMatch = isPureExact || diff <= 0.05;
      
      // Near match: within 0.15% or within 50 paise
      const isNearMatch = diffPct <= 0.15 || diff <= 0.50;

      if (!isExactMatch && !isNearMatch) {
        return;
      }

      const candleRange = high - low;
      let candleType: LowCloseAnalyzedStock['candleType'] = 'RED_CANDLE';

      if (Math.abs(open - high) < 0.05 && isExactMatch) {
        candleType = 'BEARISH_MARUBOZU'; // Open = High and Low = Close (Full Red Body)
      } else if (open > close && isExactMatch) {
        candleType = 'BEARISH_MARUBOZU';
      } else if (Math.abs(open - close) < 0.20 && isExactMatch) {
        candleType = 'FLAT_BOTTOM_DOJI';
      } else if (close > open) {
        candleType = 'GREEN_CANDLE';
      }

      list.push({
        ...s,
        effectiveOpen: open,
        effectiveHigh: high,
        effectiveLow: low,
        effectiveClose: close,
        diff,
        diffPct,
        isExactMatch,
        candleRange,
        candleType
      });
    });

    return {
      allAbove1000Count: countAbove1000,
      scannedStocks: list
    };
  }, [stocks, minPrice]);

  // Filter and sort the scanned stocks
  const filteredStocks = useMemo(() => {
    let result = scannedStocks.filter((s) => {
      // Match filter
      if (matchFilter === 'EXACT_ONLY' && !s.isExactMatch) return false;
      if (matchFilter === 'NEAR_ONLY' && s.isExactMatch) return false;

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const symMatch = s.symbol.toLowerCase().includes(query);
        const nameMatch = s.companyName.toLowerCase().includes(query);
        if (!symMatch && !nameMatch) return false;
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'DIFF_ASC') {
        if (a.isExactMatch && !b.isExactMatch) return -1;
        if (!a.isExactMatch && b.isExactMatch) return 1;
        return a.diff - b.diff || (b.effectiveClose - a.effectiveClose);
      }
      if (sortBy === 'PRICE_DESC') {
        return b.effectiveClose - a.effectiveClose;
      }
      if (sortBy === 'PCT_ASC') {
        return (a.pctChange ?? 0) - (b.pctChange ?? 0);
      }
      if (sortBy === 'VOL_DESC') {
        return (b.volumeRatio ?? 0) - (a.volumeRatio ?? 0) || ((b.volume ?? 0) - (a.volume ?? 0));
      }
      return 0;
    });

    return result;
  }, [scannedStocks, matchFilter, searchTerm, sortBy]);

  // Counts
  const exactMatchCount = scannedStocks.filter((s) => s.isExactMatch).length;
  const nearMatchCount = scannedStocks.filter((s) => !s.isExactMatch).length;

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 rounded-2xl border border-slate-700 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl translate-y-1/2 pointer-events-none" />

        <div className="relative z-10 space-y-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2.5 bg-gradient-to-br from-rose-500 to-amber-600 text-white rounded-xl shadow-lg shadow-rose-500/20">
              <Scale className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>Low = Close Scanner</span>
              <span className="bg-amber-400 text-slate-950 text-xs px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider shadow-sm">
                Price &gt; ₹1,000
              </span>
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            High-value institutional F&amp;O stocks priced above <strong className="text-amber-300">₹1,000</strong> whose <strong className="text-rose-300">Low Price and Close Price are identical</strong> (zero lower shadow / closing at the day&apos;s lowest level).
          </p>
        </div>

        {/* Action Controls & Guide Toggle */}
        <div className="relative z-10 flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-600 transition-colors shadow-sm"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span>{showGuide ? 'Hide Strategy Guide' : 'Strategy Guide'}</span>
          </button>

          {onFetchAll && (
            <button
              onClick={onFetchAll}
              disabled={isBulkLoading}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black shadow-md transition-all hover:scale-105 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isBulkLoading ? 'animate-spin' : ''}`} />
              <span>{isBulkLoading ? 'Fetching Live...' : 'Refresh All Prices'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Educational Strategy Guide (Collapsible) */}
      {showGuide && (
        <div className="p-5 bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/40 rounded-2xl shadow-lg space-y-3 animate-fade-in text-xs text-slate-200">
          <div className="flex items-center gap-2 text-amber-300 font-black text-sm">
            <Zap className="w-4 h-4" />
            <span>Why &quot;Low = Close (Price &gt; 1000)&quot; is a Critical Technical Setup</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 space-y-1.5">
              <span className="font-bold text-amber-300 flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                1. Pure Seller Dominance
              </span>
              <p className="text-slate-300 leading-relaxed">
                When Close equals Low, the candle has <strong>no lower wick</strong>. Bulls were unable to push the stock even 1 tick off its low before candle close, showing persistent institutional selling pressure.
              </p>
            </div>
            <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 space-y-1.5">
              <span className="font-bold text-amber-300 flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-blue-400" />
                2. High-Price (&gt; ₹1,000) Edge
              </span>
              <p className="text-slate-300 leading-relaxed">
                Stocks above ₹1,000 (e.g. TCS, Reliance, Bajaj twins) feature tight spreads and deep order books. A Low=Close pattern in these names indicates real institutional flow rather than retail noise.
              </p>
            </div>
            <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 space-y-1.5">
              <span className="font-bold text-amber-300 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                3. Trade Execution Rules
              </span>
              <p className="text-slate-300 leading-relaxed">
                <strong>Breakdown Continuation:</strong> Enter Short on a 1-min break below Low. <br />
                <strong>Counter-Trend Bounce:</strong> If at major Gann support with RSI &lt; 30, watch for sudden short squeeze when Low holds.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Metrics & Filter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Stocks &gt; ₹1,000 Scanned</div>
          <div className="text-2xl font-black text-slate-900">{allAbove1000Count}</div>
          <div className="text-[10px] text-slate-500">From total {stocks.length} F&amp;O stocks</div>
        </div>

        <div className="p-4 bg-gradient-to-br from-rose-50 to-white rounded-xl border border-rose-200/90 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1">
            <span>Exact Low = Close</span>
            <span className="bg-rose-100 text-rose-800 text-[9px] px-1.5 rounded-full font-black">Diff 0.00</span>
          </div>
          <div className="text-2xl font-black text-rose-600">{exactMatchCount}</div>
          <div className="text-[10px] text-rose-600/80">Low === Close (Zero lower wick)</div>
        </div>

        <div className="p-4 bg-gradient-to-br from-amber-50 to-white rounded-xl border border-amber-200/90 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
            <span>Near Low = Close</span>
            <span className="bg-amber-100 text-amber-900 text-[9px] px-1.5 rounded-full font-black">≤ 0.15%</span>
          </div>
          <div className="text-2xl font-black text-amber-700">{nearMatchCount}</div>
          <div className="text-[10px] text-amber-700/80">Closed within 0.15% of Low</div>
        </div>

        <div className="p-4 bg-gradient-to-br from-indigo-50 to-white rounded-xl border border-indigo-200/90 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Active Qualified Hits</div>
          <div className="text-2xl font-black text-indigo-900">{filteredStocks.length}</div>
          <div className="text-[10px] text-indigo-600">Meeting all active filters</div>
        </div>
      </div>

      {/* Control Bar: Search, Match Filter, Price Threshold, and Sort */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5">
        
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search symbol (e.g. TCS, RELIANCE, BAJFINANCE)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition-all text-slate-900"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs font-semibold">
          {/* Match Type Pills */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setMatchFilter('ALL')}
              className={`px-3 py-1 rounded-lg transition-all ${
                matchFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Matches ({scannedStocks.length})
            </button>
            <button
              onClick={() => setMatchFilter('EXACT_ONLY')}
              className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1 ${
                matchFilter === 'EXACT_ONLY'
                  ? 'bg-rose-600 text-white shadow-2xs font-bold'
                  : 'text-rose-700 hover:text-rose-900 hover:bg-rose-50'
              }`}
            >
              <span>Exact Only</span>
              <span className={`text-[9px] px-1 rounded-full ${matchFilter === 'EXACT_ONLY' ? 'bg-white/20' : 'bg-rose-100'}`}>
                {exactMatchCount}
              </span>
            </button>
            <button
              onClick={() => setMatchFilter('NEAR_ONLY')}
              className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1 ${
                matchFilter === 'NEAR_ONLY'
                  ? 'bg-amber-600 text-white shadow-2xs font-bold'
                  : 'text-amber-700 hover:text-amber-900 hover:bg-amber-50'
              }`}
            >
              <span>Near Only</span>
              <span className={`text-[9px] px-1 rounded-full ${matchFilter === 'NEAR_ONLY' ? 'bg-white/20' : 'bg-amber-100'}`}>
                {nearMatchCount}
              </span>
            </button>
          </div>

          {/* Min Price Filter */}
          <div className="flex items-center space-x-1 bg-slate-100 px-2 py-1 rounded-xl border border-slate-200/80 text-slate-700">
            <span className="text-[11px] text-slate-500">Min Price:</span>
            <select
              value={minPrice}
              onChange={(e) => setMinPrice(Number(e.target.value))}
              className="bg-transparent border-0 text-xs font-bold text-slate-900 focus:ring-0 cursor-pointer"
            >
              <option value={1000}>&gt; ₹1,000 (Default)</option>
              <option value={2000}>&gt; ₹2,000</option>
              <option value={3000}>&gt; ₹3,000</option>
              <option value={5000}>&gt; ₹5,000</option>
            </select>
          </div>

          {/* Sort By Selector */}
          <div className="flex items-center space-x-1 bg-slate-100 px-2 py-1 rounded-xl border border-slate-200/80 text-slate-700">
            <span className="text-[11px] text-slate-500">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent border-0 text-xs font-bold text-slate-900 focus:ring-0 cursor-pointer"
            >
              <option value="DIFF_ASC">Lowest Diff (Exact first)</option>
              <option value="PRICE_DESC">Highest Price</option>
              <option value="PCT_ASC">Most Bearish (% Change)</option>
              <option value="VOL_DESC">Highest Volume Ratio</option>
            </select>
          </div>
        </div>

      </div>

      {/* Results Table / Cards */}
      {filteredStocks.length > 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900 text-white font-bold border-b border-slate-800 select-none">
                  <th className="py-3 px-4">Stock &amp; Company</th>
                  <th className="py-3 px-3 text-right">Close / LTP</th>
                  <th className="py-3 px-3 text-right">Low Price</th>
                  <th className="py-3 px-3 text-center">Low vs Close Diff</th>
                  <th className="py-3 px-3 text-right">Open &amp; High</th>
                  <th className="py-3 px-3 text-center">Candle Pattern</th>
                  <th className="py-3 px-3 text-center">Change %</th>
                  <th className="py-3 px-3 text-center">Volume &amp; RSI</th>
                  <th className="py-3 px-3 text-center">Gann 45° Levels</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredStocks.map((stock) => {
                  const pct = stock.pctChange ?? 0;
                  const isPositive = pct >= 0;
                  const rsi = stock.rsi;
                  const volumeRatio = stock.volumeRatio;

                  return (
                    <tr
                      key={stock.id || stock.symbol}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Stock Symbol & Company */}
                      <td className="py-3.5 px-4 font-sans">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onSelectStockDetail(stock)}
                            className="text-left group-hover:text-blue-600 transition-colors"
                          >
                            <span className="text-sm font-black text-slate-900 font-mono block">
                              {stock.symbol}
                            </span>
                            <span className="text-[11px] text-slate-500 truncate max-w-[150px] block">
                              {stock.companyName}
                            </span>
                          </button>
                        </div>
                        {stock.lotSizeJun2026 && (
                          <span className="inline-block mt-0.5 text-[9.5px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded border border-slate-200/80">
                            Lot: {stock.lotSizeJun2026}
                          </span>
                        )}
                      </td>

                      {/* Close / LTP */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="text-sm font-black text-slate-900">
                          ₹{stock.effectiveClose.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <span className="text-[10px] text-slate-400">Price &gt; ₹1,000</span>
                      </td>

                      {/* Low Price */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="text-sm font-black text-rose-600">
                          ₹{stock.effectiveLow.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <span className="text-[10px] text-rose-500/80 font-bold">Session Low</span>
                      </td>

                      {/* Low vs Close Difference & Badge */}
                      <td className="py-3.5 px-3 text-center">
                        {stock.isExactMatch ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="px-2.5 py-1 rounded-full bg-rose-600 text-white font-black text-[10.5px] tracking-wide shadow-xs flex items-center gap-1">
                              <Scale className="w-3 h-3" />
                              <span>EXACT MATCH</span>
                            </span>
                            <span className="text-[10px] text-rose-700 font-bold mt-0.5">
                              Diff: ₹{stock.diff.toFixed(2)} (0.00%)
                            </span>
                          </div>
                        ) : (
                          <div className="inline-flex flex-col items-center">
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[10px]">
                              NEAR MATCH
                            </span>
                            <span className="text-[10px] text-amber-800 font-semibold mt-0.5">
                              Diff: ₹{stock.diff.toFixed(2)} ({stock.diffPct.toFixed(2)}%)
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Open & High */}
                      <td className="py-3.5 px-3 text-right text-[11px]">
                        <div className="text-slate-700">
                          <span className="text-slate-400">O:</span> ₹{stock.effectiveOpen.toFixed(2)}
                        </div>
                        <div className="text-slate-700">
                          <span className="text-slate-400">H:</span> ₹{stock.effectiveHigh.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Range: ₹{stock.candleRange.toFixed(2)}
                        </div>
                      </td>

                      {/* Candle Pattern */}
                      <td className="py-3.5 px-3 text-center font-sans">
                        {stock.candleType === 'BEARISH_MARUBOZU' ? (
                          <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-black uppercase inline-flex items-center gap-1">
                            <TrendingDown className="w-3 h-3" />
                            Bearish Marubozu
                          </span>
                        ) : stock.candleType === 'FLAT_BOTTOM_DOJI' ? (
                          <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200 text-[10px] font-black uppercase">
                            Flat Bottom Doji
                          </span>
                        ) : stock.candleType === 'GREEN_CANDLE' ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                            Green (Low=Close)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-semibold">
                            Red Candle Low
                          </span>
                        )}
                      </td>

                      {/* Change % */}
                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`px-2 py-1 rounded-md text-xs font-black inline-block ${
                            isPositive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {isPositive ? '+' : ''}{pct.toFixed(2)}%
                        </span>
                      </td>

                      {/* Volume & RSI */}
                      <td className="py-3.5 px-3 text-center text-[11px]">
                        {volumeRatio ? (
                          <div className="font-bold text-slate-800">
                            {volumeRatio.toFixed(1)}x Vol
                          </div>
                        ) : (
                          <div className="text-slate-400">Vol: {stock.volume ? stock.volume.toLocaleString('en-IN') : '-'}</div>
                        )}
                        {rsi ? (
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded inline-block mt-0.5 ${
                            rsi <= 30
                              ? 'bg-emerald-100 text-emerald-800'
                              : rsi >= 70
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            RSI: {rsi.toFixed(0)}
                          </span>
                        ) : null}
                      </td>

                      {/* Gann 45° Levels */}
                      <td className="py-3.5 px-3 text-center text-[10.5px]">
                        {stock.buyAbove ? (
                          <div className="text-emerald-700 font-bold">
                            Buy &gt; ₹{stock.buyAbove.toFixed(1)}
                          </div>
                        ) : null}
                        {stock.sellBelow ? (
                          <div className="text-rose-600 font-bold">
                            Sell &lt; ₹{stock.sellBelow.toFixed(1)}
                          </div>
                        ) : null}
                        {!stock.buyAbove && !stock.sellBelow && (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center font-sans">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Stock Detail Modal */}
                          <button
                            onClick={() => onSelectStockDetail(stock)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                            title="View Full Analysis & Gann Calculations"
                          >
                            <BarChart3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Position Sizer */}
                          {onOpenPositionSizer && (
                            <button
                              onClick={() => onOpenPositionSizer(stock)}
                              className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg transition-colors"
                              title="Calculate F&O Lot Position Size & Risk"
                            >
                              <Calculator className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* RSI Analyst */}
                          {onOpenRsiAnalyst && (
                            <button
                              onClick={() => onOpenRsiAnalyst(stock)}
                              className="p-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg transition-colors"
                              title="RSI Divergence & Momentum Analyst"
                            >
                              <Zap className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Single Stock Fetch */}
                          {onFetchSingleStock && (
                            <button
                              onClick={() => onFetchSingleStock(stock)}
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg transition-colors"
                              title="Fetch Fresh 15-Min Dhan Candle"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* External Screener / TradingView */}
                          {stock.screenerUrl && (
                            <a
                              href={stock.screenerUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-lg border border-slate-200 transition-colors"
                              title="Open External Screener Chart"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Empty State / No Hits */
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-4 shadow-sm">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <Scale className="w-8 h-8 text-rose-500/70" />
          </div>

          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base font-black text-slate-900">
              No Stocks Found with Price &gt; ₹{minPrice} &amp; Low = Close
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {allAbove1000Count === 0
                ? 'Stock prices have not been fetched from Dhan HQ API yet. Click below to fetch real-time candle data across all F&O stocks.'
                : 'No stocks currently meet this strict criteria. In active trading hours, Low = Close signals trigger when high-priced stocks experience aggressive selling or close at their interval bottoms.'}
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            {allAbove1000Count === 0 && onFetchAll ? (
              <button
                onClick={onFetchAll}
                disabled={isBulkLoading}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isBulkLoading ? 'animate-spin' : ''}`} />
                <span>Fetch Live Market Prices</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setMatchFilter('ALL');
                  setSearchTerm('');
                  setMinPrice(1000);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition-colors"
              >
                Reset All Filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Summary Footer Card */}
      <div className="p-4 bg-slate-100/90 rounded-xl border border-slate-200/80 text-xs text-slate-600 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>
            Scanned across <strong>{stocks.length} F&amp;O Master Stocks</strong> using real-time Dhan 15-Minute &amp; 1-Minute Candle Data.
          </span>
        </div>
        <div className="flex items-center gap-4 text-slate-500 font-mono text-[11px]">
          <span>Price Filter: &gt; ₹{minPrice}</span>
          <span>•</span>
          <span>Tick Precision: 0.05</span>
        </div>
      </div>

    </div>
  );
}
