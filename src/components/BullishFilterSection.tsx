import React, { useState, useMemo } from 'react';
import { StockCalculated } from '../types';
import { analyzeBullishCombinations } from '../utils/bullishCombinations';
import { 
  TrendingUp, 
  Flame, 
  Layers, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  SlidersHorizontal, 
  ExternalLink, 
  ArrowUpRight, 
  Activity,
  Zap,
  BarChart2,
  Filter,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  Clock,
  ArrowUpDown,
  Maximize2,
  Minimize2,
  Calculator,
  ChevronsUpDown,
  Info
} from 'lucide-react';

interface BullishFilterSectionProps {
  stocks: StockCalculated[];
  onSelectStockDetail?: (stock: StockCalculated) => void;
  onOpenPositionSizer?: (stock: StockCalculated) => void;
  onSelectFilter?: (filterKey: 'BULLISH_COMBO_1' | 'BULLISH_COMBO_2' | 'BULLISH_COMBO_3' | 'BULLISH_COMBO_ALL' | 'BULLISH_COMBO_ANY' | 'ALL') => void;
  activeFilter?: string;
}

export const BullishFilterSection: React.FC<BullishFilterSectionProps> = ({
  stocks,
  onSelectStockDetail,
  onOpenPositionSizer,
  onSelectFilter,
  activeFilter = 'ALL'
}) => {
  // Master & Section Collapsible States
  const [isScreenerExpanded, setIsScreenerExpanded] = useState<boolean>(true);
  const [isStrategyCardsExpanded, setIsStrategyCardsExpanded] = useState<boolean>(true);
  const [isFilterToolbarExpanded, setIsFilterToolbarExpanded] = useState<boolean>(true);
  const [isStockListExpanded, setIsStockListExpanded] = useState<boolean>(true);

  // Filter & Search states
  const [selectedComboFilter, setSelectedComboFilter] = useState<'ALL' | 'COMBO_1' | 'COMBO_2' | 'COMBO_3' | 'ALL_THREE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedStockIds, setExpandedStockIds] = useState<Set<string>>(new Set());
  const [timeSortOrder, setTimeSortOrder] = useState<'EARLIEST' | 'LATEST' | 'DEFAULT'>('EARLIEST');

  // Compute analyses for all stocks
  const analyzedStocks = useMemo(() => {
    return stocks.map((s) => ({
      stock: s,
      analysis: analyzeBullishCombinations(s)
    }));
  }, [stocks]);

  // Counts
  const counts = useMemo(() => {
    let combo1Count = 0;
    let combo2Count = 0;
    let combo3Count = 0;
    let triplePowerCount = 0;
    let anyCount = 0;

    analyzedStocks.forEach(({ analysis }) => {
      if (analysis.combo1.isMatch) combo1Count++;
      if (analysis.combo2.isMatch) combo2Count++;
      if (analysis.combo3.isMatch) combo3Count++;
      if (analysis.isAllCombosMet) triplePowerCount++;
      if (analysis.isAnyComboMet) anyCount++;
    });

    return { combo1Count, combo2Count, combo3Count, triplePowerCount, anyCount };
  }, [analyzedStocks]);

  // Filtered and Sorted list
  const filteredList = useMemo(() => {
    const list = analyzedStocks.filter(({ stock, analysis }) => {
      // Search text
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSymbol = stock.symbol.toLowerCase().includes(q);
        const matchesName = stock.companyName.toLowerCase().includes(q);
        if (!matchesSymbol && !matchesName) return false;
      }

      if (selectedComboFilter === 'COMBO_1') return analysis.combo1.isMatch;
      if (selectedComboFilter === 'COMBO_2') return analysis.combo2.isMatch;
      if (selectedComboFilter === 'COMBO_3') return analysis.combo3.isMatch;
      if (selectedComboFilter === 'ALL_THREE') return analysis.isAllCombosMet;
      
      // Default 'ALL': show stocks that match at least 1 combination
      return analysis.isAnyComboMet;
    });

    if (timeSortOrder !== 'DEFAULT') {
      list.sort((a, b) => {
        let timeA = '09:15 AM';
        let timeB = '09:15 AM';

        if (selectedComboFilter === 'COMBO_1') {
          timeA = a.analysis.combo1.firstHitTime || '11:59 PM';
          timeB = b.analysis.combo1.firstHitTime || '11:59 PM';
        } else if (selectedComboFilter === 'COMBO_2') {
          timeA = a.analysis.combo2.firstHitTime || '11:59 PM';
          timeB = b.analysis.combo2.firstHitTime || '11:59 PM';
        } else if (selectedComboFilter === 'COMBO_3') {
          timeA = a.analysis.combo3.firstHitTime || '11:59 PM';
          timeB = b.analysis.combo3.firstHitTime || '11:59 PM';
        } else if (selectedComboFilter === 'ALL_THREE') {
          timeA = a.analysis.firstTripleHitTime || '11:59 PM';
          timeB = b.analysis.firstTripleHitTime || '11:59 PM';
        } else {
          timeA = a.analysis.firstAnyHitTime || '11:59 PM';
          timeB = b.analysis.firstAnyHitTime || '11:59 PM';
        }

        if (timeSortOrder === 'EARLIEST') {
          return timeA.localeCompare(timeB);
        } else {
          return timeB.localeCompare(timeA);
        }
      });
    }

    return list;
  }, [analyzedStocks, selectedComboFilter, searchQuery, timeSortOrder]);

  // Toggle single stock detail
  const toggleStockDetail = (id: string) => {
    setExpandedStockIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Toggle all stock details at once
  const areAllDetailsExpanded = filteredList.length > 0 && filteredList.every(({ stock }) => expandedStockIds.has(stock.id));

  const toggleAllDetails = () => {
    if (areAllDetailsExpanded) {
      setExpandedStockIds(new Set());
    } else {
      const allIds = new Set(filteredList.map(({ stock }) => stock.id));
      setExpandedStockIds(allIds);
    }
  };

  // Global toggle for all sections
  const areAllSectionsExpanded = isStrategyCardsExpanded && isFilterToolbarExpanded && isStockListExpanded;

  const toggleAllSections = () => {
    if (areAllSectionsExpanded) {
      setIsStrategyCardsExpanded(false);
      setIsFilterToolbarExpanded(false);
      setIsStockListExpanded(false);
    } else {
      setIsStrategyCardsExpanded(true);
      setIsFilterToolbarExpanded(true);
      setIsStockListExpanded(true);
    }
  };

  return (
    <div className="bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl text-slate-100 my-6 transition-all">
      
      {/* 1. MASTER HEADER & SCREENER COLLAPSE BAR */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${isScreenerExpanded ? 'pb-5 border-b border-slate-800' : ''}`}>
        <div className="flex items-start sm:items-center gap-3">
          <button 
            onClick={() => setIsScreenerExpanded(!isScreenerExpanded)}
            className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all shrink-0 cursor-pointer shadow-inner"
            title={isScreenerExpanded ? "Contract/Collapse Entire Screener" : "Expand Entire Screener"}
          >
            {isScreenerExpanded ? <Minimize2 className="w-5 h-5 text-emerald-300" /> : <Maximize2 className="w-5 h-5 text-emerald-300 animate-pulse" />}
          </button>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-emerald-400 fill-current animate-pulse" />
                Technical Momentum Screener
              </span>
              <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-emerald-950/90 text-emerald-300 border border-emerald-700/80 shadow-2xs">
                {counts.anyCount} Qualified Stocks
              </span>
              {counts.triplePowerCount > 0 && (
                <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-amber-950/90 text-amber-300 border border-amber-600/80 shadow-2xs flex items-center gap-1 animate-pulse">
                  <Flame className="w-3 h-3 text-amber-400 fill-current" />
                  {counts.triplePowerCount} Triple Power
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2 mt-1">
              <span>Bullish Combinations Screener</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
              Multi-indicator trend alignment using 9/20/50 EMAs, RSI 55–70 momentum breakouts, and MACD bullish crossovers.
            </p>
          </div>
        </div>

        {/* Master Action & Collapse Controls */}
        <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
          {/* Quick Filter Selectors in Header */}
          <button
            onClick={() => {
              setSelectedComboFilter('ALL');
              if (onSelectFilter) onSelectFilter('BULLISH_COMBO_ANY');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
              selectedComboFilter === 'ALL'
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20 font-black'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>All ({counts.anyCount})</span>
          </button>

          <button
            onClick={() => {
              setSelectedComboFilter('ALL_THREE');
              if (onSelectFilter) onSelectFilter('BULLISH_COMBO_ALL');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
              selectedComboFilter === 'ALL_THREE'
                ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md shadow-amber-400/20 font-black'
                : 'bg-amber-950/40 text-amber-300 border-amber-800/60 hover:bg-amber-900/50'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400 fill-current" />
            <span>Triple ({counts.triplePowerCount})</span>
          </button>

          {/* Master Expand/Collapse All Sections Button */}
          {isScreenerExpanded && (
            <button
              onClick={toggleAllSections}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center gap-1.5"
              title={areAllSectionsExpanded ? "Collapse all sub-sections inside screener" : "Expand all sub-sections inside screener"}
            >
              <ChevronsUpDown className="w-3.5 h-3.5 text-indigo-400" />
              <span>{areAllSectionsExpanded ? 'Collapse All' : 'Expand All'}</span>
            </button>
          )}

          {/* Master Hide/Show Screener Toggle Button */}
          <button
            onClick={() => setIsScreenerExpanded(!isScreenerExpanded)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border shadow-sm ${
              isScreenerExpanded 
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' 
                : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 font-extrabold shadow-emerald-500/20'
            }`}
          >
            <span>{isScreenerExpanded ? 'Hide Screener' : 'Expand Screener'}</span>
            {isScreenerExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4 animate-bounce" />}
          </button>
        </div>
      </div>

      {/* 2. INNER SCREENER SECTIONS (WHEN SCREENER IS EXPANDED) */}
      {isScreenerExpanded && (
        <div className="space-y-5 mt-5">
          
          {/* SECTION A: 3 COMBINATION STRATEGY RULES CARDS */}
          <div className="space-y-3">
            {/* Section A Header */}
            <div className="flex items-center justify-between bg-slate-950/60 px-3.5 py-2 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  Strategy Combinations &amp; Technical Rules
                </span>
                <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  3 Presets
                </span>
              </div>

              <button
                onClick={() => setIsStrategyCardsExpanded(!isStrategyCardsExpanded)}
                className="text-xs font-bold text-slate-300 hover:text-white px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>{isStrategyCardsExpanded ? 'Hide Strategy Rules' : 'Show Strategy Rules'}</span>
                {isStrategyCardsExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Section A Content */}
            {isStrategyCardsExpanded ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Combination 1 */}
                <div 
                  onClick={() => {
                    setSelectedComboFilter('COMBO_1');
                    if (onSelectFilter) onSelectFilter('BULLISH_COMBO_1');
                  }}
                  className={`cursor-pointer transition-all rounded-2xl p-4 border relative overflow-hidden group ${
                    selectedComboFilter === 'COMBO_1'
                      ? 'bg-emerald-950/60 border-emerald-500 ring-2 ring-emerald-500/30 shadow-xl'
                      : 'bg-slate-800/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/70'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-[11px] font-extrabold uppercase text-emerald-400 tracking-wider bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/80">
                      Combination 1
                    </span>
                    <span className="text-xs font-black px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {counts.combo1Count} Stocks
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white mb-2 group-hover:text-emerald-300 transition-colors flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    Triple EMA Stack &amp; Pullback
                  </h3>

                  <ul className="space-y-1.5 text-xs text-slate-300">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="font-semibold text-slate-100">9 EMA &gt; 20 EMA &gt; 50 EMA</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>Price above all three EMAs</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>EMAs rising sloped upward</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>Pullback respects 9/20 EMA support</span>
                    </li>
                  </ul>

                  <div className="mt-3 pt-2.5 border-t border-slate-700/50 flex items-center justify-between text-[11px] text-emerald-400 font-semibold">
                    <span>Filter by Combo 1</span>
                    <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                </div>

                {/* Combination 2 */}
                <div 
                  onClick={() => {
                    setSelectedComboFilter('COMBO_2');
                    if (onSelectFilter) onSelectFilter('BULLISH_COMBO_2');
                  }}
                  className={`cursor-pointer transition-all rounded-2xl p-4 border relative overflow-hidden group ${
                    selectedComboFilter === 'COMBO_2'
                      ? 'bg-blue-950/60 border-blue-500 ring-2 ring-blue-500/30 shadow-xl'
                      : 'bg-slate-800/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/70'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-[11px] font-extrabold uppercase text-blue-400 tracking-wider bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800/80">
                      Combination 2
                    </span>
                    <span className="text-xs font-black px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {counts.combo2Count} Stocks
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white mb-2 group-hover:text-blue-300 transition-colors flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-blue-400" />
                    RSI 55–70 Higher Highs
                  </h3>

                  <ul className="space-y-1.5 text-xs text-slate-300">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                      <span className="font-semibold text-slate-100">RSI preferably 55–70</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                      <span>Price making higher highs</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                      <span>RSI also making higher highs</span>
                    </li>
                    <li className="flex items-center gap-2 text-slate-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400/60" />
                      <span>Bullish momentum confirmation</span>
                    </li>
                  </ul>

                  <div className="mt-3 pt-2.5 border-t border-slate-700/50 flex items-center justify-between text-[11px] text-blue-400 font-semibold">
                    <span>Filter by Combo 2</span>
                    <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                </div>

                {/* Combination 3 */}
                <div 
                  onClick={() => {
                    setSelectedComboFilter('COMBO_3');
                    if (onSelectFilter) onSelectFilter('BULLISH_COMBO_3');
                  }}
                  className={`cursor-pointer transition-all rounded-2xl p-4 border relative overflow-hidden group ${
                    selectedComboFilter === 'COMBO_3'
                      ? 'bg-purple-950/60 border-purple-500 ring-2 ring-purple-500/30 shadow-xl'
                      : 'bg-slate-800/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/70'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-[11px] font-extrabold uppercase text-purple-400 tracking-wider bg-purple-950/80 px-2 py-0.5 rounded border border-purple-800/80">
                      Combination 3
                    </span>
                    <span className="text-xs font-black px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {counts.combo3Count} Stocks
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white mb-2 group-hover:text-purple-300 transition-colors flex items-center gap-1.5">
                    <BarChart2 className="w-4 h-4 text-purple-400" />
                    MACD Crossover &amp; Zero Line
                  </h3>

                  <ul className="space-y-1.5 text-xs text-slate-300">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                      <span className="font-semibold text-slate-100">MACD bullish crossover</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                      <span>MACD above zero line</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                      <span>Histogram increasing</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                      <span>Price above major MAs (20/50 EMA)</span>
                    </li>
                  </ul>

                  <div className="mt-3 pt-2.5 border-t border-slate-700/50 flex items-center justify-between text-[11px] text-purple-400 font-semibold">
                    <span>Filter by Combo 3</span>
                    <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            ) : (
              /* Compact Strategy Summary Chip when Collapsed */
              <div 
                onClick={() => setIsStrategyCardsExpanded(true)}
                className="bg-slate-950/40 hover:bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80 cursor-pointer flex flex-wrap items-center justify-between gap-2 text-xs transition-colors"
              >
                <div className="flex items-center gap-3 flex-wrap text-slate-300">
                  <span className="font-semibold text-slate-400">Collapsed Rules:</span>
                  <span className="bg-emerald-950/60 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800/50 text-[11px]">
                    Combo 1: 9/20/50 EMA Stack ({counts.combo1Count})
                  </span>
                  <span className="bg-blue-950/60 text-blue-300 px-2 py-0.5 rounded border border-blue-800/50 text-[11px]">
                    Combo 2: RSI 55-70 HH ({counts.combo2Count})
                  </span>
                  <span className="bg-purple-950/60 text-purple-300 px-2 py-0.5 rounded border border-purple-800/50 text-[11px]">
                    Combo 3: MACD Crossover ({counts.combo3Count})
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 font-bold">
                  Click to Expand Strategy Cards <ChevronDown className="w-3 h-3" />
                </span>
              </div>
            )}
          </div>

          {/* SECTION B: VIEW MODE, TIME SORT & SEARCH TOOLBAR */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1 whitespace-nowrap mr-1">
                  <Filter className="w-3.5 h-3.5 text-emerald-400" /> Mode:
                </span>
                
                <button
                  onClick={() => setSelectedComboFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    selectedComboFilter === 'ALL'
                      ? 'bg-slate-800 text-white border border-slate-700 shadow-2xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All ({counts.anyCount})
                </button>
                
                <button
                  onClick={() => setSelectedComboFilter('COMBO_1')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    selectedComboFilter === 'COMBO_1'
                      ? 'bg-emerald-600 text-white shadow-2xs font-black'
                      : 'text-emerald-400 hover:bg-emerald-950/50'
                  }`}
                >
                  Combo 1 ({counts.combo1Count})
                </button>
                
                <button
                  onClick={() => setSelectedComboFilter('COMBO_2')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    selectedComboFilter === 'COMBO_2'
                      ? 'bg-blue-600 text-white shadow-2xs font-black'
                      : 'text-blue-400 hover:bg-blue-950/50'
                  }`}
                >
                  Combo 2 ({counts.combo2Count})
                </button>
                
                <button
                  onClick={() => setSelectedComboFilter('COMBO_3')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    selectedComboFilter === 'COMBO_3'
                      ? 'bg-purple-600 text-white shadow-2xs font-black'
                      : 'text-purple-400 hover:bg-purple-950/50'
                  }`}
                >
                  Combo 3 ({counts.combo3Count})
                </button>
                
                <button
                  onClick={() => setSelectedComboFilter('ALL_THREE')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    selectedComboFilter === 'ALL_THREE'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-2xs'
                      : 'text-amber-400 hover:bg-amber-950/50'
                  }`}
                >
                  🔥 All 3 ({counts.triplePowerCount})
                </button>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {/* Time Sort Toggle */}
                <button
                  onClick={() => {
                    if (timeSortOrder === 'EARLIEST') setTimeSortOrder('LATEST');
                    else if (timeSortOrder === 'LATEST') setTimeSortOrder('DEFAULT');
                    else setTimeSortOrder('EARLIEST');
                  }}
                  className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Sort by exact signal first hit time"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Time:</span>
                  <span className="text-amber-300 font-mono">
                    {timeSortOrder === 'EARLIEST' ? 'Earliest ⬆' : timeSortOrder === 'LATEST' ? 'Latest ⬇' : 'Default'}
                  </span>
                </button>

                <input
                  type="text"
                  placeholder="Search symbol..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-44 bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* SECTION C: QUALIFIED STOCKS RESULTS LIST */}
          <div className="space-y-3">
            {/* Section C Header Bar */}
            <div className="flex items-center justify-between bg-slate-950/60 px-3.5 py-2 rounded-xl border border-slate-800 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-emerald-400" />
                  Qualified Stocks Results
                </span>
                <span className="text-xs font-mono font-bold bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-800">
                  {filteredList.length} Matching
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Expand / Collapse All Stock Detail Breakdown */}
                {isStockListExpanded && filteredList.length > 0 && (
                  <button
                    onClick={toggleAllDetails}
                    className="text-xs font-bold text-slate-300 hover:text-white px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center gap-1 transition-colors cursor-pointer"
                    title="Toggle all detailed rule metric accordions"
                  >
                    <SlidersHorizontal className="w-3 h-3 text-indigo-400" />
                    <span>{areAllDetailsExpanded ? 'Collapse All Details' : 'Expand All Details'}</span>
                  </button>
                )}

                {/* Expand / Collapse Stock List Container */}
                <button
                  onClick={() => setIsStockListExpanded(!isStockListExpanded)}
                  className="text-xs font-bold text-slate-300 hover:text-white px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>{isStockListExpanded ? 'Hide Stock List' : 'Show Stock List'}</span>
                  {isStockListExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Section C Content: Stock Cards or Collapsed State */}
            {isStockListExpanded ? (
              filteredList.length === 0 ? (
                <div className="bg-slate-950/60 rounded-2xl border border-slate-800 p-8 text-center text-slate-400">
                  <Zap className="w-8 h-8 text-slate-600 mx-auto mb-2 animate-bounce" />
                  <p className="text-sm font-semibold">No stocks currently match the selected Bullish Combination filter.</p>
                  <p className="text-xs text-slate-500 mt-1">Try switching to "All" or fetch fresh 15-minute market candle data.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredList.map(({ stock, analysis }) => {
                    const isExpanded = expandedStockIds.has(stock.id);
                    const close = stock.closePrice || 0;
                    const pct = stock.pctChange || 0;

                    const displayTime = analysis.isAllCombosMet 
                      ? analysis.firstTripleHitTime 
                      : analysis.firstAnyHitTime;

                    return (
                      <div 
                        key={stock.id}
                        className="bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition-all shadow-md"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          {/* Symbol & Info */}
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center font-black text-xs text-emerald-400 shadow-inner shrink-0">
                              {stock.symbol.slice(0, 3)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-black text-base text-white tracking-wide">{stock.symbol}</span>
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${analysis.badgeClass}`}>
                                  {analysis.summaryBadge}
                                </span>
                                {analysis.isAllCombosMet && (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 text-[10px] font-extrabold border border-amber-400/30 flex items-center gap-1">
                                    <Flame className="w-3 h-3 text-amber-400 fill-current" /> TRIPLE
                                  </span>
                                )}
                                {/* Prominent Signal First Hit Time Pill */}
                                {displayTime && (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-amber-400" />
                                    Signal Hit @ {displayTime}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5 flex-wrap">
                                <span>{stock.companyName}</span>
                                <span>&bull;</span>
                                <span className="font-mono">LTP: ₹{close.toFixed(2)}</span>
                                <span className={`font-bold ${pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  ({pct >= 0 ? '+' : ''}{pct.toFixed(2)}%)
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Combination Indicator Badges & Quick Action Buttons */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Combo 1 Badge */}
                            <div className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 border ${
                              analysis.combo1.isMatch 
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-700/80 shadow-2xs' 
                                : 'bg-slate-900 text-slate-500 border-slate-800'
                            }`}>
                              {analysis.combo1.isMatch ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 fill-current" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 text-slate-600" />
                              )}
                              <span>Combo 1</span>
                              {analysis.combo1.isMatch && analysis.combo1.firstHitTime && (
                                <span className="ml-1 text-[10px] font-black bg-emerald-900/80 text-emerald-200 px-1.5 py-0.2 rounded border border-emerald-700">
                                  {analysis.combo1.firstHitTime}
                                </span>
                              )}
                            </div>

                            {/* Combo 2 Badge */}
                            <div className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 border ${
                              analysis.combo2.isMatch 
                                ? 'bg-blue-950 text-blue-300 border-blue-700/80 shadow-2xs' 
                                : 'bg-slate-900 text-slate-500 border-slate-800'
                            }`}>
                              {analysis.combo2.isMatch ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 fill-current" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 text-slate-600" />
                              )}
                              <span>Combo 2</span>
                              {analysis.combo2.isMatch && analysis.combo2.firstHitTime && (
                                <span className="ml-1 text-[10px] font-black bg-blue-900/80 text-blue-200 px-1.5 py-0.2 rounded border border-blue-700">
                                  {analysis.combo2.firstHitTime}
                                </span>
                              )}
                            </div>

                            {/* Combo 3 Badge */}
                            <div className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 border ${
                              analysis.combo3.isMatch 
                                ? 'bg-purple-950 text-purple-300 border-purple-700/80 shadow-2xs' 
                                : 'bg-slate-900 text-slate-500 border-slate-800'
                            }`}>
                              {analysis.combo3.isMatch ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 fill-current" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 text-slate-600" />
                              )}
                              <span>Combo 3</span>
                              {analysis.combo3.isMatch && analysis.combo3.firstHitTime && (
                                <span className="ml-1 text-[10px] font-black bg-purple-900/80 text-purple-200 px-1.5 py-0.2 rounded border border-purple-700">
                                  {analysis.combo3.firstHitTime}
                                </span>
                              )}
                            </div>

                            {/* Quick Action: Position Sizer */}
                            {onOpenPositionSizer && (
                              <button
                                onClick={() => onOpenPositionSizer(stock)}
                                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
                                title="Open Position Sizer"
                              >
                                <Calculator className="w-4 h-4" />
                              </button>
                            )}

                            {/* Quick Action: Stock Detail Modal */}
                            {onSelectStockDetail && (
                              <button
                                onClick={() => onSelectStockDetail(stock)}
                                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
                                title="Open Stock Detail Modal"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </button>
                            )}

                            {/* Toggle Detailed Rules Accordion */}
                            <button
                              onClick={() => toggleStockDetail(stock.id)}
                              className={`px-2 py-1 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1 ${
                                isExpanded 
                                  ? 'bg-slate-800 text-white border-slate-700 shadow-inner' 
                                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border-slate-800'
                              }`}
                              title="Toggle Detailed Combination Rules Breakdown"
                            >
                              <span>{isExpanded ? 'Hide' : 'Details'}</span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        {/* SECTION D: INDIVIDUAL STOCK CARD DETAILED EXPANDED ACCORDION */}
                        {isExpanded && (
                          <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-slate-900/60 p-3 rounded-xl">
                            {/* Combo 1 Breakdown */}
                            <div className="space-y-1 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                              <div className="font-bold text-emerald-400 flex items-center justify-between">
                                <span className="flex items-center gap-1">
                                  <Layers className="w-3.5 h-3.5" /> Combo 1 Details:
                                </span>
                                {analysis.combo1.firstHitTime && (
                                  <span className="text-[10px] text-emerald-300 font-mono bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800">
                                    ⏱️ {analysis.combo1.firstHitTime}
                                  </span>
                                )}
                              </div>
                              <div className="text-slate-300 space-y-0.5 font-mono text-[11px]">
                                <div>9 EMA: ₹{analysis.combo1.ema9.toFixed(1)}</div>
                                <div>20 EMA: ₹{analysis.combo1.ema20.toFixed(1)}</div>
                                <div>50 EMA: ₹{analysis.combo1.ema50.toFixed(1)}</div>
                                <div className="text-slate-400 mt-1">{analysis.combo1.details}</div>
                              </div>
                            </div>

                            {/* Combo 2 Breakdown */}
                            <div className="space-y-1 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                              <div className="font-bold text-blue-400 flex items-center justify-between">
                                <span className="flex items-center gap-1">
                                  <Activity className="w-3.5 h-3.5" /> Combo 2 Details:
                                </span>
                                {analysis.combo2.firstHitTime && (
                                  <span className="text-[10px] text-blue-300 font-mono bg-blue-950 px-1.5 py-0.5 rounded border border-blue-800">
                                    ⏱️ {analysis.combo2.firstHitTime}
                                  </span>
                                )}
                              </div>
                              <div className="text-slate-300 space-y-0.5 font-mono text-[11px]">
                                <div>Current RSI: {analysis.combo2.rsi.toFixed(1)}</div>
                                <div>RSI 55-70 Zone: {analysis.combo2.isRsiInZone ? 'YES' : 'NO'}</div>
                                <div>Price HH: {analysis.combo2.isPriceHigherHighs ? 'YES' : 'NO'}</div>
                                <div>RSI HH: {analysis.combo2.isRsiHigherHighs ? 'YES' : 'NO'}</div>
                              </div>
                            </div>

                            {/* Combo 3 Breakdown */}
                            <div className="space-y-1 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                              <div className="font-bold text-purple-400 flex items-center justify-between">
                                <span className="flex items-center gap-1">
                                  <BarChart2 className="w-3.5 h-3.5" /> Combo 3 Details:
                                </span>
                                {analysis.combo3.firstHitTime && (
                                  <span className="text-[10px] text-purple-300 font-mono bg-purple-950 px-1.5 py-0.5 rounded border border-purple-800">
                                    ⏱️ {analysis.combo3.firstHitTime}
                                  </span>
                                )}
                              </div>
                              <div className="text-slate-300 space-y-0.5 font-mono text-[11px]">
                                <div>MACD: {analysis.combo3.macd.toFixed(2)}</div>
                                <div>Signal: {analysis.combo3.signal.toFixed(2)}</div>
                                <div>Histogram: {analysis.combo3.histogram.toFixed(2)}</div>
                                <div>Above Zero: {analysis.combo3.isAboveZero ? 'YES' : 'NO'}</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              /* Compact summary banner when list is contracted */
              <div 
                onClick={() => setIsStockListExpanded(true)}
                className="bg-slate-950/40 hover:bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 cursor-pointer flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-emerald-400" />
                  <span>Stock results list is currently collapsed ({filteredList.length} matching stocks hidden to save space).</span>
                </div>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  Expand Results List <ChevronDown className="w-3.5 h-3.5" />
                </span>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};
