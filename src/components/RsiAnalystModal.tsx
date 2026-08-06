import React, { useState, useEffect } from 'react';
import { X, Sparkles, TrendingUp, TrendingDown, RefreshCw, CheckCircle2, AlertTriangle, ArrowUpRight, ArrowDownRight, Target, ShieldAlert, BarChart3, Clock, Copy, Check } from 'lucide-react';
import { StockCalculated, RsiIntradayPoint, RsiAiAnalysisReport } from '../types';
import { generateIntradayRsiTimeline, analyzeRsiProgressWithAi } from '../utils/rsiAnalyst';

interface RsiAnalystModalProps {
  stock: StockCalculated | null;
  onClose: () => void;
}

export const RsiAnalystModal: React.FC<RsiAnalystModalProps> = ({ stock, onClose }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState('');
  const [timeline, setTimeline] = useState<RsiIntradayPoint[]>([]);
  const [report, setReport] = useState<RsiAiAnalysisReport | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (stock) {
      // Auto generate timeline preview or reset
      const initialTimeline = generateIntradayRsiTimeline(stock);
      setTimeline(initialTimeline);
      setReport(null);
    }
  }, [stock]);

  if (!stock) return null;

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisProgress('1/3: Fetching 15m intraday candles from 09:15 AM...');
    
    try {
      await new Promise((r) => setTimeout(r, 400));
      const currentTimeline = generateIntradayRsiTimeline(stock);
      setTimeline(currentTimeline);

      setAnalysisProgress('2/3: Calculating 14-period RSI progression sequence...');
      await new Promise((r) => setTimeout(r, 400));

      setAnalysisProgress('3/3: Evaluating momentum & generating AI entry/exit report...');
      const aiReport = await analyzeRsiProgressWithAi(stock, currentTimeline);
      
      setReport(aiReport);
    } catch (e) {
      console.error('Error running RSI analysis:', e);
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress('');
    }
  };

  const handleCopyReport = () => {
    if (!report || !stock) return;
    const text = `📊 AI RSI INTRA DAY ANALYST REPORT - ${stock.symbol}
CMP: ₹${(stock.closePrice || stock.openPrice || 0).toFixed(2)}
Verdict: ${report.verdictTitle} (${report.confidencePct}% Confidence)
Gradual RSI Increase: ${report.gradualIncreaseDetected ? 'YES 📈' : 'NO ⚠️'}
------------------------------------
📌 ENTRY POINT: ${report.entryPoint}
🎯 EXIT TARGETS:
${report.exitTargets.map((t) => `  • ${t}`).join('\n')}
🛑 STOP LOSS: ${report.stopLoss}
⚖️ RISK/REWARD: ${report.riskRewardRatio}
------------------------------------
💡 ACTIONABLE ADVICE: ${report.actionableAdvice}
(Analyzed at ${report.analyzedAt})`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const cmp = stock.closePrice || stock.openPrice || 0;
  const startRsi = timeline[0]?.rsi ?? 50;
  const endRsi = timeline[timeline.length - 1]?.rsi ?? startRsi;
  const rsiDiff = Math.round((endRsi - startRsi) * 10) / 10;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl text-slate-800 relative max-h-[92vh] overflow-y-auto">
        
        {/* Top Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-extrabold text-slate-900 font-mono">{stock.symbol}</span>
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                <Sparkles className="w-3 h-3" /> RSI AI Analyst
              </span>
            </div>
            <h3 className="text-xs text-slate-500 font-medium mt-0.5">{stock.companyName} • CMP: ₹{cmp.toFixed(2)}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Intraday 09:15 AM Header Banner */}
        <div className="mt-4 p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-400" /> Intraday 09:15 AM to Current Time RSI Tracker
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Analyzes step-by-step 15-minute RSI progression to verify gradual momentum expansion, entry validity, and risk-reward exit targets.
              </p>
            </div>

            <button
              onClick={handleRunAnalysis}
              disabled={isAnalyzing}
              className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 disabled:opacity-50 shrink-0 cursor-pointer active:scale-95"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Analyzing RSI Data...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                  <span>Run AI RSI Analyst</span>
                </>
              )}
            </button>
          </div>

          {/* Loading Progress State */}
          {isAnalyzing && (
            <div className="mt-3 p-2.5 bg-indigo-900/60 border border-indigo-700/50 rounded-lg text-center animate-pulse text-xs font-mono text-indigo-200">
              {analysisProgress}
            </div>
          )}
        </div>

        {/* Quick Summary Metrics Cards */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Start RSI (09:15)</span>
            <span className="text-base font-mono font-extrabold text-slate-900 mt-0.5 block">{startRsi.toFixed(1)}</span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Current RSI</span>
            <span className={`text-base font-mono font-extrabold mt-0.5 block ${
              endRsi >= 55 ? 'text-emerald-600' : endRsi <= 45 ? 'text-rose-600' : 'text-slate-900'
            }`}>
              {endRsi.toFixed(1)} ({rsiDiff > 0 ? `+${rsiDiff.toFixed(1)}` : rsiDiff.toFixed(1)})
            </span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Gradual RSI</span>
            <span className={`text-xs font-extrabold mt-1 inline-block px-2 py-0.5 rounded ${
              report?.gradualIncreaseDetected || (rsiDiff > 2 && endRsi > 50)
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-amber-100 text-amber-800 border border-amber-300'
            }`}>
              {report?.gradualIncreaseDetected || (rsiDiff > 2 && endRsi > 50) ? 'YES 📈' : 'NO / FLAT ⚠️'}
            </span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Volume Trend</span>
            {(() => {
              const lastPt = timeline[timeline.length - 1];
              const isVolUp = lastPt?.volumeDirection === 'INCREASING';
              const isVolDown = lastPt?.volumeDirection === 'DECREASING';
              const volPct = lastPt?.volumeDeltaPct ?? 0;
              return (
                <span className={`text-xs font-extrabold mt-1 inline-block px-2 py-0.5 rounded ${
                  isVolUp
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : isVolDown
                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                    : 'bg-slate-100 text-slate-700 border border-slate-300'
                }`}>
                  {isVolUp ? `Increasing (+${volPct}%) 📈` : isVolDown ? `Decreasing (${volPct}%) 📉` : 'Flat ➖'}
                </span>
              );
            })()}
          </div>

          <div className="col-span-2 sm:col-span-1 bg-gradient-to-br from-indigo-50 to-blue-50 p-2.5 rounded-xl border border-indigo-200/80">
            <span className="text-[10px] font-bold text-indigo-700 uppercase block">RSI & Vol Confluence</span>
            {(() => {
              const lastPt = timeline[timeline.length - 1];
              const rsiUp = lastPt?.rsiDirection === 'INCREASING';
              const volUp = lastPt?.volumeDirection === 'INCREASING';
              const rsiDown = lastPt?.rsiDirection === 'DECREASING';
              const volDown = lastPt?.volumeDirection === 'DECREASING';

              if (rsiUp && volUp) {
                return <span className="text-xs font-black text-emerald-700 mt-1 block">🚀 Dual Bullish</span>;
              } else if (rsiDown && volUp) {
                return <span className="text-xs font-black text-rose-700 mt-1 block">⚠️ Selling Pressure</span>;
              } else if (rsiUp && volDown) {
                return <span className="text-xs font-bold text-amber-700 mt-1 block">⚠️ Low Vol Rise</span>;
              } else {
                return <span className="text-xs font-bold text-slate-600 mt-1 block">Neutral</span>;
              }
            })()}
          </div>
        </div>

        {/* AI Analysis Report Card (If Generated) */}
        {report && (
          <div className="mt-5 space-y-4 animate-fade-in">
            {/* Verdict Header Banner */}
            <div className={`p-4 rounded-xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm ${
              report.verdict === 'POSITIVE_BUY'
                ? 'bg-emerald-50 border-emerald-500 text-emerald-950'
                : report.verdict === 'NEGATIVE_AVOID'
                ? 'bg-rose-50 border-rose-500 text-rose-950'
                : 'bg-amber-50 border-amber-500 text-amber-950'
            }`}>
              <div className="flex items-start space-x-3">
                <div className={`p-2.5 rounded-xl text-white font-bold shrink-0 ${
                  report.verdict === 'POSITIVE_BUY'
                    ? 'bg-emerald-600'
                    : report.verdict === 'NEGATIVE_AVOID'
                    ? 'bg-rose-600'
                    : 'bg-amber-600'
                }`}>
                  {report.verdict === 'POSITIVE_BUY' ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : report.verdict === 'NEGATIVE_AVOID' ? (
                    <ShieldAlert className="w-6 h-6" />
                  ) : (
                    <AlertTriangle className="w-6 h-6" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider opacity-80">
                      {report.verdict === 'POSITIVE_BUY' ? '🟢 POSITIVE BUY RECOMMENDATION' : report.verdict === 'NEGATIVE_AVOID' ? '🔴 AVOID / NEGATIVE SIGNAL' : '🟡 NEUTRAL / WAIT FOR CONFIRMATION'}
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-white/80 px-2 py-0.2 rounded border shadow-2xs">
                      {report.confidencePct}% Confidence
                    </span>
                  </div>
                  <h4 className="text-sm font-black mt-0.5">{report.verdictTitle}</h4>
                </div>
              </div>

              <button
                onClick={handleCopyReport}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 transition-colors flex items-center justify-center space-x-1.5 shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                <span>{copied ? 'Copied Report' : 'Copy Analysis'}</span>
              </button>
            </div>

            {/* Entry & Exit Blueprint Box */}
            <div className="p-4 bg-slate-900 text-white rounded-xl border border-slate-800 shadow-md">
              <div className="text-xs font-extrabold uppercase text-indigo-400 mb-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-indigo-400" /> Precise Trade Execution Blueprint
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Risk/Reward Ratio: <strong className="text-emerald-400">{report.riskRewardRatio}</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Entry Point */}
                <div className="bg-slate-800/90 p-3 rounded-lg border border-slate-700">
                  <div className="text-[10px] font-bold text-blue-400 uppercase flex items-center gap-1">
                    <ArrowUpRight className="w-3.5 h-3.5 text-blue-400" /> Recommended Entry Point
                  </div>
                  <div className="text-xs font-bold text-white mt-1.5 leading-relaxed font-mono">
                    {report.entryPoint}
                  </div>
                </div>

                {/* Exit Targets */}
                <div className="bg-slate-800/90 p-3 rounded-lg border border-slate-700">
                  <div className="text-[10px] font-bold text-emerald-400 uppercase flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Exit Targets (Take Profit)
                  </div>
                  <div className="mt-1.5 space-y-1 text-xs font-mono">
                    {report.exitTargets.map((tgt, i) => (
                      <div key={i} className="text-emerald-300 font-medium">
                        {tgt}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stop Loss */}
                <div className="bg-slate-800/90 p-3 rounded-lg border border-slate-700">
                  <div className="text-[10px] font-bold text-rose-400 uppercase flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> Strict Stop Loss
                  </div>
                  <div className="text-xs font-bold text-rose-300 mt-1.5 font-mono leading-relaxed">
                    {report.stopLoss}
                  </div>
                </div>
              </div>

              {/* Actionable Advice */}
              <div className="mt-3 p-2.5 bg-indigo-950/80 border border-indigo-800/60 rounded-lg text-xs text-indigo-200">
                <strong className="text-indigo-300 font-bold uppercase block text-[10px] mb-0.5">Trader Guidance:</strong>
                {report.actionableAdvice}
              </div>
            </div>

            {/* Detailed AI Written Explanation */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
              <h5 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-blue-600" /> RSI Progression & Momentum Summary
              </h5>
              <p className="text-slate-700 leading-relaxed">{report.rsiTrendSummary}</p>
              <p className="text-slate-600 leading-relaxed pt-1 border-t border-slate-200/60">{report.analysisDetails}</p>
            </div>
          </div>
        )}

        {/* 15-Minute RSI & Volume Progression Timeline Table */}
        <div className="mt-5 border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="bg-slate-100/90 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase text-slate-800 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" /> 15-Min Candle RSI & Volume Sequence (09:15 AM - Current)
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Total {timeline.length} Intervals</span>
          </div>

          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Price</th>
                  <th className="py-2.5 px-3">14-Period RSI</th>
                  <th className="py-2.5 px-3 text-center">RSI Shift</th>
                  <th className="py-2.5 px-3 text-right">15m Volume</th>
                  <th className="py-2.5 px-3 text-center">Volume Trend</th>
                  <th className="py-2.5 px-3 text-center">Confluence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {timeline.map((point, idx) => {
                  const formatVol = (v?: number) => {
                    if (!v || v === 0) return '-';
                    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
                    if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
                    return v.toLocaleString('en-IN');
                  };

                  const isVolUp = point.volumeDirection === 'INCREASING';
                  const isVolDown = point.volumeDirection === 'DECREASING';
                  const volPct = point.volumeDeltaPct ?? 0;

                  const isRsiUp = point.rsiDirection === 'INCREASING';
                  const isRsiDown = point.rsiDirection === 'DECREASING';

                  return (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2 px-3 font-semibold text-slate-800">{point.timeStr}</td>
                      <td className="py-2 px-3 font-bold text-slate-900">₹{point.close.toFixed(2)}</td>
                      
                      {/* RSI Cell */}
                      <td className="py-2 px-3 font-extrabold">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          point.rsi >= 60
                            ? 'bg-emerald-100 text-emerald-900 font-black'
                            : point.rsi >= 50
                            ? 'bg-emerald-50 text-emerald-800'
                            : point.rsi <= 40
                            ? 'bg-rose-100 text-rose-900 font-black'
                            : 'bg-slate-100 text-slate-800'
                        }`}>
                          {point.rsi.toFixed(1)}
                        </span>
                      </td>

                      {/* RSI Shift Cell */}
                      <td className="py-2 px-3 text-center">
                        <span className={`text-xs font-bold ${
                          point.rsiDelta > 0 ? 'text-emerald-600' : point.rsiDelta < 0 ? 'text-rose-600' : 'text-slate-400'
                        }`}>
                          {point.rsiDelta > 0 ? `+${point.rsiDelta.toFixed(1)}` : point.rsiDelta.toFixed(1)}
                        </span>
                      </td>

                      {/* 15m Volume Cell */}
                      <td className="py-2 px-3 text-right font-bold text-slate-800">
                        {formatVol(point.volume)}
                      </td>

                      {/* Volume Trend Cell */}
                      <td className="py-2 px-3 text-center">
                        {isVolUp ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                            <TrendingUp className="w-3 h-3 text-emerald-600" /> Increasing ({volPct > 0 ? `+${volPct}` : volPct}%)
                          </span>
                        ) : isVolDown ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-rose-50 text-rose-700 px-2 py-0.5 rounded border border-rose-200">
                            <TrendingDown className="w-3 h-3 text-rose-600" /> Decreasing ({volPct}%)
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">Flat</span>
                        )}
                      </td>

                      {/* RSI & Vol Confluence Status Cell */}
                      <td className="py-2 px-3 text-center">
                        {isRsiUp && isVolUp ? (
                          <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                            Strong Bullish
                          </span>
                        ) : isRsiDown && isVolUp ? (
                          <span className="text-[10px] font-black uppercase text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                            Heavy Selling
                          </span>
                        ) : isRsiUp && isVolDown ? (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            Low Vol Rise
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action / Close Footer */}
        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
          <button
            onClick={handleRunAnalysis}
            disabled={isAnalyzing}
            className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition-colors border border-blue-200 flex items-center space-x-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>Refresh Analysis</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
          >
            Close Window
          </button>
        </div>

      </div>
    </div>
  );
};
