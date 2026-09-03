import React, { useState, useMemo } from 'react';
import {
  Flame,
  TrendingUp,
  TrendingDown,
  Zap,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Sliders,
  Filter,
  BarChart2,
  DollarSign,
  Shield,
  Layers,
  ChevronRight,
  Info,
  Clock,
  Sparkles,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  ArrowUpDown,
  Calendar
} from 'lucide-react';
import { StockCalculated, DhanApiCredentials } from '../types';
import {
  computeAllParabolicRallies,
  ParabolicRallyAnalysis,
  SignalCheckItem,
  ParabolicStage
} from '../utils/parabolicRallyEngine';
import { FifteenMinCandleChartSnapshot } from './FifteenMinCandleChartSnapshot';

interface ParabolicRallyDashboardProps {
  stocks: StockCalculated[];
  credentials: DhanApiCredentials;
  onFetchSingleStock: (stock: StockCalculated) => Promise<void> | void;
  onFetchAllStocks: () => Promise<void> | void;
  onSelectStockDetail?: (stock: StockCalculated) => void;
  onOpenPositionSizer?: (stock: StockCalculated) => void;
  onOpenSettings?: () => void;
  isLoading?: boolean;
}

type ViewFilter =
  | 'ALL'
  | 'FULLY_BULLISH'
  | 'FULLY_BEARISH'
  | 'CONFIRMED_BULLISH'
  | 'CONFIRMED_BEARISH'
  | 'EARLY_1_3_MIN'
  | 'EXHAUSTION';

type SortOption = 'SCORE_DESC' | 'TIME_NEWEST' | 'GAIN_DESC' | 'SYMBOL_ASC';

