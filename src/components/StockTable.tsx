import React, { useState } from 'react';
import { Search, Filter, ExternalLink, RefreshCw, Eye, Edit3, TrendingUp, TrendingDown, Check, ArrowUpDown, ChevronLeft, ChevronRight, Layers, ShieldCheck, Target, ArrowUpRight, ArrowDownRight, Calculator, Percent, Pin } from 'lucide-react';
import { StockCalculated, DhanApiCredentials, TrendFilterType } from '../types';
import { calculateGann15Min, getAtmOptionStrikes, calculateFibonacci382 } from '../utils/gann';

interface StockTableProps {
  stocks: StockCalculated[];
  onUpdateStockPrices: (stockId: string, openPrice: number, closePrice: number, highPrice?: number | null, lowPrice?: number | null) => void;
  onFetchSingleStock: (stock: StockCalculated) => void;
  onSelectStockDetail: (stock: StockCalculated) => void;
  onEditStockManual: (stock: StockCalculated) => void;
  onOpenPositionSizer?: (stock?: StockCalculated) => void;
  credentials: DhanApiCredentials;
  activeTrendFilter?: TrendFilterType;
  onTrendFilterChange?: (filter: TrendFilterType) => void;
}

export const StockTable: React.FC<StockTableProps> = ({
  stocks,
  onUpdateStockPrices,
  onFetchSingleStock,
  onSelectStockDetail,
  onEditStockManual,
  onOpenPositionSizer,
  credentials,
  activeTrendFilter,
  onTrendFilterChange
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [internalTrendFilter, setInternalTrendFilter] = useState<TrendFilterType>('ALL');
  
  const trendFilter = activeTrendFilter !== undefined ? activeTrendFilter : internalTrendFilter;

  const setTrendFilter = (filter: TrendFilterType) => {
    if (onTrendFilterChange) {
      onTrendFilterChange(filter);
    } else {
      setInternalTrendFilter(filter);
    }
  };

  const [lotMonth, setLotMonth] = useState<'Jun' | 'Jul' | 'Aug'>('Jun');

  // Sticky / Pinned Stocks state (persisted in localStorage)
  const [pinnedStockIds, setPinnedStockIds] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('gann_pinned_stock_ids');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return new Set(parsed);
      } catch (e) {
        console.error('Failed to parse pinned stocks', e);
      }
    }
    return new Set<string>();
  });

  const togglePin = (stockId: string) => {
    setPinnedStockIds((prev) => {
      const next = new Set(prev);
      if (next.has(stockId)) {
        next.delete(stockId);
      } else {
        next.add(stockId);
      }
      localStorage.setItem('gann_pinned_stock_ids', JSON.stringify(Array.from(next)));
      return next;
    });
  };

  const clearAllPins = () => {
    setPinnedStockIds(new Set());
    localStorage.removeItem('gann_pinned_stock_ids');
  };

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Sorting
  const [sortField, setSortField] = useState<'symbol' | 'openCalc' | 'closeCalc' | 'companyName' | 'volume' | 'pctChange'>('symbol');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Helper check for O=L / O=H with strict exact match
  const isStockOpenEqualLow = (s: StockCalculated) => {
    if (s.isOpenEqualLow !== undefined) return s.isOpenEqualLow;
    if (!s.openPrice || s.openPrice <= 0) return false;
    const low = s.lowPrice !== undefined && s.lowPrice !== null ? s.lowPrice : Math.min(s.openPrice, s.closePrice || s.openPrice);
    return Math.abs(s.openPrice - low) < 0.001;
  };

  const isStockOpenEqualHigh = (s: StockCalculated) => {
    if (s.isOpenEqualHigh !== undefined) return s.isOpenEqualHigh;
    if (!s.openPrice || s.openPrice <= 0) return false;
    const high = s.highPrice !== undefined && s.highPrice !== null ? s.highPrice : Math.max(s.openPrice, s.closePrice || s.openPrice);
    return Math.abs(s.openPrice - high) < 0.001;
  };

  // Helper check for Fibonacci 38.2% Retracement
  const isStockFib382Retrace = (s: StockCalculated) => {
    if (s.isFib382Retrace) return true;
    const cmp = s.closePrice || s.openPrice || 0;
    const fibData = calculateFibonacci382(s.highPrice, s.lowPrice, cmp);
    return fibData?.isFib382Retraced ?? false;
  };

  // Count metrics
  const openLowCount = stocks.filter(isStockOpenEqualLow).length;
  const openHighCount = stocks.filter(isStockOpenEqualHigh).length;
  const fib382Count = stocks.filter(isStockFib382Retrace).length;
  const veryBullishCount = stocks.filter((s) => s.trend === 'Very Bullish').length;
  const bullishCount = stocks.filter((s) => s.trend === 'Bullish' || s.trend === 'Very Bullish').length;
  const veryBearishCount = stocks.filter((s) => s.trend === 'Very Bearish').length;
  const bearishCount = stocks.filter((s) => s.trend === 'Bearish' || s.trend === 'Very Bearish').length;

  // Filter stocks
  const filteredStocks = stocks.filter((s) => {
    const matchesSearch =
      s.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.companyName.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (trendFilter === 'OPEN_LOW') return isStockOpenEqualLow(s);
    if (trendFilter === 'OPEN_HIGH') return isStockOpenEqualHigh(s);
    if (trendFilter === 'FIB_382_RETRACE') return isStockFib382Retrace(s);
    if (trendFilter === 'VERY_BULLISH') return s.trend === 'Very Bullish';
    if (trendFilter === 'BULLISH') return s.trend === 'Bullish' || s.trend === 'Very Bullish';
    if (trendFilter === 'VERY_BEARISH') return s.trend === 'Very Bearish';
    if (trendFilter === 'BEARISH') return s.trend === 'Bearish' || s.trend === 'Very Bearish';
    if (trendFilter === 'CALCULATED') return s.isFetched || (s.openPrice !== undefined && s.openPrice !== null && s.openPrice > 0);

    return true;
  });

  // Sort stocks (pinned/checked stocks always stay sticky on top)
  const sortedStocks = [...filteredStocks].sort((a, b) => {
    const aPinned = pinnedStockIds.has(a.id);
    const bPinned = pinnedStockIds.has(b.id);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;

    let aVal: any = a[sortField];
    let bVal: any = b[sortField];

    if (aVal === undefined || aVal === null) aVal = -999999;
    if (bVal === undefined || bVal === null) bVal = -999999;

    if (typeof aVal === 'string') {
      return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
  });

  // Pagination calculation
  const totalPages = Math.ceil(sortedStocks.length / itemsPerPage) || 1;
  const paginatedStocks = sortedStocks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const toggleSort = (field: 'symbol' | 'openCalc' | 'closeCalc' | 'companyName' | 'volume') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const isAllFilteredPinned =
    filteredStocks.length > 0 && filteredStocks.every((s) => pinnedStockIds.has(s.id));

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
      
      {/* Table Controls Bar */}
      <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search stock by symbol or company name (e.g. RELIANCE, ADANIENT)..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-white border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 outline-none font-medium placeholder-slate-400 transition-colors shadow-2xs"
          />
        </div>

        {/* Filters & Pinned Controls */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Sticky Pinned Counter & Clear Button */}
          {pinnedStockIds.size > 0 && (
            <button
              onClick={clearAllPins}
              className="px-2.5 py-1 rounded-xl bg-amber-500 text-white hover:bg-amber-600 font-extrabold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
              title="Click to clear all sticky pinned stocks"
            >
              <Pin className="w-3.5 h-3.5 fill-current" />
              <span>Sticky Pinned ({pinnedStockIds.size}) ✕</span>
            </button>
          )}

          {/* Trend filter buttons */}
          <div className="flex flex-wrap items-center bg-slate-200/60 p-1 rounded-xl border border-slate-200 text-xs gap-1">
            <button
              onClick={() => { setTrendFilter('ALL'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                trendFilter === 'ALL' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({stocks.length})
            </button>
            <button
              onClick={() => { setTrendFilter('OPEN_LOW'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-lg font-extrabold transition-colors flex items-center gap-1 ${
                trendFilter === 'OPEN_LOW'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200 border border-emerald-300/60'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-300" />
              Open = Low ({openLowCount})
            </button>
            <button
              onClick={() => { setTrendFilter('OPEN_HIGH'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-lg font-extrabold transition-colors flex items-center gap-1 ${
                trendFilter === 'OPEN_HIGH'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-rose-800 bg-rose-100/80 hover:bg-rose-200 border border-rose-300/60'
              }`}
            >
              <Target className="w-3.5 h-3.5 text-rose-600 dark:text-rose-300" />
              Open = High ({openHighCount})
            </button>
            <button
              onClick={() => { setTrendFilter('FIB_382_RETRACE'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-lg font-extrabold transition-colors flex items-center gap-1 ${
                trendFilter === 'FIB_382_RETRACE'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-amber-900 bg-amber-100/80 hover:bg-amber-200 border border-amber-300/70'
              }`}
            >
              <Percent className="w-3.5 h-3.5 text-amber-600" />
              Fib 38.2% Retrace ({fib382Count})
            </button>
            <button
              onClick={() => { setTrendFilter('VERY_BULLISH'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-lg font-extrabold transition-colors flex items-center gap-1 ${
                trendFilter === 'VERY_BULLISH' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              🚀 Very Bullish ({veryBullishCount})
            </button>
            <button
              onClick={() => { setTrendFilter('BULLISH'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                trendFilter === 'BULLISH' ? 'bg-emerald-700 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bullish ({bullishCount})
            </button>
            <button
              onClick={() => { setTrendFilter('VERY_BEARISH'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-lg font-extrabold transition-colors flex items-center gap-1 ${
                trendFilter === 'VERY_BEARISH' ? 'bg-rose-600 text-white shadow-2xs' : 'text-rose-700 hover:bg-rose-100'
              }`}
            >
              📉 Very Bearish ({veryBearishCount})
            </button>
            <button
              onClick={() => { setTrendFilter('BEARISH'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                trendFilter === 'BEARISH' ? 'bg-rose-700 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bearish ({bearishCount})
            </button>
            <button
              onClick={() => { setTrendFilter('CALCULATED'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                trendFilter === 'CALCULATED' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Calculated
            </button>
          </div>

          {/* Lot month selector */}
          <div className="flex items-center bg-slate-200/60 p-1 rounded-xl border border-slate-200 text-xs">
            <span className="text-[10px] text-slate-600 px-1.5 font-medium flex items-center gap-1">
              <Layers className="w-3 h-3 text-blue-600" /> Lot:
            </span>
            {(['Jun', 'Jul', 'Aug'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setLotMonth(m)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  lotMonth === m ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {m} '26
              </button>
            ))}
          </div>

        </div>

      </div>

      {/* Main Stock Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100/80 text-slate-600 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
              {/* Sticky Pin Checkbox Column Header */}
              <th className="py-3 px-3 text-center w-12 bg-amber-50/60 border-r border-amber-200/60">
                <div className="flex items-center justify-center gap-1">
                  <input
                    type="checkbox"
                    checked={isAllFilteredPinned}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const next = new Set(pinnedStockIds);
                        filteredStocks.forEach((s) => next.add(s.id));
                        setPinnedStockIds(next);
                        localStorage.setItem('gann_pinned_stock_ids', JSON.stringify(Array.from(next)));
                      } else {
                        const next = new Set(pinnedStockIds);
                        filteredStocks.forEach((s) => next.delete(s.id));
                        setPinnedStockIds(next);
                        localStorage.setItem('gann_pinned_stock_ids', JSON.stringify(Array.from(next)));
                      }
                    }}
                    title={isAllFilteredPinned ? "Unpin all visible stocks" : "Pin all visible stocks to stay on top"}
                    className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer accent-amber-600"
                  />
                  <Pin className="w-3 h-3 text-amber-600 fill-amber-500" title="Sticky Pin Column" />
                </div>
              </th>
              <th className="py-3 px-4">
                <button
                  onClick={() => toggleSort('symbol')}
                  className="flex items-center gap-1 hover:text-slate-900 transition-colors"
                >
                  Symbol / Company <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-3 px-3 text-center">Lot Size ({lotMonth} '26)</th>
              <th className="py-3 px-3 text-right">15-Min Open (₹)</th>
              <th className="py-3 px-3 text-right">15-Min Close (₹)</th>
              <th className="py-3 px-3 text-right">
                <button
                  onClick={() => toggleSort('volume')}
                  className="flex items-center justify-end gap-1 hover:text-slate-900 transition-colors"
                >
                  Volume <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-3 px-3 text-right">
                <button
                  onClick={() => toggleSort('openCalc')}
                  className="flex items-center justify-end gap-1 hover:text-blue-800 transition-colors text-blue-700 font-bold"
                >
                  Open Calc <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-3 px-3 text-right">
                <button
                  onClick={() => toggleSort('closeCalc')}
                  className="flex items-center justify-end gap-1 hover:text-blue-800 transition-colors text-blue-700 font-bold"
                >
                  Close Calc <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-3 px-3 text-center bg-purple-50/80 text-purple-900 font-extrabold border-x border-purple-200/80">
                ATM Option Strikes (CE & PE)
              </th>
              <th className="py-3 px-3 text-center">Trend / Signal</th>
              <th className="py-3 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {paginatedStocks.length === 0 ? (
              <tr>
                <td colSpan={11} className="text-center py-12 text-slate-400">
                  No stocks match the selected search or filter criteria.
                </td>
              </tr>
            ) : (
              paginatedStocks.map((stock) => {
                const lotSize =
                  lotMonth === 'Jun'
                    ? stock.lotSizeJun2026
                    : lotMonth === 'Jul'
                    ? stock.lotSizeJul2026
                    : stock.lotSizeAug2026;

                const isPinned = pinnedStockIds.has(stock.id);

                return (
                  <tr 
                    key={stock.id} 
                    className={`transition-colors group ${
                      isPinned 
                        ? 'bg-amber-50/80 hover:bg-amber-100/80 font-medium' 
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    {/* Sticky Checkbox Pin Column */}
                    <td className="py-2.5 px-3 text-center bg-amber-50/40 border-r border-amber-200/40">
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="checkbox"
                          checked={isPinned}
                          onChange={() => togglePin(stock.id)}
                          title={isPinned ? "Uncheck to unpin stock from top" : "Check to pin stock to always stay on top"}
                          className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer accent-amber-600 transition-transform active:scale-95"
                        />
                        {isPinned && (
                          <Pin className="w-3.5 h-3.5 text-amber-600 fill-amber-500" title="Sticky on Top" />
                        )}
                      </div>
                    </td>
                    {/* Symbol & Company */}
                    <td className="py-2.5 px-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          {stock.symbol}
                        </span>
                        <a
                          href={stock.screenerUrl}
                          target="_blank"
                          rel="noreferrer"
                          title="Open Screener page"
                          className="text-slate-400 hover:text-blue-600 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        {isStockOpenEqualLow(stock) && (
                          <span
                            title="Open = Low pattern detected (Bullish Intraday Setup)"
                            className="text-[10px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded flex items-center gap-0.5 shadow-2xs"
                          >
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            O=L
                          </span>
                        )}
                        {isStockOpenEqualHigh(stock) && (
                          <span
                            title="Open = High pattern detected (Bearish Intraday Setup)"
                            className="text-[10px] font-black text-rose-800 bg-rose-100 border border-rose-300 px-1.5 py-0.5 rounded flex items-center gap-0.5 shadow-2xs"
                          >
                            <Target className="w-3 h-3 text-rose-600" />
                            O=H
                          </span>
                        )}
                        {stock.error && (
                          <span
                            title={stock.error}
                            className="text-[10px] font-medium text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded cursor-help truncate max-w-[90px]"
                          >
                            Failed
                          </span>
                        )}
                        {stock.isFetched && !stock.error && (
                          <span
                            title={stock.candleTimestamp ? `Candle: ${stock.candleTimestamp}` : 'Fetched'}
                            className="text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded"
                          >
                            Live
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                        {stock.companyName}
                      </div>
                    </td>

                    {/* Lot Size */}
                    <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-600">
                      {lotSize ? lotSize.toLocaleString() : '-'}
                    </td>

                    {/* 15-Min Open Input */}
                    <td className="py-2.5 px-3 text-right">
                      <input
                        type="number"
                        step="0.05"
                        placeholder="0.00"
                        value={stock.openPrice !== undefined && stock.openPrice !== null ? stock.openPrice : ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          onUpdateStockPrices(stock.id, val, stock.closePrice || 0);
                        }}
                        className="w-24 bg-white border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 rounded px-2 py-1 text-right font-mono text-slate-900 text-xs outline-none shadow-2xs"
                      />
                    </td>

                    {/* 15-Min Close Input */}
                    <td className="py-2.5 px-3 text-right">
                      <input
                        type="number"
                        step="0.05"
                        placeholder="0.00"
                        value={stock.closePrice !== undefined && stock.closePrice !== null ? stock.closePrice : ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          onUpdateStockPrices(stock.id, stock.openPrice || 0, val);
                        }}
                        className="w-24 bg-white border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 rounded px-2 py-1 text-right font-mono text-slate-900 text-xs outline-none shadow-2xs"
                      />
                    </td>

                    {/* 15-Min Volume */}
                    <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-700">
                      {stock.volume !== undefined && stock.volume !== null && stock.volume > 0 ? (
                        <span className="font-semibold text-slate-800">{stock.volume.toLocaleString('en-IN')}</span>
                      ) : (
                        <span className="text-slate-400 font-normal text-xs">-</span>
                      )}
                    </td>

                    {/* Open Calculation Output */}
                    <td className="py-2.5 px-3 text-right font-mono font-extrabold text-blue-700 text-sm bg-blue-50/50">
                      {stock.openCalc !== undefined && stock.openCalc !== null ? (
                        <span>{stock.openCalc.toFixed(4)}</span>
                      ) : (
                        <span className="text-slate-400 font-normal text-xs">-</span>
                      )}
                    </td>

                    {/* Close Calculation Output */}
                    <td className="py-2.5 px-3 text-right font-mono font-extrabold text-blue-700 text-sm bg-blue-50/50">
                      {stock.closeCalc !== undefined && stock.closeCalc !== null ? (
                        <span>{stock.closeCalc.toFixed(4)}</span>
                      ) : (
                        <span className="text-slate-400 font-normal text-xs">-</span>
                      )}
                    </td>

                    {/* ATM CE & PE Strike Prices */}
                    {(() => {
                      const cmp = stock.closePrice || stock.openPrice || 0;
                      const strikes = getAtmOptionStrikes(cmp, stock.symbol);
                      return (
                        <td className="py-2 px-3 text-center bg-purple-50/40 border-x border-purple-100/80">
                          {strikes ? (
                            <div className="flex flex-col items-center gap-1.5 min-w-[135px]">
                              {/* 2 CE Strikes */}
                              <div className="flex items-center justify-center space-x-1" title={`2 At-The-Money Call Option Strikes for ${stock.symbol}`}>
                                <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded font-mono shadow-2xs">
                                  {strikes.ceStrikes[0]} CE
                                </span>
                                <span className="text-[10px] font-bold text-emerald-700 bg-white border border-emerald-200 px-1.5 py-0.5 rounded font-mono">
                                  {strikes.ceStrikes[1]} CE
                                </span>
                              </div>
                              {/* 2 PE Strikes */}
                              <div className="flex items-center justify-center space-x-1" title={`2 At-The-Money Put Option Strikes for ${stock.symbol}`}>
                                <span className="text-[10px] font-black text-rose-800 bg-rose-100 border border-rose-300 px-1.5 py-0.5 rounded font-mono shadow-2xs">
                                  {strikes.peStrikes[0]} PE
                                </span>
                                <span className="text-[10px] font-bold text-rose-700 bg-white border border-rose-200 px-1.5 py-0.5 rounded font-mono">
                                  {strikes.peStrikes[1]} PE
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-mono text-xs">-</span>
                          )}
                        </td>
                      );
                    })()}

                    {/* Trend Indicator */}
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {isStockOpenEqualLow(stock) && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white shadow-2xs border border-emerald-300">
                            <ShieldCheck className="w-3 h-3 text-white" />
                            <span>OPEN = LOW</span>
                          </span>
                        )}
                        {isStockOpenEqualHigh(stock) && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white shadow-2xs border border-rose-300">
                            <Target className="w-3 h-3 text-white" />
                            <span>OPEN = HIGH</span>
                          </span>
                        )}

                        {stock.trend ? (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] ${
                            stock.trend === 'Very Bullish'
                              ? 'bg-emerald-600 text-white font-extrabold shadow-2xs ring-2 ring-emerald-300/60'
                              : stock.trend === 'Bullish'
                              ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-200'
                              : stock.trend === 'Very Bearish'
                              ? 'bg-rose-600 text-white font-extrabold shadow-2xs ring-2 ring-rose-300/60'
                              : stock.trend === 'Bearish'
                              ? 'bg-rose-50 text-rose-700 font-bold border border-rose-200'
                              : 'bg-slate-100 text-slate-600 font-medium border border-slate-200'
                          }`}>
                            {(stock.trend === 'Very Bullish' || stock.trend === 'Bullish') && <TrendingUp className="w-3 h-3" />}
                            {(stock.trend === 'Very Bearish' || stock.trend === 'Bearish') && <TrendingDown className="w-3 h-3" />}
                            <span>{stock.trend}</span>
                          </span>
                        ) : (
                          !isStockOpenEqualLow(stock) && !isStockOpenEqualHigh(stock) && <span className="text-slate-400">-</span>
                        )}

                        {stock.rsi !== undefined && stock.rsi !== null && (
                          <span className={`text-[10px] font-black px-2 py-0.2 rounded border ${
                            stock.rsi > 55
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : stock.rsi < 40
                              ? 'bg-rose-100 text-rose-900 border-rose-300'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}>
                            RSI: {stock.rsi.toFixed(1)} {stock.rsi > 50 ? '▲' : '▼'}
                          </span>
                        )}

                        {(() => {
                          const cmp = stock.closePrice || stock.openPrice || 0;
                          const status = stock.vwapStatus || (stock.vwap && cmp > 0 ? (cmp > stock.vwap ? 'Above' : cmp < stock.vwap ? 'Below' : 'At') : null);
                          if (!status) return null;
                          return (
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.2 rounded border flex items-center gap-1 ${
                                status === 'Above'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300/80'
                                  : status === 'Below'
                                  ? 'bg-rose-50 text-rose-800 border-rose-300/80'
                                  : 'bg-slate-100 text-slate-700 border-slate-300'
                              }`}
                              title={stock.vwap ? `VWAP Level: ₹${stock.vwap.toFixed(2)} | CMP: ₹${cmp.toFixed(2)}` : 'VWAP Status'}
                            >
                              <span>VWAP: {status === 'Above' ? 'Above ▲' : status === 'Below' ? 'Below ▼' : 'At ='}</span>
                              {stock.vwap && <span className="text-[9px] opacity-80 font-mono font-bold">(₹{stock.vwap.toFixed(1)})</span>}
                            </span>
                          );
                        })()}

                        {(() => {
                          const cmp = stock.closePrice || stock.openPrice || 0;
                          const fibData = calculateFibonacci382(stock.highPrice, stock.lowPrice, cmp);
                          const status = stock.fibStatus || fibData?.fibStatus;
                          if (!status || !fibData) return null;

                          return (
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.2 rounded border flex items-center gap-1 shadow-2xs ${
                                status === 'Retraced Yes'
                                  ? 'bg-amber-100 text-amber-950 border-amber-400'
                                  : status === 'Approaching 38.2%'
                                  ? 'bg-sky-50 text-sky-900 border-sky-300'
                                  : 'bg-rose-50 text-rose-800 border-rose-200'
                              }`}
                              title={`Fib 38.2% Level: ₹${fibData.fib382Bull} | Reversal Status: ${status}`}
                            >
                              <Percent className="w-3 h-3 text-amber-700" />
                              <span>{status === 'Retraced Yes' ? '★ Retraced: Yes' : status === 'Approaching 38.2%' ? 'Approaching 38.2%' : 'No Retracement'}</span>
                            </span>
                          );
                        })()}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        
                        {/* Dhan Fetch Single */}
                        {credentials.isConfigured && (
                          <button
                            onClick={() => onFetchSingleStock(stock)}
                            disabled={stock.isLoading}
                            title="Fetch live 15-min candle from Dhan API"
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${stock.isLoading ? 'animate-spin text-blue-600' : ''}`} />
                          </button>
                        )}

                        {/* View Breakdown */}
                        <button
                          onClick={() => onSelectStockDetail(stock)}
                          title="View Gann Targets & Breakdown"
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Position Sizing Calculator */}
                        {onOpenPositionSizer && (
                          <button
                            onClick={() => onOpenPositionSizer(stock)}
                            title="Calculate Position Size & Lots for this stock"
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                          >
                            <Calculator className="w-3.5 h-3.5 text-amber-600" />
                          </button>
                        )}

                        {/* Manual Edit */}
                        <button
                          onClick={() => onEditStockManual(stock)}
                          title="Manual Price Entry Modal"
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
        <div>
          Showing {sortedStocks.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to{' '}
          {Math.min(currentPage * itemsPerPage, sortedStocks.length)} of {sortedStocks.length} F&O Stocks
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-40 shadow-2xs"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="font-mono text-slate-700 font-semibold">
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-40 shadow-2xs"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
};
