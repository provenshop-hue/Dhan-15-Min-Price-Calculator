import React, { useState, useEffect, useRef } from 'react';
import { 
  Flame, 
  TrendingUp, 
  TrendingDown,
  ChevronRight, 
  ChevronLeft, 
  X, 
  ExternalLink, 
  Calculator, 
  Volume2, 
  VolumeX, 
  Minimize2, 
  Maximize2, 
  Clock, 
  Sparkles,
  Zap,
  ShieldCheck,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { StockCalculated } from '../types';
import { 
  RallySignal, 
  getAllRallySignals, 
  playBullishRallySound, 
  playBearishRallySound,
  RallyDirection 
} from '../utils/bullishRally';

interface BullishRallyPopupProps {
  stocks: StockCalculated[];
  onSelectStockDetail: (stock: StockCalculated) => void;
  onOpenPositionSizer?: (stock: StockCalculated) => void;
}

export const BullishRallyPopup: React.FC<BullishRallyPopupProps> = ({
  stocks,
  onSelectStockDetail,
  onOpenPositionSizer
}) => {
  const [filterDirection, setFilterDirection] = useState<'ALL' | 'BULLISH_ONLY' | 'BEARISH_ONLY'>('ALL');
  const [minAccuracyThreshold, setMinAccuracyThreshold] = useState<number>(80); // 80% or 90%
  const [rallySignals, setRallySignals] = useState<RallySignal[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('rally_sound_enabled') !== 'false';
  });

  const previousRallySymbolsRef = useRef<Set<string>>(new Set());

  // Scan stocks whenever stocks or filters change (e.g., after 5-minute auto-fetch or manual fetch)
  useEffect(() => {
    const rawDetected = getAllRallySignals(stocks, filterDirection);
    const filtered = rawDetected.filter((s) => s.confidenceScore >= minAccuracyThreshold);
    setRallySignals(filtered);

    if (filtered.length > 0) {
      // Check if there's any newly detected stock in this fetch cycle
      const currentKeys = new Set(filtered.map((d) => `${d.symbol}_${d.direction}`));
      let hasNewRally = false;
      let newDirection: RallyDirection = 'BULLISH';

      for (const key of currentKeys) {
        if (!previousRallySymbolsRef.current.has(key)) {
          hasNewRally = true;
          const found = filtered.find((d) => `${d.symbol}_${d.direction}` === key);
          if (found) newDirection = found.direction;
          break;
        }
      }

      if (hasNewRally) {
        setIsOpen(true);
        setIsMinimized(false);
        if (soundEnabled) {
          if (newDirection === 'BULLISH') {
            playBullishRallySound();
          } else {
            playBearishRallySound();
          }
        }
      }

      previousRallySymbolsRef.current = currentKeys;
    }

    // Keep currentIndex in bounds
    if (currentIndex >= filtered.length) {
      setCurrentIndex(Math.max(0, filtered.length - 1));
    }
  }, [stocks, filterDirection, minAccuracyThreshold, soundEnabled]);

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('rally_sound_enabled', String(next));
      if (next) {
        playBullishRallySound();
      }
      return next;
    });
  };

  if (!isOpen || rallySignals.length === 0) {
    return null;
  }

  const currentRally = rallySignals[currentIndex] || rallySignals[0];
  if (!currentRally) return null;

  const isBull = currentRally.direction === 'BULLISH';
  const pct = currentRally.pctChange;
  const isGainPositive = pct >= 0;
  const plan = currentRally.tradePlan;

  // Render Minimized Popunder Pill
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-40 animate-bounce">
        <button
          onClick={() => setIsMinimized(false)}
          className={`flex items-center space-x-2.5 px-4 py-2.5 rounded-2xl shadow-2xl text-white hover:scale-105 transition-all cursor-pointer border-2 ${
            isBull 
              ? 'bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 border-emerald-500/80 ring-2 ring-emerald-500/30' 
              : 'bg-gradient-to-r from-rose-950 via-slate-900 to-red-950 border-rose-500/80 ring-2 ring-rose-500/30'
          }`}
          title="Click to expand High-Accuracy Trade Alert"
        >
          <span className="relative flex h-3 w-3">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isBull ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
            <span className={`relative inline-flex rounded-full h-3 w-3 ${isBull ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
          </span>
          {isBull ? (
            <Flame className="w-4 h-4 text-yellow-300 fill-current" />
          ) : (
            <TrendingDown className="w-4 h-4 text-rose-300" />
          )}
          <div className="text-left">
            <div className="text-xs font-black flex items-center gap-1.5">
              <span className={isBull ? 'text-emerald-300' : 'text-rose-300'}>
                {isBull ? 'Bullish Rally' : 'Bearish Breakdown'}: {currentRally.symbol}
              </span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] ${isBull ? 'bg-emerald-500/30 text-white' : 'bg-rose-500/30 text-white'}`}>
                {isGainPositive ? '+' : ''}{pct.toFixed(2)}%
              </span>
              <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold">
                {currentRally.confidenceScore}% Accurate
              </span>
            </div>
            {rallySignals.length > 1 && (
              <div className="text-[10px] text-slate-300 font-medium">
                +{rallySignals.length - 1} more high-accuracy setups
              </div>
            )}
          </div>
          <Maximize2 className="w-3.5 h-3.5 text-slate-400 hover:text-white ml-1" />
        </button>
      </div>
    );
  }

  // Render Full Popup / Popunder Alert Card
  return (
    <div className="fixed bottom-4 right-4 z-40 w-[410px] max-w-[calc(100vw-1.5rem)] animate-slide-up">
      <div className={`bg-gradient-to-br from-slate-950 via-slate-900 border-2 rounded-2xl shadow-2xl overflow-hidden ring-4 backdrop-blur-md text-white ${
        isBull 
          ? 'to-emerald-950/95 border-emerald-500/80 ring-emerald-500/20' 
          : 'to-rose-950/95 border-rose-500/80 ring-rose-500/20'
      }`}>
        
        {/* Top Header Bar */}
        <div className={`px-3.5 py-2 flex items-center justify-between shadow-md ${
          isBull 
            ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700' 
            : 'bg-gradient-to-r from-rose-700 via-red-600 to-rose-800'
        }`}>
          <div className="flex items-center space-x-2">
            {isBull ? (
              <Flame className="w-4 h-4 text-yellow-300 fill-current animate-bounce" />
            ) : (
              <TrendingDown className="w-4 h-4 text-yellow-200 animate-pulse" />
            )}
            <span className="text-xs font-black tracking-wider uppercase text-white flex items-center gap-1.5">
              <span>{isBull ? 'Bullish Rally' : 'Bearish Breakdown'}</span>
              <span className="bg-black/40 text-yellow-200 text-[10px] px-2 py-0.5 rounded-full font-bold border border-yellow-300/40">
                {currentRally.confidenceScore}% Accuracy
              </span>
            </span>
          </div>

          <div className="flex items-center space-x-1">
            {/* Sound Toggle */}
            <button
              onClick={toggleSound}
              className="p-1 text-white/80 hover:text-white rounded hover:bg-white/10 transition-colors"
              title={soundEnabled ? 'Mute Alert Sound' : 'Enable Alert Sound'}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-white/50" />}
            </button>

            {/* Minimize Popunder */}
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1 text-white/80 hover:text-white rounded hover:bg-white/10 transition-colors"
              title="Minimize to Popunder Pill"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>

            {/* Close */}
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-white/80 hover:text-white rounded hover:bg-white/10 transition-colors"
              title="Dismiss Alert"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Filter & Strictness Quick Bar */}
        <div className="bg-slate-950/80 px-3 py-1.5 flex items-center justify-between border-b border-slate-800 text-[10px]">
          <div className="flex items-center space-x-1 text-slate-400">
            <Filter className="w-3 h-3 text-slate-400" />
            <span>Filter:</span>
            <button
              onClick={() => setFilterDirection('ALL')}
              className={`px-1.5 py-0.5 rounded font-semibold transition-colors ${filterDirection === 'ALL' ? 'bg-slate-700 text-white' : 'hover:text-slate-200'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilterDirection('BULLISH_ONLY')}
              className={`px-1.5 py-0.5 rounded font-semibold transition-colors ${filterDirection === 'BULLISH_ONLY' ? 'bg-emerald-900/80 text-emerald-300' : 'hover:text-emerald-300'}`}
            >
              Bullish
            </button>
            <button
              onClick={() => setFilterDirection('BEARISH_ONLY')}
              className={`px-1.5 py-0.5 rounded font-semibold transition-colors ${filterDirection === 'BEARISH_ONLY' ? 'bg-rose-900/80 text-rose-300' : 'hover:text-rose-300'}`}
            >
              Bearish
            </button>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setMinAccuracyThreshold(minAccuracyThreshold === 80 ? 90 : 80)}
              className={`px-1.5 py-0.5 rounded font-mono font-bold transition-all border ${
                minAccuracyThreshold >= 90
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title="Toggle Ultra-Strict (90%+ only) or High Accuracy (80%+)"
            >
              {minAccuracyThreshold >= 90 ? '★ Ultra (90%+)' : 'Standard (80%+)'}
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-3.5 space-y-3">
          
          {/* Main Headline & Ticker Info */}
          <div>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded font-mono ${
                    currentRally.confidenceBadge === 'INSTITUTIONAL DIAMOND'
                      ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                      : currentRally.confidenceBadge === 'HIGH CONVICTION PRIME'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                  }`}>
                    {currentRally.confidenceBadge}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5 text-amber-400" />
                    {currentRally.timestamp}
                  </span>
                </div>

                <h4 className={`text-sm font-extrabold leading-tight mt-1 ${isBull ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {isBull ? 'Bullish rally' : 'Bearish rally / breakdown'} is going on with{' '}
                  <span className="text-white underline decoration-2 font-black">{currentRally.symbol}</span>!
                </h4>
                <p className="text-[11px] text-slate-300 truncate max-w-[230px] mt-0.5">
                  {currentRally.companyName}
                </p>
              </div>

              {/* % Change & CMP Badge */}
              <div className="text-right shrink-0">
                <div className="text-base font-black font-mono text-white">
                  ₹{currentRally.currentPrice.toFixed(2)}
                </div>
                <div className={`text-xs font-black font-mono px-2 py-0.5 rounded-md border inline-block ${
                  isBull 
                    ? 'bg-emerald-950/90 text-emerald-400 border-emerald-600/70' 
                    : 'bg-rose-950/90 text-rose-400 border-rose-600/70'
                }`}>
                  {isGainPositive ? '+' : ''}{pct.toFixed(2)}%
                </div>
              </div>
            </div>
          </div>

          {/* Actionable High-Profit Trade Plan Box */}
          <div className={`p-2.5 rounded-xl border ${
            isBull 
              ? 'bg-emerald-950/40 border-emerald-500/30' 
              : 'bg-rose-950/40 border-rose-500/30'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center space-x-1.5">
                <Target className={`w-3.5 h-3.5 ${isBull ? 'text-emerald-400' : 'text-rose-400'}`} />
                <span className="text-[11px] font-extrabold uppercase tracking-wide text-white">
                  {plan.action} Setup
                </span>
              </div>
              <div className="text-[10px] font-mono font-bold text-amber-300 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/30">
                R:R {plan.riskRewardRatio}
              </div>
            </div>

            {/* Grid of Entry, SL, T1, T2 */}
            <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-mono mt-1">
              <div className="bg-slate-900/90 p-1.5 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[9px] font-sans">Trigger</div>
                <div className="font-bold text-white">₹{plan.entryTrigger.toFixed(1)}</div>
              </div>

              <div className="bg-slate-900/90 p-1.5 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[9px] font-sans">Stop Loss</div>
                <div className="font-bold text-rose-400">₹{plan.stopLoss.toFixed(1)}</div>
              </div>

              <div className="bg-slate-900/90 p-1.5 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[9px] font-sans">Target 1</div>
                <div className="font-bold text-emerald-400">₹{plan.target1.toFixed(1)}</div>
              </div>

              <div className="bg-slate-900/90 p-1.5 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[9px] font-sans">Target 2</div>
                <div className="font-bold text-teal-300">₹{plan.target2.toFixed(1)}</div>
              </div>
            </div>

            {/* Option Strike Callout */}
            <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
              <div className="flex items-center space-x-1">
                <Zap className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                <span className="font-sans text-slate-300 text-[10px]">Option:</span>
                <span className="font-mono font-black text-yellow-300 text-[10px]">
                  {plan.recommendedOptionStrike}
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-300">
                LTP ~<span className="text-white font-bold">₹{plan.optionEntryEst.toFixed(1)}</span> (T1: <span className="text-emerald-400 font-bold">₹{plan.optionTarget1.toFixed(1)}</span>)
              </div>
            </div>
          </div>

          {/* Confluence Points Checklist */}
          <div className="bg-slate-900/90 border border-slate-800/90 p-2 rounded-xl space-y-1">
            <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>Verified High-Accuracy Confluences:</span>
            </div>
            <div className="space-y-0.5">
              {currentRally.confluencePoints.map((point, idx) => (
                <div key={idx} className="flex items-start space-x-1.5 text-[10px] text-slate-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="leading-tight">{point}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Technical Badges */}
          <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] font-mono">
            {currentRally.vwap !== undefined && currentRally.vwap !== null && (
              <div className="bg-slate-900/80 p-1.5 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[9px] font-sans">VWAP</div>
                <div className="font-bold text-purple-300">₹{currentRally.vwap.toFixed(1)}</div>
              </div>
            )}

            {currentRally.rsi !== undefined && currentRally.rsi !== null && (
              <div className="bg-slate-900/80 p-1.5 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[9px] font-sans">RSI (14)</div>
                <div className="font-bold text-blue-300">{currentRally.rsi.toFixed(1)}</div>
              </div>
            )}

            {currentRally.first15mHigh !== undefined && currentRally.first15mHigh !== null && isBull && (
              <div className="bg-slate-900/80 p-1.5 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[9px] font-sans">15m High</div>
                <div className="font-bold text-emerald-400">₹{currentRally.first15mHigh.toFixed(1)}</div>
              </div>
            )}

            {currentRally.first15mLow !== undefined && currentRally.first15mLow !== null && !isBull && (
              <div className="bg-slate-900/80 p-1.5 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[9px] font-sans">15m Low</div>
                <div className="font-bold text-rose-400">₹{currentRally.first15mLow.toFixed(1)}</div>
              </div>
            )}
          </div>

          {/* Navigation Bar if multiple stocks are rallying */}
          {rallySignals.length > 1 && (
            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-xs">
              <button
                onClick={() => setCurrentIndex((prev) => (prev > 0 ? prev - 1 : rallySignals.length - 1))}
                className="p-1 text-slate-400 hover:text-white flex items-center gap-0.5 transition-colors cursor-pointer text-[11px]"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev Setup</span>
              </button>

              <span className="text-[11px] text-slate-400 font-semibold font-mono">
                {currentIndex + 1} of {rallySignals.length} Setups
              </span>

              <button
                onClick={() => setCurrentIndex((prev) => (prev < rallySignals.length - 1 ? prev + 1 : 0))}
                className="p-1 text-slate-400 hover:text-white flex items-center gap-0.5 transition-colors cursor-pointer text-[11px]"
              >
                <span>Next Setup</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 pt-1">
            <button
              onClick={() => onSelectStockDetail(currentRally.stock)}
              className={`flex-1 font-extrabold text-xs py-2 px-3 rounded-xl shadow-md transition-all flex items-center justify-center space-x-1.5 cursor-pointer text-white ${
                isBull 
                  ? 'bg-emerald-600 hover:bg-emerald-500' 
                  : 'bg-rose-600 hover:bg-rose-500'
              }`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>View Full Chart & Gann Levels</span>
            </button>

            {onOpenPositionSizer && (
              <button
                onClick={() => onOpenPositionSizer(currentRally.stock)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-2 rounded-xl border border-slate-700 transition-colors"
                title="Open Position Sizer & Risk Calculator"
              >
                <Calculator className="w-4 h-4 text-emerald-400" />
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
