import React, { useState } from 'react';
import { X, ExternalLink, TrendingUp, TrendingDown, Shield, Target, Award, ArrowUpRight, ArrowDownRight, Layers, ShieldCheck, Calculator, Percent, Sparkles, Clock, Compass, Zap, Flame, Check } from 'lucide-react';
import { StockCalculated, StockTradeJourney } from '../types';
import { getAtmOptionStrikes, calculateFibonacci382, isOpenLowPattern, isOpenHighPattern } from '../utils/gann';
import { evaluateStockTradeJourney } from '../utils/tradeTracker';
import { evaluateIdealOptionTrade } from '../utils/idealTradeAnalyzer';
import { evaluateBtstPrediction } from '../utils/btstPredictor';
import { formatStrikePrice } from '../utils/nseStrikeMaster';
import { StockTimingHistoryAnalysis } from './StockTimingHistoryAnalysis';

interface StockDetailModalProps {
  stock: StockCalculated | null;
  tradeJourney?: StockTradeJourney | null;
  onClose: () => void;
  onOpenPositionSizer?: (stock?: StockCalculated) => void;
  onOpenRsiAnalyst?: (stock: StockCalculated) => void;
}

export const StockDetailModal: React.FC<StockDetailModalProps> = ({ stock, tradeJourney, onClose, onOpenPositionSizer, onOpenRsiAnalyst }) => {
  const [selectedLotMonth, setSelectedLotMonth] = useState<'Jun' | 'Jul' | 'Aug'>('Jun');

  if (!stock) return null;

  const lotSize =
    selectedLotMonth === 'Jun'
      ? stock.lotSizeJun2026
      : selectedLotMonth === 'Jul'
      ? stock.lotSizeJul2026
      : stock.lotSizeAug2026;

  const activePrice = stock.closePrice || stock.openPrice || 0;
  const contractValue = lotSize && activePrice ? lotSize * activePrice : 0;
  const optionStrikes = getAtmOptionStrikes(activePrice, stock.symbol);

  // Compute or use passed tradeJourney
  const journey = tradeJourney || evaluateStockTradeJourney(stock);
  const btstPrediction = evaluateBtstPrediction(stock);

  const isOpenLow = (stock.openPrice !== undefined && stock.openPrice !== null && stock.openPrice > 0)
    ? isOpenLowPattern(stock.openPrice, stock.lowPrice, stock.first15mLow)
    : false;
  const isOpenHigh = (stock.openPrice !== undefined && stock.openPrice !== null && stock.openPrice > 0)
    ? isOpenHighPattern(stock.openPrice, stock.highPrice, stock.first15mHigh)
    : false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-xl text-slate-800 relative max-h-[92vh] overflow-y-auto">
        
        {/* Top Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-extrabold text-slate-900 font-mono">{stock.symbol}</span>
              <a
                href={stock.screenerUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-700 hover:underline flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60 font-medium"
              >
                ScanX Screener <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <h3 className="text-sm text-slate-500 font-medium mt-0.5">{stock.companyName}</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pattern Banner Highlights */}
        {isOpenLow && (
          <div className="mt-4 p-3 bg-emerald-50/70 border border-emerald-300/80 rounded-xl flex items-center justify-between text-emerald-900 shadow-2xs">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-emerald-600 text-white rounded-lg shadow-2xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                  <span>🟢 OPEN = LOW PATTERN DETECTED</span>
                  <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded text-[10px] font-bold border border-emerald-200">High Accuracy</span>
                </div>
                <p className="text-xs text-emerald-700 mt-0.5 font-medium">
                  Opening price (₹{stock.openPrice?.toFixed(2)}) is equal to Low (₹{(stock.first15mLow || stock.lowPrice || stock.openPrice)?.toFixed(2)}). Buyers defended opening price from 09:15 AM.
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono font-bold bg-emerald-700 text-white px-2.5 py-1 rounded-lg shadow-2xs">
                Bullish Setup
              </span>
            </div>
          </div>
        )}

        {isOpenHigh && (
          <div className="mt-4 p-3 bg-rose-50/70 border border-rose-300/80 rounded-xl flex items-center justify-between text-rose-900 shadow-2xs">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-rose-600 text-white rounded-lg shadow-2xs">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                  <span>🔴 OPEN = HIGH PATTERN DETECTED</span>
                  <span className="bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded text-[10px] font-bold border border-rose-200">High Accuracy</span>
                </div>
                <p className="text-xs text-rose-700 mt-0.5 font-medium">
                  Opening price (₹{stock.openPrice?.toFixed(2)}) is equal to High (₹{(stock.first15mHigh || stock.highPrice || stock.openPrice)?.toFixed(2)}). Sellers dominated immediately at opening bell.
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono font-bold bg-rose-700 text-white px-2.5 py-1 rounded-lg shadow-2xs">
                Bearish Setup
              </span>
            </div>
          </div>
        )}

        {/* 0. Live Trade Profit & Timing Journey Tracker */}
        {journey && (
          <div className="mt-4 p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-md space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <Compass className="w-4 h-4 text-indigo-400" />
                </span>
                <div>
                  <div className="text-xs font-black uppercase tracking-wider text-indigo-300 flex items-center gap-2">
                    <span>Trade Profit &amp; Timing Journey</span>
                    <span className={`px-2 py-0.2 rounded text-[9.5px] font-bold ${journey.verdictBadgeClass}`}>
                      {journey.verdictTitle}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-2 flex-wrap">
                    <span>Triggered @ {journey.inceptionTime} (₹{journey.inceptionPrice.toFixed(2)})</span>
                    <span>•</span>
                    <span>Confidence: <strong className="text-emerald-400">{journey.confidenceScore}%</strong></span>
                  </div>
                </div>
              </div>

              {/* Profit Pill */}
              <div className={`px-3 py-1 rounded-xl font-mono text-right border ${
                journey.currentPnLPercent >= 0 ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300' : 'bg-rose-950/80 border-rose-500 text-rose-300'
              }`}>
                <div className="text-xs font-black flex items-center justify-end gap-1">
                  {journey.currentPnLPercent >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  <span>{journey.currentPnLPercent >= 0 ? '+' : ''}{journey.currentPnLPercent.toFixed(2)}%</span>
                  <span className="text-[10px] opacity-80">({journey.currentPnLPercent >= 0 ? '+' : ''}₹{journey.currentPnLAmount.toFixed(2)})</span>
                </div>
                <div className="text-[9px] text-slate-400 font-sans">
                  Peak: +{journey.peakPnLPercent.toFixed(2)}%
                </div>
              </div>
            </div>

            {/* Actionable Rule Directive */}
            <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 text-xs flex items-start gap-2">
              <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-indigo-300">Actionable Rule:</strong> <span className="text-slate-200">{journey.actionableGuidance}</span>
              </div>
            </div>

            {/* Visual Roadmap */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-center">
                <span className="text-[9.5px] text-slate-400 block font-sans">Inception Trigger</span>
                <strong className="text-white text-xs">₹{journey.inceptionPrice.toFixed(2)}</strong>
                <span className="text-[9px] text-indigo-400 block mt-0.5">@{journey.inceptionTime}</span>
              </div>
              <div className={`p-2 rounded-lg border text-center ${
                journey.latestPrice >= journey.target1 ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-300'
              }`}>
                <span className="text-[9.5px] text-slate-400 block font-sans">Target 1 (+1.5%)</span>
                <strong className="text-emerald-400 text-xs">₹{journey.target1.toFixed(2)}</strong>
                <span className="text-[9px] block mt-0.5 font-sans font-bold">
                  {journey.latestPrice >= journey.target1 ? '✅ Target Hit' : '🎯 In Sight'}
                </span>
              </div>
              <div className={`p-2 rounded-lg border text-center ${
                journey.latestPrice >= journey.target2 ? 'bg-purple-950/80 border-purple-500 text-yellow-300 font-bold' : 'bg-slate-950 border-slate-800 text-slate-300'
              }`}>
                <span className="text-[9.5px] text-slate-400 block font-sans">Target 2 (+3.0%)</span>
                <strong className="text-purple-300 text-xs">₹{journey.target2.toFixed(2)}</strong>
                <span className="text-[9px] block mt-0.5 font-sans font-bold">
                  {journey.latestPrice >= journey.target2 ? '🏆 Super Hit' : '🚀 Next Target'}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-rose-950/40 border border-rose-800/60 text-center">
                <span className="text-[9.5px] text-rose-300 block font-sans">Stop Loss</span>
                <strong className="text-rose-400 text-xs">₹{journey.stopLoss.toFixed(2)}</strong>
                <span className="text-[9px] text-slate-400 block mt-0.5 font-sans">
                  {journey.latestPrice < journey.stopLoss ? '🔴 Breached' : '🛡️ Safe'}
                </span>
              </div>
            </div>

            {/* Fetch Timeline Chips */}
            {journey.fetchSnapshots.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>Fetch Timeline History ({journey.fetchSnapshots.length} Fetches Logged)</span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {journey.fetchSnapshots.map((snap, idx) => {
                    const isSnapGreen = snap.pnlFromTriggerPct >= 0;
                    return (
                      <div
                        key={`${snap.timeStr}-${idx}`}
                        className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[10px] font-mono flex items-center gap-1.5"
                      >
                        <span className="text-slate-400 font-sans">{snap.timeStr}:</span>
                        <strong className="text-white">₹{snap.price.toFixed(1)}</strong>
                        <span className={`font-bold ${isSnapGreen ? 'text-emerald-400' : 'text-rose-400'}`}>
                          ({isSnapGreen ? '+' : ''}{snap.pnlFromTriggerPct.toFixed(1)}%)
                        </span>
                        {snap.rsi && <span className="text-slate-400">RSI:{snap.rsi.toFixed(0)}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* BTST & STBT Gap Prediction Ribbon */}
        {btstPrediction && (
          <div
            className={`mt-4 p-4 rounded-2xl border shadow-sm ${
              btstPrediction.predictedDirection === 'GAP_UP'
                ? 'bg-emerald-950/90 text-white border-emerald-500/40'
                : 'bg-rose-950/90 text-white border-rose-500/40'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span
                  className={`p-1.5 rounded-lg ${
                    btstPrediction.predictedDirection === 'GAP_UP'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-rose-500/20 text-rose-300'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                </span>
                <div>
                  <div className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                    <span>🌙 BTST Gap Prediction</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black ${
                        btstPrediction.predictedDirection === 'GAP_UP'
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-rose-500 text-white'
                      }`}
                    >
                      {btstPrediction.predictedDirection === 'GAP_UP' ? '🚀 GAP UP EXPECTED' : '🔻 GAP DOWN EXPECTED'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5">
                    Expected Gap: <strong className="text-white">{btstPrediction.expectedGapPctMin}% to {btstPrediction.expectedGapPctMax}%</strong> • AI Conviction: <strong className="text-amber-400">{btstPrediction.convictionScore}%</strong>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] text-slate-300">Recommended Contract</div>
                <div className="text-xs font-bold font-mono text-amber-300">
                  {btstPrediction.optionsStrategy.recommendedContract}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 text-center text-xs">
              <div className="bg-black/30 p-2 rounded-lg">
                <span className="text-[9.5px] text-slate-400 block">Entry Window</span>
                <strong className="text-white text-[11px]">3:15 – 3:28 PM</strong>
              </div>
              <div className="bg-black/30 p-2 rounded-lg">
                <span className="text-[9.5px] text-slate-400 block">Morning Target Open</span>
                <strong className="text-emerald-300 text-xs">₹{btstPrediction.cashStrategy.targetOpenPrice.toFixed(2)}</strong>
              </div>
              <div className="bg-black/30 p-2 rounded-lg">
                <span className="text-[9.5px] text-slate-400 block">Overnight SL</span>
                <strong className="text-rose-300 text-xs">₹{btstPrediction.cashStrategy.overnightStopLoss.toFixed(2)}</strong>
              </div>
              <div className="bg-black/30 p-2 rounded-lg">
                <span className="text-[9.5px] text-slate-400 block">Est. Profit / Lot</span>
                <strong className="text-emerald-300 text-xs">+₹{btstPrediction.optionsStrategy.estProfitPerLot.toLocaleString('en-IN')}</strong>
              </div>
            </div>

            <div className="mt-3 p-2.5 bg-black/40 rounded-xl border border-white/10 text-xs text-slate-200">
              <span className="text-amber-300 font-bold">Thesis:</span> {btstPrediction.aiThesis}
            </div>
          </div>
        )}

        {/* ⏳ Ideal Time for that Stock by Analysing Whole History */}
        <div className="mt-4">
          <StockTimingHistoryAnalysis stock={stock} tradeJourney={journey} />
        </div>

        {/* 15-Min Candle & Primary Result Banner */}
        <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="text-xs font-bold uppercase text-blue-700 mb-3 flex items-center justify-between">
            <span>First 15-Min Candle Data & Calculated Values</span>
            <span className="text-[11px] text-slate-500 font-mono">
              {stock.candleTimestamp || '09:15 - 09:30 AM IST'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center mb-4">
            <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
              <div className="text-[10px] text-slate-500 uppercase font-semibold">15-Min Open</div>
              <div className="text-xs font-mono font-bold text-slate-900 mt-0.5">
                {stock.openPrice ? `₹${stock.openPrice.toFixed(2)}` : 'N/A'}
              </div>
            </div>

            <div className="bg-emerald-50/70 p-2 rounded-lg border border-emerald-200/80">
              <div className="text-[10px] text-emerald-800 font-bold uppercase">15-Min Low</div>
              <div className="text-xs font-mono font-extrabold text-emerald-900 mt-0.5">
                {stock.first15mLow ? `₹${stock.first15mLow.toFixed(2)}` : stock.lowPrice ? `₹${stock.lowPrice.toFixed(2)}` : 'N/A'}
              </div>
            </div>

            <div className="bg-rose-50/70 p-2 rounded-lg border border-rose-200/80">
              <div className="text-[10px] text-rose-800 font-bold uppercase">15-Min High</div>
              <div className="text-xs font-mono font-extrabold text-rose-900 mt-0.5">
                {stock.first15mHigh ? `₹${stock.first15mHigh.toFixed(2)}` : stock.highPrice ? `₹${stock.highPrice.toFixed(2)}` : 'N/A'}
              </div>
            </div>

            <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
              <div className="text-[10px] text-slate-500 uppercase font-semibold">15-Min Close</div>
              <div className="text-xs font-mono font-bold text-slate-900 mt-0.5">
                {stock.closePrice ? `₹${stock.closePrice.toFixed(2)}` : 'N/A'}
              </div>
            </div>

            <div className="bg-blue-50/70 p-2 rounded-lg border border-blue-200/80">
              <div className="text-[10px] text-blue-700 font-bold uppercase">Open Calc</div>
              <div className="text-xs font-mono font-extrabold text-blue-700 mt-0.5">
                {stock.openCalc !== undefined && stock.openCalc !== null ? stock.openCalc.toFixed(4) : 'N/A'}
              </div>
            </div>

            <div className="bg-blue-50/70 p-2 rounded-lg border border-blue-200/80">
              <div className="text-[10px] text-blue-700 font-bold uppercase">Close Calc</div>
              <div className="text-xs font-mono font-extrabold text-blue-700 mt-0.5">
                {stock.closeCalc !== undefined && stock.closeCalc !== null ? stock.closeCalc.toFixed(4) : 'N/A'}
              </div>
            </div>

            <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
              <div className="text-[10px] text-slate-500 uppercase font-semibold">15-Min Volume</div>
              <div className="text-xs font-mono font-bold text-slate-900 mt-0.5">
                {stock.volume ? stock.volume.toLocaleString('en-IN') : 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* Confluence Technical Indicators (Square Root + RSI + VWAP) */}
        <div className="mt-4 p-4 bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 shadow-sm">
          <div className="text-xs font-bold uppercase text-indigo-300 mb-3 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-400" /> Technical Confluence Matrix
            </span>
            <span className="text-[10px] text-slate-400 font-normal">Square Root + RSI + Intraday VWAP</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
            {/* Square Root Signal */}
            <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">1. Square Root Level</div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-xs text-slate-300">Buy/Sell Level</span>
                <span className={`text-xs font-bold font-mono ${
                  stock.closePrice && stock.buyAbove && stock.closePrice >= stock.buyAbove
                    ? 'text-emerald-400'
                    : stock.closePrice && stock.sellBelow && stock.closePrice <= stock.sellBelow
                    ? 'text-rose-400'
                    : 'text-amber-400'
                }`}>
                  {stock.closePrice && stock.buyAbove && stock.closePrice >= stock.buyAbove
                    ? 'Breakout Above Buy'
                    : stock.closePrice && stock.sellBelow && stock.closePrice <= stock.sellBelow
                    ? 'Breakdown Below Sell'
                    : 'In Range'}
                </span>
              </div>
            </div>

            {/* RSI Level */}
            <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
              <div className="flex items-center justify-between">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">2. RSI Indicator (14)</div>
                {onOpenRsiAnalyst && (
                  <button
                    onClick={() => onOpenRsiAnalyst(stock)}
                    className="text-[10px] font-black text-amber-300 hover:text-amber-200 bg-amber-500/20 hover:bg-amber-500/30 px-2 py-0.5 rounded border border-amber-500/30 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-2.5 h-2.5" /> Analyze 09:15-Now RSI
                  </button>
                )}
              </div>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-xs text-slate-300 font-mono">
                  {stock.rsi !== undefined && stock.rsi !== null ? `RSI ${stock.rsi.toFixed(1)}` : 'RSI N/A'}
                </span>
                <span className={`text-xs font-bold ${
                  stock.rsi !== undefined && stock.rsi !== null && stock.rsi > 50
                    ? 'text-emerald-400'
                    : stock.rsi !== undefined && stock.rsi !== null && stock.rsi < 50
                    ? 'text-rose-400'
                    : 'text-slate-400'
                }`}>
                  {stock.rsi !== undefined && stock.rsi !== null
                    ? stock.rsi > 50 ? 'Bullish (>50)' : 'Bearish (<50)'
                    : 'N/A'}
                </span>
              </div>
            </div>

            {/* VWAP Level */}
            <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">3. Intraday VWAP</div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-xs font-mono text-slate-300">
                  {stock.vwap ? `₹${stock.vwap.toFixed(2)}` : 'VWAP N/A'}
                </span>
                <span className={`text-xs font-extrabold px-2 py-0.5 rounded ${
                  stock.vwapStatus === 'Above'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : stock.vwapStatus === 'Below'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    : 'bg-slate-700 text-slate-300'
                }`}>
                  {stock.vwapStatus === 'Above' ? 'Above 🟢' : stock.vwapStatus === 'Below' ? 'Below 🔴' : 'At 🟡'}
                </span>
              </div>
            </div>

            {/* ADX Trend Strength */}
            <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">4. ADX Strength (14)</div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-xs font-mono text-slate-300">
                  {stock.adx !== undefined && stock.adx !== null ? `ADX ${stock.adx.toFixed(1)}` : 'ADX N/A'}
                </span>
                <span className={`text-xs font-extrabold px-2 py-0.5 rounded ${
                  stock.adx !== undefined && stock.adx !== null && stock.adx > 21
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                    : 'bg-slate-700 text-slate-300'
                }`}>
                  {stock.adx !== undefined && stock.adx !== null
                    ? stock.adx > 21 ? 'Strong (>21) ⚡' : 'Weak (<21)'
                    : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Square of 9 Trade Signals */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Buy Above */}
          <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200/80 flex items-center justify-between shadow-2xs">
            <div>
              <div className="text-[11px] font-bold uppercase text-emerald-800 flex items-center gap-1">
                <ArrowUpRight className="w-4 h-4 text-emerald-600" /> Buy Above Level (+45°)
              </div>
              <div className="text-xs text-emerald-700/80 mt-0.5">Trigger for long positions</div>
            </div>
            <div className="text-lg font-mono font-extrabold text-emerald-800">
              {stock.buyAbove ? `₹${stock.buyAbove.toFixed(2)}` : 'N/A'}
            </div>
          </div>

          {/* Sell Below */}
          <div className="bg-rose-50/70 p-3.5 rounded-xl border border-rose-200/80 flex items-center justify-between shadow-2xs">
            <div>
              <div className="text-[11px] font-bold uppercase text-rose-800 flex items-center gap-1">
                <ArrowDownRight className="w-4 h-4 text-rose-600" /> Sell Below Level (-45°)
              </div>
              <div className="text-xs text-rose-700/80 mt-0.5">Trigger for short positions</div>
            </div>
            <div className="text-lg font-mono font-extrabold text-rose-800">
              {stock.sellBelow ? `₹${stock.sellBelow.toFixed(2)}` : 'N/A'}
            </div>
          </div>
        </div>

        {/* Targets Table */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Bullish Targets */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="text-xs font-bold text-emerald-700 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> Bullish Upward Targets (Angles)
              </span>
            </div>
            <div className="space-y-1.5 text-xs">
              {stock.targetsUp?.map((tgt, idx) => {
                const degrees = [90, 135, 180, 225, 270, 360][idx];
                return (
                  <div key={idx} className="flex items-center justify-between p-1.5 bg-white rounded font-mono border border-slate-200 shadow-2xs">
                    <span className="text-slate-500 text-[11px]">Target T{idx + 1} ({degrees}°)</span>
                    <span className="font-bold text-emerald-700">₹{tgt.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bearish Targets */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="text-xs font-bold text-rose-700 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5" /> Bearish Downward Targets (Angles)
              </span>
            </div>
            <div className="space-y-1.5 text-xs">
              {stock.targetsDown?.map((tgt, idx) => {
                const degrees = [90, 135, 180, 225, 270, 360][idx];
                return (
                  <div key={idx} className="flex items-center justify-between p-1.5 bg-white rounded font-mono border border-slate-200 shadow-2xs">
                    <span className="text-slate-500 text-[11px]">Target T{idx + 1} ({degrees}°)</span>
                    <span className="font-bold text-rose-700">₹{tgt.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Fibonacci Retracement Analysis Box */}
        {(() => {
          const cmp = stock.closePrice || stock.openPrice || 0;
          const fibData = calculateFibonacci382(stock.highPrice, stock.lowPrice, cmp, stock.symbol, stock.candleTimestamp);
          if (!fibData) return null;
          const retraceTime = stock.fib382Time || fibData.fib382Time || '09:45 AM';

          return (
            <div className="mt-4 p-3.5 bg-amber-50/80 rounded-xl border border-amber-200">
              <div className="flex items-center justify-between mb-2 flex-wrap gap-1.5">
                <div className="text-xs font-extrabold uppercase text-amber-900 flex items-center gap-1.5">
                  <Percent className="w-4 h-4 text-amber-600" /> Fibonacci Retracement Levels
                </div>
                {fibData.fibStatus === 'Retraced Yes' ? (
                  <span className="text-[10px] font-black text-amber-950 bg-amber-200/90 px-2.5 py-0.5 rounded-full border border-amber-300 shadow-2xs flex items-center gap-1">
                    ★ RETRACED: YES ({retraceTime})
                  </span>
                ) : fibData.fibStatus === 'Approaching 38.2%' ? (
                  <span className="text-[10px] font-extrabold text-sky-900 bg-sky-100 px-2.5 py-0.5 rounded-full border border-sky-300">
                    APPROACHING 38.2% ({retraceTime})
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-rose-800 bg-rose-100 px-2.5 py-0.5 rounded-full border border-rose-300">
                    NO RETRACEMENT
                  </span>
                )}
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div className="bg-white p-2.5 rounded-lg border border-amber-200/90 text-center shadow-2xs">
                  <span className="block text-[10px] text-amber-800 font-bold uppercase">Retraced Time</span>
                  <span className="text-xs font-mono font-black text-amber-900 bg-amber-100/70 px-1.5 py-0.5 rounded inline-block mt-0.5">
                    🕒 {retraceTime}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-amber-200/90 text-center shadow-2xs">
                  <span className="block text-[10px] text-amber-800 font-bold uppercase">38.2% Fib Support</span>
                  <span className="text-sm font-mono font-black text-amber-950">₹{fibData.fib382Bull.toFixed(2)}</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-amber-200/90 text-center shadow-2xs">
                  <span className="block text-[10px] text-amber-800 font-bold uppercase">50.0% Fib Midpoint</span>
                  <span className="text-sm font-mono font-black text-amber-950">₹{fibData.fib500Bull.toFixed(2)}</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-amber-200/90 text-center shadow-2xs">
                  <span className="block text-[10px] text-amber-800 font-bold uppercase">61.8% Golden Fib</span>
                  <span className="text-sm font-mono font-black text-amber-950">₹{fibData.fib618Bull.toFixed(2)}</span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* At-The-Money (ATM) Option Strikes */}
        {optionStrikes && (
          <div className="mt-4 p-3.5 bg-purple-50/70 rounded-xl border border-purple-200">
            <div className="flex items-center justify-between mb-2.5">
              <div className="text-xs font-extrabold uppercase text-purple-900 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-purple-700" /> At-The-Money (ATM) Option Strikes
              </div>
              <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full border border-purple-200">
                Strike Interval: {optionStrikes.step} Points
              </span>
            </div>

            {/* If Ideal Trade Exists for this Stock */}
            {(() => {
              const idealOption = evaluateIdealOptionTrade(stock, journey || undefined);
              if (!idealOption) return null;
              const isBull = idealOption.direction === 'BULLISH_CE';

              return (
                <div className={`mb-3 p-3 rounded-xl border-2 shadow-sm ${
                  isBull 
                    ? 'bg-emerald-950 text-white border-emerald-500/80' 
                    : 'bg-rose-950 text-white border-rose-500/80'
                }`}>
                  <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-amber-400 text-slate-950 font-mono flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5" /> IDEAL OPTION TO TRADE NOW
                      </span>
                      <strong className="text-sm sm:text-base font-black font-mono text-yellow-300">
                        {idealOption.recommendedOptionStrike}
                      </strong>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="text-emerald-300 font-bold bg-white/10 px-2 py-0.5 rounded">
                        {idealOption.convictionScore}% Win Probability
                      </span>
                      <span className="text-slate-300">
                        R:R {idealOption.riskRewardRatio}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2.5 text-xs font-mono">
                    <div className="bg-black/30 p-2 rounded-lg">
                      <span className="text-[10px] text-slate-300 block font-sans">Ideal Entry Range</span>
                      <strong className="text-white text-xs">{idealOption.optionEntryRange}</strong>
                    </div>
                    <div className="bg-emerald-900/60 p-2 rounded-lg text-emerald-200">
                      <span className="text-[10px] text-slate-300 block font-sans">Target 1 (+38%)</span>
                      <strong className="text-emerald-300 text-xs">₹{idealOption.optionTarget1.toFixed(2)}</strong>
                    </div>
                    <div className="bg-purple-900/60 p-2 rounded-lg text-purple-200">
                      <span className="text-[10px] text-slate-300 block font-sans">Target 2 (+78%)</span>
                      <strong className="text-yellow-300 text-xs">₹{idealOption.optionTarget2.toFixed(2)}</strong>
                    </div>
                    <div className="bg-rose-900/60 p-2 rounded-lg text-rose-200">
                      <span className="text-[10px] text-slate-300 block font-sans">Stop Loss (-28%)</span>
                      <strong className="text-rose-300 text-xs">₹{idealOption.optionStopLoss.toFixed(2)}</strong>
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-white/10 text-[11px] text-slate-300 flex items-center justify-between flex-wrap gap-2">
                    <span>Capital: <strong className="text-cyan-300 font-mono">₹{idealOption.capitalRequiredPerLot.toLocaleString()}</strong> ({idealOption.lotSize} qty/lot)</span>
                    <span className="text-amber-300 font-semibold">{idealOption.timingStatusLabel}</span>
                  </div>
                </div>
              );
            })()}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Call Options (CE) */}
              <div className="bg-white p-3 rounded-lg border border-emerald-200/80 shadow-2xs">
                <div className="text-[11px] font-bold text-emerald-800 uppercase flex items-center justify-between mb-1.5">
                  <span>2 Call Option (CE) Strikes</span>
                  <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-mono font-bold">BULLISH</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-emerald-50 border border-emerald-200 p-2 rounded-lg text-center">
                    <span className="block text-[9px] text-emerald-700 font-extrabold uppercase">ATM CE Strike</span>
                    <span className="text-sm font-mono font-black text-emerald-900">{formatStrikePrice(optionStrikes.ceStrikes[0])} CE</span>
                  </div>
                  <div className="flex-1 bg-emerald-50/50 border border-emerald-200/70 p-2 rounded-lg text-center">
                    <span className="block text-[9px] text-emerald-600 font-bold uppercase">ATM+1 CE Strike</span>
                    <span className="text-sm font-mono font-bold text-emerald-800">{formatStrikePrice(optionStrikes.ceStrikes[1])} CE</span>
                  </div>
                </div>
              </div>

              {/* Put Options (PE) */}
              <div className="bg-white p-3 rounded-lg border border-rose-200/80 shadow-2xs">
                <div className="text-[11px] font-bold text-rose-800 uppercase flex items-center justify-between mb-1.5">
                  <span>2 Put Option (PE) Strikes</span>
                  <span className="text-[9px] bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded font-mono font-bold">BEARISH</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-rose-50 border border-rose-200 p-2 rounded-lg text-center">
                    <span className="block text-[9px] text-rose-700 font-extrabold uppercase">ATM PE Strike</span>
                    <span className="text-sm font-mono font-black text-rose-900">{formatStrikePrice(optionStrikes.peStrikes[0])} PE</span>
                  </div>
                  <div className="flex-1 bg-rose-50/50 border border-rose-200/70 p-2 rounded-lg text-center">
                    <span className="block text-[9px] text-rose-600 font-bold uppercase">ATM-1 PE Strike</span>
                    <span className="text-sm font-mono font-bold text-rose-800">{formatStrikePrice(optionStrikes.peStrikes[1])} PE</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* F&O Lot Size & Contract Value Box */}
        <div className="mt-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-600" /> F&O Contract Lot Size Details
            </div>
            <div className="text-slate-500 text-[11px] mt-0.5">
              Lot sizes as listed in the Nifty F&O master CSV
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center bg-white p-1 rounded-lg border border-slate-200">
              {(['Jun', 'Jul', 'Aug'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setSelectedLotMonth(m)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                    selectedLotMonth === m
                      ? 'bg-blue-600 text-white font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {m} 2026
                </button>
              ))}
            </div>

            <div className="text-right font-mono">
              <div className="text-blue-700 font-bold">{lotSize ? `${lotSize} Qty` : 'N/A'}</div>
              <div className="text-[10px] text-slate-500">
                {contractValue ? `~₹${(contractValue / 100000).toFixed(2)} Lakhs` : ''}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            {onOpenRsiAnalyst && (
              <button
                onClick={() => {
                  onClose();
                  onOpenRsiAnalyst(stock);
                }}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black rounded-xl transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>AI RSI Analyst (09:15 - Current)</span>
              </button>
            )}

            {onOpenPositionSizer && (
              <button
                onClick={() => {
                  onClose();
                  onOpenPositionSizer(stock);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors flex items-center space-x-1.5 border border-slate-300 cursor-pointer"
              >
                <Calculator className="w-4 h-4 text-slate-600" />
                <span>Position Sizer</span>
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors shadow-sm cursor-pointer"
          >
            Close Breakdown
          </button>
        </div>

      </div>
    </div>
  );
};
