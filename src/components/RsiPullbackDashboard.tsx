import React, { useState, useMemo } from 'react';
import { StockCalculated } from '../types';
import { analyzeRsiPullback, RsiPullbackAnalysis } from '../utils/rsiPullback';
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
  ChevronUp
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
  | 'BULLISH_RALLY'
  | 'BEARISH_RALLY'
  | 'BULLISH_SWEET_SPOT' 
  | 'BULLISH_MOMENTUM' 
  | 'OVERSOLD' 
  | 'HIGH_SCORE'
  | 'VOL_INCREASING'
  | 'OPEN_LOW';

type SortOption = 'SCORE_DESC' | 'RSI_ASC' | 'RSI_DESC' | 'PCT_CHANGE_DESC' | 'VOLUME_DESC';

export const RsiPullbackDashboard: React.FC<RsiPullbackDashboardProps> = ({
  stocks,
  onSelectStockDetail,
  onOpenPositionSizer,
  onOpenRsiAnalyst,
  onFetchSingleStock
}) => {
  const [activeFilter, setActiveFilter] = useState<PullbackFilterType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('SCORE_DESC');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [expandedChecklistStockId, setExpandedChecklistStockId] = useState<string | null>(null);
  
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
    let bullishRallyCount = 0;
    let bearishRallyCount = 0;
    let bullishSweetSpot = 0;
    let bullishMomentum = 0;
    let oversold = 0;
    let highScore = 0;

    analyzedStocks.forEach(({ stock, analysis }) => {
      if (analysis.bullishRally.score >= 65) bullishRallyCount++;
      if (analysis.bearishRally.score >= 65) bearishRallyCount++;
      if (analysis.pullbackCategory === 'BULLISH_SWEET_SPOT') bullishSweetSpot++;
      if (analysis.pullbackCategory === 'BULLISH_MOMENTUM') bullishMomentum++;
      if (analysis.pullbackCategory === 'OVERSOLD_BOUNCE') oversold++;
      if (analysis.pullbackScore >= 75) highScore++;
    });

    return {
      total: stocks.length,
      bullishRallyCount,
      bearishRallyCount,
      bullishSweetSpot,
      bullishMomentum,
      oversold,
      highScore
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
      if (activeFilter === 'BULLISH_RALLY') {
        return analysis.bullishRally.score >= 65;
      }
      if (activeFilter === 'BEARISH_RALLY') {
        return analysis.bearishRally.score >= 65;
      }
      if (activeFilter === 'BULLISH_SWEET_SPOT') {
        return analysis.pullbackCategory === 'BULLISH_SWEET_SPOT';
      }
      if (activeFilter === 'BULLISH_MOMENTUM') {
        return analysis.pullbackCategory === 'BULLISH_MOMENTUM';
      }
      if (activeFilter === 'OVERSOLD') {
        return analysis.pullbackCategory === 'OVERSOLD_BOUNCE';
      }
      if (activeFilter === 'HIGH_SCORE') {
        return analysis.pullbackScore >= 75;
      }
      if (activeFilter === 'VOL_INCREASING') {
        return analysis.volumeDirection === 'INCREASING';
      }
      if (activeFilter === 'OPEN_LOW') {
        return Boolean(stock.isOpenEqualLow);
      }

      return true;
    });

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'SCORE_DESC') return b.analysis.pullbackScore - a.analysis.pullbackScore;
      if (sortBy === 'RSI_ASC') return a.analysis.rsiVal - b.analysis.rsiVal;
      if (sortBy === 'RSI_DESC') return b.analysis.rsiVal - a.analysis.rsiVal;
      if (sortBy === 'PCT_CHANGE_DESC') return (b.stock.pctChange || 0) - (a.stock.pctChange || 0);
      if (sortBy === 'VOLUME_DESC') return (b.stock.volume || 0) - (a.stock.volume || 0);
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
              <div className="flex flex-wrap items-center gap-2 pb-1 border-b border-slate-200">
                <span className="font-bold text-slate-700">Rally Scores:</span>
                <span className={`px-2 py-0.5 rounded font-black text-[11px] border ${calcResult.analysis.bullishRally.badgeColor}`}>
                  🔥 Bullish Rally: {calcResult.analysis.bullishRally.score}/100 ({calcResult.analysis.bullishRally.interpretation})
                </span>
                <span className={`px-2 py-0.5 rounded font-black text-[11px] border ${calcResult.analysis.bearishRally.badgeColor}`}>
                  🔻 Bearish Rally: {calcResult.analysis.bearishRally.score}/100 ({calcResult.analysis.bearishRally.interpretation})
                </span>
              </div>
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Scanned */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Scanned</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{stats.total}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span>Nifty F&amp;O Stocks</span>
          </div>
        </div>

        {/* Bullish Rally */}
        <button
          onClick={() => setActiveFilter(activeFilter === 'BULLISH_RALLY' ? 'ALL' : 'BULLISH_RALLY')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeFilter === 'BULLISH_RALLY'
              ? 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-400/40 shadow-sm'
              : 'bg-emerald-50/70 border-emerald-200 hover:border-emerald-400 shadow-2xs'
          }`}
        >
          <div className={`text-[11px] font-bold uppercase tracking-wider flex items-center justify-between ${
            activeFilter === 'BULLISH_RALLY' ? 'text-emerald-100' : 'text-emerald-800'
          }`}>
            <span>🔥 Bullish Rally</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className={`text-2xl font-black mt-1 ${
            activeFilter === 'BULLISH_RALLY' ? 'text-white' : 'text-emerald-900'
          }`}>{stats.bullishRallyCount}</div>
          <div className={`text-[11px] mt-1 font-medium ${
            activeFilter === 'BULLISH_RALLY' ? 'text-emerald-100' : 'text-emerald-700'
          }`}>
            Score &ge; 65 (10 Rules)
          </div>
        </button>

        {/* Bearish Rally */}
        <button
          onClick={() => setActiveFilter(activeFilter === 'BEARISH_RALLY' ? 'ALL' : 'BEARISH_RALLY')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeFilter === 'BEARISH_RALLY'
              ? 'bg-rose-600 text-white border-rose-700 ring-2 ring-rose-400/40 shadow-sm'
              : 'bg-rose-50/70 border-rose-200 hover:border-rose-400 shadow-2xs'
          }`}
        >
          <div className={`text-[11px] font-bold uppercase tracking-wider flex items-center justify-between ${
            activeFilter === 'BEARISH_RALLY' ? 'text-rose-100' : 'text-rose-800'
          }`}>
            <span>🔻 Bearish Rally</span>
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
          </div>
          <div className={`text-2xl font-black mt-1 ${
            activeFilter === 'BEARISH_RALLY' ? 'text-white' : 'text-rose-900'
          }`}>{stats.bearishRallyCount}</div>
          <div className={`text-[11px] mt-1 font-medium ${
            activeFilter === 'BEARISH_RALLY' ? 'text-rose-100' : 'text-rose-700'
          }`}>
            Score &ge; 65 (10 Rules)
          </div>
        </button>

        {/* Bullish Sweet Spot */}
        <button
          onClick={() => setActiveFilter(activeFilter === 'BULLISH_SWEET_SPOT' ? 'ALL' : 'BULLISH_SWEET_SPOT')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeFilter === 'BULLISH_SWEET_SPOT'
              ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-400/30 shadow-sm'
              : 'bg-white border-slate-200/80 hover:border-emerald-300 shadow-2xs'
          }`}
        >
          <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider flex items-center justify-between">
            <span>Prime Pullbacks</span>
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{stats.bullishSweetSpot}</div>
          <div className="text-[11px] text-emerald-600 mt-1 font-medium">
            RSI 40–55 + VWAP
          </div>
        </button>

        {/* Momentum Pullbacks */}
        <button
          onClick={() => setActiveFilter(activeFilter === 'BULLISH_MOMENTUM' ? 'ALL' : 'BULLISH_MOMENTUM')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeFilter === 'BULLISH_MOMENTUM'
              ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-400/30 shadow-sm'
              : 'bg-white border-slate-200/80 hover:border-blue-300 shadow-2xs'
          }`}
        >
          <div className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">Momentum Dip</div>
          <div className="text-2xl font-black text-blue-700 mt-1">{stats.bullishMomentum}</div>
          <div className="text-[11px] text-blue-600 mt-1 font-medium">
            RSI 55–65 Dip
          </div>
        </button>

        {/* High Conviction */}
        <button
          onClick={() => setActiveFilter(activeFilter === 'HIGH_SCORE' ? 'ALL' : 'HIGH_SCORE')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeFilter === 'HIGH_SCORE'
              ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-400/30 shadow-sm'
              : 'bg-white border-slate-200/80 hover:border-purple-300 shadow-2xs'
          }`}
        >
          <div className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider flex items-center justify-between">
            <span>High Quality</span>
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-700 mt-1">{stats.highScore}</div>
          <div className="text-[11px] text-purple-600 mt-1 font-medium">
            Score 75+ ⭐⭐⭐⭐
          </div>
        </button>
      </div>

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
            onClick={() => setActiveFilter('BULLISH_RALLY')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1 ${
              activeFilter === 'BULLISH_RALLY'
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border-emerald-200'
            }`}
          >
            <span>🔥 Bullish Rally ({stats.bullishRallyCount})</span>
          </button>

          <button
            onClick={() => setActiveFilter('BEARISH_RALLY')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1 ${
              activeFilter === 'BEARISH_RALLY'
                ? 'bg-rose-600 text-white border-rose-700 shadow-2xs'
                : 'bg-rose-50 text-rose-900 hover:bg-rose-100 border-rose-200'
            }`}
          >
            <span>🔻 Bearish Rally ({stats.bearishRallyCount})</span>
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
            <option value="SCORE_DESC">Sort: Best Score</option>
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

                  {/* Rally Confluence Scores Box */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className={`p-2.5 rounded-xl border flex flex-col justify-between transition-colors ${
                      analysis.bullishRally.score >= 65
                        ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-400/30'
                        : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-[11px] text-slate-800">🔥 Bullish Rally</span>
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${analysis.bullishRally.badgeColor}`}>
                          {analysis.bullishRally.score}/100
                        </span>
                      </div>
                      <div className="text-[10px] font-semibold text-slate-600 mt-1">
                        {analysis.bullishRally.interpretation}
                      </div>
                    </div>

                    <div className={`p-2.5 rounded-xl border flex flex-col justify-between transition-colors ${
                      analysis.bearishRally.score >= 65
                        ? 'bg-rose-50 border-rose-300 ring-1 ring-rose-400/30'
                        : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-[11px] text-slate-800">🔻 Bearish Rally</span>
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${analysis.bearishRally.badgeColor}`}>
                          {analysis.bearishRally.score}/100
                        </span>
                      </div>
                      <div className="text-[10px] font-semibold text-slate-600 mt-1">
                        {analysis.bearishRally.interpretation}
                      </div>
                    </div>
                  </div>

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

                  {/* Confluence Checklist Expander Button */}
                  <button
                    onClick={() => setExpandedChecklistStockId(expandedChecklistStockId === stock.id ? null : stock.id)}
                    className="w-full py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-xl border border-slate-200 flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      <span>10-Factor Rally Confluence Rules</span>
                    </span>
                    {expandedChecklistStockId === stock.id ? (
                      <ChevronUp className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                  </button>

                  {/* Confluence Checklist Drawer */}
                  {expandedChecklistStockId === stock.id && (
                    <div className="p-3 bg-slate-900 text-slate-200 rounded-xl space-y-3 text-[11px] animate-fade-in border border-slate-800">
                      <div>
                        <div className="font-black text-emerald-400 mb-1.5 flex items-center justify-between border-b border-slate-800 pb-1">
                          <span>🔥 Bullish Rally Breakdown ({analysis.bullishRally.score}/100)</span>
                          <span className="text-[10px] text-emerald-300 font-bold">{analysis.bullishRally.interpretation}</span>
                        </div>
                        <div className="space-y-1">
                          {analysis.bullishRally.factors.map((f) => (
                            <div key={f.id} className="flex items-center justify-between text-[10px]">
                              <span className={f.passed ? 'text-emerald-300 font-medium' : 'text-slate-500 line-through'}>
                                {f.label}
                              </span>
                              <span className={f.passed ? 'text-emerald-400 font-bold' : 'text-slate-600'}>
                                {f.passed ? `+${f.points}` : '0'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="font-black text-rose-400 mb-1.5 flex items-center justify-between border-b border-slate-800 pb-1 pt-1">
                          <span>🔻 Bearish Rally Breakdown ({analysis.bearishRally.score}/100)</span>
                          <span className="text-[10px] text-rose-300 font-bold">{analysis.bearishRally.interpretation}</span>
                        </div>
                        <div className="space-y-1">
                          {analysis.bearishRally.factors.map((f) => (
                            <div key={f.id} className="flex items-center justify-between text-[10px]">
                              <span className={f.passed ? 'text-rose-300 font-medium' : 'text-slate-500 line-through'}>
                                {f.label}
                              </span>
                              <span className={f.passed ? 'text-rose-400 font-bold' : 'text-slate-600'}>
                                {f.passed ? `+${f.points}` : '0'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
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
