import React, { useState, useEffect, useRef } from 'react';
import { 
  UserTrackedTrade, 
  StockJourneyTimelineConfig, 
  StockJourneyData,
  StockCalculated 
} from '../types';
import { 
  generateStock5MinJourney, 
  getStoredJourneyConfigs, 
  saveStoredJourneyConfig 
} from '../utils/capitalJourneyAdvisor';
import { 
  Clock, 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  Volume2, 
  VolumeX, 
  Bot, 
  Heart, 
  Activity, 
  BarChart2, 
  Shield, 
  Target, 
  Layers, 
  Sparkles, 
  X, 
  Check, 
  Table, 
  Sliders, 
  Zap 
} from 'lucide-react';

interface StockJourneyTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  trade: UserTrackedTrade | null;
  matchingStock?: StockCalculated;
  onSpeakText?: (text: string) => void;
  isSpeaking?: boolean;
}

export const StockJourneyTimelineModal: React.FC<StockJourneyTimelineModalProps> = ({
  isOpen,
  onClose,
  trade,
  matchingStock,
  onSpeakText,
  isSpeaking = false
}) => {
  if (!isOpen || !trade) return null;

  // Load existing config for this trade or create default
  const [config, setConfig] = useState<StockJourneyTimelineConfig>(() => {
    const saved = getStoredJourneyConfigs();
    if (saved[trade.id]) {
      return saved[trade.id];
    }
    return {
      tradeId: trade.id,
      symbol: trade.symbol,
      isEnabled: true,
      timelineStartTime: trade.entryTime || '09:15',
      timelineIntervalMinutes: 5,
      autoIterateEnabled: false,
      lastSimulatedStepIndex: 0
    };
  });

  const [activeStepIndex, setActiveStepIndex] = useState<number>(() => config.lastSimulatedStepIndex || 0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'interactive' | 'table'>('interactive');
  const [startTimeInput, setStartTimeInput] = useState<string>(config.timelineStartTime);

  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Generate 5-minute journey data
  const journeyData: StockJourneyData = generateStock5MinJourney(trade, {
    ...config,
    lastSimulatedStepIndex: activeStepIndex
  }, matchingStock ? new Map([[trade.symbol.toUpperCase(), matchingStock]]) : undefined);

  const activeStep = journeyData.steps[activeStepIndex] || journeyData.steps[0];

  // Auto playback effect
  useEffect(() => {
    if (isPlaying) {
      playbackTimerRef.current = setInterval(() => {
        setActiveStepIndex((prev) => {
          if (prev >= journeyData.steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 2500); // Advance step every 2.5 seconds during auto-iterate
    } else {
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current);
      }
    }
    return () => {
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current);
      }
    };
  }, [isPlaying, journeyData.steps.length]);

  const handleToggleEnable = () => {
    const updated = {
      ...config,
      isEnabled: !config.isEnabled
    };
    setConfig(updated);
    saveStoredJourneyConfig(updated);
  };

  const handleApplyStartTime = (newTime: string) => {
    const updated = {
      ...config,
      timelineStartTime: newTime,
      lastSimulatedStepIndex: 0
    };
    setConfig(updated);
    setStartTimeInput(newTime);
    setActiveStepIndex(0);
    saveStoredJourneyConfig(updated);
  };

  const handleStepChange = (index: number) => {
    const safeIdx = Math.max(0, Math.min(journeyData.steps.length - 1, index));
    setActiveStepIndex(safeIdx);
    const updated = {
      ...config,
      lastSimulatedStepIndex: safeIdx
    };
    setConfig(updated);
    saveStoredJourneyConfig(updated);
  };

  const handleSpeakCurrentStep = () => {
    if (!onSpeakText || !activeStep) return;
    const textToSpeak = `At ${activeStep.timeStr}, price is ₹${activeStep.price.toFixed(2)}. ${activeStep.friendGuidanceMessage} Recommended action: ${activeStep.actionCallout}`;
    onSpeakText(textToSpeak);
  };

  const timePresets = ['09:15', '09:30', '10:00', '11:30', '01:15', '02:30'];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shrink-0 mt-0.5">
              <Clock className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
                  <span>{trade.symbol}</span>
                  <span className="text-xs text-blue-300 font-bold px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/30">
                    5-Minute Journey Timeline
                  </span>
                </h2>
                {trade.instrumentType !== 'EQUITY' && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-slate-200">
                    {trade.instrumentType} {trade.strikePrice ? `₹${trade.strikePrice}` : ''}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1 font-medium leading-relaxed">
                Step-by-step 5-minute journey simulation showing exact RSI, Volume, Averaging triggers, and friend guidance at each time interval.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Configuration Bar: Enable/Disable & Timeline Start Time */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4 flex-wrap">
          {/* Enable / Disable Switch */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={config.isEnabled}
                onChange={handleToggleEnable}
                className="sr-only"
              />
              <div className={`w-11 h-6 rounded-full transition-colors p-0.5 ${config.isEnabled ? 'bg-emerald-600' : 'bg-slate-300'}`}>
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${config.isEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
              <span className="text-xs font-black text-slate-800">
                {config.isEnabled ? '🟢 5-Min Iteration: ENABLED' : '⚪ 5-Min Iteration: DISABLED'}
              </span>
            </label>
          </div>

          {/* Start Time Selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>Journey Start Time:</span>
            </span>
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={startTimeInput}
                onChange={(e) => setStartTimeInput(e.target.value)}
                placeholder="09:15"
                className="w-20 px-2.5 py-1 text-xs font-mono font-bold border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => handleApplyStartTime(startTimeInput)}
                className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
              >
                Set
              </button>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1 hidden sm:flex">
              {timePresets.map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() => handleApplyStartTime(time)}
                  className={`px-2 py-0.5 rounded text-[10.5px] font-mono font-bold cursor-pointer transition-colors ${
                    config.timelineStartTime === time
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('interactive')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer ${
                viewMode === 'interactive' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Sliders className="w-3 h-3" />
              <span>Interactive Player</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer ${
                viewMode === 'table' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Table className="w-3 h-3" />
              <span>Full Step Table</span>
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto">

          {viewMode === 'interactive' ? (
            <>
              {/* 1. Timeline Player & Controls Bar */}
              <div className="bg-slate-900 text-white p-4 rounded-3xl shadow-md space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-blue-300 uppercase tracking-wide">
                      ⏱️ 5-Minute Time Machine
                    </span>
                    <span className="text-xs font-mono bg-white/10 px-2 py-0.5 rounded-md text-slate-200">
                      Step {activeStepIndex + 1} of {journeyData.steps.length} (+{activeStep.minutesElapsed} mins)
                    </span>
                  </div>

                  {/* Playback Buttons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleStepChange(0)}
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 transition-colors cursor-pointer"
                      title="Reset to Start Time"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleStepChange(activeStepIndex - 1)}
                      disabled={activeStepIndex === 0}
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 disabled:opacity-30 transition-colors cursor-pointer"
                      title="Previous 5-Minute Interval"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className={`px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-transform active:scale-95 ${
                        isPlaying ? 'bg-amber-500 hover:bg-amber-600 text-black' : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950'
                      }`}
                    >
                      {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                      <span>{isPlaying ? 'Pause' : 'Auto-Iterate 5m'}</span>
                    </button>

                    <button
                      onClick={() => handleStepChange(activeStepIndex + 1)}
                      disabled={activeStepIndex === journeyData.steps.length - 1}
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 disabled:opacity-30 transition-colors cursor-pointer"
                      title="Next 5-Minute Interval"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>

                    {/* Speech Synthesis Voice Playback */}
                    {onSpeakText && (
                      <button
                        onClick={handleSpeakCurrentStep}
                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-transform active:scale-95 ml-1"
                        title="Listen to the Friend's Guidance at this step"
                      >
                        {isSpeaking ? <VolumeX className="w-3.5 h-3.5 animate-pulse" /> : <Volume2 className="w-3.5 h-3.5" />}
                        <span>{isSpeaking ? 'Stop' : '🔊 Listen'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Scrubber Range Slider */}
                <div className="space-y-1">
                  <input
                    type="range"
                    min={0}
                    max={journeyData.steps.length - 1}
                    value={activeStepIndex}
                    onChange={(e) => handleStepChange(Number(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-400"
                  />
                  <div className="flex items-center justify-between text-[10.5px] text-slate-400 font-mono">
                    <span>{journeyData.steps[0]?.timeStr} (T+0m)</span>
                    <span className="text-blue-300 font-bold">{activeStep.timeStr} (Active)</span>
                    <span>{journeyData.steps[journeyData.steps.length - 1]?.timeStr} (+{journeyData.steps[journeyData.steps.length - 1]?.minutesElapsed}m)</span>
                  </div>
                </div>

                {/* Horizontal Step Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-thin">
                  {journeyData.steps.map((step, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleStepChange(idx)}
                      className={`px-2.5 py-1 rounded-xl text-[10.5px] font-mono font-bold shrink-0 transition-all cursor-pointer ${
                        idx === activeStepIndex
                          ? 'bg-blue-500 text-white ring-2 ring-blue-300 shadow-md'
                          : step.isMilestone
                          ? 'bg-slate-800 text-amber-300 border border-amber-500/40 hover:bg-slate-700'
                          : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <span>{step.timeStr.replace(/ AM| PM/, '')}</span>
                      {step.isMilestone && <span className="ml-1 text-[9px]">★</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Primary Friend Coaching Card for this 5-Minute Step */}
              <div className="rounded-3xl border-2 border-blue-200/80 bg-gradient-to-b from-blue-50/50 via-indigo-50/20 to-white p-5 sm:p-6 shadow-sm space-y-4">
                
                {/* Step Headline & Verdict Badge */}
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-blue-100 flex-wrap">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0 mt-0.5">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-slate-900 tracking-wide uppercase">
                          Friend's 5-Min Guidance at {activeStep.timeStr}
                        </span>
                        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase border shadow-2xs ${
                          activeStep.verdictAction === 'STRONG_HOLD' || activeStep.verdictAction === 'WAIT_PATIENTLY'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : activeStep.verdictAction === 'SCALE_IN_AVERAGE'
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : activeStep.verdictAction === 'BOOK_PARTIAL_PROFIT'
                            ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                            : 'bg-rose-100 text-rose-800 border-rose-300'
                        }`}>
                          {activeStep.verdictBadge}
                        </span>
                        {activeStep.milestoneTag && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-300 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-600" />
                            <span>{activeStep.milestoneTag}</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-slate-800 font-medium mt-1 leading-relaxed">
                        {activeStep.friendGuidanceMessage}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 4-Pillar Diagnostics at this 5-Min Timestamp */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Price & PnL */}
                  <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Price at {activeStep.timeStr}</div>
                    <div className="font-mono font-black text-slate-900 text-base mt-0.5">
                      ₹{activeStep.price.toFixed(2)}
                    </div>
                    <div className={`text-[10px] font-bold ${activeStep.pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {activeStep.pnl >= 0 ? '+' : ''}₹{activeStep.pnl.toLocaleString('en-IN')} ({activeStep.pnlPct >= 0 ? '+' : ''}{activeStep.pnlPct.toFixed(1)}%)
                    </div>
                  </div>

                  {/* RSI (14) */}
                  <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                    <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                      <Activity className="w-3 h-3 text-purple-600" />
                      <span>RSI (14) Momentum</span>
                    </div>
                    <div className="font-mono font-black text-purple-700 text-base mt-0.5">
                      {activeStep.rsi.toFixed(1)} {activeStep.rsiTrajectory === 'RISING' ? '↗' : activeStep.rsiTrajectory === 'FALLING' ? '↘' : '→'}
                    </div>
                    <div className="text-[10px] text-slate-500 font-semibold">
                      {activeStep.rsi >= 65 ? 'Overbought Fuel' : activeStep.rsi >= 50 ? 'Constructive Bull' : 'Testing Support'}
                    </div>
                  </div>

                  {/* Volume & Buyer % */}
                  <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                    <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                      <BarChart2 className="w-3 h-3 text-blue-600" />
                      <span>Volume &amp; Order Flow</span>
                    </div>
                    <div className="font-mono font-black text-blue-700 text-base mt-0.5">
                      {activeStep.volumeRatio.toFixed(1)}x Vol
                    </div>
                    <div className="text-[10px] text-emerald-600 font-bold">
                      {activeStep.buyerPressurePct}% Buyer Dominance
                    </div>
                  </div>

                  {/* VWAP Support */}
                  <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                    <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                      <Shield className="w-3 h-3 text-emerald-600" />
                      <span>VWAP Support</span>
                    </div>
                    <div className="font-mono font-black text-slate-900 text-base mt-0.5">
                      ₹{activeStep.vwap.toFixed(2)}
                    </div>
                    <div className={`text-[10px] font-bold ${activeStep.isAboveVwap ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {activeStep.isAboveVwap ? '✅ Above VWAP' : '⚠️ Testing Base'}
                    </div>
                  </div>
                </div>

                {/* Specific Action Callout */}
                <div className="p-3.5 bg-gradient-to-r from-amber-50 via-slate-50 to-emerald-50 rounded-2xl border border-amber-200/80 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-700 shrink-0 mt-0.5">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-amber-900 uppercase tracking-wide">
                      Recommended Action For This 5-Min Window
                    </div>
                    <div className="text-xs font-black text-slate-900 mt-0.5 leading-relaxed">
                      {activeStep.actionCallout}
                    </div>
                  </div>
                </div>

              </div>
            </>
          ) : (
            /* Full Step Table */
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-600 font-black uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Time</th>
                    <th className="p-3">Elapsed</th>
                    <th className="p-3">Price</th>
                    <th className="p-3">P&amp;L</th>
                    <th className="p-3">RSI</th>
                    <th className="p-3">Volume</th>
                    <th className="p-3">Verdict</th>
                    <th className="p-3">Guidance / Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {journeyData.steps.map((step, idx) => (
                    <tr 
                      key={idx}
                      onClick={() => {
                        handleStepChange(idx);
                        setViewMode('interactive');
                      }}
                      className={`hover:bg-blue-50/60 cursor-pointer transition-colors ${
                        idx === activeStepIndex ? 'bg-blue-50 font-bold' : ''
                      }`}
                    >
                      <td className="p-3 font-mono font-bold text-slate-900">{step.timeStr}</td>
                      <td className="p-3 font-mono text-slate-500">+{step.minutesElapsed}m</td>
                      <td className="p-3 font-mono font-bold">₹{step.price.toFixed(2)}</td>
                      <td className={`p-3 font-mono font-bold ${step.pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {step.pnl >= 0 ? '+' : ''}₹{step.pnl.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 font-mono text-purple-700">{step.rsi.toFixed(1)}</td>
                      <td className="p-3 font-mono text-blue-700">{step.volumeRatio.toFixed(1)}x</td>
                      <td className="p-3">
                        <span className={`text-[9.5px] font-black px-2 py-0.5 rounded-full ${
                          step.verdictAction === 'STRONG_HOLD'
                            ? 'bg-emerald-100 text-emerald-800'
                            : step.verdictAction === 'SCALE_IN_AVERAGE'
                            ? 'bg-amber-100 text-amber-800'
                            : step.verdictAction === 'BOOK_PARTIAL_PROFIT'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {step.verdictBadge}
                        </span>
                      </td>
                      <td className="p-3 text-[11px] text-slate-700 max-w-xs truncate">
                        {step.friendGuidanceMessage}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2">
          <div className="text-xs text-slate-500 font-medium">
            💡 The 5-minute timeline synchronizes live with your Dhan broker feed every 5 minutes.
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition-all cursor-pointer"
          >
            Close Timeline
          </button>
        </div>

      </div>
    </div>
  );
};
