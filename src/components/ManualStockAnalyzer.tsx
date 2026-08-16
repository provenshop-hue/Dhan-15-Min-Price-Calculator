import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  RefreshCw,
  Calculator,
  Target,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Zap,
  CheckCircle,
  AlertTriangle,
  Flame,
  PieChart,
  Copy,
  Check,
  ExternalLink,
  Layers,
  ChevronRight,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Sliders,
  RotateCcw,
  Sparkles,
  Info,
  Calendar,
  DollarSign
} from 'lucide-react';
import { StockCalculated, DhanApiCredentials } from '../types';
import { calculateGann15Min, isOpenLowPattern, isOpenHighPattern, isHighClosePattern, calculateFibonacci382, getAtmOptionStrikes } from '../utils/gann';
import { is100PercentBullishMove, is100PercentBearishMove } from '../utils/rsiPullback';
import { getStockSector, computeAllSectorStrengths, evaluateStockSectorConfluence } from '../utils/sectorMaster';
import { buildTradeSetup } from '../utils/tenFifteenPicks';
import { formatStrikePrice } from '../utils/nseStrikeMaster';

interface ManualStockAnalyzerProps {
  stocks: StockCalculated[];
  credentials: DhanApiCredentials;
  onFetchSingleStock: (stock: StockCalculated) => Promise<void> | void;
  onUpdateStockInMaster: (stock: StockCalculated) => void;
  onOpenPositionSizer?: (stock: StockCalculated) => void;
  onOpenRsiAnalyst?: (stock: StockCalculated) => void;
  onOpenSettings?: () => void;
}

// Popular F&O benchmark stocks for quick chips
const POPULAR_SYMBOLS = [
  'RELIANCE',
  'HDFCBANK',
  'INFY',
  'TCS',
  'ICICIBANK',
  'SBIN',
  'TATAMOTORS',
  'BAJFINANCE',
  'LT',
  'AXISBANK',
  'BHARTIARTL',
  'MARUTI'
];

