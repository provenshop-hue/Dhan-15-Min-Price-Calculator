import React, { useState } from 'react';
import { X, Calculator, ArrowRight, TrendingUp, TrendingDown, Target, Shield, Check, ShieldCheck } from 'lucide-react';
import { calculateGann15Min } from '../utils/gann';
import { StockCalculated } from '../types';

interface ManualCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddManualStock: (stock: StockCalculated) => void;
  existingStock?: StockCalculated | null;
}

export const ManualCalculatorModal: React.FC<ManualCalculatorModalProps> = ({
  isOpen,
  onClose,
  onAddManualStock,
  existingStock
}) => {
  const [symbol, setSymbol] = useState(existingStock ? existingStock.symbol : 'RELIANCE');
  const [companyName, setCompanyName] = useState(existingStock ? existingStock.companyName : 'Reliance Industries');
  const [openPrice, setOpenPrice] = useState<string>(
    existingStock && existingStock.openPrice ? String(existingStock.openPrice) : '2950.00'
  );
  const [closePrice, setClosePrice] = useState<string>(
    existingStock && existingStock.closePrice ? String(existingStock.closePrice) : '2978.50'
  );
  const [highPrice, setHighPrice] = useState<string>(
    existingStock && existingStock.highPrice ? String(existingStock.highPrice) : '2985.00'
  );
  const [lowPrice, setLowPrice] = useState<string>(
    existingStock && existingStock.lowPrice ? String(existingStock.lowPrice) : '2950.00'
  );
  const [rsiVal, setRsiVal] = useState<string>(
    existingStock && existingStock.rsi !== undefined && existingStock.rsi !== null ? String(existingStock.rsi) : ''
  );
  const [vwapInput, setVwapInput] = useState<string>(
    existingStock && existingStock.vwap !== undefined && existingStock.vwap !== null ? String(existingStock.vwap) : ''
  );
  const [adxVal, setAdxVal] = useState<string>(
    existingStock && existingStock.adx !== undefined && existingStock.adx !== null ? String(existingStock.adx) : ''
  );

  if (!isOpen) return null;

  const numOpen = parseFloat(openPrice) || 0;
  const numClose = parseFloat(closePrice) || 0;
  const numHigh = highPrice.trim() !== '' ? parseFloat(highPrice) : undefined;
  const numLow = lowPrice.trim() !== '' ? parseFloat(lowPrice) : undefined;
  const numRsi = rsiVal.trim() !== '' ? parseFloat(rsiVal) : null;
  const numVwap = vwapInput.trim() !== '' ? parseFloat(vwapInput) : null;
  const numAdx = adxVal.trim() !== '' ? parseFloat(adxVal) : null;

  const calc = calculateGann15Min(numOpen, numClose, numRsi, numVwap, numHigh, numLow, 0.001, numAdx);

  const handleSetOpenLowPreset = () => {
    if (numOpen > 0) {
      setLowPrice(String(numOpen));
      if (parseFloat(highPrice) < numOpen) {
        setHighPrice(String(Math.max(numOpen, numClose)));
      }
    }
  };

  const handleSetOpenHighPreset = () => {
    if (numOpen > 0) {
      setHighPrice(String(numOpen));
      if (parseFloat(lowPrice) > numOpen) {
        setLowPrice(String(Math.min(numOpen, numClose)));
      }
    }
  };

  const handleSave = () => {
    if (numOpen <= 0 || numClose <= 0) return;

    const newStock: StockCalculated = {
      id: existingStock ? existingStock.id : `manual_${symbol}_${Date.now()}`,
      companyName: companyName || symbol,
      symbol: symbol.toUpperCase(),
      screenerUrl: existingStock ? existingStock.screenerUrl : `https://scanx.trade/company/${symbol.toLowerCase()}`,
      lotSizeJun2026: existingStock ? existingStock.lotSizeJun2026 : 500,
      lotSizeJul2026: existingStock ? existingStock.lotSizeJul2026 : 500,
      lotSizeAug2026: existingStock ? existingStock.lotSizeAug2026 : 500,
      openPrice: numOpen,
      closePrice: numClose,
      highPrice: numHigh,
      lowPrice: numLow,
      openCalc: calc.openCalc,
      closeCalc: calc.closeCalc,
      buyAbove: calc.buyAbove,
      sellBelow: calc.sellBelow,
      targetsUp: calc.targetsUp,
      targetsDown: calc.targetsDown,
      trend: calc.trend,
      pctChange: calc.pctChange,
      gannScore: calc.gannScore,
      rsi: numRsi,
      adx: calc.adx ?? numAdx,
      vwap: calc.vwap,
      vwapStatus: calc.vwapStatus,
      isOpenEqualLow: calc.isOpenEqualLow,
      isOpenEqualHigh: calc.isOpenEqualHigh,
      openLowDiffPct: calc.openLowDiffPct,
      openHighDiffPct: calc.openHighDiffPct,
      isFetched: true,
      isManual: true,
      candleTimestamp: '15-min Candle (Manual)'
    };

    onAddManualStock(newStock);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 shadow-xl text-slate-800 relative max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-50 rounded-xl border border-blue-200/60 text-blue-600">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Manual Gann 15-Min Entry</h3>
              <p className="text-xs text-slate-500">Enter stock symbol and first 15-minute Open and Close prices</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Inputs */}
        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Stock Symbol
              </label>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="e.g. INFY"
                className="w-full bg-white border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 rounded-xl px-3 py-2 text-sm text-slate-900 font-mono font-bold outline-none shadow-2xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Company Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Infosys Ltd"
                className="w-full bg-white border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none shadow-2xs"
              />
            </div>
          </div>

          {/* Quick Pattern Presets */}
          <div className="flex items-center space-x-2 pt-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Quick Presets:</span>
            <button
              type="button"
              onClick={handleSetOpenLowPreset}
              className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-black transition-colors flex items-center space-x-1"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Set Open = Low (Bullish)</span>
            </button>
            <button
              type="button"
              onClick={handleSetOpenHighPreset}
              className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 rounded-lg text-xs font-black transition-colors flex items-center space-x-1"
            >
              <Target className="w-3.5 h-3.5 text-rose-600" />
              <span>Set Open = High (Bearish)</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-blue-700 mb-1">
                15-Min Open (₹)
              </label>
              <input
                type="number"
                step="0.05"
                value={openPrice}
                onChange={(e) => setOpenPrice(e.target.value)}
                placeholder="0.00"
                className="w-full bg-white border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-sm font-mono font-bold text-slate-900 outline-none shadow-2xs"
              />
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-blue-700 mb-1">
                15-Min Close (₹)
              </label>
              <input
                type="number"
                step="0.05"
                value={closePrice}
                onChange={(e) => setClosePrice(e.target.value)}
                placeholder="0.00"
                className="w-full bg-white border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-sm font-mono font-bold text-slate-900 outline-none shadow-2xs"
              />
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                15-Min High (₹)
              </label>
              <input
                type="number"
                step="0.05"
                value={highPrice}
                onChange={(e) => setHighPrice(e.target.value)}
                placeholder="0.00"
                className="w-full bg-white border border-slate-300 focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 rounded-lg px-2.5 py-1.5 text-sm font-mono font-bold text-slate-900 outline-none shadow-2xs"
              />
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                15-Min Low (₹)
              </label>
              <input
                type="number"
                step="0.05"
                value={lowPrice}
                onChange={(e) => setLowPrice(e.target.value)}
                placeholder="0.00"
                className="w-full bg-white border border-slate-300 focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 rounded-lg px-2.5 py-1.5 text-sm font-mono font-bold text-slate-900 outline-none shadow-2xs"
              />
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-purple-700 mb-1">
                RSI (Optional)
              </label>
              <input
                type="number"
                step="0.1"
                value={rsiVal}
                onChange={(e) => setRsiVal(e.target.value)}
                placeholder="e.g. 58.5"
                className="w-full bg-white border border-slate-300 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 rounded-lg px-2.5 py-1.5 text-sm font-mono font-bold text-slate-900 outline-none shadow-2xs"
              />
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-emerald-700 mb-1">
                VWAP (Optional)
              </label>
              <input
                type="number"
                step="0.05"
                value={vwapInput}
                onChange={(e) => setVwapInput(e.target.value)}
                placeholder="e.g. 2960.00"
                className="w-full bg-white border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-sm font-mono font-bold text-slate-900 outline-none shadow-2xs"
              />
            </div>
          </div>

          {/* Gann Formula Live Calculated Output */}
          <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
                <Target className="w-4 h-4 text-blue-600" /> Gann Formula Live Results
              </span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                calc.trend === 'Bullish'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : calc.trend === 'Bearish'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}>
                {calc.trend === 'Bullish' && <TrendingUp className="w-3.5 h-3.5" />}
                {calc.trend === 'Bearish' && <TrendingDown className="w-3.5 h-3.5" />}
                <span>{calc.trend} Trend</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                <div className="text-[11px] text-slate-500 mb-1">Open Calculation:</div>
                <div className="text-lg font-mono font-extrabold text-blue-700">
                  {calc.openCalc.toFixed(4)}
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  ((√{numOpen} × 15) - 15) % 15
                </div>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                <div className="text-[11px] text-slate-500 mb-1">Close Calculation:</div>
                <div className="text-lg font-mono font-extrabold text-blue-700">
                  {calc.closeCalc.toFixed(4)}
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  ((√{numClose} × 15) - 15) % 15
                </div>
              </div>
            </div>

            {/* Trading Levels preview */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                <div className="text-[10px] uppercase font-bold text-emerald-700 mb-0.5">Buy Above (45°)</div>
                <div className="font-mono text-sm font-bold text-emerald-800">₹{calc.buyAbove.toFixed(2)}</div>
              </div>
              <div className="bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                <div className="text-[10px] uppercase font-bold text-rose-700 mb-0.5">Sell Below (-45°)</div>
                <div className="font-mono text-sm font-bold text-rose-800">₹{calc.sellBelow.toFixed(2)}</div>
              </div>
            </div>

          </div>

        </div>

        {/* Modal Actions */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={numOpen <= 0 || numClose <= 0}
            className="flex items-center space-x-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>Apply to Stock Table</span>
          </button>
        </div>

      </div>
    </div>
  );
};
