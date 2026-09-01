import React, { useState, useMemo } from 'react';
import { StockCalculated } from '../types';
import { 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  ExternalLink,
  Target,
  ShieldCheck,
  Search,
  Filter,
  Cpu
} from 'lucide-react';

interface Props {
  stocks: StockCalculated[];
  onSelectStockDetail: (stock: StockCalculated) => void;
  onOpenPositionSizer: (stock: StockCalculated) => void;
}

export function OpenHighLowScanner({ stocks, onSelectStockDetail, onOpenPositionSizer }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'OPEN_LOW' | 'OPEN_HIGH'>('ALL');
  const [priceAbove1000, setPriceAbove1000] = useState(false);

  const scannedStocks = useMemo(() => {
    const list = stocks.map(s => {
      // Use 1-minute data for precision, fallback to 15m or daily if missing
      const open = s.first1mOpen ?? s.first15mOpen ?? s.openPrice;
      const high = s.first1mHigh ?? s.first15mHigh ?? s.highPrice;
      const low = s.first1mLow ?? s.first15mLow ?? s.lowPrice;
      
      if (open == null || high == null || low == null) {
        return null;
      }
      
      const diffLow = Math.abs(open - low);
      const diffHigh = Math.abs(open - high);
      
      // Use a percentage-based tolerance (0.15%) for high-priced stocks, or absolute 0.15 for low-priced stocks
      const isOpenLow = (diffLow / open) * 100 <= 0.15 || diffLow <= 0.15;
      const isOpenHigh = (diffHigh / open) * 100 <= 0.15 || diffHigh <= 0.15;
      
      if (!isOpenLow && !isOpenHigh) return null;
      
      const strategyType = isOpenLow && isOpenHigh 
        ? 'NEUTRAL' // very rare
        : isOpenLow 
          ? 'OPEN_LOW' 
          : 'OPEN_HIGH';
          
      if (strategyType === 'NEUTRAL') return null;
      
      const difference = strategyType === 'OPEN_LOW' ? diffLow : diffHigh;
          
      return {
        ...s,
        strategyType,
        difference
      };
    }).filter(Boolean) as (StockCalculated & { strategyType: 'OPEN_LOW' | 'OPEN_HIGH', difference: number })[];
    
    // Sort by difference ascending (least difference on top)
    return list.sort((a, b) => a.difference - b.difference);
  }, [stocks]);

  const filteredStocks = useMemo(() => {
    return scannedStocks.filter(s => {
      if (filterType !== 'ALL' && s.strategyType !== filterType) return false;
      if (priceAbove1000) {
        const currentPrice = s.closePrice || s.openPrice || 0;
        if (currentPrice <= 1000) return false;
      }
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return s.symbol.toLowerCase().includes(search) || 
               s.companyName.toLowerCase().includes(search);
      }
      return true;
    });
  }, [scannedStocks, filterType, searchTerm, priceAbove1000]);

  const openLowCount = scannedStocks.filter(s => s.strategyType === 'OPEN_LOW').length;
  const openHighCount = scannedStocks.filter(s => s.strategyType === 'OPEN_HIGH').length;

  // AI Recommendation Logic (Best Open=Low)
  // Closest difference to 0, if multiple have same difference, sort by highest volumeRatio
  const topRecommendation = scannedStocks.filter(s => s.strategyType === 'OPEN_LOW').sort((a, b) => a.difference - b.difference || (b.volumeRatio || 0) - (a.volumeRatio || 0))[0];

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-xl">
              <Zap className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Open = High / Low Scanner</h1>
          </div>
          <p className="text-sm text-slate-400 max-w-xl leading-relaxed">
            Identifies stocks where the 9:15 AM - 9:16 AM (1-minute) Open price matches the High or Low. 
            Sorted by the <strong className="text-white">least difference</strong> between Open and High/Low.
            <br />
            <strong className="text-emerald-400 mr-1">Open = Low</strong> indicates strong bullish momentum. 
            <strong className="text-rose-400 mx-1">Open = High</strong> indicates strong bearish pressure.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto relative z-10">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search stocks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-48 bg-slate-950 border border-slate-800 text-sm text-white rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:border-cyan-500/50 transition-colors placeholder:text-slate-600"
            />
          </div>
        </div>
      </div>

      {/* AI Recommendation Banner */}
      {topRecommendation && (
        <div className="bg-gradient-to-r from-emerald-900/40 to-slate-900 border-2 border-emerald-500/30 rounded-2xl p-6 shadow-[0_8px_30px_rgba(16,185,129,0.15)] relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-6 cursor-pointer hover:border-emerald-500/60 transition-all group" onClick={() => onSelectStockDetail(topRecommendation)}>
           <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
           <div className="flex items-center gap-5 relative z-10">
             <div className="p-4 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30 group-hover:scale-110 transition-transform">
               <Cpu className="w-8 h-8" />
             </div>
             <div>
               <div className="text-emerald-400 font-bold uppercase tracking-widest text-xs flex items-center gap-2 mb-1"><Zap className="w-3 h-3"/> AI Algorithmic Top Pick</div>
               <h2 className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">{topRecommendation.symbol}</h2>
               <p className="text-slate-300 mt-1">Exceptional Open=Low candidate with <strong className="text-emerald-300">₹{topRecommendation.difference.toFixed(2)}</strong> variance.</p>
             </div>
           </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex space-x-2 overflow-x-auto no-scrollbar pb-2">
        <button
          onClick={() => setFilterType('ALL')}
          className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all shadow-sm flex items-center space-x-2 ${
            filterType === 'ALL'
              ? 'bg-slate-700 text-white shadow-md' 
              : 'bg-slate-900/50 text-slate-400 hover:bg-slate-800 border border-slate-800/50'
          }`}
        >
          <Filter className="w-4 h-4" />
          <span>All Scans ({scannedStocks.length})</span>
        </button>
        <button
          onClick={() => setFilterType('OPEN_LOW')}
          className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all shadow-sm flex items-center space-x-2 ${
            filterType === 'OPEN_LOW'
              ? 'bg-emerald-600 text-white border-emerald-400 shadow-md ring-2 ring-emerald-500/20' 
              : 'bg-emerald-950/20 text-emerald-400/70 border border-emerald-900/50 hover:bg-emerald-900/40'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Open = Low ({openLowCount})</span>
        </button>
        <button
          onClick={() => setFilterType('OPEN_HIGH')}
          className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all shadow-sm flex items-center space-x-2 ${
            filterType === 'OPEN_HIGH'
              ? 'bg-rose-600 text-white border-rose-400 shadow-md ring-2 ring-rose-500/20' 
              : 'bg-rose-950/20 text-rose-400/70 border border-rose-900/50 hover:bg-rose-900/40'
          }`}
        >
          <TrendingDown className="w-4 h-4" />
          <span>Open = High ({openHighCount})</span>
        </button>
        <button
          onClick={() => setPriceAbove1000(!priceAbove1000)}
          className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all shadow-sm flex items-center space-x-2 ${
            priceAbove1000
              ? 'bg-fuchsia-600 text-white border-fuchsia-400 shadow-md ring-2 ring-fuchsia-500/20' 
              : 'bg-fuchsia-950/20 text-fuchsia-400/70 border border-fuchsia-900/50 hover:bg-fuchsia-900/40'
          }`}
        >
          <span>💰 Price &gt; 1000</span>
        </button>
      </div>

      {/* Scanner Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredStocks.map(stock => {
          const isBull = stock.strategyType === 'OPEN_LOW';
          const pctChange = stock.pctChange !== undefined ? stock.pctChange : ((stock.closePrice! - stock.openPrice!) / stock.openPrice!) * 100;
          
          return (
            <div 
              key={stock.symbol}
              onClick={() => onSelectStockDetail(stock)}
              className={`group bg-slate-900 rounded-2xl border-2 transition-all cursor-pointer overflow-hidden ${
                isBull 
                  ? 'border-emerald-500/20 hover:border-emerald-500/50 hover:shadow-[0_8px_30px_rgba(16,185,129,0.15)]' 
                  : 'border-rose-500/20 hover:border-rose-500/50 hover:shadow-[0_8px_30px_rgba(244,63,94,0.15)]'
              }`}
            >
              {/* Card Header */}
              <div className={`px-4 py-3 border-b flex items-center justify-between ${
                isBull ? 'border-emerald-500/10 bg-emerald-500/5' : 'border-rose-500/10 bg-rose-500/5'
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
                  <span className="text-xs text-slate-400 truncate max-w-[150px]">{stock.companyName}</span>
                </div>
                <div className={`px-2.5 py-1 rounded-lg text-xs font-black font-mono shadow-sm flex flex-col items-end ${
                  pctChange >= 0 ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30' : 'bg-rose-950/80 text-rose-400 border border-rose-500/30'
                }`}>
                  <span className="text-white text-sm">₹{stock.closePrice?.toFixed(2) || stock.openPrice?.toFixed(2)}</span>
                  <span>{pctChange > 0 ? '+' : ''}{pctChange.toFixed(2)}%</span>
                </div>
              </div>

              {/* Strategy Badge */}
              <div className="p-4 space-y-4">
                {(stock as any).difference <= 0.05 && (
                  <div className="bg-emerald-500/20 border border-emerald-500/50 rounded-xl p-3 text-center mb-3 animate-pulse">
                    <p className="text-emerald-400 font-black text-lg uppercase tracking-widest flex items-center justify-center gap-2">
                      <Zap className="w-5 h-5" />
                      AI Recommends
                    </p>
                    <p className="text-emerald-500 text-[10px] font-bold mt-1">Exceptional Match</p>
                  </div>
                )}
                <div className={`p-3 rounded-xl border flex items-center gap-3 ${
                  isBull ? 'bg-emerald-950/30 border-emerald-500/30' : 'bg-rose-950/30 border-rose-500/30'
                }`}>
                  <div className={`p-2 rounded-lg ${isBull ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    <Target className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className={`text-sm font-black uppercase tracking-wider ${isBull ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isBull ? 'OPEN = LOW' : 'OPEN = HIGH'}
                    </h4>
                    <p className="text-xs font-mono mt-0.5 text-slate-300">
                      Open: ₹{stock.first1mOpen?.toFixed(2)}
                      <span className="mx-1 text-slate-500">|</span>
                      {isBull ? 'Low' : 'High'}: ₹{isBull ? stock.first1mLow?.toFixed(2) : stock.first1mHigh?.toFixed(2)}
                    </p>
                    <p className={`text-[11px] font-mono mt-0.5 ${isBull ? 'text-emerald-500' : 'text-rose-500'}`}>
                      Difference: ₹{(stock as any).difference.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Additional metrics if available */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800">
                    <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">Lot Size</div>
                    <div className="text-base font-mono font-black text-indigo-400">
                      {stock.lotSizeAug2026 ?? stock.lotSizeJul2026 ?? stock.lotSizeJun2026 ?? '-'}
                    </div>
                  </div>
                  {stock.volumeRatio !== undefined && (
                    <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800">
                      <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">Vol Spike</div>
                      <div className={`text-sm font-mono font-black ${stock.volumeRatio >= 1.5 ? 'text-amber-400' : 'text-slate-300'}`}>
                        {stock.volumeRatio.toFixed(1)}x
                      </div>
                    </div>
                  )}
                  {stock.rsi !== undefined && (
                    <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800">
                      <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">RSI (14)</div>
                      <div className={`text-sm font-mono font-black ${stock.rsi >= 60 ? 'text-emerald-400' : stock.rsi <= 40 ? 'text-rose-400' : 'text-slate-300'}`}>
                        {stock.rsi.toFixed(1)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenPositionSizer(stock);
                    }}
                    className={`flex-1 font-bold text-xs py-2 px-3 rounded-xl transition-colors flex items-center justify-center gap-1.5 ${
                      isBull 
                        ? 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30' 
                        : 'bg-rose-600/20 text-rose-400 hover:bg-rose-600/30'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Plan Trade
                  </button>
                  <a
                    href={stock.screenerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors flex items-center justify-center border border-slate-700"
                    title="Open Charting"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredStocks.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-slate-500" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No Matches Found</h3>
          <p className="text-slate-400 max-w-md mx-auto">
            {searchTerm 
              ? `No stocks matching "${searchTerm}" found in the Open = High/Low scan.`
              : `No stocks currently meet the Open = ${filterType === 'OPEN_LOW' ? 'Low' : filterType === 'OPEN_HIGH' ? 'High' : 'High/Low'} criteria based on the imported data.`}
          </p>
        </div>
      )}
    </div>
  );
}