export const ParabolicRallyDashboard: React.FC<ParabolicRallyDashboardProps> = ({
  stocks,
  credentials,
  onFetchSingleStock,
  onFetchAllStocks,
  onSelectStockDetail,
  onOpenPositionSizer,
  onOpenSettings,
  isLoading = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<ViewFilter>('FULLY_BULLISH');
  const [selectedSector, setSelectedSector] = useState<string>('ALL');
  const [minScoreFilter, setMinScoreFilter] = useState<number>(0);
  const [sortBy, setSortBy] = useState<SortOption>('SCORE_DESC');
  const [timeWindowFilter, setTimeWindowFilter] = useState<string>('ALL');
  const [inspectedStock, setInspectedStock] = useState<ParabolicRallyAnalysis | null>(null);
  const [chartStock, setChartStock] = useState<StockCalculated | null>(null);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [displayMode, setDisplayMode] = useState<'cards' | 'table'>('cards');

  // Compute all parabolic analyses
  const analyses = useMemo(() => {
    return computeAllParabolicRallies(stocks);
  }, [stocks]);

  // Unique sectors
  const sectorOptions = useMemo(() => {
    const set = new Set<string>();
    analyses.forEach((a) => {
      if (a.sectorName) set.add(a.sectorName);
    });
    return Array.from(set).sort();
  }, [analyses]);

  // Aggregate stats
  const stats = useMemo(() => {
    let fullyBullishCount = 0;
    let fullyBearishCount = 0;
    let confirmedBullishCount = 0;
    let confirmedBearishCount = 0;
    let earlyCount = 0;
    let exhaustionCount = 0;

    analyses.forEach((a) => {
      if (a.isFullyBullish) fullyBullishCount++;
      if (a.isFullyBearish) fullyBearishCount++;
      if (a.stage === 'BULLISH_CONFIRMED') confirmedBullishCount++;
      if (a.stage === 'BEARISH_CONFIRMED') confirmedBearishCount++;
      if (a.stage === 'BULLISH_EARLY' || a.stage === 'BEARISH_EARLY') earlyCount++;
      if (a.stage === 'EXHAUSTION') exhaustionCount++;
    });

    return {
      total: analyses.length,
      fullyBullishCount,
      fullyBearishCount,
      confirmedBullishCount,
      confirmedBearishCount,
      earlyCount,
      exhaustionCount
    };
  }, [analyses]);

  // Filtered analyses
  const filteredAnalyses = useMemo(() => {
    return analyses
      .filter((a) => {
        // Filter out stocks from previous days
        if (credentials?.date && a.stock.fetchedDate && a.stock.fetchedDate !== credentials.date) {
          return false;
        }

        // Search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesSym = a.stock.symbol.toLowerCase().includes(q);
          const matchesComp = a.stock.companyName.toLowerCase().includes(q);
          const matchesSec = a.sectorName.toLowerCase().includes(q);
          if (!matchesSym && !matchesComp && !matchesSec) return false;
        }

        // Sector
        if (selectedSector !== 'ALL' && a.sectorName !== selectedSector) {
          return false;
        }

        // Score filter
        if (a.score < minScoreFilter) {
          return false;
        }

        // Time Window Filter
        if (timeWindowFilter !== 'ALL') {
          const slot = a.timing.candleTimeSlot;
          if (timeWindowFilter === 'OPENING' && !slot.startsWith('09:')) return false;
          if (timeWindowFilter === 'MORNING' && (!slot.startsWith('10:') && !slot.startsWith('11:'))) return false;
          if (timeWindowFilter === 'MIDDAY' && (!slot.startsWith('11:') && !slot.startsWith('12:') && !slot.startsWith('01:'))) return false;
          if (timeWindowFilter === 'AFTERNOON' && (!slot.startsWith('01:') && !slot.startsWith('02:') && !slot.startsWith('03:'))) return false;
        }

        // View Filter
        switch (activeFilter) {
          case 'FULLY_BULLISH':
            return a.isFullyBullish;
          case 'FULLY_BEARISH':
            return a.isFullyBearish;
          case 'CONFIRMED_BULLISH':
            return a.stage === 'BULLISH_CONFIRMED';
          case 'CONFIRMED_BEARISH':
            return a.stage === 'BEARISH_CONFIRMED';
          case 'EARLY_1_3_MIN':
            return a.stage === 'BULLISH_EARLY' || a.stage === 'BEARISH_EARLY';
          case 'EXHAUSTION':
            return a.stage === 'EXHAUSTION';
          case 'ALL':
          default:
            return true;
        }
      })
      .sort((a, b) => {
        if (sortBy === 'TIME_NEWEST') {
          return (b.timing.rulePassedMinutes - a.timing.rulePassedMinutes) || (b.score - a.score);
        }
        if (sortBy === 'GAIN_DESC') {
          return (b.stock.pctChange || 0) - (a.stock.pctChange || 0);
        }
        if (sortBy === 'SYMBOL_ASC') {
          return a.stock.symbol.localeCompare(b.stock.symbol);
        }
        // Default: SCORE_DESC
        return (b.score - a.score) || (b.timing.rulePassedMinutes - a.timing.rulePassedMinutes) || ((b.stock.pctChange || 0) - (a.stock.pctChange || 0));
      });
  }, [analyses, searchQuery, selectedSector, minScoreFilter, timeWindowFilter, activeFilter, sortBy]);

  const handleRefreshAll = async () => {
    setIsRefreshingAll(true);
    try {
      await onFetchAllStocks();
    } finally {
      setIsRefreshingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 🚀 Header Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-xl border border-indigo-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
                <Zap className="w-3 h-3 fill-slate-950" /> 15-Minute Intra-Candle Engine
              </span>
              <span className="bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                12-Point Probability System
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>⚡ Parabolic Rally &amp; Breakdown Engine</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl mt-1 leading-relaxed">
              Detects high-confluence 15-minute expansions in the first 1–3 minutes. Identifies stocks that are <strong>Fully Bullish (12+ pts)</strong> or <strong>Fully Bearish (12+ pts)</strong> using VWAP, Open=Low, ORB breakout, and volume surge.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleRefreshAll}
              disabled={isLoading || isRefreshingAll}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading || isRefreshingAll ? 'animate-spin' : ''}`} />
              <span>Fetch Dhan 15m Candles</span>
            </button>
            {!credentials.isConfigured && (
              <button
                onClick={onOpenSettings}
                className="flex items-center space-x-1.5 px-3 py-2 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold hover:bg-amber-500/30 transition-all cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Configure API</span>
              </button>
            )}
          </div>
        </div>

        {/* 15-Minute Intra-Candle Logic Infographic */}
        <div className="mt-5 pt-4 border-t border-indigo-500/20 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <div className="bg-slate-900/80 border border-indigo-500/20 rounded-xl p-2.5 text-center">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Step 1 (00:00)</div>
            <div className="text-xs font-black text-white mt-0.5">15m Candle Opens</div>
            <div className="text-[9px] text-slate-400">Fresh bar initialized</div>
          </div>
          <div className="bg-slate-900/80 border border-indigo-500/20 rounded-xl p-2.5 text-center">
            <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Step 2 (Min 1–3)</div>
            <div className="text-xs font-black text-emerald-300 mt-0.5">Open = Low (+2)</div>
            <div className="text-[9px] text-slate-400">Holds above Open</div>
          </div>
          <div className="bg-slate-900/80 border border-indigo-500/20 rounded-xl p-2.5 text-center">
            <div className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Step 3</div>
            <div className="text-xs font-black text-blue-300 mt-0.5">ORB High Break (+2)</div>
            <div className="text-[9px] text-slate-400">Opening range breached</div>
          </div>
          <div className="bg-slate-900/80 border border-indigo-500/20 rounded-xl p-2.5 text-center">
            <div className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">Step 4</div>
            <div className="text-xs font-black text-purple-300 mt-0.5">Volume Surge (+2)</div>
            <div className="text-[9px] text-slate-400">&gt;20-bar avg explosion</div>
          </div>
          <div className="bg-slate-900/80 border border-indigo-500/20 rounded-xl p-2.5 text-center">
            <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Step 5</div>
            <div className="text-xs font-black text-amber-300 mt-0.5">&gt; VWAP + Rising (+3)</div>
            <div className="text-[9px] text-slate-400">Institutional control</div>
          </div>
          <div className="bg-gradient-to-br from-emerald-600/30 to-teal-600/30 border border-emerald-400/50 rounded-xl p-2.5 text-center shadow-inner">
            <div className="text-[10px] text-emerald-300 font-black uppercase tracking-wider">Step 6 (Score 12+)</div>
            <div className="text-xs font-black text-white mt-0.5">🔥 PARABOLIC RALLY</div>
            <div className="text-[9px] text-emerald-200">High-confluence entry</div>
          </div>
        </div>
      </div>

      {/* 📊 Summary Stats Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Fully Bullish 12+ */}
        <button
          onClick={() => setActiveFilter('FULLY_BULLISH')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            activeFilter === 'FULLY_BULLISH'
              ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-500/20 ring-2 ring-emerald-400/40'
              : 'bg-white hover:bg-emerald-50/50 border-slate-200 text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-80 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500" /> Fully Bullish
            </span>
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
              12+ Pts
            </span>
          </div>
          <div className="text-2xl font-black mt-1">
            {stats.fullyBullishCount}
          </div>
          <div className="text-[10px] opacity-75 mt-0.5">High-Confluence Parabolic</div>
        </button>

        {/* Fully Bearish 12+ */}
        <button
          onClick={() => setActiveFilter('FULLY_BEARISH')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            activeFilter === 'FULLY_BEARISH'
              ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-500/20 ring-2 ring-rose-400/40'
              : 'bg-white hover:bg-rose-50/50 border-slate-200 text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-80 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> Fully Bearish
            </span>
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">
              12+ Pts
            </span>
          </div>
          <div className="text-2xl font-black mt-1">
            {stats.fullyBearishCount}
          </div>
          <div className="text-[10px] opacity-75 mt-0.5">Parabolic Breakdown</div>
        </button>

        {/* Confirmed Bullish 9-11 */}
        <button
          onClick={() => setActiveFilter('CONFIRMED_BULLISH')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            activeFilter === 'CONFIRMED_BULLISH'
              ? 'bg-teal-700 text-white border-teal-600 shadow-md ring-2 ring-teal-400/40'
              : 'bg-white hover:bg-teal-50/50 border-slate-200 text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-80 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-teal-600" /> Bullish Confirmed
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
              9–11 Pts
            </span>
          </div>
          <div className="text-2xl font-black mt-1">
            {stats.confirmedBullishCount}
          </div>
          <div className="text-[10px] opacity-75 mt-0.5">Solid Institutional Base</div>
        </button>

        {/* Confirmed Bearish 9-11 */}
        <button
          onClick={() => setActiveFilter('CONFIRMED_BEARISH')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            activeFilter === 'CONFIRMED_BEARISH'
              ? 'bg-rose-800 text-white border-rose-700 shadow-md ring-2 ring-rose-400/40'
              : 'bg-white hover:bg-rose-50/50 border-slate-200 text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-80 flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5 text-rose-600" /> Bearish Confirmed
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
              9–11 Pts
            </span>
          </div>
          <div className="text-2xl font-black mt-1">
            {stats.confirmedBearishCount}
          </div>
          <div className="text-[10px] opacity-75 mt-0.5">Heavy Distribution</div>
        </button>

        {/* Early 1-3 Min (6-8 Pts) */}
        <button
          onClick={() => setActiveFilter('EARLY_1_3_MIN')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            activeFilter === 'EARLY_1_3_MIN'
              ? 'bg-blue-700 text-white border-blue-600 shadow-md ring-2 ring-blue-400/40'
              : 'bg-white hover:bg-blue-50/50 border-slate-200 text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-80 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-600" /> Early Min 1–3
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
              6–8 Pts
            </span>
          </div>
          <div className="text-2xl font-black mt-1">
            {stats.earlyCount}
          </div>
          <div className="text-[10px] opacity-75 mt-0.5">Forming Intra-Candle</div>
        </button>

        {/* Exhaustion Alerts */}
        <button
          onClick={() => setActiveFilter('EXHAUSTION')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            activeFilter === 'EXHAUSTION'
              ? 'bg-amber-600 text-white border-amber-500 shadow-md ring-2 ring-amber-400/40'
              : 'bg-white hover:bg-amber-50/50 border-slate-200 text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-80 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Exhaustion
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
              Overstretched
            </span>
          </div>
          <div className="text-2xl font-black mt-1">
            {stats.exhaustionCount}
          </div>
          <div className="text-[10px] opacity-75 mt-0.5">RSI &gt;78 / &gt;3.5% VWAP</div>
        </button>
      </div>

      {/* 🔍 Controls & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search symbol, sector..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Sector Selector */}
          <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <PieChart className="w-3.5 h-3.5 text-indigo-600" />
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
            >
              <option value="ALL">All Sectors ({sectorOptions.length})</option>
              {sectorOptions.map((sec) => (
                <option key={sec} value={sec}>
                  {sec}
                </option>
              ))}
            </select>
          </div>

          {/* Min Score Filter Slider / Select */}
          <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <Sliders className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-xs text-slate-600 font-medium">Score:</span>
            <select
              value={minScoreFilter}
              onChange={(e) => setMinScoreFilter(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
            >
              <option value={0}>Any (0+)</option>
              <option value={6}>Early (6+)</option>
              <option value={9}>Confirmed (9+)</option>
              <option value={12}>🔥 Parabolic (12+)</option>
            </select>
          </div>

          {/* Signal Time Window Filter */}
          <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-xs text-slate-600 font-medium">Window:</span>
            <select
              value={timeWindowFilter}
              onChange={(e) => setTimeWindowFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
            >
              <option value="ALL">All Day (09:15–03:30)</option>
              <option value="OPENING">09:15–10:00 AM (Opening)</option>
              <option value="MORNING">10:00–11:30 AM (Morning)</option>
              <option value="MIDDAY">11:30 AM–01:30 PM (Midday)</option>
              <option value="AFTERNOON">01:30–03:30 PM (Close)</option>
            </select>
          </div>

          {/* Sort By Selector */}
          <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-xs text-slate-600 font-medium">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
            >
              <option value="SCORE_DESC">⭐ Top Match & Recent Time</option>
              <option value="TIME_NEWEST">🕒 Newest Signal Time</option>
              <option value="GAIN_DESC">Highest % Change</option>
              <option value="SYMBOL_ASC">Alphabetical (A-Z)</option>
            </select>
          </div>
        </div>

        {/* View Switcher & Clear */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => {
              setActiveFilter('ALL');
              setSelectedSector('ALL');
              setMinScoreFilter(0);
              setTimeWindowFilter('ALL');
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 transition-all cursor-pointer"
          >
            Reset
          </button>
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
            <button
              onClick={() => setDisplayMode('cards')}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                displayMode === 'cards' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Cards
            </button>
            <button
              onClick={() => setDisplayMode('table')}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                displayMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Table
            </button>
          </div>
        </div>
      </div>

      {/* 📋 Filter Info Pill */}
      <div className="flex items-center justify-between text-xs text-slate-600 px-1">
        <div>
          Showing <strong>{filteredAnalyses.length}</strong> matching stocks for{' '}
          <span className="font-bold text-slate-900">
            {activeFilter === 'FULLY_BULLISH'
              ? '🔥 Fully Bullish Parabolic Rallies (12+ pts)'
              : activeFilter === 'FULLY_BEARISH'
              ? '🔥 Fully Bearish Parabolic Breakdowns (12+ pts)'
              : activeFilter === 'CONFIRMED_BULLISH'
              ? '🟢 Confirmed Bullish Moves (9–11 pts)'
              : activeFilter === 'CONFIRMED_BEARISH'
              ? '🔴 Confirmed Bearish Moves (9–11 pts)'
              : activeFilter === 'EARLY_1_3_MIN'
              ? '🌱 Early Confirmation in First 1–3 Mins (6–8 pts)'
              : activeFilter === 'EXHAUSTION'
              ? '⚠️ Overextended / Exhaustion Setups'
              : 'All Universe Stocks'}
          </span>
        </div>
        {filteredAnalyses.length === 0 && (
          <div className="text-amber-600 font-semibold">
            No stocks meet the current strict filter. Try lowering the score threshold or switching filters.
          </div>
        )}
      </div>

      {/* 📦 CARD VIEW */}
      {displayMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAnalyses.map((item) => {
            const isBull = item.direction === 'BULLISH';
            const close = item.stock.closePrice || 0;
            const pct = item.stock.pctChange || 0;

            return (
              <div
                key={item.stock.id}
                className={`bg-white rounded-2xl border transition-all hover:shadow-lg flex flex-col justify-between relative overflow-hidden ${
                  item.isFullyBullish
                    ? 'border-emerald-300 shadow-md shadow-emerald-500/10 ring-1 ring-emerald-400/30'
                    : item.isFullyBearish
                    ? 'border-rose-300 shadow-md shadow-rose-500/10 ring-1 ring-rose-400/30'
                    : item.stage === 'EXHAUSTION'
                    ? 'border-amber-300 bg-amber-50/20'
                    : 'border-slate-200/80 shadow-xs'
                }`}
              >
                {/* Top Accent Strip */}
                <div
                  className={`h-1.5 w-full ${
                    item.isFullyBullish
                      ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600'
                      : item.isFullyBearish
                      ? 'bg-gradient-to-r from-rose-500 via-red-400 to-rose-600'
                      : isBull
                      ? 'bg-emerald-500'
                      : 'bg-rose-500'
                  }`}
                />

                <div className="p-4 space-y-3.5 flex-1">
                  {/* Stock Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-base font-black text-slate-900 tracking-tight">
                          {item.stock.symbol}
                        </span>
                        <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-semibold">
                          {item.sectorName}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 truncate max-w-[200px]">
                        {item.stock.companyName}
                      </div>
                    </div>

                    {/* Stage Badge */}
                    <div className="text-right">
                      <span
                        className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider border shadow-xs inline-flex items-center gap-1 ${item.stageBadgeClass}`}
                      >
                        {item.stage === 'PARABOLIC_RALLY' || item.stage === 'PARABOLIC_BREAKDOWN' ? (
                          <Flame className="w-3 h-3" />
                        ) : isBull ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        <span>{item.stageLabel}</span>
                      </span>
                    </div>
                  </div>

                  {/* 🕒 EXACT SIGNAL TRIGGER TIME BADGE */}
                  <div className="bg-gradient-to-r from-indigo-50 via-slate-50 to-indigo-50/60 p-2.5 rounded-xl border border-indigo-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="p-1 bg-indigo-600 text-white rounded-md shadow-2xs">
                        <Clock className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>Signal Met:</span>
                          <span className="text-indigo-700 font-black text-xs">{item.timing.timeStr}</span>
                          {item.timing.isFresh && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium">
                          15m Bar: {item.timing.candleTimeSlot}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                        item.timing.isFresh
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-slate-200/80 text-slate-700 border-slate-300'
                      }`}>
                        {item.timing.recencyLabel}
                      </span>
                      <div className="text-[9px] text-indigo-700 font-bold mt-0.5">
                        {item.timing.intraCandleTime}
                      </div>
                    </div>
                  </div>

                  {/* Price & Score Meter */}
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <div className="text-lg font-black text-slate-900 flex items-center gap-1.5">
                        <span>₹{close.toFixed(2)}</span>
                        <span
                          className={`text-xs font-bold flex items-center ${
                            pct >= 0 ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {pct >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                          {pct >= 0 ? `+${pct.toFixed(2)}%` : `${pct.toFixed(2)}%`}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        VWAP: ₹{item.stock.vwap ? item.stock.vwap.toFixed(1) : '-'} | RSI: {item.stock.rsi ? item.stock.rsi.toFixed(1) : '-'}
                      </div>
                    </div>

                    {/* Confluence Score Pill */}
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-500">15m Confluence</div>
                      <div className="text-base font-black text-slate-900 flex items-center justify-end gap-1">
                        <span
                          className={
                            item.score >= 12
                              ? 'text-emerald-600 font-black text-lg'
                              : item.score >= 9
                              ? 'text-blue-600'
                              : 'text-slate-700'
                          }
                        >
                          {item.score}
                        </span>
                        <span className="text-xs text-slate-400">/ 16 pts</span>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                      <span>Probability Score: {item.confidencePercent}%</span>
                      <span>Phase: {item.intraCandlePhase.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                      <div
                        className={`h-full rounded-full transition-all ${
                          item.score >= 12
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                            : item.score >= 9
                            ? 'bg-blue-600'
                            : item.score >= 6
                            ? 'bg-amber-500'
                            : 'bg-slate-400'
                        }`}
                        style={{ width: `${item.confidencePercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Top Confirmation Signals */}
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="text-slate-500 text-[10px] block">VWAP Alignment</span>
                      <span className={`font-bold ${item.vwapStatus.includes('Above') ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {item.vwapStatus}
                      </span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="text-slate-500 text-[10px] block">Opening Range (ORB)</span>
                      <span className={`font-bold ${item.openingRangeStatus.includes('Broken') || item.openingRangeStatus.includes('Shattered') ? 'text-slate-900' : 'text-slate-600'}`}>
                        {item.openingRangeStatus}
                      </span>
                    </div>
                  </div>

                  {/* Option Trade Recommendation */}
                  <div className={`p-2.5 rounded-xl border ${isBull ? 'bg-emerald-50/60 border-emerald-200/80 text-emerald-900' : 'bg-rose-50/60 border-rose-200/80 text-rose-900'}`}>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5" /> Suggested Strike:
                      </span>
                      <span className="font-black text-xs px-2 py-0.5 rounded bg-white shadow-2xs border">
                        {item.suggestedStrike}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] mt-1.5 text-slate-600">
                      <span>SL: ₹{item.stopLoss.toFixed(1)}</span>
                      <span>Target 1: ₹{item.targets[0]?.toFixed(1)}</span>
                      <span>Target 2: ₹{item.targets[1]?.toFixed(1)}</span>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setInspectedStock(item)}
                    className="flex-1 py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Info className="w-3.5 h-3.5 text-blue-600" />
                    <span>12-Point Checklist</span>
                  </button>

                  <button
                    onClick={() => setChartStock(item.stock)}
                    className="py-1.5 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                    title="View 15-Minute TradingView Candlestick Chart"
                  >
                    <BarChart2 className="w-3.5 h-3.5" />
                    <span>15m Chart</span>
                  </button>

                  {onOpenPositionSizer && (
                    <button
                      onClick={() => onOpenPositionSizer(item.stock)}
                      className="py-1.5 px-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold transition-all cursor-pointer"
                      title="Open Position Sizer"
                    >
                      Sizer
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* 📊 TABLE VIEW */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Symbol &amp; Company</th>
                  <th className="px-3 py-3">🕒 Signal Met Time</th>
                  <th className="px-3 py-3">LTP &amp; % Chg</th>
                  <th className="px-3 py-3">15m Confluence</th>
                  <th className="px-3 py-3">Stage &amp; Verdict</th>
                  <th className="px-3 py-3">VWAP Spread</th>
                  <th className="px-3 py-3">ORB Status</th>
                  <th className="px-3 py-3">RSI</th>
                  <th className="px-3 py-3">Option Strike</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAnalyses.map((item) => {
                  const close = item.stock.closePrice || 0;
                  const pct = item.stock.pctChange || 0;
                  const isBull = item.direction === 'BULLISH';

                  return (
                    <tr
                      key={item.stock.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        item.isFullyBullish
                          ? 'bg-emerald-50/30'
                          : item.isFullyBearish
                          ? 'bg-rose-50/30'
                          : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-black text-slate-900">{item.stock.symbol}</div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[150px]">
                          {item.stock.companyName}
                        </div>
                      </td>
                      {/* Signal Met Time Column */}
                      <td className="px-3 py-3">
                        <div className="flex items-center space-x-1.5">
                          <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span className="font-black text-slate-900 text-xs">{item.timing.timeStr}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${
                            item.timing.isFresh
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-black'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {item.timing.recencyLabel}
                          </span>
                          <span className="text-[9px] text-slate-400">({item.timing.candleTimeSlot})</span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-bold text-slate-900">₹{close.toFixed(2)}</div>
                        <div
                          className={`text-[10px] font-bold ${
                            pct >= 0 ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {pct >= 0 ? `+${pct.toFixed(2)}%` : `${pct.toFixed(2)}%`}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center space-x-1.5">
                          <span
                            className={`text-sm font-black ${
                              item.score >= 12
                                ? 'text-emerald-600'
                                : item.score >= 9
                                ? 'text-blue-600'
                                : 'text-slate-700'
                            }`}
                          >
                            {item.score} / 16
                          </span>
                          <div className="w-12 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                item.score >= 12
                                  ? 'bg-emerald-500'
                                  : item.score >= 9
                                  ? 'bg-blue-600'
                                  : 'bg-slate-400'
                              }`}
                              style={{ width: `${item.confidencePercent}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-[9px] text-slate-400">{item.confidencePercent}% Conviction</div>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.stageBadgeClass}`}
                        >
                          {item.stageLabel}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-semibold text-slate-800">{item.vwapStatus}</div>
                        <div className="text-[10px] text-slate-400">
                          ₹{item.stock.vwap ? item.stock.vwap.toFixed(1) : '-'}
                        </div>
                      </td>
                      <td className="px-3 py-3 font-semibold text-slate-800">
                        {item.openingRangeStatus}
                      </td>
                      <td className="px-3 py-3 font-bold text-slate-800">
                        {item.stock.rsi ? item.stock.rsi.toFixed(1) : '-'}
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-black text-xs bg-slate-100 text-slate-900 px-2 py-0.5 rounded border border-slate-200">
                          {item.suggestedStrike}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => setInspectedStock(item)}
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Inspect 12-Point Checklist"
                          >
                            <Info className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setChartStock(item.stock)}
                            className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-[11px] font-bold shadow-2xs flex items-center gap-1 cursor-pointer"
                          >
                            <BarChart2 className="w-3 h-3" />
                            <span>15m</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 🔍 12-POINT SIGNAL INSPECTION MODAL */}
      {inspectedStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-500/20">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-xl font-black">{inspectedStock.stock.symbol}</h3>
                  <span className={`text-xs font-black px-2.5 py-0.5 rounded-full uppercase border ${inspectedStock.stageBadgeClass}`}>
                    {inspectedStock.stageLabel}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  15-Minute Parabolic Rally &amp; Breakdown Engine Detailed Score Breakdown
                </p>
              </div>

              <button
                onClick={() => setInspectedStock(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-sm cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* EXACT SIGNAL TRIGGER TIMING BANNER */}
              <div className="p-3.5 bg-gradient-to-r from-indigo-50 via-slate-50 to-indigo-50/70 border border-indigo-200/80 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-sm">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-black text-indigo-950 text-sm flex items-center gap-2">
                      <span>Signal Trigger Time: {inspectedStock.timing.timeStr}</span>
                      <span className={`text-[10px] font-black px-2 py-0.2 rounded-full border ${
                        inspectedStock.timing.isFresh
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-slate-200 text-slate-700 border-slate-300'
                      }`}>
                        {inspectedStock.timing.recencyLabel}
                      </span>
                    </div>
                    <div className="text-[11px] text-indigo-700 font-semibold mt-0.5">
                      15m Candle Window: {inspectedStock.timing.candleTimeSlot} • Intra-Candle Trigger: {inspectedStock.timing.intraCandleTime}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase bg-white border border-indigo-200 px-2.5 py-1 rounded-full text-indigo-900 shadow-2xs">
                    Phase: {inspectedStock.intraCandlePhase.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              {/* Score Header */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500 font-bold uppercase">Total Confluence Score</div>
                  <div className="text-2xl font-black text-slate-900 flex items-center gap-1.5 mt-0.5">
                    <span>{inspectedStock.score} / 16 Points</span>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      {inspectedStock.confidencePercent}% Conviction
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500 font-bold">Suggested Action</div>
                  <div className="text-xs font-black text-indigo-700 mt-0.5 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                    {inspectedStock.suggestedStrike}
                  </div>
                </div>
              </div>

              {/* Actionable Verdict */}
              <div className="p-3 bg-blue-50 border border-blue-200/80 rounded-xl text-xs text-blue-900 leading-relaxed">
                <strong>⚡ Tactical Trade Guidance:</strong> {inspectedStock.tacticalAction}
              </div>

              {/* 12 Checklist Rules */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                  <span>12-Point Probability Verification with Trigger Timestamps</span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    {inspectedStock.checks.filter((c) => c.passed).length} of 12 Passed
                  </span>
                </div>

                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                  {inspectedStock.checks.map((check) => (
                    <div
                      key={check.id}
                      className={`p-3 flex items-start justify-between gap-3 transition-colors ${
                        check.passed ? 'bg-emerald-50/20' : 'bg-slate-50/40 opacity-70'
                      }`}
                    >
                      <div className="flex items-start space-x-2.5 flex-1">
                        {check.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <div className="text-xs font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                            <span>{check.name}</span>
                            <span className="text-[10px] text-slate-500 font-normal">
                              ({check.actualValue})
                            </span>
                            {check.passed && check.passedTime && check.passedTime !== 'Not Met' && (
                              <span className="text-[10px] font-black bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200 flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                {check.passedTime}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center justify-between">
                            <span>{check.detail}</span>
                            {check.passed && check.passedPhase && (
                              <span className="text-[10px] text-slate-400 font-medium italic">
                                {check.passedPhase}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`text-xs font-black px-2 py-0.5 rounded ${
                            check.passed
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          +{check.points} / {check.maxPoints} pts
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => {
                  setChartStock(inspectedStock.stock);
                  setInspectedStock(null);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span>Open 15m Candlestick Chart</span>
              </button>

              <button
                onClick={() => setInspectedStock(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📈 15-MINUTE CANDLESTICK CHART MODAL */}
      {chartStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[95vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-black">{chartStock.symbol}</h3>
                  <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded font-bold">
                    15-Minute TradingView Style Chart
                  </span>
                </div>
                <p className="text-xs text-slate-400">{chartStock.companyName}</p>
              </div>

              <button
                onClick={() => setChartStock(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-sm cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 bg-slate-900">
              <FifteenMinCandleChartSnapshot
                stock={chartStock}
                credentials={credentials}
                height={400}
                onSelectStock={(s) => setChartStock(s)}
              />
            </div>

            <div className="p-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
              <div className="text-xs text-slate-600">
                15-Minute Candles, Session VWAP &amp; Volume Histogram
              </div>
              <button
                onClick={() => setChartStock(null)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Close Chart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
