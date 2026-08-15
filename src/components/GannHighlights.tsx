import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Zap, ArrowUpRight, ArrowDownRight, Sparkles, ChevronRight, ChevronDown, ChevronUp, Maximize2, Minimize2, Target, ShieldCheck, Percent } from 'lucide-react';
import { StockCalculated, TrendFilterType } from '../types';
import { calculateFibonacci382, isOpenLowPattern, isOpenHighPattern, isHighClosePattern, isAboveFirst15mCandle, isBelowFirst15mCandle, isGannCalcLessThan3, isBothCalcLessThan3 } from '../utils/gann';

interface GannHighlightsProps {
  stocks: StockCalculated[];
  onSelectStockDetail: (stock: StockCalculated) => void;
  onSelectTrendFilter: (filter: TrendFilterType) => void;
}

export const GannHighlights: React.FC<GannHighlightsProps> = ({
  stocks,
  onSelectStockDetail,
  onSelectTrendFilter
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const handleFilterClick = (filter: TrendFilterType) => {
    onSelectTrendFilter(filter);
    setTimeout(() => {
      const element = document.getElementById('stock-table-section');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };
  // Filter all stocks that have calculated open & close prices
  const calculatedStocks = stocks.filter(
    (s) => s.openPrice !== undefined && s.openPrice !== null && s.openPrice > 0 &&
           s.closePrice !== undefined && s.closePrice !== null && s.closePrice > 0
  );

  // Very Bullish stocks: trend === 'Very Bullish'
  // Prioritize stocks that go above the first 15-minute candle high FIRST, then other stocks
  const exactVeryBullish = calculatedStocks.filter((s) => s.trend === 'Very Bullish');
  const allBullish = calculatedStocks.filter((s) => s.trend === 'Bullish' || s.trend === 'Very Bullish');
  
  const sortVeryBullish = (a: StockCalculated, b: StockCalculated) => {
    const aAbove = isAboveFirst15mCandle(a);
    const bAbove = isAboveFirst15mCandle(b);
    if (aAbove && !bAbove) return -1;
    if (!aAbove && bAbove) return 1;
    return (b.pctChange || 0) - (a.pctChange || 0);
  };

  const topVeryBullish = exactVeryBullish.length > 0
    ? [...exactVeryBullish].sort(sortVeryBullish).slice(0, 5)
    : [...allBullish].sort(sortVeryBullish).slice(0, 5);

  // Very Bearish stocks: trend === 'Very Bearish'
  const exactVeryBearish = calculatedStocks.filter((s) => s.trend === 'Very Bearish');
  const allBearish = calculatedStocks.filter((s) => s.trend === 'Bearish' || s.trend === 'Very Bearish');
  
  const sortVeryBearish = (a: StockCalculated, b: StockCalculated) => {
    const aBelow = isBelowFirst15mCandle(a);
    const bBelow = isBelowFirst15mCandle(b);
    if (aBelow && !bBelow) return -1;
    if (!aBelow && bBelow) return 1;
    return (a.pctChange || 0) - (b.pctChange || 0);
  };

  const topVeryBearish = exactVeryBearish.length > 0
    ? [...exactVeryBearish].sort(sortVeryBearish).slice(0, 5)
    : [...allBearish].sort(sortVeryBearish).slice(0, 5);

  // Open = Low (Bullish) and Open = High (Bearish) stocks (Strict Exact Match)
  const openLowStocks = calculatedStocks.filter((s) => {
    if (s.openPrice !== undefined && s.openPrice !== null && s.openPrice > 0) {
      return isOpenLowPattern(s.openPrice, s.lowPrice, s.first15mLow, s.highPrice, s.closePrice);
    }
    return false;
  });
  const openHighStocks = calculatedStocks.filter((s) => {
    if (s.openPrice !== undefined && s.openPrice !== null && s.openPrice > 0) {
      return isOpenHighPattern(s.openPrice, s.highPrice, s.first15mHigh, s.lowPrice, s.closePrice);
    }
    return false;
  });
  const highCloseStocks = calculatedStocks.filter((s) => {
    const cmp = s.closePrice || s.openPrice;
    if (cmp !== undefined && cmp !== null && cmp > 0) {
      return isHighClosePattern(cmp, s.highPrice, s.first15mHigh, s.openPrice);
    }
    return false;
  });
  
  // 38.2% Fibonacci Retracements
  const fibRetraceStocks = calculatedStocks.filter((s) => {
    if (s.isFib382Retrace) return true;
    const cmp = s.closePrice || s.openPrice || 0;
    const fibData = calculateFibonacci382(s.highPrice, s.lowPrice, cmp);
    return fibData?.isFib382Retraced ?? false;
  });

  // Gann Calc < 3 stocks
  const gannCalcLess3Count = calculatedStocks.filter((s) => isGannCalcLessThan3(s)).length;
  const bothCalcLess3Count = calculatedStocks.filter((s) => isBothCalcLessThan3(s)).length;

  return (
    <div className="mb-6 space-y-4">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-4 shadow-md border border-slate-700/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-blue-500/20 rounded-xl border border-blue-400/30 text-blue-400">
            <Zap className="w-6 h-6 text-yellow-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-extrabold tracking-wide text-white">15-MIN MARKET PRO SIGNALS</h2>
              <span className="bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                Square Root & Intraday Patterns
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Instant filtering for <strong>Open=Low (Bullish)</strong>, <strong>Open=High (Bearish)</strong>, and 45° Breakouts.
            </p>
          </div>
        </div>

        {/* Quick Signal Filter Buttons */}
        <div className="flex items-center gap-2 self-stretch md:self-auto overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => handleFilterClick('BOTH_CALC_LESS_3')}
            className="flex items-center space-x-1.5 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-400/80 px-3 py-1.5 rounded-xl text-xs font-black text-purple-200 transition-all cursor-pointer whitespace-nowrap shadow-xs ring-1 ring-purple-400/40 animate-pulse"
            title="Filter stocks where BOTH Open AND Close modulo calculations are less than 3"
          >
            <Zap className="w-3.5 h-3.5 text-yellow-300 fill-current" />
            <span>🔥 Both Calc &lt; 3 ({bothCalcLess3Count})</span>
          </button>

          <button
            onClick={() => handleFilterClick('GANN_CALC_LESS_3')}
            className="flex items-center space-x-1.5 bg-purple-500/20 hover:bg-purple-500/35 border border-purple-400/50 px-3 py-1.5 rounded-xl text-xs font-black text-purple-300 transition-all cursor-pointer whitespace-nowrap shadow-xs"
            title="Filter stocks where Open or Close modulo calculation is less than 3"
          >
            <Zap className="w-3.5 h-3.5 text-purple-300" />
            <span>Calc &lt; 3 ({gannCalcLess3Count})</span>
          </button>

          <button
            onClick={() => handleFilterClick('OPEN_LOW')}
            className="flex items-center space-x-1.5 bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-400/50 px-3 py-1.5 rounded-xl text-xs font-black text-emerald-300 transition-all cursor-pointer whitespace-nowrap shadow-xs"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Open = Low ({openLowStocks.length})</span>
          </button>

          <button
            onClick={() => handleFilterClick('OPEN_HIGH')}
            className="flex items-center space-x-1.5 bg-rose-500/20 hover:bg-rose-500/35 border border-rose-400/50 px-3 py-1.5 rounded-xl text-xs font-black text-rose-300 transition-all cursor-pointer whitespace-nowrap shadow-xs"
          >
            <Target className="w-3.5 h-3.5 text-rose-400" />
            <span>Open = High ({openHighStocks.length})</span>
          </button>

          <button
            onClick={() => handleFilterClick('HIGH_CLOSE')}
            className="flex items-center space-x-1.5 bg-blue-500/20 hover:bg-blue-500/35 border border-blue-400/50 px-3 py-1.5 rounded-xl text-xs font-black text-blue-300 transition-all cursor-pointer whitespace-nowrap shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>High = Close ({highCloseStocks.length})</span>
          </button>

          <button
            onClick={() => handleFilterClick('FIB_382_RETRACE')}
            className="flex items-center space-x-1.5 bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/50 px-3 py-1.5 rounded-xl text-xs font-black text-amber-300 transition-all cursor-pointer whitespace-nowrap shadow-xs"
          >
            <Percent className="w-3.5 h-3.5 text-amber-400" />
            <span>Fib 38.2% Retraced Yes ({fibRetraceStocks.length})</span>
          </button>

          <button
            onClick={() => handleFilterClick('VERY_BULLISH')}
            className="flex items-center space-x-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-300 transition-all cursor-pointer whitespace-nowrap"
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>Very Bullish ({exactVeryBullish.length})</span>
          </button>

          <button
            onClick={() => handleFilterClick('VERY_BEARISH')}
            className="flex items-center space-x-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-300 transition-all cursor-pointer whitespace-nowrap"
          >
            <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
            <span>Very Bearish ({exactVeryBearish.length})</span>
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-1.5 bg-indigo-600/50 hover:bg-indigo-600 border border-indigo-400/60 px-3 py-1.5 rounded-xl text-xs font-black text-white transition-all cursor-pointer whitespace-nowrap shadow-sm ml-auto"
            title={isExpanded ? 'Collapse Market Pro Signal Cards' : 'Expand Market Pro Signal Cards'}
          >
            <span>{isExpanded ? 'Collapse Signals' : 'Expand Signals'}</span>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Grid of Picks - Contracted by default, only shows when expanded */}
      {isExpanded && (
        calculatedStocks.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 text-center text-amber-800 text-xs flex items-center justify-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              No 15-minute candle data calculated yet. Click <strong>"Fetch All 15m Candles"</strong> or enter prices manually to unlock market signals.
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in">
          {/* FIB 38.2% RETRACED STOCKS TIME TRACKER SECTION */}
          {fibRetraceStocks.length > 0 && (
            <div className="lg:col-span-2 bg-gradient-to-br from-amber-950/10 via-amber-50/50 to-white border-2 border-amber-500/30 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-amber-200/80 mb-3 flex-wrap gap-2">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-amber-500 text-white rounded-lg shadow-xs">
                    <Percent className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-amber-950 tracking-wider uppercase flex items-center gap-1.5">
                      Fibonacci 38.2% Retraced Stocks Time Tracker
                      <span className="bg-amber-100 text-amber-900 text-[10px] px-2 py-0.2 rounded-full font-bold border border-amber-300">
                        {fibRetraceStocks.length} Stocks
                      </span>
                    </h3>
                    <p className="text-[11px] text-amber-800">Exact 15m candle time when price touched 38.2% Fibonacci support &amp; bounced</p>
                  </div>
                </div>

                <button
                  onClick={() => handleFilterClick('FIB_382_RETRACE')}
                  className="text-[11px] font-bold text-amber-800 hover:text-amber-900 flex items-center space-x-0.5 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-lg border border-amber-300 transition-colors cursor-pointer"
                >
                  <span>View All Retraced ({fibRetraceStocks.length})</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {fibRetraceStocks.slice(0, 6).map((stock) => {
                  const cmp = stock.closePrice || stock.openPrice || 0;
                  const fibData = calculateFibonacci382(stock.highPrice, stock.lowPrice, cmp, stock.symbol, stock.candleTimestamp);
                  const retraceTime = stock.fib382Time || fibData?.fib382Time || '09:45 AM';

                  return (
                    <div
                      key={stock.id}
                      onClick={() => onSelectStockDetail(stock)}
                      className="group bg-white hover:bg-amber-50/80 border border-amber-200 hover:border-amber-400 rounded-xl p-2.5 transition-all cursor-pointer shadow-2xs flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono font-black text-slate-900 text-xs">{stock.symbol}</span>
                          <span className="text-[10px] font-black bg-amber-200/80 text-amber-950 px-1.5 py-0.2 rounded border border-amber-300 shadow-2xs flex items-center gap-1">
                            🕒 {retraceTime}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[130px]">{stock.companyName}</div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-xs text-slate-800">₹{cmp.toFixed(1)}</div>
                        <div className="text-[10px] text-amber-800 font-extrabold">38.2% @ ₹{fibData?.fib382Bull.toFixed(1)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* VERY BULLISH SECTION */}
          <div className="bg-gradient-to-br from-emerald-950/20 via-white to-slate-50 border-2 border-emerald-500/30 rounded-2xl p-4 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-100 mb-3">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-emerald-500 text-white rounded-lg shadow-xs">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-emerald-950 tracking-wider uppercase flex items-center gap-1.5">
                    Very Bullish Picks
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.2 rounded-full font-bold">
                      RSI &gt; 58 | ADX &gt; 21 | Open = Low
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500">Strong Momentum: RSI &gt; 58, ADX &gt; 21 &amp; Open=Low pattern</p>
                </div>
              </div>

              <button
                onClick={() => handleFilterClick('VERY_BULLISH')}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center space-x-0.5 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors"
              >
                <span>View All ({allBullish.length})</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {topVeryBullish.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center italic">No bullish stocks calculated yet.</p>
            ) : (
              <div className="space-y-2">
                {topVeryBullish.map((stock) => {
                  const pct = stock.pctChange || ((stock.closePrice! - stock.openPrice!) / stock.openPrice!) * 100;
                  return (
                    <div
                      key={stock.id}
                      onClick={() => onSelectStockDetail(stock)}
                      className="group bg-white hover:bg-emerald-50/60 border border-emerald-200/80 hover:border-emerald-400 rounded-xl p-2.5 transition-all cursor-pointer shadow-2xs flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="bg-emerald-100 text-emerald-800 font-black text-xs px-2 py-1 rounded-lg text-center min-w-[58px] border border-emerald-200">
                          +{pct.toFixed(2)}%
                        </div>
                        <div className="truncate">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-black text-slate-900 text-sm">{stock.symbol}</span>
                            <span className="text-[10px] font-bold bg-emerald-600 text-white px-1.5 py-0.2 rounded">
                              {stock.trend}
                            </span>
                            {stock.candleTimestamp && (
                              <span className="text-[10px] font-black bg-blue-100 text-blue-950 px-1.5 py-0.2 rounded border border-blue-300 shadow-2xs flex items-center gap-0.5" title="Bullish Signal Timestamp">
                                🕒 {stock.candleTimestamp}
                              </span>
                            )}
                            {stock.rsi !== undefined && stock.rsi !== null && (
                              <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-900 px-1.5 py-0.2 rounded border border-emerald-300">
                                RSI {stock.rsi.toFixed(1)}
                              </span>
                            )}
                            {stock.adx !== undefined && stock.adx !== null && (
                              <span className="text-[10px] font-extrabold bg-blue-100 text-blue-900 px-1.5 py-0.2 rounded border border-blue-300">
                                ADX {stock.adx.toFixed(1)}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate max-w-[160px]">{stock.companyName}</div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4 text-right shrink-0">
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">15m O / C</div>
                          <div className="font-mono font-bold text-xs text-slate-800">
                            ₹{stock.openPrice?.toFixed(1)} / <span className="text-emerald-700 font-extrabold">₹{stock.closePrice?.toFixed(1)}</span>
                          </div>
                        </div>

                        <div className="hidden sm:block">
                          <div className="text-[10px] text-emerald-800 font-semibold uppercase">Buy Above</div>
                          <div className="font-mono font-extrabold text-xs text-emerald-700">
                            ₹{stock.buyAbove?.toFixed(2)}
                          </div>
                        </div>

                        <div className="text-slate-300 group-hover:text-emerald-600 transition-colors">
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* VERY BEARISH SECTION */}
          <div className="bg-gradient-to-br from-rose-950/20 via-white to-slate-50 border-2 border-rose-500/30 rounded-2xl p-4 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-rose-100 mb-3">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-rose-500 text-white rounded-lg shadow-xs">
                  <ArrowDownRight className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-rose-950 tracking-wider uppercase flex items-center gap-1.5">
                    Very Bearish Picks
                    <span className="bg-rose-100 text-rose-800 text-[10px] px-2 py-0.2 rounded-full font-bold">
                      45° Breakdown
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500">15m Close &lt; Open with Sell Below Trigger</p>
                </div>
              </div>

              <button
                onClick={() => handleFilterClick('VERY_BEARISH')}
                className="text-[11px] font-bold text-rose-700 hover:text-rose-800 flex items-center space-x-0.5 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 transition-colors"
              >
                <span>View All ({allBearish.length})</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {topVeryBearish.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center italic">No bearish stocks calculated yet.</p>
            ) : (
              <div className="space-y-2">
                {topVeryBearish.map((stock) => {
                  const pct = stock.pctChange || ((stock.closePrice! - stock.openPrice!) / stock.openPrice!) * 100;
                  return (
                    <div
                      key={stock.id}
                      onClick={() => onSelectStockDetail(stock)}
                      className="group bg-white hover:bg-rose-50/60 border border-rose-200/80 hover:border-rose-400 rounded-xl p-2.5 transition-all cursor-pointer shadow-2xs flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="bg-rose-100 text-rose-800 font-black text-xs px-2 py-1 rounded-lg text-center min-w-[58px] border border-rose-200">
                          {pct.toFixed(2)}%
                        </div>
                        <div className="truncate">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-black text-slate-900 text-sm">{stock.symbol}</span>
                            <span className="text-[10px] font-bold bg-rose-600 text-white px-1.5 py-0.2 rounded">
                              {stock.trend}
                            </span>
                            {stock.rsi !== undefined && stock.rsi !== null && (
                              <span className="text-[10px] font-extrabold bg-rose-100 text-rose-900 px-1.5 py-0.2 rounded border border-rose-300">
                                RSI {stock.rsi.toFixed(1)}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate max-w-[160px]">{stock.companyName}</div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4 text-right shrink-0">
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">15m O / C</div>
                          <div className="font-mono font-bold text-xs text-slate-800">
                            ₹{stock.openPrice?.toFixed(1)} / <span className="text-rose-700 font-extrabold">₹{stock.closePrice?.toFixed(1)}</span>
                          </div>
                        </div>

                        <div className="hidden sm:block">
                          <div className="text-[10px] text-rose-800 font-semibold uppercase">Sell Below</div>
                          <div className="font-mono font-extrabold text-xs text-rose-700">
                            ₹{stock.sellBelow?.toFixed(2)}
                          </div>
                        </div>

                        <div className="text-slate-300 group-hover:text-rose-600 transition-colors">
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
        )
      )}
    </div>
  );
};
