import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  AlertTriangle, 
  XCircle, 
  Zap, 
  RefreshCw, 
  Layers, 
  Compass, 
  CheckCircle2, 
  BarChart3, 
  ArrowUpRight, 
  ArrowDownRight,
  ExternalLink,
  Info,
  ChevronRight,
  Flame,
  Filter,
  Sparkles,
  Award,
  Activity,
  Key,
  Radio,
  Sliders,
  Check,
  Target,
  ArrowRight
} from 'lucide-react';
import { StockCalculated, DhanApiCredentials } from '../types';
import { 
  STOCK_SECTOR_MAP, 
  getStockSector, 
  computeAllSectorStrengths, 
  getDetailedStockSectorReport,
  SectorMetric,
  DetailedStockSectorReport 
} from '../utils/sectorMaster';
import { FifteenMinCandleChartSnapshot } from './FifteenMinCandleChartSnapshot';

interface SectorStrengthDashboardProps {
  stocks: StockCalculated[];
  credentials: DhanApiCredentials;
  onFetchSingleStock?: (stock: StockCalculated) => Promise<void>;
  onFetchSectorStocks?: (symbolOrSectorKey: string) => Promise<void>;
  onFetchAllStocks?: () => Promise<void>;
  onSelectStockDetail?: (stock: StockCalculated) => void;
  onOpenPositionSizer?: (stock: StockCalculated) => void;
  onOpenRsiAnalyst?: (stock: StockCalculated) => void;
  onOpenSettings?: () => void;
  isLoading?: boolean;
}

export interface SuperBullishStockItem {
  stock: StockCalculated;
  sectorKey: string;
  sectorName: string;
  sectorIcon: string;
  sectorAvgPct: number;
  sectorBreadthPct: number;
  sectorRank: number;
  bullishScore: number;
  gannTriggered: boolean;
  aboveVwap: boolean;
  rsiValue: number;
  vwapSpreadPct: number;
  isFirst15mHighBroken: boolean;
}

