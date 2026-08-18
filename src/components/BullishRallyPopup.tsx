import React, { useState, useEffect, useRef } from 'react';
import { 
  Flame, 
  TrendingUp, 
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
  Zap
} from 'lucide-react';
import { StockCalculated } from '../types';
import { BullishRallySignal, getAllBullishRallyStocks, playBullishRallySound } from '../utils/bullishRally';

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
  const [rallySignals, setRallySignals] = useState<BullishRallySignal[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('bullish_rally_sound_enabled') !== 'false';
  });

  const previousRallySymbolsRef = useRef<Set<string>>(new Set());

  // Scan stocks whenever stocks change (e.g., after 5-minute auto-fetch or manual fetch)
  useEffect(() => {
    const detected = getAllBullishRallyStocks(stocks);
    setRallySignals(detected);

    if (detected.length > 0) {
      // Check if there's any newly detected stock in this fetch cycle
      const currentSymbols = new Set(detected.map((d) => d.symbol));
      let hasNewRally = false;
      for (const sym of currentSymbols) {
        if (!previousRallySymbolsRef.current.has(sym)) {
          hasNewRally = true;
          break;
        }
      }

      if (hasNewRally) {
        setIsOpen(true);
        setIsMinimized(false);
        if (soundEnabled) {
          playBullishRallySound();
        }
      }

      previousRallySymbolsRef.current = currentSymbols;
    }

    // Keep currentIndex in bounds
    if (currentIndex >= detected.length) {
      setCurrentIndex(Math.max(0, detected.length - 1));
    }
  }, [stocks, soundEnabled]);

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('bullish_rally_sound_enabled', String(next));
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

  const pct = currentRally.pctChange;
  const isGainPositive = pct >= 0;

  // Render Minimized Popunder Pill
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-40 animate-bounce">
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center space-x-2.5 px-4 py-2.5 bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 border-2 border-emerald-500/80 rounded-2xl shadow-2xl text-white hover:scale-105 transition-all cursor-pointer ring-2 ring-emerald-500/30"
          title="Click to expand Bullish Rally Alert"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <Flame className="w-4 h-4 text-yellow-300 fill-current" />
          <div className="text-left">
            <div className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
              <span>Bullish Rally: {currentRally.symbol}</span>
              <span className="bg-emerald-500/30 text-white px-1.5 py-0.2 rounded text-[10px]">
                {isGainPositive ? '+' : ''}{pct.toFixed(2)}%
              </span>
            </div>
            {rallySignals.length > 1 && (
              <div className="text-[10px] text-slate-300 font-medium">
                +{rallySignals.length - 1} more stocks rallying
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
    <div className="fixed bottom-4 right-4 z-40 w-96 max-w-[calc(100vw-2rem)] animate-slide-up">
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/95 border-2 border-emerald-500/80 rounded-2xl shadow-2xl overflow-hidden ring-4 ring-emerald-500/20 backdrop-blur-md text-white">
        
        {/* Top Header Bar */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 px-3.5 py-2 flex items-center justify-between shadow-md">
          <div className="flex items-center space-x-2">
            <Flame className="w-4 h-4 text-yellow-300 fill-current animate-bounce" />
            <span className="text-xs font-black tracking-wider uppercase text-white flex items-center gap-1.5">
              Bullish Rally Detected!
              <span className="bg-black/30 text-yellow-200 text-[10px] px-2 py-0.2 rounded-full font-bold">
                {currentRally.confidenceScore}% Conviction
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

        {/* Content Body */}
        <div className="p-4 space-y-3">
          
          {/* Main Headline */}
          <div>
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="text-sm font-extrabold text-emerald-300 leading-tight">
                  Bullish rally is going on with <span className="text-white underline decoration-emerald-400 decoration-2 font-black">{currentRally.symbol}</span>!
                </h4>
                <p className="text-[11px] text-slate-300 truncate max-w-[210px] mt-0.5">
                  {currentRally.companyName}
                </p>
              </div>

              {/* % Change & CMP Badge */}
              <div className="text-right shrink-0">
                <div className="text-sm font-black font-mono text-white">
                  ₹{currentRally.currentPrice.toFixed(2)}
                </div>
                <div className="text-xs font-black text-emerald-400 font-mono bg-emerald-950/90 px-2 py-0.5 rounded-md border border-emerald-600/70 inline-block">
                  +{pct.toFixed(2)}%
                </div>
              </div>
            </div>
          </div>

          {/* Pattern Type Pill & Time */}
          <div className="flex items-center justify-between text-xs bg-slate-900/90 border border-slate-800 p-2 rounded-xl">
            <div className="flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
              <span className="font-bold text-emerald-300 text-[11px]">
                {currentRally.rallyType}
              </span>
            </div>

            <div className="flex items-center space-x-1 text-slate-400 text-[10px] font-mono">
              <Clock className="w-3 h-3 text-amber-400" />
              <span>{currentRally.timestamp}</span>
            </div>
          </div>

          {/* Reason Explanation */}
          <p className="text-xs text-slate-300 leading-relaxed bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-500/20 text-[11px]">
            {currentRally.reason}
          </p>

          {/* Key Technical Badges */}
          <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] font-mono">
            {currentRally.buyAbove && (
              <div className="bg-slate-900/80 p-1.5 rounded-lg border border-slate-800">
                <div className="text-slate-400 font-sans">Buy Above</div>
                <div className="font-bold text-emerald-400">₹{currentRally.buyAbove.toFixed(1)}</div>
              </div>
            )}

            {currentRally.rsi !== undefined && currentRally.rsi !== null && (
              <div className="bg-slate-900/80 p-1.5 rounded-lg border border-slate-800">
                <div className="text-slate-400 font-sans">RSI (14)</div>
                <div className="font-bold text-blue-300">{currentRally.rsi.toFixed(1)}</div>
              </div>
            )}

            {currentRally.vwap !== undefined && currentRally.vwap !== null && (
              <div className="bg-slate-900/80 p-1.5 rounded-lg border border-slate-800">
                <div className="text-slate-400 font-sans">VWAP</div>
                <div className="font-bold text-purple-300">₹{currentRally.vwap.toFixed(1)}</div>
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
                <span>Prev</span>
              </button>

              <span className="text-[11px] text-slate-400 font-semibold font-mono">
                {currentIndex + 1} of {rallySignals.length} Rallying Stocks
              </span>

              <button
                onClick={() => setCurrentIndex((prev) => (prev < rallySignals.length - 1 ? prev + 1 : 0))}
                className="p-1 text-slate-400 hover:text-white flex items-center gap-0.5 transition-colors cursor-pointer text-[11px]"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 pt-1">
            <button
              onClick={() => onSelectStockDetail(currentRally.stock)}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs py-2 px-3 rounded-xl shadow-md transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>View Stock Details</span>
            </button>

            {onOpenPositionSizer && (
              <button
                onClick={() => onOpenPositionSizer(currentRally.stock)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-2 rounded-xl border border-slate-700 transition-colors"
                title="Open Position Sizer"
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
