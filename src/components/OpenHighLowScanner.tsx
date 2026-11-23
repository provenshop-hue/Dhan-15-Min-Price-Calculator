import React, { useState, useMemo } from 'react';
import { StockCalculated } from '../types';
import { SectorDominanceBadgesBar } from './SectorDominanceBadgesBar';
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
  CheckCircle2
} from 'lucide-react';

interface Props {
  stocks: StockCalculated[];
  onSelectStockDetail: (stock: StockCalculated) => void;
  onOpenPositionSizer: (stock: StockCalculated) => void;
}

export function OpenHighLowScanner({ stocks, onSelectStockDetail, onOpenPositionSizer }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'PERFECT_BULLISH' | 'PERFECT_BEARISH' | 'PERFECT_BULLISH_ZERO' | 'PERFECT_BEARISH_ZERO' | 'OPEN_LOW' | 'OPEN_HIGH'>('ALL');
  const [priceAbove1000, setPriceAbove1000] = useState(false);

  const scannedStocks = useMemo(() => {
    const list = stocks.map(s => {
      // Prioritize official true session OHLC from openPrice, highPrice, lowPrice, closePrice/ltp
      const open = s.openPrice ?? s.first15mOpen ?? s.first1mOpen;
      const high = s.highPrice ?? s.dayHigh ?? s.first15mHigh;
      const low = s.lowPrice ?? s.dayLow ?? s.first15mLow;
      const close = s.closePrice ?? s.ltp ?? s.first15mClose ?? open;
      
      if (open == null || high == null || low == null || close == null || isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close)) {
        return null;
      }
      
      const diffLow = Math.abs(open - low);
      const diffHigh = Math.abs(open - high);
      
      const isOpenLow = diffLow <= 0.30 || (diffLow / open) * 100 <= 0.30;
      const isOpenHigh = diffHigh <= 0.30 || (diffHigh / open) * 100 <= 0.30;

      const isBullishOpenLow = isOpenLow && (close >= open * 0.998);
      const isBearishOpenHigh = isOpenHigh && (close <= open * 1.002);

      const isExactOpenLow = Math.abs(open - low) < 1e-4;
      const isExactOpenHigh = Math.abs(open - high) < 1e-4;

      const isWholeRupee = Math.abs(open - Math.round(open)) < 1e-4;
      const isEndingInZero = isWholeRupee && (Math.round(open) % 10 === 0);

      const rawS = s as any;
      const middleBand = rawS.ema20 !== undefined && rawS.ema20 !== null ? rawS.ema20 : (high + low + (close * 2)) / 4;
      const isLowerHalfBb = open <= middleBand;
      const isHigherHalfBb = open >= middleBand;

      const isPerfectBullishZero = isExactOpenLow && isEndingInZero && high > open && close > open && isLowerHalfBb;
      const isPerfectBearishZero = isExactOpenHigh && isEndingInZero && low < open && close < open && isHigherHalfBb;
      const isPerfectBullish = isExactOpenLow && isWholeRupee && high > open && close > open && isLowerHalfBb;
      const isPerfectBearish = isExactOpenHigh && isWholeRupee && low < open && close < open && isHigherHalfBb;

      if (!isBullishOpenLow && !isBearishOpenHigh && !isPerfectBullish && !isPerfectBearish && !isPerfectBullishZero && !isPerfectBearishZero) return null;

      const strategyType = isPerfectBullishZero 
        ? 'PERFECT_BULLISH_ZERO' 
        : isPerfectBearishZero 
          ? 'PERFECT_BEARISH_ZERO' 
          : isPerfectBullish 
            ? 'PERFECT_BULLISH' 
            : isPerfectBearish 
              ? 'PERFECT_BEARISH' 
              : isBullishOpenLow 
                ? 'OPEN_LOW' 
                : 'OPEN_HIGH';

      const difference = (strategyType === 'PERFECT_BULLISH_ZERO' || strategyType === 'PERFECT_BULLISH' || strategyType === 'OPEN_LOW') ? diffLow : diffHigh;

      return {
        ...s,
        open,
        high,
        low,
        close,
        middleBand,
        isLowerHalfBb,
        isHigherHalfBb,
        strategyType,
        difference,
        isWholeRupee,
        isEndingInZero,
        isPerfectBullish,
        isPerfectBearish,
        isPerfectBullishZero,
        isPerfectBearishZero,
        isTopPriorityOpenLow: isBullishOpenLow
      };
    }).filter(Boolean) as any[];

    return list.sort((a, b) => {
      if (a.strategyType === 'PERFECT_BULLISH_ZERO' && b.strategyType !== 'PERFECT_BULLISH_ZERO') return -1;
      if (a.strategyType !== 'PERFECT_BULLISH_ZERO' && b.strategyType === 'PERFECT_BULLISH_ZERO') return 1;
      if (a.strategyType === 'PERFECT_BULLISH' && b.strategyType !== 'PERFECT_BULLISH') return -1;
      if (a.strategyType !== 'PERFECT_BULLISH' && b.strategyType === 'PERFECT_BULLISH') return 1;
      return a.difference - b.difference;
    });
  }, [stocks]);

  const filteredStocks = useMemo(() => {
    return scannedStocks.filter(s => {
      if (filterType !== 'ALL' && s.strategyType !== filterType) return false;
      if (priceAbove1000) {
        const currentPrice = s.close || s.open || 0;
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

  const perfectBullishZeroCount = scannedStocks.filter(s => s.strategyType === 'PERFECT_BULLISH_ZERO').length;
  const perfectBearishZeroCount = scannedStocks.filter(s => s.strategyType === 'PERFECT_BEARISH_ZERO').length;
  const perfectBullishCount = scannedStocks.filter(s => s.strategyType === 'PERFECT_BULLISH').length;
  const perfectBearishCount = scannedStocks.filter(s => s.strategyType === 'PERFECT_BEARISH').length;
  const openLowCount = scannedStocks.filter(s => s.strategyType === 'OPEN_LOW').length;
  const openHighCount = scannedStocks.filter(s => s.strategyType === 'OPEN_HIGH').length;

  const topRecommendation = scannedStocks.filter(s => s.strategyType === 'PERFECT_BULLISH_ZERO' || s.strategyType === 'PERFECT_BULLISH' || s.strategyType === 'OPEN_LOW').sort((a, b) => {
    if (a.strategyType === 'PERFECT_BULLISH_ZERO' && b.strategyType !== 'PERFECT_BULLISH_ZERO') return -1;
    if (a.strategyType !== 'PERFECT_BULLISH_ZERO' && b.strategyType === 'PERFECT_BULLISH_ZERO') return 1;
    if (a.strategyType === 'PERFECT_BULLISH' && b.strategyType !== 'PERFECT_BULLISH') return -1;
    if (a.strategyType !== 'PERFECT_BULLISH' && b.strategyType === 'PERFECT_BULLISH') return 1;
    return a.difference - b.difference || (b.volumeRatio || 0) - (a.volumeRatio || 0);
  })[0];

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <SectorDominanceBadgesBar 
        stocks={stocks} 
        onSelectStock={(stk) => onSelectStockDetail(stk)} 
        title="🏢 Open = High / Low, Zero Ending & Bollinger Band Sector Dominance"
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-xl">
              <Zap className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Open = High / Low & Zero-Ending Scanner Hub</h1>
          </div>
          <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
            Identifies stocks where Open equals Low or High with exact values.
            <br />
            <strong className="text-emerald-400">Perfect Bullish (Ending in 0)</strong> requires <strong className="text-white">Open = Low</strong> + Decimal ending in 0 (e.g. 190.0, 200.0) + Lower half of BB.
            <strong className="text-rose-400 ml-1">Perfect Bearish (Ending in 0)</strong> requires <strong className="text-white">Open = High</strong> + Decimal ending in 0 + Higher half of BB.
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
               <div className="text-emerald-400 font-bold uppercase tracking-widest text-xs flex items-center gap-2 mb-1">
                 <Zap className="w-3 h-3"/> {topRecommendation.strategyType === 'PERFECT_BULLISH_ZERO' ? 'Perfect Bullish (Ending in 0) Top Pick' : 'AI Algorithmic Top Pick'}
               </div>
               <h2 className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">{topRecommendation.symbol}</h2>
               <p className="text-slate-300 mt-1">
                 {topRecommendation.strategyType === 'PERFECT_BULLISH_ZERO' ? 'Perfect Open=Low (Ending in 0) in Lower Bollinger Band.' : 'Exceptional Open=Low candidate.'}
                 <strong className="text-emerald-300 ml-1">₹{topRecommendation.difference.toFixed(1)}</strong> variance.
               </p>
               <div className="flex flex-wrap items-center gap-3 mt-2 text-xs font-mono text-slate-300 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                 <span>Open: <strong className="text-white">₹{topRecommendation.open.toFixed(1)}</strong></span>
                 <span className="text-slate-600">•</span>
                 <span>Low: <strong className="text-emerald-400">₹{topRecommendation.low.toFixed(1)} (Exact Match)</strong></span>
                 <span className="text-slate-600">•</span>
                 <span>BB Middle: <strong className="text-amber-400">₹{topRecommendation.middleBand.toFixed(1)}</strong></span>
                 <span className="text-slate-600">•</span>
                 <span>Close: <strong className="text-blue-400">₹{topRecommendation.close.toFixed(1)}</strong></span>
               </div>
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
          onClick={() => setFilterType('PERFECT_BULLISH_ZERO')}
          className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all shadow-sm flex items-center space-x-2 ${
            filterType === 'PERFECT_BULLISH_ZERO'
              ? 'bg-emerald-600 text-white border-emerald-400 shadow-md ring-2 ring-emerald-500/20' 
              : 'bg-emerald-950/40 text-emerald-300 border border-emerald-700/70 hover:bg-emerald-900/40'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span>PERFECT BULLISH (Ending in 0) ({perfectBullishZeroCount})</span>
        </button>
        <button
          onClick={() => setFilterType('PERFECT_BEARISH_ZERO')}
          className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all shadow-sm flex items-center space-x-2 ${
            filterType === 'PERFECT_BEARISH_ZERO'
              ? 'bg-rose-600 text-white border-rose-400 shadow-md ring-2 ring-rose-500/20' 
              : 'bg-rose-950/40 text-rose-300 border border-rose-700/70 hover:bg-rose-900/40'
          }`}
        >
          <TrendingDown className="w-4 h-4 text-rose-400" />
          <span>PERFECT BEARISH (Ending in 0) ({perfectBearishZeroCount})</span>
        </button>
        <button
          onClick={() => setFilterType('PERFECT_BULLISH')}
          className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all shadow-sm flex items-center space-x-2 ${
            filterType === 'PERFECT_BULLISH'
              ? 'bg-emerald-600 text-white border-emerald-400 shadow-md ring-2 ring-emerald-500/20' 
              : 'bg-emerald-950/20 text-emerald-400/70 border border-emerald-900/50 hover:bg-emerald-900/40'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>PERFECT BULLISH (.0) ({perfectBullishCount})</span>
        </button>
        <button
          onClick={() => setFilterType('PERFECT_BEARISH')}
          className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all shadow-sm flex items-center space-x-2 ${
            filterType === 'PERFECT_BEARISH'
              ? 'bg-rose-600 text-white border-rose-400 shadow-md ring-2 ring-rose-500/20' 
              : 'bg-rose-950/20 text-rose-400/70 border border-rose-900/50 hover:bg-rose-900/40'
          }`}
        >
          <TrendingDown className="w-4 h-4" />
          <span>PERFECT BEARISH (.0) ({perfectBearishCount})</span>
        </button>
        <button
          onClick={() => setFilterType('OPEN_LOW')}
          className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all shadow-sm flex items-center space-x-2 ${
            filterType === 'OPEN_LOW'
              ? 'bg-emerald-600 text-white border-emerald-400 shadow-md ring-2 ring-emerald-500/20' 
              : 'bg-slate-900/50 text-slate-400 hover:bg-slate-800 border border-slate-800/50'
          }`}
        >
          <span>Open = Low ({openLowCount})</span>
        </button>
        <button
          onClick={() => setFilterType('OPEN_HIGH')}
          className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all shadow-sm flex items-center space-x-2 ${
            filterType === 'OPEN_HIGH'
              ? 'bg-rose-600 text-white border-rose-400 shadow-md ring-2 ring-rose-500/20' 
              : 'bg-slate-900/50 text-slate-400 hover:bg-slate-800 border border-slate-800/50'
          }`}
        >
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
          const isBull = stock.strategyType === 'PERFECT_BULLISH_ZERO' || stock.strategyType === 'PERFECT_BULLISH' || stock.strategyType === 'OPEN_LOW';
          const isPerfectZero = stock.strategyType === 'PERFECT_BULLISH_ZERO' || stock.strategyType === 'PERFECT_BEARISH_ZERO';
          const isPerfect = isPerfectZero || stock.strategyType === 'PERFECT_BULLISH' || stock.strategyType === 'PERFECT_BEARISH';
          const pctChange = stock.pctChange !== undefined && stock.pctChange !== null ? stock.pctChange : ((stock.close - stock.open) / stock.open) * 100;
          
          return (
            <div 
              key={stock.symbol}
              onClick={() => onSelectStockDetail(stock)}
              className={`group bg-slate-900 rounded-2xl border-2 transition-all cursor-pointer overflow-hidden ${
                isBull 
                  ? 'border-emerald-500/30 hover:border-emerald-500/60 hover:shadow-[0_8px_30px_rgba(16,185,129,0.2)]' 
                  : 'border-rose-500/30 hover:border-rose-500/60 hover:shadow-[0_8px_30px_rgba(244,63,94,0.2)]'
              }`}
            >
              {/* Card Header */}
              <div className={`px-4 py-3 border-b flex items-center justify-between ${
                isBull ? 'border-emerald-500/10 bg-emerald-500/10' : 'border-rose-500/10 bg-rose-500/10'
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
                  <span className="text-white text-sm">₹{stock.close.toFixed(1)}</span>
                  <span>{pctChange > 0 ? '+' : ''}{pctChange.toFixed(2)}%</span>
                </div>
              </div>

              {/* Strategy Badge & Classification */}
              <div className="p-4 space-y-3">
                {isPerfect && (
                  <div className={`border rounded-xl p-2.5 text-center mb-1 ${
                    stock.strategyType === 'PERFECT_BULLISH_ZERO' || stock.strategyType === 'PERFECT_BULLISH'
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' 
                      : 'bg-rose-500/20 border-rose-500/50 text-rose-400'
                  }`}>
                    <p className="font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {stock.strategyType === 'PERFECT_BULLISH_ZERO' ? 'PERFECT BULLISH (Ending in 0)' :
                       stock.strategyType === 'PERFECT_BEARISH_ZERO' ? 'PERFECT BEARISH (Ending in 0)' :
                       stock.strategyType === 'PERFECT_BULLISH' ? 'PERFECT BULLISH (.0)' : 'PERFECT BEARISH (.0)'}
                    </p>
                    <p className="text-[10px] font-mono mt-0.5 opacity-90">
                      Open: ₹{stock.open.toFixed(1)} • {stock.isEndingInZero ? 'Ending in 0 (Strict)' : 'Whole Rupee .0'}
                    </p>
                  </div>
                )}

                <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-mono font-bold ${
                  stock.isLowerHalfBb
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                }`}>
                  <span>Bollinger Band Half:</span>
                  <span>{stock.isLowerHalfBb ? '🟢 Lower Half (<= Mid)' : '🔴 Higher Half (> Mid)'}</span>
                </div>

                <div className={`p-3 rounded-xl border flex items-center gap-3 ${
                  isBull ? 'bg-emerald-950/30 border-emerald-500/30' : 'bg-rose-950/30 border-rose-500/30'
                }`}>
                  <div className={`p-2 rounded-lg ${isBull ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    <Target className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className={`text-xs font-black uppercase tracking-wider ${isBull ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {stock.strategyType === 'PERFECT_BULLISH_ZERO' ? 'PERFECT BULLISH (0)' :
                       stock.strategyType === 'PERFECT_BEARISH_ZERO' ? 'PERFECT BEARISH (0)' :
                       stock.strategyType === 'PERFECT_BULLISH' ? 'PERFECT BULLISH (.0)' :
                       stock.strategyType === 'PERFECT_BEARISH' ? 'PERFECT BEARISH (.0)' :
                       stock.strategyType === 'OPEN_LOW' ? 'OPEN = LOW' : 'OPEN = HIGH'}
                    </h4>
                    <p className={`text-[11px] font-mono mt-0.5 ${isBull ? 'text-emerald-500' : 'text-rose-500'}`}>
                      Difference: ₹{stock.difference.toFixed(1)} {stock.isEndingInZero ? '• Ends in 0' : ''}
                    </p>
                  </div>
                </div>

                {/* Open, High, Low, Close (OHLC) Metrics Bar (1 Decimal Place) */}
                <div className="grid grid-cols-4 gap-1.5 p-2 bg-slate-950/80 rounded-xl border border-slate-800 text-center font-mono">
                  <div className="p-1 rounded bg-slate-900/60 border border-slate-800/60">
                    <div className="text-[9px] uppercase text-slate-400 font-sans font-bold">Open</div>
                    <div className="text-xs font-black text-white">₹{stock.open.toFixed(1)}</div>
                  </div>
                  <div className="p-1 rounded bg-rose-950/30 border border-rose-900/40">
                    <div className="text-[9px] uppercase text-rose-400 font-sans font-bold">High</div>
                    <div className="text-xs font-black text-rose-300">₹{stock.high.toFixed(1)}</div>
                  </div>
                  <div className="p-1 rounded bg-emerald-950/30 border border-emerald-900/40">
                    <div className="text-[9px] uppercase text-emerald-400 font-sans font-bold">Low</div>
                    <div className="text-xs font-black text-emerald-300">₹{stock.low.toFixed(1)}</div>
                  </div>
                  <div className="p-1 rounded bg-blue-950/30 border border-blue-900/40">
                    <div className="text-[9px] uppercase text-blue-400 font-sans font-bold">Close</div>
                    <div className="text-xs font-black text-blue-300">₹{stock.close.toFixed(1)}</div>
                  </div>
                </div>

                {/* Additional metrics */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800">
                    <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">Lot Size</div>
                    <div className="text-base font-mono font-black text-indigo-400">
                      {stock.lotSizeAug2026 ?? stock.lotSizeJul2026 ?? stock.lotSizeJun2026 ?? '-'}
                    </div>
                  </div>
                  {stock.volumeRatio !== undefined && stock.volumeRatio !== null && (
                    <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800">
                      <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">Vol Spike</div>
                      <div className={`text-sm font-mono font-black ${stock.volumeRatio >= 1.5 ? 'text-amber-400' : 'text-slate-300'}`}>
                        {stock.volumeRatio.toFixed(1)}x
                      </div>
                    </div>
                  )}
                  {stock.rsi !== undefined && stock.rsi !== null && (
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
              ? `No stocks matching "${searchTerm}" found in the scan.`
              : `No stocks currently meet the selected filter criteria (${filterType}) with whole-sum zero ending, exact Open=Low/High match, and Bollinger Band condition.`}
          </p>
        </div>
      )}
    </div>
  );
}
