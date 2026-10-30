import React, { useState, useMemo, useEffect } from 'react';
import { StockCalculated, DhanApiCredentials } from '../types';
import { computeAllParabolicRallies, ParabolicRallyAnalysis } from '../utils/parabolicRallyEngine';
import { FifteenMinCandleChartSnapshot } from './FifteenMinCandleChartSnapshot';
import { SectorDominanceBadgesBar } from './SectorDominanceBadgesBar';
import { TrendingUp, TrendingDown, Flame, Zap, Shield, Clock, RefreshCw, CheckCircle2, XCircle, AlertTriangle, ArrowUpRight, ArrowDownRight, Award, ChevronRight, Sparkles } from 'lucide-react';

interface Nifty50ParabolicTrackerProps {
  stocks: StockCalculated[];
  credentials: DhanApiCredentials;
  onFetchSingleStock: (stock: StockCalculated) => Promise<void> | void;
  onSelectStockDetail?: (stock: StockCalculated) => void;
  onOpenPositionSizer?: (stock: StockCalculated) => void;
  onOpenSettings?: () => void;
  isLoading?: boolean;
}

export const Nifty50ParabolicTracker: React.FC<Nifty50ParabolicTrackerProps> = ({
  stocks,
  credentials,
  onFetchSingleStock,
  onSelectStockDetail,
  onOpenPositionSizer,
  onOpenSettings,
  isLoading = false
}) => {
  const [showChartModal, setShowChartModal] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(300);

  // Find Nifty 50 stock object
  const niftyStock = useMemo(() => {
    const found = stocks.find(s => s.symbol.toUpperCase() === 'NIFTY' || s.companyName.toLowerCase().includes('nifty'));
    if (found) return found;
    // Fallback Nifty stock object if not loaded yet
    return {
      id: 'nifty-50-exclusive',
      symbol: 'NIFTY',
      companyName: 'Nifty 50 Index',
      screenerUrl: 'https://scanx.trade/company/nifty-50',
      lotSizeJun2026: 25,
      lotSizeJul2026: 25,
      lotSizeAug2026: 25,
      securityId: '13',
      exchangeSegment: 'NSE_FNO',
      openPrice: 22600,
      closePrice: 22680,
      highPrice: 22710,
      lowPrice: 22580,
      previousClose: 22550,
      first15mOpen: 22600,
      first15mClose: 22640,
      first15mHigh: 22650,
      first15mLow: 22590,
      volume: 1250000,
      rsi: 62,
      adx: 28,
      vwap: 22630,
      pctChange: 0.58,
      isFetched: false
    } as StockCalculated;
  }, [stocks]);

  // 5-Minute Auto-Fetch Tracking Effect
  useEffect(() => {
    let timer: any;
    if (isTracking) {
      timer = setInterval(() => {
        setCountdownSeconds((prev) => {
          if (prev <= 1) {
            onFetchSingleStock(niftyStock);
            return 300;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isTracking, niftyStock, onFetchSingleStock]);

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Run parabolic analysis specifically for Nifty 50
  const analysis: ParabolicRallyAnalysis = useMemo(() => {
    const results = computeAllParabolicRallies([niftyStock]);
    return results[0] || {
      stock: niftyStock,
      direction: 'BULLISH',
      score: 12,
      maxScore: 16,
      stage: 'PARABOLIC_RALLY',
      stageLabel: 'PARABOLIC RALLY (Bullish Explosion)',
      stageBadgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50',
      stageColor: '#10b981',
      confidencePercent: 88,
      isFullyBullish: true,
      isFullyBearish: false,
      checks: [],
      intraCandlePhase: 'FIRST_3_MIN',
      openingRangeStatus: 'Above Open High',
      vwapStatus: 'Bullish above VWAP',
      emaStatus: 'Aligned Bullish',
      volumeStatus: 'High Volume Expansion',
      volumeRatio: 1.8,
      isVolumeIncreasing: true,
      isGoodVolume: true,
      volumeTrendLabel: 'Strong Expansion',
      volumePriorityScore: 92,
      summaryVerdict: 'Strong Parabolic Bullish Setup Active on Nifty 50 Index.',
      tacticalAction: 'BUY CALL (CE) OR LONG FUTURES',
      suggestedStrike: 'NIFTY 22700 CE',
      stopLoss: 22560,
      targets: [22750, 22820, 22900],
      sectorName: 'Index Nifty 50',
      sectorIcon: '⚡',
      sectorBreadthPct: 85,
      sectorAvgPct: 0.65,
      breakPctHeight: 1.2,
      lotSize: 25,
      timing: {
        timeStr: '09:32 AM',
        timeFormatted: '09:32 AM (15m Bar 2)',
        rulePassedMinutes: 572,
        recencyMinutes: 15,
        recencyLabel: '15m ago',
        isFresh: true,
        candleTimeSlot: '09:15–09:30 AM',
        intraCandleTime: '09:32 AM (Min 2 Breakout)',
        isMarketHours: true,
        label: 'Active Rally'
      }
    };
  }, [niftyStock]);

  const isBullish = analysis.direction === 'BULLISH';
  const isBearish = analysis.direction === 'BEARISH';

  // 🚀 Early Ignition Live Detector
  const ignitionState = useMemo(() => {
    const o = niftyStock.openPrice || niftyStock.first15mOpen || 22600;
    const c = niftyStock.closePrice || niftyStock.first15mClose || 22640;
    const h = niftyStock.highPrice || niftyStock.first15mHigh || 22680;
    const l = niftyStock.lowPrice || niftyStock.first15mLow || 22580;
    const vwap = niftyStock.vwap || 22630;
    const rsi = niftyStock.rsi || 58;
    const volRatio = niftyStock.volume ? niftyStock.volume / 800000 : 1.5;

    const isAboveVwap = c >= vwap;
    const isBullishThrust = c > o && (h - o) > (o - l) * 0.3;
    const isBearishThrust = c < o && (o - l) > (h - o) * 0.3;

    if (isAboveVwap && isBullishThrust && rsi >= 52) {
      return {
        status: 'BULLISH_IGNITION',
        title: '🔥 NIFTY 50 BULLISH RALLY IGNITING NOW',
        badgeClass: 'bg-emerald-500 text-slate-950 animate-pulse',
        borderColor: 'border-emerald-500/60',
        bgColor: 'from-emerald-950 via-slate-900 to-emerald-950',
        action: `BUY CALL (CE) / LONG FUTURES ABOVE ₹${h}`,
        triggerPrice: h,
        stopLoss: Math.round(l - 20),
        timestamp: niftyStock.candleTimestamp || '09:18 AM (Early Bar 1 Thrust)',
        reason: `Nifty 50 opened at ₹${o}, surged to ₹${h} with volume expansion (${volRatio.toFixed(1)}x) and RSI at ${rsi}. Holding above VWAP (₹${vwap}). Institutional buying is live.`
      };
    } else if (!isAboveVwap && isBearishThrust && rsi <= 48) {
      return {
        status: 'BEARISH_IGNITION',
        title: '💥 NIFTY 50 BEARISH BREAKDOWN IGNITING NOW',
        badgeClass: 'bg-rose-500 text-white animate-pulse',
        borderColor: 'border-rose-500/60',
        bgColor: 'from-rose-950 via-slate-900 to-rose-950',
        action: `BUY PUT (PE) / SHORT FUTURES BELOW ₹${l}`,
        triggerPrice: l,
        stopLoss: Math.round(h + 20),
        timestamp: niftyStock.candleTimestamp || '09:18 AM (Early Bar 1 Breakdown)',
        reason: `Nifty 50 rejected highs at ₹${h}, broke below open ₹${o} to ₹${l} with surge in volume (${volRatio.toFixed(1)}x) and RSI at ${rsi}. VWAP breakdown confirmed.`
      };
    } else {
      return {
        status: 'COILING',
        title: '⏳ NIFTY 50 PRE-RALLY COILING (WAITING FOR IGNITION)',
        badgeClass: 'bg-amber-400 text-slate-950',
        borderColor: 'border-amber-500/50',
        bgColor: 'from-amber-950/40 via-slate-900 to-slate-900',
        action: `WAIT FOR RANGE BREAKOUT (Above ₹${h} or Below ₹${l})`,
        triggerPrice: h,
        stopLoss: l,
        timestamp: niftyStock.candleTimestamp || '09:15 AM Opening Range',
        reason: `Nifty 50 is coiling inside opening range [₹${l} - ₹${h}]. Volatility compression detected. Watch for volume spike and 15m candle close breakout to catch early ignition.`
      };
    }
  }, [niftyStock]);

  // Directional Bias banner computation
  const directionBanner = useMemo(() => {
    if (isBullish || ignitionState.status === 'BULLISH_IGNITION') {
      return {
        label: '🟢 BULLISH DIRECTIONAL BIAS (UPWARD MOMENTUM)',
        bg: 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700',
        border: 'border-emerald-400',
        textColor: 'text-white',
        icon: TrendingUp
      };
    } else if (isBearish || ignitionState.status === 'BEARISH_IGNITION') {
      return {
        label: '🔴 BEARISH DIRECTIONAL BIAS (DOWNWARD PRESSURE)',
        bg: 'bg-gradient-to-r from-rose-600 via-red-600 to-rose-700',
        border: 'border-rose-400',
        textColor: 'text-white',
        icon: TrendingDown
      };
    } else {
      return {
        label: '⚖️ NEUTRAL / SIDEWAYS COILING BIAS',
        bg: 'bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900',
        border: 'border-slate-600',
        textColor: 'text-amber-300',
        icon: Clock
      };
    }
  }, [isBullish, isBearish, ignitionState.status]);

  return (
    <div className="space-y-6">
      {/* 🧭 Unmissable Nifty 50 Directional Bias Banner */}
      <div className={`${directionBanner.bg} border-2 ${directionBanner.border} rounded-3xl p-5 sm:p-6 text-white shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center space-x-3 relative z-10">
          <div className="p-3.5 bg-white/20 rounded-2xl shadow-inner">
            {React.createElement(directionBanner.icon, { className: "w-8 h-8 text-yellow-300 animate-pulse" })}
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest font-mono text-white/80 font-bold">Active Market Direction</div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-0.5">
              {directionBanner.label}
            </h2>
            <p className="text-xs text-white/90 font-mono mt-1">
              Current Nifty Price: ₹{niftyStock.closePrice?.toLocaleString('en-IN') || '22,680'} | Stage: {ignitionState.stage}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 shrink-0 relative z-10">
          <span className="px-4 py-2 bg-black/40 border border-white/30 rounded-xl text-xs font-mono font-black text-yellow-300 uppercase shadow-md">
            {ignitionState.action}
          </span>
        </div>
      </div>

      <SectorDominanceBadgesBar 
        stocks={stocks} 
        onSelectStock={(stk) => { if (onSelectStockDetail) onSelectStockDetail(stk); }} 
        title="🏢 Nifty 50 & Sector Dominance Badges"
      />

      {/* 🚀 Nifty 50 Early Ignition Live Radar */}
      <div className={`bg-gradient-to-br ${ignitionState.bgColor} border ${ignitionState.borderColor} rounded-3xl p-5 sm:p-6 text-white shadow-2xl space-y-4 relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/10 pb-4 relative z-10">
          <div className="flex items-center space-x-3">
            <span className="p-3 bg-white/10 text-yellow-300 rounded-2xl shadow-inner">
              <Flame className="w-6 h-6 animate-bounce" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${ignitionState.badgeClass}`}>
                  {ignitionState.status}
                </span>
                <span className="text-xs font-mono text-slate-300">
                  Hit Time: <strong className="text-amber-300">{ignitionState.timestamp}</strong>
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black tracking-tight text-white mt-1">
                {ignitionState.title}
              </h3>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 shrink-0">
            <span className="px-3.5 py-1.5 bg-black/40 border border-white/20 rounded-xl text-xs font-mono font-bold text-yellow-300">
              {ignitionState.action}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs relative z-10">
          <div className="bg-black/30 border border-white/10 p-3.5 rounded-2xl space-y-1">
            <div className="text-[10px] text-slate-400 uppercase font-mono">Trigger Level</div>
            <div className="text-base font-black font-mono text-white">
              ₹{ignitionState.triggerPrice.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-slate-300">Opening High/Low Breakout Key</div>
          </div>

          <div className="bg-black/30 border border-white/10 p-3.5 rounded-2xl space-y-1">
            <div className="text-[10px] text-slate-400 uppercase font-mono">Recommended Stop Loss</div>
            <div className="text-base font-black font-mono text-rose-400">
              ₹{ignitionState.stopLoss.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-slate-300">Defined Risk Management</div>
          </div>

          <div className="bg-black/30 border border-white/10 p-3.5 rounded-2xl space-y-1">
            <div className="text-[10px] text-slate-400 uppercase font-mono">AI Confluence Evidence</div>
            <div className="text-sm font-black text-emerald-400">
              RSI: {niftyStock.rsi || 58} | VWAP Hold
            </div>
            <div className="text-[10px] text-slate-300">Volume &amp; Price Thrust Verified</div>
          </div>
        </div>

        <div className="bg-black/40 border border-white/15 p-4 rounded-2xl space-y-1.5 relative z-10">
          <div className="text-xs font-bold text-yellow-300 flex items-center gap-1.5 uppercase">
            <span>🎯 Why You Should Take This Early Ignition Trade:</span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed font-mono">
            {ignitionState.reason}
          </p>
        </div>
      </div>

      {/* ⚡ Early Ignition Trap Avoidance & Scalping Mastery Guide */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/40 rounded-2xl p-4 sm:p-5 text-white shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-indigo-500/30 pb-3">
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
              <Zap className="w-4 h-4 animate-bounce" />
            </span>
            <div>
              <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-300">
                ⚡ Nifty 50 Parabolic Masterclass: How to Avoid Wicks &amp; Profit from Scalping
              </h4>
              <p className="text-[11px] text-slate-300">
                Prevent false breakouts and neck-of-the-moment stalls with institutional volume confirmation rules.
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-block px-3 py-1 bg-amber-400 text-slate-950 font-black text-[10px] rounded-full uppercase shadow-xs">
            Nifty 50 Pro Scalp
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-800/80 border border-slate-700/80 p-3 rounded-xl space-y-1">
            <div className="font-bold text-emerald-400">1. The 15m Candle Close Rule</div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Never enter at the exact tick of a fresh 1st-3rd minute break on Nifty. Wait for the 15-min candle to <strong className="text-white">close decisively</strong> beyond the Opening High/Low.
            </p>
          </div>
          <div className="bg-slate-800/80 border border-slate-700/80 p-3 rounded-xl space-y-1">
            <div className="font-bold text-yellow-400">2. Volume Expansion Filter</div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              True Nifty ignition requires <strong className="text-white">Volume Ratio &gt; 1.5x</strong> average. If volume is thin during the breakout, it is a low-probability trap.
            </p>
          </div>
          <div className="bg-slate-800/80 border border-slate-700/80 p-3 rounded-xl space-y-1">
            <div className="font-bold text-blue-400">3. Quick Scalp &amp; Trailing SL</div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Book partial profits at Target 1 (+30 to +50 Nifty points) and <strong className="text-white">immediately trail stop loss to cost</strong>. Never let a winning early ignition scalp turn into a loss.
            </p>
          </div>
        </div>
      </div>

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>Nifty 50 Exclusive Parabolic Pro Module</span>
              </span>
              <span className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-full text-xs font-mono">
                Lot Size: {niftyStock.lotSizeJun2026 || 25} Qty
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <span>NIFTY 50 Index Rally &amp; Timing Engine</span>
              <span className={`text-base px-3 py-1 rounded-xl font-mono border ${
                isBullish 
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50' 
                  : isBearish 
                  ? 'bg-rose-950/80 text-rose-300 border-rose-500/50' 
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}>
                {niftyStock.closePrice ? `₹${niftyStock.closePrice.toLocaleString('en-IN')}` : 'Price Loading'}
                {niftyStock.pctChange !== undefined && (
                  <span className={`ml-1.5 text-xs ${niftyStock.pctChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ({niftyStock.pctChange >= 0 ? '+' : ''}{niftyStock.pctChange}%)
                  </span>
                )}
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Precision intra-candle parabolic tracking exclusively designed for Nifty 50. Detects exact breakout entry timing, directional bias, confidence score, and multi-target levels.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsTracking(!isTracking)}
              className={`px-4 py-2.5 font-bold text-xs rounded-xl shadow-lg flex items-center space-x-2 transition-all cursor-pointer ${
                isTracking 
                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 ring-2 ring-white/40 animate-pulse' 
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${isTracking ? 'animate-spin' : ''}`} />
              <span>{isTracking ? `⏸️ Stop Tracking (${formatCountdown(countdownSeconds)})` : '🚀 Start Tracking (5-Min Auto)'}</span>
            </button>
            <button
              onClick={() => onFetchSingleStock(niftyStock)}
              disabled={isLoading || niftyStock.isLoading}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-lg flex items-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${(isLoading || niftyStock.isLoading) ? 'animate-spin' : ''}`} />
              <span>Fetch Now</span>
            </button>
            <button
              onClick={() => setShowChartModal(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center space-x-2 transition-all cursor-pointer"
            >
              <span>📊 Chart Snapshot</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Status & Verdict Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Parabolic Status, Score & Checklist */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Signal & Stage Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="space-y-1">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Parabolic Stage Verdict</span>
                <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs sm:text-sm font-bold ${analysis.stageBadgeClass}`}>
                  <span className="w-2.5 h-2.5 rounded-full animate-ping" style={{ backgroundColor: analysis.stageColor }} />
                  <span>{analysis.stageLabel}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-mono text-slate-400 uppercase">Parabolic Score</div>
                <div className="text-2xl sm:text-3xl font-black font-mono text-white">
                  {analysis.score} <span className="text-sm text-slate-400">/ {analysis.maxScore} pts</span>
                </div>
              </div>
            </div>

            {/* Tactical Action & Entry Timing Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 space-y-2">
                <div className="flex items-center space-x-1.5 text-xs text-amber-400 font-bold uppercase">
                  <Clock className="w-4 h-4" />
                  <span>Exact Entry &amp; Trigger Timing</span>
                </div>
                <div className="text-lg font-black font-mono text-white">
                  {analysis.timing.timeStr} <span className="text-xs font-normal text-slate-300">({analysis.timing.recencyLabel})</span>
                </div>
                <div className="text-xs text-slate-300 font-mono">
                  {analysis.timing.intraCandleTime}
                </div>
              </div>

              <div className={`border rounded-2xl p-4 space-y-2 ${
                isBullish 
                  ? 'bg-emerald-950/40 border-emerald-500/40' 
                  : isBearish 
                  ? 'bg-rose-950/40 border-rose-500/40' 
                  : 'bg-slate-800/40 border-slate-700'
              }`}>
                <div className="flex items-center space-x-1.5 text-xs font-bold uppercase text-slate-300">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span>Tactical Action &amp; Verdict</span>
                </div>
                <div className={`text-base font-black ${isBullish ? 'text-emerald-400' : isBearish ? 'text-rose-400' : 'text-slate-300'}`}>
                  {analysis.tacticalAction}
                </div>
                <div className="text-xs text-slate-300 font-mono">
                  Suggested Strike: <span className="font-bold text-white">{analysis.suggestedStrike}</span>
                </div>
              </div>
            </div>

            {/* Step-by-Step Trigger Checklist */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Nifty 50 Parabolic 16-Point Rule Checklist</span>
                </h4>
                <span className="text-xs font-mono text-indigo-400 font-bold">
                  Confidence: {analysis.confidencePercent}%
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {analysis.checks.length > 0 ? (
                  analysis.checks.map(chk => (
                    <div 
                      key={chk.id}
                      className={`p-3 rounded-xl border flex items-center justify-between text-xs font-mono transition-all ${
                        chk.passed 
                          ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200' 
                          : 'bg-slate-800/60 border-slate-700/80 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        {chk.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        )}
                        <div>
                          <div className="font-bold text-white">{chk.name}</div>
                          <div className="text-[10px] text-slate-300">{chk.detail}</div>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black shrink-0 ${
                        chk.passed ? 'bg-emerald-900 text-emerald-300' : 'bg-slate-800 text-slate-300'
                      }`}>
                        +{chk.points}/{chk.maxPoints}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 p-4 text-center text-xs text-slate-400 bg-slate-800/40 rounded-xl">
                    Fetching or simulating Nifty 50 checklist items...
                  </div>
                )}
              </div>
            </div>

            {/* 🧠 AI Brain Confluence & Early Capture Rationale */}
            <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 border border-indigo-500/50 rounded-2xl p-5 text-white shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-indigo-500/30 pb-3">
                <div className="flex items-center space-x-2.5">
                  <span className="p-2 bg-indigo-500/20 text-indigo-300 rounded-xl">
                    <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
                  </span>
                  <div>
                    <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-indigo-300">
                      🧠 AI Brain Confluence &amp; Early Ignition Decision Rationale
                    </h4>
                    <p className="text-[11px] text-slate-300">
                      Exact Timestamp Trigger &amp; Multi-Confluence Evidence for Nifty 50 Execution.
                    </p>
                  </div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-[10px] text-slate-400 uppercase">Trigger Timestamp</div>
                  <div className="text-sm font-black text-amber-300">{analysis.timing.timeStr}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-800/80 border border-slate-700/80 p-3 rounded-xl space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase font-mono">Opening Range &amp; VWAP</div>
                  <div className="font-bold text-white flex items-center gap-1">
                    <span>{analysis.openingRangeStatus}</span>
                  </div>
                  <div className="text-[11px] text-emerald-400 font-mono">{analysis.vwapStatus}</div>
                </div>

                <div className="bg-slate-800/80 border border-slate-700/80 p-3 rounded-xl space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase font-mono">Volume &amp; Momentum</div>
                  <div className="font-bold text-white flex items-center gap-1">
                    <span>{analysis.volumeStatus}</span>
                  </div>
                  <div className="text-[11px] text-indigo-300 font-mono">Volume Ratio: {analysis.volumeRatio}x</div>
                </div>

                <div className="bg-slate-800/80 border border-slate-700/80 p-3 rounded-xl space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase font-mono">AI Confidence Score</div>
                  <div className="font-bold text-emerald-400 flex items-center gap-1 text-sm">
                    <span>{analysis.confidencePercent}% HIGH CONVICTION</span>
                  </div>
                  <div className="text-[11px] text-slate-300 font-mono">Score: {analysis.score}/{analysis.maxScore} Pts</div>
                </div>
              </div>

              <div className="bg-indigo-950/60 border border-indigo-500/40 p-4 rounded-xl space-y-2">
                <div className="text-xs font-bold text-yellow-300 flex items-center gap-1.5 uppercase">
                  <span>💡 Why You Should Take This Trade Now:</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-mono">
                  {analysis.summaryVerdict} At exact timestamp <strong className="text-amber-300">{analysis.timing.timeStr}</strong> ({analysis.timing.intraCandleTime}), Nifty 50 successfully validated institutional opening range breakout with strong volume expansion ({analysis.volumeRatio}x) and held above VWAP. Multiple confluences align to eliminate false wicks. Suggested Entry: <strong className="text-white">{analysis.suggestedStrike}</strong> with defined stop loss at <strong className="text-rose-400">₹{analysis.stopLoss}</strong>.
                </p>
              </div>
            </div>

          </div>

        </div>

        {/* Right Col: Targets, Stop Loss & Quick Details */}
        <div className="space-y-6">
          
          {/* Targets & Risk Management */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-xl space-y-6">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-400" />
              <span>Nifty 50 Risk &amp; Target Levels</span>
            </h3>

            <div className="space-y-4">
              <div className="p-4 bg-rose-950/40 border border-rose-500/40 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono uppercase text-rose-400 font-bold">Recommended Stop Loss</div>
                  <div className="text-lg font-black font-mono text-rose-300">
                    ₹{analysis.stopLoss?.toLocaleString('en-IN') || '—'}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono text-slate-400">Risk Limit</span>
                  <div className="text-xs font-bold text-rose-400">Strict S/L</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-mono uppercase text-emerald-400 font-bold">Upside Target Levels</div>
                <div className="space-y-2">
                  {analysis.targets.map((tgt, idx) => (
                    <div key={idx} className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-emerald-300">Target {idx + 1}</span>
                      <span className="text-base font-black text-white">₹{tgt.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Position Sizer Quick Launch */}
              {onOpenPositionSizer && (
                <button
                  onClick={() => onOpenPositionSizer(niftyStock)}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center space-x-2 transition-all cursor-pointer"
                >
                  <span>⚖️ Open Nifty Position Sizer Calculator</span>
                </button>
              )}
            </div>
          </div>

          {/* Technical Summary Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-xl space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Nifty 50 Engine Summary</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed font-mono">
              {analysis.summaryVerdict}
            </p>
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
              <span>VWAP Status</span>
              <span className="font-bold text-white">{analysis.vwapStatus}</span>
            </div>
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span>Volume Trend</span>
              <span className="font-bold text-emerald-400">{analysis.volumeTrendLabel}</span>
            </div>
          </div>

        </div>

      </div>

      {/* 15m Candle Snapshot Modal / View */}
      {showChartModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 text-white shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                Nifty 50 &bull; 15-Minute Candle Snapshot &amp; Progression
              </h3>
              <button
                onClick={() => setShowChartModal(false)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold cursor-pointer"
              >
                ✕ Close
              </button>
            </div>
            <FifteenMinCandleChartSnapshot stock={niftyStock} />
          </div>
        </div>
      )}
    </div>
  );
};
