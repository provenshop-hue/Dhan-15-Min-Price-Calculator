import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  CheckCircle2,
  Play,
  Pause,
  List,
  Layers,
  Info,
  Filter,
  Plus,
  RotateCcw,
  EyeOff
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
  // Active Filter states - clicking any active filter removes it / goes off from selection
  const [filterDirection, setFilterDirection] = useState<RallyFilterDirection>('ALL');
  const [selectedTriggers, setSelectedTriggers] = useState<Set<RallyCategoryFilter>>(new Set());
  const [recencyMode, setRecencyMode] = useState<'ALL_SESSION' | 'FRESH_ONLY' | 'SUSTAINED_ONLY' | 'FRESH_AND_SUSTAINED'>('ALL_SESSION');
  const [safeOnly, setSafeOnly] = useState<boolean>(false);
  const [hideYesterday, setHideYesterday] = useState<boolean>(false);
  // Volume & RSI momentum filter states (default true per user requirement: stocks shown in popunder must have good volume, volume is increasing, rsi is increasing)
  const [goodVolumeOnly, setGoodVolumeOnly] = useState<boolean>(true);
  const [volumeIncreasingOnly, setVolumeIncreasingOnly] = useState<boolean>(true);
  const [rsiIncreasingOnly, setRsiIncreasingOnly] = useState<boolean>(true);
  const [dismissedSymbols, setDismissedSymbols] = useState<Set<string>>(new Set());

  // Expand / collapse quick filter tray
  const [isFilterBarExpanded, setIsFilterBarExpanded] = useState<boolean>(true);

  const [rallySignals, setRallySignals] = useState<RallySignal[]>([]);
  const [totalRawCount, setTotalRawCount] = useState<number>(0);
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

  // Toggle or remove a trigger filter
  const toggleTriggerFilter = (trigger: RallyCategoryFilter) => {
    setSelectedTriggers((prev) => {
      const next = new Set(prev);
      if (next.has(trigger)) {
        next.delete(trigger); // Clicked -> goes off from selection
      } else {
        next.add(trigger); // Add to selection
      }
      return next;
    });
    setCurrentIndex(0);
    setSlideProgress(0);
  };

  // Toggle direction filter (clicking active direction goes off back to 'ALL')
  const handleDirectionClick = (dir: RallyFilterDirection) => {
    if (filterDirection === dir) {
      setFilterDirection('ALL'); // goes off from selection
    } else {
      setFilterDirection(dir);
    }
    setCurrentIndex(0);
    setSlideProgress(0);
  };

  // Toggle recency filter (clicking active recency goes off back to 'ALL_SESSION')
  const handleRecencyClick = (mode: 'FRESH_ONLY' | 'SUSTAINED_ONLY' | 'FRESH_AND_SUSTAINED') => {
    if (recencyMode === mode) {
      setRecencyMode('ALL_SESSION'); // goes off from selection
    } else {
      setRecencyMode(mode);
    }
    setCurrentIndex(0);
    setSlideProgress(0);
  };

  // Clear all filters
  const handleClearAllFilters = () => {
    setFilterDirection('ALL');
    setSelectedTriggers(new Set());
    setRecencyMode('ALL_SESSION');
    setSafeOnly(false);
    setHideYesterday(false);
    setGoodVolumeOnly(false);
    setVolumeIncreasingOnly(false);
    setRsiIncreasingOnly(false);
    setCurrentIndex(0);
    setSlideProgress(0);
  };

  // Dismiss a specific stock from the popunder selection
  const handleDismissStock = (symbol: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDismissedSymbols((prev) => {
      const next = new Set(prev);
      next.add(symbol);
      return next;
    });
    setCurrentIndex(0);
    setSlideProgress(0);
  };

  // Restore all dismissed stocks
  const handleRestoreDismissed = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDismissedSymbols(new Set());
    setCurrentIndex(0);
    setSlideProgress(0);
  };

  // Scan stocks whenever stocks or filters change
  useEffect(() => {
    // Get all raw detected signals
    const allDetected = getAllRallySignals(
      stocks, 
      'ALL', 
      'RECENCY_FIRST', 
      2, 
      0, 
      false, 
      'ALL', 
      false,
      false
    );

    setTotalRawCount(allDetected.length);

    // Apply active filter selections
    const filtered = allDetected.filter((signal) => {
      // 1. Exclude dismissed stocks
      if (dismissedSymbols.has(signal.symbol)) {
        return false;
      }

      // 2. Direction filter
      if (filterDirection === 'BULLISH_ONLY' && signal.direction !== 'BULLISH') return false;
      if (filterDirection === 'BEARISH_ONLY' && signal.direction !== 'BEARISH') return false;
      if (filterDirection === 'HUNDRED_BULLISH_ONLY' && signal.triggerType !== 'ONE_HUNDRED_PCT_BULLISH') return false;
      if (filterDirection === 'HUNDRED_BEARISH_ONLY' && signal.triggerType !== 'ONE_HUNDRED_PCT_BEARISH') return false;
      if (filterDirection === 'HUNDRED_PCT_ALL' && signal.triggerType !== 'ONE_HUNDRED_PCT_BULLISH' && signal.triggerType !== 'ONE_HUNDRED_PCT_BEARISH') return false;

      // 3. Recency filter
      if (recencyMode === 'FRESH_ONLY' && (!signal.isFresh || signal.isYesterday)) return false;
      if (recencyMode === 'SUSTAINED_ONLY' && (!signal.isSustainedHold || signal.isYesterday)) return false;
      if (recencyMode === 'FRESH_AND_SUSTAINED' && !((signal.isJustHit || signal.isSustainedHold) && !signal.isYesterday)) return false;

      // 4. Hide yesterday
      if (hideYesterday && signal.isYesterday) return false;

      // 5. Safe only (anti-trap)
      if (safeOnly && signal.trapRiskLevel === 'OVEREXTENDED_TRAP') return false;

      // 6. Good volume requirement (user requirement)
      if (goodVolumeOnly && !signal.isGoodVolume) return false;

      // 7. Volume increasing requirement (user requirement)
      if (volumeIncreasingOnly && !signal.isVolumeIncreasing) return false;

      // 8. RSI increasing requirement (user requirement)
      if (rsiIncreasingOnly && !signal.isRsiIncreasing) return false;

      // 9. Multi-select trigger categories (if any selected, must match at least one selected trigger)
      if (selectedTriggers.size > 0) {
        let matchesAnySelected = false;
        if (selectedTriggers.has('100_BULL') && signal.triggerType === 'ONE_HUNDRED_PCT_BULLISH') matchesAnySelected = true;
        if (selectedTriggers.has('100_BEAR') && signal.triggerType === 'ONE_HUNDRED_PCT_BEARISH') matchesAnySelected = true;
        if (selectedTriggers.has('100_PCT') && (signal.triggerType === 'ONE_HUNDRED_PCT_BULLISH' || signal.triggerType === 'ONE_HUNDRED_PCT_BEARISH')) matchesAnySelected = true;
        if (selectedTriggers.has('BREAKOUT') && signal.triggerType === 'BREAKOUT_JUST_HIT') matchesAnySelected = true;
        if (selectedTriggers.has('PARABOLIC') && (signal.triggerType === 'PARABOLIC_BULLISH_RALLY_STARTED' || signal.triggerType === 'PARABOLIC_BEARISH_RALLY_STARTED')) matchesAnySelected = true;
        if (selectedTriggers.has('RALLY_STARTED') && (signal.triggerType === 'BULLISH_RALLY_STARTED' || signal.triggerType === 'BEARISH_RALLY_STARTED' || signal.triggerType === 'PARABOLIC_BULLISH_RALLY_STARTED' || signal.triggerType === 'PARABOLIC_BEARISH_RALLY_STARTED')) matchesAnySelected = true;
        if (selectedTriggers.has('SUSTAINED_30M') && signal.isSustainedHold) matchesAnySelected = true;
        if (selectedTriggers.has('SUSTAINED_BULL') && signal.isSustainedHold && signal.direction === 'BULLISH') matchesAnySelected = true;
        if (!matchesAnySelected) return false;
      }

      return true;
    });

    setRallySignals(filtered);

    if (filtered.length > 0) {
      const currentKeys = new Set(filtered.map((d) => `${d.symbol}_${d.direction}_${d.triggerType}_${d.isSustainedHold ? 'sustained' : 'hit'}`));
      let hasNewRally = false;
      let newDirection: RallyDirection = 'BULLISH';

      for (const key of currentKeys) {
        if (!previousRallySymbolsRef.current.has(key)) {
          hasNewRally = true;
          const found = filtered.find((d) => `${d.symbol}_${d.direction}_${d.triggerType}_${d.isSustainedHold ? 'sustained' : 'hit'}` === key);
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
    if (currentIndex >= filtered.length) {
      setCurrentIndex(0);
    }
  }, [
    stocks, 
    filterDirection, 
    selectedTriggers, 
    recencyMode, 
    safeOnly, 
    hideYesterday, 
    goodVolumeOnly,
    volumeIncreasingOnly,
    rsiIncreasingOnly,
    dismissedSymbols, 
    soundEnabled
  ]);

  // List of active filter pills for the active filter bar
  const activeFilterList = useMemo(() => {
    const list: { id: string; label: string; onRemove: () => void; colorClass: string }[] = [];

    if (filterDirection !== 'ALL') {
      const labelMap: Record<string, string> = {
        BULLISH_ONLY: '🟢 Bullish Only',
        BEARISH_ONLY: '🔴 Bearish Only',
        HUNDRED_BULLISH_ONLY: '🟢 100% Bullish',
        HUNDRED_BEARISH_ONLY: '🔴 100% Bearish',
        HUNDRED_PCT_ALL: '🟢🔴 100% Target Moves'
      };
      list.push({
        id: `dir_${filterDirection}`,
        label: labelMap[filterDirection] || filterDirection,
        onRemove: () => setFilterDirection('ALL'),
        colorClass: filterDirection.includes('BEAR') ? 'bg-rose-950/80 text-rose-300 border-rose-500/50' : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
      });
    }

    if (recencyMode !== 'ALL_SESSION') {
      const recencyLabelMap: Record<string, string> = {
        FRESH_ONLY: '⚡ Fresh (<30m) Only',
        SUSTAINED_ONLY: '🛡️ Stood >30m Only',
        FRESH_AND_SUSTAINED: '⚡+🛡️ Fresh & Stood >30m'
      };
      list.push({
        id: `rec_${recencyMode}`,
        label: recencyLabelMap[recencyMode] || recencyMode,
        onRemove: () => setRecencyMode('ALL_SESSION'),
        colorClass: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/50'
      });
    }

    if (hideYesterday) {
      list.push({
        id: 'hide_yesterday',
        label: '🚫 Exclude Yesterday',
        onRemove: () => setHideYesterday(false),
        colorClass: 'bg-slate-800 text-slate-300 border-slate-600'
      });
    }

    if (safeOnly) {
      list.push({
        id: 'safe_only',
        label: '🛡️ Safe Only (Anti-Trap)',
        onRemove: () => setSafeOnly(false),
        colorClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
      });
    }

    if (goodVolumeOnly) {
      list.push({
        id: 'good_vol',
        label: '📊 Good Volume (≥1.0x)',
        onRemove: () => setGoodVolumeOnly(false),
        colorClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
      });
    }

    if (volumeIncreasingOnly) {
      list.push({
        id: 'vol_increasing',
        label: '📈 Vol ↗ Increasing',
        onRemove: () => setVolumeIncreasingOnly(false),
        colorClass: 'bg-teal-950/80 text-teal-300 border-teal-500/50'
      });
    }

    if (rsiIncreasingOnly) {
      list.push({
        id: 'rsi_increasing',
        label: '⚡ RSI ↗ Increasing',
        onRemove: () => setRsiIncreasingOnly(false),
        colorClass: 'bg-indigo-950/80 text-indigo-300 border-indigo-500/50'
      });
    }

    selectedTriggers.forEach((trig) => {
      const trigMap: Record<string, { label: string; color: string }> = {
        '100_BULL': { label: '🟢 100% Bull', color: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50' },
        '100_BEAR': { label: '🔴 100% Bear', color: 'bg-rose-950/80 text-rose-300 border-rose-500/50' },
        '100_PCT': { label: '🎯 100% Targets', color: 'bg-teal-950/80 text-teal-300 border-teal-500/50' },
        'BREAKOUT': { label: '💥 Breakouts', color: 'bg-amber-950/80 text-yellow-300 border-amber-500/50' },
        'PARABOLIC': { label: '🚀 Parabolic Rally', color: 'bg-purple-950/80 text-purple-300 border-purple-500/50' },
        'RALLY_STARTED': { label: '📈 Rally Started', color: 'bg-blue-950/80 text-blue-300 border-blue-500/50' },
        'SUSTAINED_30M': { label: '🏛️ Stood >30m', color: 'bg-teal-950/80 text-teal-300 border-teal-500/50' },
        'SUSTAINED_BULL': { label: '🛡️ Stood Bullish', color: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50' }
      };
      const info = trigMap[trig] || { label: trig, color: 'bg-slate-800 text-slate-300 border-slate-700' };
      list.push({
        id: `trig_${trig}`,
        label: info.label,
        onRemove: () => toggleTriggerFilter(trig),
        colorClass: info.color
      });
    });

    return list;
  }, [filterDirection, recencyMode, hideYesterday, safeOnly, goodVolumeOnly, volumeIncreasingOnly, rsiIncreasingOnly, selectedTriggers]);

  const hasActiveFilters = activeFilterList.length > 0;

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
            ⚡ Rally Signals {rallySignals.length > 0 ? `(${rallySignals.length})` : totalRawCount > 0 ? `(${totalRawCount})` : ''}
          </span>
        </button>
      </div>
    );
  }

  const hasSignals = rallySignals.length > 0;
  const currentRally = hasSignals ? (rallySignals[currentIndex] || rallySignals[0]) : null;
  const isBull = currentRally ? currentRally.direction === 'BULLISH' : true;
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
                <div className="text-sm font-black flex items-center gap-1.5 flex-wrap">
                  <span className={`text-base font-mono tracking-tight ${isBull ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {currentRally.symbol}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md font-mono text-xs font-bold ${isBull ? 'bg-emerald-500/30 text-emerald-200' : 'bg-rose-500/30 text-rose-200'}`}>
                    {isGainPositive ? '+' : ''}{pct.toFixed(2)}%
                  </span>
                  <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-mono font-black border ${currentRally.triggerColorClass}`}>
                    {currentRally.triggerBadge}
                  </span>
                  {currentRally.isSustainedHold && (
                    <span className="bg-emerald-950/90 text-emerald-300 border border-emerald-500/80 px-1.5 py-0.2 rounded text-[9px] font-mono font-black flex items-center gap-0.5 shadow-sm">
                      <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                      STOOD &gt;30M
                    </span>
                  )}
                  {currentIndex === 0 ? (
                    <span className="bg-amber-400/20 text-yellow-300 border border-amber-400/40 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold">
                      👑 #1
                    </span>
                  ) : (
                    <span className="bg-slate-800 text-slate-300 border border-slate-700 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold">
                      #{currentIndex + 1}
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-lg text-xs font-mono font-black flex items-center gap-1 border bg-amber-950/90 text-yellow-200 border-amber-400/70 shadow-sm">
                    {currentRally.isFresh ? <Zap className="w-3 h-3 text-yellow-300 fill-current animate-pulse" /> : <Clock className="w-3 h-3 text-cyan-300" />}
                    <span>HIT: {currentRally.rulePassedTime}</span>
                  </span>
                  {currentRally.volumeRatio && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/50">
                      📊 {currentRally.volumeRatio.toFixed(1)}x{currentRally.isVolumeIncreasing ? ' ↗' : ''}
                    </span>
                  )}
                  {currentRally.rsi && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-950/80 text-indigo-300 border border-indigo-500/50">
                      ⚡ RSI {currentRally.rsi.toFixed(0)}{currentRally.isRsiIncreasing ? ' ↗' : ''}
                    </span>
                  )}
                </div>
                
                {rallySignals.length > 1 && (
                  <div className="text-[11px] text-slate-300 font-medium flex items-center gap-1 mt-0.5">
                    <span>{currentRally.isSustainedHold ? '🛡️ Stood Still Firm (>30m)' : 'Active Setups'} ({currentIndex + 1}/{rallySignals.length})</span>
                    <span className="text-[10px] text-slate-400">• {currentRally.rallyType}</span>
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
      className="fixed bottom-4 right-4 z-40 w-[440px] max-w-[calc(100vw-1.5rem)] animate-slide-up"
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
        <div className={`px-3.5 py-2.5 flex items-center justify-between shadow-md ${
          isBull 
            ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700' 
            : 'bg-gradient-to-r from-rose-700 via-red-600 to-rose-800'
        }`}>
          <div className="flex items-center space-x-2">
            {isBull ? (
              <Flame className="w-5 h-5 text-yellow-300 fill-current animate-bounce" />
            ) : (
              <TrendingDown className="w-5 h-5 text-yellow-200 animate-pulse" />
            )}
            <div className="flex items-center gap-2 flex-wrap">
              {currentRally ? (
                <>
                  <span className="text-sm font-black tracking-wider uppercase text-white">
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
                  <span className="bg-black/40 text-yellow-200 text-xs px-2.5 py-0.5 rounded-full font-bold border border-yellow-300/40">
                    {currentRally.confidenceScore}% Accuracy
                  </span>
                  {currentRally.isSustainedHold ? (
                    <span className="text-xs px-2.5 py-1 rounded-lg font-mono font-black border bg-emerald-950/90 text-emerald-200 border-emerald-400/80 shadow-[0_0_12px_rgba(16,185,129,0.4)] flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>STOOD &gt;30M</span>
                    </span>
                  ) : (
                    <span className="text-xs px-2.5 py-1 rounded-lg font-mono font-black border flex items-center gap-1.5 bg-slate-950/85 text-yellow-300 border-yellow-400/80 shadow-md">
                      <Zap className="w-3.5 h-3.5 text-yellow-300 fill-current animate-pulse" />
                      <span className="tracking-wide">HIT: {currentRally.rulePassedTime}</span>
                      {currentRally.isMarketHours && (
                        <span className="text-[11px] text-amber-200 font-sans font-bold">
                          ({currentRally.recencyMinutes === 0 ? 'Just now' : `${currentRally.recencyMinutes}m ago`})
                        </span>
                      )}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span className="text-sm font-black uppercase text-white">⚡ Rally &amp; Breakout Popunder</span>
                  <span className="bg-black/40 text-amber-300 text-xs px-2 py-0.5 rounded-full font-bold border border-amber-400/40">
                    0 Matches
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            {/* Filter Tray Toggle Button */}
            <button
              onClick={() => setIsFilterBarExpanded((prev) => !prev)}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                hasActiveFilters
                  ? 'bg-yellow-400 text-slate-950 font-black shadow-md'
                  : isFilterBarExpanded
                  ? 'bg-white/25 text-white'
                  : 'bg-white/10 text-white/80 hover:bg-white/20'
              }`}
              title={isFilterBarExpanded ? 'Hide Filter Bar' : 'Show Filter Bar'}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filters{hasActiveFilters ? ` (${activeFilterList.length})` : ''}</span>
            </button>

            {/* Anti-Trap Guide Toggle */}
            <button
              onClick={() => {
                setShowAntiTrapGuide((prev) => !prev);
                if (!showAntiTrapGuide) setShowAllList(false);
              }}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                showAntiTrapGuide 
                  ? 'bg-amber-400 text-slate-950 font-black shadow-md' 
                  : 'bg-white/15 text-amber-200 hover:bg-white/25'
              }`}
              title="How to avoid false breakouts and traps"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
              <span>Anti-Trap</span>
            </button>

            {/* Auto-Rotate Play/Pause */}
            {rallySignals.length > 1 && (
              <button
                onClick={toggleAutoRotate}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isAutoRotating ? 'text-yellow-200 hover:bg-white/10' : 'text-white/50 hover:text-white'
                }`}
                title={isAutoRotating ? 'Pause Auto-Slider' : 'Resume Auto-Slider (5s)'}
              >
                {isAutoRotating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
            )}

            {/* List View Toggle */}
            <button
              onClick={() => {
                setShowAllList((prev) => !prev);
                if (!showAllList) setShowAntiTrapGuide(false);
              }}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                showAllList ? 'bg-white/20 text-white' : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
              title="Show All Rallying Stocks List"
            >
              <List className="w-4 h-4" />
            </button>

            {/* Sound Toggle */}
            <button
              onClick={toggleSound}
              className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title={soundEnabled ? 'Mute Alert Sound' : 'Enable Alert Sound'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-white/50" />}
            </button>

            {/* Minimize Popunder */}
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="Minimize to Popunder Pill"
            >
              <Minimize2 className="w-4 h-4" />
            </button>

            {/* Close */}
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="Dismiss Alert"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ACTIVE FILTERS STRIP: When clicked, the filter goes OFF from the selection */}
        {hasActiveFilters && (
          <div className="bg-slate-950/95 px-3 py-1.5 border-b border-slate-800 flex items-center justify-between gap-1 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-amber-300 font-bold uppercase tracking-wider flex items-center gap-0.5">
                <Filter className="w-3 h-3 text-amber-400" />
                Active ({activeFilterList.length}):
              </span>
              {activeFilterList.map((f) => (
                <button
                  key={f.id}
                  onClick={f.onRemove}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer hover:bg-rose-900/80 hover:text-rose-200 hover:border-rose-500/80 group ${f.colorClass}`}
                  title="Click to remove this filter from active selection"
                >
                  <span>{f.label}</span>
                  <X className="w-3 h-3 group-hover:rotate-90 transition-transform" />
                </button>
              ))}
            </div>

            <button
              onClick={handleClearAllFilters}
              className="text-[10px] text-rose-400 hover:text-rose-300 font-bold hover:underline flex items-center gap-0.5 cursor-pointer ml-auto"
              title="Reset all filters to show all stocks"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>Clear All</span>
            </button>
          </div>
        )}

        {/* DISMISSED STOCKS BANNER: Allows restoring hidden stocks */}
        {dismissedSymbols.size > 0 && (
          <div className="bg-amber-950/40 border-b border-amber-800/50 px-3 py-1 flex items-center justify-between text-[10px] text-amber-300">
            <div className="flex items-center gap-1">
              <EyeOff className="w-3 h-3 text-amber-400" />
              <span>{dismissedSymbols.size} stock{dismissedSymbols.size > 1 ? 's' : ''} removed from popup ({Array.from(dismissedSymbols).join(', ')})</span>
            </div>
            <button
              onClick={handleRestoreDismissed}
              className="font-bold underline hover:text-yellow-200 cursor-pointer ml-2"
            >
              Restore All
            </button>
          </div>
        )}

        {/* RECENTLY HIT STOCKS STRIP: Quick horizontal selector under popunder */}
        {rallySignals.length > 0 && (
          <div className="bg-slate-950/95 border-b border-slate-800 px-3 py-1.5 flex items-center gap-2 overflow-x-auto no-scrollbar shadow-inner">
            <div className="flex items-center gap-1 text-[11px] font-mono font-black text-yellow-300 uppercase tracking-wider shrink-0">
              <Zap className="w-3.5 h-3.5 text-yellow-400 fill-current animate-pulse" />
              <span>RECENT HITS ({rallySignals.length}):</span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {rallySignals.slice(0, 10).map((sig, idx) => {
                const isAct = idx === currentIndex && !showAllList && !showAntiTrapGuide;
                const isSigBull = sig.direction === 'BULLISH';
                return (
                  <button
                    key={`rec_pill_${sig.symbol}_${idx}`}
                    onClick={() => {
                      setCurrentIndex(idx);
                      setSlideProgress(0);
                      setShowAllList(false);
                      setShowAntiTrapGuide(false);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold shrink-0 transition-all border flex items-center gap-1.5 cursor-pointer shadow-sm ${
                      isAct
                        ? (isSigBull 
                            ? 'bg-emerald-600 text-white border-emerald-300 font-black shadow-emerald-950/80 ring-2 ring-emerald-400/50 scale-105' 
                            : 'bg-rose-600 text-white border-rose-300 font-black shadow-rose-950/80 ring-2 ring-rose-400/50 scale-105')
                        : 'bg-slate-900/90 text-slate-300 border-slate-700/90 hover:border-slate-500 hover:text-white'
                    }`}
                    title={`View ${sig.symbol} • Last Hit: ${sig.rulePassedTime} (${sig.recencyMinutes === 0 ? 'Just now' : `${sig.recencyMinutes}m ago`})`}
                  >
                    <span className={isAct ? 'text-white' : (isSigBull ? 'text-emerald-400 font-black' : 'text-rose-400 font-black')}>
                      {sig.symbol}
                    </span>
                    <span className={isAct ? 'text-yellow-200' : 'text-slate-400'}>
                      {sig.pctChange >= 0 ? '+' : ''}{sig.pctChange.toFixed(1)}%
                    </span>
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
                      isAct 
                        ? 'bg-black/40 text-yellow-200' 
                        : (sig.isFresh ? 'bg-amber-950/80 text-yellow-300 border border-amber-500/40' : 'bg-slate-950 text-cyan-300 border border-slate-800')
                    }`}>
                      {sig.rulePassedTime}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* INTERACTIVE FILTER BAR: Click to add, click again to take off from selection */}
        {isFilterBarExpanded && (
          <div className="bg-slate-950/90 px-3 py-2 border-b border-slate-800 text-[10.5px] space-y-1.5">
            {/* Row 1: Direction & Major Presets */}
            <div className="flex items-center justify-between flex-wrap gap-1">
              <div className="flex items-center space-x-1 text-slate-300 flex-wrap gap-y-1">
                <span className="text-slate-400 font-medium shrink-0">Direction:</span>
                <button
                  onClick={() => setFilterDirection('ALL')}
                  className={`px-1.5 py-0.5 rounded font-semibold transition-all cursor-pointer ${
                    filterDirection === 'ALL' 
                      ? 'bg-slate-700 text-white shadow-sm' 
                      : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
                  }`}
                  title="Show all directions"
                >
                  All ({totalRawCount})
                </button>
                <button
                  onClick={() => handleDirectionClick('BULLISH_ONLY')}
                  className={`px-1.5 py-0.5 rounded font-semibold transition-all border cursor-pointer flex items-center gap-0.5 ${
                    filterDirection === 'BULLISH_ONLY'
                      ? 'bg-emerald-600 text-white border-emerald-400 font-bold shadow-sm'
                      : 'bg-slate-900/80 text-emerald-400 border-slate-700 hover:border-emerald-500/50'
                  }`}
                  title={filterDirection === 'BULLISH_ONLY' ? 'Click to remove filter (go off)' : 'Click to filter Bullish only'}
                >
                  <span>🟢 Bullish</span>
                  {filterDirection === 'BULLISH_ONLY' && <X className="w-2.5 h-2.5 ml-0.5" />}
                </button>
                <button
                  onClick={() => handleDirectionClick('BEARISH_ONLY')}
                  className={`px-1.5 py-0.5 rounded font-semibold transition-all border cursor-pointer flex items-center gap-0.5 ${
                    filterDirection === 'BEARISH_ONLY'
                      ? 'bg-rose-600 text-white border-rose-400 font-bold shadow-sm'
                      : 'bg-slate-900/80 text-rose-400 border-slate-700 hover:border-rose-500/50'
                  }`}
                  title={filterDirection === 'BEARISH_ONLY' ? 'Click to remove filter (go off)' : 'Click to filter Bearish only'}
                >
                  <span>🔴 Bearish</span>
                  {filterDirection === 'BEARISH_ONLY' && <X className="w-2.5 h-2.5 ml-0.5" />}
                </button>
                <button
                  onClick={() => handleDirectionClick('HUNDRED_BULLISH_ONLY')}
                  className={`px-1.5 py-0.5 rounded font-semibold transition-all border cursor-pointer flex items-center gap-0.5 ${
                    filterDirection === 'HUNDRED_BULLISH_ONLY'
                      ? 'bg-emerald-600 text-white border-emerald-400 font-bold shadow-sm'
                      : 'bg-slate-900/80 text-emerald-300 border-slate-700 hover:border-emerald-500/50'
                  }`}
                  title={filterDirection === 'HUNDRED_BULLISH_ONLY' ? 'Click to remove filter (go off)' : 'Click to filter 100% Bullish only'}
                >
                  <span>🟢 100% Bull</span>
                  {filterDirection === 'HUNDRED_BULLISH_ONLY' && <X className="w-2.5 h-2.5 ml-0.5" />}
                </button>
                <button
                  onClick={() => handleDirectionClick('HUNDRED_BEARISH_ONLY')}
                  className={`px-1.5 py-0.5 rounded font-semibold transition-all border cursor-pointer flex items-center gap-0.5 ${
                    filterDirection === 'HUNDRED_BEARISH_ONLY'
                      ? 'bg-rose-600 text-white border-rose-400 font-bold shadow-sm'
                      : 'bg-slate-900/80 text-rose-300 border-slate-700 hover:border-rose-500/50'
                  }`}
                  title={filterDirection === 'HUNDRED_BEARISH_ONLY' ? 'Click to remove filter (go off)' : 'Click to filter 100% Bearish only'}
                >
                  <span>🔴 100% Bear</span>
                  {filterDirection === 'HUNDRED_BEARISH_ONLY' && <X className="w-2.5 h-2.5 ml-0.5" />}
                </button>
              </div>

              {/* Recency & Anti-Trap Quick Switches */}
              <div className="flex items-center space-x-1 flex-wrap gap-y-1">
                {/* Fresh Hits Toggle */}
                <button
                  onClick={() => handleRecencyClick('FRESH_ONLY')}
                  className={`px-1.5 py-0.5 rounded font-semibold transition-all border cursor-pointer flex items-center gap-0.5 ${
                    recencyMode === 'FRESH_ONLY'
                      ? 'bg-cyan-600 text-white border-cyan-400 font-bold shadow-sm'
                      : 'bg-slate-900/80 text-cyan-300 border-slate-700 hover:border-cyan-500/50'
                  }`}
                  title={recencyMode === 'FRESH_ONLY' ? 'Click to remove filter (go off)' : 'Click to show only Fresh triggers (<30m)'}
                >
                  <Zap className="w-2.5 h-2.5 text-yellow-300 fill-current" />
                  <span>⚡ Fresh &lt;30m</span>
                  {recencyMode === 'FRESH_ONLY' && <X className="w-2.5 h-2.5 ml-0.5" />}
                </button>

                {/* Stood Bullish >30m Toggle */}
                <button
                  onClick={() => handleRecencyClick('SUSTAINED_ONLY')}
                  className={`px-1.5 py-0.5 rounded font-semibold transition-all border cursor-pointer flex items-center gap-0.5 ${
                    recencyMode === 'SUSTAINED_ONLY'
                      ? 'bg-emerald-600 text-white border-emerald-400 font-bold shadow-sm'
                      : 'bg-slate-900/80 text-emerald-300 border-slate-700 hover:border-emerald-500/50'
                  }`}
                  title={recencyMode === 'SUSTAINED_ONLY' ? 'Click to remove filter (go off)' : 'Click to show only stocks that stood firm (>30m)'}
                >
                  <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                  <span>🛡️ Stood &gt;30m</span>
                  {recencyMode === 'SUSTAINED_ONLY' && <X className="w-2.5 h-2.5 ml-0.5" />}
                </button>

                {/* Hide Yesterday Toggle */}
                <button
                  onClick={() => {
                    setHideYesterday((prev) => !prev);
                    setCurrentIndex(0);
                  }}
                  className={`px-1.5 py-0.5 rounded font-semibold transition-all border cursor-pointer flex items-center gap-0.5 ${
                    hideYesterday
                      ? 'bg-amber-600 text-white border-amber-400 font-bold shadow-sm'
                      : 'bg-slate-900/80 text-slate-400 border-slate-700 hover:border-slate-500'
                  }`}
                  title={hideYesterday ? 'Click to remove filter (go off)' : 'Click to exclude yesterday signals'}
                >
                  <span>{hideYesterday ? '🚫 No Yesterday' : '📅 All Dates'}</span>
                  {hideYesterday && <X className="w-2.5 h-2.5 ml-0.5" />}
                </button>

                {/* Safe Only (Anti-Trap) Toggle */}
                <button
                  onClick={() => {
                    setSafeOnly((prev) => !prev);
                    setCurrentIndex(0);
                  }}
                  className={`px-1.5 py-0.5 rounded font-semibold transition-all border cursor-pointer flex items-center gap-0.5 ${
                    safeOnly
                      ? 'bg-emerald-600 text-white border-emerald-400 font-bold shadow-sm'
                      : 'bg-slate-900/80 text-slate-400 border-slate-700 hover:border-emerald-500/50'
                  }`}
                  title={safeOnly ? 'Click to remove filter (go off)' : 'Click to filter out overextended trap setups'}
                >
                  <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                  <span>🛡️ Safe Only</span>
                  {safeOnly && <X className="w-2.5 h-2.5 ml-0.5" />}
                </button>
              </div>
            </div>

            {/* Row 2: Momentum & Volume Filters (Click to add / Click active to remove) */}
            <div className="flex items-center space-x-1.5 pt-1 border-t border-slate-800/80 flex-wrap gap-y-1">
              <span className="text-slate-400 shrink-0 font-medium">Momentum &amp; Vol:</span>
              
              {/* Good Volume Button */}
              <button
                onClick={() => {
                  setGoodVolumeOnly((prev) => !prev);
                  setCurrentIndex(0);
                }}
                className={`px-1.5 py-0.5 rounded font-semibold transition-all border cursor-pointer flex items-center gap-0.5 ${
                  goodVolumeOnly
                    ? 'bg-emerald-600 text-white border-emerald-400 font-bold shadow-sm'
                    : 'bg-slate-900/80 text-slate-400 border-slate-700 hover:border-emerald-500/50 hover:text-emerald-300'
                }`}
                title={goodVolumeOnly ? 'Click to remove filter (go off from selection)' : 'Click to require Good Volume (≥1.0x)'}
              >
                <span>📊 Good Volume</span>
                {goodVolumeOnly ? <X className="w-2.5 h-2.5 ml-0.5" /> : <Plus className="w-2.5 h-2.5 ml-0.5 opacity-50" />}
              </button>

              {/* Volume Increasing Button */}
              <button
                onClick={() => {
                  setVolumeIncreasingOnly((prev) => !prev);
                  setCurrentIndex(0);
                }}
                className={`px-1.5 py-0.5 rounded font-semibold transition-all border cursor-pointer flex items-center gap-0.5 ${
                  volumeIncreasingOnly
                    ? 'bg-teal-600 text-white border-teal-400 font-bold shadow-sm'
                    : 'bg-slate-900/80 text-slate-400 border-slate-700 hover:border-teal-500/50 hover:text-teal-300'
                }`}
                title={volumeIncreasingOnly ? 'Click to remove filter (go off from selection)' : 'Click to require Volume is Increasing'}
              >
                <span>📈 Vol ↗ Increasing</span>
                {volumeIncreasingOnly ? <X className="w-2.5 h-2.5 ml-0.5" /> : <Plus className="w-2.5 h-2.5 ml-0.5 opacity-50" />}
              </button>

              {/* RSI Increasing Button */}
              <button
                onClick={() => {
                  setRsiIncreasingOnly((prev) => !prev);
                  setCurrentIndex(0);
                }}
                className={`px-1.5 py-0.5 rounded font-semibold transition-all border cursor-pointer flex items-center gap-0.5 ${
                  rsiIncreasingOnly
                    ? 'bg-indigo-600 text-white border-indigo-400 font-bold shadow-sm'
                    : 'bg-slate-900/80 text-slate-400 border-slate-700 hover:border-indigo-500/50 hover:text-indigo-300'
                }`}
                title={rsiIncreasingOnly ? 'Click to remove filter (go off from selection)' : 'Click to require RSI is Increasing'}
              >
                <span>⚡ RSI ↗ Increasing</span>
                {rsiIncreasingOnly ? <X className="w-2.5 h-2.5 ml-0.5" /> : <Plus className="w-2.5 h-2.5 ml-0.5 opacity-50" />}
              </button>
            </div>

            {/* Row 3: Category Trigger Multi-Select Filters */}
            <div className="flex items-center space-x-1 pt-1 border-t border-slate-800/80 overflow-x-auto no-scrollbar pb-0.5 flex-wrap gap-y-1">
              <span className="text-slate-400 shrink-0 font-medium">Trigger Types:</span>
              
              <button
                onClick={() => toggleTriggerFilter('BREAKOUT')}
                className={`px-1.5 py-0.5 rounded font-semibold whitespace-nowrap cursor-pointer transition-all border flex items-center gap-0.5 ${
                  selectedTriggers.has('BREAKOUT')
                    ? 'bg-amber-500 text-slate-950 border-amber-300 font-bold shadow-sm'
                    : 'bg-slate-900/80 text-yellow-300 border-slate-700 hover:border-amber-400/50'
                }`}
                title={selectedTriggers.has('BREAKOUT') ? 'Click to remove Breakout filter (go off)' : 'Click to add Breakouts filter'}
              >
                <span>💥 Breakouts</span>
                {selectedTriggers.has('BREAKOUT') ? <X className="w-2.5 h-2.5 ml-0.5" /> : <Plus className="w-2.5 h-2.5 ml-0.5 opacity-50" />}
              </button>

              <button
                onClick={() => toggleTriggerFilter('PARABOLIC')}
                className={`px-1.5 py-0.5 rounded font-semibold whitespace-nowrap cursor-pointer transition-all border flex items-center gap-0.5 ${
                  selectedTriggers.has('PARABOLIC')
                    ? 'bg-purple-600 text-white border-purple-400 font-bold shadow-sm'
                    : 'bg-slate-900/80 text-purple-300 border-slate-700 hover:border-purple-400/50'
                }`}
                title={selectedTriggers.has('PARABOLIC') ? 'Click to remove Parabolic filter (go off)' : 'Click to add Parabolic Rally filter'}
              >
                <span>🚀 Parabolic</span>
                {selectedTriggers.has('PARABOLIC') ? <X className="w-2.5 h-2.5 ml-0.5" /> : <Plus className="w-2.5 h-2.5 ml-0.5 opacity-50" />}
              </button>

              <button
                onClick={() => toggleTriggerFilter('RALLY_STARTED')}
                className={`px-1.5 py-0.5 rounded font-semibold whitespace-nowrap cursor-pointer transition-all border flex items-center gap-0.5 ${
                  selectedTriggers.has('RALLY_STARTED')
                    ? 'bg-blue-600 text-white border-blue-400 font-bold shadow-sm'
                    : 'bg-slate-900/80 text-blue-300 border-slate-700 hover:border-blue-400/50'
                }`}
                title={selectedTriggers.has('RALLY_STARTED') ? 'Click to remove Rally Started filter (go off)' : 'Click to add Rally Started filter'}
              >
                <span>📈 Rally Started</span>
                {selectedTriggers.has('RALLY_STARTED') ? <X className="w-2.5 h-2.5 ml-0.5" /> : <Plus className="w-2.5 h-2.5 ml-0.5 opacity-50" />}
              </button>

              <button
                onClick={() => toggleTriggerFilter('100_PCT')}
                className={`px-1.5 py-0.5 rounded font-semibold whitespace-nowrap cursor-pointer transition-all border flex items-center gap-0.5 ${
                  selectedTriggers.has('100_PCT')
                    ? 'bg-teal-600 text-white border-teal-400 font-bold shadow-sm'
                    : 'bg-slate-900/80 text-teal-300 border-slate-700 hover:border-teal-400/50'
                }`}
                title={selectedTriggers.has('100_PCT') ? 'Click to remove 100% Target Moves filter (go off)' : 'Click to add 100% Target Moves filter'}
              >
                <span>🟢🔴 100% Moves</span>
                {selectedTriggers.has('100_PCT') ? <X className="w-2.5 h-2.5 ml-0.5" /> : <Plus className="w-2.5 h-2.5 ml-0.5 opacity-50" />}
              </button>

              <button
                onClick={() => toggleTriggerFilter('SUSTAINED_30M')}
                className={`px-1.5 py-0.5 rounded font-semibold whitespace-nowrap cursor-pointer transition-all border flex items-center gap-0.5 ${
                  selectedTriggers.has('SUSTAINED_30M')
                    ? 'bg-emerald-600 text-white border-emerald-400 font-bold shadow-sm'
                    : 'bg-slate-900/80 text-emerald-300 border-slate-700 hover:border-emerald-400/50'
                }`}
                title={selectedTriggers.has('SUSTAINED_30M') ? 'Click to remove Stood Still filter (go off)' : 'Click to add Stood Still >30m filter'}
              >
                <span>🏛️ Stood Still &gt;30m</span>
                {selectedTriggers.has('SUSTAINED_30M') ? <X className="w-2.5 h-2.5 ml-0.5" /> : <Plus className="w-2.5 h-2.5 ml-0.5 opacity-50" />}
              </button>
            </div>
          </div>
        )}

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
                className="text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded bg-slate-800 cursor-pointer"
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
              className="w-full py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow transition-colors cursor-pointer"
            >
              Got It — Back to Signals
            </button>
          </div>
        ) : showAllList ? (
          <div className="p-3.5 max-h-80 overflow-y-auto space-y-2 bg-slate-950/95">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300 pb-1 border-b border-slate-800">
              <span className="flex items-center gap-1.5">
                <span className="text-sm font-black text-white">Active Setups ({rallySignals.length}{totalRawCount > rallySignals.length ? ` of ${totalRawCount}` : ''})</span>
              </span>
              <span className="text-[11px] text-slate-400">Click stock to view, or ✕ to dismiss</span>
            </div>
            {rallySignals.map((signal, idx) => {
              const sigBull = signal.direction === 'BULLISH';
              const isSelected = idx === currentIndex;
              return (
                <div
                  key={`${signal.symbol}_${idx}`}
                  className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                    isSelected 
                      ? (sigBull ? 'bg-emerald-950/90 border-emerald-500 ring-2 ring-emerald-500/50 shadow-lg' : 'bg-rose-950/90 border-rose-500 ring-2 ring-rose-500/50 shadow-lg')
                      : 'bg-slate-900/80 border-slate-800 hover:bg-slate-800/90'
                  }`}
                >
                  <button
                    onClick={() => {
                      setCurrentIndex(idx);
                      setShowAllList(false);
                      setSlideProgress(0);
                    }}
                    className="flex-1 text-left flex items-center space-x-2.5 cursor-pointer"
                  >
                    {sigBull ? (
                      <Flame className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <div>
                      <div className="text-sm font-black text-white flex items-center gap-1.5 flex-wrap">
                        <span className="text-base tracking-tight">{signal.symbol}</span>
                        <span className="text-xs text-slate-300 font-semibold font-mono">₹{signal.currentPrice.toFixed(1)}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-mono font-black border ${signal.triggerColorClass}`}>
                          {signal.triggerBadge}
                        </span>
                        {idx === 0 ? (
                          <span className="bg-amber-400/20 text-yellow-300 border border-amber-400/50 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold flex items-center gap-0.5">
                            👑 #1
                          </span>
                        ) : (
                          <span className="bg-slate-800 text-slate-300 border border-slate-700 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold">
                            #{idx + 1}
                          </span>
                        )}
                        {signal.isSustainedHold ? (
                          <span className="bg-emerald-950/90 text-emerald-300 border border-emerald-500/60 px-1.5 py-0.2 rounded text-[9px] font-mono font-black flex items-center gap-0.5 shadow-sm">
                            <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                            STOOD &gt;30M
                          </span>
                        ) : signal.isFresh ? (
                          <span className="bg-amber-400/20 text-yellow-300 border border-amber-400/40 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold flex items-center gap-0.5">
                            <Zap className="w-2.5 h-2.5 fill-current" />
                            FRESH
                          </span>
                        ) : null}
                      </div>
                      <div className="text-xs text-slate-300 truncate max-w-[240px] flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="font-medium">{signal.rallyType}</span>
                        {signal.volumeRatio && (
                          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                            signal.isGoodVolume ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50' : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}>
                            📊 {signal.volumeRatio.toFixed(1)}x{signal.isVolumeIncreasing ? ' ↗' : ''}
                          </span>
                        )}
                        {signal.rsi && (
                          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                            signal.isRsiIncreasing ? 'bg-indigo-950/80 text-indigo-300 border-indigo-500/50' : 'bg-slate-800 text-blue-300 border-slate-700'
                          }`}>
                            ⚡ RSI {signal.rsi.toFixed(0)}{signal.isRsiIncreasing ? ' ↗' : ''}
                          </span>
                        )}
                        {signal.parabolicScore && (
                          <span className="text-[10px] text-teal-300 font-mono font-bold">
                            • Parabolic {signal.parabolicScore}/16
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-cyan-300 font-mono font-bold mt-1 flex items-center gap-1.5 bg-slate-950/80 px-2 py-0.5 rounded border border-cyan-500/30 w-fit">
                        <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>LAST HIT: <strong className="text-white font-mono">{signal.rulePassedTime}</strong> {signal.isMarketHours && `(${signal.recencyMinutes === 0 ? 'Just now' : `${signal.recencyMinutes}m ago`}${signal.isSustainedHold ? ' • Stood Firm' : ''})`}</span>
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center space-x-2 pl-2">
                    <div className="text-right">
                      <div className={`text-base font-black font-mono ${sigBull ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {signal.pctChange >= 0 ? '+' : ''}{signal.pctChange.toFixed(2)}%
                      </div>
                      <div className="text-[10px] font-mono text-amber-300 font-bold">
                        {signal.confidenceScore}% Accuracy
                      </div>
                    </div>

                    {/* Stock Dismiss Button */}
                    <button
                      onClick={(e) => handleDismissStock(signal.symbol, e)}
                      className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-900/80 text-slate-400 hover:text-rose-200 border border-slate-700 transition-colors cursor-pointer"
                      title={`Remove ${signal.symbol} from popunder selection`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : !currentRally || !plan ? (
          /* Empty State when no signals are currently detected */
          <div className="p-6 space-y-3 text-center bg-slate-950/80">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-700/80 flex items-center justify-center mx-auto text-amber-400 shadow-inner">
              <Filter className="w-6 h-6" />
            </div>

            <div>
              <h4 className="text-sm font-black text-slate-100 uppercase tracking-wide">
                No Signals Match Active Selection
              </h4>
              <p className="text-[11.5px] text-slate-400 mt-1 leading-relaxed max-w-sm mx-auto">
                0 stocks match your current filter selection. Click active filter pills to remove them or reset all.
              </p>
            </div>

            <div className="pt-2 flex justify-center">
              <button
                onClick={handleClearAllFilters}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Show All Signals ({totalRawCount})</span>
              </button>
            </div>
          </div>
        ) : (
          /* Content Body of Selected Rotating Stock (Clean, High Contrast, Big Fonts) */
          <div className="p-4 space-y-3.5 transition-all duration-300">
            
            {/* Main Headline & Ticker Info with BIG FONTS */}
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  {/* Badges Row */}
                  <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                    <span className={`text-[10.5px] font-black uppercase px-2 py-0.5 rounded-md font-mono border shadow-sm flex items-center gap-1 ${currentRally.triggerColorClass}`}>
                      {currentRally.triggerBadge}
                    </span>

                    {currentIndex === 0 ? (
                      <span className="bg-amber-400/20 text-yellow-300 border border-amber-400/50 text-[10.5px] font-black uppercase px-2 py-0.5 rounded font-mono flex items-center gap-1 shadow-sm">
                        👑 #1 TOP PICK
                      </span>
                    ) : (
                      <span className="bg-slate-800/90 text-slate-200 border border-slate-700 text-[10.5px] font-black uppercase px-2 py-0.5 rounded font-mono flex items-center gap-1">
                        ⭐ #{currentIndex + 1}
                      </span>
                    )}

                    {currentRally.isSustainedHold && (
                      <span className="bg-emerald-950/90 text-emerald-300 border border-emerald-500/70 text-[10.5px] px-2 py-0.5 rounded font-mono font-black flex items-center gap-1 shadow-sm">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        🛡️ Stood &gt;30m ({currentRally.sustainedDurationMinutes}m)
                      </span>
                    )}

                    <span className={`text-xs px-2.5 py-1 rounded-lg font-mono font-black flex items-center gap-1.5 border shadow-sm ${
                      currentRally.isFresh
                        ? 'bg-amber-950/90 text-yellow-300 border-amber-500/70 animate-pulse'
                        : currentRally.isSustainedHold
                        ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/70'
                        : 'bg-slate-900/90 text-cyan-300 border-cyan-500/50'
                    }`}>
                      {currentRally.isFresh ? <Zap className="w-3.5 h-3.5 text-yellow-300 fill-current" /> : <Clock className="w-3.5 h-3.5 text-cyan-400" />}
                      <span>LAST HIT: {currentRally.rulePassedTime}</span>
                      {currentRally.isMarketHours && (
                        <span className="text-[11px] text-slate-300 font-sans font-medium ml-0.5">
                          ({currentRally.recencyMinutes === 0 ? 'Just now' : `${currentRally.recencyMinutes}m ago`})
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Stock Symbol - LARGE & PROMINENT */}
                  <div className="pt-0.5">
                    <h3 className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white flex items-center gap-2">
                      <span>{currentRally.symbol}</span>
                    </h3>
                    <p className="text-xs text-slate-300 font-medium truncate max-w-[240px] mt-0.5">
                      {currentRally.companyName}
                    </p>
                  </div>
                </div>

                {/* % Change & CMP Badge - LARGE & BOLD + Stock Dismiss Button */}
                <div className="text-right shrink-0 flex flex-col items-end">
                  <div className="flex items-center gap-1.5">
                    <div className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight">
                      ₹{currentRally.currentPrice.toFixed(2)}
                    </div>
                    {/* Stock Dismiss button */}
                    <button
                      onClick={(e) => handleDismissStock(currentRally.symbol, e)}
                      className="p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                      title={`Remove ${currentRally.symbol} from popunder selection`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className={`text-sm font-black font-mono px-2.5 py-0.5 rounded-lg border mt-1 shadow-sm ${
                    isBull 
                      ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/80' 
                      : 'bg-rose-950/90 text-rose-300 border-rose-500/80'
                  }`}>
                    {isGainPositive ? '+' : ''}{pct.toFixed(2)}%
                  </div>
                </div>
              </div>

              {/* Exact Last Hit Timing Banner - LARGE, READABLE & HIGH CONTRAST */}
              <div className="mt-3 bg-slate-950/95 border-2 border-cyan-500/50 rounded-xl p-3 flex items-center justify-between shadow-lg">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-cyan-950/90 border border-cyan-400/60 text-cyan-300 shadow-inner">
                    <Clock className="w-5 h-5 text-cyan-300 animate-pulse" />
                  </div>
                  <div>
                    <div className="text-[11px] font-sans font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <span>⚡ LAST HIT TIMING</span>
                      {currentRally.isSustainedHold && (
                        <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-500/40">
                          Held Firm &gt;30m
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-base sm:text-xl font-black font-mono text-cyan-200 tracking-tight">
                        {currentRally.rulePassedTime}
                      </span>
                      <span className={`text-xs sm:text-sm font-mono font-black px-2.5 py-0.5 rounded-lg border shadow-sm ${
                        currentRally.recencyMinutes <= 30
                          ? 'bg-amber-950/90 text-yellow-300 border-amber-400/80 animate-pulse'
                          : 'bg-slate-800/90 text-slate-200 border-slate-700'
                      }`}>
                        {currentRally.recencyMinutes === 0 ? '⚡ Just Now (Fresh Hit)' : `⚡ ${currentRally.recencyMinutes}m ago`}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-[10px] font-sans font-bold uppercase tracking-wider text-slate-400">
                    Trigger Type
                  </div>
                  <div className="text-xs sm:text-sm font-black font-mono text-white mt-0.5 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700">
                    {currentRally.rallyType}
                  </div>
                </div>
              </div>
            </div>

            {/* Actionable High-Profit Trade Plan Box (BIG CLEAR FONTS) */}
            <div className={`p-3 rounded-xl border ${
              isBull 
                ? 'bg-emerald-950/40 border-emerald-500/40' 
                : 'bg-rose-950/40 border-rose-500/40'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-1.5">
                  <Target className={`w-4 h-4 ${isBull ? 'text-emerald-400' : 'text-rose-400'}`} />
                  <span className="text-xs font-black uppercase tracking-wide text-white">
                    {plan.action} Setup Plan
                  </span>
                </div>
                <div className="text-xs font-mono font-black text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded-md border border-amber-500/40">
                  R:R {plan.riskRewardRatio}
                </div>
              </div>

              {/* Grid of Entry, SL, T1, T2 with BIG READABLE NUMBERS */}
              <div className="grid grid-cols-4 gap-2 text-center mt-1.5">
                <div className="bg-slate-900/95 p-2 rounded-xl border border-slate-800 shadow-sm">
                  <div className="text-slate-400 text-[10px] font-sans font-bold uppercase tracking-wider">Trigger</div>
                  <div className="text-sm sm:text-base font-black font-mono text-white mt-0.5">₹{plan.entryTrigger.toFixed(1)}</div>
                </div>

                <div className="bg-slate-900/95 p-2 rounded-xl border border-slate-800 shadow-sm">
                  <div className="text-rose-400 text-[10px] font-sans font-bold uppercase tracking-wider">Stop Loss</div>
                  <div className="text-sm sm:text-base font-black font-mono text-rose-400 mt-0.5">₹{plan.stopLoss.toFixed(1)}</div>
                </div>

                <div className="bg-slate-900/95 p-2 rounded-xl border border-slate-800 shadow-sm">
                  <div className="text-emerald-400 text-[10px] font-sans font-bold uppercase tracking-wider">Target 1</div>
                  <div className="text-sm sm:text-base font-black font-mono text-emerald-400 mt-0.5">₹{plan.target1.toFixed(1)}</div>
                </div>

                <div className="bg-slate-900/95 p-2 rounded-xl border border-slate-800 shadow-sm">
                  <div className="text-teal-300 text-[10px] font-sans font-bold uppercase tracking-wider">Target 2</div>
                  <div className="text-sm sm:text-base font-black font-mono text-teal-300 mt-0.5">₹{plan.target2.toFixed(1)}</div>
                </div>
              </div>

              {/* Option Strike Callout with BIG READABLE STRIKE */}
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectStockDetail(currentRally.stock);
                }}
                className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs cursor-pointer hover:bg-white/5 px-2 py-1 rounded-lg transition-colors"
                title="Click to view full Options Strike Analysis & Gann levels"
              >
                <div className="flex items-center space-x-1.5">
                  <Zap className="w-4 h-4 text-yellow-400 shrink-0" />
                  <span className="font-sans text-slate-300 text-xs font-semibold">Recommended Option:</span>
                  <span className="font-mono font-black text-yellow-300 text-xs sm:text-sm bg-yellow-950/90 px-2 py-0.5 rounded-md border border-yellow-500/50 shadow-sm">
                    {plan.recommendedOptionStrike}
                  </span>
                </div>
                <div className="text-xs font-mono text-slate-200">
                  LTP ~<span className="text-white font-bold">₹{plan.optionEntryEst.toFixed(1)}</span> (T1: <span className="text-emerald-400 font-bold">₹{plan.optionTarget1.toFixed(1)}</span>)
                </div>
              </div>
            </div>

            {/* Anti-Trap Execution & Invalidation Rules (Clean, Big Fonts, No clutter) */}
            <div className={`p-3 rounded-xl border space-y-2 ${
              currentRally.trapRiskLevel === 'SAFE'
                ? 'bg-slate-900/90 border-emerald-500/40'
                : currentRally.trapRiskLevel === 'MODERATE'
                ? 'bg-amber-950/40 border-amber-500/40'
                : 'bg-rose-950/40 border-rose-500/50'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 font-bold">
                  <ShieldCheck className={`w-4 h-4 ${
                    currentRally.trapRiskLevel === 'SAFE' ? 'text-emerald-400' : currentRally.trapRiskLevel === 'MODERATE' ? 'text-amber-400' : 'text-rose-400'
                  }`} />
                  <span className="uppercase text-[11px] tracking-wider text-slate-200">
                    Anti-Trap Guard:
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10.5px] font-mono font-black ${
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
                  className="text-[10.5px] text-amber-300 hover:underline cursor-pointer flex items-center gap-0.5 font-bold"
                >
                  <Info className="w-3 h-3" />
                  <span>Rules</span>
                </button>
              </div>

              {/* Strict Entry Confirmation Trigger */}
              <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800 space-y-1.5">
                <div className="text-slate-300 flex items-start gap-1.5 text-xs">
                  <span className="text-emerald-400 font-bold shrink-0">🎯 Entry Trigger:</span>
                  <span className="font-mono text-white font-medium">{currentRally.entryConfirmation}</span>
                </div>
                <div className="text-slate-300 flex items-start gap-1.5 border-t border-slate-800/80 pt-1.5 text-xs">
                  <span className="text-rose-400 font-bold shrink-0">🛑 Invalidation SL:</span>
                  <span className="font-mono text-rose-300 font-medium">{currentRally.invalidationRule}</span>
                </div>
              </div>
            </div>

            {/* Quick Technical Badges (Volume Ratio, RSI Trend, VWAP, 15m Range) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono">
              {/* Volume Ratio & Momentum */}
              <div className={`p-2 rounded-xl border ${
                currentRally.isGoodVolume 
                  ? 'bg-emerald-950/60 border-emerald-500/50 shadow-sm' 
                  : 'bg-slate-900/90 border-slate-800'
              }`}>
                <div className="text-slate-400 text-[10px] font-sans font-semibold flex items-center justify-center gap-1">
                  <span>📊 Volume</span>
                  {currentRally.isVolumeIncreasing && (
                    <span className="text-[9px] text-teal-300 font-bold">↗ Inc</span>
                  )}
                </div>
                <div className={`font-black text-sm mt-0.5 ${currentRally.isGoodVolume ? 'text-emerald-300' : 'text-slate-300'}`}>
                  {(currentRally.volumeRatio ?? 1.2).toFixed(2)}x
                </div>
                <div className="text-[9px] text-slate-400 font-sans truncate">
                  {currentRally.volumeTrendLabel || (currentRally.isGoodVolume ? 'Good Vol' : 'Avg Vol')}
                </div>
              </div>

              {/* RSI (14) & Momentum */}
              <div className={`p-2 rounded-xl border ${
                currentRally.isRsiIncreasing
                  ? 'bg-indigo-950/60 border-indigo-500/50 shadow-sm'
                  : 'bg-slate-900/90 border-slate-800'
              }`}>
                <div className="text-slate-400 text-[10px] font-sans font-semibold flex items-center justify-center gap-1">
                  <span>⚡ RSI (14)</span>
                  {currentRally.isRsiIncreasing && (
                    <span className="text-[9px] text-indigo-300 font-bold">↗ Inc</span>
                  )}
                </div>
                <div className={`font-black text-sm mt-0.5 ${currentRally.isRsiIncreasing ? 'text-indigo-300' : 'text-blue-300'}`}>
                  {(currentRally.rsi ?? 55).toFixed(1)}
                </div>
                <div className="text-[9px] text-slate-400 font-sans truncate">
                  {currentRally.rsiTrendLabel || (currentRally.isRsiIncreasing ? 'RSI ↗ Inc' : 'RSI Flat')}
                </div>
              </div>

              {/* VWAP */}
              {currentRally.vwap !== undefined && currentRally.vwap !== null ? (
                <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                  <div className="text-slate-400 text-[10px] font-sans font-semibold">VWAP</div>
                  <div className="font-black text-sm text-purple-300 mt-0.5">₹{currentRally.vwap.toFixed(1)}</div>
                  <div className="text-[9px] text-slate-400 font-sans truncate">
                    {currentRally.currentPrice >= currentRally.vwap ? 'Above VWAP' : 'Below VWAP'}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                  <div className="text-slate-400 text-[10px] font-sans font-semibold">VWAP</div>
                  <div className="font-black text-sm text-purple-300 mt-0.5">₹{currentRally.currentPrice.toFixed(1)}</div>
                  <div className="text-[9px] text-slate-400 font-sans truncate">Live Base</div>
                </div>
              )}

              {/* 15m High / Low */}
              {currentRally.first15mHigh !== undefined && currentRally.first15mHigh !== null && isBull ? (
                <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                  <div className="text-slate-400 text-[10px] font-sans font-semibold">15m High</div>
                  <div className="font-black text-sm text-emerald-400 mt-0.5">₹{currentRally.first15mHigh.toFixed(1)}</div>
                  <div className="text-[9px] text-emerald-400 font-sans truncate">Breakout Level</div>
                </div>
              ) : currentRally.first15mLow !== undefined && currentRally.first15mLow !== null && !isBull ? (
                <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                  <div className="text-slate-400 text-[10px] font-sans font-semibold">15m Low</div>
                  <div className="font-black text-sm text-rose-400 mt-0.5">₹{currentRally.first15mLow.toFixed(1)}</div>
                  <div className="text-[9px] text-rose-400 font-sans truncate">Breakdown Level</div>
                </div>
              ) : (
                <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                  <div className="text-slate-400 text-[10px] font-sans font-semibold">Confidence</div>
                  <div className="font-black text-sm text-amber-300 mt-0.5">{currentRally.confidenceScore}%</div>
                  <div className="text-[9px] text-slate-400 font-sans truncate">Gann Match</div>
                </div>
              )}
            </div>

            {/* Navigation Slider Bar with Auto-Rotate Status & Dot Pills */}
            {rallySignals.length > 1 && (
              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <button
                    onClick={handlePrevSlide}
                    className="px-2 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg flex items-center gap-1 transition-colors cursor-pointer text-xs font-bold"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Prev</span>
                  </button>

                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-white font-bold font-mono">
                      Stock {currentIndex + 1} of {rallySignals.length}
                    </span>
                    {isAutoRotating && (
                      <span className="text-[10px] text-yellow-300 bg-yellow-950/70 px-1.5 py-0.5 rounded border border-yellow-500/30 font-medium">
                        Auto-Rotating (5s)
                      </span>
                    )}
                  </div>

                  <button
                    onClick={handleNextSlide}
                    className="px-2 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg flex items-center gap-1 transition-colors cursor-pointer text-xs font-bold"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Dot / Pill Indicators for rapid navigation */}
                <div className="flex items-center justify-center space-x-1.5">
                  {rallySignals.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setCurrentIndex(i);
                        setSlideProgress(0);
                      }}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        i === currentIndex 
                          ? (isBull ? 'w-6 bg-emerald-400' : 'w-6 bg-rose-400') 
                          : 'w-2 bg-slate-700 hover:bg-slate-500'
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
                className={`flex-1 font-black text-sm py-2.5 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer text-white hover:scale-[1.01] ${
                  isBull 
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/60' 
                    : 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/60'
                }`}
              >
                <ExternalLink className="w-4 h-4" />
                <span>View Full Chart &amp; Gann Levels</span>
              </button>

              {onOpenPositionSizer && (
                <button
                  onClick={() => onOpenPositionSizer(currentRally.stock)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-2.5 rounded-xl border border-slate-700 transition-colors shadow-md cursor-pointer"
                  title="Open Position Sizer & Risk Calculator"
                >
                  <Calculator className="w-5 h-5 text-emerald-400" />
                </button>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
