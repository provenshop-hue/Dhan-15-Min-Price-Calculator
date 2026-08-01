import React, { useState } from 'react';
import { X, ExternalLink, TrendingUp, TrendingDown, Shield, Target, Award, ArrowUpRight, ArrowDownRight, Layers } from 'lucide-react';
import { StockCalculated } from '../types';

interface StockDetailModalProps {
  stock: StockCalculated | null;
  onClose: () => void;
}

export const StockDetailModal: React.FC<StockDetailModalProps> = ({ stock, onClose }) => {
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

        {/* Close Button */}
        <div className="mt-6 text-right">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
          >
            Close Breakdown
          </button>
        </div>

      </div>
    </div>
  );
};
