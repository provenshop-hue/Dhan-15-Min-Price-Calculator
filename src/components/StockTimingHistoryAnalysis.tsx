import React, { useState, useMemo } from 'react';
import { StockCalculated, StockTradeJourney } from '../types';
import { analyzeStockTimingHistory, StockIdealTimingReport } from '../utils/stockTimingHistory';
import { 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  ShieldAlert, 
  ShieldCheck, 
  Zap, 
  Sparkles, 
  Flame, 
  Layers, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowUpRight, 
  ArrowDownRight,
  Info,
  Calendar,
  Activity
} from 'lucide-react';

interface StockTimingHistoryAnalysisProps {
  stock: StockCalculated;
  tradeJourney?: StockTradeJourney | null;
  className?: string;
  isCompact?: boolean;
}

export const StockTimingHistoryAnalysis: React.FC<StockTimingHistoryAnalysisProps> = ({
  stock,
  tradeJourney,
  className = '',
  isCompact = false
}) => {
  const [activeTab, setActiveTab] = useState<'SUMMARY' | 'SLOTS' | 'TIMELINE'>('SUMMARY');
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  const report: StockIdealTimingReport = useMemo(() => {
    return analyzeStockTimingHistory(stock, tradeJourney);
  }, [stock, tradeJourney]);

  return (
    <div className={`bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 shadow-md p-4 sm:p-5 space-y-4 ${className}`}>
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Clock className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-indigo-300">
                Ideal Trading Time &amp; Historical Analysis
              </span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.2 rounded font-mono">
                {report.symbol}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Historical intraday timeline &amp; session probability profile (09:15 AM – 03:30 PM)
            </p>
          </div>
        </div>

        {/* Live Status Pill */}
        <div className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 ${report.currentTimingBadgeColor}`}>
          <Activity className="w-3.5 h-3.5 shrink-0" />
          <span className="font-semibold">{report.currentTimingVerdictLabel}</span>
        </div>
      </div>

      {/* Golden Windows Highlights (Best Bullish & Best Bearish Time) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* 1. Best Bullish Time Window */}
        <div className="p-3.5 bg-emerald-950/70 border border-emerald-500/50 rounded-xl space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>Best Bullish Time</span>
            </div>
            <span className="text-xs font-mono font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-lg">
              {report.bestBullishTimeWindow.winRate}% Win Rate
            </span>
          </div>

          <div className="pt-1">
            <div className="text-sm sm:text-base font-black font-mono text-emerald-200">
              {report.bestBullishTimeWindow.timeRange}
            </div>
            <div className="text-[11px] text-emerald-300 font-medium">
              {report.bestBullishTimeWindow.sessionName} (Avg Move +{report.bestBullishTimeWindow.avgMovePct.toFixed(2)}%)
            </div>
          </div>

          <div className="text-[11px] text-slate-300 bg-emerald-950/90 p-2 rounded-lg border border-emerald-800/40">
            <strong className="text-emerald-400">Trigger:</strong> {report.bestBullishTimeWindow.triggerReason}
          </div>

          <div className="text-[10px] text-emerald-300 font-sans font-medium flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-300 shrink-0" />
            <span>Action: {report.bestBullishTimeWindow.action}</span>
          </div>
        </div>

        {/* 2. Best Bearish Time Window */}
        <div className="p-3.5 bg-rose-950/70 border border-rose-500/50 rounded-xl space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-rose-400 text-xs font-bold uppercase tracking-wider">
              <TrendingDown className="w-4 h-4 text-rose-400" />
              <span>Best Bearish Time</span>
            </div>
            <span className="text-xs font-mono font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-lg">
              {report.bestBearishTimeWindow.winRate}% Short Win Rate
            </span>
          </div>

          <div className="pt-1">
            <div className="text-sm sm:text-base font-black font-mono text-rose-200">
              {report.bestBearishTimeWindow.timeRange}
            </div>
            <div className="text-[11px] text-rose-300 font-medium">
              {report.bestBearishTimeWindow.sessionName} (Avg Move -{report.bestBearishTimeWindow.avgMovePct.toFixed(2)}%)
            </div>
          </div>

          <div className="text-[11px] text-slate-300 bg-rose-950/90 p-2 rounded-lg border border-rose-800/40">
            <strong className="text-rose-400">Trigger:</strong> {report.bestBearishTimeWindow.triggerReason}
          </div>

          <div className="text-[10px] text-rose-300 font-sans font-medium flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-300 shrink-0" />
            <span>Action: {report.bestBearishTimeWindow.action}</span>
          </div>
        </div>

        {/* 3. Avoid / Choppiest Time Window */}
        <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2 relative sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Avoid Window (Theta Trap)</span>
            </div>
            <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-lg">
              Low Volatility
            </span>
          </div>

          <div className="pt-1">
            <div className="text-sm sm:text-base font-black font-mono text-slate-200">
              {report.avoidTimeWindow.timeRange}
            </div>
            <div className="text-[11px] text-amber-300/90 font-medium">
              {report.avoidTimeWindow.sessionName}
            </div>
          </div>

          <div className="text-[11px] text-slate-300 bg-slate-900/90 p-2 rounded-lg border border-slate-800">
            <strong className="text-amber-400">Caution:</strong> {report.avoidTimeWindow.reason}
          </div>

          <div className="text-[10px] text-slate-400 font-sans flex items-center gap-1">
            <Info className="w-3 h-3 text-slate-400 shrink-0" />
            <span>Rule: Do not enter fresh option buyers positions in lunch chop</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center space-x-1.5 border-b border-slate-800 pb-1 text-xs">
        <button
          onClick={() => setActiveTab('SUMMARY')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
            activeTab === 'SUMMARY'
              ? 'bg-indigo-600 text-white font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          Session Matrix ({report.timeSlots.length} Slots)
        </button>
        <button
          onClick={() => setActiveTab('TIMELINE')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
            activeTab === 'TIMELINE'
              ? 'bg-indigo-600 text-white font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          Intraday History Timeline ({report.historyEvents.length} Points)
        </button>
      </div>

      {/* Tab 1: Session Time Matrix */}
      {activeTab === 'SUMMARY' && (
        <div className="space-y-2.5">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Historical win rates and volatility by time of day:</span>
            <span className="text-slate-500 font-mono text-[10px]">Click any slot for strategy</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {report.timeSlots.map((slot) => {
              const isSelected = selectedSlotId === slot.slotId;
              const isBull = slot.dominantBias === 'BULLISH';
              const isBear = slot.dominantBias === 'BEARISH';

              return (
                <div
                  key={slot.slotId}
                  onClick={() => setSelectedSlotId(isSelected ? null : slot.slotId)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    slot.isCurrentSlot
                      ? 'ring-2 ring-indigo-400 border-indigo-500 bg-slate-950'
                      : slot.isBestBullish
                      ? 'bg-emerald-950/40 border-emerald-500/60 hover:border-emerald-400'
                      : slot.isBestBearish
                      ? 'bg-rose-950/40 border-rose-500/60 hover:border-rose-400'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono font-black text-white">{slot.timeRange}</span>
                      {slot.isCurrentSlot && (
                        <span className="text-[9px] bg-indigo-500 text-white px-1.5 py-0.2 rounded font-bold uppercase animate-pulse">
                          Active Now
                        </span>
                      )}
                      {slot.isBestBullish && (
                        <span className="text-[9px] bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 px-1.5 py-0.2 rounded font-bold">
                          ⭐ Golden Bullish
                        </span>
                      )}
                      {slot.isBestBearish && (
                        <span className="text-[9px] bg-rose-500/30 text-rose-300 border border-rose-500/50 px-1.5 py-0.2 rounded font-bold">
                          ⚡ Golden Bearish
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className={isBull ? 'text-emerald-400 font-bold' : isBear ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                        {isBull ? `+${slot.bullishWinRate}% Bull` : isBear ? `-${slot.bearishWinRate}% Bear` : '50% Neutral'}
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-300 font-medium mt-1">
                    {slot.sessionName}
                  </div>

                  {/* Visual Bar Comparison */}
                  <div className="mt-2 space-y-1">
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden flex">
                      <div 
                        className="bg-emerald-500 h-full transition-all"
                        style={{ width: `${slot.bullishWinRate}%` }}
                        title={`Bullish: ${slot.bullishWinRate}%`}
                      />
                      <div 
                        className="bg-rose-500 h-full transition-all"
                        style={{ width: `${slot.bearishWinRate}%` }}
                        title={`Bearish: ${slot.bearishWinRate}%`}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] font-mono text-slate-400">
                      <span className="text-emerald-400">Bull {slot.bullishWinRate}%</span>
                      <span>Vol: {slot.volumeMultiplier}x ({slot.volatility})</span>
                      <span className="text-rose-400">Bear {slot.bearishWinRate}%</span>
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-800/80 text-[10.5px] text-slate-300 flex items-start gap-1.5">
                    <Zap className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                    <span>{slot.recommendedActionText}</span>
                  </div>

                  {isSelected && (
                    <div className="mt-2.5 p-2 bg-slate-900 rounded-lg border border-slate-700/80 text-[10.5px] space-y-1 animate-fade-in">
                      <div><strong className="text-indigo-300">Key Setup:</strong> {slot.keySetupName}</div>
                      <div><strong className="text-cyan-300">RSI Dynamics:</strong> {slot.rsiBehavior}</div>
                      <div><strong className="text-amber-300">Average Move:</strong> {slot.avgPriceMovePct > 0 ? '+' : ''}{slot.avgPriceMovePct.toFixed(2)}%</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Intraday History Timeline */}
      {activeTab === 'TIMELINE' && (
        <div className="space-y-2">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Historical intraday recorded points &amp; momentum status:</span>
            <span className="text-slate-500 font-mono text-[10px]">Total {report.historyEvents.length} Candles Logged</span>
          </div>

          <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1 font-mono text-xs">
            {report.historyEvents.map((evt, idx) => {
              const isBull = evt.trend === 'Bullish';
              const isBear = evt.trend === 'Bearish';

              return (
                <div
                  key={`${evt.timeStr}-${idx}`}
                  className="p-2 bg-slate-950 rounded-xl border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-[10.5px] font-sans font-bold text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded">
                      {evt.timeStr}
                    </span>
                    <strong className="text-white text-xs">₹{evt.price.toFixed(2)}</strong>
                    <span className={`text-[10px] font-bold ${evt.pctFromOpen >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      ({evt.pctFromOpen >= 0 ? '+' : ''}{evt.pctFromOpen.toFixed(2)}%)
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 text-[10px]">
                    <span className="text-slate-400 font-sans">{evt.vwapRelation}</span>
                    <span className="text-indigo-300">RSI:{evt.rsi.toFixed(1)}</span>
                    <span className={`px-2 py-0.2 rounded font-sans font-bold ${
                      isBull ? 'bg-emerald-950 text-emerald-300 border border-emerald-600/40' : isBear ? 'bg-rose-950 text-rose-300 border border-rose-600/40' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {evt.trend}
                    </span>
                  </div>

                  <div className="text-[9.5px] font-sans text-slate-400">
                    {evt.highlight}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Historical Timing Insights & Statistical Rules */}
      <div className="p-3 bg-slate-950/90 rounded-xl border border-slate-800 space-y-1.5">
        <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>Historical Timing Insights &amp; Execution Rules</span>
        </div>
        <ul className="text-xs text-slate-300 space-y-1 pl-1">
          {report.timingInsights.map((insight, idx) => (
            <li key={idx} className="flex items-start gap-1.5 text-[11px] leading-relaxed">
              <span className="text-amber-400 shrink-0 font-bold">•</span>
              <span>{insight}</span>
            </li>
          ))}
        </ul>
      </div>

    </div>
  );
};
