import React, { useState } from 'react';
import { Calculator, Info, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { calculateGann15Min } from '../utils/gann';

export const GannFormulaCard: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [testOpen, setTestOpen] = useState<number>(2500);
  const [testClose, setTestClose] = useState<number>(2525);

  const calc = calculateGann15Min(testOpen, testClose);

  return (
    <div className="bg-white border border-slate-200/80 rounded-xl p-4 text-slate-800 shadow-sm mb-6">
      <div 
        className="flex items-center justify-between cursor-pointer select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-50 rounded-lg border border-blue-200/60 text-blue-600">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>Gann 15-Minute Square Root Formula Reference</span>
              <span className="text-[10px] bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-full font-mono">
                Exact User Specified Formula
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Formula applied to first 15-min candle (09:15–09:30 AM IST) Open & Close prices
            </p>
          </div>
        </div>
        <button className="text-slate-400 hover:text-slate-700 transition-colors">
          {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {/* Formula Detail Cards */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Open Price Formula Box */}
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
          <div className="text-xs font-semibold text-blue-700 mb-1 flex items-center justify-between">
            <span>Open Price Gann Calculation</span>
            <span className="text-[10px] text-slate-500 font-mono">matchOpenPrice</span>
          </div>
          <code className="block bg-white text-slate-900 p-2 rounded text-xs font-mono border border-slate-200 overflow-x-auto shadow-2xs">
            ((Math.sqrt(matchOpenPrice) * 15) - 15) % 15
          </code>
        </div>

        {/* Close Price Formula Box */}
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
          <div className="text-xs font-semibold text-blue-700 mb-1 flex items-center justify-between">
            <span>Close Price Gann Calculation</span>
            <span className="text-[10px] text-slate-500 font-mono">matchClosePrice</span>
          </div>
          <code className="block bg-white text-slate-900 p-2 rounded text-xs font-mono border border-slate-200 overflow-x-auto shadow-2xs">
            ((Math.sqrt(matchClosePrice) * 15) - 15) % 15
          </code>
        </div>
      </div>

      {/* Expanded Interactive Example */}
      {isOpen && (
        <div className="mt-4 pt-4 border-t border-slate-200 text-xs text-slate-700 space-y-3">
          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="font-semibold text-blue-700 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-600" /> Live Interactive Calculation Test:
            </span>
            <div className="flex items-center space-x-3">
              <label className="flex items-center space-x-1">
                <span className="text-slate-500">Open:</span>
                <input
                  type="number"
                  value={testOpen}
                  onChange={(e) => setTestOpen(parseFloat(e.target.value) || 0)}
                  className="w-20 bg-white border border-slate-300 px-2 py-0.5 rounded text-slate-900 font-mono text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                />
              </label>
              <label className="flex items-center space-x-1">
                <span className="text-slate-500">Close:</span>
                <input
                  type="number"
                  value={testClose}
                  onChange={(e) => setTestClose(parseFloat(e.target.value) || 0)}
                  className="w-20 bg-white border border-slate-300 px-2 py-0.5 rounded text-slate-900 font-mono text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-center">
            <div className="bg-white p-2.5 rounded border border-slate-200 shadow-2xs">
              <div className="text-[11px] text-slate-500">Open Price</div>
              <div className="text-sm font-mono font-bold text-slate-900">₹{testOpen.toFixed(2)}</div>
            </div>
            <div className="bg-blue-50/60 p-2.5 rounded border border-blue-200/80">
              <div className="text-[11px] text-blue-700 font-medium">Open Gann Output</div>
              <div className="text-sm font-mono font-bold text-blue-700">{calc.openCalc.toFixed(4)}</div>
            </div>
            <div className="bg-white p-2.5 rounded border border-slate-200 shadow-2xs">
              <div className="text-[11px] text-slate-500">Close Price</div>
              <div className="text-sm font-mono font-bold text-slate-900">₹{testClose.toFixed(2)}</div>
            </div>
            <div className="bg-blue-50/60 p-2.5 rounded border border-blue-200/80">
              <div className="text-[11px] text-blue-700 font-medium">Close Gann Output</div>
              <div className="text-sm font-mono font-bold text-blue-700">{calc.closeCalc.toFixed(4)}</div>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 flex items-start space-x-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <Info className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
            <span>
              <strong>Note:</strong> Mathematical square root of Open or Close price is multiplied by 15, subtracted by 15, and the modulo 15 remainder is returned as the Gann Square Root value.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
