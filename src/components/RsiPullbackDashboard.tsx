import React, { useState, useMemo } from 'react';
import { StockCalculated } from '../types';
import { analyzeRsiPullback, RsiPullbackAnalysis } from '../utils/rsiPullback';
import { calculateVolumeAnalysis } from '../utils/volumeAnalysis';
import { calculateRSI } from '../utils/gann';
import { 
  TrendingUp, 
  TrendingDown, 
  Search, 
  Filter, 
  Sparkles, 
  Layers, 
  BarChart3, 
  Calculator, 
  ArrowUpRight, 
  ArrowDownRight, 
  ShieldAlert, 
  CheckCircle2, 
  Flame, 
  HelpCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Zap
} from 'lucide-react';

interface RsiPullbackDashboardProps {
  stocks: StockCalculated[];
  onSelectStockDetail: (stock: StockCalculated) => void;
  onOpenPositionSizer: (stock: StockCalculated) => void;
  onOpenRsiAnalyst: (stock: StockCalculated) => void;
  onFetchSingleStock?: (symbol: string) => void;
}

type PullbackFilterType = 
  | 'ALL' 
  | 'BULLISH_SWEET_SPOT' 
  | 'BULLISH_MOMENTUM' 
  | 'OVERSOLD' 
  | 'BEARISH_RALLY' 
  | 'HIGH_SCORE'
  | 'VOL_INCREASING'
  | 'FIRST_CANDLE_BUY'
  | 'FIRST_CANDLE_5X'
  | 'FIRST_15M_HIGH_CROSS'
  | 'FIRST_15M_LOW_CROSS'
  | 'HIGH_RVOL'
  | 'OPEN_LOW';

type SortOption = 
  | 'SCORE_DESC' 
  | 'RSI_ASC' 
  | 'RSI_DESC' 
  | 'PCT_CHANGE_DESC' 
  | 'VOLUME_DESC' 
  | 'RVOL_DESC' 
  | 'FIRST_CANDLE_RVOL_DESC' 
  | 'FIRST_CANDLE_RATIO_DESC'
  | 'BODY_CROSS_PCT_DESC'
  | 'FIRST_15M_HIGH_CROSS_DESC';

