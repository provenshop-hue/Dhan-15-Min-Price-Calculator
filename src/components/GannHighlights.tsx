import React from 'react';
import { TrendingUp, TrendingDown, Zap, ArrowUpRight, ArrowDownRight, ShieldAlert, Sparkles, ChevronRight } from 'lucide-react';
import { StockCalculated } from '../types';

interface GannHighlightsProps {
  stocks: StockCalculated[];
  onSelectStockDetail: (stock: StockCalculated) => void;
  onSelectTrendFilter: (filter: 'ALL' | 'VERY_BULLISH' | 'BULLISH' | 'VERY_BEARISH' | 'BEARISH' | 'CALCULATED') => void;
}

export const GannHighlights: React.FC<GannHighlightsProps> = ({
  stocks,
  onSelectStockDetail,
  onSelectTrendFilter
}) => {
  // Filter all stocks that have calculated open & close prices
  const calculatedStocks = stocks.filter(
    (s) => s.openPrice !== undefined && s.openPrice !== null && s.openPrice > 0 &&
           s.closePrice !== undefined && s.closePrice !== null && s.closePrice > 0
  );

  // Very Bullish stocks: trend === 'Very Bullish' or top positive % change
  const exactVeryBullish = calculatedStocks.filter((s) => s.trend === 'Very Bullish');
  const allBullish = calculatedStocks.filter((s) => s.trend === 'Bullish' || s.trend === 'Very Bullish');
  
  const topVeryBullish = exactVeryBullish.length > 0
    ? [...exactVeryBullish].sort((a, b) => (b.pctChange || 0) - (a.pctChange || 0)).slice(0, 5)
    : [...allBullish].sort((a, b) => (b.pctChange || 0) - (a.pctChange || 0)).slice(0, 5);

  // Very Bearish stocks: trend === 'Very Bearish' or top negative % change
  const exactVeryBearish = calculatedStocks.filter((s) => s.trend === 'Very Bearish');
  const allBearish = calculatedStocks.filter((s) => s.trend === 'Bearish' || s.trend === 'Very Bearish');
  
  const topVeryBearish = exactVeryBearish.length > 0
    ? [...exactVeryBearish].sort((a, b) => (a.pctChange || 0) - (b.pctChange || 0)).slice(0, 5)
    : [...allBearish].sort((a, b) => (a.pctChange || 0) - (b.pctChange || 0)).slice(0, 5);

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
              <h2 className="text-base font-extrabold tracking-wide text-white">GANN 15-MIN PRO SIGNALS</h2>
              <span className="bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                Square of 9 Analysis
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Top Gann 45° Breakout (Very Bullish) & 45° Breakdown (Very Bearish) picks from {calculatedStocks.length} calculated stocks.
            </p>
          </div>
        </div>

        {/* Quick Signal Counters */}
        <div className="flex items-center gap-2 self-stretch md:self-auto overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => onSelectTrendFilter('VERY_BULLISH')}
            className="flex items-center space-x-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-300 transition-all cursor-pointer whitespace-nowrap"
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>Very Bullish ({exactVeryBullish.length})</span>
          </button>

          <button
            onClick={() => onSelectTrendFilter('VERY_BEARISH')}
            className="flex items-center space-x-1.5 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-300 transition-all cursor-pointer whitespace-nowrap"
          >
            <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
            <span>Very Bearish ({exactVeryBearish.length})</span>
          </button>
        </div>
      </div>

      {/* Grid of Picks */}
      {calculatedStocks.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 text-center text-amber-800 text-xs flex items-center justify-center space-x-2">
          <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            No 15-minute candle data calculated yet. Click <strong>"Fetch All 15m Candles"</strong> or enter prices manually to unlock Gann signals.
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          
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
                      Gann 45° Breakout
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500">15m Close &gt; Open with Gann Buy Above Trigger</p>
                </div>
              </div>

              <button
                onClick={() => onSelectTrendFilter('VERY_BULLISH')}
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
                            {stock.rsi !== undefined && stock.rsi !== null && (
                              <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-900 px-1.5 py-0.2 rounded border border-emerald-300">
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
                      Gann 45° Breakdown
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500">15m Close &lt; Open with Gann Sell Below Trigger</p>
                </div>
              </div>

              <button
                onClick={() => onSelectTrendFilter('VERY_BEARISH')}
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
      )}
    </div>
  );
};
