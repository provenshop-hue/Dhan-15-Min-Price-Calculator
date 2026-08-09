import React, { useState } from 'react';
import { X, ExternalLink, TrendingUp, TrendingDown, Shield, Target, Award, ArrowUpRight, ArrowDownRight, Layers, ShieldCheck, Calculator, Percent, Sparkles } from 'lucide-react';
import { StockCalculated } from '../types';
import { getAtmOptionStrikes, calculateFibonacci382, isOpenLowPattern, isOpenHighPattern } from '../utils/gann';

interface StockDetailModalProps {
  stock: StockCalculated | null;
  onClose: () => void;
  onOpenPositionSizer?: (stock?: StockCalculated) => void;
  onOpenRsiAnalyst?: (stock: StockCalculated) => void;
}

export const StockDetailModal: React.FC<StockDetailModalProps> = ({ stock, onClose, onOpenPositionSizer, onOpenRsiAnalyst }) => {
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

  const isOpenLow = (stock.openPrice !== undefined && stock.openPrice !== null)
    ? isOpenLowPattern(stock.openPrice, stock.lowPrice, stock.first15mLow)
    : Boolean(stock.isOpenEqualLow);
  const isOpenHigh = (stock.openPrice !== undefined && stock.openPrice !== null)
    ? isOpenHighPattern(stock.openPrice, stock.highPrice, stock.first15mHigh)
    : Boolean(stock.isOpenEqualHigh);

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
          <div className="mt-4 p-3 bg-emerald-50 border-2 border-emerald-500 rounded-xl flex items-center justify-between text-emerald-900 shadow-sm">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-emerald-600 text-white rounded-lg">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                  <span>🟢 OPEN = LOW PATTERN DETECTED</span>
                  <span className="bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded text-[10px]">High Accuracy</span>
                </div>
                <p className="text-xs text-emerald-700 mt-0.5 font-medium">
                  Opening price (₹{stock.openPrice?.toFixed(2)}) is equal to Low (₹{stock.lowPrice?.toFixed(2) || stock.openPrice?.toFixed(2)}). Buyers defended opening price from 09:15 AM.
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono font-bold bg-emerald-600 text-white px-2.5 py-1 rounded-lg">
                Bullish Setup
              </span>
            </div>
          </div>
        )}

        {isOpenHigh && (
          <div className="mt-4 p-3 bg-rose-50 border-2 border-rose-500 rounded-xl flex items-center justify-between text-rose-900 shadow-sm">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-rose-600 text-white rounded-lg">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-rose-800 flex items-center gap-1">
                  <span>🔴 OPEN = HIGH PATTERN DETECTED</span>
                  <span className="bg-rose-200 text-rose-900 px-1.5 py-0.2 rounded text-[10px]">High Accuracy</span>
                </div>
                <p className="text-xs text-rose-700 mt-0.5 font-medium">
                  Opening price (₹{stock.openPrice?.toFixed(2)}) is equal to High (₹{stock.highPrice?.toFixed(2) || stock.openPrice?.toFixed(2)}). Sellers dominated immediately at opening bell.
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono font-bold bg-rose-600 text-white px-2.5 py-1 rounded-lg">
                Bearish Setup
              </span>
            </div>
          </div>
        )}

        {/* 15-Min Candle & Gann Primary Result Banner */}
        <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="text-xs font-bold uppercase text-blue-700 mb-3 flex items-center justify-between">
            <span>First 15-Min Candle Data & Gann Calculations</span>
            <span className="text-[11px] text-slate-500 font-mono">
              {stock.candleTimestamp || '09:15 - 09:30 AM IST'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center mb-4">
            <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
              <div className="text-[10px] text-slate-500 uppercase font-semibold">15-Min Open</div>
              <div className="text-sm font-mono font-bold text-slate-900 mt-0.5">
                {stock.openPrice ? `₹${stock.openPrice.toFixed(2)}` : 'N/A'}
              </div>
            </div>

            <div className="bg-blue-50/70 p-2 rounded-lg border border-blue-200/80">
              <div className="text-[10px] text-blue-700 font-bold uppercase">Open Calc</div>
              <div className="text-sm font-mono font-extrabold text-blue-700 mt-0.5">
                {stock.openCalc !== undefined && stock.openCalc !== null ? stock.openCalc.toFixed(4) : 'N/A'}
              </div>
            </div>

            <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
              <div className="text-[10px] text-slate-500 uppercase font-semibold">15-Min Close</div>
              <div className="text-sm font-mono font-bold text-slate-900 mt-0.5">
                {stock.closePrice ? `₹${stock.closePrice.toFixed(2)}` : 'N/A'}
              </div>
            </div>

            <div className="bg-blue-50/70 p-2 rounded-lg border border-blue-200/80">
              <div className="text-[10px] text-blue-700 font-bold uppercase">Close Calc</div>
              <div className="text-sm font-mono font-extrabold text-blue-700 mt-0.5">
                {stock.closeCalc !== undefined && stock.closeCalc !== null ? stock.closeCalc.toFixed(4) : 'N/A'}
              </div>
            </div>

            <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
              <div className="text-[10px] text-slate-500 uppercase font-semibold">15-Min Volume</div>
              <div className="text-sm font-mono font-bold text-slate-900 mt-0.5">
                {stock.volume ? stock.volume.toLocaleString('en-IN') : 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* Confluence Technical Indicators (Gann + RSI + VWAP) */}
        <div className="mt-4 p-4 bg-slate-900 text-white rounded-xl border border-slate-800 shadow-md">
          <div className="text-xs font-bold uppercase text-blue-400 mb-3 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-400" /> Technical Confluence Matrix
            </span>
            <span className="text-[10px] text-slate-400 font-normal">Gann Square + RSI + Intraday VWAP</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
            {/* Gann Signal */}
            <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">1. Gann Square Level</div>
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
                    : 'In Gann Range'}
                </span>
              </div>
            </div>

            {/* RSI Level */}
            <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
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
            <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
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
            <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
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

        {/* Gann Square of 9 Trade Signals */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Buy Above */}
          <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase text-emerald-800 flex items-center gap-1">
                <ArrowUpRight className="w-4 h-4 text-emerald-600" /> Gann Buy Above Level (+45°)
              </div>
              <div className="text-xs text-emerald-700/80 mt-0.5">Trigger for long positions</div>
            </div>
            <div className="text-lg font-mono font-extrabold text-emerald-800">
              {stock.buyAbove ? `₹${stock.buyAbove.toFixed(2)}` : 'N/A'}
            </div>
          </div>

          {/* Sell Below */}
          <div className="bg-rose-50 p-3.5 rounded-xl border border-rose-200 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase text-rose-800 flex items-center gap-1">
                <ArrowDownRight className="w-4 h-4 text-rose-600" /> Gann Sell Below Level (-45°)
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
          const fibData = calculateFibonacci382(stock.highPrice, stock.lowPrice, cmp);
          if (!fibData) return null;
          return (
            <div className="mt-4 p-3.5 bg-amber-50/80 rounded-xl border border-amber-200">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-extrabold uppercase text-amber-900 flex items-center gap-1.5">
                  <Percent className="w-4 h-4 text-amber-600" /> Fibonacci Retracement Levels
                </div>
                {fibData.fibStatus === 'Retraced Yes' ? (
                  <span className="text-[10px] font-black text-amber-950 bg-amber-200/90 px-2.5 py-0.5 rounded-full border border-amber-300 shadow-2xs">
                    ★ RETRACED: YES (Touched & Returned Back)
                  </span>
                ) : fibData.fibStatus === 'Approaching 38.2%' ? (
                  <span className="text-[10px] font-extrabold text-sky-900 bg-sky-100 px-2.5 py-0.5 rounded-full border border-sky-300">
                    APPROACHING 38.2% (Has Not Reached Level)
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-rose-800 bg-rose-100 px-2.5 py-0.5 rounded-full border border-rose-300">
                    NO RETRACEMENT (Crossed 38.2%)
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2.5">
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
                    <span className="text-sm font-mono font-black text-emerald-900">{optionStrikes.ceStrikes[0]} CE</span>
                  </div>
                  <div className="flex-1 bg-emerald-50/50 border border-emerald-200/70 p-2 rounded-lg text-center">
                    <span className="block text-[9px] text-emerald-600 font-bold uppercase">ATM+1 CE Strike</span>
                    <span className="text-sm font-mono font-bold text-emerald-800">{optionStrikes.ceStrikes[1]} CE</span>
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
                    <span className="text-sm font-mono font-black text-rose-900">{optionStrikes.peStrikes[0]} PE</span>
                  </div>
                  <div className="flex-1 bg-rose-50/50 border border-rose-200/70 p-2 rounded-lg text-center">
                    <span className="block text-[9px] text-rose-600 font-bold uppercase">ATM-1 PE Strike</span>
                    <span className="text-sm font-mono font-bold text-rose-800">{optionStrikes.peStrikes[1]} PE</span>
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
