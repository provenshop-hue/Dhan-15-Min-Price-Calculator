import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Filter,
  CheckCircle2,
  Play,
  Pause,
  List,
  Layers,
  Info
} from 'lucide-react';
import { StockCalculated } from '../types';
import { 
  RallySignal, 
  getAllRallySignals, 
  playBullishRallySound, 
  playBearishRallySound,
  RallyDirection,
  RallyFilterDirection,
  RallyCategoryFilter
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
  const [filterDirection, setFilterDirection] = useState<RallyFilterDirection>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<RallyCategoryFilter>('ALL');
  const [recencyMode, setRecencyMode] = useState<'FRESH_AND_SUSTAINED' | 'FRESH_ONLY' | 'SUSTAINED_ONLY' | 'ALL_SESSION'>('FRESH_AND_SUSTAINED');
  const [hideYesterday, setHideYesterday] = useState<boolean>(true); // Strictly exclude yesterday's stocks by default
  const [minAccuracyThreshold, setMinAccuracyThreshold] = useState<number>(80); // 80% or 90%
  const [minConfluences, setMinConfluences] = useState<number>(3); // 3 (Majority) or 4 (Maximum)
  const [maxPicksLimit, setMaxPicksLimit] = useState<number>(5); // Top 3, Top 5 (Default best match), or 0 (All)
  const [safeOnly, setSafeOnly] = useState<boolean>(true); // Anti-Trap: Filter out overextended high-risk traps
  const [sortPreference, setSortPreference] = useState<'RECENCY_FIRST' | 'ACCURACY_FIRST'>('RECENCY_FIRST');
  const [rallySignals, setRallySignals] = useState<RallySignal[]>([]);
  const [totalQualifiedCount, setTotalQualifiedCount] = useState<number>(0);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(true);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [showAllList, setShowAllList] = useState<boolean>(false);
  const [showAntiTrapGuide, setShowAntiTrapGuide] = useState<boolean>(false);
  const [slideProgress, setSlideProgress] = useState<number>(0);

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('rally_sound_enabled') !== 'false';
  });

  const previousRallySymbolsRef = useRef<Set<string>>(new Set());
  const ROTATE_INTERVAL_MS = 5000; // 5 seconds per slide
  const PROGRESS_TICK_MS = 50;

  // Scan stocks whenever stocks or filters change - shows recent hits and stocks that stood still as bullish >30m
  useEffect(() => {
    const rawDetected = getAllRallySignals(
      stocks, 
      filterDirection, 
      sortPreference, 
      minConfluences, 
      0, 
      safeOnly, 
      categoryFilter, 
      recencyMode !== 'ALL_SESSION',
      hideYesterday
    );

    const recencyFiltered = rawDetected.filter((s) => {
      if (recencyMode === 'FRESH_ONLY') return s.isFresh && !s.isYesterday;
      if (recencyMode === 'SUSTAINED_ONLY') return s.isSustainedHold && !s.isYesterday;
      if (recencyMode === 'FRESH_AND_SUSTAINED') return (s.isJustHit || s.isSustainedHold) && !s.isYesterday;
      return true;
    });

    const filtered = recencyFiltered.filter((s) => s.confidenceScore >= minAccuracyThreshold);
    setTotalQualifiedCount(filtered.length);

    // Strict Elite Selection: Cap to top 3 or 5 best matches & confluence
    const curatedSignals = maxPicksLimit > 0 ? filtered.slice(0, maxPicksLimit) : filtered;
    setRallySignals(curatedSignals);

    if (curatedSignals.length > 0) {
      const currentKeys = new Set(curatedSignals.map((d) => `${d.symbol}_${d.direction}_${d.triggerType}_${d.isSustainedHold ? 'sustained' : 'hit'}`));
      let hasNewRally = false;
      let newDirection: RallyDirection = 'BULLISH';

      for (const key of currentKeys) {
        if (!previousRallySymbolsRef.current.has(key)) {
          hasNewRally = true;
          const found = curatedSignals.find((d) => `${d.symbol}_${d.direction}_${d.triggerType}_${d.isSustainedHold ? 'sustained' : 'hit'}` === key);
          if (found) newDirection = found.direction;
          break;
        }
      }

      if (hasNewRally) {
        setIsOpen(true);
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
    if (currentIndex >= curatedSignals.length) {
      setCurrentIndex(0);
    }
  }, [stocks, filterDirection, categoryFilter, recencyMode, hideYesterday, minAccuracyThreshold, minConfluences, maxPicksLimit, safeOnly, sortPreference, soundEnabled]);

  const handleNextSlide = useCallback(() => {
    if (rallySignals.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % rallySignals.length);
    setSlideProgress(0);
  }, [rallySignals.length]);

  const handlePrevSlide = useCallback(() => {
    if (rallySignals.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + rallySignals.length) % rallySignals.length);
    setSlideProgress(0);
  }, [rallySignals.length]);

  // Auto-rotation slider timer with progress bar
  useEffect(() => {
    if (!isAutoRotating || isHovered || rallySignals.length <= 1 || !isOpen) {
      return;
    }

    const progressStep = (PROGRESS_TICK_MS / ROTATE_INTERVAL_MS) * 100;
    const interval = setInterval(() => {
      setSlideProgress((prev) => {
        if (prev >= 100) {
          handleNextSlide();
          return 0;
        }
        return prev + progressStep;
      });
    }, PROGRESS_TICK_MS);

    return () => clearInterval(interval);
  }, [isAutoRotating, isHovered, rallySignals.length, isOpen, handleNextSlide]);

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

  const toggleAutoRotate = () => {
    setIsAutoRotating((prev) => !prev);
    setSlideProgress(0);
  };

  // If user closed the popup via X, render a subtle floating launcher pill in bottom-right
  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-40">
        <button
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          className="flex items-center space-x-2 px-3 py-2 rounded-2xl shadow-xl bg-slate-900/95 hover:bg-slate-800 text-white border-2 border-emerald-500/70 backdrop-blur-md transition-all cursor-pointer hover:scale-105"
          title="Open Bullish Rally Alert & Confluence Popunder"
        >
          <Flame className="w-4 h-4 text-yellow-300 fill-current animate-pulse" />
          <span className="text-xs font-bold font-mono text-emerald-300">
            ⚡ Rally Signals {totalQualifiedCount > 0 ? `(${totalQualifiedCount})` : ''}
          </span>
        </button>
      </div>
    );
  }

  const hasSignals = rallySignals.length > 0;
  const currentRally = hasSignals ? (rallySignals[currentIndex] || rallySignals[0]) : null;
  const isBull = currentRally 
    ? currentRally.direction === 'BULLISH' 
    : filterDirection === 'BEARISH_ONLY' || filterDirection === 'HUNDRED_BEARISH_ONLY' || categoryFilter === '100_BEAR' ? false : true;
  const pct = currentRally?.pctChange ?? 0;
  const isGainPositive = pct >= 0;
  const plan = currentRally?.tradePlan;

  // Render Minimized Popunder Pill
  if (isMinimized) {
    return (
      <div 
        className="fixed bottom-4 right-4 z-40"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className={`relative flex items-center space-x-2.5 px-3.5 py-2.5 rounded-2xl shadow-2xl text-white border-2 backdrop-blur-md transition-all ${
          isBull 
            ? 'bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 border-emerald-500/80 ring-2 ring-emerald-500/30' 
            : 'bg-gradient-to-r from-rose-950 via-slate-900 to-red-950 border-rose-500/80 ring-2 ring-rose-500/30'
        }`}>
          
          {/* Progress bar inside pill */}
          {rallySignals.length > 1 && isAutoRotating && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-black/40 rounded-t-2xl overflow-hidden">
              <div 
                className={`h-full transition-all duration-75 ${isBull ? 'bg-emerald-400' : 'bg-rose-400'}`}
                style={{ width: `${slideProgress}%` }}
              />
            </div>
          )}

          <button
            onClick={() => setIsMinimized(false)}
            className="flex items-center space-x-2 text-left cursor-pointer"
            title="Click to expand full alert card"
          >
            <span className="relative flex h-3 w-3 shrink-0">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isBull ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${isBull ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
            </span>

            {isBull ? (
              <Flame className="w-4 h-4 text-yellow-300 fill-current shrink-0" />
            ) : (
              <TrendingDown className="w-4 h-4 text-rose-300 shrink-0" />
            )}

            {currentRally ? (
              <div>
                <div className="text-xs font-black flex items-center gap-1.5 flex-wrap">
                  <span className={isBull ? 'text-emerald-300' : 'text-rose-300'}>
                    {currentRally.symbol}
                  </span>
                  <span className={`px-1.5 py-0.2 rounded text-[10px] ${isBull ? 'bg-emerald-500/30 text-white' : 'bg-rose-500/30 text-white'}`}>
                    {isGainPositive ? '+' : ''}{pct.toFixed(2)}%
                  </span>
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-black border ${currentRally.triggerColorClass}`}>
                    {currentRally.triggerBadge}
                  </span>
                  {currentRally.isSustainedHold && (
                    <span className="bg-emerald-950/90 text-emerald-300 border border-emerald-500/80 px-1.5 py-0.2 rounded text-[8.5px] font-mono font-black flex items-center gap-0.5 shadow-sm">
                      <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                      🛡️ STOOD &gt;30M ({currentRally.sustainedDurationMinutes}m)
                    </span>
                  )}
                  {currentIndex === 0 ? (
                    <span className="bg-amber-400/20 text-yellow-300 border border-amber-400/40 px-1.5 py-0.2 rounded text-[8.5px] font-mono font-bold">
                      👑 #1 BEST
                    </span>
                  ) : (
                    <span className="bg-slate-800 text-slate-300 border border-slate-700 px-1.5 py-0.2 rounded text-[8.5px] font-mono font-bold">
                      ⭐ #{currentIndex + 1}
                    </span>
                  )}
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold flex items-center gap-0.5 border ${
                    currentRally.isFresh 
                      ? 'bg-amber-400/20 text-yellow-200 border-amber-400/40 animate-pulse' 
                      : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  }`}>
                    {currentRally.isFresh ? <Zap className="w-2.5 h-2.5 text-yellow-300 fill-current" /> : <Clock className="w-2.5 h-2.5" />}
                    {currentRally.rulePassedTime}
                  </span>
                </div>
                
                {rallySignals.length > 1 && (
                  <div className="text-[10px] text-slate-300 font-medium flex items-center gap-1 mt-0.5">
                    <span>{currentRally.isSustainedHold ? '🛡️ Stood Still Firm (>30m)' : 'Recent Hits'} ({currentIndex + 1}/{rallySignals.length})</span>
                    <span className="text-[9px] text-slate-400">• {currentRally.rallyType}</span>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span>⚡ Rally Popunder</span>
                  <span className="text-[10px] text-amber-300 bg-amber-950/80 px-1.5 py-0.2 rounded border border-amber-500/40">
                    0 matches
                  </span>
                </div>
                <div className="text-[9.5px] text-slate-400">Click to change filters</div>
              </div>
            )}
          </button>

          {/* Quick prev/next inside pill */}
          {rallySignals.length > 1 && (
            <div className="flex items-center space-x-0.5 border-l border-slate-700/80 pl-1.5">
              <button 
                onClick={handlePrevSlide}
                className="p-1 text-slate-400 hover:text-white rounded transition-colors"
                title="Previous Stock"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={handleNextSlide}
                className="p-1 text-slate-400 hover:text-white rounded transition-colors"
                title="Next Stock"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            onClick={() => setIsMinimized(false)}
            className="p-1 text-slate-400 hover:text-white rounded transition-colors ml-1"
            title="Expand Card"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // Render Full Popup / Popunder Alert Card with Auto-Rotating Slider
  return (
    <div 
      className="fixed bottom-4 right-4 z-40 w-[420px] max-w-[calc(100vw-1.5rem)] animate-slide-up"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`bg-gradient-to-br from-slate-950 via-slate-900 border-2 rounded-2xl shadow-2xl overflow-hidden ring-4 backdrop-blur-md text-white ${
        isBull 
          ? 'to-emerald-950/95 border-emerald-500/80 ring-emerald-500/20' 
          : 'to-rose-950/95 border-rose-500/80 ring-rose-500/20'
      }`}>
        
        {/* Auto-Slide Progress Bar */}
        {rallySignals.length > 1 && isAutoRotating && (
          <div className="h-1 w-full bg-black/40 overflow-hidden">
            <div 
              className={`h-full transition-all duration-75 ${isBull ? 'bg-emerald-400' : 'bg-rose-400'}`}
              style={{ width: `${slideProgress}%` }}
            />
          </div>
        )}

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
            <span className="text-xs font-black tracking-wider uppercase text-white flex items-center gap-1.5 flex-wrap">
              {currentRally ? (
                <>
                  <span>
                    {currentRally.triggerType === 'ONE_HUNDRED_PCT_BULLISH'
                      ? '🟢 100% Bullish Move'
                      : currentRally.triggerType === 'ONE_HUNDRED_PCT_BEARISH'
                      ? '🔴 100% Bearish Move'
                      : currentRally.isSustainedHold
                      ? (isBull ? `🛡️ Stood Bullish (${currentRally.sustainedDurationMinutes}m)` : `🛡️ Stood Bearish (${currentRally.sustainedDurationMinutes}m)`)
                      : currentRally.triggerType === 'PARABOLIC_BULLISH_RALLY_STARTED'
                      ? '🚀 Parabolic Bullish Rally'
                      : currentRally.triggerType === 'PARABOLIC_BEARISH_RALLY_STARTED'
                      ? '📉 Parabolic Bearish Breakdown'
                      : currentRally.triggerType === 'BREAKOUT_JUST_HIT'
                      ? (isBull ? '💥 Breakout Just Hit' : '💥 Breakdown Just Hit')
                      : (isBull ? '📈 Bullish Rally' : '📉 Bearish Breakdown')}
                  </span>
                  <span className="bg-black/40 text-yellow-200 text-[10px] px-2 py-0.5 rounded-full font-bold border border-yellow-300/40">
                    {currentRally.confidenceScore}% Accuracy
                  </span>
                  <span className="bg-black/40 text-purple-200 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold border border-purple-300/40 flex items-center gap-0.5">
                    <ShieldCheck className="w-3 h-3 text-purple-300" />
                    {currentRally.confluenceRatio} Confluences
                  </span>
                  {currentRally.isSustainedHold ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold border bg-emerald-950/80 text-emerald-200 border-emerald-400/60 shadow-[0_0_10px_rgba(16,185,129,0.3)] flex items-center gap-1">
                      <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                      Stood &gt;30m Firm ({currentRally.sustainedDurationMinutes}m)
                    </span>
                  ) : (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold border flex items-center gap-1 ${
                      currentRally.isFresh
                        ? 'bg-amber-400/30 text-yellow-200 border-amber-300/60 shadow-[0_0_10px_rgba(251,191,36,0.3)]'
                        : 'bg-black/40 text-cyan-200 border-cyan-300/40'
                    }`}>
                      {currentRally.isFresh ? <Zap className="w-2.5 h-2.5 text-yellow-300 fill-current" /> : <Clock className="w-2.5 h-2.5" />}
                      {currentRally.rulePassedTime}
                      {currentRally.isMarketHours && currentRally.recencyMinutes <= 30 && (
                        <span className="text-[9px] text-amber-200 ml-0.5 font-sans">
                          ({currentRally.recencyMinutes === 0 ? 'Fresh' : `${currentRally.recencyMinutes}m ago`})
                        </span>
                      )}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span>⚡ Rally &amp; Breakout Popunder</span>
                  <span className="bg-black/40 text-amber-300 text-[10px] px-2 py-0.5 rounded-full font-bold border border-amber-400/40">
                    0 Matching Current Filter
                  </span>
                </>
              )}
            </span>
          </div>

          <div className="flex items-center space-x-1">
            {/* Anti-Trap Guide Toggle */}
            <button
              onClick={() => {
                setShowAntiTrapGuide((prev) => !prev);
                if (!showAntiTrapGuide) setShowAllList(false);
              }}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all ${
                showAntiTrapGuide 
                  ? 'bg-amber-400 text-slate-950 font-black shadow-md' 
                  : 'bg-white/10 text-amber-200 hover:bg-white/20'
              }`}
              title="How to avoid false breakouts and traps when confluences meet"
            >
              <ShieldCheck className="w-3 h-3 text-amber-300" />
              <span>Anti-Trap</span>
            </button>

            {/* Auto-Rotate Play/Pause */}
            {rallySignals.length > 1 && (
              <button
                onClick={toggleAutoRotate}
                className={`p-1 rounded transition-colors ${
                  isAutoRotating ? 'text-yellow-200 hover:bg-white/10' : 'text-white/50 hover:text-white'
                }`}
                title={isAutoRotating ? 'Pause Auto-Slider' : 'Resume Auto-Slider (5s)'}
              >
                {isAutoRotating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
            )}

            {/* List View Toggle */}
            <button
              onClick={() => {
                setShowAllList((prev) => !prev);
                if (!showAllList) setShowAntiTrapGuide(false);
              }}
              className={`p-1 rounded transition-colors ${
                showAllList ? 'bg-white/20 text-white' : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
              title="Show All Rallying Stocks List"
            >
              <List className="w-3.5 h-3.5" />
            </button>

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
        <div className="bg-slate-950/90 px-3 py-1.5 border-b border-slate-800 text-[10px] space-y-1.5">
          {/* Row 1: Direction & Major Settings */}
          <div className="flex items-center justify-between flex-wrap gap-1">
            <div className="flex items-center space-x-1 text-slate-400 flex-wrap gap-y-0.5">
              <Filter className="w-3 h-3 text-slate-400" />
              <span>Direction:</span>
              <button
                onClick={() => { setFilterDirection('ALL'); setCurrentIndex(0); }}
                className={`px-1.5 py-0.5 rounded font-semibold transition-colors cursor-pointer ${filterDirection === 'ALL' ? 'bg-slate-700 text-white' : 'hover:text-slate-200'}`}
              >
                All ({rallySignals.length})
              </button>
              <button
                onClick={() => { setFilterDirection('BULLISH_ONLY'); setCurrentIndex(0); }}
                className={`px-1.5 py-0.5 rounded font-semibold transition-colors cursor-pointer ${filterDirection === 'BULLISH_ONLY' ? 'bg-emerald-900/80 text-emerald-300' : 'hover:text-emerald-300'}`}
              >
                🟢 Bullish
              </button>
              <button
                onClick={() => { setFilterDirection('BEARISH_ONLY'); setCurrentIndex(0); }}
                className={`px-1.5 py-0.5 rounded font-semibold transition-colors cursor-pointer ${filterDirection === 'BEARISH_ONLY' ? 'bg-rose-900/80 text-rose-300' : 'hover:text-rose-300'}`}
              >
                🔴 Bearish
              </button>
              <button
                onClick={() => { setFilterDirection('HUNDRED_BULLISH_ONLY'); setCurrentIndex(0); }}
                className={`px-1.5 py-0.5 rounded font-semibold transition-colors cursor-pointer ${filterDirection === 'HUNDRED_BULLISH_ONLY' ? 'bg-emerald-600 text-white font-bold shadow-sm' : 'text-emerald-400/80 hover:text-emerald-300'}`}
              >
                🟢 100% Bull
              </button>
              <button
                onClick={() => { setFilterDirection('HUNDRED_BEARISH_ONLY'); setCurrentIndex(0); }}
                className={`px-1.5 py-0.5 rounded font-semibold transition-colors cursor-pointer ${filterDirection === 'HUNDRED_BEARISH_ONLY' ? 'bg-rose-600 text-white font-bold shadow-sm' : 'text-rose-400/80 hover:text-rose-300'}`}
              >
                🔴 100% Bear
              </button>
            </div>

            <div className="flex items-center space-x-1 flex-wrap gap-y-1">
              {/* Recency & Sustained Hold Filter Toggle */}
              <button
                onClick={() => {
                  setRecencyMode((prev) => {
                    if (prev === 'FRESH_AND_SUSTAINED') return 'SUSTAINED_ONLY';
                    if (prev === 'SUSTAINED_ONLY') return 'FRESH_ONLY';
                    if (prev === 'FRESH_ONLY') return 'ALL_SESSION';
                    return 'FRESH_AND_SUSTAINED';
                  });
                  setCurrentIndex(0);
                }}
                className={`px-1.5 py-0.5 rounded font-mono font-bold transition-all border flex items-center gap-1 cursor-pointer ${
                  recencyMode === 'FRESH_AND_SUSTAINED'
                    ? 'bg-amber-400/20 text-yellow-300 border-amber-400/60 shadow-sm'
                    : recencyMode === 'SUSTAINED_ONLY'
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-500/70 shadow-sm'
                    : recencyMode === 'FRESH_ONLY'
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-500/60'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
                title="Filter between Fresh Hits (<30m) & Stocks that stood still as bullish (>30m), Stood Bullish only, Fresh only, or All Session"
              >
                {recencyMode === 'FRESH_AND_SUSTAINED' && (
                  <>
                    <Zap className="w-2.5 h-2.5 text-yellow-300 fill-current" />
                    <span>⚡+🛡️ Fresh &amp; Stood &gt;30m</span>
                  </>
                )}
                {recencyMode === 'SUSTAINED_ONLY' && (
                  <>
                    <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                    <span>🛡️ Stood &gt;30m Only</span>
                  </>
                )}
                {recencyMode === 'FRESH_ONLY' && (
                  <>
                    <Zap className="w-2.5 h-2.5 text-cyan-300 fill-current" />
                    <span>⚡ Fresh &lt;30m Only</span>
                  </>
                )}
                {recencyMode === 'ALL_SESSION' && (
                  <span>📅 All Session</span>
                )}
              </button>

              {/* Hide Yesterday Filter Toggle */}
              <button
                onClick={() => {
                  setHideYesterday((prev) => !prev);
                  setCurrentIndex(0);
                }}
                className={`px-1.5 py-0.5 rounded font-mono font-bold transition-all border flex items-center gap-1 cursor-pointer ${
                  hideYesterday
                    ? 'bg-rose-950/80 text-rose-300 border-rose-600/50 shadow-sm'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
                title={hideYesterday ? 'Excluding Yesterday recent hits (Today only)' : 'Including yesterday hits'}
              >
                <span>{hideYesterday ? '🚫 No Yesterday' : '📅 All Dates'}</span>
              </button>

              {/* Anti-Trap Safe-Only Filter */}
              <button
                onClick={() => {
                  setSafeOnly((prev) => !prev);
                  setCurrentIndex(0);
                }}
                className={`px-1.5 py-0.5 rounded font-mono font-bold transition-all border flex items-center gap-1 cursor-pointer ${
                  safeOnly
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50 shadow-sm'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
                title="Filter out overextended trap setups"
              >
                <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                <span>{safeOnly ? '🛡️ Safe Only' : 'All'}</span>
              </button>

              {/* Sort Mode Toggle */}
              <button
                onClick={() => {
                  setSortPreference((prev) => (prev === 'RECENCY_FIRST' ? 'ACCURACY_FIRST' : 'RECENCY_FIRST'));
                  setCurrentIndex(0);
                }}
                className={`px-1.5 py-0.5 rounded font-mono font-bold transition-all border flex items-center gap-1 cursor-pointer ${
                  sortPreference === 'RECENCY_FIRST'
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-500/50 shadow-sm'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
                title="Intelligent Intraday Sorting: Prioritize stocks that passed closest to refresh time"
              >
                <Clock className="w-2.5 h-2.5 text-cyan-400" />
                <span>{sortPreference === 'RECENCY_FIRST' ? '⚡ Freshest' : '★ Score'}</span>
              </button>
            </div>
          </div>

          {/* Row 2: Trigger Category Filters */}
          <div className="flex items-center space-x-1 pt-1 border-t border-slate-800/80 overflow-x-auto no-scrollbar pb-0.5">
            <span className="text-slate-400 shrink-0 font-medium">Trigger:</span>
            <button
              onClick={() => { setCategoryFilter('ALL'); setCurrentIndex(0); }}
              className={`px-1.5 py-0.5 rounded font-semibold whitespace-nowrap cursor-pointer transition-all ${
                categoryFilter === 'ALL'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              ⚡ All Hits
            </button>
            <button
              onClick={() => { setCategoryFilter('SUSTAINED_BULL'); setCurrentIndex(0); }}
              className={`px-1.5 py-0.5 rounded font-semibold whitespace-nowrap cursor-pointer transition-all ${
                categoryFilter === 'SUSTAINED_BULL'
                  ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/50 shadow-sm font-bold'
                  : 'bg-slate-900/80 text-slate-400 hover:text-emerald-300'
              }`}
              title="Show stocks that hit and stood still / stayed as bullish for >30 minutes"
            >
              🛡️ Stood Bullish &gt;30m
            </button>
            <button
              onClick={() => { setCategoryFilter('100_BULL'); setCurrentIndex(0); }}
              className={`px-1.5 py-0.5 rounded font-semibold whitespace-nowrap cursor-pointer transition-all ${
                categoryFilter === '100_BULL'
                  ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/50 shadow-sm font-bold'
                  : 'bg-slate-900/80 text-slate-400 hover:text-emerald-300'
              }`}
            >
              🟢 100% Bullish
            </button>
            <button
              onClick={() => { setCategoryFilter('100_BEAR'); setCurrentIndex(0); }}
              className={`px-1.5 py-0.5 rounded font-semibold whitespace-nowrap cursor-pointer transition-all ${
                categoryFilter === '100_BEAR'
                  ? 'bg-rose-500/30 text-rose-300 border border-rose-400/50 shadow-sm font-bold'
                  : 'bg-slate-900/80 text-slate-400 hover:text-rose-300'
              }`}
            >
              🔴 100% Bearish
            </button>
            <button
              onClick={() => { setCategoryFilter('SUSTAINED_30M'); setCurrentIndex(0); }}
              className={`px-1.5 py-0.5 rounded font-semibold whitespace-nowrap cursor-pointer transition-all ${
                categoryFilter === 'SUSTAINED_30M'
                  ? 'bg-teal-500/30 text-teal-300 border border-teal-400/50 shadow-sm font-bold'
                  : 'bg-slate-900/80 text-slate-400 hover:text-teal-300'
              }`}
              title="Show any stock that has stood still firm for >30 minutes"
            >
              🏛️ Stood Still &gt;30m
            </button>
            <button
              onClick={() => { setCategoryFilter('100_PCT'); setCurrentIndex(0); }}
              className={`px-1.5 py-0.5 rounded font-semibold whitespace-nowrap cursor-pointer transition-all ${
                categoryFilter === '100_PCT'
                  ? 'bg-teal-500/30 text-teal-300 border border-teal-400/50 shadow-sm'
                  : 'bg-slate-900/80 text-slate-400 hover:text-teal-300'
              }`}
            >
              🟢🔴 100% Moves
            </button>
            <button
              onClick={() => { setCategoryFilter('PARABOLIC'); setCurrentIndex(0); }}
              className={`px-1.5 py-0.5 rounded font-semibold whitespace-nowrap cursor-pointer transition-all ${
                categoryFilter === 'PARABOLIC'
                  ? 'bg-purple-500/30 text-purple-300 border border-purple-400/50 shadow-sm'
                  : 'bg-slate-900/80 text-slate-400 hover:text-purple-300'
              }`}
            >
              🚀 Parabolic Rally
            </button>
            <button
              onClick={() => { setCategoryFilter('BREAKOUT'); setCurrentIndex(0); }}
              className={`px-1.5 py-0.5 rounded font-semibold whitespace-nowrap cursor-pointer transition-all ${
                categoryFilter === 'BREAKOUT'
                  ? 'bg-amber-500/30 text-yellow-300 border border-amber-400/50 shadow-sm'
                  : 'bg-slate-900/80 text-slate-400 hover:text-yellow-300'
              }`}
            >
              💥 Breakouts
            </button>
            <button
              onClick={() => { setCategoryFilter('RALLY_STARTED'); setCurrentIndex(0); }}
              className={`px-1.5 py-0.5 rounded font-semibold whitespace-nowrap cursor-pointer transition-all ${
                categoryFilter === 'RALLY_STARTED'
                  ? 'bg-blue-500/30 text-blue-300 border border-blue-400/50 shadow-sm'
                  : 'bg-slate-900/80 text-slate-400 hover:text-blue-300'
              }`}
            >
              📈 Rally Started
            </button>
          </div>
        </div>

        {/* Anti-Trap Guide Panel (Explaining how to avoid false breakouts) */}
        {showAntiTrapGuide ? (
          <div className="p-3.5 max-h-80 overflow-y-auto space-y-3 bg-slate-950/98 text-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-black uppercase text-amber-300 tracking-wider">
                  Anti-Trap Master Guide: Why Confluent Stocks Fail & How to Avoid
                </h4>
              </div>
              <button
                onClick={() => setShowAntiTrapGuide(false)}
                className="text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded bg-slate-800"
              >
                ✕ Close
              </button>
            </div>

            <div className="text-[11px] text-slate-300 leading-relaxed">
              Even when 5 or 6 institutional confluences match, a stock can reverse immediately if traders buy blindly at the wrong moment. Here are the 4 Golden Rules to avoid false breakout traps:
            </div>

            <div className="space-y-2">
              <div className="bg-slate-900/90 border border-amber-500/30 p-2 rounded-xl">
                <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                  <span>1. ⏳ The 5-Minute Candle Close Rule (Never Buy Wicks)</span>
                </div>
                <p className="text-[10px] text-slate-300 mt-1">
                  <strong>The Trap:</strong> Price wicks above the 15m high for 10 seconds and instantly drops. Early retail traders get trapped.
                  <br />
                  <strong>The Fix:</strong> Always wait for a <strong>completed 5-minute candle</strong> to CLOSE strictly above the trigger level before entering.
                </p>
              </div>

              <div className="bg-slate-900/90 border border-rose-500/30 p-2 rounded-xl">
                <div className="text-[11px] font-bold text-rose-300 flex items-center gap-1.5">
                  <span>2. 🛑 Avoid Overextension (The &gt;3% VWAP Trap)</span>
                </div>
                <p className="text-[10px] text-slate-300 mt-1">
                  <strong>The Trap:</strong> Stock is already +4.5% up and RSI &gt; 78. Smart money uses breakout buying liquidity to book profit and dump.
                  <br />
                  <strong>The Fix:</strong> Keep <strong>🛡️ Safe Only</strong> enabled! Never buy an overextended stock at peak; wait for a <strong>pullback to VWAP or EMA-9</strong>.
                </p>
              </div>

              <div className="bg-slate-900/90 border border-cyan-500/30 p-2 rounded-xl">
                <div className="text-[11px] font-bold text-cyan-300 flex items-center gap-1.5">
                  <span>3. 📊 Check Nifty & Sector Alignment</span>
                </div>
                <p className="text-[10px] text-slate-300 mt-1">
                  <strong>The Trap:</strong> Taking a bullish breakout while Nifty 50 or BankNifty is falling sharply. 80% of individual breakouts fail if the index dumps.
                  <br />
                  <strong>The Fix:</strong> Only take Long setups when Nifty is above its own VWAP, and Short setups when Nifty is below VWAP.
                </p>
              </div>

              <div className="bg-slate-900/90 border border-emerald-500/30 p-2 rounded-xl">
                <div className="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5">
                  <span>4. 🔒 Hard Invalidation SL Rule</span>
                </div>
                <p className="text-[10px] text-slate-300 mt-1">
                  <strong>The Fix:</strong> If a 5-minute candle closes below VWAP (for Longs) or above VWAP (for Shorts), institutional support is broken. <strong>Exit immediately without hoping.</strong>
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowAntiTrapGuide(false)}
              className="w-full py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow transition-colors"
            >
              Got It — Back to Signals
            </button>
          </div>
        ) : showAllList ? (
          <div className="p-3 max-h-72 overflow-y-auto space-y-1.5 bg-slate-950/95">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-1">
              <span className="flex items-center gap-1.5">
                <span>Recent Hits ({rallySignals.length}{totalQualifiedCount > rallySignals.length ? ` of ${totalQualifiedCount}` : ''})</span>
                <span className="text-[9px] text-purple-300 bg-purple-950/80 border border-purple-800/60 px-1.5 py-0.2 rounded font-mono">
                  {minConfluences}+ of 6 Confluences
                </span>
                {recencyMode === 'FRESH_AND_SUSTAINED' && (
                  <span className="text-[9.5px] text-amber-300 font-normal bg-amber-950/80 border border-amber-800/60 px-1.5 py-0.2 rounded">
                    ⚡ Fresh &amp; 🛡️ Stood &gt;30m
                  </span>
                )}
                {recencyMode === 'SUSTAINED_ONLY' && (
                  <span className="text-[9.5px] text-emerald-300 font-normal bg-emerald-950/80 border border-emerald-800/60 px-1.5 py-0.2 rounded">
                    🛡️ Stood &gt;30m Only
                  </span>
                )}
                {recencyMode === 'FRESH_ONLY' && (
                  <span className="text-[9.5px] text-cyan-300 font-normal bg-cyan-950/80 border border-cyan-800/60 px-1.5 py-0.2 rounded">
                    ⚡ Fresh &lt;30m Only
                  </span>
                )}
              </span>
              <span className="text-[10px] text-slate-400">Click stock to inspect</span>
            </div>
            {rallySignals.map((signal, idx) => {
              const sigBull = signal.direction === 'BULLISH';
              const isSelected = idx === currentIndex;
              return (
                <button
                  key={`${signal.symbol}_${idx}`}
                  onClick={() => {
                    setCurrentIndex(idx);
                    setShowAllList(false);
                    setSlideProgress(0);
                  }}
                  className={`w-full text-left p-2 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                    isSelected 
                      ? (sigBull ? 'bg-emerald-950/80 border-emerald-500/80 ring-1 ring-emerald-500/40' : 'bg-rose-950/80 border-rose-500/80 ring-1 ring-rose-500/40')
                      : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    {sigBull ? (
                      <Flame className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    )}
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5 flex-wrap">
                        <span>{signal.symbol}</span>
                        <span className="text-[10px] text-slate-400 font-normal">₹{signal.currentPrice.toFixed(1)}</span>
                        <span className={`px-1 py-0.2 rounded text-[8.5px] font-mono font-black border ${signal.triggerColorClass}`}>
                          {signal.triggerBadge}
                        </span>
                        {idx === 0 ? (
                          <span className="bg-amber-400/20 text-yellow-300 border border-amber-400/40 px-1 py-0.2 rounded text-[8.5px] font-mono font-bold flex items-center gap-0.5">
                            👑 #1 BEST
                          </span>
                        ) : (
                          <span className="bg-slate-800 text-slate-300 border border-slate-700 px-1 py-0.2 rounded text-[8.5px] font-mono font-bold">
                            #{idx + 1}
                          </span>
                        )}
                        {signal.isSustainedHold ? (
                          <span className="bg-emerald-950/90 text-emerald-300 border border-emerald-500/60 px-1 py-0.2 rounded text-[8px] font-mono font-black flex items-center gap-0.5 shadow-sm">
                            <ShieldCheck className="w-2 h-2 text-emerald-400" />
                            STOOD &gt;30M ({signal.sustainedDurationMinutes}m)
                          </span>
                        ) : signal.isFresh ? (
                          <span className="bg-amber-400/20 text-yellow-300 border border-amber-400/40 px-1 py-0.2 rounded text-[8.5px] font-mono font-bold flex items-center gap-0.5">
                            <Zap className="w-2 h-2 fill-current" />
                            FRESH
                          </span>
                        ) : null}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[170px] flex items-center gap-1">
                        <span>{signal.rallyType}</span>
                        {signal.parabolicScore && (
                          <span className="text-[9px] text-teal-300 font-mono font-bold">
                            • Parabolic {signal.parabolicScore}/16
                          </span>
                        )}
                      </div>
                      <div className="text-[9px] text-cyan-300 font-mono mt-0.5 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5 text-cyan-400" />
                        <span>Passed: {signal.rulePassedTime} {signal.isMarketHours && `(${signal.recencyMinutes === 0 ? 'Just now' : `${signal.recencyMinutes}m ago`}${signal.isSustainedHold ? ' • Stood Firm' : ''})`}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`text-xs font-black font-mono ${sigBull ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {signal.pctChange >= 0 ? '+' : ''}{signal.pctChange.toFixed(2)}%
                    </div>
                    <div className="text-[9px] font-mono text-amber-300 font-bold">
                      {signal.confidenceScore}% Conviction
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : !currentRally || !plan ? (
          /* Empty State when no signals match the currently selected filter options */
          <div className="p-4 space-y-3.5 text-center bg-slate-950/80">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-700/80 flex items-center justify-center mx-auto text-amber-400 shadow-inner">
              <Filter className="w-6 h-6" />
            </div>

            <div>
              <h4 className="text-sm font-black text-slate-100 uppercase tracking-wide">
                No Signals Match Active Filter
              </h4>
              <p className="text-[11.5px] text-slate-400 mt-1 leading-relaxed">
                Currently 0 stocks pass the active criteria for <span className="text-amber-300 font-bold font-mono">{categoryFilter.replace(/_/g, ' ')}</span> with <span className="text-cyan-300 font-bold font-mono">{filterDirection.replace(/_/g, ' ')}</span> and <span className="text-emerald-300 font-bold font-mono">{recencyMode.replace(/_/g, ' ')}</span>.
              </p>
            </div>

            {/* Quick Action Reset & Switch Filter Buttons */}
            <div className="pt-1 flex flex-wrap items-center justify-center gap-1.5">
              <button
                onClick={() => {
                  setCategoryFilter('ALL');
                  setFilterDirection('ALL');
                  setRecencyMode('FRESH_AND_SUSTAINED');
                  setSafeOnly(false);
                  setHideYesterday(false);
                  setCurrentIndex(0);
                }}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Flame className="w-3.5 h-3.5 text-yellow-300 fill-current" />
                <span>⚡ Show All Active Signals</span>
              </button>

              <button
                onClick={() => {
                  setCategoryFilter('ALL');
                  setFilterDirection('BULLISH_ONLY');
                  setCurrentIndex(0);
                }}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 text-[11px] font-semibold rounded-lg border border-slate-700 transition-colors cursor-pointer"
              >
                🟢 View All Bullish
              </button>

              <button
                onClick={() => {
                  setCategoryFilter('ALL');
                  setFilterDirection('BEARISH_ONLY');
                  setCurrentIndex(0);
                }}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-rose-300 text-[11px] font-semibold rounded-lg border border-slate-700 transition-colors cursor-pointer"
              >
                🔴 View All Bearish
              </button>

              <button
                onClick={() => {
                  setCategoryFilter('SUSTAINED_30M');
                  setFilterDirection('ALL');
                  setCurrentIndex(0);
                }}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-300 text-[11px] font-semibold rounded-lg border border-slate-700 transition-colors cursor-pointer"
              >
                🛡️ Stood &gt;30m
              </button>

              <button
                onClick={() => {
                  setCategoryFilter('100_PCT_ALL');
                  setFilterDirection('ALL');
                  setCurrentIndex(0);
                }}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-yellow-300 text-[11px] font-semibold rounded-lg border border-slate-700 transition-colors cursor-pointer"
              >
                🟢🔴 100% Moves
              </button>
            </div>
          </div>
        ) : (
          /* Content Body of Selected Rotating Stock */
          <div className="p-3.5 space-y-3 transition-all duration-300">
            
            {/* Main Headline & Ticker Info */}
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                    {/* Trigger Event Badge */}
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md font-mono border shadow-sm flex items-center gap-1 ${currentRally.triggerColorClass}`}>
                      {currentRally.triggerBadge}
                    </span>

                    {currentIndex === 0 ? (
                      <span className="bg-amber-400/20 text-yellow-300 border border-amber-400/50 text-[10px] font-black uppercase px-2 py-0.5 rounded font-mono flex items-center gap-1 shadow-sm">
                        👑 #1 Best Confluence Match
                      </span>
                    ) : (
                      <span className="bg-slate-800/90 text-slate-200 border border-slate-700 text-[10px] font-black uppercase px-2 py-0.5 rounded font-mono flex items-center gap-1">
                        ⭐ Top Elite #{currentIndex + 1}
                      </span>
                    )}

                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded font-mono ${
                      currentRally.confidenceBadge === 'INSTITUTIONAL DIAMOND'
                        ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                        : currentRally.confidenceBadge === 'HIGH CONVICTION PRIME'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                    }`}>
                      {currentRally.confidenceBadge}
                    </span>
                    
                    {currentRally.parabolicScore && (
                      <span className="bg-teal-950/90 text-teal-300 border border-teal-500/50 text-[10px] px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1">
                        <Flame className="w-2.5 h-2.5 text-teal-300" />
                        Parabolic {currentRally.parabolicScore}/16
                      </span>
                    )}

                    {currentRally.isSustainedHold && (
                      <span className="bg-emerald-950/90 text-emerald-300 border border-emerald-500/70 text-[10px] px-2 py-0.5 rounded font-mono font-black flex items-center gap-1 shadow-sm">
                        <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                        🛡️ Stood Firm &gt;30m ({currentRally.sustainedDurationMinutes}m)
                      </span>
                    )}

                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1 border ${
                      currentRally.isFresh
                        ? 'bg-amber-950/90 text-yellow-300 border-amber-500/50 shadow-sm animate-pulse'
                        : currentRally.isSustainedHold
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                        : 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40'
                    }`}>
                      {currentRally.isFresh ? <Zap className="w-2.5 h-2.5 text-yellow-300 fill-current" /> : <Clock className="w-2.5 h-2.5 text-cyan-400" />}
                      Rule Passed: {currentRally.rulePassedTime}
                      {currentRally.isMarketHours && (
                        <span className="text-[9px] text-slate-300 font-sans ml-0.5">
                          ({currentRally.recencyMinutes === 0 ? 'Just now' : `${currentRally.recencyMinutes}m ago`})
                        </span>
                      )}
                    </span>
                  </div>

                  <h4 className={`text-sm font-extrabold leading-tight mt-1.5 ${isBull ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {currentRally.isSustainedHold
                      ? (isBull ? 'Bullish strength stood still & held firm >30m on ' : 'Bearish pressure stood still & held firm >30m on ')
                      : (isBull ? 'Bullish rally is going on with ' : 'Bearish breakdown is going on with ')}
                    <span className="text-white underline decoration-2 font-black">{currentRally.symbol}</span>!
                  </h4>
                  <p className="text-[11px] text-slate-300 truncate max-w-[240px] mt-0.5">
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

              {/* Exact Timing Analysis Banner */}
              <div className="mt-2 bg-slate-900/95 border border-slate-700/80 rounded-lg px-2.5 py-1.5 flex items-center justify-between text-[10.5px]">
                <div className="flex items-center space-x-1.5 flex-wrap">
                  {currentRally.isSustainedHold ? (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="text-slate-300 font-medium">Stood Bullish/Firm For:</span>
                      <span className="font-mono font-bold text-emerald-300">{currentRally.sustainedDurationMinutes} mins</span>
                      <span className="text-[9.5px] text-slate-400 font-mono">(Hit at {currentRally.rulePassedTime})</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                      <span className="text-slate-300 font-medium">Just Hit At:</span>
                      <span className="font-mono font-bold text-cyan-300">{currentRally.rulePassedTime}</span>
                      {currentRally.isMarketHours && (
                        <span className="text-[9.5px] text-amber-300 font-mono font-bold">
                          ({currentRally.recencyMinutes === 0 ? '⚡ Just now' : `⚡ ${currentRally.recencyMinutes}m ago`})
                        </span>
                      )}
                    </>
                  )}
                </div>
                <span className="text-[9px] text-purple-300 font-mono flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-purple-400" />
                  {currentRally.confluenceRatio} Confluences
                </span>
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
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectStockDetail(currentRally.stock);
                }}
                className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] cursor-pointer hover:bg-white/5 px-1 py-0.5 rounded transition-colors"
                title="Click to view full Options Strike Analysis & Gann levels"
              >
                <div className="flex items-center space-x-1">
                  <Zap className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                  <span className="font-sans text-slate-300 text-[10px]">Option:</span>
                  <span className="font-mono font-black text-yellow-300 text-[10px] bg-yellow-950/80 px-1 py-0.2 rounded border border-yellow-500/40">
                    {plan.recommendedOptionStrike}
                  </span>
                </div>
                <div className="text-[10px] font-mono text-slate-300">
                  LTP ~<span className="text-white font-bold">₹{plan.optionEntryEst.toFixed(1)}</span> (T1: <span className="text-emerald-400 font-bold">₹{plan.optionTarget1.toFixed(1)}</span>)
                </div>
              </div>
            </div>

            {/* Anti-Trap Execution & Invalidation Rules Box (Crucial to prevent false breakout losses) */}
            <div className={`p-2.5 rounded-xl border text-[10.5px] space-y-1.5 ${
              currentRally.trapRiskLevel === 'SAFE'
                ? 'bg-slate-900/90 border-emerald-500/40'
                : currentRally.trapRiskLevel === 'MODERATE'
                ? 'bg-amber-950/40 border-amber-500/40'
                : 'bg-rose-950/40 border-rose-500/50'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 font-bold">
                  <ShieldCheck className={`w-3.5 h-3.5 ${
                    currentRally.trapRiskLevel === 'SAFE' ? 'text-emerald-400' : currentRally.trapRiskLevel === 'MODERATE' ? 'text-amber-400' : 'text-rose-400'
                  }`} />
                  <span className="uppercase text-[10px] tracking-wider text-slate-200">
                    Anti-Trap Guard:
                  </span>
                  <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-mono font-black ${
                    currentRally.trapRiskLevel === 'SAFE'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : currentRally.trapRiskLevel === 'MODERATE'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                  }`}>
                    {currentRally.trapRiskLevel === 'SAFE' ? '🛡️ Prime Base (Safe Entry)' : currentRally.trapRiskLevel === 'MODERATE' ? '⚠️ Moderate Extension' : '🚨 Overextended Trap Risk'}
                  </span>
                </div>
                <button
                  onClick={() => setShowAntiTrapGuide(true)}
                  className="text-[9.5px] text-amber-300 hover:underline cursor-pointer flex items-center gap-0.5"
                >
                  <Info className="w-2.5 h-2.5" />
                  <span>Trap Rules</span>
                </button>
              </div>

              {/* Strict Entry Confirmation Trigger */}
              <div className="bg-slate-950/80 p-1.5 rounded-lg border border-slate-800 space-y-1">
                <div className="text-slate-300 flex items-start gap-1">
                  <span className="text-emerald-400 font-bold shrink-0">🎯 Entry Confirmation:</span>
                  <span className="font-mono text-white text-[10px]">{currentRally.entryConfirmation}</span>
                </div>
                <div className="text-slate-300 flex items-start gap-1 border-t border-slate-800/80 pt-1">
                  <span className="text-rose-400 font-bold shrink-0">🛑 Invalidation SL:</span>
                  <span className="font-mono text-rose-300 text-[10px]">{currentRally.invalidationRule}</span>
                </div>
              </div>

              {/* Trap Warning Note */}
              <div className="text-[9.5px] text-slate-400 leading-snug">
                💡 <span className="text-slate-300 font-medium">{currentRally.trapWarning}</span>
              </div>
            </div>

            {/* Confluence Points Checklist */}
            <div className="bg-slate-900/90 border border-slate-800/90 p-2 rounded-xl space-y-1">
              <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Verified Confluences ({currentRally.confluenceRatio} Matched):</span>
                </div>
                <span className="text-[9px] font-mono text-purple-300 bg-purple-950/80 px-1.5 py-0.2 rounded border border-purple-500/30">
                  {Math.round((currentRally.confluenceCount / currentRally.totalConfluences) * 100)}% Majority
                </span>
              </div>
              <div className="space-y-0.5 mt-1">
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

            {/* Navigation Slider Bar with Auto-Rotate Status & Dot Pills */}
            {rallySignals.length > 1 && (
              <div className="pt-1.5 border-t border-slate-800/80 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <button
                    onClick={handlePrevSlide}
                    className="p-1 text-slate-400 hover:text-white flex items-center gap-0.5 transition-colors cursor-pointer text-[11px]"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Prev</span>
                  </button>

                  <div className="flex items-center space-x-1">
                    <span className="text-[11px] text-slate-300 font-semibold font-mono">
                      Stock {currentIndex + 1} of {rallySignals.length}
                    </span>
                    {isAutoRotating && (
                      <span className="text-[9px] text-yellow-300 bg-yellow-950/60 px-1 py-0.2 rounded border border-yellow-500/30">
                        Auto-Rotating (5s)
                      </span>
                    )}
                  </div>

                  <button
                    onClick={handleNextSlide}
                    className="p-1 text-slate-400 hover:text-white flex items-center gap-0.5 transition-colors cursor-pointer text-[11px]"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Dot / Pill Indicators for rapid navigation */}
                <div className="flex items-center justify-center space-x-1">
                  {rallySignals.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setCurrentIndex(i);
                        setSlideProgress(0);
                      }}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        i === currentIndex 
                          ? (isBull ? 'w-5 bg-emerald-400' : 'w-5 bg-rose-400') 
                          : 'w-1.5 bg-slate-700 hover:bg-slate-500'
                      }`}
                      title={`Jump to setup #${i + 1}`}
                    />
                  ))}
                </div>
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
        )}

      </div>
    </div>
  );
};
