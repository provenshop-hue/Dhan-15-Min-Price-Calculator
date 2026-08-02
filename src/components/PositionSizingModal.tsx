import React, { useState, useEffect } from 'react';
import { X, Calculator, ShieldCheck, TrendingUp, TrendingDown, DollarSign, Target, Percent, ArrowRight, Check, AlertTriangle, Layers } from 'lucide-react';
import { StockCalculated } from '../types';

interface PositionSizingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedStock?: StockCalculated | null;
  allStocks?: StockCalculated[];
}

export const PositionSizingModal: React.FC<PositionSizingModalProps> = ({
  isOpen,
  onClose,
  selectedStock,
  allStocks = []
}) => {
  // Active Stock selection state
  const [currentStockId, setCurrentStockId] = useState<string>(selectedStock?.id || '');

  // Helper to determine accurate lot size from any active month column
  const getEffectiveLotSize = (stock?: StockCalculated | null): number => {
    if (!stock) return 1;
    return stock.lotSizeAug2026 || stock.lotSizeJul2026 || stock.lotSizeJun2026 || 1;
  };

  // Helper to extract true market price / CMP
  const getStockMarketPrice = (stock?: StockCalculated | null): number => {
    if (!stock) return 0;
    if (stock.closePrice && stock.closePrice > 0) return stock.closePrice;
    if (stock.openPrice && stock.openPrice > 0) return stock.openPrice;
    return 0;
  };

  // Sync selectedStock prop into currentStockId whenever modal opens or selectedStock changes
  useEffect(() => {
    if (isOpen) {
      if (selectedStock?.id) {
        setCurrentStockId(selectedStock.id);
      } else if (allStocks.length > 0 && !currentStockId) {
        setCurrentStockId(allStocks[0].id);
      }
    }
  }, [isOpen, selectedStock]);

  // Derived active stock object
  const activeStock = (currentStockId ? allStocks.find(s => s.id === currentStockId) : null) || selectedStock || null;

  // Account / Risk inputs
  const [accountCapital, setAccountCapital] = useState<string>(() => {
    return localStorage.getItem('gann_app_capital') || '100000';
  });
  const [riskType, setRiskType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [riskPercent, setRiskPercent] = useState<string>('1.0');
  const [riskAmountFixed, setRiskAmountFixed] = useState<string>('1000');

  // Trade setup inputs
  const [tradeDirection, setTradeDirection] = useState<'BUY' | 'SELL'>('BUY');
  const [entryPrice, setEntryPrice] = useState<string>('');
  const [stopLossPrice, setStopLossPrice] = useState<string>('');
  const [targetPrice, setTargetPrice] = useState<string>('');
  const [lotSize, setLotSize] = useState<string>('1');
  const [leverage, setLeverage] = useState<number>(5); // 5x for intraday MIS
  const [forceMinOneLot, setForceMinOneLot] = useState<boolean>(false);

  // Auto-populate when activeStock changes or modal opens
  useEffect(() => {
    if (!isOpen) return;
    if (activeStock) {
      const cmp = getStockMarketPrice(activeStock);
      const isBearish = activeStock.trend === 'Very Bearish' || activeStock.trend === 'Bearish';
      const isBuy = !isBearish;
      setTradeDirection(isBuy ? 'BUY' : 'SELL');

      // Default Entry: CMP (or Buy/Sell level if CMP not available)
      const entry = cmp > 0 ? cmp : (isBuy ? (activeStock.buyAbove || 100) : (activeStock.sellBelow || 100));

      // Default Stop Loss
      let sl = isBuy
        ? (activeStock.sellBelow && activeStock.sellBelow < entry ? activeStock.sellBelow : entry * 0.99)
        : (activeStock.buyAbove && activeStock.buyAbove > entry ? activeStock.buyAbove : entry * 1.01);

      // Default Target
      let target = isBuy
        ? (activeStock.targetsUp?.[0] || entry * 1.02)
        : (activeStock.targetsDown?.[0] || entry * 0.98);

      setEntryPrice(entry > 0 ? (Math.round(entry * 100) / 100).toFixed(2) : '');
      setStopLossPrice(sl > 0 ? (Math.round(sl * 100) / 100).toFixed(2) : '');
      setTargetPrice(target > 0 ? (Math.round(target * 100) / 100).toFixed(2) : '');
      setLotSize(String(getEffectiveLotSize(activeStock)));
      setForceMinOneLot(false);
    } else {
      if (!entryPrice) {
        setEntryPrice('1000.00');
        setStopLossPrice('990.00');
        setTargetPrice('1020.00');
        setLotSize('1');
      }
    }
  }, [activeStock?.id, isOpen]);

  // Save capital preference
  useEffect(() => {
    if (accountCapital) {
      localStorage.setItem('gann_app_capital', accountCapital);
    }
  }, [accountCapital]);

  if (!isOpen) return null;

  const numCapital = Math.max(0, parseFloat(accountCapital) || 0);
  const numEntry = Math.max(0, parseFloat(entryPrice) || 0);
  const numSL = Math.max(0, parseFloat(stopLossPrice) || 0);
  const numTarget = Math.max(0, parseFloat(targetPrice) || 0);
  const numLotSize = Math.max(1, parseInt(lotSize, 10) || 1);

  // Risk calculation
  const maxRiskAllowed = riskType === 'PERCENT' 
    ? (numCapital * (parseFloat(riskPercent) || 0)) / 100
    : (parseFloat(riskAmountFixed) || 0);

  // Distance to SL per share
  const riskPerShare = numEntry > 0 && numSL > 0 
    ? Math.abs(numEntry - numSL)
    : 0;

  const riskPctPerShare = numEntry > 0 ? (riskPerShare / numEntry) * 100 : 0;

  // Max raw quantity
  const rawQuantity = riskPerShare > 0 ? Math.floor(maxRiskAllowed / riskPerShare) : 0;

  // Calculate Lots if lotSize > 1
  let lotsCount = 0;
  let actualQuantity = rawQuantity;

  if (numLotSize > 1) {
    lotsCount = Math.floor(rawQuantity / numLotSize);
    if (lotsCount === 0 && forceMinOneLot) {
      lotsCount = 1;
    }
    actualQuantity = lotsCount * numLotSize;
  }

  const actualRiskExposure = actualQuantity * riskPerShare;
  const totalPositionValue = actualQuantity * numEntry;
  const marginRequiredMIS = leverage > 0 ? totalPositionValue / leverage : totalPositionValue;

  // Reward calculations
  const rewardPerShare = numEntry > 0 && numTarget > 0
    ? (tradeDirection === 'BUY' ? numTarget - numEntry : numEntry - numTarget)
    : 0;
  
  const potentialProfit = actualQuantity * Math.max(0, rewardPerShare);
  const rrRatio = riskPerShare > 0 && rewardPerShare > 0 ? (rewardPerShare / riskPerShare).toFixed(2) : null;

  // Target preset handler
  const applyRRTarget = (ratioMultiplier: number) => {
    if (numEntry > 0 && riskPerShare > 0) {
      let calculatedTarget = 0;
      if (tradeDirection === 'BUY') {
        calculatedTarget = numEntry + (riskPerShare * ratioMultiplier);
      } else {
        calculatedTarget = numEntry - (riskPerShare * ratioMultiplier);
      }
      setTargetPrice((Math.round(calculatedTarget * 100) / 100).toFixed(2));
    }
  };

  const activeCMP = getStockMarketPrice(activeStock);
  const activeLot = getEffectiveLotSize(activeStock);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl text-slate-800 relative max-h-[92vh] overflow-y-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-500/20">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                  Position Sizing & Risk Calculator
                </h3>
                <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                  Risk Management
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Calculate exact quantity, F&O lot sizes &amp; stop loss risk exposure before taking trade.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stock Selector (If stocks list provided) */}
        {allStocks.length > 0 && (
          <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2 flex-1">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider shrink-0">Select Stock:</span>
              <select
                value={currentStockId}
                onChange={(e) => setCurrentStockId(e.target.value)}
                className="w-full bg-white border border-slate-300 text-slate-900 font-bold text-xs rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Custom Stock / Index</option>
                {allStocks.map((s) => {
                  const cmp = getStockMarketPrice(s);
                  const lot = getEffectiveLotSize(s);
                  return (
                    <option key={s.id} value={s.id}>
                      {s.symbol} - {s.companyName} {cmp > 0 ? `| CMP: ₹${cmp.toFixed(2)}` : ''} | Lot: {lot}
                    </option>
                  );
                })}
              </select>
            </div>

            {activeStock && (
              <div className="flex items-center space-x-2 text-xs font-mono font-bold shrink-0">
                <span className="text-slate-500">CMP:</span>
                <span className="text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded font-extrabold">
                  ₹{activeCMP > 0 ? activeCMP.toFixed(2) : 'N/A'}
                </span>
                <span className="text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded font-extrabold">
                  Lot: {activeLot}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Core Form Grid */}
        <div className="mt-4 space-y-4">
          
          {/* Section 1: Account & Risk Setup */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                1. Account Capital & Risk Parameters
              </span>
              <span className="text-[11px] text-slate-500">
                Max Allowed Risk: <strong className="text-rose-600">₹{maxRiskAllowed.toFixed(2)}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Capital Input */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Total Trading Capital (₹)
                </label>
                <input
                  type="number"
                  value={accountCapital}
                  onChange={(e) => setAccountCapital(e.target.value)}
                  placeholder="100000"
                  className="w-full bg-white border border-slate-300 focus:ring-2 focus:ring-blue-500 rounded-lg px-3 py-1.5 text-sm font-mono font-bold text-slate-900 outline-none"
                />
              </div>

              {/* Risk Type Selector & Input */}
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-600">
                    Risk per Trade
                  </label>
                  <div className="flex bg-slate-200 p-0.5 rounded-md text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setRiskType('PERCENT')}
                      className={`px-2 py-0.5 rounded ${riskType === 'PERCENT' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
                    >
                      Risk %
                    </button>
                    <button
                      type="button"
                      onClick={() => setRiskType('FIXED')}
                      className={`px-2 py-0.5 rounded ${riskType === 'FIXED' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
                    >
                      Fixed Amount (₹)
                    </button>
                  </div>
                </div>

                {riskType === 'PERCENT' ? (
                  <div className="space-y-1.5">
                    <div className="relative">
                      <input
                        type="number"
                        step="0.25"
                        value={riskPercent}
                        onChange={(e) => setRiskPercent(e.target.value)}
                        placeholder="1.0"
                        className="w-full bg-white border border-slate-300 focus:ring-2 focus:ring-blue-500 rounded-lg px-3 py-1.5 text-sm font-mono font-bold text-slate-900 outline-none pr-8"
                      />
                      <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">%</span>
                    </div>
                    {/* Quick Risk Buttons */}
                    <div className="flex items-center space-x-1">
                      {['0.5', '1.0', '1.5', '2.0'].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setRiskPercent(p)}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded border transition-colors ${
                            riskPercent === p
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {p}%
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <input
                      type="number"
                      step="100"
                      value={riskAmountFixed}
                      onChange={(e) => setRiskAmountFixed(e.target.value)}
                      placeholder="1000"
                      className="w-full bg-white border border-slate-300 focus:ring-2 focus:ring-blue-500 rounded-lg px-3 py-1.5 text-sm font-mono font-bold text-slate-900 outline-none"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Trade Execution Setup */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Target className="w-4 h-4 text-blue-600" />
                2. Trade Setup &amp; Price Levels
              </span>
              
              {/* Direction Toggle */}
              <div className="flex bg-slate-200 p-0.5 rounded-lg text-xs font-extrabold">
                <button
                  type="button"
                  onClick={() => setTradeDirection('BUY')}
                  className={`px-3 py-1 rounded-md transition-all flex items-center space-x-1 ${
                    tradeDirection === 'BUY'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>BUY (Long)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTradeDirection('SELL')}
                  className={`px-3 py-1 rounded-md transition-all flex items-center space-x-1 ${
                    tradeDirection === 'SELL'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>SELL (Short)</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Entry Price */}
              <div>
                <label className="block text-[11px] font-bold text-blue-800 mb-1">
                  Entry Price (₹)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-white border border-slate-300 focus:ring-2 focus:ring-blue-500 rounded-lg px-3 py-1.5 text-sm font-mono font-bold text-slate-900 outline-none"
                />
                
                {/* Entry Presets */}
                <div className="flex items-center space-x-1 mt-1 flex-wrap gap-y-1">
                  {activeCMP > 0 && (
                    <button
                      type="button"
                      onClick={() => setEntryPrice(activeCMP.toFixed(2))}
                      className="px-1.5 py-0.2 text-[9px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100"
                    >
                      CMP: ₹{activeCMP.toFixed(1)}
                    </button>
                  )}
                  {tradeDirection === 'BUY' && activeStock?.buyAbove && activeStock.buyAbove > 0 && (
                    <button
                      type="button"
                      onClick={() => setEntryPrice((Math.round(activeStock.buyAbove! * 100) / 100).toFixed(2))}
                      className="px-1.5 py-0.2 text-[9px] font-bold bg-white text-emerald-800 border border-emerald-300 rounded hover:bg-emerald-50"
                    >
                      Gann Buy: ₹{activeStock.buyAbove.toFixed(1)}
                    </button>
                  )}
                  {tradeDirection === 'SELL' && activeStock?.sellBelow && activeStock.sellBelow > 0 && (
                    <button
                      type="button"
                      onClick={() => setEntryPrice((Math.round(activeStock.sellBelow! * 100) / 100).toFixed(2))}
                      className="px-1.5 py-0.2 text-[9px] font-bold bg-white text-rose-800 border border-rose-300 rounded hover:bg-rose-50"
                    >
                      Gann Sell: ₹{activeStock.sellBelow.toFixed(1)}
                    </button>
                  )}
                </div>
              </div>

              {/* Stop Loss Price */}
              <div>
                <label className="block text-[11px] font-bold text-rose-800 mb-1">
                  Stop Loss Price (₹)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={stopLossPrice}
                  onChange={(e) => setStopLossPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-white border border-slate-300 focus:ring-2 focus:ring-rose-500 rounded-lg px-3 py-1.5 text-sm font-mono font-bold text-slate-900 outline-none"
                />
                {riskPerShare > 0 ? (
                  <span className="text-[10px] text-rose-600 font-mono font-bold block mt-0.5">
                    Risk: ₹{riskPerShare.toFixed(2)} ({riskPctPerShare.toFixed(2)}%)
                  </span>
                ) : (
                  <div className="flex items-center space-x-1 mt-1 flex-wrap gap-y-1">
                    {tradeDirection === 'BUY' && activeStock?.sellBelow && activeStock.sellBelow > 0 && (
                      <button
                        type="button"
                        onClick={() => setStopLossPrice((Math.round(activeStock.sellBelow! * 100) / 100).toFixed(2))}
                        className="px-1.5 py-0.2 text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200 rounded hover:bg-rose-100"
                      >
                        Gann SL: ₹{activeStock.sellBelow.toFixed(1)}
                      </button>
                    )}
                    {tradeDirection === 'SELL' && activeStock?.buyAbove && activeStock.buyAbove > 0 && (
                      <button
                        type="button"
                        onClick={() => setStopLossPrice((Math.round(activeStock.buyAbove! * 100) / 100).toFixed(2))}
                        className="px-1.5 py-0.2 text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200 rounded hover:bg-rose-100"
                      >
                        Gann SL: ₹{activeStock.buyAbove.toFixed(1)}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Target Price */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-emerald-800">
                    Target Price (₹)
                  </label>
                  {rrRatio && (
                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                      R:R = 1:{rrRatio}
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  step="0.05"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-white border border-slate-300 focus:ring-2 focus:ring-emerald-500 rounded-lg px-3 py-1.5 text-sm font-mono font-bold text-slate-900 outline-none"
                />
                {/* R:R Presets */}
                <div className="flex items-center space-x-1 mt-1">
                  <span className="text-[9px] text-slate-400 uppercase font-bold">R:R:</span>
                  {[1, 1.5, 2, 3].map((multiplier) => (
                    <button
                      key={multiplier}
                      type="button"
                      onClick={() => applyRRTarget(multiplier)}
                      className="px-1.5 py-0.2 text-[9px] font-bold bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-50 rounded"
                    >
                      1:{multiplier}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* F&O Lot Size & Margin Multiplier */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/60">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-600">
                    F&O Lot Size (1 = Cash Equity)
                  </label>
                  {activeLot > 1 && (
                    <button
                      type="button"
                      onClick={() => setLotSize(String(activeLot))}
                      className="text-[9px] font-extrabold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-1.5 py-0.2 rounded"
                    >
                      Reset Stock Lot: {activeLot}
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  value={lotSize}
                  onChange={(e) => setLotSize(e.target.value)}
                  placeholder="1"
                  className="w-full bg-white border border-slate-300 focus:ring-2 focus:ring-blue-500 rounded-lg px-3 py-1.5 text-sm font-mono font-bold text-slate-900 outline-none"
                />
                <div className="flex items-center space-x-1 mt-1">
                  <span className="text-[9px] text-slate-400 font-bold uppercase">Presets:</span>
                  <button
                    type="button"
                    onClick={() => setLotSize('1')}
                    className={`px-1.5 py-0.2 text-[9px] font-bold border rounded ${lotSize === '1' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                  >
                    1 (Cash)
                  </button>
                  {activeLot > 1 && (
                    <button
                      type="button"
                      onClick={() => setLotSize(String(activeLot))}
                      className={`px-1.5 py-0.2 text-[9px] font-bold border rounded ${lotSize === String(activeLot) ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-purple-800 border-purple-300 hover:bg-purple-50'}`}
                    >
                      {activeLot} (F&O Lot)
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Product / Margin Requirement
                </label>
                <select
                  value={leverage}
                  onChange={(e) => setLeverage(parseFloat(e.target.value))}
                  className="w-full bg-white border border-slate-300 focus:ring-2 focus:ring-blue-500 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-900 outline-none"
                >
                  <option value={1}>1x - Delivery / CNC / F&O Futures (100% Margin)</option>
                  <option value={5}>5x - Intraday MIS (Equity 20% Margin)</option>
                  <option value={4}>4x - Intraday Bracket / Cover Order (25% Margin)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Calculated Position Output Card */}
          <div className="p-4 bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-2xl border border-slate-800 shadow-xl space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Calculator className="w-4 h-4" />
                RECOMMENDED POSITION SIZE
              </span>
              <span className="text-xs font-mono font-bold text-slate-300">
                Direction: <strong className={tradeDirection === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}>{tradeDirection}</strong>
              </span>
            </div>

            {/* Validation checks */}
            {(numEntry <= 0 || numSL <= 0 || (tradeDirection === 'BUY' && numSL >= numEntry) || (tradeDirection === 'SELL' && numSL <= numEntry)) ? (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
                <span>
                  Please enter valid Entry &amp; Stop Loss prices. For BUY, Stop Loss must be lower than Entry. For SELL, Stop Loss must be higher.
                </span>
              </div>
            ) : (
              <div className="space-y-3">
                
                {/* Notice if allowed risk is lower than 1 lot risk */}
                {numLotSize > 1 && rawQuantity < numLotSize && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                      <span>
                        Allowed risk (₹{maxRiskAllowed.toFixed(0)}) is lower than 1 Lot risk exposure (₹{(numLotSize * riskPerShare).toFixed(0)}).
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setForceMinOneLot(!forceMinOneLot)}
                      className={`px-2.5 py-1 text-[10px] font-extrabold rounded-lg transition-colors shrink-0 ${
                        forceMinOneLot ? 'bg-amber-400 text-slate-950 font-black' : 'bg-slate-800 text-amber-300 border border-amber-500/40 hover:bg-slate-700'
                      }`}
                    >
                      {forceMinOneLot ? '1 Lot Enforced' : 'Take 1 Lot Anyway'}
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* 1. Recommended Shares / Lots */}
                  <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {numLotSize > 1 ? 'Total Lots' : 'Total Shares'}
                    </span>
                    <div className="text-2xl font-black text-amber-400 font-mono mt-0.5">
                      {numLotSize > 1 ? `${lotsCount} Lots` : `${actualQuantity} Qty`}
                    </div>
                    {numLotSize > 1 && (
                      <span className="text-[10px] text-slate-300 font-mono block mt-0.5">
                        = {actualQuantity} Total Shares ({numLotSize} per Lot)
                      </span>
                    )}
                  </div>

                  {/* 2. Actual Risk Exposure */}
                  <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Total Risk Exposure
                    </span>
                    <div className="text-xl font-black text-rose-400 font-mono mt-0.5">
                      ₹{actualRiskExposure.toFixed(2)}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                      {numCapital > 0 ? `${((actualRiskExposure / numCapital) * 100).toFixed(2)}% of Capital` : ''}
                    </span>
                  </div>

                  {/* 3. Margin Required */}
                  <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Capital Required
                    </span>
                    <div className="text-xl font-black text-blue-400 font-mono mt-0.5">
                      ₹{marginRequiredMIS.toFixed(2)}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                      Full Value: ₹{totalPositionValue.toFixed(2)}
                    </span>
                  </div>

                  {/* 4. Potential Reward */}
                  <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Potential Profit
                    </span>
                    <div className="text-xl font-black text-emerald-400 font-mono mt-0.5">
                      {potentialProfit > 0 ? `+₹${potentialProfit.toFixed(2)}` : 'N/A'}
                    </div>
                    <span className="text-[10px] text-emerald-300/80 font-mono block mt-0.5">
                      {rrRatio ? `R:R = 1:${rrRatio}` : 'Set Target Price'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Warning if Margin > Capital */}
            {marginRequiredMIS > numCapital && numCapital > 0 && (
              <div className="p-2.5 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 text-[11px] flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>
                  <strong>Insufficient Capital:</strong> Required margin (₹{marginRequiredMIS.toFixed(0)}) exceeds total account capital (₹{numCapital.toFixed(0)}). Consider reducing risk % or adding capital.
                </span>
              </div>
            )}

          </div>

        </div>

        {/* Action Buttons */}
        <div className="mt-5 flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors"
          >
            Close Calculator
          </button>
        </div>

      </div>
    </div>
  );
};
