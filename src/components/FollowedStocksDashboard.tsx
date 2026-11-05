import React from 'react';
import { StockCalculated } from '../types';
import { Star, RefreshCw, AlertTriangle, TrendingUp, TrendingDown, Clock, Activity, Calculator, ExternalLink, Shield, CheckCircle2, X } from 'lucide-react';
import { is100PercentBullishMove } from '../utils/rsiPullback';

interface FollowedStocksDashboardProps {
  followedSymbols: string[];
  onToggleFollow: (symbol: string) => void;
  stocks: StockCalculated[];
  onFetchSingleStock: (stock: StockCalculated) => Promise<void> | void;
  followedAlerts: Array<{
    id: string;
    symbol: string;
    timestamp: string;
    oldStatus: string;
    newStatus: string;
    reason: string;
  }>;
  onClearAlerts: () => void;
  onSelectStockDetail?: (stock: StockCalculated) => void;
  onOpenPositionSizer?: (stock: StockCalculated) => void;
  isLoading?: boolean;
}

export const FollowedStocksDashboard: React.FC<FollowedStocksDashboardProps> = ({
  followedSymbols,
  onToggleFollow,
  stocks,
  onFetchSingleStock,
  followedAlerts,
  onClearAlerts,
  onSelectStockDetail,
  onOpenPositionSizer,
  isLoading = false
}) => {
  const followedStockItems = stocks.filter(s => followedSymbols.includes(s.symbol.toUpperCase()));

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/40 rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 animate-pulse" />
                <span>Real-Time Monitored Watchlist</span>
              </span>
              <span className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-full text-xs font-mono">
                Auto-Polling: Every 2 Minutes
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <span>⭐ Followed Stocks Live Monitor</span>
              <span className="text-xs px-3 py-1 rounded-xl font-mono bg-indigo-950 text-indigo-300 border border-indigo-500/40">
                {followedSymbols.length} Followed
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Active polling every 2 minutes. The system instantly raises an alarm and alerts you if any followed stock reverses direction unexpectedly (e.g. fading from committed bullish or breaking below VWAP).
            </p>
          </div>
        </div>
      </div>

      {/* Active Direction Change Alarms Section */}
      {followedAlerts.length > 0 && (
        <div className="bg-rose-950/80 border-2 border-rose-500 rounded-2xl p-5 text-white shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-rose-500/40 pb-3">
            <div className="flex items-center space-x-2.5">
              <span className="p-2 bg-rose-500 text-slate-950 rounded-xl animate-bounce">
                <AlertTriangle className="w-5 h-5 font-black" />
              </span>
              <div>
                <h4 className="text-sm font-black uppercase tracking-wider text-rose-200">
                  ⚠️ Critical Direction Change Alarms ({followedAlerts.length})
                </h4>
                <p className="text-[11px] text-rose-300">
                  Followed stocks that unexpectedly changed direction or lost bullish formula compliance.
                </p>
              </div>
            </div>
            <button
              onClick={onClearAlerts}
              className="px-3 py-1.5 bg-rose-900 hover:bg-rose-800 text-rose-100 text-xs font-bold rounded-xl border border-rose-700 transition-all cursor-pointer"
            >
              Clear Alarms
            </button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
            {followedAlerts.map(alert => (
              <div key={alert.id} className="bg-slate-950/90 border border-rose-500/50 rounded-xl p-3 flex items-center justify-between text-xs gap-3 font-mono">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-1 bg-rose-500 text-slate-950 font-black rounded text-[10px]">
                    {alert.symbol}
                  </span>
                  <div>
                    <div className="text-rose-200 font-bold">{alert.reason}</div>
                    <div className="text-[10px] text-slate-400">Previous: {alert.oldStatus} &rarr; Current: {alert.newStatus}</div>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 shrink-0">{alert.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Followed Stocks Grid */}
      {followedStockItems.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-16 text-center shadow-lg">
          <div className="w-16 h-16 bg-slate-800/80 border border-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-400">
            <Star className="w-8 h-8 fill-amber-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No Stocks Followed Yet</h3>
          <p className="text-slate-400 max-w-md mx-auto text-sm leading-relaxed mb-6">
            Click the star / follow button on any stock card or scanner across the app to add it to your 2-minute live monitoring tab.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {followedStockItems.map(stock => {
            const isBull = is100PercentBullishMove(stock);
            const close = stock.closePrice || 0;
            const open = stock.openPrice || close;
            const pct = stock.pctChange || 0;
            const vwap = stock.vwap || close;
            const isAboveVwap = close >= vwap;

            return (
              <div 
                key={stock.symbol}
                onClick={() => onSelectStockDetail && onSelectStockDetail(stock)}
                className="bg-slate-900 rounded-2xl border border-amber-500/30 hover:border-amber-500/60 shadow-lg transition-all cursor-pointer overflow-hidden flex flex-col"
              >
                {/* Header */}
                <div className="px-4 py-3 bg-gradient-to-r from-amber-950/40 via-slate-950 to-slate-950 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFollow(stock.symbol);
                      }}
                      className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/40 transition-colors cursor-pointer"
                      title="Unfollow Stock"
                    >
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    </button>
                    <div>
                      <h3 className="text-base font-black text-white font-mono flex items-center gap-2">
                        {stock.symbol}
                        <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                          {isBull ? '🔥 100% Bullish' : isAboveVwap ? '🟢 Above VWAP' : '🟡 Neutral/Watch'}
                        </span>
                      </h3>
                      <span className="text-[11px] text-slate-400">{stock.companyName}</span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onFetchSingleStock(stock);
                    }}
                    disabled={stock.isLoading}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                    title="Refresh Live Data"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${stock.isLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {/* Price Bar */}
                <div className="px-4 py-3 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between font-mono text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px] block">LTP</span>
                    <strong className="text-white text-sm">₹{close.toFixed(2)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Change</span>
                    <span className={`font-bold ${pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {pct > 0 ? '+' : ''}{pct.toFixed(2)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">VWAP</span>
                    <span className="text-slate-200">₹{vwap.toFixed(2)}</span>
                  </div>
                </div>

                {/* Details / Checks */}
                <div className="p-4 flex-1 space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>RSI (14):</span>
                    <strong className="text-slate-200">{stock.rsi ? stock.rsi.toFixed(1) : 'N/A'}</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Last Polled:</span>
                    <strong className="text-slate-200">{stock.candleTimestamp || 'Live Active'}</strong>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Auto-Polling Active
                  </span>

                  <div className="flex items-center gap-1.5">
                    {onOpenPositionSizer && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenPositionSizer(stock);
                        }}
                        className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/60 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Calculator className="w-3 h-3" />
                        <span>Sizer</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