export const SectorStrengthDashboard: React.FC<SectorStrengthDashboardProps> = ({
  stocks,
  credentials,
  onFetchSingleStock,
  onFetchSectorStocks,
  onFetchAllStocks,
  onSelectStockDetail,
  onOpenPositionSizer,
  onOpenRsiAnalyst,
  onOpenSettings,
  isLoading = false
}) => {
  // Main view mode
  const [activeViewMode, setActiveViewMode] = useState<'SUPER_BULLISH_90' | 'STOCK_REPORT' | 'ALL_SECTORS'>('SUPER_BULLISH_90');

  // Search input state
  const [searchInput, setSearchInput] = useState<string>('TATAMOTORS');
  const [activeStockSymbol, setActiveStockSymbol] = useState<string>('TATAMOTORS');
  const [tradeDirection, setTradeDirection] = useState<'BULLISH' | 'BEARISH'>('BULLISH');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [sectorFilter, setSectorFilter] = useState<'ALL' | 'BULLISH' | 'BEARISH' | 'TOP_PERFORMERS'>('ALL');
  const [selectedSectorKey, setSelectedSectorKey] = useState<string | null>(null);

  // Filter criteria for Very Bullish + Sector >90%
  const [minSectorBreadth, setMinSectorBreadth] = useState<number>(90); // 90% by default
  const [requireGannTrigger, setRequireGannTrigger] = useState<boolean>(true);
  const [requireAboveVwap, setRequireAboveVwap] = useState<boolean>(true);
  const [minRsiThreshold, setMinRsiThreshold] = useState<number>(55);

  // Live checking status
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [checkStatusMessage, setCheckStatusMessage] = useState<string>('');

  // Compute all sector metrics across universe
  const sectorMetricsMap = useMemo(() => {
    return computeAllSectorStrengths(stocks);
  }, [stocks]);

  const allSectorsList: SectorMetric[] = useMemo(() => {
    return (Array.from(sectorMetricsMap.values()) as SectorMetric[]).sort((a, b) => b.avgPctChange - a.avgPctChange);
  }, [sectorMetricsMap]);

  // Compute Super Bullish Stocks with Sector Strength > 90%
  const superBullishStocks: SuperBullishStockItem[] = useMemo(() => {
    const results: SuperBullishStockItem[] = [];

    stocks.forEach((stk) => {
      const secInfo = getStockSector(stk.symbol);
      const secMetric = sectorMetricsMap.get(secInfo.sectorKey);
      if (!secMetric) return;

      // 1. Sector Strength Condition (>= 90% breadth, or strong positive sector tailwind)
      const passesSectorStrength = secMetric.bullishBreadthPct >= minSectorBreadth || 
        (secMetric.avgPctChange >= 1.2 && secMetric.bullishBreadthPct >= 80);

      if (!passesSectorStrength) return;

      // 2. Very Bullish Stock Setup Condition
      const ltp = stk.closePrice || 0;
      const pct = stk.pctChange || 0;
      const vwap = stk.vwap || 0;
      const buyAbove = stk.buyAbove || 0;
      const rsi = stk.rsi || 50;
      const first15mHigh = stk.first15mHigh || 0;

      const gannTriggered = buyAbove > 0 ? ltp >= buyAbove * 0.998 : pct > 0.5;
      const aboveVwap = vwap > 0 ? ltp >= vwap : pct > 0;
      const rsiBullish = rsi >= minRsiThreshold;
      const positiveChange = pct >= 0.15;
      const isFirst15mHighBroken = first15mHigh > 0 ? ltp >= first15mHigh * 0.998 : true;

      // Apply toggles
      if (requireGannTrigger && !gannTriggered) return;
      if (requireAboveVwap && !aboveVwap) return;
      if (!positiveChange) return;
      if (!rsiBullish) return;

      // Calculate institutional confluence score
      let score = 50;
      if (gannTriggered) score += 20;
      if (aboveVwap) score += 15;
      if (rsi >= 60) score += 10;
      if (isFirst15mHighBroken) score += 10;
      if (secMetric.bullishBreadthPct === 100) score += 15;
      else if (secMetric.bullishBreadthPct >= 90) score += 10;
      if (pct >= 2.0) score += 10;

      const vwapSpreadPct = vwap > 0 ? ((ltp - vwap) / vwap) * 100 : 0;
      const sectorRank = allSectorsList.findIndex(s => s.sectorKey === secInfo.sectorKey) + 1;

      results.push({
        stock: stk,
        sectorKey: secInfo.sectorKey,
        sectorName: secInfo.sectorName,
        sectorIcon: secInfo.icon,
        sectorAvgPct: secMetric.avgPctChange,
        sectorBreadthPct: secMetric.bullishBreadthPct,
        sectorRank: sectorRank || 1,
        bullishScore: Math.min(100, score),
        gannTriggered,
        aboveVwap,
        rsiValue: rsi,
        vwapSpreadPct,
        isFirst15mHighBroken
      });
    });

    return results.sort((a, b) => b.bullishScore - a.bullishScore || (b.stock.pctChange || 0) - (a.stock.pctChange || 0));
  }, [stocks, sectorMetricsMap, minSectorBreadth, requireGannTrigger, requireAboveVwap, minRsiThreshold, allSectorsList]);

  // Filtered sectors list for the bottom matrix
  const filteredSectors = useMemo(() => {
    if (sectorFilter === 'BULLISH') {
      return allSectorsList.filter((s) => s.avgPctChange > 0);
    }
    if (sectorFilter === 'BEARISH') {
      return allSectorsList.filter((s) => s.avgPctChange < 0);
    }
    if (sectorFilter === 'TOP_PERFORMERS') {
      return allSectorsList.slice(0, 6);
    }
    return allSectorsList;
  }, [allSectorsList, sectorFilter]);

  // Overall market stats
  const marketStats = useMemo(() => {
    const total = allSectorsList.length;
    const bullish = allSectorsList.filter((s) => s.avgPctChange > 0.1).length;
    const bearish = allSectorsList.filter((s) => s.avgPctChange < -0.1).length;
    const topSector = allSectorsList[0];
    const bottomSector = allSectorsList[allSectorsList.length - 1];

    let sumAvg = 0;
    allSectorsList.forEach((s) => { sumAvg += s.avgPctChange; });
    const marketAvgPct = total > 0 ? Math.round((sumAvg / total) * 100) / 100 : 0;

    return {
      total,
      bullish,
      bearish,
      marketAvgPct,
      topSector,
      bottomSector
    };
  }, [allSectorsList]);

  // Search auto-complete suggestions
  const suggestions = useMemo(() => {
    if (!searchInput.trim()) return [];
    const q = searchInput.trim().toUpperCase();
    return stocks
      .filter((s) => s.symbol.toUpperCase().includes(q) || s.companyName.toUpperCase().includes(q))
      .slice(0, 8);
  }, [stocks, searchInput]);

  // Generate detailed report for active stock
  const report: DetailedStockSectorReport | null = useMemo(() => {
    return getDetailedStockSectorReport(activeStockSymbol, stocks, tradeDirection);
  }, [activeStockSymbol, stocks, tradeDirection]);

  // Trigger search handler & fetch live Dhan data
  const handleCheckStrength = async (symbolToUse?: string) => {
    const sym = (symbolToUse || searchInput).trim().toUpperCase();
    if (!sym) return;
    setActiveStockSymbol(sym);
    setSearchInput(sym);
    setIsDropdownOpen(false);
    setActiveViewMode('STOCK_REPORT');

    setIsChecking(true);
    const sec = getStockSector(sym);
    setCheckStatusMessage(`⚡ Fetching live Dhan candle for ${sym} & ${sec.sectorName} peer stocks...`);

    try {
      if (onFetchSectorStocks) {
        await onFetchSectorStocks(sym);
      } else if (onFetchSingleStock) {
        const stk = stocks.find((s) => s.symbol.toUpperCase() === sym) || {
          id: `stock_${sym}`,
          symbol: sym,
          companyName: sym,
          lotSizeJun2026: 500,
          lotSizeJul2026: 500,
          lotSizeAug2026: 500,
          screenerUrl: `https://scanx.trade/company/${sym.toLowerCase()}`,
          isFetched: false
        };
        await onFetchSingleStock(stk as StockCalculated);
      }
    } catch (err) {
      console.error('Failed to fetch sector data from Dhan API:', err);
    } finally {
      setIsChecking(false);
      setCheckStatusMessage('');
    }
  };

  // Popular stock quick-picks for instant testing
  const popularPicks = [
    'TATAMOTORS', 'RELIANCE', 'HDFCBANK', 'INFY', 'TATASTEEL', 
    'SUNPHARMA', 'BAJFINANCE', 'BEL', 'DIXON', 'DLF', 'MARUTI', 'TRENT'
  ];

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      
      {/* Top Hero Banner & Market Sector Pulse */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
              <div className="p-2 bg-indigo-600/30 border border-indigo-400/40 rounded-xl text-indigo-300">
                <Compass className="w-5 h-5 animate-spin-slow" />
              </div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-300 bg-indigo-950/80 px-2.5 py-0.5 rounded-full border border-indigo-500/30">
                Institutional Sector Radar
              </span>
              <span className="text-xs font-mono font-semibold text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                <Radio className="w-3 h-3 animate-pulse" />
                <span>Live Dhan API Sector Sync</span>
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              <span>🏢 Sector Strength &amp; Tailwinds Analyzer</span>
            </h2>
            <p className="text-xs md:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Check real-time industry momentum, advance/decline breadth, and filter ultra-high confluence setups where stock momentum is backed by <strong>&gt;90% sector strength</strong>.
            </p>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
            <div className="bg-slate-800/80 border border-slate-700/80 p-3 rounded-2xl">
              <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">Total Sectors</div>
              <div className="text-lg font-black text-white mt-0.5">{marketStats.total} Industries</div>
              <div className="text-[10px] text-indigo-300 font-mono mt-0.5">
                Avg: <span className={marketStats.marketAvgPct >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {marketStats.marketAvgPct >= 0 ? '+' : ''}{marketStats.marketAvgPct.toFixed(2)}%
                </span>
              </div>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 p-3 rounded-2xl">
              <div className="text-[10px] font-mono text-emerald-400 uppercase font-bold flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Bullish Sectors
              </div>
              <div className="text-lg font-black text-emerald-400 mt-0.5">{marketStats.bullish} / {marketStats.total}</div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                {Math.round((marketStats.bullish / (marketStats.total || 1)) * 100)}% Gaining
              </div>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 p-3 rounded-2xl">
              <div className="text-[10px] font-mono text-rose-400 uppercase font-bold flex items-center gap-1">
                <TrendingDown className="w-3 h-3" /> Bearish Sectors
              </div>
              <div className="text-lg font-black text-rose-400 mt-0.5">{marketStats.bearish} / {marketStats.total}</div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                {Math.round((marketStats.bearish / (marketStats.total || 1)) * 100)}% Declining
              </div>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 p-3 rounded-2xl">
              <div className="text-[10px] font-mono text-amber-400 uppercase font-bold flex items-center gap-1">
                <Flame className="w-3 h-3" /> Top Industry
              </div>
              <div className="text-xs font-black text-white truncate mt-1">
                {marketStats.topSector?.categoryIcon} {marketStats.topSector?.sectorName || 'Auto & EV'}
              </div>
              <div className="text-[10px] text-emerald-400 font-mono font-bold mt-0.5">
                +{marketStats.topSector?.avgPctChange.toFixed(2)}% Avg
              </div>
            </div>
          </div>
        </div>

        {/* Global Refresh & Dhan Credentials Status */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 text-slate-300 text-[11px]">
            {credentials.isConfigured ? (
              <span className="flex items-center gap-1 text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-lg">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Dhan API Connected</span>
              </span>
            ) : (
              <button
                onClick={() => onOpenSettings?.()}
                className="flex items-center gap-1 text-amber-300 hover:text-amber-200 bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 rounded-lg font-bold cursor-pointer"
              >
                <Key className="w-3.5 h-3.5" />
                <span>Configure Dhan API Keys (Click here)</span>
              </button>
            )}
            <span>Live candle stream &amp; sector breadth calculated continuously across all F&amp;O stocks.</span>
          </div>

          {onFetchAllStocks && (
            <button
              onClick={() => onFetchAllStocks()}
              disabled={isLoading || isChecking}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${(isLoading || isChecking) ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Refreshing All Live Prices...' : 'Refresh All F&O Sector Prices'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Navigation Tabs: Filter Very Bullish >90% vs Single Stock vs All Sectors */}
      <div className="flex items-center space-x-2 bg-slate-200/80 p-1.5 rounded-2xl border border-slate-300/80 overflow-x-auto">
        <button
          onClick={() => setActiveViewMode('SUPER_BULLISH_90')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all cursor-pointer whitespace-nowrap ${
            activeViewMode === 'SUPER_BULLISH_90'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md ring-2 ring-emerald-400/40'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/60'
          }`}
        >
          <Flame className="w-4 h-4 text-amber-300 fill-current animate-pulse" />
          <span>🔥 Very Bullish &bull; Sector Strength &gt;90%</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
            activeViewMode === 'SUPER_BULLISH_90' ? 'bg-white text-emerald-800' : 'bg-emerald-100 text-emerald-800'
          }`}>
            {superBullishStocks.length}
          </span>
        </button>

        <button
          onClick={() => setActiveViewMode('STOCK_REPORT')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all cursor-pointer whitespace-nowrap ${
            activeViewMode === 'STOCK_REPORT'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/60'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>🎯 Stock Deep Confluence &amp; 15m Chart</span>
          {report && (
            <span className="text-xs bg-indigo-950/80 px-2 py-0.5 rounded-md font-mono text-indigo-200">
              {activeStockSymbol}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveViewMode('ALL_SECTORS')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all cursor-pointer whitespace-nowrap ${
            activeViewMode === 'ALL_SECTORS'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/60'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>🏢 All 18+ Sectors Leaderboard</span>
          <span className="text-xs bg-slate-300/80 px-2 py-0.5 rounded-full text-slate-700">
            {allSectorsList.length}
          </span>
        </button>
      </div>

      {/* VIEW 1: SUPER BULLISH (SECTOR >90%) FILTER & SCREENER */}
      {activeViewMode === 'SUPER_BULLISH_90' && (
        <div className="space-y-4 animate-fade-in">
          
          {/* Filter Customizer Toolbar */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 md:p-6 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-200">
                    <Flame className="w-5 h-5 fill-current text-amber-500" />
                  </span>
                  <h3 className="text-lg font-black tracking-tight text-slate-900">
                    Ultra-High Confluence: Very Bullish Stocks in &gt;90% Strength Sectors
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                  Filters stocks where individual technical breakout confluence (Gann Buy trigger, Above VWAP, RSI &gt;55) aligns with overwhelming <strong>&ge;90% sector breadth</strong>.
                </p>
              </div>

              {/* Threshold Selector Tabs */}
              <div className="flex items-center space-x-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shrink-0">
                <span className="text-xs font-bold text-slate-500 px-2">Min Sector Breadth:</span>
                {[
                  { label: '≥ 90% (Strict)', val: 90 },
                  { label: '≥ 80% (Moderate)', val: 80 },
                  { label: '≥ 70% (Broad)', val: 70 }
                ].map((th) => (
                  <button
                    key={th.val}
                    onClick={() => setMinSectorBreadth(th.val)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      minSectorBreadth === th.val
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {th.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Rule Toggles */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Filter Criteria:</span>
              
              <button
                onClick={() => setRequireGannTrigger(!requireGannTrigger)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl font-bold border transition-all cursor-pointer ${
                  requireGannTrigger
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-slate-50 text-slate-400 border-slate-200'
                }`}
              >
                <div className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[9px] ${requireGannTrigger ? 'bg-emerald-600 text-white' : 'border border-slate-300'}`}>
                  {requireGannTrigger && <Check className="w-3 h-3" />}
                </div>
                <span>Gann Buy Trigger Active</span>
              </button>

              <button
                onClick={() => setRequireAboveVwap(!requireAboveVwap)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl font-bold border transition-all cursor-pointer ${
                  requireAboveVwap
                    ? 'bg-purple-50 text-purple-800 border-purple-300'
                    : 'bg-slate-50 text-slate-400 border-slate-200'
                }`}
              >
                <div className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[9px] ${requireAboveVwap ? 'bg-purple-600 text-white' : 'border border-slate-300'}`}>
                  {requireAboveVwap && <Check className="w-3 h-3" />}
                </div>
                <span>Trading Above Session VWAP</span>
              </button>

              <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                <span className="text-slate-600 font-bold">Min RSI(14):</span>
                <select
                  value={minRsiThreshold}
                  onChange={(e) => setMinRsiThreshold(Number(e.target.value))}
                  className="bg-white border border-slate-300 rounded-lg px-2 py-0.5 font-bold text-slate-800 text-xs outline-none cursor-pointer"
                >
                  <option value={50}>≥ 50 (Neutral-Bullish)</option>
                  <option value={55}>≥ 55 (Strong Momentum)</option>
                  <option value={60}>≥ 60 (Breakout Rally)</option>
                </select>
              </div>

              {superBullishStocks.length > 0 && (
                <span className="ml-auto text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
                  🎯 {superBullishStocks.length} Ultra-High Conviction Setups Found
                </span>
              )}
            </div>

            {/* Screener Results Table */}
            {superBullishStocks.length > 0 ? (
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-900 text-slate-300 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-3.5 font-bold">Stock &amp; Company</th>
                      <th className="py-3 px-3 font-bold">Sector &amp; Breadth</th>
                      <th className="py-3 px-3 text-right font-bold">LTP (₹)</th>
                      <th className="py-3 px-3 text-right font-bold">% Change</th>
                      <th className="py-3 px-3 text-center font-bold">Gann Buy Trigger</th>
                      <th className="py-3 px-3 text-center font-bold">VWAP Status</th>
                      <th className="py-3 px-3 text-center font-bold">RSI(14)</th>
                      <th className="py-3 px-3 text-center font-bold">Confluence Score</th>
                      <th className="py-3 px-3.5 text-center font-bold">15m Chart Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {superBullishStocks.map((item, idx) => {
                      const ltp = item.stock.closePrice || 0;
                      const pct = item.stock.pctChange || 0;
                      return (
                        <tr 
                          key={item.stock.id || item.stock.symbol}
                          className="hover:bg-emerald-50/40 transition-colors"
                        >
                          {/* Stock Symbol */}
                          <td className="py-3 px-3.5">
                            <div className="flex items-center space-x-2">
                              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <div>
                                <span className="font-bold text-slate-900 text-sm">{item.stock.symbol}</span>
                                <div className="text-[11px] text-slate-500 font-sans truncate max-w-[140px]">
                                  {item.stock.companyName}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Sector Name & Breadth */}
                          <td className="py-3 px-3">
                            <div className="flex items-center space-x-1.5">
                              <span className="text-base">{item.sectorIcon}</span>
                              <div>
                                <span className="font-bold text-slate-800 text-xs block">{item.sectorName}</span>
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.2 rounded-md border border-emerald-200">
                                  <Flame className="w-2.5 h-2.5 text-amber-500 fill-current" />
                                  <span>{item.sectorBreadthPct}% Green Breadth</span>
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* LTP */}
                          <td className="py-3 px-3 text-right font-black text-slate-900 text-sm">
                            {ltp ? `₹${ltp.toFixed(2)}` : '-'}
                          </td>

                          {/* % Change */}
                          <td className="py-3 px-3 text-right font-black text-sm">
                            <span className={pct >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                              {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
                            </span>
                          </td>

                          {/* Gann Buy Trigger */}
                          <td className="py-3 px-3 text-center">
                            {item.stock.buyAbove ? (
                              <div className="space-y-0.5">
                                <span className="text-xs font-bold text-slate-800">₹{item.stock.buyAbove.toFixed(1)}</span>
                                <span className={`block text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                  item.gannTriggered ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {item.gannTriggered ? 'TRIGGERED 🟢' : 'Near Trigger'}
                                </span>
                              </div>
                            ) : '-'}
                          </td>

                          {/* VWAP Status */}
                          <td className="py-3 px-3 text-center">
                            {item.stock.vwap ? (
                              <div className="space-y-0.5">
                                <span className="text-xs font-bold text-purple-700">₹{item.stock.vwap.toFixed(1)}</span>
                                <span className="block text-[9px] font-bold text-emerald-700 bg-purple-50 px-1.5 py-0.2 rounded">
                                  +{item.vwapSpreadPct.toFixed(1)}% Above
                                </span>
                              </div>
                            ) : '-'}
                          </td>

                          {/* RSI */}
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${
                              item.rsiValue >= 60 ? 'bg-emerald-100 text-emerald-800 font-black' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {item.rsiValue.toFixed(1)}
                            </span>
                          </td>

                          {/* Score */}
                          <td className="py-3 px-3 text-center">
                            <div className="inline-flex items-center space-x-1 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-xl">
                              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                              <span className="font-black text-indigo-900 text-xs">{item.bullishScore}/100</span>
                            </div>
                          </td>

                          {/* 1-Click Chart Action Button */}
                          <td className="py-3 px-3.5 text-center">
                            <button
                              onClick={() => {
                                setActiveStockSymbol(item.stock.symbol);
                                setSearchInput(item.stock.symbol);
                                setActiveViewMode('STOCK_REPORT');
                                handleCheckStrength(item.stock.symbol);
                              }}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center space-x-1 mx-auto group"
                            >
                              <span>15m Chart</span>
                              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                <h4 className="font-bold text-slate-800">No Stocks Currently Meet the Strict &gt;{minSectorBreadth}% Criteria</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Try lowering the Min Sector Breadth to 80% or click "Refresh All F&amp;O Sector Prices" above to load fresh live prices from Dhan API.
                </p>
                <div className="flex items-center justify-center space-x-2 pt-2">
                  <button
                    onClick={() => setMinSectorBreadth(80)}
                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-500 transition-colors cursor-pointer"
                  >
                    Set Min Breadth to 80%
                  </button>
                  {onFetchAllStocks && (
                    <button
                      onClick={() => onFetchAllStocks()}
                      className="px-3 py-1.5 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      Fetch Live Dhan Prices
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* VIEW 2: SINGLE STOCK DEEP CONFLUENCE REPORT & 15-MINUTE CANDLESTICK CHART */}
      {activeViewMode === 'STOCK_REPORT' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Interactive Stock Search & Strength Checker Box */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 md:p-6 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h3 className="text-lg font-black tracking-tight text-slate-900 flex items-center gap-2">
                  <Search className="w-5 h-5 text-indigo-600" />
                  <span>Check Stock Sector Strength &amp; Confluence</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Enter any stock symbol (or choose a popular stock) and click <strong className="text-indigo-600">"Check Sector Strength"</strong> to fetch live Dhan candles immediately.
                </p>
              </div>

              {/* Trade Direction Selector (Bullish Long vs Bearish Short) */}
              <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
                <button
                  onClick={() => setTradeDirection('BULLISH')}
                  className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    tradeDirection === 'BULLISH'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-emerald-700'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Bullish Long Setup</span>
                </button>
                <button
                  onClick={() => setTradeDirection('BEARISH')}
                  className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    tradeDirection === 'BEARISH'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-rose-700'
                  }`}
                >
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>Bearish Short Setup</span>
                </button>
              </div>
            </div>

            {/* Search Input Bar + Action Button */}
            <div className="relative">
              <div className="flex flex-col sm:flex-row items-stretch gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => {
                      setSearchInput(e.target.value);
                      setIsDropdownOpen(true);
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCheckStrength();
                      }
                    }}
                    placeholder="Type stock symbol (e.g. TATAMOTORS, RELIANCE, INFY, HDFCBANK, DIXON)..."
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-sm font-bold text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                  />
                  {searchInput && (
                    <button
                      onClick={() => {
                        setSearchInput('');
                        setIsDropdownOpen(false);
                      }}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => handleCheckStrength()}
                  disabled={isChecking}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-black text-sm rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 shrink-0 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isChecking ? (
                    <>
                      <RefreshCw className="w-4 h-4 text-yellow-300 animate-spin" />
                      <span>Fetching Dhan Data...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 text-yellow-300 fill-current" />
                      <span>Check Sector Strength</span>
                    </>
                  )}
                </button>
              </div>

              {/* Live Fetching Progress Toast Banner */}
              {isChecking && checkStatusMessage && (
                <div className="mt-2 p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center space-x-2 text-xs font-bold text-indigo-900 animate-pulse">
                  <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />
                  <span>{checkStatusMessage}</span>
                </div>
              )}

              {/* Autocomplete suggestions dropdown */}
              {isDropdownOpen && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden max-h-64 overflow-y-auto">
                  <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 text-[10px] font-mono text-slate-500 uppercase font-bold">
                    Matching Stocks (Click to Check &amp; Fetch)
                  </div>
                  {suggestions.map((item) => {
                    const sec = getStockSector(item.symbol);
                    return (
                      <button
                        key={item.id || item.symbol}
                        onClick={() => handleCheckStrength(item.symbol)}
                        className="w-full px-4 py-2.5 text-left hover:bg-indigo-50 flex items-center justify-between border-b border-slate-100 last:border-0 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900 text-xs">{item.symbol}</span>
                          <span className="text-[11px] text-slate-500 truncate max-w-xs">{item.companyName}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-[11px] font-mono">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[10px]">
                            {sec.icon} {sec.sectorName}
                          </span>
                          {item.closePrice ? (
                            <span className="font-bold text-slate-900">₹{item.closePrice.toFixed(1)}</span>
                          ) : (
                            <span className="text-indigo-600 font-sans text-[10px] font-bold">Fetch Live</span>
                          )}
                          {item.pctChange !== undefined && item.pctChange !== 0 && (
                            <span className={`font-bold ${item.pctChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {item.pctChange >= 0 ? '+' : ''}{item.pctChange.toFixed(2)}%
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Ticker Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase mr-1">Quick Select &amp; Fetch:</span>
              {popularPicks.map((sym) => {
                const isActive = activeStockSymbol.toUpperCase() === sym.toUpperCase();
                return (
                  <button
                    key={sym}
                    onClick={() => handleCheckStrength(sym)}
                    disabled={isChecking}
                    className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-2xs ring-2 ring-indigo-300'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80'
                    }`}
                  >
                    {sym}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Single-Stock Sector Strength Report Card */}
          {report && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 text-white shadow-xl space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

              {/* Top Bar: Stock Identity + Sector Tag + Rank */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-5">
                <div className="flex items-start space-x-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black text-lg flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
                    {report.categoryIcon}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2.5 flex-wrap">
                      <h3 className="text-2xl font-black tracking-tight text-white">{report.stock.symbol}</h3>
                      <span className="bg-indigo-950 text-indigo-300 border border-indigo-500/40 text-xs px-2.5 py-0.5 rounded-full font-bold">
                        {report.categoryIcon} {report.sectorName}
                      </span>
                      <span className="bg-amber-400 text-slate-950 text-xs px-2.5 py-0.5 rounded-full font-black uppercase">
                        Rank #{report.sectorRank} of {report.totalSectorsCount} Sectors
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {report.stock.companyName} &bull; Lot Size: {report.stock.lotSizeJun2026 || '-'}
                    </div>
                  </div>
                </div>

                {/* Quick Live Price & Alpha Badge & Re-fetch Button */}
                <div className="flex items-center space-x-3 shrink-0">
                  <div className="text-right">
                    <div className="text-xl font-mono font-black text-white">
                      {report.stock.closePrice ? `₹${report.stock.closePrice.toFixed(2)}` : (
                        <span className="text-amber-400 text-sm font-sans font-bold">Awaiting Live Price</span>
                      )}
                    </div>
                    <div className="text-xs font-mono font-bold">
                      {report.stock.closePrice ? (
                        <>
                          <span className={(report.stock.pctChange || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            {(report.stock.pctChange || 0) >= 0 ? '+' : ''}{(report.stock.pctChange || 0).toFixed(2)}%
                          </span>
                          <span className="text-slate-400 text-[10px] ml-1.5">
                            (Alpha: <strong className={report.relativeStrengthAlpha >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                              {report.relativeStrengthAlpha >= 0 ? '+' : ''}{report.relativeStrengthAlpha.toFixed(2)}%
                            </strong>)
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Click Check to Fetch from Dhan</span>
                      )}
                    </div>
                  </div>

                  {/* Instant Re-fetch Dhan button */}
                  <button
                    onClick={() => handleCheckStrength(report.stock.symbol)}
                    disabled={isChecking}
                    className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
                    title="Fetch / Re-calculate from Dhan API"
                  >
                    <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
                  </button>

                  {onSelectStockDetail && (
                    <button
                      onClick={() => onSelectStockDetail(report.stock)}
                      className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-colors cursor-pointer"
                      title="View Full Stock Calculation Details"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Core Verdict Banner */}
              <div className={`p-4 md:p-5 rounded-2xl border ${report.badgeBg} ${report.badgeBorderColor} space-y-2`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center space-x-2 font-black text-sm md:text-base">
                    {report.tradeVerdict === 'ENTER' ? (
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    ) : report.tradeVerdict === 'CAUTION' ? (
                      <AlertTriangle className="w-5 h-5 text-amber-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-400" />
                    )}
                    <span className={report.badgeTextColor}>{report.verdictLabel}</span>
                  </div>
                  <span className="text-xs font-mono text-slate-300 bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800">
                    Setup: <strong className="text-white">{tradeDirection}</strong> &bull; Relative Status: <strong className="text-indigo-300">{report.relativeStrengthLabel}</strong>
                  </span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {report.verdictDescription}
                </p>
                <div className="pt-1 text-[11px] font-mono text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span><strong>Execution Rule:</strong> {report.tacticalAdvice}</span>
                </div>
              </div>

              {/* 📊 15-Minute Candlestick Chart Snapshot */}
              <FifteenMinCandleChartSnapshot
                stock={report.stock}
                sectorName={report.sectorName}
                sectorAvgPct={report.sectorAvgPct}
                tradeDirection={tradeDirection}
                onRefresh={() => handleCheckStrength(report.stock.symbol)}
                isRefreshing={isChecking}
              />

              {/* Sector Strength & Breadth Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Metric 1: Sector Average & Bias */}
                <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-2">
                  <div className="text-[10px] font-mono text-slate-400 uppercase font-bold flex items-center justify-between">
                    <span>Sector Performance</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                      report.sectorAvgPct >= 0 ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' : 'bg-rose-950 text-rose-300 border border-rose-500/30'
                    }`}>
                      {report.sectorBias.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-baseline space-x-2">
                    <span className={`text-2xl font-black font-mono ${report.sectorAvgPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {report.sectorAvgPct >= 0 ? '+' : ''}{report.sectorAvgPct.toFixed(2)}%
                    </span>
                    <span className="text-xs text-slate-400">Industry Avg</span>
                  </div>
                  <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                    Leader: <strong className="text-emerald-400">{report.sectorLeader?.symbol || 'N/A'}</strong> ({report.sectorLeader ? `${report.sectorLeader.pct >= 0 ? '+' : ''}${report.sectorLeader.pct.toFixed(1)}%` : '-'})
                  </div>
                </div>

                {/* Metric 2: Advance / Decline Breadth */}
                <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-2">
                  <div className="text-[10px] font-mono text-slate-400 uppercase font-bold flex items-center justify-between">
                    <span>Advance / Decline Breadth</span>
                    <span className="text-emerald-400 font-bold">{report.sectorBullishBreadthPct}% Green</span>
                  </div>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-2xl font-black font-mono text-emerald-400">
                      {report.sectorAdvancing}
                    </span>
                    <span className="text-xs text-slate-400">Advances &bull;</span>
                    <span className="text-2xl font-black font-mono text-rose-400">
                      {report.sectorDeclining}
                    </span>
                    <span className="text-xs text-slate-400">Declines</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
                    <div 
                      className="bg-emerald-500 h-full transition-all duration-300"
                      style={{ width: `${report.sectorBullishBreadthPct}%` }}
                    />
                    <div 
                      className="bg-rose-500 h-full transition-all duration-300"
                      style={{ width: `${100 - report.sectorBullishBreadthPct}%` }}
                    />
                  </div>
                </div>

                {/* Metric 3: Relative Strength & Alpha */}
                <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-2">
                  <div className="text-[10px] font-mono text-slate-400 uppercase font-bold flex items-center justify-between">
                    <span>Stock Alpha vs Sector</span>
                    <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-500/30 text-[9px] font-bold">
                      {report.relativeStrengthLabel.split(' ')[0]}
                    </span>
                  </div>
                  <div className="flex items-baseline space-x-2">
                    <span className={`text-2xl font-black font-mono ${report.relativeStrengthAlpha >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {report.relativeStrengthAlpha >= 0 ? '+' : ''}{report.relativeStrengthAlpha.toFixed(2)}%
                    </span>
                    <span className="text-xs text-slate-400">Spread</span>
                  </div>
                  <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                    Stock Change: <strong className="text-white">{(report.stock.pctChange || 0) >= 0 ? '+' : ''}{(report.stock.pctChange || 0).toFixed(2)}%</strong>
                  </div>
                </div>
              </div>

              {/* 4-Point Institutional Checklist */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-mono font-bold text-slate-400 uppercase flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  <span>Institutional Sector Confluence Checklist</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {report.checklist.map((item, idx) => (
                    <div 
                      key={idx}
                      className={`p-3 rounded-xl border flex items-start space-x-2.5 ${
                        item.passed 
                          ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200' 
                          : 'bg-rose-950/30 border-rose-500/30 text-rose-200'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {item.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-400" />
                        )}
                      </div>
                      <div className="space-y-0.5 text-xs">
                        <div className="font-bold text-white flex items-center justify-between">
                          <span>{item.title}</span>
                          <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-black ${
                            item.passed ? 'bg-emerald-900 text-emerald-300' : 'bg-rose-900 text-rose-300'
                          }`}>
                            {item.passed ? 'PASSED' : 'FAILED'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-snug">{item.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Industry Peer Comparison Matrix Table */}
              {report.peerStocks.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-mono font-bold text-slate-400 uppercase flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-indigo-400" />
                      <span>{report.sectorName} Component Peer Stocks ({report.peerStocks.length})</span>
                    </h4>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Sorted by % Change
                    </span>
                  </div>

                  <div className="overflow-x-auto border border-slate-800 rounded-2xl bg-slate-950/90">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3 font-bold">Symbol</th>
                          <th className="py-2.5 px-3 font-bold">Company</th>
                          <th className="py-2.5 px-3 text-right font-bold">LTP</th>
                          <th className="py-2.5 px-3 text-right font-bold">% Change</th>
                          <th className="py-2.5 px-3 text-center font-bold">VWAP</th>
                          <th className="py-2.5 px-3 text-center font-bold">RSI(14)</th>
                          <th className="py-2.5 px-3 text-center font-bold">Trend</th>
                          <th className="py-2.5 px-3 text-center font-bold">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 text-slate-200">
                        {report.peerStocks.map((peer) => {
                          const isCurrent = peer.symbol.toUpperCase() === report.stock.symbol.toUpperCase();
                          const pct = peer.pctChange || 0;
                          return (
                            <tr 
                              key={peer.id || peer.symbol}
                              className={`hover:bg-slate-800/70 transition-colors ${
                                isCurrent ? 'bg-indigo-950/60 border-l-4 border-indigo-500' : ''
                              }`}
                            >
                              <td className="py-2 px-3 font-bold text-white flex items-center space-x-1.5">
                                <span>{peer.symbol}</span>
                                {isCurrent && (
                                  <span className="text-[9px] bg-indigo-500 text-white px-1.5 py-0.2 rounded font-sans font-black">
                                    ACTIVE
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-slate-300 font-sans truncate max-w-xs">
                                {peer.companyName}
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-white">
                                {peer.closePrice ? `₹${peer.closePrice.toFixed(1)}` : '-'}
                              </td>
                              <td className={`py-2 px-3 text-right font-bold ${pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {peer.closePrice ? `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%` : '-'}
                              </td>
                              <td className="py-2 px-3 text-center">
                                {peer.vwap ? (
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                                    (peer.closePrice || 0) >= peer.vwap ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'
                                  }`}>
                                    {(peer.closePrice || 0) >= peer.vwap ? 'Above' : 'Below'} (₹{peer.vwap})
                                  </span>
                                ) : '-'}
                              </td>
                              <td className="py-2 px-3 text-center font-bold">
                                {peer.rsi !== undefined && peer.rsi !== null ? (
                                  <span className={peer.rsi >= 60 ? 'text-emerald-400' : peer.rsi <= 40 ? 'text-rose-400' : 'text-slate-300'}>
                                    {peer.rsi.toFixed(1)}
                                  </span>
                                ) : '-'}
                              </td>
                              <td className="py-2 px-3 text-center">
                                {peer.trend ? (
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    peer.trend.includes('Bullish') ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' : 'bg-rose-950 text-rose-300 border border-rose-500/30'
                                  }`}>
                                    {peer.trend}
                                  </span>
                                ) : '-'}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <button
                                  onClick={() => handleCheckStrength(peer.symbol)}
                                  className="px-2.5 py-1 bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white rounded-lg text-[10px] font-bold transition-colors cursor-pointer flex items-center space-x-1 mx-auto"
                                >
                                  <Zap className="w-3 h-3 text-yellow-400" />
                                  <span>Check</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: ALL 18+ MARKET SECTORS LEADERBOARD & HEATMAP GRID */}
      {activeViewMode === 'ALL_SECTORS' && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 md:p-6 shadow-sm space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-lg font-black tracking-tight text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                <span>All 18+ Market Sectors Heatmap &amp; Strength Ranking</span>
              </h3>
              <p className="text-xs text-slate-500">
                Live sorted leaderboard of Indian stock market industries. Click any sector leader to check its 15-minute candlestick chart and deep confluence.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                onClick={() => setSectorFilter('ALL')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  sectorFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Sectors ({allSectorsList.length})
              </button>
              <button
                onClick={() => setSectorFilter('BULLISH')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  sectorFilter === 'BULLISH' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:text-emerald-700'
                }`}
              >
                🟢 Bullish Only
              </button>
              <button
                onClick={() => setSectorFilter('BEARISH')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  sectorFilter === 'BEARISH' ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-600 hover:text-rose-700'
                }`}
              >
                🔴 Bearish Only
              </button>
            </div>
          </div>

          {/* Sector Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
            {filteredSectors.map((sector, idx) => {
              const isPositive = sector.avgPctChange >= 0;
              const isSelected = selectedSectorKey === sector.sectorKey;
              const isSuperStrong = sector.bullishBreadthPct >= 90;
              return (
                <div
                  key={sector.sectorKey}
                  onClick={() => setSelectedSectorKey(isSelected ? null : sector.sectorKey)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                    isPositive 
                      ? 'bg-slate-50 hover:bg-emerald-50/40 border-slate-200 hover:border-emerald-300' 
                      : 'bg-slate-50 hover:bg-rose-50/40 border-slate-200 hover:border-rose-300'
                  } ${isSelected ? 'ring-2 ring-indigo-500 bg-indigo-50/50' : ''}`}
                >
                  {isSuperStrong && (
                    <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-bl-lg flex items-center gap-1 shadow-2xs">
                      <Flame className="w-2.5 h-2.5 fill-current text-yellow-200" />
                      <span>&gt;90% Strength</span>
                    </div>
                  )}

                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-xl">{sector.categoryIcon}</span>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                          <span>{sector.sectorName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">#{idx + 1}</span>
                        </h4>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {sector.totalStocks} F&amp;O Stocks
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`text-base font-mono font-black ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isPositive ? '+' : ''}{sector.avgPctChange.toFixed(2)}%
                      </div>
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded uppercase ${
                        isPositive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {sector.sectorBias.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Breadth Bar */}
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                      <span className="flex items-center gap-1 font-bold">
                        <span>Breadth ({sector.bullishBreadthPct}% Green)</span>
                      </span>
                      <span>{sector.advancingCount} Up &bull; {sector.decliningCount} Down</span>
                    </div>
                    <div className="w-full bg-rose-200 h-1.5 rounded-full overflow-hidden flex">
                      <div 
                        className="bg-emerald-500 h-full transition-all duration-300"
                        style={{ width: `${sector.bullishBreadthPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Top Stock in Sector & Instant Check Button */}
                  <div className="mt-2.5 pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-500">Leader:</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (sector.leaderSymbol) handleCheckStrength(sector.leaderSymbol);
                      }}
                      className="font-bold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>{sector.leaderSymbol || 'N/A'}</span>
                      {sector.leaderPct !== undefined && (
                        <span className="text-emerald-600">({sector.leaderPct >= 0 ? '+' : ''}{sector.leaderPct.toFixed(1)}%)</span>
                      )}
                      <ChevronRight className="w-3 h-3 text-indigo-400" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};
