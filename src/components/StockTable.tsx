import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, ExternalLink, RefreshCw, Eye, Edit3, TrendingUp, TrendingDown, Check, ArrowUpDown, ChevronLeft, ChevronRight, Layers, ShieldCheck, Target, ArrowUpRight, ArrowDownRight, Calculator, Percent, Pin, Sparkles, Zap, Flame, AlertTriangle, SlidersHorizontal, CheckSquare, Square, RotateCcw, ChevronUp, ChevronDown } from 'lucide-react';
import { StockCalculated, DhanApiCredentials, TrendFilterType, FadedStockRecord } from '../types';
import { calculateGann15Min, getAtmOptionStrikes, calculateFibonacci382, isOpenLowPattern, isOpenHighPattern, isHighClosePattern, isAboveFirst15mCandle, isBelowFirst15mCandle, isGannCalcLessThan3, isOpenCalcLessThan3, isCloseCalcLessThan3, isBothCalcLessThan3, isOpenCalc2DecLesserThanClose, isOpenCalc2DecGreaterThanClose, isOpenCalcLessThan3AndCloseGreaterThan10, isOpenCalcGreaterThan10AndCloseLessThan3 } from '../utils/gann';
import { detect15mHighPullbackBounce } from '../utils/rsiPullback';
import { analyzeBullishCombinations } from '../utils/bullishCombinations';

export interface RecipeOption15m {
  id: string;
  label: string;
  category: '15m Candlestick & Price Patterns' | 'Gann & Range Calculations' | 'Trend & Market Sentiment' | 'VWAP & Pullback Indicators';
  description: string;
}

export interface PresetRecipe15m {
  id: string;
  name: string;
  description: string;
  optionKeys: string[];
  badge: string;
}

export const RECIPE_OPTIONS_15M: RecipeOption15m[] = [
  // 15m Candlestick & Price Patterns
  { id: 'OPEN_LOW', label: '🟢 Open = Low Pattern', category: '15m Candlestick & Price Patterns', description: 'Price opened at low of first 15m candle' },
  { id: 'OPEN_HIGH', label: '🔴 Open = High Pattern', category: '15m Candlestick & Price Patterns', description: 'Price opened at high of first 15m candle' },
  { id: 'HIGH_CLOSE', label: '🏆 High = Close Pattern', category: '15m Candlestick & Price Patterns', description: 'Closing/CMP near high of 15m candle' },
  { id: 'ABOVE_15M_HIGH', label: '🚀 Above First 15m High', category: '15m Candlestick & Price Patterns', description: 'LTP breached above initial 15-min high' },
  { id: 'BELOW_15M_LOW', label: '📉 Below First 15m Low', category: '15m Candlestick & Price Patterns', description: 'LTP breached below initial 15-min low' },
  { id: 'FIB_382', label: '🌀 Fibonacci 38.2% Retrace', category: '15m Candlestick & Price Patterns', description: 'Price retraced to Fib 38.2% support/resistance' },

  // Gann & Range Calculations
  { id: 'GANN_CALC_LESS_3', label: '⚡ Gann Calc < 3% Range', category: 'Gann & Range Calculations', description: 'Gann volatility calculation range under 3%' },
  { id: 'BOTH_CALC_LESS_3', label: '🎯 Open & Close Calc < 3%', category: 'Gann & Range Calculations', description: 'Both Open and Close Calc <= 3%' },
  { id: 'OPEN_CALC_LESS_3', label: '📊 Open Calc < 3%', category: 'Gann & Range Calculations', description: 'Open Price Calc <= 3%' },
  { id: 'CLOSE_CALC_LESS_3', label: '📈 Close Calc < 3%', category: 'Gann & Range Calculations', description: 'Close Price Calc <= 3%' },
  { id: 'OPEN_2DEC_LESS_CLOSE', label: '📉 Open 1st 2-Dec < Close 1st 2-Dec', category: 'Gann & Range Calculations', description: 'Gann Open Calc first two decimals < Close Calc first two decimals' },
  { id: 'OPEN_2DEC_GREATER_CLOSE', label: '📈 Open 1st 2-Dec > Close 1st 2-Dec', category: 'Gann & Range Calculations', description: 'Gann Open Calc first two decimals > Close Calc first two decimals' },
  { id: 'OPEN_LESS_3_CLOSE_GREATER_10', label: '⚡ Open Calc < 3 & Close Calc > 10', category: 'Gann & Range Calculations', description: 'Gann Open Calc < 3 AND Gann Close Calc > 10' },
  { id: 'OPEN_GREATER_10_CLOSE_LESS_3', label: '⚡ Open Calc > 10 & Close Calc < 3', category: 'Gann & Range Calculations', description: 'Gann Open Calc > 10 AND Gann Close Calc < 3' },

  // Trend & Market Sentiment
  { id: 'BULLISH_COMBO_1', label: '🔥 Combo 1: 9/20/50 EMA Stack', category: 'Trend & Market Sentiment', description: '9 EMA > 20 EMA > 50 EMA, Price above all, EMAs rising & Pullback respects 9/20 EMA' },
  { id: 'BULLISH_COMBO_2', label: '🚀 Combo 2: RSI 55-70 Higher Highs', category: 'Trend & Market Sentiment', description: 'RSI 55–70, Price higher highs & RSI higher highs' },
  { id: 'BULLISH_COMBO_3', label: '⚡ Combo 3: MACD Crossover & Zero Line', category: 'Trend & Market Sentiment', description: 'MACD bullish crossover, MACD > 0, Histogram increasing & Price > 20/50 EMA' },
  { id: 'BULLISH_COMBO_ALL', label: '🏆 Triple Bullish Power (All 3 Met)', category: 'Trend & Market Sentiment', description: 'Stock satisfies Combination 1, Combination 2, AND Combination 3 concurrently' },
  { id: 'VERY_BULLISH', label: '🚀 Very Bullish Trend', category: 'Trend & Market Sentiment', description: 'Strong bullish trend momentum' },
  { id: 'BULLISH', label: '📈 Bullish / Very Bullish', category: 'Trend & Market Sentiment', description: 'Overall positive trend directional bias' },
  { id: 'VERY_BEARISH', label: '💥 Very Bearish Trend', category: 'Trend & Market Sentiment', description: 'Strong bearish breakdown trend' },
  { id: 'BEARISH', label: '📉 Bearish / Very Bearish', category: 'Trend & Market Sentiment', description: 'Overall negative trend directional bias' },
  { id: 'POSITIVE_DAY', label: '💚 Positive Day Change (>0%)', category: 'Trend & Market Sentiment', description: 'Stock gainers in green territory' },

  // VWAP & Pullback Indicators
  { id: 'VWAP_ABOVE', label: '📊 Price Above VWAP', category: 'VWAP & Pullback Indicators', description: 'LTP trading above Volume Weighted Avg Price' },
  { id: 'VWAP_BELOW', label: '📉 Price Below VWAP', category: 'VWAP & Pullback Indicators', description: 'LTP trading below Volume Weighted Avg Price' },
  { id: 'PULLBACK_15M_BOUNCE', label: '⏳ 15m Pullback Bounce', category: 'VWAP & Pullback Indicators', description: 'Bouncing off 15m EMA / VWAP support' },
  { id: 'CALCULATED_DATA', label: '✅ Dhan 15m Data Fetched', category: 'VWAP & Pullback Indicators', description: '15-minute live candles active' },
];

export const PRESET_RECIPES_15M: PresetRecipe15m[] = [
  {
    id: 'ULTRA_15M_BULL',
    name: '⚡ Ultra 15m Bullish Breakout',
    description: 'Open = Low + Very Bullish + Above 15m High',
    optionKeys: ['OPEN_LOW', 'VERY_BULLISH', 'ABOVE_15M_HIGH'],
    badge: 'Strong Momentum'
  },
  {
    id: 'GANN_TIGHT_RALLY',
    name: '🎯 Tight Gann Calc Rally',
    description: 'Gann Calc < 3% + High=Close + Positive Day',
    optionKeys: ['GANN_CALC_LESS_3', 'HIGH_CLOSE', 'POSITIVE_DAY'],
    badge: 'Low Risk Entry'
  },
  {
    id: 'VWAP_PULLBACK_BOUNCE',
    name: '🍯 VWAP 15m Pullback',
    description: '15m Pullback Bounce + Above VWAP + Bullish',
    optionKeys: ['PULLBACK_15M_BOUNCE', 'VWAP_ABOVE', 'BULLISH'],
    badge: 'Prime Entry'
  },
  {
    id: 'FIB_RETRACE_RALLY',
    name: '🌀 Fib 38.2% Support Bounce',
    description: 'Fib 38.2% Retrace + Bullish + Above 15m High',
    optionKeys: ['FIB_382', 'BULLISH', 'ABOVE_15M_HIGH'],
    badge: 'Key Level'
  },
  {
    id: 'BEARISH_15M_BREAKDOWN',
    name: '💥 Open=High Bearish Breakdown',
    description: 'Open = High + Below 15m Low + Very Bearish',
    optionKeys: ['OPEN_HIGH', 'BELOW_15M_LOW', 'VERY_BEARISH'],
    badge: 'Shorting Signal'
  }
];

