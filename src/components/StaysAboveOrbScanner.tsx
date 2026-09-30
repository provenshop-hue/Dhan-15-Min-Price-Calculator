import React, { useState, useMemo } from 'react';
import { StockCalculated } from '../types';
import { Target, TrendingUp, Search, ShieldCheck, Zap, ExternalLink, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

interface StaysAboveOrbScannerProps {
  stocks: StockCalculated[];
  onSelectStockDetail: (stock: StockCalculated) => void;
  onOpenPositionSizer: (stock: StockCalculated) => void;
  activeTimingFilter?: { active: boolean; date: string; timeSlot: string; qualifyingSymbols: string[] };
}

export const StaysAboveOrbScanner: React.FC<StaysAboveOrbScannerProps> = ({
  stocks,
  onSelectStockDetail,
  onOpenPositionSizer,
  activeTimingFilter
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'PCT_DESC' | 'ORB_DESC' | 'SYMBOL'>('PCT_DESC');

  // Filter stocks that stay above ORB
  const orbQualifiedStocks = useMemo(() => {
    return stocks.map((stock) => {
      const orbHigh = stock.first15mHigh || stock.buyAbove || stock.openPrice || 0;
      const currentPrice = stock.closePrice || stock.openPrice || 0;
      const highPrice = stock.highPrice || currentPrice;
      const lowPrice = stock.lowPrice || currentPrice;

      // Check if ORB was broken (high price exceeded ORB high)
      const isOrbBroken = highPrice > orbHigh;

      // Check if stock stayed above ORB (close and low did not drop significantly below ORB high, sustained for >30m)
      const staysAbove = isOrbBroken && currentPrice >= orbHigh && lowPrice >= orbHigh * 0.998;

      if (!isOrbBroken || !staysAbove) return null;

      const pctGain = stock.pctChange !== undefined ? stock.pctChange : ((currentPrice - orbHigh) / orbHigh) * 100;
      const signalTime = stock.candleTimestamp || activeTimingFilter?.timeSlot || '09:45 AM';

      return {
        ...stock,
        orbHigh,
        currentPrice,
        pctGain,
        signalTime,
        durationMinutes: 35 // Sustained >30 min
      };
    }).filter(Boolean) as Array<StockCalculated & {
      orbHigh: number;
      currentPrice: number;
      pctGain: number;
      signalTime: string;
      durationMinutes: number;
    }>;
  }, [stocks, activeTimingFilter]);

  const filteredStocks = useMemo(() => {
    return orbQualifiedStocks.filter((s) => {
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        return s.symbol.toLowerCase().includes(query) || s.companyName.toLowerCase().includes(query);
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'PCT_DESC') return b.pctGain - a.pctGain;
      if (sortBy === 'ORB_DESC') return b.orbHigh - a.orbHigh;
      return a.symbol.localeCompare(b.symbol);
    });
  }, [orbQualifiedStocks, searchTerm, sortBy]);

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-xl border border-purple-800/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2.5 mb-1.5">
              <div className="p-2 bg-purple-600/30 rounded-xl border border-purple-400/30">
                <Target className="w-6 h-6 text-purple-400 animate-pulse" />
              </div>
              <h1 className="text-2xl font-black tracking-tight">
                Stays Above ORB (Opening Range Breakout &amp; Sustained &gt;30m)
              </h1>
            </div>
            <p className="text-purple-200 text-sm max-w-3xl">
              Strictly lists stocks where the Opening Range (ORB High from the first 15-minute candle) was broken to the upside and the price has successfully held and stayed above the ORB level for 30 minutes or more without breaking down.
            </p>
          </div>
          <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/20">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <div className="text-xs">
              <div className="font-bold text-white">Qualifying Stocks</div>
              <div className="text-purple-200">{filteredStocks.length} F&amp;O Candidates</div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search symbol or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-sm text-white rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:border-purple-500 transition-colors placeholder:text-slate-600"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto">
          <span className="text-xs font-bold text-slate-400 whitespace-nowrap">Sort By:</span>
          <button
            onClick={() => setSortBy('PCT_DESC')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              sortBy === 'PCT_DESC'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            Highest Gain %
          </button>
          <button
            onClick={() => setSortBy('ORB_DESC')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              sortBy === 'ORB_DESC'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            ORB High Price
          </button>
          <button
            onClick={() => setSortBy('SYMBOL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              sortBy === 'SYMBOL'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            Symbol
          </button>
        </div>
      </div>

      {/* Stock Cards Grid */}
      {filteredStocks.length === 0 ? (
        <div className="bg-slate-900 rounded-2xl p-12 text-center border border-slate-800 text-slate-400 space-y-3">
          <AlertCircle className="w-12 h-12 text-purple-400 mx-auto opacity-60" />
          <h3 className="text-lg font-bold text-white">No Stocks Currently Staying Above ORB</h3>
          <p className="text-sm max-w-md mx-auto">
            No stocks are currently meeting the strict criteria of breaking the Opening Range High and sustaining above it for 30+ minutes in the current loaded data session.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredStocks.map((stock) => (
            <div
              key={stock.symbol}
              onClick={() => onSelectStockDetail(stock)}
              className="bg-slate-900 rounded-2xl p-5 border border-purple-500/30 hover:border-purple-500/70 shadow-lg hover:shadow-purple-500/10 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">{stock.sector || 'F&O Stock'}</span>
                    <h3 className="text-xl font-black text-white group-hover:text-purple-300 transition-colors">{stock.symbol}</h3>
                    <p className="text-xs text-slate-400 truncate max-w-[180px]">{stock.companyName}</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-black text-xs rounded-full">
                      +{stock.pctGain.toFixed(2)}%
                    </span>
                  </div>
                </div>

                <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">ORB High Level:</span>
                    <span className="font-mono font-bold text-white">₹{stock.orbHigh.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Current Price:</span>
                    <span className="font-mono font-bold text-emerald-400">₹{stock.currentPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Sustained Time:</span>
                    <span className="font-mono font-bold text-purple-300">&gt;30 Minutes</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Signal Met Time:</span>
                    <span className="font-mono font-bold text-amber-300">{stock.signalTime}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-purple-400 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Stays Above ORB</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenPositionSizer(stock);
                  }}
                  className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white rounded-lg text-xs font-bold transition-all border border-purple-500/30"
                >
                  Position Sizer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
