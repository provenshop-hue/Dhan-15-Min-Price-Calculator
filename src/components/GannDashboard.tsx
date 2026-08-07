import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calendar, Search, Filter, RefreshCw, Sparkles, TrendingUp, TrendingDown, 
  Layers, ArrowUpRight, ArrowDownRight, ChevronRight, CheckCircle2, ShieldAlert,
  Sliders, Eye, HelpCircle, X, Check, Activity, BarChart2, Zap
} from 'lucide-react';
import { StockCalculated, DhanApiCredentials } from '../types';
import { calculateGannMonthData, getMonthBounds, PrevMonthGannData } from '../utils/gannMonth';

interface GannDashboardProps {
  stocks: StockCalculated[];
  credentials: DhanApiCredentials;
  onOpenSettings: () => void;
  selectedDate: string;
}

type FilterStatus = 
  | 'ALL'
  | 'SUPER_BULLISH'
  | 'NEAR_PMH'
  | 'ABOVE_MIDPOINT'
  | 'BELOW_MIDPOINT'
  | 'NEAR_PML'
  | 'SUPER_BEARISH';

export const GannDashboard: React.FC<GannDashboardProps> = ({
  stocks,
  credentials,
  onOpenSettings,
  selectedDate
}) => {
  // Activation State - "This has to be activated only when user clicks a button"
  const [isActivated, setIsActivated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [targetDateStr, setTargetDateStr] = useState<string>(selectedDate || '2026-08-07');
  
  // UI & Search State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedStockData, setSelectedStockData] = useState<PrevMonthGannData | null>(null);

  // Real Dhan Index Data State
  const [indexDhanData, setIndexDhanData] = useState<Record<string, any>>({});
  const [isSyncingIndices, setIsSyncingIndices] = useState<boolean>(false);

  // Month Bounds Metadata
  const bounds = useMemo(() => getMonthBounds(targetDateStr), [targetDateStr]);

  // Helper to sync Nifty & Bank Nifty Spot data from Dhan API
  const syncIndicesWithDhan = async () => {
    if (!credentials?.clientId || !credentials?.accessToken) return;
    setIsSyncingIndices(true);

    try {
      const [niftyRes, bankRes] = await Promise.allSettled([
        fetch('/api/dhan/prev-month-ohlc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: credentials.clientId,
            accessToken: credentials.accessToken,
            symbol: 'NIFTY 50',
            securityId: '13',
            fromDate: bounds.fromDateStr,
            toDate: bounds.toDateStr
          })
        }),
        fetch('/api/dhan/prev-month-ohlc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: credentials.clientId,
            accessToken: credentials.accessToken,
            symbol: 'BANKNIFTY',
            securityId: '25',
            fromDate: bounds.fromDateStr,
            toDate: bounds.toDateStr
          })
        })
      ]);

      const newMap: Record<string, any> = {};

      if (niftyRes.status === 'fulfilled') {
        const json = await niftyRes.value.json().catch(() => null);
        if (json?.success) {
          newMap['NIFTY 50'] = json;
          newMap['NIFTY'] = json;
        }
      }

      if (bankRes.status === 'fulfilled') {
        const json = await bankRes.value.json().catch(() => null);
        if (json?.success) {
          newMap['BANKNIFTY'] = json;
          newMap['BANK NIFTY'] = json;
        }
      }

      if (Object.keys(newMap).length > 0) {
        setIndexDhanData((prev) => ({ ...prev, ...newMap }));
      }
    } catch (err) {
      console.error('Failed syncing index Dhan OHLC:', err);
    } finally {
      setIsSyncingIndices(false);
    }
  };

  // Auto-sync indices when activated or when Dhan credentials become available
  useEffect(() => {
    if (isActivated && credentials?.clientId && credentials?.accessToken) {
      syncIndicesWithDhan();
    }
  }, [isActivated, credentials?.clientId, credentials?.accessToken, bounds.fromDateStr, bounds.toDateStr]);

  // Analyzed Stocks Dataset
  const analyzedData: PrevMonthGannData[] = useMemo(() => {
    if (!isActivated) return [];
    return stocks.map((st) => calculateGannMonthData(st, targetDateStr));
  }, [isActivated, stocks, targetDateStr]);

  // Benchmark Indices: Nifty 50 and Bank Nifty
  const indexBenchmarkItems = useMemo(() => {
    if (!isActivated) return [];

    const niftyRealData = indexDhanData['NIFTY 50'] || indexDhanData['NIFTY'];
    const nifty = calculateGannMonthData(
      {
        id: 'idx_nifty50',
        symbol: 'NIFTY 50',
        companyName: 'Nifty 50 Benchmark Index',
        screenerUrl: '',
        lotSizeJun2026: 75,
        lotSizeJul2026: 75,
        lotSizeAug2026: 75,
        closePrice: niftyRealData?.cmp || 24850.5,
        openPrice: niftyRealData?.cmp || 24800.0
      },
      targetDateStr,
      niftyRealData
    );

    const bankNiftyRealData = indexDhanData['BANKNIFTY'] || indexDhanData['BANK NIFTY'];
    const bankNifty = calculateGannMonthData(
      {
        id: 'idx_banknifty',
        symbol: 'BANKNIFTY',
        companyName: 'Nifty Bank Index',
        screenerUrl: '',
        lotSizeJun2026: 15,
        lotSizeJul2026: 15,
        lotSizeAug2026: 15,
        closePrice: bankNiftyRealData?.cmp || 52420.0,
        openPrice: bankNiftyRealData?.cmp || 52300.0
      },
      targetDateStr,
      bankNiftyRealData
    );

    return [nifty, bankNifty];
  }, [isActivated, indexDhanData, targetDateStr]);

  // Statistics
  const stats = useMemo(() => {
    if (!analyzedData.length) return { total: 0, superBullish: 0, nearPmh: 0, aboveMid: 0, belowMid: 0, superBearish: 0, avgRangePct: '0' };

    let superBullish = 0;
    let nearPmh = 0;
    let aboveMid = 0;
    let belowMid = 0;
    let superBearish = 0;
    let sumRange = 0;

    analyzedData.forEach((d) => {
      if (d.cmpStatus === 'SUPER_BULLISH') superBullish++;
      else if (d.cmpStatus === 'NEAR_PMH') nearPmh++;
      else if (d.cmpStatus === 'ABOVE_MIDPOINT') aboveMid++;
      else if (d.cmpStatus === 'BELOW_MIDPOINT') belowMid++;
      else if (d.cmpStatus === 'SUPER_BEARISH') superBearish++;

      sumRange += d.prevMonthRangePct;
    });

    return {
      total: analyzedData.length,
      superBullish,
      nearPmh,
      aboveMid,
      belowMid,
      superBearish,
      avgRangePct: (sumRange / analyzedData.length).toFixed(1)
    };
  }, [analyzedData]);

  // Filtered & Searched Stock List
  const filteredStocks = useMemo(() => {
    return analyzedData.filter((d) => {
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesSymbol = d.symbol.toLowerCase().includes(q);
        const matchesCompany = d.companyName.toLowerCase().includes(q);
        if (!matchesSymbol && !matchesCompany) return false;
      }

      // Filter
      if (activeFilter !== 'ALL') {
        if (activeFilter === 'SUPER_BULLISH' && d.cmpStatus !== 'SUPER_BULLISH') return false;
        if (activeFilter === 'NEAR_PMH' && d.cmpStatus !== 'NEAR_PMH') return false;
        if (activeFilter === 'ABOVE_MIDPOINT' && d.cmpStatus !== 'ABOVE_MIDPOINT' && d.cmpStatus !== 'SUPER_BULLISH' && d.cmpStatus !== 'NEAR_PMH') return false;
        if (activeFilter === 'BELOW_MIDPOINT' && d.cmpStatus !== 'BELOW_MIDPOINT' && d.cmpStatus !== 'NEAR_PML' && d.cmpStatus !== 'SUPER_BEARISH') return false;
        if (activeFilter === 'SUPER_BEARISH' && d.cmpStatus !== 'SUPER_BEARISH') return false;
      }

      return true;
    });
  }, [analyzedData, searchQuery, activeFilter]);

  // Action Handler: Activate & Fetch Previous Month High/Low Data
  const handleActivate = async () => {
    setIsLoading(true);
    if (credentials?.clientId && credentials?.accessToken) {
      await syncIndicesWithDhan();
    }
    setIsActivated(true);
    setIsLoading(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Dashboard Title */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
        {/* Background Decorative Mesh */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-blue-500/20 text-blue-300 text-xs px-3 py-1 rounded-full font-bold border border-blue-400/30 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                <span>Target Month: {bounds.targetMonthName}</span>
              </span>
              <span className="bg-indigo-500/20 text-indigo-300 text-xs px-3 py-1 rounded-full font-bold border border-indigo-400/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Previous Month: {bounds.prevMonthName} ({bounds.prevMonthStartDate} – {bounds.prevMonthEndDate})</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <span>🏛️ Gann Month High/Low Dashboard</span>
            </h1>
            
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              Analyzes previous month's exact High &amp; Low prices and their appearance dates ({bounds.prevMonthName}). Features Gann Square of 9 breakout triggers, 50% midpoint retracements, and 8-Level Gann Octaves for {bounds.targetMonthName}.
            </p>
          </div>

          {/* Month Selector & Main Activation Button */}
          <div className="bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl border border-slate-700/80 shadow-lg shrink-0 space-y-3">
            <div className="flex items-center space-x-2 text-xs text-slate-300">
              <Calendar className="w-4 h-4 text-blue-400" />
              <label htmlFor="target-date-input" className="font-semibold">Select Target Month Date:</label>
              <input 
                id="target-date-input"
                type="date"
                value={targetDateStr}
                onChange={(e) => {
                  setTargetDateStr(e.target.value);
                  setIsActivated(false); // Reset activation to require user click
                }}
                className="bg-slate-900 text-white font-bold px-2 py-1 rounded-lg border border-slate-600 outline-none cursor-pointer text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Activation Button */}
            <button
              onClick={handleActivate}
              disabled={isLoading}
              className={`w-full py-3 px-5 rounded-xl font-black text-xs sm:text-sm shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                isActivated
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 ring-2 ring-emerald-400/40'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white ring-2 ring-blue-400/40 animate-pulse'
              }`}
            >
              <Zap className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>
                {isLoading 
                  ? `Analyzing ${bounds.prevMonthName} High/Low Dates...`
                  : isActivated 
                  ? `Re-fetch ${bounds.prevMonthName} High/Low Data` 
                  : `⚡ Get ${bounds.prevMonthName} High & Low Data`}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* UNACTIVATED LANDING STATE */}
      {!isActivated && (
        <div className="bg-white rounded-3xl p-8 border border-slate-200/90 shadow-sm text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
            <Zap className="w-8 h-8" />
          </div>

          <div className="max-w-xl mx-auto space-y-2">
            <h2 className="text-xl font-bold text-slate-900">
              Ready to Load {bounds.prevMonthName} High &amp; Low Analysis
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Click the activation button above to fetch previous month high/low prices, exact appearance calendar dates, 50% Gann midpoints, and Square of 9 breakout targets for all F&amp;O stocks.
            </p>
          </div>

          <button
            onClick={handleActivate}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all inline-flex items-center space-x-2"
          >
            <Zap className="w-4 h-4" />
            <span>Load {bounds.prevMonthName} High &amp; Low Data Now</span>
          </button>
        </div>
      )}

      {/* ACTIVATED DASHBOARD CONTENT */}
      {isActivated && (
        <div className="space-y-6">
          {/* Key Benchmark Indices Spotlight: Nifty 50 & Bank Nifty */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-5 border border-slate-700/80 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between border-b border-slate-700/80 pb-3 gap-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-400/30">
                  <Activity className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                    <span>Key Benchmark Indices</span>
                    <span className="bg-amber-400/20 text-amber-300 text-[10px] px-2 py-0.5 rounded-full font-black border border-amber-400/30 uppercase tracking-wider">
                      SPOTLIGHT
                    </span>
                  </h2>
                  <p className="text-xs text-slate-300">
                    {bounds.prevMonthName} High/Low Dates &amp; {bounds.targetMonthName} Gann Breakout Triggers for Nifty 50 &amp; Bank Nifty Spot
                  </p>
                </div>
              </div>

              {credentials?.clientId && credentials?.accessToken ? (
                <button
                  onClick={syncIndicesWithDhan}
                  disabled={isSyncingIndices}
                  className="px-3 py-1.5 bg-indigo-600/80 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 border border-indigo-400/30 cursor-pointer shadow-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingIndices ? 'animate-spin text-amber-300' : ''}`} />
                  <span>{isSyncingIndices ? 'Syncing Dhan Spot...' : 'Sync Dhan Spot API'}</span>
                </button>
              ) : (
                <button
                  onClick={onOpenSettings}
                  className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 border border-amber-400/40 cursor-pointer shadow-sm"
                >
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  <span>Connect API in Settings</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {indexBenchmarkItems.map((idxItem) => (
                <div 
                  key={idxItem.stockId}
                  className="bg-slate-950/80 backdrop-blur-md rounded-2xl p-4 border border-slate-800 space-y-3 hover:border-slate-700 transition-all shadow-md flex flex-col justify-between"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded font-black text-[10px] uppercase tracking-wider">
                          INDEX
                        </span>
                        {idxItem.isRealData ? (
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded font-black text-[10px] uppercase tracking-wider flex items-center gap-1">
                            <Zap className="w-2.5 h-2.5 text-emerald-400 fill-emerald-400" />
                            <span>DHAN SPOT API</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-700/40 text-slate-300 border border-slate-600/30 rounded font-extrabold text-[10px] uppercase tracking-wider">
                            SPOT INDEX
                          </span>
                        )}
                        <h3 className="text-lg font-black text-white">{idxItem.symbol}</h3>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${idxItem.cmpStatusBadgeClass}`}>
                          {idxItem.cmpStatusLabel}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-medium mt-1">{idxItem.companyName}</p>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-black text-white">₹{idxItem.cmp.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      <div className="text-[10px] font-extrabold text-slate-400">CMP</div>
                    </div>
                  </div>

                  {/* Previous Month High & Low Details */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-800/60 space-y-1">
                      <div className="text-[10px] font-extrabold text-emerald-400 flex items-center justify-between">
                        <span>PMH High</span>
                        <span className="text-[9px] bg-emerald-900/60 px-1.5 py-0.2 rounded text-emerald-300">{idxItem.prevMonthHighDate}</span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <div className="text-sm font-black text-emerald-300">
                          ₹{idxItem.prevMonthHigh.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {idxItem.prevMonthHighAngle}° Angle
                        </div>
                      </div>
                    </div>

                    <div className="bg-rose-950/40 p-2.5 rounded-xl border border-rose-800/60 space-y-1">
                      <div className="text-[10px] font-extrabold text-rose-400 flex items-center justify-between">
                        <span>PML Low</span>
                        <span className="text-[9px] bg-rose-900/60 px-1.5 py-0.2 rounded text-rose-300">{idxItem.prevMonthLowDate}</span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <div className="text-sm font-black text-rose-300">
                          ₹{idxItem.prevMonthLow.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] font-black px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          {idxItem.prevMonthLowAngle}° Angle
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Gann Midpoint, C4 Range Diff & Breakouts */}
                  <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800/90 text-xs space-y-2">
                    {/* C4 Range Difference & Gann Degree */}
                    <div className="flex items-center justify-between text-slate-300 pb-1.5 border-b border-slate-800">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-amber-400">Range Diff (C4 = High - Low):</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-black text-amber-300">
                          ₹{idxItem.prevMonthRange.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          {idxItem.prevMonthRangeAngle}° Range Degree
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-slate-300 pb-1.5 border-b border-slate-800">
                      <span className="font-bold text-blue-400">Gann 50% Midpoint:</span>
                      <div className="flex items-center space-x-2">
                        <span className="font-black text-blue-300">
                          ₹{idxItem.gannMidpoint.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          {idxItem.gannMidpointAngle}° Angle
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="text-emerald-400">
                        <span className="text-[10px] font-bold block text-slate-400">Buy Breakout &gt;</span>
                        <span className="font-black">₹{idxItem.gannBuyAbove.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        <span className="text-[9px] text-emerald-300 ml-1">({idxItem.gannBuyAboveAngle}°)</span>
                      </div>
                      <div className="text-rose-400">
                        <span className="text-[10px] font-bold block text-slate-400">Sell Breakdown &lt;</span>
                        <span className="font-black">₹{idxItem.gannSellBelow.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        <span className="text-[9px] text-rose-300 ml-1">({idxItem.gannSellBelowAngle}°)</span>
                      </div>
                    </div>
                  </div>

                  {/* Modal Trigger Action */}
                  <button
                    onClick={() => setSelectedStockData(idxItem)}
                    className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-md"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View {idxItem.symbol} Gann Octaves &amp; Dates</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Scanned</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{stats.total}</div>
              <div className="text-[11px] text-slate-500 mt-1 font-medium">{bounds.prevMonthName} F&amp;O Stocks</div>
            </div>

            <button
              onClick={() => setActiveFilter(activeFilter === 'SUPER_BULLISH' ? 'ALL' : 'SUPER_BULLISH')}
              className={`p-4 rounded-2xl border text-left transition-all ${
                activeFilter === 'SUPER_BULLISH'
                  ? 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-400/40 shadow-sm'
                  : 'bg-emerald-50/70 border-emerald-200 hover:border-emerald-400 shadow-2xs'
              }`}
            >
              <div className={`text-[11px] font-bold uppercase tracking-wider flex items-center justify-between ${
                activeFilter === 'SUPER_BULLISH' ? 'text-emerald-100' : 'text-emerald-800'
              }`}>
                <span>🔥 Above PMH</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div className={`text-2xl font-black mt-1 ${
                activeFilter === 'SUPER_BULLISH' ? 'text-white' : 'text-emerald-900'
              }`}>{stats.superBullish}</div>
              <div className={`text-[11px] mt-1 font-medium ${
                activeFilter === 'SUPER_BULLISH' ? 'text-emerald-100' : 'text-emerald-700'
              }`}>
                Breached {bounds.prevMonthName.split(' ')[0]} High
              </div>
            </button>

            <button
              onClick={() => setActiveFilter(activeFilter === 'NEAR_PMH' ? 'ALL' : 'NEAR_PMH')}
              className={`p-4 rounded-2xl border text-left transition-all ${
                activeFilter === 'NEAR_PMH'
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-400 ring-2 ring-emerald-400/30 shadow-sm'
                  : 'bg-white border-slate-200/80 hover:border-emerald-300 shadow-2xs'
              }`}
            >
              <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Near PMH Breakout</div>
              <div className="text-2xl font-black text-emerald-700 mt-1">{stats.nearPmh}</div>
              <div className="text-[11px] text-emerald-600 mt-1 font-medium">Within 1.5% of PMH</div>
            </button>

            <button
              onClick={() => setActiveFilter(activeFilter === 'SUPER_BEARISH' ? 'ALL' : 'SUPER_BEARISH')}
              className={`p-4 rounded-2xl border text-left transition-all ${
                activeFilter === 'SUPER_BEARISH'
                  ? 'bg-rose-600 text-white border-rose-700 ring-2 ring-rose-400/40 shadow-sm'
                  : 'bg-rose-50/70 border-rose-200 hover:border-rose-400 shadow-2xs'
              }`}
            >
              <div className={`text-[11px] font-bold uppercase tracking-wider flex items-center justify-between ${
                activeFilter === 'SUPER_BEARISH' ? 'text-rose-100' : 'text-rose-800'
              }`}>
                <span>🔴 Below PML</span>
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
              </div>
              <div className={`text-2xl font-black mt-1 ${
                activeFilter === 'SUPER_BEARISH' ? 'text-white' : 'text-rose-900'
              }`}>{stats.superBearish}</div>
              <div className={`text-[11px] mt-1 font-medium ${
                activeFilter === 'SUPER_BEARISH' ? 'text-rose-100' : 'text-rose-700'
              }`}>
                Breached {bounds.prevMonthName.split(' ')[0]} Low
              </div>
            </button>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Avg Range %</div>
              <div className="text-2xl font-black text-indigo-700 mt-1">{stats.avgRangePct}%</div>
              <div className="text-[11px] text-slate-500 mt-1 font-medium">Month Volatility Range</div>
            </div>
          </div>

          {/* Search, Filter Tabs & View Controls */}
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
                All Stocks ({analyzedData.length})
              </button>

              <button
                onClick={() => setActiveFilter('SUPER_BULLISH')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  activeFilter === 'SUPER_BULLISH'
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                    : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border-emerald-200'
                }`}
              >
                🔥 Above PMH ({stats.superBullish})
              </button>

              <button
                onClick={() => setActiveFilter('NEAR_PMH')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  activeFilter === 'NEAR_PMH'
                    ? 'bg-emerald-700 text-white border-emerald-800 shadow-2xs'
                    : 'bg-emerald-50/60 text-emerald-800 hover:bg-emerald-100 border-emerald-200'
                }`}
              >
                🟢 Near PMH ({stats.nearPmh})
              </button>

              <button
                onClick={() => setActiveFilter('SUPER_BEARISH')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  activeFilter === 'SUPER_BEARISH'
                    ? 'bg-rose-600 text-white border-rose-700 shadow-2xs'
                    : 'bg-rose-50 text-rose-900 hover:bg-rose-100 border-rose-200'
                }`}
              >
                🔴 Below PML ({stats.superBearish})
              </button>
            </div>

            {/* Search Box & View Mode Toggle */}
            <div className="flex items-center space-x-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search stock symbol..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Grid / Table View Toggles */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                    viewMode === 'grid' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                  title="Grid View"
                >
                  <BarChart2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                    viewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                  title="Table View"
                >
                  <Layers className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* STOCK LIST CONTENT */}
          {filteredStocks.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
              <Filter className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">No stocks match your filter criteria.</p>
              <button
                onClick={() => { setActiveFilter('ALL'); setSearchQuery(''); }}
                className="text-xs font-extrabold text-blue-600 hover:underline"
              >
                Clear Filters
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            /* GRID CARDS VIEW */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStocks.map((item) => (
                <div 
                  key={item.stockId}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all p-4 space-y-3.5 flex flex-col justify-between"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-black text-slate-900 text-base">{item.symbol}</h3>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${item.cmpStatusBadgeClass}`}>
                          {item.cmpStatusLabel}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium truncate max-w-[200px]">
                        {item.companyName}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-black text-slate-900">₹{item.cmp.toFixed(2)}</div>
                      <div className="text-[10px] font-bold text-slate-500">CMP</div>
                    </div>
                  </div>

                  {/* Previous Month High & Low Details Box */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-2 text-xs">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between border-b border-slate-200/80 pb-1">
                      <span>{item.prevMonthName} Bounds</span>
                      <span className="text-amber-800 font-extrabold bg-amber-100 px-1.5 py-0.2 rounded border border-amber-200">
                        C4 Angle: {item.prevMonthRangeAngle}°
                      </span>
                    </div>

                    {/* High Date & Price & Angle */}
                    <div className="flex items-center justify-between text-slate-800">
                      <div className="flex items-center space-x-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <div>
                          <span className="font-extrabold text-emerald-700">Prev High (PMH):</span>
                          <span className="text-[10px] text-slate-500 ml-1 font-semibold">({item.prevMonthHighDate})</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-emerald-700">₹{item.prevMonthHigh.toFixed(2)}</span>
                        <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-100/80 px-1 py-0.2 rounded ml-1 border border-emerald-200">
                          {item.prevMonthHighAngle}°
                        </span>
                      </div>
                    </div>

                    {/* Low Date & Price & Angle */}
                    <div className="flex items-center justify-between text-slate-800">
                      <div className="flex items-center space-x-1.5">
                        <TrendingDown className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <div>
                          <span className="font-extrabold text-rose-700">Prev Low (PML):</span>
                          <span className="text-[10px] text-slate-500 ml-1 font-semibold">({item.prevMonthLowDate})</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-rose-700">₹{item.prevMonthLow.toFixed(2)}</span>
                        <span className="text-[9px] font-extrabold text-rose-600 bg-rose-100/80 px-1 py-0.2 rounded ml-1 border border-rose-200">
                          {item.prevMonthLowAngle}°
                        </span>
                      </div>
                    </div>

                    {/* Range Difference (C4) */}
                    <div className="flex items-center justify-between text-slate-700 pt-1 border-t border-slate-200/60 text-[11px]">
                      <span className="font-bold text-amber-800">Range Diff (C4 = High - Low):</span>
                      <div className="text-right">
                        <span className="font-black text-slate-900">₹{item.prevMonthRange.toFixed(2)}</span>
                        <span className="text-[9px] font-extrabold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded ml-1 border border-amber-300">
                          {item.prevMonthRangeAngle}° Degree
                        </span>
                      </div>
                    </div>

                    {/* Gann 50% Midpoint */}
                    <div className="flex items-center justify-between text-slate-700 text-[11px]">
                      <span className="font-bold text-blue-700">Gann 50% Midpoint:</span>
                      <div className="text-right">
                        <span className="font-black text-blue-800">₹{item.gannMidpoint.toFixed(2)}</span>
                        <span className="text-[9px] font-extrabold text-blue-600 bg-blue-100/80 px-1 py-0.2 rounded ml-1 border border-blue-200">
                          {item.gannMidpointAngle}°
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Gann Breakout Levels */}
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-emerald-50/70 p-2 rounded-xl border border-emerald-200">
                      <div className="text-[10px] font-bold text-emerald-800">Buy Breakout &gt;</div>
                      <div className="font-black text-emerald-900 mt-0.5">₹{item.gannBuyAbove.toFixed(2)}</div>
                    </div>
                    <div className="bg-rose-50/70 p-2 rounded-xl border border-rose-200">
                      <div className="text-[10px] font-bold text-rose-800">Sell Breakdown &lt;</div>
                      <div className="font-black text-rose-900 mt-0.5">₹{item.gannSellBelow.toFixed(2)}</div>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <button
                    onClick={() => setSelectedStockData(item)}
                    className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-blue-400" />
                    <span>View Full Gann Analysis &amp; Dates</span>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            /* TABLE VIEW */
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-700 font-extrabold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                    <th className="p-3.5">Symbol</th>
                    <th className="p-3.5">CMP</th>
                    <th className="p-3.5">PMH ({bounds.prevMonthName.split(' ')[0]} High)</th>
                    <th className="p-3.5">Date High Appeared</th>
                    <th className="p-3.5">PML ({bounds.prevMonthName.split(' ')[0]} Low)</th>
                    <th className="p-3.5">Date Low Appeared</th>
                    <th className="p-3.5">Range Diff (C4)</th>
                    <th className="p-3.5">50% Midpoint</th>
                    <th className="p-3.5">Gann Buy Trigger</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {filteredStocks.map((item) => (
                    <tr key={item.stockId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5">
                        <div className="font-black text-slate-900">{item.symbol}</div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[140px]">{item.companyName}</div>
                      </td>
                      <td className="p-3.5 font-black text-slate-900">₹{item.cmp.toFixed(2)}</td>
                      <td className="p-3.5 font-bold text-emerald-700">
                        <div>₹{item.prevMonthHigh.toFixed(2)}</div>
                        <div className="text-[9px] font-extrabold text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200 inline-block mt-0.5">
                          {item.prevMonthHighAngle}° Angle
                        </div>
                      </td>
                      <td className="p-3.5 font-semibold text-slate-600 bg-emerald-50/40 rounded-lg">{item.prevMonthHighDate}</td>
                      <td className="p-3.5 font-bold text-rose-700">
                        <div>₹{item.prevMonthLow.toFixed(2)}</div>
                        <div className="text-[9px] font-extrabold text-rose-600 bg-rose-50 px-1 py-0.2 rounded border border-rose-200 inline-block mt-0.5">
                          {item.prevMonthLowAngle}° Angle
                        </div>
                      </td>
                      <td className="p-3.5 font-semibold text-slate-600 bg-rose-50/40 rounded-lg">{item.prevMonthLowDate}</td>
                      <td className="p-3.5 font-bold text-amber-900 bg-amber-50/40 rounded-lg">
                        <div>₹{item.prevMonthRange.toFixed(2)}</div>
                        <div className="text-[9px] font-extrabold text-amber-800 bg-amber-100 px-1 py-0.2 rounded border border-amber-300 inline-block mt-0.5">
                          {item.prevMonthRangeAngle}° Degree
                        </div>
                      </td>
                      <td className="p-3.5 font-black text-blue-800">₹{item.gannMidpoint.toFixed(2)}</td>
                      <td className="p-3.5 font-black text-emerald-800">₹{item.gannBuyAbove.toFixed(2)}</td>
                      <td className="p-3.5">
                        <span className={`text-[10px] font-extrabold px-2 py-1 rounded-md border ${item.cmpStatusBadgeClass}`}>
                          {item.cmpStatusLabel}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => setSelectedStockData(item)}
                          className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-lg text-xs font-bold transition-colors inline-flex items-center space-x-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Details</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* DETAILED GANN STOCK MODAL */}
      {selectedStockData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 space-y-6 animate-fade-in">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-2xl font-black text-slate-900">{selectedStockData.symbol}</h2>
                  <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-md border ${selectedStockData.cmpStatusBadgeClass}`}>
                    {selectedStockData.cmpStatusLabel}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">{selectedStockData.companyName}</p>
              </div>

              <button
                onClick={() => setSelectedStockData(null)}
                className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target & Previous Month Banner */}
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200 text-xs text-blue-900 space-y-1">
              <div className="font-extrabold flex items-center justify-between">
                <span>Target Trading Month: {selectedStockData.targetMonth}</span>
                <span className="text-blue-700">CMP: ₹{selectedStockData.cmp.toFixed(2)}</span>
              </div>
              <div className="text-blue-800 font-medium">
                Analysis derived from <strong>{selectedStockData.prevMonthName}</strong> ({selectedStockData.prevMonthStartDate} – {selectedStockData.prevMonthEndDate})
              </div>
            </div>

            {/* Exact Appearance Dates & Prices Box */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-50/80 p-4 rounded-2xl border border-emerald-200 space-y-1">
                <div className="text-xs font-bold text-emerald-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span>Previous Month High (PMH)</span>
                  </div>
                  <span className="text-[10px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                    {selectedStockData.prevMonthHighAngle}° Degree
                  </span>
                </div>
                <div className="text-2xl font-black text-emerald-950">₹{selectedStockData.prevMonthHigh.toFixed(2)}</div>
                <div className="text-xs font-extrabold text-emerald-700 pt-1">
                  📅 High Appeared On: <span className="bg-white px-2 py-0.5 rounded border border-emerald-300 shadow-2xs">{selectedStockData.prevMonthHighDate}</span>
                </div>
              </div>

              <div className="bg-rose-50/80 p-4 rounded-2xl border border-rose-200 space-y-1">
                <div className="text-xs font-bold text-rose-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <TrendingDown className="w-4 h-4 text-rose-600" />
                    <span>Previous Month Low (PML)</span>
                  </div>
                  <span className="text-[10px] font-black bg-rose-600 text-white px-2 py-0.5 rounded-full">
                    {selectedStockData.prevMonthLowAngle}° Degree
                  </span>
                </div>
                <div className="text-2xl font-black text-rose-950">₹{selectedStockData.prevMonthLow.toFixed(2)}</div>
                <div className="text-xs font-extrabold text-rose-700 pt-1">
                  📅 Low Appeared On: <span className="bg-white px-2 py-0.5 rounded border border-rose-300 shadow-2xs">{selectedStockData.prevMonthLowDate}</span>
                </div>
              </div>
            </div>

            {/* Gann Square of 9 Degree / Angle Matrix */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-4 rounded-2xl border border-indigo-500/30 text-white space-y-3 shadow-md">
              <div className="flex flex-wrap items-center justify-between border-b border-indigo-800/60 pb-2 gap-2">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">
                    Gann Square of 9 Degree / Angle Matrix
                  </h3>
                </div>
                <div className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 rounded text-[10px] font-mono font-bold">
                  MOD(SQRT(C4)*180 - 225, 360)
                </div>
              </div>

              {/* Featured Range Difference (C4 = PMH - PML) Degree Box */}
              <div className="bg-gradient-to-r from-amber-950/90 via-indigo-950/90 to-amber-950/90 p-3 rounded-xl border border-amber-500/50 flex flex-wrap items-center justify-between gap-3 shadow-inner">
                <div>
                  <div className="text-[10px] text-amber-300 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Range Difference C4 (PMH - PML)</span>
                  </div>
                  <div className="text-xl font-black text-amber-200 mt-0.5">
                    ₹{selectedStockData.prevMonthRange.toFixed(2)} <span className="text-xs text-amber-300/80 font-normal">({selectedStockData.prevMonthRangePct}%)</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-amber-300/80 font-bold uppercase tracking-wider">Range Gann Degree (C4)</div>
                  <div className="text-2xl font-black text-amber-300 bg-amber-500/20 px-3.5 py-1 rounded-xl border border-amber-400/40 inline-block shadow-sm">
                    {selectedStockData.prevMonthRangeAngle}° Degree
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-0.5">
                  <div className="text-[10px] text-emerald-400 font-extrabold uppercase">PMH High Angle</div>
                  <div className="text-base font-black text-emerald-300">{selectedStockData.prevMonthHighAngle}°</div>
                  <div className="text-[9px] text-slate-400">Price: ₹{selectedStockData.prevMonthHigh.toFixed(2)}</div>
                </div>

                <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-0.5">
                  <div className="text-[10px] text-rose-400 font-extrabold uppercase">PML Low Angle</div>
                  <div className="text-base font-black text-rose-300">{selectedStockData.prevMonthLowAngle}°</div>
                  <div className="text-[9px] text-slate-400">Price: ₹{selectedStockData.prevMonthLow.toFixed(2)}</div>
                </div>

                <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-0.5">
                  <div className="text-[10px] text-blue-400 font-extrabold uppercase">CMP Price Angle</div>
                  <div className="text-base font-black text-blue-300">{selectedStockData.cmpAngle}°</div>
                  <div className="text-[9px] text-slate-400">Price: ₹{selectedStockData.cmp.toFixed(2)}</div>
                </div>

                <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-0.5">
                  <div className="text-[10px] text-indigo-400 font-extrabold uppercase">50% Midpoint Angle</div>
                  <div className="text-base font-black text-indigo-300">{selectedStockData.gannMidpointAngle}°</div>
                  <div className="text-[9px] text-slate-400">Price: ₹{selectedStockData.gannMidpoint.toFixed(2)}</div>
                </div>

                <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-0.5">
                  <div className="text-[10px] text-emerald-400 font-extrabold uppercase">Buy Above Angle</div>
                  <div className="text-base font-black text-emerald-300">{selectedStockData.gannBuyAboveAngle}°</div>
                  <div className="text-[9px] text-slate-400">Price: ₹{selectedStockData.gannBuyAbove.toFixed(2)}</div>
                </div>

                <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-0.5">
                  <div className="text-[10px] text-rose-400 font-extrabold uppercase">Sell Below Angle</div>
                  <div className="text-base font-black text-rose-300">{selectedStockData.gannSellBelowAngle}°</div>
                  <div className="text-[9px] text-slate-400">Price: ₹{selectedStockData.gannSellBelow.toFixed(2)}</div>
                </div>
              </div>
            </div>

            {/* 8-Level Gann Octave Ladder */}
            <div className="space-y-2">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center justify-between">
                <span>Gann 8-Octave Retracement Levels ({selectedStockData.prevMonthName})</span>
                <span className="text-indigo-600">Midpoint 50%: ₹{selectedStockData.gannMidpoint.toFixed(2)}</span>
              </h3>

              <div className="bg-slate-900 text-slate-200 p-4 rounded-2xl border border-slate-800 text-xs space-y-2">
                <div className="flex items-center justify-between py-1 border-b border-slate-800 text-emerald-400 font-bold">
                  <span>100% (Prev High): ₹{selectedStockData.gannOctaves.level1000.toFixed(2)}</span>
                  <span className="text-[10px] text-slate-400">High Date: {selectedStockData.prevMonthHighDate}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-800 text-slate-300">
                  <span>87.5% Level: ₹{selectedStockData.gannOctaves.level875.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-800 text-slate-300">
                  <span>75.0% Level (3/4 Angle): ₹{selectedStockData.gannOctaves.level750.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-800 text-slate-300">
                  <span>62.5% Level: ₹{selectedStockData.gannOctaves.level625.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-800 text-blue-400 font-extrabold bg-blue-950/40 px-2 rounded">
                  <span>50.0% Level (Gann Midpoint): ₹{selectedStockData.gannOctaves.level500.toFixed(2)}</span>
                  <span className="text-[10px] text-blue-300">Crucial Pivot</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-800 text-slate-300">
                  <span>37.5% Level: ₹{selectedStockData.gannOctaves.level375.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-800 text-slate-300">
                  <span>25.0% Level (1/4 Angle): ₹{selectedStockData.gannOctaves.level250.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-800 text-slate-300">
                  <span>12.5% Level: ₹{selectedStockData.gannOctaves.level125.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between py-1 text-rose-400 font-bold">
                  <span>0% (Prev Low): ₹{selectedStockData.gannOctaves.level000.toFixed(2)}</span>
                  <span className="text-[10px] text-slate-400">Low Date: {selectedStockData.prevMonthLowDate}</span>
                </div>
              </div>
            </div>

            {/* Gann Square of 9 Breakout Targets */}
            <div className="space-y-2">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Gann Square of 9 Targets ({selectedStockData.targetMonth})
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-200 space-y-1">
                  <div className="font-extrabold text-emerald-800">Upside Breakout Target 1:</div>
                  <div className="text-lg font-black text-emerald-950">₹{selectedStockData.gannBuyAbove.toFixed(2)}</div>
                  <div className="text-[10px] text-emerald-700">Target 2: ₹{selectedStockData.gannTargetsUp[0].toFixed(2)}</div>
                </div>

                <div className="bg-rose-50 p-3 rounded-2xl border border-rose-200 space-y-1">
                  <div className="font-extrabold text-rose-800">Downside Breakdown Target 1:</div>
                  <div className="text-lg font-black text-rose-950">₹{selectedStockData.gannSellBelow.toFixed(2)}</div>
                  <div className="text-[10px] text-rose-700">Target 2: ₹{selectedStockData.gannTargetsDown[0].toFixed(2)}</div>
                </div>
              </div>
            </div>

            {/* Modal Close Button */}
            <button
              onClick={() => setSelectedStockData(null)}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl text-xs transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
