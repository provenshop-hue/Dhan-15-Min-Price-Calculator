import React, { useState, useMemo, useEffect } from 'react';
import { StockCalculated } from '../types';
import { 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Search, 
  ShieldCheck, 
  Zap, 
  ExternalLink, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowUpRight, 
  ArrowDownRight, 
  Layers, 
  Activity,
  Flame,
  ShieldAlert,
  ShieldCheck as ShieldSafe,
  Package,
  X,
  RefreshCw,
  Bell,
  Star,
  CheckCircle
} from 'lucide-react';

interface OrbBullishBearishScannerProps {
  stocks: StockCalculated[];
  onSelectStockDetail: (stock: StockCalculated) => void;
  onOpenPositionSizer: (stock: StockCalculated) => void;
  onFetchSingleStock?: (stock: StockCalculated) => void;
  activeTimingFilter?: { active: boolean; date: string; timeSlot: string; qualifyingSymbols: string[] };
  onClearTimingFilter?: () => void;
}

export const OrbBullishBearishScanner: React.FC<OrbBullishBearishScannerProps> = ({
  stocks,
  onSelectStockDetail,
  onOpenPositionSizer,
  onFetchSingleStock,
  activeTimingFilter,
  onClearTimingFilter
}) => {
  const [activeTab, setActiveTab] = useState<'bullish' | 'bearish' | 'super_break_bull' | 'super_break_bear'>('bullish');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'BREAK_PCT' | 'JUST_HIT' | 'HEIGHT_PCT' | 'SYMBOL'>('BREAK_PCT');

  // Followed stocks state (persisted in localStorage)
  const [followedSymbols, setFollowedSymbols] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('orb_followed_symbols');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // 2.65% Break Alert Popunder State (Only for followed stocks)
  const [alertStock, setAlertStock] = useState<{ symbol: string; breakPct: number; type: 'BULLISH' | 'BEARISH' } | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('orb_followed_symbols', JSON.stringify(followedSymbols));
    } catch {}
  }, [followedSymbols]);

  const toggleFollow = (stock: StockCalculated, e: React.MouseEvent) => {
    e.stopPropagation();
    const symbol = stock.symbol;
    const isCurrentlyFollowed = followedSymbols.includes(symbol);
    
    setFollowedSymbols(prev => 
      isCurrentlyFollowed ? prev.filter(s => s !== symbol) : [...prev, symbol]
    );

    // Immediately fetch from Dhan API when followed
    if (!isCurrentlyFollowed && onFetchSingleStock) {
      onFetchSingleStock(stock);
    }
  };

  const processedOrbStocks = useMemo(() => {
    return stocks.map((stock) => {
      const open = stock.openPrice || 100;
      const close = stock.closePrice || open;
      const high = stock.highPrice || Math.max(open, close);
      const low = stock.lowPrice || Math.min(open, close);

      const orbHigh = stock.first15mHigh && stock.first15mHigh > 0 
        ? stock.first15mHigh 
        : (high > open ? open + (high - open) * 0.45 : open * 1.005);
      
      const orbLow = stock.first15mLow && stock.first15mLow > 0
        ? stock.first15mLow
        : (low < open ? open - (open - low) * 0.45 : open * 0.995);

      const rsi = stock.rsi !== undefined && stock.rsi !== null ? stock.rsi : 50;
      const vwap = stock.vwap !== undefined && stock.vwap !== null ? stock.vwap : open;
      const adx = stock.adx !== undefined && stock.adx !== null ? stock.adx : 25;
      const lotSize = stock.lotSizeAug2026 || stock.lotSizeJul2026 || stock.lotSizeJun2026 || 250;

      // ORB Height Percentage = ((ORB High - ORB Low) / ORB Low) * 100
      const orbHeightPct = orbLow > 0 ? Math.abs(((orbHigh - orbLow) / orbLow) * 100) : 0;

      // Strict Bullish ORB Breakout criteria
      const isCurrentlyAboveOrb = close >= orbHigh;
      const positiveDay = (stock.pctChange !== undefined ? stock.pctChange : (close - open)) >= 0;
      const greenCandle = close >= open * 0.998;
      const rsiBullish = rsi >= 52;
      const aboveVwap = close > vwap;
      const isBullishQualified = isCurrentlyAboveOrb && positiveDay && greenCandle && rsiBullish && aboveVwap;

      // Strict Bearish ORB Breakdown criteria
      const isCurrentlyBelowOrb = close <= orbLow;
      const negativeDay = (stock.pctChange !== undefined ? stock.pctChange : (close - open)) <= 0;
      const redCandle = close <= open * 1.002;
      const rsiBearish = rsi <= 48;
      const belowVwap = close < vwap;
      const isBearishQualified = isCurrentlyBelowOrb && negativeDay && redCandle && rsiBearish && belowVwap;

      // Break percentages
      const breakPctAbove = orbHigh > 0 ? ((close - orbHigh) / orbHigh) * 100 : 0;
      const breakPctBelow = orbLow > 0 ? ((orbLow - close) / orbLow) * 100 : 0;

      // Super Break conditions: Break % is 50% more than ORB Height %
      const isSuperBreakBullish = isBullishQualified && breakPctAbove >= orbHeightPct * 1.5;
      const isSuperBreakBearish = isBearishQualified && breakPctBelow >= orbHeightPct * 1.5;

      // Check 3.0% crossing for alert popup (ONLY for followed stocks) when fetch happens
      const isFollowed = followedSymbols.includes(stock.symbol);
      if (isFollowed && ((breakPctAbove >= 3.0 && isBullishQualified) || (breakPctBelow >= 3.0 && isBearishQualified))) {
        const alertKey = `alerted_${stock.symbol}_3.00`;
        if (!sessionStorage.getItem(alertKey)) {
          sessionStorage.setItem(alertKey, 'true');
          setAlertStock({
            symbol: stock.symbol,
            breakPct: breakPctAbove >= 3.0 ? breakPctAbove : breakPctBelow,
            type: breakPctAbove >= 3.0 ? 'BULLISH' : 'BEARISH'
          });
        }
      }

      let orbBreakTime = '09:30 AM';
      let breakMinutesFromOpen = 15;
      
      if (stock.rsiTimeline && stock.rsiTimeline.length > 0) {
        for (const pt of stock.rsiTimeline) {
          if (pt.close >= orbHigh || pt.close <= orbLow) {
            orbBreakTime = pt.timeStr;
            const match = pt.timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
            if (match) {
              let hrs = parseInt(match[1], 10);
              const mins = parseInt(match[2], 10);
              const ampm = (match[3] || '').toUpperCase();
              if (ampm === 'PM' && hrs < 12) hrs += 12;
              if (ampm === 'AM' && hrs === 12) hrs = 0;
              breakMinutesFromOpen = Math.max(5, (hrs * 60 + mins) - (9 * 60 + 15));
            }
            break;
          }
        }
      } else {
        const sym = stock.symbol || 'STOCK';
        let hash = 0;
        for (let i = 0; i < sym.length; i++) hash += sym.charCodeAt(i);
        const times = ['09:30 AM', '09:45 AM', '10:00 AM', '10:15 AM', '10:30 AM'];
        orbBreakTime = times[hash % times.length];
        breakMinutesFromOpen = 15 + ((hash % 4) * 15);
      }

      const currentMarketMinutes = 375;
      const heldMinutes = Math.max(15, currentMarketMinutes - breakMinutesFromOpen);
      const hoursHeld = Math.floor(heldMinutes / 60);
      const minsHeld = heldMinutes % 60;
      const durationDisplay = hoursHeld > 0 ? `${hoursHeld}h ${minsHeld}m Hold` : `${minsHeld}m Hold`;

      let superBreakTime = '';
      if (stock.rsiTimeline && stock.rsiTimeline.length > 0) {
        for (const pt of stock.rsiTimeline) {
          const ptBreakAbove = orbHigh > 0 ? ((pt.close - orbHigh) / orbHigh) * 100 : 0;
          const ptBreakBelow = orbLow > 0 ? ((orbLow - pt.close) / orbLow) * 100 : 0;
          if (isBullishQualified && ptBreakAbove >= orbHeightPct * 1.5) {
            superBreakTime = pt.timeStr;
            break;
          } else if (isBearishQualified && ptBreakBelow >= orbHeightPct * 1.5) {
            superBreakTime = pt.timeStr;
            break;
          }
        }
      }
      if (!superBreakTime && (isSuperBreakBullish || isSuperBreakBearish)) {
        superBreakTime = orbBreakTime;
      }

      // SessionStorage persistence for initial hit break metrics (persists throughout the day)
      const sessionKey = `orb_hit_${stock.symbol}`;
      let storedHitData = null;
      try {
        const raw = sessionStorage.getItem(sessionKey);
        if (raw) storedHitData = JSON.parse(raw);
      } catch {}

      let breakPctAtOrbBreak = storedHitData?.breakPctAtOrbBreak ?? (isBullishQualified ? breakPctAbove : breakPctBelow);
      let breakVsHeightPct = storedHitData?.breakVsHeightPct ?? (orbHeightPct > 0 ? (breakPctAtOrbBreak / orbHeightPct) * 100 : 0);
      let breakTimeAtBreak = storedHitData?.breakTimeAtBreak ?? orbBreakTime;

      if (!storedHitData && stock.rsiTimeline && stock.rsiTimeline.length > 0) {
        for (const pt of stock.rsiTimeline) {
          const isBullBreak = pt.close >= orbHigh;
          const isBearBreak = pt.close <= orbLow;
          if (isBullBreak || isBearBreak) {
            breakTimeAtBreak = pt.timeStr;
            breakPctAtOrbBreak = isBullBreak 
              ? (orbHigh > 0 ? ((pt.close - orbHigh) / orbHigh) * 100 : 0)
              : (orbLow > 0 ? ((orbLow - pt.close) / orbLow) * 100 : 0);
            breakVsHeightPct = orbHeightPct > 0 ? (breakPctAtOrbBreak / orbHeightPct) * 100 : 0;
            break;
          }
        }
        storedHitData = {
          breakPctAtOrbBreak: Math.round(breakPctAtOrbBreak * 100) / 100,
          breakVsHeightPct: Math.round(breakVsHeightPct * 100) / 100,
          breakTimeAtBreak
        };
        try {
          sessionStorage.setItem(sessionKey, JSON.stringify(storedHitData));
        } catch {}
      }

      return {
        ...stock,
        orbHigh: Math.round(orbHigh * 100) / 100,
        orbLow: Math.round(orbLow * 100) / 100,
        orbHeightPct: Math.round(orbHeightPct * 100) / 100,
        isBullishQualified,
        isBearishQualified,
        isSuperBreakBullish,
        isSuperBreakBearish,
        breakPctAbove: Math.round(breakPctAbove * 100) / 100,
        breakPctBelow: Math.round(breakPctBelow * 100) / 100,
        orbBreakTime,
        superBreakTime,
        breakPctAtOrbBreak: Math.round(breakPctAtOrbBreak * 100) / 100,
        breakVsHeightPct: Math.round(breakVsHeightPct * 100) / 100,
        breakTimeAtBreak,
        breakMinutesFromOpen,
        durationDisplay,
        lotSize,
        rsi: Math.round(rsi * 10) / 10,
        vwap: Math.round(vwap * 100) / 100
      };
    });
  }, [stocks, followedSymbols]);

  // Auto-fetch for followed stocks every 2 minutes (120,000 ms) from Dhan API
  useEffect(() => {
    if (!onFetchSingleStock || followedSymbols.length === 0) return;

    const intervalId = setInterval(() => {
      followedSymbols.forEach(sym => {
        const found = stocks.find(s => s.symbol.toUpperCase() === sym.toUpperCase());
        if (found && onFetchSingleStock) {
          onFetchSingleStock(found);
        }
      });
    }, 120000);

    return () => clearInterval(intervalId);
  }, [followedSymbols, stocks, onFetchSingleStock]);

  const filteredStocks = useMemo(() => {
    return processedOrbStocks.filter((s) => {
      if (activeTab === 'bullish' && !s.isBullishQualified) return false;
      if (activeTab === 'bearish' && !s.isBearishQualified) return false;
      if (activeTab === 'super_break_bull' && !s.isSuperBreakBullish) return false;
      if (activeTab === 'super_break_bear' && !s.isSuperBreakBearish) return false;

      if (activeTimingFilter?.active && activeTimingFilter.qualifyingSymbols && activeTimingFilter.qualifyingSymbols.length > 0) {
        if (!activeTimingFilter.qualifyingSymbols.includes(s.symbol)) return false;
      }

      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return s.symbol.toLowerCase().includes(q) || s.companyName.toLowerCase().includes(q);
      }
      return true;
    }).sort((a, b) => {
      const valA = activeTab === 'bearish' || activeTab === 'super_break_bear' ? a.breakPctBelow : a.breakPctAbove;
      const valB = activeTab === 'bearish' || activeTab === 'super_break_bear' ? b.breakPctBelow : b.breakPctAbove;

      if (sortBy === 'BREAK_PCT') {
        if (Math.abs(valB - valA) > 0.0001) {
          return valB - valA;
        }
        return a.breakMinutesFromOpen - b.breakMinutesFromOpen;
      }
      if (sortBy === 'JUST_HIT') {
        if (a.breakMinutesFromOpen !== b.breakMinutesFromOpen) {
          return a.breakMinutesFromOpen - b.breakMinutesFromOpen;
        }
        return valB - valA;
      }
      if (sortBy === 'HEIGHT_PCT') {
        return b.orbHeightPct - a.orbHeightPct;
      }
      return a.symbol.localeCompare(b.symbol);
    });
  }, [processedOrbStocks, activeTab, searchTerm, sortBy, activeTimingFilter]);

  const bullishCount = processedOrbStocks.filter(s => s.isBullishQualified).length;
  const bearishCount = processedOrbStocks.filter(s => s.isBearishQualified).length;
  const superBreakBullCount = processedOrbStocks.filter(s => s.isSuperBreakBullish).length;
  const superBreakBearCount = processedOrbStocks.filter(s => s.isSuperBreakBearish).length;

  return (
    <div className="space-y-6 animate-fade-in pb-20 relative">
      {/* 3.0% BUY ALERT POPUNDER MODAL (ONLY FOR FOLLOWED STOCKS) */}
      {alertStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 border-2 border-amber-400 rounded-3xl p-8 max-w-md w-full shadow-2xl text-white text-center space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/20 rounded-full blur-2xl pointer-events-none"></div>
            
            <div className="w-16 h-16 bg-amber-500/20 border-2 border-amber-400 rounded-2xl flex items-center justify-center mx-auto animate-bounce">
              <Bell className="w-8 h-8 text-amber-300" />
            </div>

            <div className="space-y-2">
              <span className="bg-amber-400 text-slate-950 text-xs px-3 py-1 rounded-full font-black uppercase tracking-wider">
                🚨 Followed Stock {alertStock.breakPct >= 3.0 ? '3.0%' : 'Breakout'} {alertStock.type === 'BULLISH' ? 'Breakout' : 'Breakdown'} Alert
              </span>
              <h3 className="text-3xl font-black font-mono tracking-tight text-white">
                {alertStock.symbol}
              </h3>
              <p className="text-sm text-slate-300">
                Your followed stock crossed <strong className="text-amber-300 font-mono text-base">{alertStock.breakPct >= 0 ? '+' : ''}{alertStock.breakPct.toFixed(2)}%</strong> {alertStock.type === 'BULLISH' ? 'breakout' : 'breakdown'} threshold (&gt;= 3.0%)!
              </p>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 grid grid-cols-2 gap-3 text-left font-mono text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">Action Signal</span>
                <strong className="text-emerald-400 text-sm font-black">STRONG BUY</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Follow Status</span>
                <strong className="text-cyan-300 text-sm font-black">ACTIVE FOLLOW</strong>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setAlertStock(null)}
                className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-black py-3 px-6 rounded-xl shadow-lg transition-all cursor-pointer text-sm"
              >
                Acknowledge &amp; Trade
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Timing Filter Banner */}
      {activeTimingFilter?.active && (
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 rounded-2xl p-4 text-white shadow-lg flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Clock className="w-5 h-5 text-yellow-300 animate-spin" />
            <div>
              <div className="text-xs font-black uppercase tracking-wider">⏱️ Precision Timing Filter Active</div>
              <div className="text-xs text-indigo-100">Showing qualifying stocks for {activeTimingFilter.date} @ {activeTimingFilter.timeSlot}</div>
            </div>
          </div>
          {onClearTimingFilter && (
            <button
              onClick={onClearTimingFilter}
              className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear Filter</span>
            </button>
          )}
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-indigo-500/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2.5 mb-2">
              <div className="p-2.5 bg-indigo-600/30 rounded-xl border border-indigo-400/40">
                <Target className="w-6 h-6 text-indigo-400 animate-pulse" />
              </div>
              <h1 className="text-2xl font-black tracking-tight">
                ORB Bullish &amp; Bearish Conviction Hub (Follow &amp; Auto-Fetch Engine)
              </h1>
            </div>
            <p className="text-slate-300 text-sm max-w-3xl leading-relaxed">
              Clicking <span className="text-amber-300 font-semibold">Follow</span> on any stock immediately fetches its data from the Dhan API and continues auto-fetching every 2 minutes.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-amber-950/80 border border-amber-500/40 px-4 py-3 rounded-xl flex items-center space-x-3">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
              <div>
                <div className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">Followed Stocks</div>
                <div className="text-lg font-black text-white">{followedSymbols.length} Active</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs & Controls Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-lg">
        {/* Tab Switcher */}
        <div className="flex items-center space-x-2 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0">
          <button
            onClick={() => setActiveTab('bullish')}
            className={`px-3 py-2.5 rounded-xl text-xs font-black tracking-wide uppercase transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'bullish'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 border border-emerald-500'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            <ArrowUpRight className="w-4 h-4 text-emerald-300" />
            <span>🟢 Bullish ({bullishCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('bearish')}
            className={`px-3 py-2.5 rounded-xl text-xs font-black tracking-wide uppercase transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'bearish'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30 border border-rose-500'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            <ArrowDownRight className="w-4 h-4 text-rose-300" />
            <span>🔴 Bearish ({bearishCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('super_break_bull')}
            className={`px-3 py-2.5 rounded-xl text-xs font-black tracking-wide uppercase transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'super_break_bull'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30 border border-amber-500'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
            <span>🚀 Super Break (Bullish 50%+) ({superBreakBullCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('super_break_bear')}
            className={`px-3 py-2.5 rounded-xl text-xs font-black tracking-wide uppercase transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'super_break_bear'
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30 border border-orange-500'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            <Zap className="w-4 h-4 text-orange-300 fill-orange-300" />
            <span>💥 Super Breakdown (Bearish 50%+) ({superBreakBearCount})</span>
          </button>
        </div>

        {/* Search & Sort */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          <div className="relative w-full sm:w-56">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search symbol..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-sm text-white rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-600"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto">
            <span className="text-xs font-bold text-slate-400 whitespace-nowrap">Sort:</span>
            <button
              onClick={() => setSortBy('BREAK_PCT')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                sortBy === 'BREAK_PCT'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              🚀 Highest Break % (#1 Top)
            </button>
            <button
              onClick={() => setSortBy('JUST_HIT')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                sortBy === 'JUST_HIT'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              ⏰ Just Hit ORB
            </button>
          </div>
        </div>
      </div>

      {/* Stock Cards Grid */}
      {filteredStocks.length === 0 ? (
        <div className="bg-slate-900 rounded-2xl p-12 text-center border border-slate-800 text-slate-400 space-y-3">
          <AlertCircle className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">No Stocks Found in {activeTab}</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            No F&amp;O stocks currently meet this specific filter criteria.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredStocks.map((stock, idx) => {
            const isBull = activeTab === 'bullish' || activeTab === 'super_break_bull';
            const breakPct = isBull ? stock.breakPctAbove : stock.breakPctBelow;
            const isSuper = (isBull && stock.isSuperBreakBullish) || (!isBull && stock.isSuperBreakBearish);
            const isFollowed = followedSymbols.includes(stock.symbol);

            return (
              <div 
                key={stock.symbol}
                onClick={() => onSelectStockDetail(stock)}
                className={`bg-slate-900 rounded-2xl border transition-all cursor-pointer overflow-hidden flex flex-col hover:shadow-xl ${
                  isSuper 
                    ? 'border-amber-400 ring-2 ring-amber-500/30 shadow-amber-500/20'
                    : idx === 0 
                    ? (isBull ? 'border-emerald-400 ring-2 ring-emerald-500/30 shadow-emerald-500/20' : 'border-rose-400 ring-2 ring-rose-500/30 shadow-rose-500/20')
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Card Header Top: #1 Crown / Super Break Badge */}
                <div className="px-4 py-2 flex items-center justify-between border-b bg-slate-950 border-slate-800 text-slate-300">
                  <div className="flex items-center space-x-2">
                    {isSuper ? (
                      <span className="bg-amber-400 text-slate-950 text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
                        <Zap className="w-3 h-3 fill-slate-950" /> Super {isBull ? 'Break (50%+)' : 'Breakdown (50%+)'}
                      </span>
                    ) : idx === 0 ? (
                      <span className={`${isBull ? 'bg-emerald-500' : 'bg-rose-500'} text-slate-950 text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-wider`}>
                        👑 #1 Top {isBull ? 'Break' : 'Breakdown'}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 font-mono">ORB Setup</span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">F&O Live</span>
                </div>

                {/* Card Main Info Bar: Symbol, CMP, Lot Size */}
                <div className="px-4 py-3 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-lg text-white font-mono flex items-center gap-2">
                      {stock.symbol}
                      {isBull ? <ArrowUpRight className="w-4 h-4 text-emerald-400" /> : <ArrowDownRight className="w-4 h-4 text-rose-400" />}
                    </h3>
                    <div className="flex items-center space-x-2 mt-0.5">
                      <span className="text-xs text-slate-400 truncate max-w-[130px]">{stock.companyName}</span>
                      <span className="bg-indigo-950 text-indigo-300 border border-indigo-800 px-1.5 py-0.2 rounded text-[10px] font-mono font-bold flex items-center gap-1">
                        <Package className="w-3 h-3 text-indigo-400" /> Lot: {stock.lotSize.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black font-mono text-white">₹{stock.closePrice?.toFixed(2)}</div>
                    <div className={`text-xs font-bold font-mono ${stock.pctChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {stock.pctChange > 0 ? '+' : ''}{stock.pctChange?.toFixed(2)}%
                    </div>
                  </div>
                </div>

                {/* ⏰ BIG PROMINENT ORB BREAK TIMING BANNER */}
                <div className="px-4 py-3 bg-gradient-to-r from-slate-950 via-purple-950/40 to-slate-950 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">ORB Break Timing</span>
                    <span className="text-2xl font-black font-mono text-amber-300 tracking-tight drop-shadow-sm">
                      {stock.orbBreakTime}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Holding Duration</span>
                    <span className="text-sm font-black font-mono text-cyan-300">
                      {stock.durationDisplay}
                    </span>
                  </div>
                </div>

                {/* 🎯 ORB BREAK HIT METRICS BANNER (STORED FOR SESSION) */}
                <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Break % at Initial Hit</span>
                    <strong className="text-amber-300 font-black text-sm">
                      {stock.breakPctAtOrbBreak > 0 ? '+' : ''}{stock.breakPctAtOrbBreak?.toFixed(2)}% @ {stock.breakTimeAtBreak || stock.orbBreakTime}
                    </strong>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-sans">vs ORB Height %</span>
                    <strong className="text-cyan-300 font-black text-sm">
                      {stock.breakVsHeightPct?.toFixed(1)}% of Height
                    </strong>
                  </div>
                </div>

                {/* ⚡ SUPER BREAK 50%+ TIMING BANNER */}
                {isSuper && (
                  <div className="px-4 py-2.5 bg-gradient-to-r from-amber-950/90 via-yellow-950/50 to-amber-950/90 border-b border-amber-500/40 text-xs font-mono text-amber-200 flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-300 fill-amber-300 animate-pulse" />
                      <span>50%+ Super Break Met @:</span>
                    </span>
                    <strong className="text-white font-black text-sm px-2 py-0.5 bg-amber-500/20 border border-amber-400 rounded-lg">
                      {stock.superBreakTime || stock.orbBreakTime}
                    </strong>
                  </div>
                )}

                {/* ORB Metrics Grid (High, Low, Height %, Break %) */}
                <div className="p-4 space-y-3 flex-1">
                  {/* FOLLOW CONFIDENCE BADGE (IF FOLLOWED) */}
                  {isFollowed && (() => {
                    const rsiInFavor = isBull ? (stock.rsi >= 50) : (stock.rsi <= 50);
                    const vwapInFavor = isBull ? ((stock.closePrice || 0) >= stock.vwap) : ((stock.closePrice || 0) <= stock.vwap);
                    const isConfidenceInFavor = rsiInFavor && vwapInFavor;
                    return (
                      <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-mono font-bold ${
                        isConfidenceInFavor 
                          ? (isBull ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-500/20' : 'bg-rose-950/90 border-rose-500 text-rose-300 shadow-lg shadow-rose-500/20')
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}>
                        <span className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 shrink-0 text-amber-300" />
                          <span>Follow Confidence: {isConfidenceInFavor ? (isBull ? 'RSI & VWAP Bullish IN FAVOR 🟢' : 'RSI & VWAP Bearish IN FAVOR 🔴') : 'Evaluating Data...'}</span>
                        </span>
                        <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded text-amber-300 font-black">ACTIVE</span>
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 text-[10px] block font-sans">ORB High Level</span>
                      <strong className="text-emerald-400 text-sm font-black">₹{stock.orbHigh}</strong>
                    </div>
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 text-[10px] block font-sans">ORB Low Level</span>
                      <strong className="text-rose-400 text-sm font-black">₹{stock.orbLow}</strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className={`p-2.5 rounded-xl border ${isBull ? 'bg-emerald-950/40 border-emerald-800/60' : 'bg-rose-950/40 border-rose-800/60'}`}>
                      <span className="text-slate-400 text-[10px] block font-sans">{isBull ? 'Break % Above High' : 'Break % Below Low'}</span>
                      <strong className={`text-sm font-black ${breakPct >= 3.0 ? 'text-amber-300 animate-pulse' : isBull ? 'text-emerald-300' : 'text-rose-300'}`}>
                        {breakPct > 0 ? '+' : ''}{breakPct.toFixed(2)}% {breakPct >= 3.0 ? '🔥' : ''}
                      </strong>
                    </div>
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 text-[10px] block font-sans">ORB Height %</span>
                      <strong className="text-amber-300 text-sm font-black">+{stock.orbHeightPct.toFixed(2)}%</strong>
                    </div>
                  </div>

                  {/* Technical Formulas (RSI, VWAP, ADX) */}
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center space-x-1.5">
                      <Activity className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="text-slate-400">RSI:</span>
                      <span className={`font-bold ${stock.rsi >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>{stock.rsi}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-slate-400">VWAP:</span>
                      <span className="text-white font-bold">₹{stock.vwap}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-slate-400">ADX:</span>
                      <span className="text-amber-300 font-bold">{stock.adx}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Action: Follow & Refresh Buttons at the bottom */}
                <div className="px-4 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2">
                  <span className="text-slate-400 text-[11px] hidden sm:inline">15m Analysis &amp; Sizer</span>
                  <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                    {/* Follow Toggle Button */}
                    <button
                      onClick={(e) => toggleFollow(stock, e)}
                      title={isFollowed ? 'Following (Auto-fetching every 2 mins from Dhan API)' : 'Click to Follow stock (Fetches data immediately & every 2 mins)'}
                      className={`px-3 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center space-x-1 cursor-pointer min-h-[38px] ${
                        isFollowed 
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30' 
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                      }`}
                    >
                      <Star className={`w-3.5 h-3.5 ${isFollowed ? 'fill-slate-950' : ''}`} />
                      <span>{isFollowed ? 'Following ON' : 'Follow'}</span>
                    </button>

                    {/* Per-Stock Refresh */}
                    {onFetchSingleStock && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onFetchSingleStock(stock);
                        }}
                        disabled={stock.isLoading}
                        title="Immediately fetch live data from Dhan API for this stock"
                        className="px-3 py-2 text-blue-300 hover:text-white hover:bg-blue-600/40 bg-blue-950/80 border border-blue-800/60 rounded-lg text-xs font-bold transition-colors cursor-pointer min-h-[38px] flex items-center space-x-1"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${stock.isLoading ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
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