export const RsiPullbackDashboard: React.FC<RsiPullbackDashboardProps> = ({
  stocks,
  onSelectStockDetail,
  onOpenPositionSizer,
  onOpenRsiAnalyst,
  onFetchSingleStock
}) => {
  const [activeFilter, setActiveFilter] = useState<PullbackFilterType>('FIRST_CANDLE_5X');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('FIRST_CANDLE_RVOL_DESC');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  
  // Interactive Calculator State
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [calcInput, setCalcInput] = useState({
    symbol: 'CUSTOM_STOCK',
    cmp: 1250,
    open: 1240,
    high: 1265,
    low: 1238,
    closesStr: '1240, 1242, 1245, 1243, 1248, 1252, 1249, 1250'
  });
  const [calcResult, setCalcResult] = useState<{ rsi: number; analysis: RsiPullbackAnalysis } | null>(null);

  // Compute RSI Pullback Analysis for all stocks
  const analyzedStocks = useMemo(() => {
    return stocks.map((stock) => {
      const analysis = analyzeRsiPullback(stock);
      return {
        stock,
        analysis
      };
    });
  }, [stocks]);

  // Statistics
  const stats = useMemo(() => {
    let bullishSweetSpot = 0;
    let bullishMomentum = 0;
    let oversold = 0;
    let bearishRally = 0;
    let highScore = 0;
    let openingBuySurges = 0;
    let highRVolCount = 0;
    let fiveXSurgeCount = 0;
    let fifteenMinHighCrossCount = 0;
    let fifteenMinLowCrossCount = 0;

    analyzedStocks.forEach(({ stock, analysis }) => {
      if (analysis.pullbackCategory === 'BULLISH_SWEET_SPOT') bullishSweetSpot++;
      if (analysis.pullbackCategory === 'BULLISH_MOMENTUM') bullishMomentum++;
      if (analysis.pullbackCategory === 'OVERSOLD_BOUNCE') oversold++;
      if (analysis.pullbackCategory === 'BEARISH_RALLY') bearishRally++;
      if (analysis.pullbackScore >= 75) highScore++;
      if (analysis.volumeAnalysis.firstCandleDominantSide === 'BUY' && analysis.volumeAnalysis.firstCandleMultiple >= 1.5) openingBuySurges++;
      if (analysis.volumeAnalysis.rVolume >= 1.2 || analysis.volumeAnalysis.firstCandleRVol >= 1.5) highRVolCount++;
      if (analysis.volumeAnalysis.firstCandleRVol >= 5.0 || analysis.volumeAnalysis.firstCandleMultiple >= 5.0) fiveXSurgeCount++;
      if (analysis.volumeAnalysis.hasCrossedFirst15mHigh) fifteenMinHighCrossCount++;
      if (analysis.volumeAnalysis.hasCrossedFirst15mLow) fifteenMinLowCrossCount++;
    });

    return {
      total: stocks.length,
      bullishSweetSpot,
      bullishMomentum,
      oversold,
      bearishRally,
      highScore,
      openingBuySurges,
      highRVolCount,
      fiveXSurgeCount,
      fifteenMinHighCrossCount,
      fifteenMinLowCrossCount
    };
  }, [analyzedStocks, stocks.length]);

  // Filtered & Sorted list
  const filteredStocks = useMemo(() => {
    let list = analyzedStocks.filter(({ stock, analysis }) => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSymbol = stock.symbol.toLowerCase().includes(q);
        const matchesName = stock.companyName.toLowerCase().includes(q);
        if (!matchesSymbol && !matchesName) return false;
      }

      // Filter category
      if (activeFilter === 'BULLISH_SWEET_SPOT') {
        return analysis.pullbackCategory === 'BULLISH_SWEET_SPOT';
      }
      if (activeFilter === 'BULLISH_MOMENTUM') {
        return analysis.pullbackCategory === 'BULLISH_MOMENTUM';
      }
      if (activeFilter === 'OVERSOLD') {
        return analysis.pullbackCategory === 'OVERSOLD_BOUNCE';
      }
      if (activeFilter === 'BEARISH_RALLY') {
        return analysis.pullbackCategory === 'BEARISH_RALLY';
      }
      if (activeFilter === 'HIGH_SCORE') {
        return analysis.pullbackScore >= 75;
      }
      if (activeFilter === 'VOL_INCREASING') {
        return analysis.volumeDirection === 'INCREASING';
      }
      if (activeFilter === 'FIRST_CANDLE_BUY') {
        return analysis.volumeAnalysis.firstCandleDominantSide === 'BUY' && analysis.volumeAnalysis.firstCandleMultiple >= 1.5;
      }
      if (activeFilter === 'FIRST_CANDLE_5X') {
        return analysis.volumeAnalysis.firstCandleRVol >= 5.0 || analysis.volumeAnalysis.firstCandleMultiple >= 5.0;
      }
      if (activeFilter === 'FIRST_15M_HIGH_CROSS') {
        return analysis.volumeAnalysis.hasCrossedFirst15mHigh;
      }
      if (activeFilter === 'FIRST_15M_LOW_CROSS') {
        return analysis.volumeAnalysis.hasCrossedFirst15mLow;
      }
      if (activeFilter === 'HIGH_RVOL') {
        return analysis.volumeAnalysis.rVolume >= 1.2 || analysis.volumeAnalysis.firstCandleRVol >= 1.5;
      }
      if (activeFilter === 'OPEN_LOW') {
        return Boolean(stock.isOpenEqualLow);
      }

      return true;
    });

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'BODY_CROSS_PCT_DESC') {
        return b.analysis.volumeAnalysis.first15mBodyCrossPct - a.analysis.volumeAnalysis.first15mBodyCrossPct;
      }
      if (sortBy === 'FIRST_15M_HIGH_CROSS_DESC') {
        return b.analysis.volumeAnalysis.first15mCrossPct - a.analysis.volumeAnalysis.first15mCrossPct;
      }
      if (sortBy === 'SCORE_DESC') return b.analysis.pullbackScore - a.analysis.pullbackScore;
      if (sortBy === 'RSI_ASC') return a.analysis.rsiVal - b.analysis.rsiVal;
      if (sortBy === 'RSI_DESC') return b.analysis.rsiVal - a.analysis.rsiVal;
      if (sortBy === 'PCT_CHANGE_DESC') return (b.stock.pctChange || 0) - (a.stock.pctChange || 0);
      if (sortBy === 'VOLUME_DESC') return (b.stock.volume || 0) - (a.stock.volume || 0);
      if (sortBy === 'RVOL_DESC') return b.analysis.volumeAnalysis.rVolume - a.analysis.volumeAnalysis.rVolume;
      if (sortBy === 'FIRST_CANDLE_RVOL_DESC') {
        const diff = b.analysis.volumeAnalysis.firstCandleRVol - a.analysis.volumeAnalysis.firstCandleRVol;
        if (Math.abs(diff) > 0.01) return diff;
        return b.analysis.volumeAnalysis.firstCandleMultiple - a.analysis.volumeAnalysis.firstCandleMultiple;
      }
      if (sortBy === 'FIRST_CANDLE_RATIO_DESC') return b.analysis.volumeAnalysis.firstCandleMultiple - a.analysis.volumeAnalysis.firstCandleMultiple;
      return 0;
    });

    return list;
  }, [analyzedStocks, searchQuery, activeFilter, sortBy]);

  // Handle Calculator Run
  const handleRunCalc = () => {
    const closes = calcInput.closesStr
      .split(',')
      .map((s) => parseFloat(s.trim()))
      .filter((n) => !isNaN(n) && n > 0);

    const calculatedRsi = calculateRSI(closes) ?? 48;
    const dummyStock: StockCalculated = {
      id: 'custom',
      symbol: calcInput.symbol,
      companyName: 'Custom Stock Calculation',
      screenerUrl: '',
      lotSizeJun2026: 100,
      lotSizeJul2026: 100,
      lotSizeAug2026: 100,
      openPrice: calcInput.open,
      closePrice: calcInput.cmp,
      highPrice: calcInput.high,
      lowPrice: calcInput.low,
      rsi: calculatedRsi,
      vwap: (calcInput.high + calcInput.low + calcInput.cmp) / 3,
      buyAbove: calcInput.cmp * 1.008,
      sellBelow: calcInput.low
    };

    const analysis = analyzeRsiPullback(dummyStock);
    setCalcResult({ rsi: calculatedRsi, analysis });
  };

  return (
    <div className="space-y-6">
      
      {/* Title & Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-blue-600/20 to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30">
                <Flame className="w-5 h-5 text-blue-400" />
              </span>
              <h2 className="text-xl font-black tracking-tight text-white">
                RSI Pullback Scanner &amp; Calculator
              </h2>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2.5 py-0.5 rounded-full font-bold border border-emerald-500/30 uppercase tracking-wider">
                Live 15m Momentum
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Detect high-conviction RSI pullbacks (40–55 sweet spot) above VWAP, oversold bounces (&lt;40 RSI), and bearish counter-rallies across Nifty F&amp;O stocks with calculated entry, stop loss, and risk-reward ratios.
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => setIsCalcOpen(!isCalcOpen)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-2 border border-blue-400/30"
            >
              <Calculator className="w-4 h-4" />
              <span>{isCalcOpen ? 'Hide RSI Calculator' : 'Interactive RSI Calculator'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Interactive RSI Calculator Widget */}
      {isCalcOpen && (
        <div className="bg-white border border-blue-200/90 rounded-2xl p-5 shadow-sm space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Calculator className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Custom RSI &amp; Pullback Trade Level Calculator</h3>
            </div>
            <span className="text-[11px] text-slate-500">Calculate 14-period RSI &amp; setup parameters</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Stock Symbol</label>
              <input
                type="text"
                value={calcInput.symbol}
                onChange={(e) => setCalcInput({ ...calcInput, symbol: e.target.value.toUpperCase() })}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 font-semibold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Current Price (CMP)</label>
              <input
                type="number"
                value={calcInput.cmp}
                onChange={(e) => setCalcInput({ ...calcInput, cmp: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 font-semibold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">15m High Price</label>
              <input
                type="number"
                value={calcInput.high}
                onChange={(e) => setCalcInput({ ...calcInput, high: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 font-semibold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">15m Low Price</label>
              <input
                type="number"
                value={calcInput.low}
                onChange={(e) => setCalcInput({ ...calcInput, low: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Closing Prices Series (Comma separated for 14-period RSI calculation)
            </label>
            <input
              type="text"
              value={calcInput.closesStr}
              onChange={(e) => setCalcInput({ ...calcInput, closesStr: e.target.value })}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 font-mono text-xs"
              placeholder="1240, 1242, 1245, 1243, 1248, 1252"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={handleRunCalc}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center space-x-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Calculate RSI &amp; Pullback Signal</span>
            </button>

            {calcResult && (
              <div className="flex items-center space-x-3 text-xs">
                <span className="font-bold text-slate-700">Calculated RSI:</span>
                <span className="text-sm font-black text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
                  {calcResult.rsi.toFixed(1)}
                </span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                  {calcResult.analysis.pullbackSignal}
                </span>
              </div>
            )}
          </div>

          {calcResult && (
            <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
              <p className="text-slate-700 leading-relaxed font-medium">{calcResult.analysis.reasoning}</p>
              <div className="flex flex-wrap items-center gap-4 text-slate-800 pt-1 font-semibold">
                <span>Ideal Entry: <strong className="text-blue-700">₹{calcResult.analysis.idealEntry}</strong></span>
                <span>Stop Loss: <strong className="text-rose-700">₹{calcResult.analysis.stopLoss}</strong></span>
                <span>Target 1: <strong className="text-emerald-700">₹{calcResult.analysis.target1}</strong></span>
                <span>Risk:Reward: <strong className="text-purple-700">{calcResult.analysis.riskRewardRatio}</strong></span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats Overview Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-8 gap-2">
        {/* Total Scanned */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Total Scanned</div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">{stats.total}</div>
          <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
            <Layers className="w-3 h-3 text-slate-400" />
            <span>Nifty F&amp;O</span>
          </div>
        </div>

        {/* 15m High Cross (Bullish Breakout) */}
        <button
          onClick={() => {
            if (activeFilter !== 'FIRST_15M_HIGH_CROSS') {
              setActiveFilter('FIRST_15M_HIGH_CROSS');
              setSortBy('BODY_CROSS_PCT_DESC');
            } else {
              setActiveFilter('ALL');
            }
          }}
          className={`p-3 rounded-2xl border text-left transition-all ${
            activeFilter === 'FIRST_15M_HIGH_CROSS'
              ? 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-400/50 shadow-md font-black'
              : 'bg-gradient-to-br from-emerald-100/90 to-teal-50 border-emerald-300 hover:border-emerald-400 shadow-2xs'
          }`}
        >
          <div className={`text-[10px] font-black uppercase tracking-wider flex items-center justify-between ${
            activeFilter === 'FIRST_15M_HIGH_CROSS' ? 'text-white' : 'text-emerald-950'
          }`}>
            <span>🟢 15m High Cross</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 font-bold" />
          </div>
          <div className={`text-xl sm:text-2xl font-black mt-0.5 ${
            activeFilter === 'FIRST_15M_HIGH_CROSS' ? 'text-white' : 'text-emerald-950'
          }`}>{stats.fifteenMinHighCrossCount}</div>
          <div className={`text-[10px] mt-0.5 font-extrabold ${
            activeFilter === 'FIRST_15M_HIGH_CROSS' ? 'text-emerald-100' : 'text-emerald-800'
          }`}>
            Body &gt; 15m High 🚀
          </div>
        </button>

        {/* 15m Low Cross (Bearish Breakdown) */}
        <button
          onClick={() => {
            if (activeFilter !== 'FIRST_15M_LOW_CROSS') {
              setActiveFilter('FIRST_15M_LOW_CROSS');
              setSortBy('BODY_CROSS_PCT_DESC');
            } else {
              setActiveFilter('ALL');
            }
          }}
          className={`p-3 rounded-2xl border text-left transition-all ${
            activeFilter === 'FIRST_15M_LOW_CROSS'
              ? 'bg-rose-600 text-white border-rose-700 ring-2 ring-rose-400/50 shadow-md font-black'
              : 'bg-gradient-to-br from-rose-100/90 to-amber-50 border-rose-300 hover:border-rose-400 shadow-2xs'
          }`}
        >
          <div className={`text-[10px] font-black uppercase tracking-wider flex items-center justify-between ${
            activeFilter === 'FIRST_15M_LOW_CROSS' ? 'text-white' : 'text-rose-950'
          }`}>
            <span>🔴 15m Low Cross</span>
            <ArrowDownRight className="w-3.5 h-3.5 text-rose-600 font-bold" />
          </div>
          <div className={`text-xl sm:text-2xl font-black mt-0.5 ${
            activeFilter === 'FIRST_15M_LOW_CROSS' ? 'text-white' : 'text-rose-950'
          }`}>{stats.fifteenMinLowCrossCount}</div>
          <div className={`text-[10px] mt-0.5 font-extrabold ${
            activeFilter === 'FIRST_15M_LOW_CROSS' ? 'text-rose-100' : 'text-rose-800'
          }`}>
            Body &lt; 15m Low 📉
          </div>
        </button>

        {/* 5X 1st Candle R-Vol */}
        <button
          onClick={() => {
            if (activeFilter !== 'FIRST_CANDLE_5X') {
              setActiveFilter('FIRST_CANDLE_5X');
              setSortBy('FIRST_CANDLE_RVOL_DESC');
            } else {
              setActiveFilter('ALL');
            }
          }}
          className={`p-3 rounded-2xl border text-left transition-all ${
            activeFilter === 'FIRST_CANDLE_5X'
              ? 'bg-amber-500 text-slate-950 border-amber-600 ring-2 ring-amber-400/50 shadow-md font-black'
              : 'bg-gradient-to-br from-amber-100 to-orange-100 border-amber-300 hover:border-amber-400 shadow-2xs'
          }`}
        >
          <div className="text-[10px] font-black text-amber-950 uppercase tracking-wider flex items-center justify-between">
            <span>🔥 5X 1st Candle</span>
            <Zap className="w-3.5 h-3.5 text-amber-700 fill-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-950 mt-0.5">{stats.fiveXSurgeCount}</div>
          <div className="text-[10px] text-amber-900 mt-0.5 font-bold">
            09:15 R-Vol &ge; 5.0X
          </div>
        </button>

        {/* 09:15 Buy Surges */}
        <button
          onClick={() => setActiveFilter(activeFilter === 'FIRST_CANDLE_BUY' ? 'ALL' : 'FIRST_CANDLE_BUY')}
          className={`p-3 rounded-2xl border text-left transition-all ${
            activeFilter === 'FIRST_CANDLE_BUY'
              ? 'bg-emerald-100 border-emerald-500 ring-2 ring-emerald-400/30 shadow-sm'
              : 'bg-gradient-to-br from-emerald-50/90 to-teal-50/60 border-emerald-200/80 hover:border-emerald-300 shadow-2xs'
          }`}
        >
          <div className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider flex items-center justify-between">
            <span>09:15 Buy Surges</span>
            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-800 mt-0.5">{stats.openingBuySurges}</div>
          <div className="text-[10px] text-emerald-700 mt-0.5 font-bold">
            Buy Vol &gt; 1.5X
          </div>
        </button>

        {/* High R-Volume */}
        <button
          onClick={() => setActiveFilter(activeFilter === 'HIGH_RVOL' ? 'ALL' : 'HIGH_RVOL')}
          className={`p-3 rounded-2xl border text-left transition-all ${
            activeFilter === 'HIGH_RVOL'
              ? 'bg-amber-100 border-amber-500 ring-2 ring-amber-400/30 shadow-sm'
              : 'bg-gradient-to-br from-amber-50/90 to-orange-50/60 border-amber-200/80 hover:border-amber-300 shadow-2xs'
          }`}
        >
          <div className="text-[10px] font-extrabold text-amber-900 uppercase tracking-wider flex items-center justify-between">
            <span>High R-Volume</span>
            <BarChart3 className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-900 mt-0.5">{stats.highRVolCount}</div>
          <div className="text-[10px] text-amber-800 mt-0.5 font-bold">
            R-Vol &gt; 1.2X Heavy
          </div>
        </button>

        {/* Bullish Sweet Spot */}
        <button
          onClick={() => setActiveFilter(activeFilter === 'BULLISH_SWEET_SPOT' ? 'ALL' : 'BULLISH_SWEET_SPOT')}
          className={`p-3 rounded-2xl border text-left transition-all ${
            activeFilter === 'BULLISH_SWEET_SPOT'
              ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-400/30 shadow-sm'
              : 'bg-white border-slate-200/80 hover:border-emerald-300 shadow-2xs'
          }`}
        >
          <div className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider flex items-center justify-between">
            <span>Prime Pullbacks</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-0.5">{stats.bullishSweetSpot}</div>
          <div className="text-[10px] text-emerald-600 mt-0.5 font-medium">
            RSI 40–55 + VWAP
          </div>
        </button>

        {/* High Conviction */}
        <button
          onClick={() => setActiveFilter(activeFilter === 'HIGH_SCORE' ? 'ALL' : 'HIGH_SCORE')}
          className={`p-3 rounded-2xl border text-left transition-all ${
            activeFilter === 'HIGH_SCORE'
              ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-400/30 shadow-sm'
              : 'bg-white border-slate-200/80 hover:border-purple-300 shadow-2xs'
          }`}
        >
          <div className="text-[10px] font-semibold text-purple-700 uppercase tracking-wider flex items-center justify-between">
            <span>High Quality</span>
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-purple-700 mt-0.5">{stats.highScore}</div>
          <div className="text-[10px] text-purple-600 mt-0.5 font-medium">
            Score 75+ ⭐⭐⭐⭐
          </div>
        </button>
      </div>

      {/* Active Filter Banner for 15m High Cross */}
      {activeFilter === 'FIRST_15M_HIGH_CROSS' && (
        <div className="bg-gradient-to-r from-emerald-600/15 via-teal-500/15 to-emerald-500/10 border border-emerald-500/80 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-center space-x-2.5 text-emerald-950 font-extrabold">
            <span className="p-1.5 bg-emerald-600 text-white rounded-lg shadow-2xs">
              <ArrowUpRight className="w-4 h-4 text-white" />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-black text-emerald-950">🟢 Stocks Crossing 09:15 AM First 15m High ({filteredStocks.length}) — Sorted by Candle Body % Crossed</span>
                <div className="flex items-center gap-1">
                  <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full">
                    🟢 {filteredStocks.filter(s => s.stock.isOpenEqualLow).length} Open=Low
                  </span>
                </div>
              </div>
              <span className="text-[11px] text-emerald-800 font-medium block mt-0.5">Showing stocks where current price or candle body broke above the first 15-minute high level (09:15-09:30 AM), with exact % body cross calculations.</span>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={() => setActiveFilter('ALL')}
              className="text-xs font-black text-emerald-950 hover:bg-emerald-200 bg-emerald-100/90 px-3 py-1.5 rounded-xl border border-emerald-300 transition-colors shadow-2xs"
            >
              Show All ({stocks.length})
            </button>
          </div>
        </div>
      )}

      {/* Active Filter Banner for 15m Low Cross */}
      {activeFilter === 'FIRST_15M_LOW_CROSS' && (
        <div className="bg-gradient-to-r from-rose-600/15 via-amber-500/15 to-rose-500/10 border border-rose-500/80 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-center space-x-2.5 text-rose-950 font-extrabold">
            <span className="p-1.5 bg-rose-600 text-white rounded-lg shadow-2xs">
              <ArrowDownRight className="w-4 h-4 text-white" />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-black text-rose-950">🔴 Stocks Crossing 09:15 AM First 15m Low ({filteredStocks.length}) — Sorted by Candle Body % Crossed</span>
                <div className="flex items-center gap-1">
                  <span className="bg-rose-100 text-rose-900 border border-rose-300 text-[10px] font-black px-2 py-0.5 rounded-full">
                    🔴 {filteredStocks.filter(s => s.stock.isOpenEqualHigh).length} Open=High
                  </span>
                </div>
              </div>
              <span className="text-[11px] text-rose-800 font-medium block mt-0.5">Showing stocks where current price or candle body broke below the first 15-minute low level (09:15-09:30 AM), with exact % body breakdown calculations.</span>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={() => setActiveFilter('ALL')}
              className="text-xs font-black text-rose-950 hover:bg-rose-200 bg-rose-100/90 px-3 py-1.5 rounded-xl border border-rose-300 transition-colors shadow-2xs"
            >
              Show All ({stocks.length})
            </button>
          </div>
        </div>
      )}

      {/* Active Filter Banner for 5X 1st Candle R-Volume */}
      {activeFilter === 'FIRST_CANDLE_5X' && (
        <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-amber-500/10 border border-amber-400/80 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-center space-x-2.5 text-amber-950 font-extrabold">
            <span className="p-1.5 bg-amber-500 text-slate-950 rounded-lg shadow-2xs">
              <Zap className="w-4 h-4 fill-slate-950 text-slate-950" />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-black text-amber-950">🔥 1st Candle (09:15 AM) 5X+ R-Volume Stocks ({filteredStocks.length}) — Sorted High → Low</span>
                <div className="flex items-center gap-1">
                  <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full">
                    🟢 {filteredStocks.filter(s => s.stock.isOpenEqualLow).length} Open=Low
                  </span>
                  <span className="bg-rose-100 text-rose-900 border border-rose-300 text-[10px] font-black px-2 py-0.5 rounded-full">
                    🔴 {filteredStocks.filter(s => s.stock.isOpenEqualHigh).length} Open=High
                  </span>
                </div>
              </div>
              <span className="text-[11px] text-amber-800 font-medium block mt-0.5">Filtering stocks with 09:15 AM opening volume &ge; 5.0X relative volume, sorted from highest multiplier to lowest.</span>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={() => setActiveFilter('ALL')}
              className="text-xs font-black text-amber-950 hover:bg-amber-200 bg-amber-100/90 px-3 py-1.5 rounded-xl border border-amber-300 transition-colors shadow-2xs"
            >
              Show All ({stocks.length})
            </button>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Stocks ({stocks.length})
          </button>
          
          <button
            onClick={() => setActiveFilter('BULLISH_SWEET_SPOT')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeFilter === 'BULLISH_SWEET_SPOT'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/80'
            }`}
          >
            Bullish Prime (40-55 RSI)
          </button>

          <button
            onClick={() => setActiveFilter('OVERSOLD')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeFilter === 'OVERSOLD'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/80'
            }`}
          >
            Oversold (&lt;40 RSI)
          </button>

          <button
            onClick={() => setActiveFilter('BEARISH_RALLY')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeFilter === 'BEARISH_RALLY'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200/80'
            }`}
          >
            Bearish Rally (48-62 RSI)
          </button>

          <button
            onClick={() => setActiveFilter('VOL_INCREASING')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 ${
              activeFilter === 'VOL_INCREASING'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200/80'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Volume Increasing 📈</span>
          </button>

          <button
            onClick={() => {
              setActiveFilter('FIRST_15M_HIGH_CROSS');
              setSortBy('BODY_CROSS_PCT_DESC');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 ${
              activeFilter === 'FIRST_15M_HIGH_CROSS'
                ? 'bg-emerald-600 text-white shadow-2xs font-extrabold'
                : 'bg-emerald-100 text-emerald-950 hover:bg-emerald-200 border border-emerald-400 font-extrabold'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-700" />
            <span>🟢 15m High Cross ({stats.fifteenMinHighCrossCount})</span>
          </button>

          <button
            onClick={() => {
              setActiveFilter('FIRST_15M_LOW_CROSS');
              setSortBy('BODY_CROSS_PCT_DESC');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 ${
              activeFilter === 'FIRST_15M_LOW_CROSS'
                ? 'bg-rose-600 text-white shadow-2xs font-extrabold'
                : 'bg-rose-100 text-rose-950 hover:bg-rose-200 border border-rose-400 font-extrabold'
            }`}
          >
            <ArrowDownRight className="w-3.5 h-3.5 text-rose-700" />
            <span>🔴 15m Low Cross ({stats.fifteenMinLowCrossCount})</span>
          </button>

          <button
            onClick={() => {
              setActiveFilter('FIRST_CANDLE_5X');
              setSortBy('FIRST_CANDLE_RVOL_DESC');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 ${
              activeFilter === 'FIRST_CANDLE_5X'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-amber-100 text-amber-950 hover:bg-amber-200 border border-amber-400/80 font-black'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
            <span>🔥 5X+ 1st Candle R-Vol</span>
          </button>

          <button
            onClick={() => setActiveFilter('FIRST_CANDLE_BUY')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 ${
              activeFilter === 'FIRST_CANDLE_BUY'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-300'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>09:15 Buy Surge (&gt;1.5X) 🟢</span>
          </button>

          <button
            onClick={() => setActiveFilter('HIGH_RVOL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 ${
              activeFilter === 'HIGH_RVOL'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-300'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-amber-600" />
            <span>High R-Vol (&gt;1.2X) ⚡</span>
          </button>

          <button
            onClick={() => setActiveFilter('OPEN_LOW')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeFilter === 'OPEN_LOW'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200/80'
            }`}
          >
            Open = Low
          </button>
        </div>

        {/* Search, Sort, View Controls */}
        <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
          {/* Search */}
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search symbol..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="BODY_CROSS_PCT_DESC">Sort: Highest 15m Body Cross % 🚀</option>
            <option value="FIRST_15M_HIGH_CROSS_DESC">Sort: 15m High Cross % High → Low 🟢</option>
            <option value="SCORE_DESC">Sort: Best Score</option>
            <option value="FIRST_CANDLE_RVOL_DESC">Sort: 1st Candle R-Vol High → Low 🔥</option>
            <option value="RVOL_DESC">Sort: Session R-Vol High → Low ⚡</option>
            <option value="FIRST_CANDLE_RATIO_DESC">Sort: 09:15 Buy Vol Multiplier 🟢</option>
            <option value="RSI_ASC">Sort: RSI Low → High</option>
            <option value="RSI_DESC">Sort: RSI High → Low</option>
            <option value="PCT_CHANGE_DESC">Sort: % Gainers</option>
            <option value="VOLUME_DESC">Sort: Volume</option>
          </select>
        </div>

      </div>

      {/* Main Stock List */}
      {filteredStocks.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
          <Filter className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No stocks match the selected RSI filter</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try resetting your filter or search query, or fetch live candles from Dhan API to update RSI values.
          </p>
          <button
            onClick={() => {
              setActiveFilter('ALL');
              setSearchQuery('');
            }}
            className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl shadow-2xs hover:bg-slate-900 transition-colors"
          >
            Show All Stocks
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStocks.map(({ stock, analysis }) => {
            const isBullish = analysis.pullbackCategory === 'BULLISH_SWEET_SPOT' || analysis.pullbackCategory === 'BULLISH_MOMENTUM' || analysis.pullbackCategory === 'OVERSOLD_BOUNCE';
            const isBearish = analysis.pullbackCategory === 'BEARISH_RALLY';

            return (
              <div
                key={stock.id}
                className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group relative"
              >
                {/* Card Top: Header & Badges */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-black text-slate-900 text-base group-hover:text-blue-600 transition-colors">
                          {stock.symbol}
                        </span>
                        {stock.isOpenEqualLow && (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded border border-emerald-300">
                            OPEN=LOW
                          </span>
                        )}
                        {stock.isOpenEqualHigh && (
                          <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-1.5 py-0.5 rounded border border-rose-300">
                            OPEN=HIGH
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[200px]">
                        {stock.companyName}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-black text-slate-900">
                        {stock.closePrice !== undefined && stock.closePrice !== null ? `₹${stock.closePrice.toFixed(2)}` : 'N/A'}
                      </div>
                      <div className={`text-xs font-bold ${
                        (stock.pctChange || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {(stock.pctChange || 0) >= 0 ? '+' : ''}{(stock.pctChange || 0).toFixed(2)}%
                      </div>
                    </div>
                  </div>

                  {/* RSI Gauge Bar & Category */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between text-xs flex-wrap gap-1">
                      <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                        <span className="font-bold text-slate-700">RSI 14:</span>
                        <span className={`px-2 py-0.5 rounded-md font-black text-xs ${
                          analysis.rsiVal >= 40 && analysis.rsiVal <= 55
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : analysis.rsiVal < 40
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : analysis.rsiVal > 65
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : 'bg-blue-100 text-blue-800 border border-blue-300'
                        }`}>
                          {analysis.rsiVal.toFixed(1)}
                        </span>

                        {/* Volume Trend Badge */}
                        {analysis.volumeDirection === 'INCREASING' ? (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-1.5 py-0.5 rounded border border-emerald-300 flex items-center gap-0.5">
                            <TrendingUp className="w-3 h-3 text-emerald-600" />
                            Vol +{analysis.volumeDeltaPct}% 📈
                          </span>
                        ) : analysis.volumeDirection === 'DECREASING' ? (
                          <span className="bg-rose-100 text-rose-800 text-[10px] font-extrabold px-1.5 py-0.5 rounded border border-rose-300 flex items-center gap-0.5">
                            <TrendingDown className="w-3 h-3 text-rose-600" />
                            Vol {analysis.volumeDeltaPct}% 📉
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-200">
                            Vol Flat
                          </span>
                        )}
                      </div>

                      <span className={`text-[11px] font-bold ${
                        analysis.isVwapBullish ? 'text-emerald-700' : 'text-rose-700'
                      }`}>
                        {analysis.vwapStatus} VWAP (₹{stock.vwap ? stock.vwap.toFixed(1) : '-'})
                      </span>
                    </div>

                    {/* RSI Progress Gauge Bar */}
                    <div className="relative w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                      {/* Oversold zone <35 */}
                      <div className="absolute left-0 top-0 bottom-0 w-[35%] bg-amber-200/50" />
                      {/* Sweet spot zone 40-55 */}
                      <div className="absolute left-[40%] top-0 bottom-0 w-[15%] bg-emerald-300/60" />
                      {/* Overbought zone >65 */}
                      <div className="absolute left-[65%] top-0 bottom-0 w-[35%] bg-rose-200/50" />

                      {/* Indicator Dot */}
                      <div
                        className="absolute top-0 bottom-0 w-2.5 bg-slate-900 border-2 border-white rounded-full shadow-md transform -translate-x-1/2"
                        style={{ left: `${Math.min(100, Math.max(0, analysis.rsiVal))}%` }}
                      />
                    </div>

                    {/* Status Label */}
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                      <span>30 (Oversold)</span>
                      <span className="font-bold text-emerald-700">40-55 (Sweet Pullback)</span>
                      <span>70 (Overbought)</span>
                    </div>
                  </div>

                  {/* R-Volume & 09:15 Opening Candle Buy/Sell Volume Section */}
                  {analysis.volumeAnalysis && (
                    <div className="bg-slate-900 text-white p-3 rounded-xl space-y-2.5 border border-slate-800 shadow-xs">
                      {/* 5X+ Surge Alert Badge with Open=Low/High mention */}
                      {(analysis.volumeAnalysis.firstCandleRVol >= 5.0 || analysis.volumeAnalysis.firstCandleMultiple >= 5.0) && (
                        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black px-2.5 py-1 rounded-lg text-[11px] flex items-center justify-between shadow-xs animate-pulse">
                          <span className="flex items-center gap-1 uppercase tracking-wider">
                            <Zap className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
                            🔥 5X+ Opening Volume Surge
                            {stock.isOpenEqualLow && <span className="bg-slate-950 text-emerald-300 px-1.5 py-0.2 rounded text-[9px] font-black border border-emerald-400">OPEN=LOW 🟢</span>}
                            {stock.isOpenEqualHigh && <span className="bg-slate-950 text-rose-300 px-1.5 py-0.2 rounded text-[9px] font-black border border-rose-400">OPEN=HIGH 🔴</span>}
                          </span>
                          <span className="font-mono bg-slate-950 text-amber-300 px-1.5 py-0.2 rounded text-[10px]">
                            {analysis.volumeAnalysis.firstCandleRVol >= 5.0
                              ? `${analysis.volumeAnalysis.firstCandleRVol}X R-Vol`
                              : `${analysis.volumeAnalysis.firstCandleMultiple}X Vol Multiplier`}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-1.5 flex-wrap">
                        <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                          <span className="text-[10px] font-bold uppercase text-slate-400">09:15 Candle:</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            analysis.volumeAnalysis.firstCandleDominantSide === 'BUY'
                              ? 'bg-emerald-500 text-slate-950 font-extrabold'
                              : 'bg-rose-500 text-white font-extrabold'
                          }`}>
                            {analysis.volumeAnalysis.firstCandleDirectionLabel}
                          </span>

                          {/* OPEN=LOW or OPEN=HIGH badge in R-Volume */}
                          {stock.isOpenEqualLow ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-400 text-slate-950 border border-emerald-300 flex items-center gap-0.5">
                              🟢 OPEN=LOW
                            </span>
                          ) : stock.isOpenEqualHigh ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-500 text-white border border-rose-400 flex items-center gap-0.5">
                              🔴 OPEN=HIGH
                            </span>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* 1st Candle R-Vol Pill */}
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${
                            analysis.volumeAnalysis.firstCandleRVol >= 5.0
                              ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-2xs'
                              : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                          }`}>
                            🔥 1st Candle R-Vol: {analysis.volumeAnalysis.firstCandleRVol}X
                          </span>

                          {/* Session R-Vol Pill */}
                          <span className="text-[10px] font-extrabold text-slate-200 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                            ⚡ Session R-Vol: {analysis.volumeAnalysis.rVolume}X
                          </span>
                        </div>
                      </div>

                      {/* Explicit Open Pattern & R-Volume Status Banner */}
                      <div className="flex items-center justify-between text-[10px] bg-slate-950/90 px-2.5 py-1 rounded-lg border border-slate-800 font-mono">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <span className="text-slate-500">Open Pattern:</span>
                          {stock.isOpenEqualLow ? (
                            <strong className="text-emerald-400 font-black uppercase">🟢 OPEN = LOW (Bullish Base)</strong>
                          ) : stock.isOpenEqualHigh ? (
                            <strong className="text-rose-400 font-black uppercase">🔴 OPEN = HIGH (Bearish Cap)</strong>
                          ) : (
                            <strong className="text-slate-400 font-normal">Normal Open</strong>
                          )}
                        </span>
                        <span className="text-slate-400">
                          R-Vol Impact: <strong className={analysis.volumeAnalysis.firstCandleRVol >= 5.0 ? "text-amber-300 font-bold" : "text-slate-300"}>
                            {analysis.volumeAnalysis.firstCandleRVol >= 5.0 ? '🔥 5X Extreme Vol' : `${analysis.volumeAnalysis.firstCandleRVol}X`}
                          </strong>
                        </span>
                      </div>

                      {/* Bull Vol vs Bear Vol Bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-300">
                          <span>🟢 Day Buy Vol: {analysis.volumeAnalysis.bullVolPct}% ({(analysis.volumeAnalysis.totalBullVol / 1000).toFixed(1)}k)</span>
                          <span>🔴 Day Sell Vol: {analysis.volumeAnalysis.bearVolPct}% ({(analysis.volumeAnalysis.totalBearVol / 1000).toFixed(1)}k)</span>
                        </div>
                        <div className="w-full h-2 bg-rose-600/80 rounded-full overflow-hidden flex">
                          <div 
                            className="h-full bg-emerald-500 transition-all duration-300" 
                            style={{ width: `${analysis.volumeAnalysis.bullVolPct}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>Buy/Sell Ratio: <strong className="text-emerald-400 font-bold">{analysis.volumeAnalysis.bullBearRatio}X</strong></span>
                          <span>09:15 Candle Vol: <strong className="text-white font-bold">{(analysis.volumeAnalysis.firstCandleVol / 1000).toFixed(1)}k</strong></span>
                        </div>
                      </div>

                      {/* First 15-Minute Candle High/Low Breakout & Body Cross % Card */}
                      <div className={`p-2.5 rounded-xl border space-y-1.5 font-mono text-xs shadow-2xs ${
                        analysis.volumeAnalysis.hasCrossedFirst15mHigh
                          ? 'bg-gradient-to-r from-emerald-950/90 to-teal-950/80 border-emerald-500/70 text-emerald-100'
                          : analysis.volumeAnalysis.hasCrossedFirst15mLow
                          ? 'bg-gradient-to-r from-rose-950/90 to-amber-950/80 border-rose-500/70 text-rose-100'
                          : 'bg-slate-950/80 border-slate-800 text-slate-300'
                      }`}>
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {analysis.volumeAnalysis.hasCrossedFirst15mHigh ? (
                              <span className="text-emerald-300 font-black text-[11px] flex items-center gap-1 uppercase tracking-wider">
                                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                                🟢 15m High Breakout (₹{analysis.volumeAnalysis.firstCandleHigh.toFixed(1)})
                              </span>
                            ) : analysis.volumeAnalysis.hasCrossedFirst15mLow ? (
                              <span className="text-rose-300 font-black text-[11px] flex items-center gap-1 uppercase tracking-wider">
                                <ArrowDownRight className="w-3.5 h-3.5 text-rose-400 stroke-[3]" />
                                🔴 15m Low Breakdown (₹{analysis.volumeAnalysis.firstCandleLow.toFixed(1)})
                              </span>
                            ) : (
                              <span className="text-slate-400 font-bold text-[11px] flex items-center gap-1">
                                ↔️ Inside 15m Range (Low ₹{analysis.volumeAnalysis.firstCandleLow.toFixed(1)} - High ₹{analysis.volumeAnalysis.firstCandleHigh.toFixed(1)})
                              </span>
                            )}

                            {stock.isOpenEqualLow && (
                              <span className="bg-emerald-400 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded">
                                OPEN=LOW 🟢
                              </span>
                            )}
                            {stock.isOpenEqualHigh && (
                              <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded">
                                OPEN=HIGH 🔴
                              </span>
                            )}
                          </div>

                          <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                            analysis.volumeAnalysis.hasCrossedFirst15mHigh
                              ? 'bg-emerald-500 text-slate-950 shadow-2xs'
                              : analysis.volumeAnalysis.hasCrossedFirst15mLow
                              ? 'bg-rose-500 text-white shadow-2xs'
                              : 'bg-slate-800 text-slate-300'
                          }`}>
                            {analysis.volumeAnalysis.hasCrossedFirst15mHigh || analysis.volumeAnalysis.hasCrossedFirst15mLow
                              ? `${analysis.volumeAnalysis.first15mBodyCrossPct}% Body Crossed`
                              : '0% Body Crossed'}
                          </span>
                        </div>

                        {/* Progress Bar & Percentage Stats */}
                        {(analysis.volumeAnalysis.hasCrossedFirst15mHigh || analysis.volumeAnalysis.hasCrossedFirst15mLow) ? (
                          <div className="space-y-1 pt-0.5">
                            <div className="flex items-center justify-between text-[10px] text-slate-300 font-medium">
                              <span>
                                Level Cross: <strong className={analysis.volumeAnalysis.hasCrossedFirst15mHigh ? 'text-emerald-300 font-black' : 'text-rose-300 font-black'}>
                                  {analysis.volumeAnalysis.first15mCrossPct > 0 ? `+${analysis.volumeAnalysis.first15mCrossPct}%` : `${analysis.volumeAnalysis.first15mCrossPct}%`}
                                </strong>
                              </span>
                              <span>
                                Candle Body Expansion: <strong className="text-amber-300 font-black">{analysis.volumeAnalysis.first15mBodyCrossPct}%</strong>
                              </span>
                            </div>
                            <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800/80">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  analysis.volumeAnalysis.hasCrossedFirst15mHigh
                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-300'
                                    : 'bg-gradient-to-r from-rose-500 to-amber-400'
                                }`}
                                style={{ width: `${Math.min(100, Math.max(6, analysis.volumeAnalysis.first15mBodyCrossPct))}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 flex items-center justify-between pt-0.5">
                            <span>09:15-09:30 AM Range: ₹{(analysis.volumeAnalysis.firstCandleHigh - analysis.volumeAnalysis.firstCandleLow).toFixed(2)}</span>
                            <span>Awaiting 15m High/Low Breakout</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Pullback Setup Box */}
                  <div className={`p-3 rounded-xl border space-y-1.5 ${
                    isBullish
                      ? 'bg-emerald-50/60 border-emerald-200'
                      : isBearish
                      ? 'bg-rose-50/60 border-rose-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-black uppercase tracking-wide px-2 py-0.5 rounded ${
                        isBullish
                          ? 'bg-emerald-600 text-white'
                          : isBearish
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-700 text-white'
                      }`}>
                        {analysis.pullbackSignal}
                      </span>

                      <div className="flex items-center space-x-1 text-xs font-bold text-slate-700">
                        <span>Quality:</span>
                        <span className="text-amber-500 font-black">
                          {'★'.repeat(analysis.qualityStars)}
                          <span className="text-slate-300">{'★'.repeat(5 - analysis.qualityStars)}</span>
                        </span>
                        <span className="text-[10px] text-slate-500 font-normal">({analysis.pullbackScore}/100)</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-700 leading-snug">
                      {analysis.reasoning}
                    </p>

                    {/* Trade Levels Grid */}
                    <div className="grid grid-cols-3 gap-1 pt-2 border-t border-slate-200/60 text-[11px]">
                      <div className="bg-white p-1.5 rounded-lg border border-slate-200 text-center">
                        <div className="text-[9px] font-bold text-slate-500 uppercase">Entry Zone</div>
                        <div className="font-black text-slate-900">₹{analysis.idealEntry}</div>
                      </div>
                      <div className="bg-white p-1.5 rounded-lg border border-slate-200 text-center">
                        <div className="text-[9px] font-bold text-slate-500 uppercase">Stop Loss</div>
                        <div className="font-black text-rose-700">₹{analysis.stopLoss}</div>
                      </div>
                      <div className="bg-white p-1.5 rounded-lg border border-slate-200 text-center">
                        <div className="text-[9px] font-bold text-slate-500 uppercase">Target 1</div>
                        <div className="font-black text-emerald-700">₹{analysis.target1}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Bottom Actions */}
                <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => onOpenRsiAnalyst(stock)}
                    className="flex-1 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-[11px] rounded-lg border border-blue-200 transition-colors flex items-center justify-center space-x-1"
                  >
                    <Sparkles className="w-3 h-3 text-blue-600" />
                    <span>RSI Timeline</span>
                  </button>

                  <button
                    onClick={() => onOpenPositionSizer(stock)}
                    className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] rounded-lg border border-slate-200 transition-colors flex items-center justify-center space-x-1"
                  >
                    <Calculator className="w-3 h-3 text-slate-600" />
                    <span>Position Size</span>
                  </button>

                  <button
                    onClick={() => onSelectStockDetail(stock)}
                    title="View Stock Details & Levels"
                    className="p-1.5 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg text-[11px] font-medium transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