interface StockTableProps {
  stocks: StockCalculated[];
  faded100Log?: FadedStockRecord[];
  onUpdateStockPrices: (stockId: string, openPrice: number, closePrice: number, highPrice?: number | null, lowPrice?: number | null) => void;
  onFetchSingleStock: (stock: StockCalculated) => void;
  onSelectStockDetail: (stock: StockCalculated) => void;
  onEditStockManual: (stock: StockCalculated) => void;
  onOpenPositionSizer?: (stock?: StockCalculated) => void;
  onOpenRsiAnalyst?: (stock: StockCalculated) => void;
  credentials: DhanApiCredentials;
  activeTrendFilter?: TrendFilterType;
  onTrendFilterChange?: (filter: TrendFilterType) => void;
}

export const StockTable: React.FC<StockTableProps> = ({
  stocks,
  faded100Log = [],
  onUpdateStockPrices,
  onFetchSingleStock,
  onSelectStockDetail,
  onEditStockManual,
  onOpenPositionSizer,
  onOpenRsiAnalyst,
  credentials,
  activeTrendFilter,
  onTrendFilterChange
}) => {

  const [searchTerm, setSearchTerm] = useState('');
  const [internalTrendFilter, setInternalTrendFilter] = useState<TrendFilterType>('ALL');
  
  const trendFilter = activeTrendFilter !== undefined ? activeTrendFilter : internalTrendFilter;

  const setTrendFilter = (filter: TrendFilterType) => {
    if (onTrendFilterChange) {
      onTrendFilterChange(filter);
    } else {
      setInternalTrendFilter(filter);
    }
  };

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // 🧪 Filter Recipe State for 15m Scanner
  const [selectedRecipeOptions, setSelectedRecipeOptions] = useState<string[]>([]);
  const [recipeMatchMode, setRecipeMatchMode] = useState<'ALL' | 'ANY'>('ALL');
  const [isRecipePanelOpen, setIsRecipePanelOpen] = useState<boolean>(false);

  // Automatically reset to Page 1 when filter, search, or recipe changes
  useEffect(() => {
    setCurrentPage(1);
  }, [trendFilter, searchTerm, selectedRecipeOptions, recipeMatchMode]);

  const [lotMonth, setLotMonth] = useState<'Jun' | 'Jul' | 'Aug'>('Jun');

  // Sticky / Pinned Stocks state (persisted in localStorage)
  const [pinnedStockIds, setPinnedStockIds] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('gann_pinned_stock_ids');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return new Set(parsed);
      } catch (e) {
        console.error('Failed to parse pinned stocks', e);
      }
    }
    return new Set<string>();
  });

  const togglePin = (stockId: string) => {
    setPinnedStockIds((prev) => {
      const next = new Set(prev);
      if (next.has(stockId)) {
        next.delete(stockId);
      } else {
        next.add(stockId);
      }
      const arr = Array.from(next);
      localStorage.setItem('gann_pinned_stock_ids', JSON.stringify(arr));
      fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinnedStockIds: arr })
      }).catch(() => {});
      return next;
    });
  };

  const clearAllPins = () => {
    setPinnedStockIds(new Set());
    localStorage.removeItem('gann_pinned_stock_ids');
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinnedStockIds: [] })
    }).catch(() => {});
  };

  // Pagination settings
  const itemsPerPage = 25;

  // Sorting
  const [sortField, setSortField] = useState<'symbol' | 'openCalc' | 'closeCalc' | 'companyName' | 'volume' | 'pctChange'>('symbol');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Helper check for O=L / O=H with strict exact match
  const isStockOpenEqualLow = (s: StockCalculated) => {
    if (s.openPrice !== undefined && s.openPrice !== null && s.openPrice > 0) {
      return isOpenLowPattern(s.openPrice, s.lowPrice, s.first15mLow);
    }
    return false;
  };

  const isStockOpenEqualHigh = (s: StockCalculated) => {
    if (s.openPrice !== undefined && s.openPrice !== null && s.openPrice > 0) {
      return isOpenHighPattern(s.openPrice, s.highPrice, s.first15mHigh);
    }
    return false;
  };

  const isStockHighEqualClose = (s: StockCalculated) => {
    const cmp = s.closePrice || s.openPrice;
    if (cmp !== undefined && cmp !== null && cmp > 0) {
      return isHighClosePattern(cmp, s.highPrice, s.first15mHigh, s.openPrice);
    }
    return false;
  };

  // Helper check for Fibonacci 38.2% Retracement
  const isStockFib382Retrace = (s: StockCalculated) => {
    if (s.isFib382Retrace) return true;
    const cmp = s.closePrice || s.openPrice || 0;
    const fibData = calculateFibonacci382(s.highPrice, s.lowPrice, cmp);
    return fibData?.isFib382Retraced ?? false;
  };

  // 🧪 Check condition for 15m Filter Recipe
  const checkRecipeCondition15m = React.useCallback((s: StockCalculated, key: string): boolean => {
    const cmp = s.closePrice || s.openPrice || 0;
    switch (key) {
      case 'OPEN_LOW':
        return isStockOpenEqualLow(s);
      case 'OPEN_HIGH':
        return isStockOpenEqualHigh(s);
      case 'HIGH_CLOSE':
        return isStockHighEqualClose(s);
      case 'ABOVE_15M_HIGH':
        return isAboveFirst15mCandle(s);
      case 'BELOW_15M_LOW':
        return isBelowFirst15mCandle(s);
      case 'FIB_382':
        return isStockFib382Retrace(s);
      case 'GANN_CALC_LESS_3':
        return isGannCalcLessThan3(s);
      case 'BOTH_CALC_LESS_3':
        return isBothCalcLessThan3(s);
      case 'OPEN_CALC_LESS_3':
        return isOpenCalcLessThan3(s);
      case 'CLOSE_CALC_LESS_3':
        return isCloseCalcLessThan3(s);
      case 'OPEN_2DEC_LESS_CLOSE':
        return isOpenCalc2DecLesserThanClose(s);
      case 'OPEN_2DEC_GREATER_CLOSE':
        return isOpenCalc2DecGreaterThanClose(s);
      case 'OPEN_LESS_3_CLOSE_GREATER_10':
        return isOpenCalcLessThan3AndCloseGreaterThan10(s);
      case 'OPEN_GREATER_10_CLOSE_LESS_3':
        return isOpenCalcGreaterThan10AndCloseLessThan3(s);
      case 'BULLISH_COMBO_1':
        return analyzeBullishCombinations(s).combo1.isMatch;
      case 'BULLISH_COMBO_2':
        return analyzeBullishCombinations(s).combo2.isMatch;
      case 'BULLISH_COMBO_3':
        return analyzeBullishCombinations(s).combo3.isMatch;
      case 'BULLISH_COMBO_ALL':
        return analyzeBullishCombinations(s).isAllCombosMet;
      case 'BULLISH_COMBO_ANY':
        return analyzeBullishCombinations(s).isAnyComboMet;
      case 'VERY_BULLISH':
        return s.trend === 'Very Bullish';
      case 'BULLISH':
        return s.trend === 'Bullish' || s.trend === 'Very Bullish';
      case 'VERY_BEARISH':
        return s.trend === 'Very Bearish';
      case 'BEARISH':
        return s.trend === 'Bearish' || s.trend === 'Very Bearish';
      case 'POSITIVE_DAY':
        return (s.pctChange || 0) > 0;
      case 'VWAP_ABOVE':
        return s.vwapStatus === 'Above' || (s.vwap ? cmp >= s.vwap : false);
      case 'VWAP_BELOW':
        return s.vwapStatus === 'Below' || (s.vwap ? cmp < s.vwap : false);
      case 'PULLBACK_15M_BOUNCE': {
        const bounce = detect15mHighPullbackBounce(s);
        return bounce.isPullbackBounce;
      }
      case 'CALCULATED_DATA':
        return s.isFetched || (s.openPrice !== undefined && s.openPrice !== null && s.openPrice > 0);
      default:
        return true;
    }
  }, []);

  const recipeOptionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    RECIPE_OPTIONS_15M.forEach((opt) => {
      counts[opt.id] = stocks.filter((s) => checkRecipeCondition15m(s, opt.id)).length;
    });
    return counts;
  }, [stocks, checkRecipeCondition15m]);

  const toggleRecipeOption = (optionId: string) => {
    setSelectedRecipeOptions((prev) =>
      prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId]
    );
  };

  const clearRecipe = () => {
    setSelectedRecipeOptions([]);
  };

  const applyPresetRecipe = (presetKeys: string[]) => {
    setSelectedRecipeOptions(presetKeys);
    setIsRecipePanelOpen(true);
  };

  // Count metrics
  const openLowCount = stocks.filter(isStockOpenEqualLow).length;
  const openHighCount = stocks.filter(isStockOpenEqualHigh).length;
  const highCloseCount = stocks.filter(isStockHighEqualClose).length;
  const fib382Count = stocks.filter(isStockFib382Retrace).length;
  const gannCalcLess3Count = stocks.filter(isGannCalcLessThan3).length;
  const bothCalcLess3Count = stocks.filter(isBothCalcLessThan3).length;
  const openCalcLess3Count = stocks.filter(isOpenCalcLessThan3).length;
  const closeCalcLess3Count = stocks.filter(isCloseCalcLessThan3).length;
  const open2DecLessCount = stocks.filter(isOpenCalc2DecLesserThanClose).length;
  const open2DecGreaterCount = stocks.filter(isOpenCalc2DecGreaterThanClose).length;
  const openLess3CloseGreater10Count = stocks.filter(isOpenCalcLessThan3AndCloseGreaterThan10).length;
  const openGreater10CloseLess3Count = stocks.filter(isOpenCalcGreaterThan10AndCloseLessThan3).length;
  const combo1Count = stocks.filter((s) => analyzeBullishCombinations(s).combo1.isMatch).length;
  const combo2Count = stocks.filter((s) => analyzeBullishCombinations(s).combo2.isMatch).length;
  const combo3Count = stocks.filter((s) => analyzeBullishCombinations(s).combo3.isMatch).length;
  const comboAllCount = stocks.filter((s) => analyzeBullishCombinations(s).isAllCombosMet).length;
  const comboAnyCount = stocks.filter((s) => analyzeBullishCombinations(s).isAnyComboMet).length;
  const veryBullishCount = stocks.filter((s) => s.trend === 'Very Bullish').length;
  const bullishCount = stocks.filter((s) => s.trend === 'Bullish' || s.trend === 'Very Bullish').length;
  const veryBearishCount = stocks.filter((s) => s.trend === 'Very Bearish').length;
  const bearishCount = stocks.filter((s) => s.trend === 'Bearish' || s.trend === 'Very Bearish').length;

  // Filter stocks
  const filteredStocks = stocks.filter((s) => {
    const matchesSearch =
      s.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.companyName.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (trendFilter === 'OPEN_LOW' && !isStockOpenEqualLow(s)) return false;
    if (trendFilter === 'OPEN_HIGH' && !isStockOpenEqualHigh(s)) return false;
    if (trendFilter === 'HIGH_CLOSE' && !isStockHighEqualClose(s)) return false;
    if (trendFilter === 'FIB_382_RETRACE' && !isStockFib382Retrace(s)) return false;
    if (trendFilter === 'GANN_CALC_LESS_3' && !isGannCalcLessThan3(s)) return false;
    if (trendFilter === 'BOTH_CALC_LESS_3' && !isBothCalcLessThan3(s)) return false;
    if (trendFilter === 'OPEN_CALC_LESS_3' && !isOpenCalcLessThan3(s)) return false;
    if (trendFilter === 'CLOSE_CALC_LESS_3' && !isCloseCalcLessThan3(s)) return false;
    if (trendFilter === 'OPEN_2DEC_LESS_CLOSE' && !isOpenCalc2DecLesserThanClose(s)) return false;
    if (trendFilter === 'OPEN_2DEC_GREATER_CLOSE' && !isOpenCalc2DecGreaterThanClose(s)) return false;
    if (trendFilter === 'OPEN_LESS_3_CLOSE_GREATER_10' && !isOpenCalcLessThan3AndCloseGreaterThan10(s)) return false;
    if (trendFilter === 'OPEN_GREATER_10_CLOSE_LESS_3' && !isOpenCalcGreaterThan10AndCloseLessThan3(s)) return false;
    if (trendFilter === 'BULLISH_COMBO_1' && !analyzeBullishCombinations(s).combo1.isMatch) return false;
    if (trendFilter === 'BULLISH_COMBO_2' && !analyzeBullishCombinations(s).combo2.isMatch) return false;
    if (trendFilter === 'BULLISH_COMBO_3' && !analyzeBullishCombinations(s).combo3.isMatch) return false;
    if (trendFilter === 'BULLISH_COMBO_ALL' && !analyzeBullishCombinations(s).isAllCombosMet) return false;
    if (trendFilter === 'BULLISH_COMBO_ANY' && !analyzeBullishCombinations(s).isAnyComboMet) return false;
    if (trendFilter === 'VERY_BULLISH' && s.trend !== 'Very Bullish') return false;
    if (trendFilter === 'BULLISH' && s.trend !== 'Bullish' && s.trend !== 'Very Bullish') return false;
    if (trendFilter === 'VERY_BEARISH' && s.trend !== 'Very Bearish') return false;
    if (trendFilter === 'BEARISH' && s.trend !== 'Bearish' && s.trend !== 'Very Bearish') return false;
    if (trendFilter === 'CALCULATED' && !(s.isFetched || (s.openPrice !== undefined && s.openPrice !== null && s.openPrice > 0))) return false;

    // 🧪 Filter Recipe multi-checkbox filtering
    if (selectedRecipeOptions.length > 0) {
      if (recipeMatchMode === 'ALL') {
        const matchesAll = selectedRecipeOptions.every((key) => checkRecipeCondition15m(s, key));
        if (!matchesAll) return false;
      } else {
        const matchesAny = selectedRecipeOptions.some((key) => checkRecipeCondition15m(s, key));
        if (!matchesAny) return false;
      }
    }

    return true;
  });

  // Sort stocks (pinned/checked stocks always stay sticky on top)
  const sortedStocks = [...filteredStocks].sort((a, b) => {
    const aPinned = pinnedStockIds.has(a.id);
    const bPinned = pinnedStockIds.has(b.id);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;

    // When VERY_BULLISH filter is active, prioritize stocks that go above the first 15m candle high FIRST
    if (trendFilter === 'VERY_BULLISH') {
      const aAbove = isAboveFirst15mCandle(a);
      const bAbove = isAboveFirst15mCandle(b);
      if (aAbove && !bAbove) return -1;
      if (!aAbove && bAbove) return 1;
    }
    // When VERY_BEARISH filter is active, prioritize stocks that go below the first 15m candle low FIRST
    if (trendFilter === 'VERY_BEARISH') {
      const aBelow = isBelowFirst15mCandle(a);
      const bBelow = isBelowFirst15mCandle(b);
      if (aBelow && !bBelow) return -1;
      if (!aBelow && bBelow) return 1;
    }

    let aVal: any = a[sortField];
    let bVal: any = b[sortField];

    if (aVal === undefined || aVal === null) aVal = -999999;
    if (bVal === undefined || bVal === null) bVal = -999999;

    if (typeof aVal === 'string') {
      return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
  });

  // Pagination calculation
  const totalPages = Math.ceil(sortedStocks.length / itemsPerPage) || 1;
  const paginatedStocks = sortedStocks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const toggleSort = (field: 'symbol' | 'openCalc' | 'closeCalc' | 'companyName' | 'volume') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const isAllFilteredPinned =
    filteredStocks.length > 0 && filteredStocks.every((s) => pinnedStockIds.has(s.id));

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
      
      {/* 🧪 15M FILTER RECIPE BUILDER PANEL */}
      <div className="p-4 sm:p-5 bg-slate-900 text-white border-b border-slate-800 space-y-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <SlidersHorizontal className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base text-white tracking-wide">
                  🧪 15m Scanner Filter Recipe Screener
                </h3>
                {selectedRecipeOptions.length > 0 && (
                  <span className="text-xs font-mono font-bold bg-indigo-950 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-500/50">
                    {selectedRecipeOptions.length} {selectedRecipeOptions.length === 1 ? 'Condition' : 'Conditions'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Select checkbox options to build a custom technical recipe for 15-minute stocks. Filter displays only stocks satisfying your selected conditions.
              </p>
            </div>
          </div>

          {/* Action buttons & mode toggle */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            {/* Match Mode Toggle */}
            <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center text-xs">
              <button
                onClick={() => setRecipeMatchMode('ALL')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  recipeMatchMode === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Stock must satisfy ALL checked conditions (AND logic)"
              >
                Match ALL (AND)
              </button>
              <button
                onClick={() => setRecipeMatchMode('ANY')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  recipeMatchMode === 'ANY'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Stock must satisfy ANY checked condition (OR logic)"
              >
                Match ANY (OR)
              </button>
            </div>

            {selectedRecipeOptions.length > 0 && (
              <button
                onClick={clearRecipe}
                className="text-xs font-bold text-rose-300 hover:text-rose-200 bg-rose-950/80 hover:bg-rose-900 px-3 py-1.5 rounded-xl border border-rose-500/50 flex items-center gap-1.5 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Recipe</span>
              </button>
            )}

            <button
              onClick={() => setIsRecipePanelOpen(!isRecipePanelOpen)}
              className="text-xs font-bold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all"
            >
              <span>{isRecipePanelOpen ? 'Collapse Recipe' : 'Expand Checkbox Grid'}</span>
              {isRecipePanelOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Preset Quick Recipes */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>1-Click 15m Preset Recipes:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {PRESET_RECIPES_15M.map((preset) => {
              const isActive = preset.optionKeys.every((k) => selectedRecipeOptions.includes(k)) &&
                               selectedRecipeOptions.length === preset.optionKeys.length;
              return (
                <button
                  key={preset.id}
                  onClick={() => applyPresetRecipe(preset.optionKeys)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all flex items-center gap-2 ${
                    isActive
                      ? 'bg-indigo-600 text-white border-indigo-400 shadow-md ring-2 ring-indigo-400/50'
                      : 'bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800'
                  }`}
                >
                  <span>{preset.name}</span>
                  <span className={`text-[9.5px] font-mono px-1.5 py-0.2 rounded ${isActive ? 'bg-indigo-900 text-indigo-200' : 'bg-slate-800 text-slate-400'}`}>
                    {preset.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Checkbox Options Grid (Expanded or Preview) */}
        {(isRecipePanelOpen || selectedRecipeOptions.length > 0) && (
          <div className="pt-2 space-y-4 border-t border-slate-800">
            {['15m Candlestick & Price Patterns', 'Gann & Range Calculations', 'Trend & Market Sentiment', 'VWAP & Pullback Indicators'].map((category) => {
              const options = RECIPE_OPTIONS_15M.filter((o) => o.category === category);
              if (options.length === 0) return null;
              return (
                <div key={category} className="space-y-2">
                  <div className="text-xs font-extrabold text-indigo-300 tracking-wide uppercase flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    <span>{category}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2">
                    {options.map((opt) => {
                      const isChecked = selectedRecipeOptions.includes(opt.id);
                      const matchCount = recipeOptionCounts[opt.id] || 0;
                      return (
                        <div
                          key={opt.id}
                          onClick={() => toggleRecipeOption(opt.id)}
                          className={`p-2.5 rounded-xl border cursor-pointer select-none transition-all flex flex-col justify-between space-y-1 ${
                            isChecked
                              ? 'bg-indigo-950/90 border-indigo-500 ring-1 ring-indigo-400 shadow-sm'
                              : 'bg-slate-950/90 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <div className="flex items-center gap-1.5">
                              {isChecked ? (
                                <CheckSquare className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                              )}
                              <span className={`text-xs font-bold leading-tight ${isChecked ? 'text-white' : 'text-slate-300'}`}>
                                {opt.label}
                              </span>
                            </div>
                            <span className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded shrink-0 ${
                              matchCount > 0
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : 'bg-slate-900 text-slate-500'
                            }`}>
                              {matchCount}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 pl-5 line-clamp-1">
                            {opt.description}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Recipe Indicator Banner */}
      {selectedRecipeOptions.length > 0 && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-3.5 border-b border-indigo-500/40 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
              <SlidersHorizontal className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-sm text-white">🧪 Custom 15m Recipe Active:</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-900 text-indigo-200 border border-indigo-500/50">
                  {selectedRecipeOptions.length} {selectedRecipeOptions.length === 1 ? 'Rule' : 'Rules'} ({recipeMatchMode} Mode)
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Showing <span className="font-extrabold text-emerald-300 font-mono text-sm">{filteredStocks.length}</span> of {stocks.length} stocks matching your 15m checkbox criteria.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => setIsRecipePanelOpen(!isRecipePanelOpen)}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center gap-1.5"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
              <span>{isRecipePanelOpen ? 'Hide Grid' : 'Edit Checkboxes'}</span>
            </button>
            <button
              onClick={clearRecipe}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-500/50 transition-all flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Recipe</span>
            </button>
          </div>
        </div>
      )}

      {/* Table Controls Bar */}
      <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search stock by symbol or company name (e.g. RELIANCE, ADANIENT)..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-white border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 outline-none font-medium placeholder-slate-400 transition-colors shadow-2xs"
          />
        </div>

        {/* Filters & Pinned Controls */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Sticky Pinned Counter & Clear Button */}
          {pinnedStockIds.size > 0 && (
            <button
              onClick={clearAllPins}
              className="px-2.5 py-1 rounded-xl bg-amber-500 text-white hover:bg-amber-600 font-extrabold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
              title="Click to clear all sticky pinned stocks"
            >
              <Pin className="w-3.5 h-3.5 fill-current" />
              <span>Sticky Pinned ({pinnedStockIds.size}) ✕</span>
            </button>
          )}

          {/* Trend filter buttons */}
          <div className="flex flex-wrap items-center bg-slate-200/60 p-1 rounded-xl border border-slate-200 text-xs gap-1">
            <button
              onClick={() => { setTrendFilter('ALL'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                trendFilter === 'ALL' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({stocks.length})
            </button>
            <button
              onClick={() => { setTrendFilter('OPEN_LOW'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-lg font-extrabold transition-colors flex items-center gap-1 ${
                trendFilter === 'OPEN_LOW'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200 border border-emerald-300/60'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-300" />
              Open = Low ({openLowCount})
            </button>
            <button
              onClick={() => { setTrendFilter('OPEN_HIGH'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-lg font-extrabold transition-colors flex items-center gap-1 ${
                trendFilter === 'OPEN_HIGH'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-rose-800 bg-rose-100/80 hover:bg-rose-200 border border-rose-300/60'
              }`}
            >
              <Target className="w-3.5 h-3.5 text-rose-600 dark:text-rose-300" />
              Open = High ({openHighCount})
            </button>
            <button
              onClick={() => { setTrendFilter('HIGH_CLOSE'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-lg font-extrabold transition-colors flex items-center gap-1 ${
                trendFilter === 'HIGH_CLOSE'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-blue-800 bg-blue-100/80 hover:bg-blue-200 border border-blue-300/60'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-300" />
              High = Close ({highCloseCount})
            </button>
            <button
              onClick={() => { setTrendFilter('FIB_382_RETRACE'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-lg font-extrabold transition-colors flex items-center gap-1 ${
                trendFilter === 'FIB_382_RETRACE'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-amber-900 bg-amber-100/80 hover:bg-amber-200 border border-amber-300/70'
              }`}
            >
              <Percent className="w-3.5 h-3.5 text-amber-600" />
              Fib 38.2% Retrace ({fib382Count})
            </button>
            <button
              onClick={() => { setTrendFilter('BOTH_CALC_LESS_3'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-lg font-black transition-all flex items-center gap-1 ${
                trendFilter === 'BOTH_CALC_LESS_3'
                  ? 'bg-purple-700 text-white shadow-2xs ring-2 ring-purple-300'
                  : 'text-purple-950 bg-purple-200/90 hover:bg-purple-300 border border-purple-400/80 shadow-2xs'
              }`}
              title="Filter stocks where BOTH Open AND Close modulo calculations are less than 3 (< 3)"
            >
              <Zap className="w-3.5 h-3.5 text-yellow-500 dark:text-yellow-300 fill-current animate-pulse" />
              Both Calc &lt; 3 ({bothCalcLess3Count})
            </button>
            <button
              onClick={() => { setTrendFilter('GANN_CALC_LESS_3'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-lg font-extrabold transition-colors flex items-center gap-1 ${
                trendFilter === 'GANN_CALC_LESS_3' || trendFilter === 'OPEN_CALC_LESS_3' || trendFilter === 'CLOSE_CALC_LESS_3' || trendFilter === 'OPEN_2DEC_LESS_CLOSE' || trendFilter === 'OPEN_2DEC_GREATER_CLOSE'
                  ? 'bg-purple-600 text-white shadow-2xs ring-2 ring-purple-300'
                  : 'text-purple-900 bg-purple-100/80 hover:bg-purple-200 border border-purple-300/70'
              }`}
              title="Filter stocks where Open or Close modulo calculation is less than 3"
            >
              <Zap className="w-3.5 h-3.5 text-purple-600 dark:text-purple-300 fill-current" />
              Calc &lt; 3 ({gannCalcLess3Count})
            </button>
            <button
              onClick={() => { setTrendFilter('BULLISH_COMBO_ANY'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-lg font-black transition-all flex items-center gap-1 ${
                trendFilter === 'BULLISH_COMBO_ANY' || trendFilter === 'BULLISH_COMBO_1' || trendFilter === 'BULLISH_COMBO_2' || trendFilter === 'BULLISH_COMBO_3' || trendFilter === 'BULLISH_COMBO_ALL'
                  ? 'bg-emerald-600 text-white shadow-2xs ring-2 ring-emerald-300'
                  : 'text-emerald-900 bg-emerald-100/90 hover:bg-emerald-200 border border-emerald-300/80 shadow-2xs'
              }`}
              title="Bullish Technical Filter Section (Combos 1, 2, 3)"
            >
              <Flame className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-300 fill-current animate-pulse" />
              Bullish Combos ({comboAnyCount})
            </button>
            <button
              onClick={() => { setTrendFilter('VERY_BULLISH'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-lg font-extrabold transition-colors flex items-center gap-1 ${
                trendFilter === 'VERY_BULLISH' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              🚀 Very Bullish ({veryBullishCount})
            </button>
            <button
              onClick={() => { setTrendFilter('BULLISH'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                trendFilter === 'BULLISH' ? 'bg-emerald-700 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bullish ({bullishCount})
            </button>
            <button
              onClick={() => { setTrendFilter('VERY_BEARISH'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-lg font-extrabold transition-colors flex items-center gap-1 ${
                trendFilter === 'VERY_BEARISH' ? 'bg-rose-600 text-white shadow-2xs' : 'text-rose-700 hover:bg-rose-100'
              }`}
            >
              📉 Very Bearish ({veryBearishCount})
            </button>
            <button
              onClick={() => { setTrendFilter('BEARISH'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                trendFilter === 'BEARISH' ? 'bg-rose-700 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bearish ({bearishCount})
            </button>
            <button
              onClick={() => { setTrendFilter('CALCULATED'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                trendFilter === 'CALCULATED' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Calculated
            </button>
          </div>

          {/* Lot month selector */}
          <div className="flex items-center bg-slate-200/60 p-1 rounded-xl border border-slate-200 text-xs">
            <span className="text-[10px] text-slate-600 px-1.5 font-medium flex items-center gap-1">
              <Layers className="w-3 h-3 text-blue-600" /> Lot:
            </span>
            {(['Jun', 'Jul', 'Aug'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setLotMonth(m)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  lotMonth === m ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {m} '26
              </button>
            ))}
          </div>

          {/* Sub-filter chips for Bullish Combinations */}
          {(trendFilter === 'BULLISH_COMBO_ANY' || trendFilter === 'BULLISH_COMBO_1' || trendFilter === 'BULLISH_COMBO_2' || trendFilter === 'BULLISH_COMBO_3' || trendFilter === 'BULLISH_COMBO_ALL') && (
            <div className="flex items-center gap-1 bg-emerald-100 p-1 rounded-xl border border-emerald-300 text-xs shadow-2xs overflow-x-auto">
              <span className="text-[10px] font-black text-emerald-950 px-1.5 flex items-center gap-1 whitespace-nowrap">
                <Flame className="w-3 h-3 text-emerald-600 fill-current" /> Bullish Section:
              </span>
              <button
                onClick={() => { setTrendFilter('BULLISH_COMBO_ANY'); setCurrentPage(1); }}
                className={`px-2 py-0.5 rounded text-[11px] font-extrabold whitespace-nowrap ${
                  trendFilter === 'BULLISH_COMBO_ANY' ? 'bg-emerald-700 text-white shadow-2xs' : 'text-emerald-900 hover:bg-emerald-200'
                }`}
              >
                All Combos ({comboAnyCount})
              </button>
              <button
                onClick={() => { setTrendFilter('BULLISH_COMBO_1'); setCurrentPage(1); }}
                className={`px-2 py-0.5 rounded text-[11px] font-extrabold whitespace-nowrap ${
                  trendFilter === 'BULLISH_COMBO_1' ? 'bg-emerald-700 text-white shadow-2xs' : 'text-emerald-900 hover:bg-emerald-200'
                }`}
              >
                Combo 1: 9/20/50 EMA ({combo1Count})
              </button>
              <button
                onClick={() => { setTrendFilter('BULLISH_COMBO_2'); setCurrentPage(1); }}
                className={`px-2 py-0.5 rounded text-[11px] font-extrabold whitespace-nowrap ${
                  trendFilter === 'BULLISH_COMBO_2' ? 'bg-blue-700 text-white shadow-2xs' : 'text-blue-900 hover:bg-blue-200'
                }`}
              >
                Combo 2: RSI 55-70 ({combo2Count})
              </button>
              <button
                onClick={() => { setTrendFilter('BULLISH_COMBO_3'); setCurrentPage(1); }}
                className={`px-2 py-0.5 rounded text-[11px] font-extrabold whitespace-nowrap ${
                  trendFilter === 'BULLISH_COMBO_3' ? 'bg-purple-700 text-white shadow-2xs' : 'text-purple-900 hover:bg-purple-200'
                }`}
              >
                Combo 3: MACD ({combo3Count})
              </button>
              <button
                onClick={() => { setTrendFilter('BULLISH_COMBO_ALL'); setCurrentPage(1); }}
                className={`px-2 py-0.5 rounded text-[11px] font-extrabold whitespace-nowrap ${
                  trendFilter === 'BULLISH_COMBO_ALL' ? 'bg-amber-500 text-slate-950 font-black shadow-2xs' : 'text-amber-900 hover:bg-amber-200'
                }`}
              >
                🔥 Triple Power ({comboAllCount})
              </button>
            </div>
          )}

          {/* Sub-filter chips for Calc Modes & Decimal Filters */}
          {(trendFilter === 'GANN_CALC_LESS_3' || trendFilter === 'BOTH_CALC_LESS_3' || trendFilter === 'OPEN_CALC_LESS_3' || trendFilter === 'CLOSE_CALC_LESS_3' || trendFilter === 'OPEN_2DEC_LESS_CLOSE' || trendFilter === 'OPEN_2DEC_GREATER_CLOSE' || trendFilter === 'OPEN_LESS_3_CLOSE_GREATER_10' || trendFilter === 'OPEN_GREATER_10_CLOSE_LESS_3') && (
            <div className="flex items-center gap-1 bg-purple-100 p-1 rounded-xl border border-purple-300 text-xs shadow-2xs overflow-x-auto">
              <span className="text-[10px] font-black text-purple-950 px-1.5 flex items-center gap-1 whitespace-nowrap">
                <Zap className="w-3 h-3 text-purple-700 fill-current" /> Calc Mode:
              </span>
              <button
                onClick={() => { setTrendFilter('BOTH_CALC_LESS_3'); setCurrentPage(1); }}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-black transition-all whitespace-nowrap flex items-center gap-1 ${
                  trendFilter === 'BOTH_CALC_LESS_3'
                    ? 'bg-purple-800 text-yellow-300 shadow-2xs ring-1 ring-purple-400'
                    : 'bg-white text-purple-950 hover:bg-purple-50 border border-purple-300'
                }`}
              >
                🔥 Both Open &amp; Close &lt; 3 ({bothCalcLess3Count})
              </button>
              <button
                onClick={() => { setTrendFilter('GANN_CALC_LESS_3'); setCurrentPage(1); }}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-extrabold transition-all whitespace-nowrap ${
                  trendFilter === 'GANN_CALC_LESS_3'
                    ? 'bg-purple-700 text-white shadow-2xs'
                    : 'bg-white text-purple-900 hover:bg-purple-50 border border-purple-200'
                }`}
              >
                Open OR Close &lt; 3 ({gannCalcLess3Count})
              </button>
              <button
                onClick={() => { setTrendFilter('OPEN_CALC_LESS_3'); setCurrentPage(1); }}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-extrabold transition-all whitespace-nowrap ${
                  trendFilter === 'OPEN_CALC_LESS_3'
                    ? 'bg-purple-700 text-white shadow-2xs'
                    : 'bg-white text-purple-900 hover:bg-purple-50 border border-purple-200'
                }`}
              >
                Open Calc &lt; 3 ({openCalcLess3Count})
              </button>
              <button
                onClick={() => { setTrendFilter('CLOSE_CALC_LESS_3'); setCurrentPage(1); }}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-extrabold transition-all whitespace-nowrap ${
                  trendFilter === 'CLOSE_CALC_LESS_3'
                    ? 'bg-purple-700 text-white shadow-2xs'
                    : 'bg-white text-purple-900 hover:bg-purple-50 border border-purple-200'
                }`}
              >
                Close Calc &lt; 3 ({closeCalcLess3Count})
              </button>
              <button
                onClick={() => { setTrendFilter('OPEN_2DEC_LESS_CLOSE'); setCurrentPage(1); }}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-extrabold transition-all whitespace-nowrap flex items-center gap-1 ${
                  trendFilter === 'OPEN_2DEC_LESS_CLOSE'
                    ? 'bg-indigo-700 text-white shadow-2xs ring-1 ring-indigo-400'
                    : 'bg-white text-indigo-900 hover:bg-indigo-50 border border-indigo-200'
                }`}
                title="Filter stocks where Gann Open Calc (or Open Price) first two decimals < Close Calc first two decimals"
              >
                📉 Open 1st 2-Dec &lt; Close ({open2DecLessCount})
              </button>
              <button
                onClick={() => { setTrendFilter('OPEN_2DEC_GREATER_CLOSE'); setCurrentPage(1); }}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-extrabold transition-all whitespace-nowrap flex items-center gap-1 ${
                  trendFilter === 'OPEN_2DEC_GREATER_CLOSE'
                    ? 'bg-indigo-700 text-white shadow-2xs ring-1 ring-indigo-400'
                    : 'bg-white text-indigo-900 hover:bg-indigo-50 border border-indigo-200'
                }`}
                title="Filter stocks where Gann Open Calc (or Open Price) first two decimals > Close Calc first two decimals"
              >
                📈 Open 1st 2-Dec &gt; Close ({open2DecGreaterCount})
              </button>
              <button
                onClick={() => { setTrendFilter('OPEN_LESS_3_CLOSE_GREATER_10'); setCurrentPage(1); }}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-extrabold transition-all whitespace-nowrap flex items-center gap-1 ${
                  trendFilter === 'OPEN_LESS_3_CLOSE_GREATER_10'
                    ? 'bg-purple-800 text-yellow-300 shadow-2xs ring-1 ring-purple-400'
                    : 'bg-white text-purple-900 hover:bg-purple-50 border border-purple-200'
                }`}
                title="Gann Open Calc < 3 AND Gann Close Calc > 10"
              >
                ⚡ Open &lt; 3 &amp; Close &gt; 10 ({openLess3CloseGreater10Count})
              </button>
              <button
                onClick={() => { setTrendFilter('OPEN_GREATER_10_CLOSE_LESS_3'); setCurrentPage(1); }}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-extrabold transition-all whitespace-nowrap flex items-center gap-1 ${
                  trendFilter === 'OPEN_GREATER_10_CLOSE_LESS_3'
                    ? 'bg-purple-800 text-yellow-300 shadow-2xs ring-1 ring-purple-400'
                    : 'bg-white text-purple-900 hover:bg-purple-50 border border-purple-200'
                }`}
                title="Gann Open Calc > 10 AND Gann Close Calc < 3"
              >
                ⚡ Open &gt; 10 &amp; Close &lt; 3 ({openGreater10CloseLess3Count})
              </button>
            </div>
          )}

        </div>

      </div>

      {/* Main Stock Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100/80 text-slate-600 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
              {/* Sticky Pin Checkbox Column Header */}
              <th className="py-3 px-3 text-center w-12 bg-amber-50/60 border-r border-amber-200/60">
                <div className="flex items-center justify-center gap-1">
                  <input
                    type="checkbox"
                    checked={isAllFilteredPinned}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const next = new Set(pinnedStockIds);
                        filteredStocks.forEach((s) => next.add(s.id));
                        setPinnedStockIds(next);
                        const arr = Array.from(next);
                        localStorage.setItem('gann_pinned_stock_ids', JSON.stringify(arr));
                        fetch('/api/settings', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ pinnedStockIds: arr })
                        }).catch(() => {});
                      } else {
                        const next = new Set(pinnedStockIds);
                        filteredStocks.forEach((s) => next.delete(s.id));
                        setPinnedStockIds(next);
                        const arr = Array.from(next);
                        localStorage.setItem('gann_pinned_stock_ids', JSON.stringify(arr));
                        fetch('/api/settings', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ pinnedStockIds: arr })
                        }).catch(() => {});
                      }
                    }}
                    title={isAllFilteredPinned ? "Unpin all visible stocks" : "Pin all visible stocks to stay on top"}
                    className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer accent-amber-600"
                  />
                  <Pin className="w-3 h-3 text-amber-600 fill-amber-500" title="Sticky Pin Column" />
                </div>
              </th>
              <th className="py-3 px-4">
                <button
                  onClick={() => toggleSort('symbol')}
                  className="flex items-center gap-1 hover:text-slate-900 transition-colors"
                >
                  Symbol / Company <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-3 px-3 text-center">Lot Size ({lotMonth} '26)</th>
              <th className="py-3 px-3 text-right">15-Min Open (₹)</th>
              <th className="py-3 px-3 text-right">15-Min Close (₹)</th>
              <th className="py-3 px-3 text-right">
                <button
                  onClick={() => toggleSort('volume')}
                  className="flex items-center justify-end gap-1 hover:text-slate-900 transition-colors"
                >
                  Volume <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-3 px-3 text-right">
                <button
                  onClick={() => toggleSort('openCalc')}
                  className="flex items-center justify-end gap-1 hover:text-blue-800 transition-colors text-blue-700 font-bold"
                >
                  Open Calc <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-3 px-3 text-right">
                <button
                  onClick={() => toggleSort('closeCalc')}
                  className="flex items-center justify-end gap-1 hover:text-blue-800 transition-colors text-blue-700 font-bold"
                >
                  Close Calc <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-3 px-3 text-center bg-purple-50/80 text-purple-900 font-extrabold border-x border-purple-200/80">
                ATM Option Strikes (CE & PE)
              </th>
              <th className="py-3 px-3 text-center">Trend / Signal</th>
              <th className="py-3 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {paginatedStocks.length === 0 ? (
              <tr>
                <td colSpan={11} className="text-center py-12 text-slate-400">
                  No stocks match the selected search or filter criteria.
                </td>
              </tr>
            ) : (
              paginatedStocks.map((stock) => {
                const lotSize =
                  lotMonth === 'Jun'
                    ? stock.lotSizeJun2026
                    : lotMonth === 'Jul'
                    ? stock.lotSizeJul2026
                    : stock.lotSizeAug2026;

                const isPinned = pinnedStockIds.has(stock.id);

                return (
                  <tr 
                    key={stock.id} 
                    className={`transition-colors group ${
                      isPinned 
                        ? 'bg-amber-50/80 hover:bg-amber-100/80 font-medium' 
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    {/* Sticky Checkbox Pin Column */}
                    <td className="py-2.5 px-3 text-center bg-amber-50/40 border-r border-amber-200/40">
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="checkbox"
                          checked={isPinned}
                          onChange={() => togglePin(stock.id)}
                          title={isPinned ? "Uncheck to unpin stock from top" : "Check to pin stock to always stay on top"}
                          className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer accent-amber-600 transition-transform active:scale-95"
                        />
                        {isPinned && (
                          <Pin className="w-3.5 h-3.5 text-amber-600 fill-amber-500" title="Sticky on Top" />
                        )}
                      </div>
                    </td>
                    {/* Symbol & Company */}
                    <td className="py-2.5 px-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          {stock.symbol}
                        </span>
                        <a
                          href={stock.screenerUrl}
                          target="_blank"
                          rel="noreferrer"
                          title="Open Screener page"
                          className="text-slate-400 hover:text-blue-600 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        {isStockOpenEqualLow(stock) && (
                          <span
                            title="Open = Low pattern detected (Bullish Intraday Setup)"
                            className="text-[10px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded flex items-center gap-0.5 shadow-2xs"
                          >
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            O=L
                          </span>
                        )}
                        {isStockOpenEqualHigh(stock) && (
                          <span
                            title="Open = High pattern detected (Bearish Intraday Setup)"
                            className="text-[10px] font-black text-rose-800 bg-rose-100 border border-rose-300 px-1.5 py-0.5 rounded flex items-center gap-0.5 shadow-2xs"
                          >
                            <Target className="w-3 h-3 text-rose-600" />
                            O=H
                          </span>
                        )}
                        {isStockHighEqualClose(stock) && (
                          <span
                            title="High = Close pattern detected (Strong Bullish Closing Setup)"
                            className="text-[10px] font-black text-blue-800 bg-blue-100 border border-blue-300 px-1.5 py-0.5 rounded flex items-center gap-0.5 shadow-2xs"
                          >
                            <Sparkles className="w-3 h-3 text-blue-600" />
                            H=C
                          </span>
                        )}
                        {detect15mHighPullbackBounce(stock).isPullbackBounce && (
                          <span
                            title={detect15mHighPullbackBounce(stock).detail}
                            className="text-[10px] font-black text-purple-900 bg-purple-100 border border-purple-300 px-1.5 py-0.5 rounded flex items-center gap-0.5 shadow-2xs"
                          >
                            <Target className="w-3 h-3 text-purple-600 shrink-0" />
                            15M BOUNCE ({detect15mHighPullbackBounce(stock).bounceTime})
                          </span>
                        )}
                        {stock.error && (
                          <span
                            title={stock.error}
                            className="text-[10px] font-medium text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded cursor-help truncate max-w-[90px]"
                          >
                            Failed
                          </span>
                        )}
                        {stock.isFetched && !stock.error && (
                          <span
                            title={stock.candleTimestamp ? `Candle: ${stock.candleTimestamp}` : 'Fetched'}
                            className="text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded"
                          >
                            Live
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5 font-mono">
                        <span className="truncate max-w-[130px]">{stock.companyName}</span>
                        {stock.candleTimestamp && (
                          <span
                            title="Signal / 15-min Candle Timestamp"
                            className="text-[9.5px] font-extrabold text-blue-900 bg-blue-100/90 border border-blue-300 px-1 py-0.2 rounded shrink-0 flex items-center gap-0.5 shadow-2xs"
                          >
                            🕒 {stock.candleTimestamp}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Lot Size */}
                    <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-600">
                      {lotSize ? lotSize.toLocaleString() : '-'}
                    </td>

                    {/* 15-Min Open Input */}
                    <td className="py-2.5 px-3 text-right">
                      <input
                        type="number"
                        step="0.05"
                        placeholder="0.00"
                        value={stock.openPrice !== undefined && stock.openPrice !== null ? stock.openPrice : ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          onUpdateStockPrices(stock.id, val, stock.closePrice || 0);
                        }}
                        className="w-24 bg-white border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 rounded px-2 py-1 text-right font-mono text-slate-900 text-xs outline-none shadow-2xs"
                      />
                    </td>

                    {/* 15-Min Close Input */}
                    <td className="py-2.5 px-3 text-right">
                      <input
                        type="number"
                        step="0.05"
                        placeholder="0.00"
                        value={stock.closePrice !== undefined && stock.closePrice !== null ? stock.closePrice : ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          onUpdateStockPrices(stock.id, stock.openPrice || 0, val);
                        }}
                        className="w-24 bg-white border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 rounded px-2 py-1 text-right font-mono text-slate-900 text-xs outline-none shadow-2xs"
                      />
                    </td>

                    {/* 15-Min Volume */}
                    <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-700">
                      {stock.volume !== undefined && stock.volume !== null && stock.volume > 0 ? (
                        <span className="font-semibold text-slate-800">{stock.volume.toLocaleString('en-IN')}</span>
                      ) : (
                        <span className="text-slate-400 font-normal text-xs">-</span>
                      )}
                    </td>

                    {/* Open Calculation Output */}
                    <td className={`py-2.5 px-3 text-right font-mono font-extrabold text-sm ${
                      stock.openCalc !== undefined && stock.openCalc !== null && stock.openCalc < 3
                        ? 'bg-purple-100 text-purple-950 border border-purple-300 font-black'
                        : 'text-blue-700 bg-blue-50/50'
                    }`}>
                      {stock.openCalc !== undefined && stock.openCalc !== null ? (
                        <div className="flex items-center justify-end gap-1">
                          {stock.openCalc < 3 && <span className="text-[10px] bg-purple-700 text-white px-1 rounded font-sans uppercase font-black">Open &lt; 3</span>}
                          <span>{stock.openCalc.toFixed(4)}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-normal text-xs">-</span>
                      )}
                    </td>

                    {/* Close Calculation Output */}
                    <td className={`py-2.5 px-3 text-right font-mono font-extrabold text-sm ${
                      stock.closeCalc !== undefined && stock.closeCalc !== null && stock.closeCalc < 3
                        ? 'bg-purple-100 text-purple-950 border border-purple-300 font-black'
                        : 'text-blue-700 bg-blue-50/50'
                    }`}>
                      {stock.closeCalc !== undefined && stock.closeCalc !== null ? (
                        <div className="flex items-center justify-end gap-1">
                          {stock.closeCalc < 3 && <span className="text-[10px] bg-purple-700 text-white px-1 rounded font-sans uppercase font-black">Close &lt; 3</span>}
                          <span>{stock.closeCalc.toFixed(4)}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-normal text-xs">-</span>
                      )}
                    </td>

                    {/* ATM CE & PE Strike Prices */}
                    {(() => {
                      const cmp = stock.closePrice || stock.openPrice || 0;
                      const strikes = getAtmOptionStrikes(cmp, stock.symbol);
                      return (
                        <td className="py-2 px-3 text-center bg-purple-50/40 border-x border-purple-100/80">
                          {strikes ? (
                            <div className="flex flex-col items-center gap-1.5 min-w-[135px]">
                              {/* 2 CE Strikes */}
                              <div className="flex items-center justify-center space-x-1" title={`2 At-The-Money Call Option Strikes for ${stock.symbol}`}>
                                <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded font-mono shadow-2xs">
                                  {strikes.ceStrikes[0]} CE
                                </span>
                                <span className="text-[10px] font-bold text-emerald-700 bg-white border border-emerald-200 px-1.5 py-0.5 rounded font-mono">
                                  {strikes.ceStrikes[1]} CE
                                </span>
                              </div>
                              {/* 2 PE Strikes */}
                              <div className="flex items-center justify-center space-x-1" title={`2 At-The-Money Put Option Strikes for ${stock.symbol}`}>
                                <span className="text-[10px] font-black text-rose-800 bg-rose-100 border border-rose-300 px-1.5 py-0.5 rounded font-mono shadow-2xs">
                                  {strikes.peStrikes[0]} PE
                                </span>
                                <span className="text-[10px] font-bold text-rose-700 bg-white border border-rose-200 px-1.5 py-0.5 rounded font-mono">
                                  {strikes.peStrikes[1]} PE
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-mono text-xs">-</span>
                          )}
                        </td>
                      );
                    })()}

                    {/* Trend Indicator */}
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {isStockOpenEqualLow(stock) && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white shadow-2xs border border-emerald-300">
                            <ShieldCheck className="w-3 h-3 text-white" />
                            <span>OPEN = LOW</span>
                            {stock.candleTimestamp && <span className="text-[9px] text-emerald-100 font-mono font-bold">({stock.candleTimestamp})</span>}
                          </span>
                        )}
                        {isStockOpenEqualHigh(stock) && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white shadow-2xs border border-rose-300">
                            <Target className="w-3 h-3 text-white" />
                            <span>OPEN = HIGH</span>
                            {stock.candleTimestamp && <span className="text-[9px] text-rose-100 font-mono font-bold">({stock.candleTimestamp})</span>}
                          </span>
                        )}
                        {isAboveFirst15mCandle(stock) && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9.5px] font-extrabold bg-blue-600 text-white shadow-2xs border border-blue-300" title="Price is trading above the first 15-minute candle high">
                            <Sparkles className="w-2.5 h-2.5 text-yellow-300" />
                            <span>Above 15m High</span>
                            {stock.candleTimestamp && <span className="text-[9px] text-blue-100 font-mono font-bold">({stock.candleTimestamp})</span>}
                          </span>
                        )}
                        {isGannCalcLessThan3(stock) && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9.5px] font-black bg-purple-700 text-white shadow-2xs border border-purple-300 animate-pulse" title={`Open or Close calc < 3 (Open: ${stock.openCalc?.toFixed(2) ?? '-'}, Close: ${stock.closeCalc?.toFixed(2) ?? '-'})`}>
                            <Zap className="w-2.5 h-2.5 text-yellow-300 fill-current" />
                            <span>
                              {isOpenCalcLessThan3(stock) && isCloseCalcLessThan3(stock)
                                ? 'BOTH CALC < 3'
                                : isOpenCalcLessThan3(stock)
                                ? 'OPEN CALC < 3'
                                : 'CLOSE CALC < 3'}
                            </span>
                            {stock.candleTimestamp && <span className="text-[9px] text-purple-200 font-mono font-bold">({stock.candleTimestamp})</span>}
                          </span>
                        )}

                        {stock.trend ? (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] ${
                            stock.trend === 'Very Bullish'
                              ? 'bg-emerald-600 text-white font-extrabold shadow-2xs ring-2 ring-emerald-300/60'
                              : stock.trend === 'Bullish'
                              ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-200'
                              : stock.trend === 'Very Bearish'
                              ? 'bg-rose-600 text-white font-extrabold shadow-2xs ring-2 ring-rose-300/60'
                              : stock.trend === 'Bearish'
                              ? 'bg-rose-50 text-rose-700 font-bold border border-rose-200'
                              : 'bg-slate-100 text-slate-600 font-medium border border-slate-200'
                          }`}>
                            {(stock.trend === 'Very Bullish' || stock.trend === 'Bullish') && <TrendingUp className="w-3 h-3" />}
                            {(stock.trend === 'Very Bearish' || stock.trend === 'Bearish') && <TrendingDown className="w-3 h-3" />}
                            <span>{stock.trend}</span>
                            {stock.candleTimestamp && (
                              <span className="text-[9px] font-mono font-bold opacity-90">({stock.candleTimestamp})</span>
                            )}
                          </span>
                        ) : (
                          !isStockOpenEqualLow(stock) && !isStockOpenEqualHigh(stock) && <span className="text-slate-400">-</span>
                        )}

                        {stock.rsi !== undefined && stock.rsi !== null && (
                          <span className={`text-[10px] font-black px-2 py-0.2 rounded border ${
                            stock.rsi > 58
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : stock.rsi < 40
                              ? 'bg-rose-100 text-rose-900 border-rose-300'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}>
                            RSI: {stock.rsi.toFixed(1)} {stock.rsi > 50 ? '▲' : '▼'}
                          </span>
                        )}

                        {stock.adx !== undefined && stock.adx !== null && (
                          <span className={`text-[10px] font-black px-2 py-0.2 rounded border ${
                            stock.adx > 21
                              ? 'bg-blue-100 text-blue-900 border-blue-300'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}>
                            ADX: {stock.adx.toFixed(1)} {stock.adx > 21 ? '⚡' : ''}
                          </span>
                        )}

                        {(() => {
                          const cmp = stock.closePrice || stock.openPrice || 0;
                          const status = stock.vwapStatus || (stock.vwap && cmp > 0 ? (cmp > stock.vwap ? 'Above' : cmp < stock.vwap ? 'Below' : 'At') : null);
                          if (!status) return null;
                          return (
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.2 rounded border flex items-center gap-1 ${
                                status === 'Above'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300/80'
                                  : status === 'Below'
                                  ? 'bg-rose-50 text-rose-800 border-rose-300/80'
                                  : 'bg-slate-100 text-slate-700 border-slate-300'
                              }`}
                              title={stock.vwap ? `VWAP Level: ₹${stock.vwap.toFixed(2)} | CMP: ₹${cmp.toFixed(2)}` : 'VWAP Status'}
                            >
                              <span>VWAP: {status === 'Above' ? 'Above ▲' : status === 'Below' ? 'Below ▼' : 'At ='}</span>
                              {stock.vwap && <span className="text-[9px] opacity-80 font-mono font-bold">(₹{stock.vwap.toFixed(1)})</span>}
                            </span>
                          );
                        })()}

                        {(() => {
                          const cmp = stock.closePrice || stock.openPrice || 0;
                          const fibData = calculateFibonacci382(stock.highPrice, stock.lowPrice, cmp, stock.symbol, stock.candleTimestamp);
                          const status = stock.fibStatus || fibData?.fibStatus;
                          const retraceTime = stock.fib382Time || fibData?.fib382Time || '09:45 AM';
                          if (!status || !fibData) return null;

                          return (
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.2 rounded border flex items-center gap-1 shadow-2xs ${
                                status === 'Retraced Yes'
                                  ? 'bg-amber-100 text-amber-950 border-amber-400'
                                  : status === 'Approaching 38.2%'
                                  ? 'bg-sky-50 text-sky-900 border-sky-300'
                                  : 'bg-rose-50 text-rose-800 border-rose-200'
                              }`}
                              title={`Fib 38.2% Level: ₹${fibData.fib382Bull} | Retraced Time: ${retraceTime} IST | Status: ${status}`}
                            >
                              <Percent className="w-3 h-3 text-amber-700" />
                              <span>
                                {status === 'Retraced Yes'
                                  ? `★ Retraced Yes (${retraceTime})`
                                  : status === 'Approaching 38.2%'
                                  ? `Approaching 38.2% (${retraceTime})`
                                  : 'No Retracement'}
                              </span>
                            </span>
                          );
                        })()}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        
                        {/* Dhan Fetch Single */}
                        {credentials.isConfigured && (
                          <button
                            onClick={() => onFetchSingleStock(stock)}
                            disabled={stock.isLoading}
                            title="Fetch live 15-min candle from Dhan API"
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${stock.isLoading ? 'animate-spin text-blue-600' : ''}`} />
                          </button>
                        )}

                        {/* AI RSI Trend Analyst */}
                        {onOpenRsiAnalyst && (
                          <button
                            onClick={() => onOpenRsiAnalyst(stock)}
                            title="Run AI RSI Trend Analyst (09:15 AM to Current Time)"
                            className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 bg-indigo-50/50 rounded transition-colors border border-indigo-100"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                          </button>
                        )}

                        {/* View Breakdown */}
                        <button
                          onClick={() => onSelectStockDetail(stock)}
                          title="View Targets & Breakdown"
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Position Sizing Calculator */}
                        {onOpenPositionSizer && (
                          <button
                            onClick={() => onOpenPositionSizer(stock)}
                            title="Calculate Position Size & Lots for this stock"
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                          >
                            <Calculator className="w-3.5 h-3.5 text-amber-600" />
                          </button>
                        )}

                        {/* Manual Edit */}
                        <button
                          onClick={() => onEditStockManual(stock)}
                          title="Manual Price Entry Modal"
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
        <div>
          Showing {sortedStocks.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to{' '}
          {Math.min(currentPage * itemsPerPage, sortedStocks.length)} of {sortedStocks.length} F&O Stocks
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-40 shadow-2xs"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="font-mono text-slate-700 font-semibold">
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-40 shadow-2xs"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
};