export const ManualStockAnalyzer: React.FC<ManualStockAnalyzerProps> = ({
  stocks,
  credentials,
  onFetchSingleStock,
  onUpdateStockInMaster,
  onOpenPositionSizer,
  onOpenRsiAnalyst,
  onOpenSettings
}) => {
  // Stock Selection & Search State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStockId, setSelectedStockId] = useState<string>(() => {
    return stocks.length > 0 ? stocks[0].id : '';
  });

  // Selected Stock
  const selectedStock = useMemo(() => {
    return stocks.find((s) => s.id === selectedStockId) || stocks[0] || null;
  }, [stocks, selectedStockId]);

  // Editable Form Inputs
  const [openPriceInput, setOpenPriceInput] = useState<string>('');
  const [closePriceInput, setClosePriceInput] = useState<string>('');
  const [highPriceInput, setHighPriceInput] = useState<string>('');
  const [lowPriceInput, setLowPriceInput] = useState<string>('');
  const [prevCloseInput, setPrevCloseInput] = useState<string>('');
  const [rsiInput, setRsiInput] = useState<string>('');
  const [vwapInput, setVwapInput] = useState<string>('');
  const [adxInput, setAdxInput] = useState<string>('');
  const [isFetchingDhan, setIsFetchingDhan] = useState<boolean>(false);
  const [dhanError, setDhanError] = useState<string | null>(null);
  const [copiedSetup, setCopiedSetup] = useState<boolean>(false);
  const [isSuccessSynced, setIsSuccessSynced] = useState<boolean>(false);
  const [selectedLotMonth, setSelectedLotMonth] = useState<'Jun' | 'Jul' | 'Aug'>('Jun');

  // Sync inputs whenever selected stock changes or its fetched data updates
  useEffect(() => {
    if (selectedStock) {
      setOpenPriceInput(selectedStock.openPrice !== undefined && selectedStock.openPrice !== null ? String(selectedStock.openPrice) : '');
      setClosePriceInput(selectedStock.closePrice !== undefined && selectedStock.closePrice !== null ? String(selectedStock.closePrice) : '');
      setHighPriceInput(selectedStock.highPrice !== undefined && selectedStock.highPrice !== null ? String(selectedStock.highPrice) : '');
      setLowPriceInput(selectedStock.lowPrice !== undefined && selectedStock.lowPrice !== null ? String(selectedStock.lowPrice) : '');
      setPrevCloseInput(selectedStock.previousClose !== undefined && selectedStock.previousClose !== null ? String(selectedStock.previousClose) : '');
      setRsiInput(selectedStock.rsi !== undefined && selectedStock.rsi !== null ? String(selectedStock.rsi) : '');
      setVwapInput(selectedStock.vwap !== undefined && selectedStock.vwap !== null ? String(selectedStock.vwap) : '');
      setAdxInput(selectedStock.adx !== undefined && selectedStock.adx !== null ? String(selectedStock.adx) : '');
      setDhanError(null);
    }
  }, [selectedStock?.id, selectedStock?.openPrice, selectedStock?.closePrice, selectedStock?.isFetched]);

  // Search Filtered Stock List
  const filteredStocks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return stocks;
    return stocks.filter(
      (s) =>
        s.symbol.toLowerCase().includes(q) ||
        s.companyName.toLowerCase().includes(q)
    );
  }, [stocks, searchQuery]);

  // Compute live Sector Strengths across all stocks
  const sectorMetricsMap = useMemo(() => {
    return computeAllSectorStrengths(stocks);
  }, [stocks]);

  // Parsed Numerical Input Values
  const numOpen = parseFloat(openPriceInput) || 0;
  const numClose = parseFloat(closePriceInput) || 0;
  const numHigh = highPriceInput.trim() !== '' ? parseFloat(highPriceInput) : (numOpen > 0 && numClose > 0 ? Math.max(numOpen, numClose) : undefined);
  const numLow = lowPriceInput.trim() !== '' ? parseFloat(lowPriceInput) : (numOpen > 0 && numClose > 0 ? Math.min(numOpen, numClose) : undefined);
  const numPrevClose = prevCloseInput.trim() !== '' ? parseFloat(prevCloseInput) : selectedStock?.previousClose;
  const numRsi = rsiInput.trim() !== '' ? parseFloat(rsiInput) : selectedStock?.rsi ?? null;
  const numVwap = vwapInput.trim() !== '' ? parseFloat(vwapInput) : selectedStock?.vwap ?? null;
  const numAdx = adxInput.trim() !== '' ? parseFloat(adxInput) : selectedStock?.adx ?? null;

  // Real-time Gann & Intraday Calculations from current inputs (Manual or Fetched)
  const gannCalc = useMemo(() => {
    if (numOpen <= 0 && numClose <= 0) return null;
    return calculateGann15Min(
      numOpen,
      numClose,
      numRsi,
      numVwap,
      numHigh,
      numLow,
      0.001,
      numAdx,
      numHigh,
      numLow,
      selectedStock?.symbol
    );
  }, [numOpen, numClose, numRsi, numVwap, numHigh, numLow, numAdx, selectedStock?.symbol]);

  // Construct Transient Stock Item for downstream pattern evaluation
  const activeEvaluatedStock: StockCalculated | null = useMemo(() => {
    if (!selectedStock) return null;
    if (numOpen <= 0 && numClose <= 0) return selectedStock;

    return {
      ...selectedStock,
      openPrice: numOpen > 0 ? numOpen : selectedStock.openPrice,
      closePrice: numClose > 0 ? numClose : selectedStock.closePrice,
      highPrice: numHigh,
      lowPrice: numLow,
      previousClose: numPrevClose,
      rsi: numRsi,
      vwap: numVwap,
      adx: numAdx,
      openCalc: gannCalc?.openCalc ?? null,
      closeCalc: gannCalc?.closeCalc ?? null,
      totalCalc: gannCalc?.totalCalc ?? null,
      buyAbove: gannCalc?.buyAbove ?? null,
      sellBelow: gannCalc?.sellBelow ?? null,
      targetsUp: gannCalc?.targetsUp ?? [],
      targetsDown: gannCalc?.targetsDown ?? [],
      trend: gannCalc?.trend ?? null,
      pctChange: gannCalc?.pctChange ?? null,
      gannScore: gannCalc?.gannScore ?? null,
      isOpenEqualLow: gannCalc?.isOpenEqualLow ?? false,
      isOpenEqualHigh: gannCalc?.isOpenEqualHigh ?? false,
      fib382Bull: gannCalc?.fib382Bull ?? null,
      fib382Bear: gannCalc?.fib382Bear ?? null,
      fibStatus: gannCalc?.fibStatus ?? null,
      isFetched: true
    };
  }, [selectedStock, numOpen, numClose, numHigh, numLow, numPrevClose, numRsi, numVwap, numAdx, gannCalc]);

  // Sector Confluence & Verdict
  const sectorInfo = useMemo(() => {
    if (!selectedStock) return null;
    const { sectorKey, sectorName, icon } = getStockSector(selectedStock.symbol);
    const metric = sectorMetricsMap.get(sectorKey);
    const isBull = (activeEvaluatedStock?.trend === 'Bullish' || activeEvaluatedStock?.trend === 'Very Bullish');
    const direction = isBull ? 'BULLISH' : 'BEARISH';
    const sectorAnalysis = evaluateStockSectorConfluence(
      activeEvaluatedStock || selectedStock,
      direction,
      sectorMetricsMap
    );

    return {
      sectorKey,
      sectorName,
      icon,
      metric,
      sectorAnalysis
    };
  }, [selectedStock, sectorMetricsMap, activeEvaluatedStock]);

  // 100% Formula Checks
  const is100Bullish = useMemo(() => {
    return activeEvaluatedStock ? is100PercentBullishMove(activeEvaluatedStock) : false;
  }, [activeEvaluatedStock]);

  const is100Bearish = useMemo(() => {
    return activeEvaluatedStock ? is100PercentBearishMove(activeEvaluatedStock) : false;
  }, [activeEvaluatedStock]);

  // Actionable Trade Setup Plan (Entry, Stop Loss, Targets, Recommended Option)
  const tradeSetup = useMemo(() => {
    if (!activeEvaluatedStock || !activeEvaluatedStock.openPrice || !activeEvaluatedStock.closePrice) return null;
    const isBull = activeEvaluatedStock.trend === 'Bullish' || activeEvaluatedStock.trend === 'Very Bullish';
    return buildTradeSetup(activeEvaluatedStock, isBull ? 'BULLISH' : 'BEARISH');
  }, [activeEvaluatedStock]);

  // Active Lot Size
  const activeLotSize = useMemo(() => {
    if (!selectedStock) return 500;
    if (selectedLotMonth === 'Jun') return selectedStock.lotSizeJun2026 || 500;
    if (selectedLotMonth === 'Jul') return selectedStock.lotSizeJul2026 || selectedStock.lotSizeJun2026 || 500;
    return selectedStock.lotSizeAug2026 || selectedStock.lotSizeJun2026 || 500;
  }, [selectedStock, selectedLotMonth]);

  // Option Strike Recommendations
  const optionStrikes = useMemo(() => {
    if (!selectedStock) return null;
    const activePrice = numClose > 0 ? numClose : (numOpen > 0 ? numOpen : (selectedStock.closePrice || 0));
    if (activePrice <= 0) return null;
    return getAtmOptionStrikes(activePrice, selectedStock.symbol);
  }, [selectedStock, numClose, numOpen]);

  // Action: Fetch data for selected stock directly from Dhan API
  const handleAnalyzeViaDhan = async () => {
    if (!selectedStock) return;
    setIsFetchingDhan(true);
    setDhanError(null);

    try {
      await onFetchSingleStock(selectedStock);
    } catch (err: any) {
      setDhanError(err?.message || 'Failed to fetch from Dhan API');
    } finally {
      setIsFetchingDhan(false);
    }
  };

  // Preset Handlers
  const handleSetOpenLowPreset = () => {
    if (numOpen > 0) {
      setLowPriceInput(String(numOpen));
      if (numHigh && numHigh < numOpen) {
        setHighPriceInput(String(Math.max(numOpen, numClose)));
      }
    }
  };

  const handleSetOpenHighPreset = () => {
    if (numOpen > 0) {
      setHighPriceInput(String(numOpen));
      if (numLow && numLow > numOpen) {
        setLowPriceInput(String(Math.min(numOpen, numClose)));
      }
    }
  };

  const handleSimulateBullish = () => {
    if (numOpen > 0) {
      const simClose = Math.round(numOpen * 1.015 * 100) / 100;
      setClosePriceInput(String(simClose));
      setLowPriceInput(String(numOpen));
      setHighPriceInput(String(Math.round(simClose * 1.004 * 100) / 100));
      setRsiInput('64.5');
      setVwapInput(String(Math.round((numOpen + simClose) / 2 * 100) / 100));
    }
  };

  const handleSimulateBearish = () => {
    if (numOpen > 0) {
      const simClose = Math.round(numOpen * 0.985 * 100) / 100;
      setClosePriceInput(String(simClose));
      setHighPriceInput(String(numOpen));
      setLowPriceInput(String(Math.round(simClose * 0.996 * 100) / 100));
      setRsiInput('36.2');
      setVwapInput(String(Math.round((numOpen + simClose) / 2 * 100) / 100));
    }
  };

  const handleResetInputs = () => {
    if (selectedStock) {
      setOpenPriceInput(selectedStock.openPrice !== undefined && selectedStock.openPrice !== null ? String(selectedStock.openPrice) : '');
      setClosePriceInput(selectedStock.closePrice !== undefined && selectedStock.closePrice !== null ? String(selectedStock.closePrice) : '');
      setHighPriceInput(selectedStock.highPrice !== undefined && selectedStock.highPrice !== null ? String(selectedStock.highPrice) : '');
      setLowPriceInput(selectedStock.lowPrice !== undefined && selectedStock.lowPrice !== null ? String(selectedStock.lowPrice) : '');
      setPrevCloseInput(selectedStock.previousClose !== undefined && selectedStock.previousClose !== null ? String(selectedStock.previousClose) : '');
      setRsiInput(selectedStock.rsi !== undefined && selectedStock.rsi !== null ? String(selectedStock.rsi) : '');
      setVwapInput(selectedStock.vwap !== undefined && selectedStock.vwap !== null ? String(selectedStock.vwap) : '');
      setAdxInput(selectedStock.adx !== undefined && selectedStock.adx !== null ? String(selectedStock.adx) : '');
    }
  };

  // Sync to master table
  const handleSaveToMaster = () => {
    if (!activeEvaluatedStock || numOpen <= 0 || numClose <= 0) return;
    onUpdateStockInMaster(activeEvaluatedStock);
    setIsSuccessSynced(true);
    setTimeout(() => setIsSuccessSynced(false), 2500);
  };

  // Copy Trade Setup Plan
  const handleCopySetup = () => {
    if (!activeEvaluatedStock || !tradeSetup) return;
    const text = `🎯 MANUAL GANN & INTRADAY ANALYSIS: ${activeEvaluatedStock.symbol}
Company: ${activeEvaluatedStock.companyName}
Open Price: ₹${numOpen.toFixed(2)} | Close / CMP: ₹${numClose.toFixed(2)} (${(gannCalc?.pctChange ?? 0) >= 0 ? '+' : ''}${(gannCalc?.pctChange ?? 0).toFixed(2)}%)
Trend: ${gannCalc?.trend} (Score: ${gannCalc?.gannScore}%)
--------------------------------------------------
Gann Open Calc: ${gannCalc?.openCalc.toFixed(4)}
Gann Close Calc: ${gannCalc?.closeCalc.toFixed(4)}
Gann Total Calc: ${gannCalc?.totalCalc.toFixed(4)}
Square of 9 Buy Above (+45°): ₹${gannCalc?.buyAbove.toFixed(2)}
Square of 9 Sell Below (-45°): ₹${gannCalc?.sellBelow.toFixed(2)}
--------------------------------------------------
Target 1 (+90°): ₹${gannCalc?.targetsUp[0]?.toFixed(2)} | Target 2 (+135°): ₹${gannCalc?.targetsUp[1]?.toFixed(2)} | Target 3 (+180°): ₹${gannCalc?.targetsUp[2]?.toFixed(2)}
Down 1 (-90°): ₹${gannCalc?.targetsDown[0]?.toFixed(2)} | Down 2 (-135°): ₹${gannCalc?.targetsDown[1]?.toFixed(2)}
--------------------------------------------------
Sector: ${sectorInfo?.icon} ${sectorInfo?.sectorName} (${sectorInfo?.sectorAnalysis.sectorAvgPct.toFixed(2)}% Strength • ${sectorInfo?.sectorAnalysis.tradeVerdict})
Trade Setup: ${tradeSetup.direction} | ${tradeSetup.entryZone.label}
Stop Loss: ₹${tradeSetup.stopLoss.toFixed(2)} | T1: ₹${tradeSetup.target1.toFixed(2)} | T2: ₹${tradeSetup.target2.toFixed(2)}
Recommended Strike: ${tradeSetup.recommendedStrike} | Lot: ${activeLotSize}`;

    navigator.clipboard.writeText(text);
    setCopiedSetup(true);
    setTimeout(() => setCopiedSetup(false), 2500);
  };

  // Gann Degree Targets Matrix
  const gannDegreeRows = useMemo(() => {
    if (numOpen <= 0) return [];
    const sqrtOpen = Math.sqrt(numOpen);
    const degrees = [
      { deg: '45°', factor: 0.125, label: 'Gann Pivot Entry' },
      { deg: '90°', factor: 0.25, label: 'Target 1 (1.0R)' },
      { deg: '135°', factor: 0.375, label: 'Target 2 (1.5R)' },
      { deg: '180°', factor: 0.50, label: 'Major Half Cycle (2.0R)' },
      { deg: '225°', factor: 0.625, label: 'Target 4 (2.5R)' },
      { deg: '270°', factor: 0.75, label: 'Major 3/4 Cycle (3.0R)' },
      { deg: '315°', factor: 0.875, label: 'Target 6 (3.5R)' },
      { deg: '360°', factor: 1.00, label: 'Full 360° Gann Revolution' },
    ];

    return degrees.map((d) => {
      const upPrice = Math.pow(sqrtOpen + d.factor, 2);
      const downPrice = Math.pow(Math.max(0, sqrtOpen - d.factor), 2);
      const upDiff = upPrice - numOpen;
      const downDiff = numOpen - downPrice;
      const upPct = (upDiff / numOpen) * 100;
      const downPct = (downDiff / numOpen) * 100;

      return {
        deg: d.deg,
        factor: d.factor,
        label: d.label,
        upPrice,
        upDiff,
        upPct,
        downPrice,
        downDiff,
        downPct
      };
    });
  }, [numOpen]);

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Top Banner & Control Deck */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white rounded-2xl p-4 sm:p-6 border border-slate-800 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          <div className="flex items-start space-x-3.5">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-2xl shadow-md shrink-0 ring-2 ring-blue-400/30">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
                  <span>MANUAL STOCK ANALYZER & GANN CALCULATOR</span>
                </h2>
                <span className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                  Dual Mode: Dhan API + Manual
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Select any F&amp;O stock to <strong>Fetch Live 15m Candles from Dhan API</strong>, or input <strong>Open and Close Prices manually</strong> to instantly compute Gann Square of 9 levels, Modulo formulas, Open=Low patterns, 100% Moves, and Option strategies.
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleAnalyzeViaDhan}
              disabled={isFetchingDhan || !selectedStock}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black transition-all shadow-md ${
                credentials.isConfigured
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white'
              } disabled:opacity-50`}
            >
              <RefreshCw className={`w-4 h-4 ${isFetchingDhan ? 'animate-spin' : ''}`} />
              <span>{isFetchingDhan ? 'Fetching Dhan Data...' : 'Analyze / Fetch from Dhan API'}</span>
            </button>

            {tradeSetup && (
              <button
                onClick={handleCopySetup}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-colors"
                title="Copy complete analysis to clipboard"
              >
                {copiedSetup ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedSetup ? 'Copied!' : 'Copy Plan'}</span>
              </button>
            )}

            {gannCalc && (
              <button
                onClick={handleSaveToMaster}
                className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  isSuccessSynced
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'bg-indigo-600/40 hover:bg-indigo-600/70 text-indigo-200 border border-indigo-500/40'
                }`}
                title="Save manual custom values into master scanner table"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{isSuccessSynced ? 'Saved to Scanner Table!' : 'Sync to Scanner Table'}</span>
              </button>
            )}
          </div>

        </div>

        {/* Popular Quick-Select Chips */}
        <div className="mt-4 pt-3 border-t border-slate-800">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Quick Select F&amp;O Heavyweights
            </span>
            <span className="text-[11px] text-slate-400">
              Total Universe: <strong className="text-white">{stocks.length} Stocks</strong>
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {POPULAR_SYMBOLS.map((sym) => {
              const matchedStock = stocks.find((s) => s.symbol === sym);
              if (!matchedStock) return null;
              const isSelected = selectedStock?.symbol === sym;

              return (
                <button
                  key={sym}
                  onClick={() => setSelectedStockId(matchedStock.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                    isSelected
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm ring-1 ring-blue-300'
                      : 'bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700'
                  }`}
                >
                  {sym}
                  {matchedStock.pctChange !== undefined && matchedStock.pctChange !== null && (
                    <span className={`ml-1 text-[10px] ${matchedStock.pctChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {matchedStock.pctChange >= 0 ? '+' : ''}{matchedStock.pctChange.toFixed(1)}%
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Grid: Left Side = Search & Inputs, Right Side = Real-Time Gann Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ========================================================================= */}
        {/* LEFT COLUMN: STOCK SELECTOR & MANUAL INPUT CONTROLS (5 Cols) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Card 1: Stock Search & Selector */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Search className="w-4 h-4 text-blue-600" />
                Select Stock to Analyze
              </label>
              {selectedStock && (
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  {selectedStock.symbol}
                </span>
              )}
            </div>

            {/* Search Box */}
            <div className="relative mb-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search symbol (e.g. RELIANCE, TCS, INFY)..."
                className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 outline-none transition-all shadow-2xs"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>

            {/* Dropdown Selector */}
            <select
              value={selectedStockId}
              onChange={(e) => setSelectedStockId(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none cursor-pointer hover:border-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors shadow-2xs"
            >
              {filteredStocks.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.symbol} - {s.companyName} {s.openPrice ? `(₹${s.openPrice.toFixed(1)})` : ''}
                </option>
              ))}
            </select>

            {/* Selected Stock Overview Strip */}
            {selectedStock && (
              <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm font-mono flex items-center gap-1.5">
                      <span>{selectedStock.symbol}</span>
                      <a
                        href={selectedStock.screenerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-[10px] font-sans flex items-center gap-0.5 underline"
                      >
                        Screener <ExternalLink className="w-3 h-3" />
                      </a>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[220px]">
                      {selectedStock.companyName}
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center space-x-1 justify-end text-[10px] font-bold text-slate-500">
                      <span>Lot Size:</span>
                      <strong className="text-slate-900 font-mono">{activeLotSize}</strong>
                    </div>
                    {sectorInfo && (
                      <div className="text-[10px] text-indigo-700 font-semibold flex items-center justify-end gap-1 mt-0.5">
                        <span>{sectorInfo.icon}</span>
                        <span>{sectorInfo.sectorName}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Lot Size Selector Pill */}
                <div className="mt-2.5 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Select Contract Expiry:</span>
                  <div className="flex items-center space-x-1">
                    {(['Jun', 'Jul', 'Aug'] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setSelectedLotMonth(m)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                          selectedLotMonth === m
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {m} 2026
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Interactive Manual Price Entry & Simulation Form */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Interactive Price Inputs
                  </h4>
                  <p className="text-[11px] text-slate-500">Edit values below to recalculate Gann levels instantly</p>
                </div>
              </div>

              <button
                onClick={handleResetInputs}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg text-xs transition-colors flex items-center gap-1"
                title="Reset inputs to last fetched stock data"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="text-[10px]">Reset</span>
              </button>
            </div>

            {/* Error Message if any */}
            {dhanError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Fetch Notice:</div>
                  <div>{dhanError}</div>
                  {onOpenSettings && (
                    <button
                      onClick={onOpenSettings}
                      className="mt-1 text-rose-900 underline font-bold text-[11px]"
                    >
                      Configure Dhan API Credentials (Settings)
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Primary Inputs: Open & Close Price */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>15m Open Price (₹)</span>
                  <span className="text-[10px] text-blue-600 font-bold">*Required</span>
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={openPriceInput}
                  onChange={(e) => setOpenPriceInput(e.target.value)}
                  placeholder="e.g. 2950.00"
                  className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 rounded-xl px-3 py-2 text-sm text-slate-900 font-mono font-black outline-none shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>15m Close / CMP (₹)</span>
                  <span className="text-[10px] text-blue-600 font-bold">*Required</span>
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={closePriceInput}
                  onChange={(e) => setClosePriceInput(e.target.value)}
                  placeholder="e.g. 2975.50"
                  className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 rounded-xl px-3 py-2 text-sm text-slate-900 font-mono font-black outline-none shadow-2xs"
                />
              </div>
            </div>

            {/* Secondary Inputs: High, Low, Prev Close */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  15m High (₹)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={highPriceInput}
                  onChange={(e) => setHighPriceInput(e.target.value)}
                  placeholder="e.g. 2985"
                  className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  15m Low (₹)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={lowPriceInput}
                  onChange={(e) => setLowPriceInput(e.target.value)}
                  placeholder="e.g. 2950"
                  className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Prev Close (₹)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={prevCloseInput}
                  onChange={(e) => setPrevCloseInput(e.target.value)}
                  placeholder="e.g. 2930"
                  className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono font-bold outline-none"
                />
              </div>
            </div>

            {/* Technical Indicators: RSI, VWAP, ADX */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  14-RSI
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={rsiInput}
                  onChange={(e) => setRsiInput(e.target.value)}
                  placeholder="e.g. 62.5"
                  className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  VWAP (₹)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={vwapInput}
                  onChange={(e) => setVwapInput(e.target.value)}
                  placeholder="e.g. 2960"
                  className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  ADX Trend
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={adxInput}
                  onChange={(e) => setAdxInput(e.target.value)}
                  placeholder="e.g. 25.0"
                  className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono font-bold outline-none"
                />
              </div>
            </div>

            {/* Quick 1-Click Simulation Presets */}
            <div className="pt-2 border-t border-slate-100">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">
                Quick 1-Click Strategy Presets
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={handleSetOpenLowPreset}
                  disabled={numOpen <= 0}
                  className="px-2 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition-colors text-left flex items-center justify-between disabled:opacity-50"
                >
                  <span>🟢 Set Open = Low</span>
                  <span className="text-[10px] font-mono font-normal">₹{numOpen > 0 ? numOpen.toFixed(1) : '-'}</span>
                </button>
                <button
                  onClick={handleSetOpenHighPreset}
                  disabled={numOpen <= 0}
                  className="px-2 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-xs font-bold transition-colors text-left flex items-center justify-between disabled:opacity-50"
                >
                  <span>🔴 Set Open = High</span>
                  <span className="text-[10px] font-mono font-normal">₹{numOpen > 0 ? numOpen.toFixed(1) : '-'}</span>
                </button>
                <button
                  onClick={handleSimulateBullish}
                  disabled={numOpen <= 0}
                  className="px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-xs font-bold transition-colors text-left flex items-center justify-between disabled:opacity-50"
                >
                  <span>⚡ +1.5% Bull Breakout</span>
                  <span className="text-[10px] font-mono">100% Move</span>
                </button>
                <button
                  onClick={handleSimulateBearish}
                  disabled={numOpen <= 0}
                  className="px-2 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-lg text-xs font-bold transition-colors text-left flex items-center justify-between disabled:opacity-50"
                >
                  <span>⚡ -1.5% Bear Breakdown</span>
                  <span className="text-[10px] font-mono">100% Short</span>
                </button>
              </div>
            </div>

            {/* Position Sizer & RSI Radar Shortcuts */}
            <div className="flex items-center space-x-2 pt-2 border-t border-slate-100">
              {onOpenPositionSizer && activeEvaluatedStock && (
                <button
                  onClick={() => onOpenPositionSizer(activeEvaluatedStock)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors flex items-center justify-center space-x-1"
                >
                  <DollarSign className="w-3.5 h-3.5 text-blue-600" />
                  <span>Position Sizer</span>
                </button>
              )}
              {onOpenRsiAnalyst && activeEvaluatedStock && (
                <button
                  onClick={() => onOpenRsiAnalyst(activeEvaluatedStock)}
                  className="flex-1 py-2 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center space-x-1"
                >
                  <Activity className="w-3.5 h-3.5 text-purple-600" />
                  <span>RSI Radar</span>
                </button>
              )}
            </div>

          </div>

        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: REAL-TIME GANN & CONFLUENCE ANALYSIS (7 Cols) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Card 1: Core Gann Modulo Values & Trend Score */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Calculated Gann Results
                </span>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <span>{selectedStock?.symbol} Gann 15-Minute Analysis</span>
                  {gannCalc && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      gannCalc.trend === 'Very Bullish' || gannCalc.trend === 'Bullish'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : gannCalc.trend === 'Very Bearish' || gannCalc.trend === 'Bearish'
                        ? 'bg-rose-100 text-rose-800 border border-rose-300'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {gannCalc.trend}
                    </span>
                  )}
                </h3>
              </div>

              {gannCalc && (
                <div className="text-right">
                  <div className="text-xs text-slate-500 font-medium">15m Net Move</div>
                  <div className={`text-base font-mono font-black flex items-center justify-end ${
                    (gannCalc.pctChange ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {(gannCalc.pctChange ?? 0) >= 0 ? <ArrowUpRight className="w-4 h-4 mr-0.5" /> : <ArrowDownRight className="w-4 h-4 mr-0.5" />}
                    {(gannCalc.pctChange ?? 0) >= 0 ? '+' : ''}{(gannCalc.pctChange ?? 0).toFixed(2)}%
                  </div>
                </div>
              )}
            </div>

            {/* 3 Modulo Calculations: Open Calc, Close Calc, Total Calc */}
            <div className="grid grid-cols-3 gap-3 mb-4 text-center">
              
              {/* Open Calc */}
              <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl">
                <div className="text-[11px] font-bold text-blue-900 uppercase">Open Calculation</div>
                <div className="text-xl font-black font-mono text-blue-700 mt-1">
                  {gannCalc ? gannCalc.openCalc.toFixed(4) : '-'}
                </div>
                <div className="text-[10px] text-blue-800/70 font-mono mt-0.5">
                  ((&radic;Open &times; 15) - 15) % 15
                </div>
              </div>

              {/* Close Calc */}
              <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl">
                <div className="text-[11px] font-bold text-blue-900 uppercase">Close Calculation</div>
                <div className="text-xl font-black font-mono text-blue-700 mt-1">
                  {gannCalc ? gannCalc.closeCalc.toFixed(4) : '-'}
                </div>
                <div className="text-[10px] text-blue-800/70 font-mono mt-0.5">
                  ((&radic;Close &times; 15) - 15) % 15
                </div>
              </div>

              {/* Total Calc */}
              <div className="p-3.5 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl">
                <div className="text-[11px] font-bold text-indigo-900 uppercase">Total (Modulo Sum)</div>
                <div className="text-xl font-black font-mono text-indigo-950 mt-1">
                  {gannCalc ? gannCalc.totalCalc.toFixed(4) : '-'}
                </div>
                <div className="text-[10px] text-indigo-800/70 font-mono mt-0.5">
                  Open Calc + Close Calc
                </div>
              </div>

            </div>

            {/* Square of 9 Pivot Buy Above / Sell Below */}
            {gannCalc && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-emerald-50/80 border border-emerald-300 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-emerald-800 uppercase flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                      Square of 9 Buy Above (+45°)
                    </div>
                    <div className="text-lg font-black font-mono text-emerald-950 mt-0.5">
                      ₹{gannCalc.buyAbove.toFixed(2)}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200">
                    +0.125
                  </span>
                </div>

                <div className="p-3 bg-rose-50/80 border border-rose-300 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-rose-800 uppercase flex items-center gap-1">
                      <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                      Square of 9 Sell Below (-45°)
                    </div>
                    <div className="text-lg font-black font-mono text-rose-950 mt-0.5">
                      ₹{gannCalc.sellBelow.toFixed(2)}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-rose-700 bg-white px-2 py-0.5 rounded border border-rose-200">
                    -0.125
                  </span>
                </div>
              </div>
            )}

            {/* Pattern Signals Strip (Open=Low, 100% Moves, Fib Retracement) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs">
              
              {/* Open = Low */}
              <div className={`p-2.5 rounded-xl border ${
                gannCalc?.isOpenEqualLow
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                  : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
                <div className="text-[10px] uppercase font-bold text-slate-400">Open = Low</div>
                <div className="font-mono font-black text-xs mt-0.5 flex items-center gap-1">
                  {gannCalc?.isOpenEqualLow ? '🟢 YES (Active)' : '⚪ No'}
                </div>
              </div>

              {/* Open = High */}
              <div className={`p-2.5 rounded-xl border ${
                gannCalc?.isOpenEqualHigh
                  ? 'bg-rose-50 border-rose-300 text-rose-900 font-bold'
                  : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
                <div className="text-[10px] uppercase font-bold text-slate-400">Open = High</div>
                <div className="font-mono font-black text-xs mt-0.5 flex items-center gap-1">
                  {gannCalc?.isOpenEqualHigh ? '🔴 YES (Active)' : '⚪ No'}
                </div>
              </div>

              {/* 100% Bullish Move */}
              <div className={`p-2.5 rounded-xl border ${
                is100Bullish
                  ? 'bg-emerald-100 border-emerald-400 text-emerald-950 font-bold shadow-2xs'
                  : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
                <div className="text-[10px] uppercase font-bold text-slate-400">100% Bull Move</div>
                <div className="font-mono font-black text-xs mt-0.5">
                  {is100Bullish ? '🔥 100% MET' : '⚪ Not Met'}
                </div>
              </div>

              {/* 100% Bearish Move */}
              <div className={`p-2.5 rounded-xl border ${
                is100Bearish
                  ? 'bg-rose-100 border-rose-400 text-rose-950 font-bold shadow-2xs'
                  : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
                <div className="text-[10px] uppercase font-bold text-slate-400">100% Bear Move</div>
                <div className="font-mono font-black text-xs mt-0.5">
                  {is100Bearish ? '🔥 100% SHORT' : '⚪ Not Met'}
                </div>
              </div>

            </div>

          </div>

          {/* Card 2: Sector Confluence & Breadth Verdict */}
          {sectorInfo && (
            <div className={`p-4 rounded-2xl border ${
              sectorInfo.sectorAnalysis.tradeVerdict === 'ENTER'
                ? 'bg-gradient-to-r from-emerald-950 to-slate-900 border-emerald-500/50 text-white'
                : sectorInfo.sectorAnalysis.tradeVerdict === 'AVOID'
                ? 'bg-gradient-to-r from-rose-950 to-slate-900 border-rose-500/50 text-white'
                : 'bg-slate-900 border-amber-500/40 text-white'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2 text-xs font-bold">
                  <span className="text-base">{sectorInfo.icon}</span>
                  <span className="text-white font-extrabold">{sectorInfo.sectorName}</span>
                  <span className="text-slate-500">&bull;</span>
                  <span className={`font-mono ${
                    sectorInfo.sectorAnalysis.sectorAvgPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {sectorInfo.sectorAnalysis.sectorAvgPct >= 0 ? '+' : ''}{sectorInfo.sectorAnalysis.sectorAvgPct.toFixed(2)}% Strength
                  </span>
                </div>

                <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black uppercase ${
                  sectorInfo.sectorAnalysis.tradeVerdict === 'ENTER'
                    ? 'bg-emerald-500 text-slate-950'
                    : sectorInfo.sectorAnalysis.tradeVerdict === 'AVOID'
                    ? 'bg-rose-500 text-white'
                    : 'bg-amber-400 text-slate-950'
                }`}>
                  Sector: {sectorInfo.sectorAnalysis.tradeVerdict}
                </span>
              </div>

              <div className="text-xs text-slate-300 mb-2">
                {sectorInfo.sectorAnalysis.verdictDescription}
              </div>

              {/* Breadth Meter */}
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full"
                  style={{ width: `${sectorInfo.sectorAnalysis.sectorBullishBreadthPct}%` }}
                />
                <div
                  className="bg-rose-500 h-full"
                  style={{ width: `${100 - sectorInfo.sectorAnalysis.sectorBullishBreadthPct}%` }}
                />
              </div>
            </div>
          )}

          {/* Card 3: Actionable Trade Plan & Recommended Option Strikes */}
          {tradeSetup && (
            <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-md">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2 text-xs">
                  <Target className="w-4 h-4 text-amber-400" />
                  <span className="font-extrabold text-amber-300 uppercase tracking-wider">
                    {tradeSetup.direction} Intraday Blueprint
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                  R:R {tradeSetup.riskRewardRatio}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3.5">
                <div>
                  <div className="text-[10px] text-slate-400 font-semibold">Entry Zone</div>
                  <div className="font-mono font-bold text-slate-200 text-sm mt-0.5">
                    {tradeSetup.entryZone.label}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-rose-400 font-semibold">Stop Loss</div>
                  <div className="font-mono font-black text-rose-300 text-sm mt-0.5">
                    ₹{tradeSetup.stopLoss.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-emerald-400 font-semibold">Target 1 (1.2R)</div>
                  <div className="font-mono font-black text-emerald-300 text-sm mt-0.5">
                    ₹{tradeSetup.target1.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-emerald-400 font-semibold">Target 2 (2.2R)</div>
                  <div className="font-mono font-black text-emerald-300 text-sm mt-0.5">
                    ₹{tradeSetup.target2.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Recommended Strike & Profit Projection */}
              <div className="p-3 bg-slate-800/90 border border-slate-700/80 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-1 bg-purple-500/30 text-purple-300 border border-purple-400/40 rounded-lg font-mono font-black text-xs">
                    {tradeSetup.recommendedStrike}
                  </span>
                  <span className="text-slate-300">
                    Lot: <strong className="text-white">{activeLotSize}</strong>
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 mr-1.5">Est. T2 Profit:</span>
                  <strong className="text-emerald-400 font-mono font-black text-sm">
                    +₹{tradeSetup.estProfitPerLot.toLocaleString('en-IN')} / lot
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* Card 4: Full Gann Square of 9 Degree Targets Matrix (0° to 360°) */}
          {gannDegreeRows.length > 0 && (
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Gann Square of 9 Circle of 360° Levels
                  </h4>
                </div>
                <span className="text-[10px] text-slate-500 font-mono font-bold">
                  Base: ₹{numOpen.toFixed(2)}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 bg-slate-50">
                      <th className="py-2 px-2.5">Angle</th>
                      <th className="py-2 px-2.5">Role</th>
                      <th className="py-2 px-2.5 text-right text-emerald-700">Bullish Target (₹)</th>
                      <th className="py-2 px-2.5 text-right text-rose-700">Bearish Target (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {gannDegreeRows.map((row) => (
                      <tr key={row.deg} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2 px-2.5 font-bold text-slate-900 font-mono">
                          {row.deg}
                        </td>
                        <td className="py-2 px-2.5 font-sans text-slate-600 text-[11px]">
                          {row.label}
                        </td>
                        <td className="py-2 px-2.5 text-right font-black text-emerald-700">
                          ₹{row.upPrice.toFixed(2)}
                          <span className="text-[10px] text-emerald-600 font-normal ml-1">
                            (+{row.upPct.toFixed(2)}%)
                          </span>
                        </td>
                        <td className="py-2 px-2.5 text-right font-black text-rose-700">
                          ₹{row.downPrice.toFixed(2)}
                          <span className="text-[10px] text-rose-600 font-normal ml-1">
                            (-{row.downPct.toFixed(2)}%)
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
