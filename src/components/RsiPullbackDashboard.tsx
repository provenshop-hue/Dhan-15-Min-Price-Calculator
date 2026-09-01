import React, { useState, useMemo } from 'react';
import { StockCalculated, FadedStockRecord } from '../types';
import { analyzeRsiPullback, RsiPullbackAnalysis, is100PercentBullishMove, is100PercentBearishMove, get100PercentBullishScore, get100PercentBearishScore, get100PercentBullishFadeReason, get100PercentBearishFadeReason } from '../utils/rsiPullback';
import { analyzeBullishCombinations } from '../utils/bullishCombinations';
import { evaluateHighConfidenceTrade, HighConfidenceTradeAnalysis } from '../utils/highConfidenceTrade';
import { BullishFilterSection } from './BullishFilterSection';
import { calculateRSI, isOpenLowPattern, isOpenHighPattern, isHighClosePattern } from '../utils/gann';
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
  ShieldCheck,
  AlertTriangle,
  CheckCircle2, 
  Flame, 
  HelpCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Clock,
  Target,
  Calendar,
  RefreshCw,
  Trash2,
  Download,
  Zap,
  Activity,
  SlidersHorizontal,
  CheckSquare,
  Square,
  RotateCcw,
  X
} from 'lucide-react';

interface RsiPullbackDashboardProps {
  stocks: StockCalculated[];
  faded100Log?: FadedStockRecord[];
  onClearFadedLog?: () => void;
  onSelectStockDetail: (stock: StockCalculated) => void;
  onOpenPositionSizer: (stock: StockCalculated) => void;
  onOpenRsiAnalyst: (stock: StockCalculated) => void;
  onFetchSingleStock?: (symbol: string) => void;
  selectedDate?: string;
  onDateChange?: (date: string) => void;
  onFetchAll?: () => void;
  isBulkLoading?: boolean;
}

type PullbackFilterType = 
  | 'ALL' 
  | 'HIGH_CONFIDENCE_TRADE'
  | 'HIGH_CONFLUENCE'
  | 'TRIGGERED_TODAY'
  | 'HIGH_SUCCESS'
  | 'TARGET_HIT'
  | 'BULLISH_100_MOVE'
  | 'BEARISH_100_MOVE'
  | 'FADED_100_MOVE'
  | 'BULLISH_RALLY'
  | 'BEARISH_RALLY'
  | 'BULLISH_SWEET_SPOT' 
  | 'BULLISH_MOMENTUM' 
  | 'OVERSOLD' 
  | 'HIGH_SCORE'
  | 'VOL_INCREASING'
  | 'OPEN_LOW'
  | 'OPEN_HIGH'
  | 'HIGH_CLOSE'
  | 'PULLBACK_15M_BOUNCE';

type SortOption = 'SCORE_DESC' | 'SUCCESS_RATE_DESC' | 'RSI_ASC' | 'RSI_DESC' | 'PCT_CHANGE_DESC' | 'VOLUME_DESC';

export interface RecipeOption {
  id: string;
  label: string;
  category: 'Confluence & Signals' | 'RSI & Pullback Setup' | 'Moving Averages & Indicators' | 'Price Action & Candlesticks';
  description: string;
}

export interface PresetRecipe {
  id: string;
  name: string;
  description: string;
  optionKeys: string[];
  badge: string;
}

export const RECIPE_OPTIONS: RecipeOption[] = [
  // Confluence & Signals
  { id: 'HIGH_CONFIDENCE_TRADE', label: '🎯 High-Confidence Trade (14 Confluences)', category: 'Confluence & Signals', description: 'All 14 mandatory conditions: Higher TF Bullish, Close>VWAP, EMA20>50, Close>EMA20, HH+HL, Breakout+Retest, Hold>=30m, Vol>1.2x, RSI 55-75, RR>=2, Dist to Res>=2xSL' },
  { id: 'HIGH_CONFIDENCE_ENTRY', label: '🚀 High-Confidence Entry Trigger Active', category: 'Confluence & Signals', description: '14 Mandatory Conditions = TRUE + Current Candle Bullish + Close > Prev High' },
  { id: 'HIGH_CONFLUENCE', label: '🛡️ Verified High Confluence', category: 'Confluence & Signals', description: 'Met 4+ bullish/bearish alignment factors' },
  { id: 'TRIGGERED_TODAY', label: '⏱️ Triggered Confluence Today', category: 'Confluence & Signals', description: 'Intraday confluence trigger timestamp met' },
  { id: 'HIGH_SUCCESS', label: '🎯 High Signal Success (≥70%)', category: 'Confluence & Signals', description: 'Signal success rate >= 70% from entry' },
  { id: 'TARGET_HIT', label: '🏁 Target 1 Hit (≥95%)', category: 'Confluence & Signals', description: 'Reached Target 1 price level' },
  { id: 'NO_FALSE_BREAKOUT', label: '🟢 Clear of False Breakout Risk', category: 'Confluence & Signals', description: 'Not flagged as high false breakout risk' },

  // RSI & Pullback Setup
  { id: 'BULLISH_SWEET_SPOT', label: '🍯 RSI Sweet Spot (40-55)', category: 'RSI & Pullback Setup', description: 'RSI in prime pullback entry zone' },
  { id: 'BULLISH_MOMENTUM', label: '🚀 Bullish Momentum RSI (>55)', category: 'RSI & Pullback Setup', description: 'RSI rising strong above 55' },
  { id: 'OVERSOLD', label: '📉 Oversold Reversal (<40)', category: 'RSI & Pullback Setup', description: 'Oversold RSI looking for bounce' },
  { id: 'HIGH_SCORE', label: '⚡ High Pullback Score (≥75)', category: 'RSI & Pullback Setup', description: 'Overall pullback rating 75+' },
  { id: 'PULLBACK_15M_BOUNCE', label: '⏳ 15m Pullback Bounce', category: 'RSI & Pullback Setup', description: '15-min price bouncing off VWAP/EMA' },

  // Moving Averages & Indicators
  { id: 'BULLISH_COMBO_1', label: '🔥 Combo 1: 9/20/50 EMA Stack', category: 'Moving Averages & Indicators', description: '9 EMA > 20 EMA > 50 EMA, Price above all, EMAs rising & Pullback respects 9/20 EMA' },
  { id: 'BULLISH_COMBO_2', label: '🚀 Combo 2: RSI 55-70 Higher Highs', category: 'Moving Averages & Indicators', description: 'RSI 55–70, Price higher highs & RSI higher highs' },
  { id: 'BULLISH_COMBO_3', label: '⚡ Combo 3: MACD Crossover & Zero Line', category: 'Moving Averages & Indicators', description: 'MACD bullish crossover, MACD > 0, Histogram increasing & Price > 20/50 EMA' },
  { id: 'BULLISH_COMBO_ALL', label: '🏆 Triple Bullish Power (All 3 Met)', category: 'Moving Averages & Indicators', description: 'Stock satisfies Combination 1, Combination 2, AND Combination 3 concurrently' },
  { id: 'ABOVE_50_SMA', label: '📈 Price Above 50 SMA', category: 'Moving Averages & Indicators', description: 'LTP trading above Daily 50 SMA' },
  { id: 'SUPERTREND_BUY', label: '🟢 Supertrend BUY Signal', category: 'Moving Averages & Indicators', description: 'Supertrend indicator is Bullish (Green)' },
  { id: 'VWAP_ABOVE', label: '📊 Price Above VWAP', category: 'Moving Averages & Indicators', description: 'LTP above Volume Weighted Avg Price' },
  { id: 'STOCH_RSI_OVERSOLD', label: '🔄 StochRSI Oversold (≤25)', category: 'Moving Averages & Indicators', description: 'Stochastic RSI turned oversold' },
  { id: 'MACD_BULLISH', label: '📊 MACD Bullish Crossover', category: 'Moving Averages & Indicators', description: 'MACD histogram positive or crossing up' },

  // Price Action & Candlesticks
  { id: 'BULLISH_100_MOVE', label: '💯 100% Bullish Breakout', category: 'Price Action & Candlesticks', description: 'Close > Open & PDC, Close >= High - 0.20*Range, Body/Range >= 0.65' },
  { id: 'BEARISH_100_MOVE', label: '💥 100% Bearish Breakdown', category: 'Price Action & Candlesticks', description: 'Close < Open & PDC, Close <= Low + 0.20*Range, Body/Range >= 0.60' },
  { id: 'OPEN_LOW', label: '🟢 Open = Low Pattern', category: 'Price Action & Candlesticks', description: 'Price opened at low of day (Bullish)' },
  { id: 'OPEN_HIGH', label: '🔴 Open = High Pattern', category: 'Price Action & Candlesticks', description: 'Price opened at high of day (Bearish)' },
  { id: 'HIGH_CLOSE', label: '🏆 High Close Pattern', category: 'Price Action & Candlesticks', description: 'Closing/CMP near high of 15m candle' },
  { id: 'VOL_INCREASING', label: '🔊 Volume Increasing / Surge', category: 'Price Action & Candlesticks', description: 'Volume exceeds 20-period average' },
  { id: 'POSITIVE_DAY_CHANGE', label: '💚 Positive Day Change (>0%)', category: 'Price Action & Candlesticks', description: 'Stock is green for the day' },
  { id: 'PRICE_GT_1500_TRENDING', label: '💰 Price > 1500 (Bull/Bear)', category: 'Price Action & Candlesticks', description: 'Price > 1500 and bullish or bearish trend' },
];

export const PRESET_RECIPES: PresetRecipe[] = [
  {
    id: 'HIGH_CONFIDENCE_SYSTEM',
    name: '🎯 14-Confluence High Confidence',
    description: '14 Mandatory Conditions (Trend, VWAP, EMA, HH/HL, Breakout, Retest, 30m Hold, Vol>1.2x, RSI 55-75, RR>=2)',
    optionKeys: ['HIGH_CONFIDENCE_TRADE', 'HIGH_CONFIDENCE_ENTRY'],
    badge: '14-Point Confluence'
  },
  {
    id: 'ULTRA_CONFLUENCE',
    name: '⚡ Ultra High Confluence',
    description: '4+ Confluence factors, Supertrend Buy & Above VWAP',
    optionKeys: ['HIGH_CONFLUENCE', 'SUPERTREND_BUY', 'VWAP_ABOVE', 'NO_FALSE_BREAKOUT'],
    badge: 'High Win Rate'
  },
  {
    id: 'BULLISH_BREAKOUT',
    name: '🚀 100% Bullish + Open=Low',
    description: '100% Bullish Move + Open=Low Drive + Volume Surge',
    optionKeys: ['BULLISH_100_MOVE', 'OPEN_LOW', 'VOL_INCREASING'],
    badge: 'Strong Momentum'
  },
  {
    id: 'SWEET_PULLBACK',
    name: '🍯 Golden Sweet Spot Pullback',
    description: 'RSI 40-55, Score ≥75 & 15m Pullback Bounce',
    optionKeys: ['BULLISH_SWEET_SPOT', 'HIGH_SCORE', 'PULLBACK_15M_BOUNCE'],
    badge: 'Prime Entry'
  },
  {
    id: 'HIGH_SUCCESS_RALLY',
    name: '🎯 High Success Rate Movers',
    description: '≥70% Success Rate + Supertrend Buy + Positive Day',
    optionKeys: ['HIGH_SUCCESS', 'POSITIVE_DAY_CHANGE', 'SUPERTREND_BUY'],
    badge: 'Proven Record'
  },
  {
    id: 'OVERSOLD_REVERSAL',
    name: '📉 Oversold Reversal Bounce',
    description: 'Oversold RSI <40 + StochRSI <25 + 15m Bounce',
    optionKeys: ['OVERSOLD', 'STOCH_RSI_OVERSOLD', 'PULLBACK_15M_BOUNCE'],
    badge: 'Dip Buying'
  }
];

export const RsiPullbackDashboard: React.FC<RsiPullbackDashboardProps> = ({
  stocks,
  faded100Log = [],
  onClearFadedLog,
  onSelectStockDetail,
  onOpenPositionSizer,
  onOpenRsiAnalyst,
  onFetchSingleStock,
  selectedDate = new Date().toISOString().split('T')[0],
  onDateChange,
  onFetchAll,
  isBulkLoading = false
}) => {
  const [activeFilter, setActiveFilter] = useState<PullbackFilterType>('ALL');
  const [globalPriceFilter, setGlobalPriceFilter] = useState<'ALL' | '1000_TO_2500' | 'ABOVE_2500'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('SCORE_DESC');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [expandedChecklistStockId, setExpandedChecklistStockId] = useState<string | null>(null);
  const [inspectHighConfidenceStock, setInspectHighConfidenceStock] = useState<StockCalculated | null>(null);

  // 🧪 Filter Recipe State
  const [selectedRecipeOptions, setSelectedRecipeOptions] = useState<string[]>([]);
  const [recipeMatchMode, setRecipeMatchMode] = useState<'ALL' | 'ANY'>('ALL');
  const [isRecipePanelOpen, setIsRecipePanelOpen] = useState<boolean>(false);

  const checkRecipeCondition = React.useCallback((stock: StockCalculated, analysis: RsiPullbackAnalysis, key: string): boolean => {
    const ltp = stock.closePrice || stock.openPrice || 0;
    switch (key) {
      case 'HIGH_CONFIDENCE_TRADE': {
        const hc = evaluateHighConfidenceTrade(stock);
        return hc.isHighConfidence;
      }
      case 'HIGH_CONFIDENCE_ENTRY': {
        const hc = evaluateHighConfidenceTrade(stock);
        return hc.isEntryTriggerActive;
      }
      case 'HIGH_CONFLUENCE':
        return analysis.confluenceValidation.status === 'HIGH_CONFLUENCE';
      case 'TRIGGERED_TODAY':
        return analysis.intradayConfluence.bullishConfluenceTime !== 'Not Met' || analysis.intradayConfluence.bearishConfluenceTime !== 'Not Met';
      case 'HIGH_SUCCESS':
        return !!(analysis.signalSuccessMetrics && analysis.signalSuccessMetrics.successRatePct >= 70);
      case 'TARGET_HIT':
        return !!(analysis.signalSuccessMetrics && analysis.signalSuccessMetrics.successRatePct >= 95);
      case 'NO_FALSE_BREAKOUT':
        return analysis.confluenceValidation.status !== 'FALSE_BREAKOUT_RISK';
      case 'BULLISH_SWEET_SPOT':
        return analysis.pullbackCategory === 'BULLISH_SWEET_SPOT';
      case 'BULLISH_MOMENTUM':
        return analysis.pullbackCategory === 'BULLISH_MOMENTUM';
      case 'OVERSOLD':
        return analysis.pullbackCategory === 'OVERSOLD_BOUNCE';
      case 'HIGH_SCORE':
        return analysis.pullbackScore >= 75;
      case 'PULLBACK_15M_BOUNCE':
        return !!(analysis.pullback15mBounce && analysis.pullback15mBounce.isPullbackBounce);
      case 'BULLISH_COMBO_1':
        return analyzeBullishCombinations(stock).combo1.isMatch;
      case 'BULLISH_COMBO_2':
        return analyzeBullishCombinations(stock).combo2.isMatch;
      case 'BULLISH_COMBO_3':
        return analyzeBullishCombinations(stock).combo3.isMatch;
      case 'BULLISH_COMBO_ALL':
        return analyzeBullishCombinations(stock).isAllCombosMet;
      case 'BULLISH_COMBO_ANY':
        return analyzeBullishCombinations(stock).isAnyComboMet;
      case 'ABOVE_50_SMA':
        return stock.trend === 'Very Bullish' || stock.trend === 'Bullish' || (stock.pctChange || 0) >= 0;
      case 'SUPERTREND_BUY':
        return stock.trend === 'Very Bullish' || stock.trend === 'Bullish' || analysis.bullishRally.score >= 50;
      case 'VWAP_ABOVE':
        return stock.vwapStatus === 'Above' || (stock.vwap ? ltp >= stock.vwap : false);
      case 'STOCH_RSI_OVERSOLD':
        return analysis.pullbackCategory === 'OVERSOLD_BOUNCE' || analysis.rsiVal <= 40;
      case 'MACD_BULLISH':
        return analysis.rsiDirection === 'UP' || analysis.bullishRally.score >= 50;
      case 'BULLISH_100_MOVE':
        return is100PercentBullishMove(stock);
      case 'BEARISH_100_MOVE':
        return is100PercentBearishMove(stock);
      case 'OPEN_LOW':
        return (stock.openPrice !== undefined && stock.openPrice !== null && stock.openPrice > 0)
          ? isOpenLowPattern(stock.openPrice, stock.lowPrice, stock.first15mLow)
          : false;
      case 'OPEN_HIGH':
        return (stock.openPrice !== undefined && stock.openPrice !== null && stock.openPrice > 0)
          ? isOpenHighPattern(stock.openPrice, stock.highPrice, stock.first15mHigh)
          : false;
      case 'HIGH_CLOSE': {
        const cmp = stock.closePrice || stock.openPrice;
        return (cmp !== undefined && cmp !== null && cmp > 0)
          ? isHighClosePattern(cmp, stock.highPrice, stock.first15mHigh, stock.openPrice)
          : false;
      }
      case 'VOL_INCREASING':
        return analysis.volumeDirection === 'INCREASING';
      case 'POSITIVE_DAY_CHANGE':
        return (stock.pctChange || 0) > 0;
      case 'PRICE_GT_1500_TRENDING':
        return ltp > 1500 && (analysis.bullishRally.score >= 50 || analysis.bearishRally.score >= 50 || (stock.trend && stock.trend !== 'Neutral'));
      default:
        return true;
    }
  }, []);

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

  const handleExportFadedCsv = () => {
    if (!faded100Log || faded100Log.length === 0) return;
    const headers = ['Symbol', 'Company', 'Fade Type', 'Disappeared Time', 'Reason', 'LTP', 'Open', 'High', 'Low', 'Change %', 'VWAP', 'RSI'];
    const rows = faded100Log.map((f) => [
      f.symbol,
      `"${(f.companyName || '').replace(/"/g, '""')}"`,
      f.fadeType,
      f.fadedAtTime,
      `"${(f.reason || '').replace(/"/g, '""')}"`,
      f.lastLtp,
      f.openPrice,
      f.highPrice,
      f.lowPrice,
      f.pctChange,
      f.vwap || '',
      f.rsi || ''
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Faded_100_Moves_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const [expanded15MinStockId, setExpanded15MinStockId] = useState<string | null>(null);
  const [isConfluenceGuideOpen, setIsConfluenceGuideOpen] = useState(false);
  
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

  // Compute RSI Pullback Analysis for all stocks for the selected trading date
  const analyzedStocks = useMemo(() => {
    return stocks.map((stock) => {
      const analysis = analyzeRsiPullback(stock, selectedDate);
      return {
        stock,
        analysis
      };
    });
  }, [stocks, selectedDate]);

  const recipeOptionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    RECIPE_OPTIONS.forEach((opt) => {
      counts[opt.id] = analyzedStocks.filter(({ stock, analysis }) => checkRecipeCondition(stock, analysis, opt.id)).length;
    });
    return counts;
  }, [analyzedStocks, checkRecipeCondition]);

  // Extract NIFTY, BANKNIFTY, and SENSEX for top pinned section
  const niftyIndex = useMemo(() => {
    return analyzedStocks.find((s) => s.stock.symbol === 'NIFTY');
  }, [analyzedStocks]);

  const bankNiftyIndex = useMemo(() => {
    return analyzedStocks.find((s) => s.stock.symbol === 'BANKNIFTY');
  }, [analyzedStocks]);

  const sensexIndex = useMemo(() => {
    return analyzedStocks.find((s) => s.stock.symbol === 'SENSEX');
  }, [analyzedStocks]);

  // Statistics
  const stats = useMemo(() => {
    let highConfidenceCount = 0;
    let highConfidenceTriggerActiveCount = 0;
    let highConfluenceCount = 0;
    let falseSignalRiskCount = 0;
    let triggeredTodayCount = 0;
    let bullish100Count = 0;
    let bearish100Count = 0;
    let bullishRallyCount = 0;
    let bearishRallyCount = 0;
    let bullishSweetSpot = 0;
    let bullishMomentum = 0;
    let oversold = 0;
    let highScore = 0;
    let openLowCount = 0;
    let openHighCount = 0;
    let highCloseCount = 0;
    let pullback15mBounceCount = 0;

    let totalSuccessPctSum = 0;
    let activeSignalCount = 0;
    let targetHitCount = 0;
    let highSuccessCount = 0;
    let priceGt1500Count = 0;

    analyzedStocks.forEach(({ stock, analysis }) => {
      const hc = evaluateHighConfidenceTrade(stock);
      if (hc.isHighConfidence) highConfidenceCount++;
      if (hc.isEntryTriggerActive) highConfidenceTriggerActiveCount++;

      if (analysis.confluenceValidation.status === 'HIGH_CONFLUENCE') highConfluenceCount++;
      if (analysis.confluenceValidation.status === 'FALSE_BREAKOUT_RISK') falseSignalRiskCount++;
      const isTriggered = analysis.intradayConfluence.bullishConfluenceTime !== 'Not Met' || analysis.intradayConfluence.bearishConfluenceTime !== 'Not Met';
      if (isTriggered) triggeredTodayCount++;
      if (is100PercentBullishMove(stock)) bullish100Count++;
      if (is100PercentBearishMove(stock)) bearish100Count++;
      if (analysis.bullishRally.score >= 65) bullishRallyCount++;
      if (analysis.bearishRally.score >= 65) bearishRallyCount++;
      if (analysis.pullbackCategory === 'BULLISH_SWEET_SPOT') bullishSweetSpot++;
      if (analysis.pullbackCategory === 'BULLISH_MOMENTUM') bullishMomentum++;
      if (analysis.pullbackCategory === 'OVERSOLD_BOUNCE') oversold++;
      if (analysis.pullbackScore >= 75) highScore++;
      if (analysis.pullback15mBounce && analysis.pullback15mBounce.isPullbackBounce) pullback15mBounceCount++;

      const price = stock.closePrice || stock.openPrice || 0;
      if (price > 1500 && (analysis.bullishRally.score >= 50 || analysis.bearishRally.score >= 50 || (stock.trend && stock.trend !== 'Neutral'))) {
        priceGt1500Count++;
      }

      if (analysis.signalSuccessMetrics && analysis.signalSuccessMetrics.hasSignal) {
        activeSignalCount++;
        totalSuccessPctSum += analysis.signalSuccessMetrics.successRatePct;
        if (analysis.signalSuccessMetrics.successRatePct >= 95) targetHitCount++;
        if (analysis.signalSuccessMetrics.successRatePct >= 70) highSuccessCount++;
      }

      const isOL = (stock.openPrice !== undefined && stock.openPrice !== null && stock.openPrice > 0)
        ? isOpenLowPattern(stock.openPrice, stock.lowPrice, stock.first15mLow)
        : false;
      const isOH = (stock.openPrice !== undefined && stock.openPrice !== null && stock.openPrice > 0)
        ? isOpenHighPattern(stock.openPrice, stock.highPrice, stock.first15mHigh)
        : false;
      const isHC = (stock.closePrice !== undefined && stock.closePrice !== null && stock.closePrice > 0)
        ? isHighClosePattern(stock.closePrice, stock.highPrice, stock.first15mHigh, stock.openPrice)
        : false;

      if (isOL) openLowCount++;
      if (isOH) openHighCount++;
      if (isHC) highCloseCount++;
    });

    const avgSuccessRate = activeSignalCount > 0
      ? Math.round((totalSuccessPctSum / activeSignalCount) * 10) / 10
      : 0;

    return {
      total: stocks.length,
      highConfidenceCount,
      highConfidenceTriggerActiveCount,
      highConfluenceCount,
      falseSignalRiskCount,
      triggeredTodayCount,
      bullish100Count,
      bearish100Count,
      bullishRallyCount,
      bearishRallyCount,
      bullishSweetSpot,
      bullishMomentum,
      oversold,
      highScore,
      openLowCount,
      openHighCount,
      highCloseCount,
      pullback15mBounceCount,
      avgSuccessRate,
      activeSignalCount,
      targetHitCount,
      highSuccessCount,
      priceGt1500Count
    };
  }, [analyzedStocks, stocks.length]);

  // Top 10 stocks by signal success rate
  const topSuccessStocks = useMemo(() => {
    return analyzedStocks
      .filter(item => item.analysis.signalSuccessMetrics && item.analysis.signalSuccessMetrics.hasSignal)
      .sort((a, b) => (b.analysis.signalSuccessMetrics?.successRatePct || 0) - (a.analysis.signalSuccessMetrics?.successRatePct || 0))
      .slice(0, 10);
  }, [analyzedStocks]);

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
      if (activeFilter === 'HIGH_CONFIDENCE_TRADE') {
        const hc = evaluateHighConfidenceTrade(stock);
        return hc.isHighConfidence;
      }
      if (activeFilter === 'HIGH_CONFLUENCE') {
        return analysis.confluenceValidation.status === 'HIGH_CONFLUENCE';
      }
      if (activeFilter === 'TRIGGERED_TODAY') {
        return analysis.intradayConfluence.bullishConfluenceTime !== 'Not Met' || analysis.intradayConfluence.bearishConfluenceTime !== 'Not Met';
      }
      if (activeFilter === 'HIGH_SUCCESS') {
        return analysis.signalSuccessMetrics && analysis.signalSuccessMetrics.successRatePct >= 70;
      }
      if (activeFilter === 'TARGET_HIT') {
        return analysis.signalSuccessMetrics && analysis.signalSuccessMetrics.successRatePct >= 95;
      }
      if (activeFilter === 'BULLISH_100_MOVE') {
        return is100PercentBullishMove(stock);
      }
      if (activeFilter === 'BEARISH_100_MOVE') {
        return is100PercentBearishMove(stock);
      }
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
        return (stock.openPrice !== undefined && stock.openPrice !== null && stock.openPrice > 0)
          ? isOpenLowPattern(stock.openPrice, stock.lowPrice, stock.first15mLow)
          : false;
      }
      if (activeFilter === 'OPEN_HIGH') {
        return (stock.openPrice !== undefined && stock.openPrice !== null && stock.openPrice > 0)
          ? isOpenHighPattern(stock.openPrice, stock.highPrice, stock.first15mHigh)
          : false;
      }
      if (activeFilter === 'HIGH_CLOSE') {
        const cmp = stock.closePrice || stock.openPrice;
        return (cmp !== undefined && cmp !== null && cmp > 0)
          ? isHighClosePattern(cmp, stock.highPrice, stock.first15mHigh, stock.openPrice)
          : false;
      }
      if (activeFilter === 'PULLBACK_15M_BOUNCE') {
        if (!(analysis.pullback15mBounce && analysis.pullback15mBounce.isPullbackBounce)) return false;
      }

      // 🧪 Filter Recipe multi-checkbox filtering
      if (selectedRecipeOptions.length > 0) {
        if (recipeMatchMode === 'ALL') {
          const matchesAll = selectedRecipeOptions.every((key) => checkRecipeCondition(stock, analysis, key));
          if (!matchesAll) return false;
        } else {
          const matchesAny = selectedRecipeOptions.some((key) => checkRecipeCondition(stock, analysis, key));
          if (!matchesAny) return false;
        }
      }

      const p = stock.closePrice || stock.openPrice || 0;
      if (globalPriceFilter === '1000_TO_2500') {
        if (p <= 1000 || p > 2500) return false;
      } else if (globalPriceFilter === 'ABOVE_2500') {
        if (p <= 2500) return false;
      }

      return true;
    });

    // Sorting (NIFTY, BANKNIFTY & SENSEX pinned at top unless searching specific query)
    list.sort((a, b) => {
      if (!searchQuery.trim()) {
        const isAIndex = a.stock.symbol === 'NIFTY' || a.stock.symbol === 'BANKNIFTY' || a.stock.symbol === 'SENSEX';
        const isBIndex = b.stock.symbol === 'NIFTY' || b.stock.symbol === 'BANKNIFTY' || b.stock.symbol === 'SENSEX';
        if (isAIndex && !isBIndex) return -1;
        if (!isAIndex && isBIndex) return 1;
        if (isAIndex && isBIndex) {
          const order: Record<string, number> = { 'NIFTY': 1, 'BANKNIFTY': 2, 'SENSEX': 3 };
          return (order[a.stock.symbol] || 9) - (order[b.stock.symbol] || 9);
        }
      }

      if (activeFilter === 'BULLISH_100_MOVE') {
        const scoreA = get100PercentBullishScore(a.stock);
        const scoreB = get100PercentBullishScore(b.stock);
        if (scoreB !== scoreA) return scoreB - scoreA;
      }

      if (activeFilter === 'BEARISH_100_MOVE') {
        const scoreA = get100PercentBearishScore(a.stock);
        const scoreB = get100PercentBearishScore(b.stock);
        if (scoreB !== scoreA) return scoreB - scoreA;
      }

      if (sortBy === 'SCORE_DESC') return b.analysis.pullbackScore - a.analysis.pullbackScore;
      if (sortBy === 'SUCCESS_RATE_DESC') return (b.analysis.signalSuccessMetrics?.successRatePct || 0) - (a.analysis.signalSuccessMetrics?.successRatePct || 0);
      if (sortBy === 'RSI_ASC') return a.analysis.rsiVal - b.analysis.rsiVal;
      if (sortBy === 'RSI_DESC') return b.analysis.rsiVal - a.analysis.rsiVal;
      if (sortBy === 'PCT_CHANGE_DESC') return (b.stock.pctChange || 0) - (a.stock.pctChange || 0);
      if (sortBy === 'VOLUME_DESC') return (b.stock.volume || 0) - (a.stock.volume || 0);
      return 0;
    });

    return list;
  }, [analyzedStocks, searchQuery, activeFilter, sortBy, selectedRecipeOptions, recipeMatchMode, checkRecipeCondition]);

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
              <span className="bg-blue-500/30 text-blue-200 text-[10px] px-2.5 py-0.5 rounded-full font-bold border border-blue-400/40 font-mono">
                📅 {selectedDate}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Detect high-conviction RSI pullbacks (40–55 sweet spot) above VWAP, oversold bounces (&lt;40 RSI), and bearish counter-rallies across Nifty F&amp;O stocks with calculated entry, stop loss, and risk-reward ratios.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => setIsConfluenceGuideOpen(!isConfluenceGuideOpen)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-1.5 border border-emerald-400/30"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-200" />
              <span>{isConfluenceGuideOpen ? 'Hide Confluence Rules' : '5 Rules to Avoid False Signals'}</span>
            </button>

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

      {/* Educational Panel: How 5 Confluences Eliminate False Signals */}
      {isConfluenceGuideOpen && (
        <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-black text-base text-white">How 5 Non-Negotiable Confluences Eliminate False Signals</h3>
                <p className="text-xs text-slate-300">Why stocks reverse after a Bullish/Bearish Rally signal and how our algorithm filters out fakeouts.</p>
              </div>
            </div>
            <button
              onClick={() => setIsConfluenceGuideOpen(false)}
              className="text-slate-400 hover:text-white text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700"
            >
              Close Guide ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-1.5">
              <div className="font-extrabold text-amber-400 flex items-center gap-1 text-[11px] uppercase">
                <span>1. VWAP Price Rule</span>
              </div>
              <p className="text-slate-300 text-[10.5px] leading-relaxed">
                <strong className="text-white">Bullish:</strong> MUST trade above VWAP.<br/>
                <strong className="text-rose-400">Why Signals Fail:</strong> Buying a rally below VWAP causes instant reversal because institutional supply dumps overhead.
              </p>
            </div>

            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-1.5">
              <div className="font-extrabold text-amber-400 flex items-center gap-1 text-[11px] uppercase">
                <span>2. RVOL Volume Surge</span>
              </div>
              <p className="text-slate-300 text-[10.5px] leading-relaxed">
                <strong className="text-white">Institutional Backing:</strong> RVOL &ge; 1.2x.<br/>
                <strong className="text-rose-400">Why Signals Fail:</strong> Rallies on low volume are retail traps; institutions easily push price down.
              </p>
            </div>

            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-1.5">
              <div className="font-extrabold text-amber-400 flex items-center gap-1 text-[11px] uppercase">
                <span>3. RSI Sweet Spot (45–68)</span>
              </div>
              <p className="text-slate-300 text-[10.5px] leading-relaxed">
                <strong className="text-white">No Overbought Trap:</strong> RSI between 45 and 68.<br/>
                <strong className="text-rose-400">Why Signals Fail:</strong> Buying when RSI &gt; 72 means buying at peak exhaustion right before profit-taking.
              </p>
            </div>

            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-1.5">
              <div className="font-extrabold text-amber-400 flex items-center gap-1 text-[11px] uppercase">
                <span>4. Small Wick Rejection</span>
              </div>
              <p className="text-slate-300 text-[10.5px] leading-relaxed">
                <strong className="text-white">Upper Wick &lt; 30%:</strong> Close near high.<br/>
                <strong className="text-rose-400">Why Signals Fail:</strong> A long upper wick proves sellers rejected higher prices before candle close.
              </p>
            </div>

            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-1.5">
              <div className="font-extrabold text-amber-400 flex items-center gap-1 text-[11px] uppercase">
                <span>5. Sector &amp; Trend Confluence</span>
              </div>
              <p className="text-slate-300 text-[10.5px] leading-relaxed">
                <strong className="text-white">Align with Market:</strong> Overall market direction.<br/>
                <strong className="text-rose-400">Why Signals Fail:</strong> Individual bullish breakouts fail 80% of time when Nifty/sector is collapsing.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bullish Filter Section */}
      <BullishFilterSection
        stocks={stocks}
        onSelectStockDetail={onSelectStockDetail}
        onOpenPositionSizer={onOpenPositionSizer}
        onSelectFilter={(fKey) => {
          if (fKey === 'BULLISH_COMBO_1') toggleRecipeOption('BULLISH_COMBO_1');
          else if (fKey === 'BULLISH_COMBO_2') toggleRecipeOption('BULLISH_COMBO_2');
          else if (fKey === 'BULLISH_COMBO_3') toggleRecipeOption('BULLISH_COMBO_3');
          else if (fKey === 'BULLISH_COMBO_ALL') toggleRecipeOption('BULLISH_COMBO_ALL');
          else if (fKey === 'BULLISH_COMBO_ANY') toggleRecipeOption('BULLISH_COMBO_ANY');
        }}
      />

      {/* Trading Date Selector Control Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl border border-blue-200/80">
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Trading Date Filter:</span>
              <span className="bg-blue-600 text-white text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-md shadow-2xs">
                {selectedDate}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Select any trading session date to view RSI pullbacks, 15m confluence triggers, and entry levels for that day.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-600 pl-2">Trading Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange?.(e.target.value)}
              className="bg-white text-slate-900 font-bold px-2 py-1 rounded-lg border border-slate-300 text-xs shadow-2xs outline-none cursor-pointer focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Quick Preset Date Buttons */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => onDateChange?.(new Date().toISOString().split('T')[0])}
              className={`px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                selectedDate === new Date().toISOString().split('T')[0]
                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => {
                const d = new Date();
                d.setDate(d.getDate() - 1);
                onDateChange?.(d.toISOString().split('T')[0]);
              }}
              className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition-all"
            >
              Yesterday
            </button>
            <button
              onClick={() => {
                const d = new Date();
                d.setDate(d.getDate() - 2);
                onDateChange?.(d.toISOString().split('T')[0]);
              }}
              className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition-all"
            >
              -2 Days
            </button>
          </div>

          {onFetchAll && (
            <button
              onClick={onFetchAll}
              disabled={isBulkLoading}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center space-x-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isBulkLoading ? 'animate-spin' : ''}`} />
              <span>Fetch Session Data</span>
            </button>
          )}
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
              <div className="bg-slate-900 text-white p-2.5 rounded-lg flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center space-x-1.5 font-bold text-amber-300">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>15m Intraday Confluence:</span>
                </div>
                <div className="flex items-center space-x-3 font-mono">
                  <span className="text-emerald-300">
                    🔥 Bull Met: <strong>{calcResult.analysis.intradayConfluence.bullishConfluenceTime}</strong> @ ₹{calcResult.analysis.intradayConfluence.bullishEntryPoint}
                  </span>
                  <span className="text-rose-300">
                    🔻 Bear Met: <strong>{calcResult.analysis.intradayConfluence.bearishConfluenceTime}</strong> @ ₹{calcResult.analysis.intradayConfluence.bearishEntryPoint}
                  </span>
                </div>
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

      {/* PINNED BENCHMARK INDICES AT VERY TOP: NIFTY 50, BANK NIFTY & BSE SENSEX */}
      {(niftyIndex || bankNiftyIndex || sensexIndex) && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                📌 Pinned Benchmark Indices Snapshot (NIFTY 50, BANK NIFTY &amp; BSE SENSEX)
              </h3>
            </div>
            <span className="text-[11px] text-slate-500 font-bold hidden sm:inline">
              Always Pinned at Top for Market Trend Direction &amp; Intraday Rally Signals
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* NIFTY 50 INDEX CARD */}
            {niftyIndex && (
              <div className={`bg-slate-900 text-white rounded-2xl p-4 border-2 shadow-md space-y-3 relative overflow-hidden group transition-all ${
                niftyIndex.analysis.pullback15mBounce?.isPullbackBounce
                  ? 'border-purple-400 ring-2 ring-purple-500/80 shadow-purple-500/30'
                  : 'border-amber-400/80'
              }`}>
                <div className="absolute top-0 right-0 bg-amber-400 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-bl-lg tracking-wider uppercase shadow-2xs">
                  📌 PINNED INDEX BENCHMARK
                </div>

                {/* 15m High Retest & Bounce Special Highlight Banner */}
                {niftyIndex.analysis.pullback15mBounce?.isPullbackBounce && (
                  <div className="bg-gradient-to-r from-purple-950 via-purple-900 to-indigo-950 text-white p-3 rounded-xl border-2 border-purple-400/90 shadow-lg space-y-1.5 animate-pulse">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-purple-200 uppercase tracking-wider flex items-center gap-1.5">
                        <Target className="w-4 h-4 text-purple-300 shrink-0" />
                        🎯 NIFTY 50: 15m High Retested &amp; Bounced!
                      </span>
                      <span className="bg-purple-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded shadow-xs font-mono">
                        BOUNCE @ {niftyIndex.analysis.pullback15mBounce.bounceTime}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-purple-100 flex items-center justify-between pt-1 border-t border-purple-800/80">
                      <span>15m High: <strong>₹{niftyIndex.analysis.pullback15mBounce.first15mHigh.toFixed(2)}</strong></span>
                      <span>Retest Low: <strong>₹{niftyIndex.analysis.pullback15mBounce.retestPrice.toFixed(2)}</strong></span>
                      <span className="text-emerald-300 font-extrabold">Gain: +{niftyIndex.analysis.pullback15mBounce.bouncePct.toFixed(2)}%</span>
                    </div>
                  </div>
                )}

                {/* Top Row: Symbol, Price, Change */}
                <div className="flex items-start justify-between border-b border-slate-800 pb-2.5">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-black text-xl text-white tracking-wide">
                        {niftyIndex.stock.companyName || 'NIFTY 50'}
                      </span>
                      <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10.5px] font-mono font-bold px-2 py-0.5 rounded-full">
                        Lot: {niftyIndex.stock.lotSizeAug2026 || niftyIndex.stock.lotSizeJul2026 || 75} shares
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 font-medium">Symbol: {niftyIndex.stock.symbol}</span>
                  </div>

                  <div className="text-right">
                    <div className="text-xl font-black text-white font-mono">
                      {niftyIndex.stock.closePrice !== undefined && niftyIndex.stock.closePrice !== null ? `₹${niftyIndex.stock.closePrice.toFixed(2)}` : 'N/A'}
                    </div>
                    <div className={`text-xs font-black ${
                      (niftyIndex.stock.pctChange || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {(niftyIndex.stock.pctChange || 0) >= 0 ? '+' : ''}{(niftyIndex.stock.pctChange || 0).toFixed(2)}%
                    </div>
                  </div>
                </div>

                {/* Middle Row: Bullish vs Bearish Rally Status & Trigger Times */}
                <div className="grid grid-cols-2 gap-2 text-[10.5px]">
                  {/* Bullish Rally Box */}
                  <div className={`p-2.5 rounded-xl border flex flex-col justify-between ${
                    niftyIndex.analysis.intradayConfluence.bullishConfluenceTime !== 'Not Met'
                      ? 'bg-emerald-950/90 border-emerald-500 text-white ring-1 ring-emerald-400'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
                  }`}>
                    <div className="flex items-center justify-between font-extrabold text-[10px] uppercase text-emerald-400 border-b border-slate-700/60 pb-1">
                      <span>🔥 Bullish Rally</span>
                      <span className="font-mono text-white">RSI {niftyIndex.analysis.rsiVal.toFixed(1)}</span>
                    </div>
                    <div className="font-mono mt-1 space-y-0.5">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Trigger Time:</span>
                        <strong className={niftyIndex.analysis.intradayConfluence.bullishConfluenceTime !== 'Not Met' ? 'text-amber-300' : 'text-slate-400'}>
                          {niftyIndex.analysis.intradayConfluence.bullishConfluenceTime}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Right Entry:</span>
                        <strong className="text-emerald-300 font-extrabold">
                          ₹{niftyIndex.analysis.intradayConfluence.bullishEntryPoint || niftyIndex.analysis.idealEntry}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Bearish Rally Box */}
                  <div className={`p-2.5 rounded-xl border flex flex-col justify-between ${
                    niftyIndex.analysis.intradayConfluence.bearishConfluenceTime !== 'Not Met'
                      ? 'bg-rose-950/90 border-rose-500 text-white ring-1 ring-rose-400'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
                  }`}>
                    <div className="flex items-center justify-between font-extrabold text-[10px] uppercase text-rose-400 border-b border-slate-700/60 pb-1">
                      <span>🔻 Bearish Rally</span>
                      <span className="font-mono text-white">RSI {niftyIndex.analysis.rsiVal.toFixed(1)}</span>
                    </div>
                    <div className="font-mono mt-1 space-y-0.5">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Trigger Time:</span>
                        <strong className={niftyIndex.analysis.intradayConfluence.bearishConfluenceTime !== 'Not Met' ? 'text-amber-300' : 'text-slate-400'}>
                          {niftyIndex.analysis.intradayConfluence.bearishConfluenceTime}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Right Entry:</span>
                        <strong className="text-rose-300 font-extrabold">
                          ₹{niftyIndex.analysis.intradayConfluence.bearishEntryPoint || niftyIndex.analysis.idealEntry}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 🎯 NIFTY SIGNAL SUCCESS PERCENTAGE RATE & FETCH TIME COMPARISON */}
                {niftyIndex.analysis.signalSuccessMetrics && niftyIndex.analysis.signalSuccessMetrics.hasSignal && (
                  <div className="bg-slate-950/90 text-white p-3 rounded-xl border border-slate-700 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                        <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">{niftyIndex.analysis.signalSuccessMetrics.signalName}</span>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border shrink-0 ${niftyIndex.analysis.signalSuccessMetrics.statusBadgeClass}`}>
                        {niftyIndex.analysis.signalSuccessMetrics.statusBadgeText}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10.5px] font-mono bg-slate-900 p-2 rounded-lg border border-slate-800">
                      <div>
                        <div className="text-slate-400 text-[9px] font-sans font-bold uppercase tracking-wider flex items-center gap-1 mb-0.5">
                          <Clock className="w-2.5 h-2.5 text-blue-400 shrink-0" />
                          <span>1st Triggered Time</span>
                        </div>
                        <div className="font-extrabold text-amber-300">{niftyIndex.analysis.signalSuccessMetrics.firstShownTime}</div>
                        <div className="text-slate-300 text-[10px]">Entry: ₹{niftyIndex.analysis.signalSuccessMetrics.firstShownPrice.toFixed(2)}</div>
                      </div>

                      <div className="text-right border-l border-slate-800 pl-2">
                        <div className="text-slate-400 text-[9px] font-sans font-bold uppercase tracking-wider flex items-center gap-1 justify-end mb-0.5">
                          <RefreshCw className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                          <span>New Fetch Time</span>
                        </div>
                        <div className="font-extrabold text-emerald-300">{niftyIndex.analysis.signalSuccessMetrics.latestFetchTime}</div>
                        <div className="text-white text-[10px]">
                          LTP: ₹{niftyIndex.analysis.signalSuccessMetrics.latestPrice.toFixed(2)}
                          <span className={`ml-1 font-bold ${niftyIndex.analysis.signalSuccessMetrics.priceChangePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            ({niftyIndex.analysis.signalSuccessMetrics.priceChangePct >= 0 ? '+' : ''}{niftyIndex.analysis.signalSuccessMetrics.priceChangePct.toFixed(2)}%)
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1 pt-0.5">
                      <div className="flex items-center justify-between text-[9.5px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <span>Target 1: ₹{niftyIndex.analysis.signalSuccessMetrics.targetPrice.toFixed(2)}</span>
                          <span className="text-[9px] text-slate-500">({niftyIndex.analysis.signalSuccessMetrics.timeElapsedStr} elapsed)</span>
                        </span>
                        <span className="font-bold text-emerald-300 font-mono">{niftyIndex.analysis.signalSuccessMetrics.successRatePct}% Success Rate</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden border border-slate-700/50">
                        <div 
                          className={`h-full transition-all duration-500 rounded-full ${
                            niftyIndex.analysis.signalSuccessMetrics.successRatePct >= 80 
                              ? 'bg-gradient-to-r from-emerald-500 to-green-400' 
                              : niftyIndex.analysis.signalSuccessMetrics.successRatePct >= 50 
                                ? 'bg-gradient-to-r from-teal-500 to-amber-400' 
                                : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(5, niftyIndex.analysis.signalSuccessMetrics.successRatePct))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Bottom Row: 5 Confluence Validation */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[10.5px]">
                  <div className="flex items-center space-x-1.5 font-bold text-slate-300">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Confluence Signal Quality:</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${niftyIndex.analysis.confluenceValidation.badgeColor}`}>
                    {niftyIndex.analysis.confluenceValidation.statusLabel}
                  </span>
                </div>
              </div>
            )}

            {/* BANK NIFTY INDEX CARD */}
            {bankNiftyIndex && (
              <div className={`bg-slate-900 text-white rounded-2xl p-4 border-2 shadow-md space-y-3 relative overflow-hidden group transition-all ${
                bankNiftyIndex.analysis.pullback15mBounce?.isPullbackBounce
                  ? 'border-purple-400 ring-2 ring-purple-500/80 shadow-purple-500/30'
                  : 'border-amber-400/80'
              }`}>
                <div className="absolute top-0 right-0 bg-amber-400 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-bl-lg tracking-wider uppercase shadow-2xs">
                  📌 PINNED INDEX BENCHMARK
                </div>

                {/* 15m High Retest & Bounce Special Highlight Banner */}
                {bankNiftyIndex.analysis.pullback15mBounce?.isPullbackBounce && (
                  <div className="bg-gradient-to-r from-purple-950 via-purple-900 to-indigo-950 text-white p-3 rounded-xl border-2 border-purple-400/90 shadow-lg space-y-1.5 animate-pulse">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-purple-200 uppercase tracking-wider flex items-center gap-1.5">
                        <Target className="w-4 h-4 text-purple-300 shrink-0" />
                        🎯 BANK NIFTY: 15m High Retested &amp; Bounced!
                      </span>
                      <span className="bg-purple-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded shadow-xs font-mono">
                        BOUNCE @ {bankNiftyIndex.analysis.pullback15mBounce.bounceTime}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-purple-100 flex items-center justify-between pt-1 border-t border-purple-800/80">
                      <span>15m High: <strong>₹{bankNiftyIndex.analysis.pullback15mBounce.first15mHigh.toFixed(2)}</strong></span>
                      <span>Retest Low: <strong>₹{bankNiftyIndex.analysis.pullback15mBounce.retestPrice.toFixed(2)}</strong></span>
                      <span className="text-emerald-300 font-extrabold">Gain: +{bankNiftyIndex.analysis.pullback15mBounce.bouncePct.toFixed(2)}%</span>
                    </div>
                  </div>
                )}

                {/* Top Row: Symbol, Price, Change */}
                <div className="flex items-start justify-between border-b border-slate-800 pb-2.5">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-black text-xl text-white tracking-wide">
                        {bankNiftyIndex.stock.companyName || 'BANK NIFTY'}
                      </span>
                      <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10.5px] font-mono font-bold px-2 py-0.5 rounded-full">
                        Lot: {bankNiftyIndex.stock.lotSizeAug2026 || bankNiftyIndex.stock.lotSizeJul2026 || 15} shares
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 font-medium">Symbol: {bankNiftyIndex.stock.symbol}</span>
                  </div>

                  <div className="text-right">
                    <div className="text-xl font-black text-white font-mono">
                      {bankNiftyIndex.stock.closePrice !== undefined && bankNiftyIndex.stock.closePrice !== null ? `₹${bankNiftyIndex.stock.closePrice.toFixed(2)}` : 'N/A'}
                    </div>
                    <div className={`text-xs font-black ${
                      (bankNiftyIndex.stock.pctChange || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {(bankNiftyIndex.stock.pctChange || 0) >= 0 ? '+' : ''}{(bankNiftyIndex.stock.pctChange || 0).toFixed(2)}%
                    </div>
                  </div>
                </div>

                {/* Middle Row: Bullish vs Bearish Rally Status & Trigger Times */}
                <div className="grid grid-cols-2 gap-2 text-[10.5px]">
                  {/* Bullish Rally Box */}
                  <div className={`p-2.5 rounded-xl border flex flex-col justify-between ${
                    bankNiftyIndex.analysis.intradayConfluence.bullishConfluenceTime !== 'Not Met'
                      ? 'bg-emerald-950/90 border-emerald-500 text-white ring-1 ring-emerald-400'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
                  }`}>
                    <div className="flex items-center justify-between font-extrabold text-[10px] uppercase text-emerald-400 border-b border-slate-700/60 pb-1">
                      <span>🔥 Bullish Rally</span>
                      <span className="font-mono text-white">RSI {bankNiftyIndex.analysis.rsiVal.toFixed(1)}</span>
                    </div>
                    <div className="font-mono mt-1 space-y-0.5">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Trigger Time:</span>
                        <strong className={bankNiftyIndex.analysis.intradayConfluence.bullishConfluenceTime !== 'Not Met' ? 'text-amber-300' : 'text-slate-400'}>
                          {bankNiftyIndex.analysis.intradayConfluence.bullishConfluenceTime}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Right Entry:</span>
                        <strong className="text-emerald-300 font-extrabold">
                          ₹{bankNiftyIndex.analysis.intradayConfluence.bullishEntryPoint || bankNiftyIndex.analysis.idealEntry}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Bearish Rally Box */}
                  <div className={`p-2.5 rounded-xl border flex flex-col justify-between ${
                    bankNiftyIndex.analysis.intradayConfluence.bearishConfluenceTime !== 'Not Met'
                      ? 'bg-rose-950/90 border-rose-500 text-white ring-1 ring-rose-400'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
                  }`}>
                    <div className="flex items-center justify-between font-extrabold text-[10px] uppercase text-rose-400 border-b border-slate-700/60 pb-1">
                      <span>🔻 Bearish Rally</span>
                      <span className="font-mono text-white">RSI {bankNiftyIndex.analysis.rsiVal.toFixed(1)}</span>
                    </div>
                    <div className="font-mono mt-1 space-y-0.5">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Trigger Time:</span>
                        <strong className={bankNiftyIndex.analysis.intradayConfluence.bearishConfluenceTime !== 'Not Met' ? 'text-amber-300' : 'text-slate-400'}>
                          {bankNiftyIndex.analysis.intradayConfluence.bearishConfluenceTime}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Right Entry:</span>
                        <strong className="text-rose-300 font-extrabold">
                          ₹{bankNiftyIndex.analysis.intradayConfluence.bearishEntryPoint || bankNiftyIndex.analysis.idealEntry}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 🎯 BANK NIFTY SIGNAL SUCCESS PERCENTAGE RATE & FETCH TIME COMPARISON */}
                {bankNiftyIndex.analysis.signalSuccessMetrics && bankNiftyIndex.analysis.signalSuccessMetrics.hasSignal && (
                  <div className="bg-slate-950/90 text-white p-3 rounded-xl border border-slate-700 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                        <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">{bankNiftyIndex.analysis.signalSuccessMetrics.signalName}</span>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border shrink-0 ${bankNiftyIndex.analysis.signalSuccessMetrics.statusBadgeClass}`}>
                        {bankNiftyIndex.analysis.signalSuccessMetrics.statusBadgeText}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10.5px] font-mono bg-slate-900 p-2 rounded-lg border border-slate-800">
                      <div>
                        <div className="text-slate-400 text-[9px] font-sans font-bold uppercase tracking-wider flex items-center gap-1 mb-0.5">
                          <Clock className="w-2.5 h-2.5 text-blue-400 shrink-0" />
                          <span>1st Triggered Time</span>
                        </div>
                        <div className="font-extrabold text-amber-300">{bankNiftyIndex.analysis.signalSuccessMetrics.firstShownTime}</div>
                        <div className="text-slate-300 text-[10px]">Entry: ₹{bankNiftyIndex.analysis.signalSuccessMetrics.firstShownPrice.toFixed(2)}</div>
                      </div>

                      <div className="text-right border-l border-slate-800 pl-2">
                        <div className="text-slate-400 text-[9px] font-sans font-bold uppercase tracking-wider flex items-center gap-1 justify-end mb-0.5">
                          <RefreshCw className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                          <span>New Fetch Time</span>
                        </div>
                        <div className="font-extrabold text-emerald-300">{bankNiftyIndex.analysis.signalSuccessMetrics.latestFetchTime}</div>
                        <div className="text-white text-[10px]">
                          LTP: ₹{bankNiftyIndex.analysis.signalSuccessMetrics.latestPrice.toFixed(2)}
                          <span className={`ml-1 font-bold ${bankNiftyIndex.analysis.signalSuccessMetrics.priceChangePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            ({bankNiftyIndex.analysis.signalSuccessMetrics.priceChangePct >= 0 ? '+' : ''}{bankNiftyIndex.analysis.signalSuccessMetrics.priceChangePct.toFixed(2)}%)
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1 pt-0.5">
                      <div className="flex items-center justify-between text-[9.5px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <span>Target 1: ₹{bankNiftyIndex.analysis.signalSuccessMetrics.targetPrice.toFixed(2)}</span>
                          <span className="text-[9px] text-slate-500">({bankNiftyIndex.analysis.signalSuccessMetrics.timeElapsedStr} elapsed)</span>
                        </span>
                        <span className="font-bold text-emerald-300 font-mono">{bankNiftyIndex.analysis.signalSuccessMetrics.successRatePct}% Success Rate</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden border border-slate-700/50">
                        <div 
                          className={`h-full transition-all duration-500 rounded-full ${
                            bankNiftyIndex.analysis.signalSuccessMetrics.successRatePct >= 80 
                              ? 'bg-gradient-to-r from-emerald-500 to-green-400' 
                              : bankNiftyIndex.analysis.signalSuccessMetrics.successRatePct >= 50 
                                ? 'bg-gradient-to-r from-teal-500 to-amber-400' 
                                : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(5, bankNiftyIndex.analysis.signalSuccessMetrics.successRatePct))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Bottom Row: 5 Confluence Validation */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[10.5px]">
                  <div className="flex items-center space-x-1.5 font-bold text-slate-300">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Confluence Signal Quality:</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${bankNiftyIndex.analysis.confluenceValidation.badgeColor}`}>
                    {bankNiftyIndex.analysis.confluenceValidation.statusLabel}
                  </span>
                </div>
              </div>
            )}

            {/* BSE SENSEX INDEX CARD */}
            {sensexIndex && (
              <div className={`bg-slate-900 text-white rounded-2xl p-4 border-2 shadow-md space-y-3 relative overflow-hidden group transition-all ${
                sensexIndex.analysis.pullback15mBounce?.isPullbackBounce
                  ? 'border-purple-400 ring-2 ring-purple-500/80 shadow-purple-500/30'
                  : 'border-amber-400/80'
              }`}>
                <div className="absolute top-0 right-0 bg-amber-400 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-bl-lg tracking-wider uppercase shadow-2xs">
                  📌 PINNED INDEX BENCHMARK
                </div>

                {/* 15m High Retest & Bounce Special Highlight Banner */}
                {sensexIndex.analysis.pullback15mBounce?.isPullbackBounce && (
                  <div className="bg-gradient-to-r from-purple-950 via-purple-900 to-indigo-950 text-white p-3 rounded-xl border-2 border-purple-400/90 shadow-lg space-y-1.5 animate-pulse">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-purple-200 uppercase tracking-wider flex items-center gap-1.5">
                        <Target className="w-4 h-4 text-purple-300 shrink-0" />
                        🎯 BSE SENSEX: 15m High Retested &amp; Bounced!
                      </span>
                      <span className="bg-purple-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded shadow-xs font-mono">
                        BOUNCE @ {sensexIndex.analysis.pullback15mBounce.bounceTime}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-purple-100 flex items-center justify-between pt-1 border-t border-purple-800/80">
                      <span>15m High: <strong>₹{sensexIndex.analysis.pullback15mBounce.first15mHigh.toFixed(2)}</strong></span>
                      <span>Retest Low: <strong>₹{sensexIndex.analysis.pullback15mBounce.retestPrice.toFixed(2)}</strong></span>
                      <span className="text-emerald-300 font-extrabold">Gain: +{sensexIndex.analysis.pullback15mBounce.bouncePct.toFixed(2)}%</span>
                    </div>
                  </div>
                )}

                {/* Top Row: Symbol, Price, Change */}
                <div className="flex items-start justify-between border-b border-slate-800 pb-2.5">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-black text-xl text-white tracking-wide">
                        {sensexIndex.stock.companyName || 'BSE SENSEX'}
                      </span>
                      <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10.5px] font-mono font-bold px-2 py-0.5 rounded-full">
                        Lot: {sensexIndex.stock.lotSizeAug2026 || sensexIndex.stock.lotSizeJul2026 || 10} shares
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 font-medium">Symbol: {sensexIndex.stock.symbol}</span>
                  </div>

                  <div className="text-right">
                    <div className="text-xl font-black text-white font-mono">
                      {sensexIndex.stock.closePrice !== undefined && sensexIndex.stock.closePrice !== null ? `₹${sensexIndex.stock.closePrice.toFixed(2)}` : 'N/A'}
                    </div>
                    <div className={`text-xs font-black ${
                      (sensexIndex.stock.pctChange || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {(sensexIndex.stock.pctChange || 0) >= 0 ? '+' : ''}{(sensexIndex.stock.pctChange || 0).toFixed(2)}%
                    </div>
                  </div>
                </div>

                {/* Middle Row: Bullish vs Bearish Rally Status & Trigger Times */}
                <div className="grid grid-cols-2 gap-2 text-[10.5px]">
                  {/* Bullish Rally Box */}
                  <div className={`p-2.5 rounded-xl border flex flex-col justify-between ${
                    sensexIndex.analysis.intradayConfluence.bullishConfluenceTime !== 'Not Met'
                      ? 'bg-emerald-950/90 border-emerald-500 text-white ring-1 ring-emerald-400'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
                  }`}>
                    <div className="flex items-center justify-between font-extrabold text-[10px] uppercase text-emerald-400 border-b border-slate-700/60 pb-1">
                      <span>🔥 Bullish Rally</span>
                      <span className="font-mono text-white">RSI {sensexIndex.analysis.rsiVal.toFixed(1)}</span>
                    </div>
                    <div className="font-mono mt-1 space-y-0.5">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Trigger Time:</span>
                        <strong className={sensexIndex.analysis.intradayConfluence.bullishConfluenceTime !== 'Not Met' ? 'text-amber-300' : 'text-slate-400'}>
                          {sensexIndex.analysis.intradayConfluence.bullishConfluenceTime}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Right Entry:</span>
                        <strong className="text-emerald-300 font-extrabold">
                          ₹{sensexIndex.analysis.intradayConfluence.bullishEntryPoint || sensexIndex.analysis.idealEntry}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Bearish Rally Box */}
                  <div className={`p-2.5 rounded-xl border flex flex-col justify-between ${
                    sensexIndex.analysis.intradayConfluence.bearishConfluenceTime !== 'Not Met'
                      ? 'bg-rose-950/90 border-rose-500 text-white ring-1 ring-rose-400'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
                  }`}>
                    <div className="flex items-center justify-between font-extrabold text-[10px] uppercase text-rose-400 border-b border-slate-700/60 pb-1">
                      <span>🔻 Bearish Rally</span>
                      <span className="font-mono text-white">RSI {sensexIndex.analysis.rsiVal.toFixed(1)}</span>
                    </div>
                    <div className="font-mono mt-1 space-y-0.5">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Trigger Time:</span>
                        <strong className={sensexIndex.analysis.intradayConfluence.bearishConfluenceTime !== 'Not Met' ? 'text-amber-300' : 'text-slate-400'}>
                          {sensexIndex.analysis.intradayConfluence.bearishConfluenceTime}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Right Entry:</span>
                        <strong className="text-rose-300 font-extrabold">
                          ₹{sensexIndex.analysis.intradayConfluence.bearishEntryPoint || sensexIndex.analysis.idealEntry}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 🎯 SENSEX SIGNAL SUCCESS PERCENTAGE RATE & FETCH TIME COMPARISON */}
                {sensexIndex.analysis.signalSuccessMetrics && sensexIndex.analysis.signalSuccessMetrics.hasSignal && (
                  <div className="bg-slate-950/90 text-white p-3 rounded-xl border border-slate-700 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                        <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">{sensexIndex.analysis.signalSuccessMetrics.signalName}</span>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border shrink-0 ${sensexIndex.analysis.signalSuccessMetrics.statusBadgeClass}`}>
                        {sensexIndex.analysis.signalSuccessMetrics.statusBadgeText}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10.5px] font-mono bg-slate-900 p-2 rounded-lg border border-slate-800">
                      <div>
                        <div className="text-slate-400 text-[9px] font-sans font-bold uppercase tracking-wider flex items-center gap-1 mb-0.5">
                          <Clock className="w-2.5 h-2.5 text-blue-400 shrink-0" />
                          <span>1st Triggered Time</span>
                        </div>
                        <div className="font-extrabold text-amber-300">{sensexIndex.analysis.signalSuccessMetrics.firstShownTime}</div>
                        <div className="text-slate-300 text-[10px]">Entry: ₹{sensexIndex.analysis.signalSuccessMetrics.firstShownPrice.toFixed(2)}</div>
                      </div>

                      <div className="text-right border-l border-slate-800 pl-2">
                        <div className="text-slate-400 text-[9px] font-sans font-bold uppercase tracking-wider flex items-center gap-1 justify-end mb-0.5">
                          <RefreshCw className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                          <span>New Fetch Time</span>
                        </div>
                        <div className="font-extrabold text-emerald-300">{sensexIndex.analysis.signalSuccessMetrics.latestFetchTime}</div>
                        <div className="text-white text-[10px]">
                          LTP: ₹{sensexIndex.analysis.signalSuccessMetrics.latestPrice.toFixed(2)}
                          <span className={`ml-1 font-bold ${sensexIndex.analysis.signalSuccessMetrics.priceChangePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            ({sensexIndex.analysis.signalSuccessMetrics.priceChangePct >= 0 ? '+' : ''}{sensexIndex.analysis.signalSuccessMetrics.priceChangePct.toFixed(2)}%)
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1 pt-0.5">
                      <div className="flex items-center justify-between text-[9.5px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <span>Target 1: ₹{sensexIndex.analysis.signalSuccessMetrics.targetPrice.toFixed(2)}</span>
                          <span className="text-[9px] text-slate-500">({sensexIndex.analysis.signalSuccessMetrics.timeElapsedStr} elapsed)</span>
                        </span>
                        <span className="font-bold text-emerald-300 font-mono">{sensexIndex.analysis.signalSuccessMetrics.successRatePct}% Success Rate</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden border border-slate-700/50">
                        <div 
                          className={`h-full transition-all duration-500 rounded-full ${
                            sensexIndex.analysis.signalSuccessMetrics.successRatePct >= 80 
                              ? 'bg-gradient-to-r from-emerald-500 to-green-400' 
                              : sensexIndex.analysis.signalSuccessMetrics.successRatePct >= 50 
                                ? 'bg-gradient-to-r from-teal-500 to-amber-400' 
                                : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(5, sensexIndex.analysis.signalSuccessMetrics.successRatePct))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Bottom Row: 5 Confluence Validation */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[10.5px]">
                  <div className="flex items-center space-x-1.5 font-bold text-slate-300">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Confluence Signal Quality:</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${sensexIndex.analysis.confluenceValidation.badgeColor}`}>
                    {sensexIndex.analysis.confluenceValidation.statusLabel}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats Overview Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* Signal Success Rate KPI Card */}
        <button
          onClick={() => setActiveFilter(activeFilter === 'HIGH_SUCCESS' ? 'ALL' : 'HIGH_SUCCESS')}
          className={`p-4 rounded-2xl border text-left transition-all col-span-2 sm:col-span-2 ${
            activeFilter === 'HIGH_SUCCESS'
              ? 'bg-emerald-800 text-white border-emerald-900 ring-2 ring-emerald-400/50 shadow-md'
              : 'bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white border-emerald-500/60 hover:border-emerald-400 shadow-2xs'
          }`}
        >
          <div className="text-[11px] font-black uppercase tracking-wider text-emerald-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400 shrink-0" />
              <span>🎯 Signal Success Rate</span>
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl font-black text-white font-mono">{stats.avgSuccessRate}%</span>
            <span className="text-xs text-emerald-300 font-bold font-mono">Avg Performance</span>
          </div>
          <div className="text-[10.5px] mt-1 font-bold text-slate-300 flex items-center justify-between border-t border-slate-800 pt-1">
            <span>{stats.highSuccessCount} High Success</span>
            <span className="text-emerald-400">({stats.targetHitCount} Target Hits)</span>
          </div>
        </button>

        {/* High-Confidence Trade System (14 Mandatory Conditions) */}
        <button
          onClick={() => setActiveFilter(activeFilter === 'HIGH_CONFIDENCE_TRADE' ? 'ALL' : 'HIGH_CONFIDENCE_TRADE')}
          className={`p-4 rounded-2xl border text-left transition-all col-span-2 sm:col-span-2 cursor-pointer ${
            activeFilter === 'HIGH_CONFIDENCE_TRADE'
              ? 'bg-amber-500 text-slate-950 border-amber-300 ring-2 ring-yellow-300 font-bold shadow-md'
              : 'bg-gradient-to-br from-slate-900 via-amber-950/80 to-slate-900 text-white border-amber-500/60 hover:border-amber-400 shadow-2xs'
          }`}
          title="Click to filter stocks meeting all 14 mandatory conditions (Higher TF Trend, VWAP, EMA, HH/HL, Breakout, Retest, 30m Hold, Vol>1.2x, RSI 55-75, RR>=2)"
        >
          <div className="text-[11px] font-black uppercase tracking-wider text-yellow-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-yellow-400 fill-current animate-pulse" />
              <span>🎯 High-Confidence Trade</span>
            </span>
            <span className="text-[10px] font-mono font-black bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded">
              14/14 Confluence
            </span>
          </div>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl font-black text-white font-mono">{stats.highConfidenceCount}</span>
            <span className="text-xs text-yellow-200 font-bold font-mono">14 Conditions Met</span>
          </div>
          <div className="text-[10.5px] mt-1 font-bold text-slate-300 flex items-center justify-between border-t border-slate-800 pt-1">
            <span>{stats.highConfidenceTriggerActiveCount} Entry Triggers Active</span>
            <span className="text-emerald-400">Strict Rules</span>
          </div>
        </button>

        {/* Total Scanned */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Scanned</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{stats.total}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span>Nifty F&amp;O Stocks</span>
          </div>
        </div>

        {/* 100% Bullish Move */}
        <button
          onClick={() => setActiveFilter(activeFilter === 'BULLISH_100_MOVE' ? 'ALL' : 'BULLISH_100_MOVE')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeFilter === 'BULLISH_100_MOVE'
              ? 'bg-emerald-700 text-white border-emerald-800 ring-2 ring-emerald-400/50 shadow-sm'
              : 'bg-emerald-100/90 border-emerald-300 hover:border-emerald-500 shadow-2xs'
          }`}
        >
          <div className={`text-[11px] font-black uppercase tracking-wider flex items-center justify-between ${
            activeFilter === 'BULLISH_100_MOVE' ? 'text-emerald-100' : 'text-emerald-950'
          }`}>
            <span>💯 100% Bullish</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className={`text-2xl font-black mt-1 ${
            activeFilter === 'BULLISH_100_MOVE' ? 'text-white' : 'text-emerald-950'
          }`}>{stats.bullish100Count}</div>
          <div className={`text-[10px] mt-1 font-bold ${
            activeFilter === 'BULLISH_100_MOVE' ? 'text-emerald-100' : 'text-emerald-800'
          }`}>
            Close &gt; Open &amp; PDC
          </div>
        </button>

        {/* 100% Bearish Move */}
        <button
          onClick={() => setActiveFilter(activeFilter === 'BEARISH_100_MOVE' ? 'ALL' : 'BEARISH_100_MOVE')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeFilter === 'BEARISH_100_MOVE'
              ? 'bg-rose-700 text-white border-rose-800 ring-2 ring-rose-400/50 shadow-sm'
              : 'bg-rose-100/90 border-rose-300 hover:border-rose-500 shadow-2xs'
          }`}
        >
          <div className={`text-[11px] font-black uppercase tracking-wider flex items-center justify-between ${
            activeFilter === 'BEARISH_100_MOVE' ? 'text-rose-100' : 'text-rose-950'
          }`}>
            <span>💥 100% Bearish</span>
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
          </div>
          <div className={`text-2xl font-black mt-1 ${
            activeFilter === 'BEARISH_100_MOVE' ? 'text-white' : 'text-rose-950'
          }`}>{stats.bearish100Count}</div>
          <div className={`text-[10px] mt-1 font-bold ${
            activeFilter === 'BEARISH_100_MOVE' ? 'text-rose-100' : 'text-rose-800'
          }`}>
            Close &lt; Open &amp; PDC
          </div>
        </button>

        {/* Disappeared / Faded 100% Moves Stat Card */}
        <button
          onClick={() => setActiveFilter(activeFilter === 'FADED_100_MOVE' ? 'ALL' : 'FADED_100_MOVE')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeFilter === 'FADED_100_MOVE'
              ? 'bg-amber-700 text-white border-amber-800 ring-2 ring-amber-400/50 shadow-sm'
              : 'bg-amber-100/90 border-amber-300 hover:border-amber-500 shadow-2xs'
          }`}
        >
          <div className={`text-[11px] font-black uppercase tracking-wider flex items-center justify-between ${
            activeFilter === 'FADED_100_MOVE' ? 'text-amber-100' : 'text-amber-950'
          }`}>
            <span>⚠️ Faded 100% Moves</span>
            {faded100Log && faded100Log.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            )}
          </div>
          <div className={`text-2xl font-black mt-1 ${
            activeFilter === 'FADED_100_MOVE' ? 'text-white' : 'text-amber-950'
          }`}>{faded100Log ? faded100Log.length : 0}</div>
          <div className={`text-[10px] mt-1 font-bold ${
            activeFilter === 'FADED_100_MOVE' ? 'text-amber-100' : 'text-amber-800'
          }`}>
            Disappeared / Lost 100% Status
          </div>
        </button>


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
            Score &ge; 65
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
            Score &ge; 65
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

      {/* 🏆 LEADERBOARD: HIGHEST SIGNAL SUCCESS PERCENTAGE STOCKS */}
      {topSuccessStocks.length > 0 && (
        <div className="bg-slate-900 text-white rounded-2xl p-4 border border-emerald-500/40 shadow-md space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                <Zap className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="font-black text-base text-white tracking-wide flex items-center gap-2">
                  <span>🏆 Leaderboard: Top Signal Success Percentage Stocks</span>
                  <span className="text-xs bg-emerald-950 text-emerald-300 font-mono px-2 py-0.5 rounded-full border border-emerald-600">
                    {topSuccessStocks.length} Ranked
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Ranked by highest success rate from signal first triggered time (09:15 AM/confluence) to current user fetch time.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setActiveFilter('HIGH_SUCCESS');
                setSortBy('SUCCESS_RATE_DESC');
              }}
              className="text-xs font-bold text-emerald-300 hover:text-emerald-200 bg-emerald-950/80 hover:bg-emerald-900 px-3 py-1.5 rounded-xl border border-emerald-500/50 flex items-center gap-1.5 self-start sm:self-auto transition-all"
            >
              <span>View All ({stats.highSuccessCount}) High Success</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {topSuccessStocks.slice(0, 5).map(({ stock, analysis }, idx) => {
              const m = analysis.signalSuccessMetrics;
              if (!m) return null;
              return (
                <div 
                  key={stock.symbol}
                  className="bg-slate-950 p-3 rounded-xl border border-slate-800 hover:border-emerald-500/60 transition-all flex flex-col justify-between space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black text-amber-400 font-mono">#{idx + 1}</span>
                        <span className="font-black text-sm text-white">{stock.symbol}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                        {m.signalName}
                      </div>
                    </div>
                    <span className={`text-[9.5px] font-black px-1.5 py-0.5 rounded border ${m.statusBadgeClass}`}>
                      {m.successRatePct}%
                    </span>
                  </div>

                  <div className="text-[10px] font-mono bg-slate-900/90 p-1.5 rounded border border-slate-800 space-y-0.5">
                    <div className="flex justify-between text-slate-400">
                      <span>1st Shown:</span>
                      <span className="text-amber-300 font-bold">{m.firstShownTime} (₹{m.firstShownPrice.toFixed(1)})</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>New Fetch:</span>
                      <span className="text-emerald-300 font-bold">{m.latestFetchTime} (₹{m.latestPrice.toFixed(1)})</span>
                    </div>
                    <div className="flex justify-between font-bold pt-0.5 border-t border-slate-800">
                      <span>Net Gain:</span>
                      <span className={m.priceChangePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {m.priceChangePct >= 0 ? '+' : ''}{m.priceChangePct.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 🚀 BULLISH COMBINATIONS SCREENER */}
      <BullishFilterSection
        stocks={stocks}
        onSelectStockDetail={onSelectStockDetail}
        onOpenPositionSizer={onOpenPositionSizer}
      />

      {/* 🧪 FILTER RECIPE BUILDER PANEL */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-indigo-500/40 shadow-lg space-y-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <SlidersHorizontal className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base text-white tracking-wide">
                  🧪 Filter Recipe Screener
                </h3>
                {selectedRecipeOptions.length > 0 && (
                  <span className="text-xs font-mono font-bold bg-indigo-950 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-500/50">
                    {selectedRecipeOptions.length} {selectedRecipeOptions.length === 1 ? 'Condition' : 'Conditions'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Select checkbox options to build a custom technical recipe. Filter displays only stocks satisfying your selected conditions.
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
            <span>1-Click Preset Recipes:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {PRESET_RECIPES.map((preset) => {
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
            {['Confluence & Signals', 'RSI & Pullback Setup', 'Moving Averages & Indicators', 'Price Action & Candlesticks'].map((category) => {
              const options = RECIPE_OPTIONS.filter((o) => o.category === category);
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
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-3.5 rounded-2xl border border-indigo-500/40 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
              <SlidersHorizontal className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-sm text-white">🧪 Custom Recipe Filter Active:</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-900 text-indigo-200 border border-indigo-500/50">
                  {selectedRecipeOptions.length} {selectedRecipeOptions.length === 1 ? 'Rule' : 'Rules'} ({recipeMatchMode} Mode)
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Showing <span className="font-extrabold text-emerald-300 font-mono text-sm">{filteredStocks.length}</span> of {stocks.length} stocks matching your checkbox criteria.
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
            onClick={() => setActiveFilter('BULLISH_100_MOVE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border flex items-center gap-1 ${
              activeFilter === 'BULLISH_100_MOVE'
                ? 'bg-emerald-700 text-white border-emerald-800 shadow-2xs ring-2 ring-emerald-300'
                : 'bg-emerald-100 text-emerald-950 hover:bg-emerald-200 border-emerald-300'
            }`}
          >
            <span>💯 100% Bullish ({stats.bullish100Count})</span>
          </button>

          <button
            onClick={() => setActiveFilter('BEARISH_100_MOVE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border flex items-center gap-1 ${
              activeFilter === 'BEARISH_100_MOVE'
                ? 'bg-rose-700 text-white border-rose-800 shadow-2xs ring-2 ring-rose-300'
                : 'bg-rose-100 text-rose-950 hover:bg-rose-200 border-rose-300'
            }`}
          >
            <span>💥 100% Bearish ({stats.bearish100Count})</span>
          </button>

          <button
            onClick={() => setActiveFilter('FADED_100_MOVE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border flex items-center gap-1 ${
              activeFilter === 'FADED_100_MOVE'
                ? 'bg-amber-700 text-white border-amber-800 shadow-2xs ring-2 ring-amber-300'
                : 'bg-amber-100 text-amber-950 hover:bg-amber-200 border-amber-300'
            }`}
          >
            <span>⚠️ Faded 100% Moves ({faded100Log?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveFilter('HIGH_CONFLUENCE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1 ${
              activeFilter === 'HIGH_CONFLUENCE'
                ? 'bg-blue-600 text-white border-blue-700 shadow-2xs'
                : 'bg-blue-50 text-blue-900 hover:bg-blue-100 border-blue-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
            <span>🛡️ Verified High Confluence ({stats.highConfluenceCount})</span>
          </button>

          <button
            onClick={() => setActiveFilter('TRIGGERED_TODAY')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1 ${
              activeFilter === 'TRIGGERED_TODAY'
                ? 'bg-amber-600 text-white border-amber-700 shadow-2xs'
                : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border-amber-200'
            }`}
          >
            <span>⏱️ Triggered Today ({stats.triggeredTodayCount})</span>
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
            onClick={() => setActiveFilter(activeFilter === 'HIGH_CONFIDENCE_TRADE' ? 'ALL' : 'HIGH_CONFIDENCE_TRADE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1 ${
              activeFilter === 'HIGH_CONFIDENCE_TRADE'
                ? 'bg-amber-500 text-slate-950 border-amber-300 font-extrabold shadow-sm ring-2 ring-yellow-300'
                : 'bg-amber-50 text-amber-950 hover:bg-amber-100 border-amber-300/80 font-bold'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-500 fill-current animate-pulse" />
            <span>🎯 High-Confidence ({stats.highConfidenceCount})</span>
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
            onClick={() => setActiveFilter(activeFilter === 'OPEN_LOW' ? 'ALL' : 'OPEN_LOW')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1 ${
              activeFilter === 'OPEN_LOW'
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border-emerald-200'
            }`}
          >
            <span>🟢 Open = Low ({stats.openLowCount})</span>
          </button>

          <button
            onClick={() => setActiveFilter(activeFilter === 'OPEN_HIGH' ? 'ALL' : 'OPEN_HIGH')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1 ${
              activeFilter === 'OPEN_HIGH'
                ? 'bg-rose-600 text-white border-rose-700 shadow-2xs'
                : 'bg-rose-50 text-rose-900 hover:bg-rose-100 border-rose-200'
            }`}
          >
            <span>🔴 Open = High ({stats.openHighCount})</span>
          </button>

          <button
            onClick={() => setActiveFilter(activeFilter === 'HIGH_CLOSE' ? 'ALL' : 'HIGH_CLOSE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1 ${
              activeFilter === 'HIGH_CLOSE'
                ? 'bg-blue-600 text-white border-blue-700 shadow-2xs'
                : 'bg-blue-50 text-blue-900 hover:bg-blue-100 border-blue-200'
            }`}
          >
            <span>🔵 High = Close ({stats.highCloseCount})</span>
          </button>

          <button
            onClick={() => setActiveFilter(activeFilter === 'PULLBACK_15M_BOUNCE' ? 'ALL' : 'PULLBACK_15M_BOUNCE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border flex items-center gap-1.5 ${
              activeFilter === 'PULLBACK_15M_BOUNCE'
                ? 'bg-purple-700 text-white border-purple-800 shadow-2xs ring-2 ring-purple-400/50'
                : 'bg-purple-50 text-purple-950 hover:bg-purple-100 border-purple-300'
            }`}
          >
            <Target className="w-3.5 h-3.5 text-purple-600 shrink-0" />
            <span>🎯 15m High Retest &amp; Bounce ({stats.pullback15mBounceCount})</span>
          </button>
        </div>

        {/* Global Price Filters */}
        <div className="flex items-center space-x-2 w-full md:w-auto border-l md:border-l-0 md:border-r border-slate-200 pl-2 pr-2">
           <button
            onClick={() => setGlobalPriceFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1 ${
              globalPriceFilter === 'ALL'
                ? 'bg-slate-700 text-white shadow-md border-slate-800'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300'
            }`}
          >
            All Prices
          </button>
           <button
            onClick={() => setGlobalPriceFilter('1000_TO_2500')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1 ${
              globalPriceFilter === '1000_TO_2500'
                ? 'bg-fuchsia-600 text-white border-fuchsia-700 shadow-md ring-2 ring-fuchsia-300'
                : 'bg-fuchsia-50 text-fuchsia-900 hover:bg-fuchsia-100 border-fuchsia-200'
            }`}
          >
            ₹1000 - ₹2500
          </button>
           <button
            onClick={() => setGlobalPriceFilter('ABOVE_2500')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1 ${
              globalPriceFilter === 'ABOVE_2500'
                ? 'bg-fuchsia-600 text-white border-fuchsia-700 shadow-md ring-2 ring-fuchsia-300'
                : 'bg-fuchsia-50 text-fuchsia-900 hover:bg-fuchsia-100 border-fuchsia-200'
            }`}
          >
            &gt; ₹2500
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

      {/* Main Stock List or Faded Moves View */}
      {activeFilter === 'FADED_100_MOVE' ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-6">
          {/* Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <span className="text-amber-500">⚠️</span>
                  <span>Disappeared / Faded 100% Moves Log</span>
                </h3>
                <span className="bg-amber-100 text-amber-900 font-bold text-xs px-2.5 py-0.5 rounded-full border border-amber-300">
                  {faded100Log ? faded100Log.length : 0} Stocks Disappeared
                </span>
              </div>
              <p className="text-xs text-slate-500 max-w-3xl leading-relaxed">
                Real-time &amp; intraday session tracking of stocks that qualified for <strong>100% Bullish Move</strong> or <strong>100% Bearish Move</strong> earlier, but lost status due to VWAP breakdown, candle color reversal, or RSI momentum drop.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleExportFadedCsv}
                disabled={!faded100Log || faded100Log.length === 0}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-2xs transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={onClearFadedLog}
                disabled={!faded100Log || faded100Log.length === 0}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 disabled:opacity-50 font-bold text-xs rounded-xl border border-rose-200 transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Disappeared Log</span>
              </button>
            </div>
          </div>

          {/* List of Faded Records */}
          {(!faded100Log || faded100Log.length === 0) ? (
            <div className="text-center py-16 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              </div>
              <div className="text-sm font-bold text-slate-800">No Disappeared 100% Moves Recorded Yet</div>
              <div className="text-xs text-slate-500 max-w-md mx-auto">
                When a stock triggers a 100% Bullish or 100% Bearish move and later breaks VWAP, turns color, or loses momentum, it will be automatically captured here with exact time &amp; breakdown cause.
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {faded100Log
                .filter((item) => {
                  if (!searchQuery.trim()) return true;
                  const q = searchQuery.toLowerCase();
                  return item.symbol.toLowerCase().includes(q) || item.companyName.toLowerCase().includes(q);
                })
                .map((item) => {
                  const matchStock = stocks.find((s) => s.symbol === item.symbol);
                  const isBullishFade = item.fadeType === '100% Bullish Move';

                  return (
                    <div
                      key={item.id}
                      className={`p-5 rounded-2xl border transition-all space-y-4 shadow-2xs hover:shadow-md ${
                        isBullishFade
                          ? 'bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 border-amber-200'
                          : 'bg-gradient-to-br from-rose-50/70 via-white to-rose-50/30 border-rose-200'
                      }`}
                    >
                      {/* Title Bar */}
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-900 text-lg">{item.symbol}</span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                              isBullishFade
                                ? 'bg-amber-100 text-amber-950 border-amber-300'
                                : 'bg-rose-100 text-rose-950 border-rose-300'
                            }`}>
                              <span>{isBullishFade ? '💯 100% Bullish Faded' : '💥 100% Bearish Faded'}</span>
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 line-clamp-1">{item.companyName}</div>
                        </div>

                        {/* Disappearance Time Badge */}
                        <div className="text-right shrink-0">
                          <div className="bg-slate-900 text-amber-300 text-[11px] font-mono font-black px-2.5 py-1 rounded-xl shadow-2xs flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-400" />
                            <span>Disappeared @ {item.fadedAtTime}</span>
                          </div>
                        </div>
                      </div>

                      {/* Breakdown Reason Box */}
                      <div className={`p-3 rounded-xl text-xs font-semibold leading-relaxed flex items-start gap-2 border ${
                        isBullishFade
                          ? 'bg-amber-100/80 text-amber-950 border-amber-300'
                          : 'bg-rose-100/80 text-rose-950 border-rose-300'
                      }`}>
                        <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${isBullishFade ? 'text-amber-700' : 'text-rose-700'}`} />
                        <div>
                          <span className="font-black underline uppercase tracking-wider block mb-0.5">Fade / Disappearance Cause:</span>
                          <span>{item.reason}</span>
                        </div>
                      </div>

                      {/* Price Metrics Bar */}
                      <div className="grid grid-cols-4 gap-2 bg-slate-50/80 p-3 rounded-xl text-center border border-slate-200/60">
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase">LTP</div>
                          <div className="text-xs font-black text-slate-900">₹{item.lastLtp.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase">Change</div>
                          <div className={`text-xs font-black ${item.pctChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {item.pctChange >= 0 ? '+' : ''}{item.pctChange.toFixed(2)}%
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase">VWAP</div>
                          <div className="text-xs font-black text-slate-800">
                            {item.vwap ? `₹${item.vwap.toFixed(2)}` : '—'}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase">RSI</div>
                          <div className="text-xs font-black text-slate-800">
                            {item.rsi ? item.rsi.toFixed(1) : '—'}
                          </div>
                        </div>
                      </div>

                      {/* Inspect Stock Button */}
                      {matchStock && (
                        <button
                          onClick={() => onSelectStockDetail(matchStock)}
                          className="w-full py-2 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 shadow-2xs transition-colors flex items-center justify-center gap-1.5"
                        >
                          <span>Inspect Full Stock Technicals</span>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      ) : filteredStocks.length === 0 ? (
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

            const lotSize = stock.lotSizeAug2026 || stock.lotSizeJul2026 || stock.lotSizeJun2026 || 500;
            const cmp = stock.closePrice || stock.openPrice || 100;
            const contractValue = cmp * lotSize;
            const marginEst = contractValue * 0.20;

            const isBullTriggered = analysis.intradayConfluence.bullishConfluenceTime !== 'Not Met';
            const isBearTriggered = analysis.intradayConfluence.bearishConfluenceTime !== 'Not Met';

            const bullEntry = analysis.intradayConfluence.bullishEntryPoint || analysis.idealEntry;
            const bearEntry = analysis.intradayConfluence.bearishEntryPoint || analysis.idealEntry;

            const lotRiskBull = Math.round(Math.abs(bullEntry - analysis.stopLoss) * lotSize);
            const lotRewardBull = Math.round(Math.abs(analysis.target1 - bullEntry) * lotSize);

            const lotRiskBear = Math.round(Math.abs(analysis.stopLoss - bearEntry) * lotSize);
            const lotRewardBear = Math.round(Math.abs(bearEntry - analysis.target1) * lotSize);

            return (
              <div
                key={stock.id}
                className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group relative"
              >
                {/* 1. STOCK NAME & HEADER (AT VERY TOP) */}
                <div className="space-y-2 border-b border-slate-100 pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-black text-slate-900 text-lg group-hover:text-blue-600 transition-colors">
                          {stock.symbol}
                        </span>
                        {(stock.symbol === 'NIFTY' || stock.symbol === 'BANKNIFTY' || stock.symbol === 'SENSEX') && (
                          <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-1.5 py-0.5 rounded border border-amber-300 shadow-2xs">
                            📌 PINNED INDEX
                          </span>
                        )}
                        {analysis.is100PercentBullish && (
                          <span className="bg-emerald-700 text-white text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-400 shadow-2xs animate-pulse flex items-center gap-1" title="100% Bullish Formula: Close > Open, Close > Prev Close, Close >= High - 0.20*Range, Body/Range >= 0.65">
                            <span>💯 100% BULLISH</span>
                            <span className="bg-emerald-950/80 text-yellow-300 font-mono text-[9px] px-1 py-0.2 rounded font-black">
                              🕒 {analysis.intradayConfluence.bullishConfluenceTime !== 'Not Met' ? analysis.intradayConfluence.bullishConfluenceTime : stock.candleTimestamp || '09:15 AM'}
                            </span>
                          </span>
                        )}
                        {analysis.is100PercentBearish && (
                          <span className="bg-rose-700 text-white text-[10px] font-black px-2 py-0.5 rounded-full border border-rose-400 shadow-2xs animate-pulse flex items-center gap-1" title="100% Bearish Formula: Close < Open, Close < Prev Close, Close <= Low + 0.20*Range, Body/Range >= 0.60">
                            <span>💥 100% BEARISH</span>
                            <span className="bg-rose-950/80 text-white font-mono text-[9px] px-1 py-0.2 rounded font-black">
                              🕒 {analysis.intradayConfluence.bearishConfluenceTime !== 'Not Met' ? analysis.intradayConfluence.bearishConfluenceTime : stock.candleTimestamp || '09:15 AM'}
                            </span>
                          </span>
                        )}
                        {((stock.openPrice !== undefined && stock.openPrice !== null && stock.openPrice > 0)
                          ? isOpenLowPattern(stock.openPrice, stock.lowPrice, stock.first15mLow)
                          : false) && (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded border border-emerald-300 flex items-center gap-1">
                            <span>OPEN=LOW</span>
                            {stock.candleTimestamp && <span className="text-[9px] font-mono font-bold text-emerald-950">({stock.candleTimestamp})</span>}
                          </span>
                        )}
                        {((stock.openPrice !== undefined && stock.openPrice !== null && stock.openPrice > 0)
                          ? isOpenHighPattern(stock.openPrice, stock.highPrice, stock.first15mHigh)
                          : false) && (
                          <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-1.5 py-0.5 rounded border border-rose-300 flex items-center gap-1">
                            <span>OPEN=HIGH</span>
                            {stock.candleTimestamp && <span className="text-[9px] font-mono font-bold text-rose-950">({stock.candleTimestamp})</span>}
                          </span>
                        )}
                        {(((stock.closePrice || stock.openPrice) !== undefined && (stock.closePrice || stock.openPrice)! > 0)
                          ? isHighClosePattern(stock.closePrice || stock.openPrice, stock.highPrice, stock.first15mHigh, stock.openPrice)
                          : false) && (
                          <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-300 flex items-center gap-1">
                            <span>HIGH=CLOSE</span>
                            {stock.candleTimestamp && <span className="text-[9px] font-mono font-bold text-blue-950">({stock.candleTimestamp})</span>}
                          </span>
                        )}
                        {analysis.pullback15mBounce && analysis.pullback15mBounce.isPullbackBounce && (
                          <span 
                            title={analysis.pullback15mBounce.detail}
                            className="bg-purple-100 text-purple-900 text-[10px] font-black px-1.5 py-0.5 rounded border border-purple-300 flex items-center gap-1 shadow-2xs"
                          >
                            <Target className="w-3 h-3 text-purple-600 shrink-0" />
                            <span>15M BOUNCE ({analysis.pullback15mBounce.bounceTime})</span>
                          </span>
                        )}
                        {(() => {
                          const hc = evaluateHighConfidenceTrade(stock);
                          if (hc.isHighConfidence || hc.isEntryTriggerActive) {
                            return (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setInspectHighConfidenceStock(stock);
                                }}
                                title={`High-Confidence Trade: ${hc.passedConditionsCount}/14 Confluences Met. Entry Trigger: ${hc.isEntryTriggerActive ? 'ACTIVE' : 'Pending'}. Click to inspect full 14-point checklist.`}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-black shadow-2xs border cursor-pointer transition-all hover:scale-105 ${
                                  hc.isEntryTriggerActive
                                    ? 'bg-amber-400 text-slate-950 border-yellow-300 ring-2 ring-yellow-400 animate-pulse'
                                    : 'bg-amber-950/80 text-amber-300 border-amber-500'
                                }`}
                              >
                                <Flame className="w-3 h-3 fill-current text-yellow-400 animate-bounce" />
                                <span>{hc.isEntryTriggerActive ? '🚀 HC ENTRY TRIGGER' : '🎯 14 CONFLUENCES'}</span>
                                <span className="font-mono text-[9px] bg-slate-900 text-yellow-300 px-1 py-0.2 rounded font-bold">
                                  {hc.passedConditionsCount}/14
                                </span>
                              </button>
                            );
                          }
                          return null;
                        })()}
                        {(() => {
                          const comboAnalysis = analyzeBullishCombinations(stock);
                          if (comboAnalysis.isAnyComboMet) {
                            const hitTime = comboAnalysis.isAllCombosMet 
                              ? comboAnalysis.firstTripleHitTime 
                              : comboAnalysis.firstAnyHitTime;
                            return (
                              <span 
                                title={`Bullish Combinations: ${comboAnalysis.summaryBadge}. First triggered at ${hitTime}`}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-black shadow-2xs border ${comboAnalysis.badgeClass}`}
                              >
                                <Flame className="w-3 h-3 fill-current text-amber-300 animate-pulse" />
                                <span>{comboAnalysis.isAllCombosMet ? 'TRIPLE POWER' : 'COMBO SIGNAL'}</span>
                                {hitTime && <span className="font-mono text-[9px] font-black underline">(@ {hitTime})</span>}
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5 mt-0.5 font-mono">
                        <span className="truncate max-w-[150px]">{stock.companyName}</span>
                        {stock.candleTimestamp && (
                          <span className="text-[9.5px] font-extrabold text-blue-900 bg-blue-50 border border-blue-200 px-1 py-0.2 rounded shrink-0 flex items-center gap-0.5" title="15m Candle / Signal Timestamp">
                            🕒 {stock.candleTimestamp}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-black text-slate-900">
                        {stock.closePrice !== undefined && stock.closePrice !== null ? `₹${stock.closePrice.toFixed(2)}` : 'N/A'}
                      </div>
                      <div className={`text-xs font-extrabold ${
                        (stock.pctChange || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {(stock.pctChange || 0) >= 0 ? '+' : ''}{(stock.pctChange || 0).toFixed(2)}%
                      </div>
                    </div>
                  </div>

                  {/* F&O Lot Size & Contract Info Strip */}
                  <div className="bg-slate-900 text-white rounded-xl p-2.5 flex items-center justify-between text-[11px] font-mono shadow-2xs">
                    <div className="flex items-center space-x-1.5 text-amber-300 font-bold">
                      <Layers className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Lot Size: <strong className="text-white text-xs">{lotSize.toLocaleString('en-IN')}</strong> shares</span>
                    </div>
                    <div className="text-right text-[10.5px]">
                      Val: <strong className="text-emerald-300">₹{(contractValue / 100000).toFixed(2)}L</strong> | Margin: <strong className="text-blue-300">₹{(marginEst / 100000).toFixed(2)}L</strong>
                    </div>
                  </div>
                </div>

                {/* 2. BULLISH & BEARISH RALLY TRIGGER & ENTRY TIME BANNER */}
                <div className="space-y-2">
                  <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-slate-600" />
                    <span>Intraday Rally Trigger &amp; Right Entry Point ({selectedDate})</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10.5px]">
                    {/* Bullish Rally Box */}
                    <div className={`p-2.5 rounded-xl border flex flex-col justify-between space-y-1.5 ${
                      isBullTriggered
                        ? 'bg-emerald-950/95 border-emerald-500 text-white ring-1 ring-emerald-400 shadow-2xs'
                        : 'bg-slate-800/60 border-slate-700/70 text-slate-300'
                    }`}>
                      <div className="flex items-center justify-between font-extrabold text-[10px] uppercase tracking-wider text-emerald-400 border-b border-slate-700/60 pb-1">
                        <span>🔥 Bullish Rally</span>
                        {isBullTriggered ? (
                          <span className="bg-emerald-500 text-slate-950 px-1.5 py-0.2 rounded text-[8.5px] font-black shadow-2xs">TRIGGERED</span>
                        ) : (
                          <span className="text-slate-500 font-normal">Score {analysis.bullishRally.score}</span>
                        )}
                      </div>

                      <div className="font-mono space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 text-[10px]">Exact Time:</span>
                          <strong className={isBullTriggered ? 'text-amber-300 text-[11px] font-bold' : 'text-slate-400'}>
                            {analysis.intradayConfluence.bullishConfluenceTime}
                          </strong>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 text-[10px]">Right Entry:</span>
                          <strong className="text-emerald-300 font-extrabold text-[11.5px]">
                            ₹{bullEntry}
                          </strong>
                        </div>
                      </div>

                      <div className="pt-1 border-t border-slate-700/60 text-[9.5px] font-mono flex justify-between">
                        <span className="text-rose-300">Risk: -₹{lotRiskBull.toLocaleString('en-IN')}</span>
                        <span className="text-emerald-300 font-bold">T1: +₹{lotRewardBull.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    {/* Bearish Rally Box */}
                    <div className={`p-2.5 rounded-xl border flex flex-col justify-between space-y-1.5 ${
                      isBearTriggered
                        ? 'bg-rose-950/95 border-rose-500 text-white ring-1 ring-rose-400 shadow-2xs'
                        : 'bg-slate-800/60 border-slate-700/70 text-slate-300'
                    }`}>
                      <div className="flex items-center justify-between font-extrabold text-[10px] uppercase tracking-wider text-rose-400 border-b border-slate-700/60 pb-1">
                        <span>🔻 Bearish Rally</span>
                        {isBearTriggered ? (
                          <span className="bg-rose-500 text-white px-1.5 py-0.2 rounded text-[8.5px] font-black shadow-2xs">TRIGGERED</span>
                        ) : (
                          <span className="text-slate-500 font-normal">Score {analysis.bearishRally.score}</span>
                        )}
                      </div>

                      <div className="font-mono space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 text-[10px]">Exact Time:</span>
                          <strong className={isBearTriggered ? 'text-amber-300 text-[11px] font-bold' : 'text-slate-400'}>
                            {analysis.intradayConfluence.bearishConfluenceTime}
                          </strong>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 text-[10px]">Right Entry:</span>
                          <strong className="text-rose-300 font-extrabold text-[11.5px]">
                            ₹{bearEntry}
                          </strong>
                        </div>
                      </div>

                      <div className="pt-1 border-t border-slate-700/60 text-[9.5px] font-mono flex justify-between">
                        <span className="text-rose-300">Risk: -₹{lotRiskBear.toLocaleString('en-IN')}</span>
                        <span className="text-emerald-300 font-bold">T1: +₹{lotRewardBear.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 🎯 BULLISH COMBINATIONS SIGNAL TRIGGER TIMES BAR */}
                {(() => {
                  const comboAnalysis = analyzeBullishCombinations(stock);
                  if (comboAnalysis.isAnyComboMet) {
                    return (
                      <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 text-white p-3 rounded-xl border border-emerald-500/50 shadow-2xs space-y-2">
                        <div className="flex items-center justify-between text-xs font-black uppercase border-b border-slate-800 pb-1.5">
                          <div className="flex items-center gap-1.5 text-emerald-400">
                            <Flame className="w-4 h-4 text-amber-400 fill-current animate-pulse" />
                            <span>🔥 Bullish Combos Signal</span>
                          </div>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${comboAnalysis.badgeClass}`}>
                            {comboAnalysis.summaryBadge}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono">
                          <div className={`p-1.5 rounded border ${comboAnalysis.combo1.isMatch ? 'bg-emerald-950/80 border-emerald-700/80 text-emerald-200' : 'bg-slate-900/60 border-slate-800 text-slate-500'}`}>
                            <div className="font-bold text-[9px] uppercase tracking-wide truncate">1. 9/20/50 EMA</div>
                            <div className="font-black text-amber-300 mt-0.5">
                              {comboAnalysis.combo1.isMatch ? `⏱️ ${comboAnalysis.combo1.firstHitTime}` : 'Not Met'}
                            </div>
                          </div>

                          <div className={`p-1.5 rounded border ${comboAnalysis.combo2.isMatch ? 'bg-blue-950/80 border-blue-700/80 text-blue-200' : 'bg-slate-900/60 border-slate-800 text-slate-500'}`}>
                            <div className="font-bold text-[9px] uppercase tracking-wide truncate">2. RSI 55-70</div>
                            <div className="font-black text-amber-300 mt-0.5">
                              {comboAnalysis.combo2.isMatch ? `⏱️ ${comboAnalysis.combo2.firstHitTime}` : 'Not Met'}
                            </div>
                          </div>

                          <div className={`p-1.5 rounded border ${comboAnalysis.combo3.isMatch ? 'bg-purple-950/80 border-purple-700/80 text-purple-200' : 'bg-slate-900/60 border-slate-800 text-slate-500'}`}>
                            <div className="font-bold text-[9px] uppercase tracking-wide truncate">3. MACD</div>
                            <div className="font-black text-amber-300 mt-0.5">
                              {comboAnalysis.combo3.isMatch ? `⏱️ ${comboAnalysis.combo3.firstHitTime}` : 'Not Met'}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* 🎯 SIGNAL SUCCESS PERCENTAGE RATE & NEW USER FETCH TIME COMPARISON */}
                {analysis.signalSuccessMetrics && analysis.signalSuccessMetrics.hasSignal && (
                  <div className="bg-slate-900 text-white p-3 rounded-xl border border-slate-700 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                        <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate max-w-[170px]">{analysis.signalSuccessMetrics.signalName}</span>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border shrink-0 ${analysis.signalSuccessMetrics.statusBadgeClass}`}>
                        {analysis.signalSuccessMetrics.statusBadgeText}
                      </span>
                    </div>

                    {/* Time & Price Comparison Timeline */}
                    <div className="grid grid-cols-2 gap-2 text-[10.5px] font-mono bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                      <div>
                        <div className="text-slate-400 text-[9px] font-sans font-bold uppercase tracking-wider flex items-center gap-1 mb-0.5">
                          <Clock className="w-2.5 h-2.5 text-blue-400 shrink-0" />
                          <span>1st Shown Time</span>
                        </div>
                        <div className="font-extrabold text-amber-300">{analysis.signalSuccessMetrics.firstShownTime}</div>
                        <div className="text-slate-300 text-[10px]">Entry: ₹{analysis.signalSuccessMetrics.firstShownPrice.toFixed(2)}</div>
                      </div>

                      <div className="text-right border-l border-slate-800 pl-2">
                        <div className="text-slate-400 text-[9px] font-sans font-bold uppercase tracking-wider flex items-center gap-1 justify-end mb-0.5">
                          <RefreshCw className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                          <span>New Fetch Time</span>
                        </div>
                        <div className="font-extrabold text-emerald-300">{analysis.signalSuccessMetrics.latestFetchTime}</div>
                        <div className="text-white text-[10px]">
                          LTP: ₹{analysis.signalSuccessMetrics.latestPrice.toFixed(2)}
                          <span className={`ml-1 font-bold ${analysis.signalSuccessMetrics.priceChangePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            ({analysis.signalSuccessMetrics.priceChangePct >= 0 ? '+' : ''}{analysis.signalSuccessMetrics.priceChangePct.toFixed(2)}%)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Success Rate Progress Bar */}
                    <div className="space-y-1 pt-0.5">
                      <div className="flex items-center justify-between text-[9.5px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <span>Target 1: ₹{analysis.signalSuccessMetrics.targetPrice.toFixed(2)}</span>
                          <span className="text-[9px] text-slate-500">({analysis.signalSuccessMetrics.timeElapsedStr} elapsed)</span>
                        </span>
                        <span className="font-bold text-emerald-300 font-mono">{analysis.signalSuccessMetrics.successRatePct}% Success</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden border border-slate-700/50">
                        <div 
                          className={`h-full transition-all duration-500 rounded-full ${
                            analysis.signalSuccessMetrics.successRatePct >= 80 
                              ? 'bg-gradient-to-r from-emerald-500 to-green-400' 
                              : analysis.signalSuccessMetrics.successRatePct >= 50 
                                ? 'bg-gradient-to-r from-teal-500 to-amber-400' 
                                : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(5, analysis.signalSuccessMetrics.successRatePct))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 15M HIGH RETEST & BULLISH BOUNCE STRATEGY CARD BANNER */}
                {analysis.pullback15mBounce && analysis.pullback15mBounce.isPullbackBounce && (
                  <div className="bg-purple-950/95 text-purple-100 p-3 rounded-xl border border-purple-500/70 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between text-xs font-black uppercase tracking-wide border-b border-purple-800/80 pb-1.5 text-purple-200">
                      <div className="flex items-center space-x-1.5">
                        <Target className="w-4 h-4 text-purple-400 shrink-0 animate-pulse" />
                        <span>🎯 15m High Retest &amp; Bullish Bounce</span>
                      </div>
                      <span className="bg-purple-500 text-slate-950 px-2 py-0.5 rounded text-[10px] font-black shadow-xs">
                        BOUNCE TIME: {analysis.pullback15mBounce.bounceTime}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[10.5px] font-mono pt-0.5">
                      <div className="bg-purple-900/50 p-1.5 rounded border border-purple-800/60">
                        <span className="text-purple-300 text-[9.5px] block">15m High:</span>
                        <strong className="text-white text-xs">₹{analysis.pullback15mBounce.first15mHigh.toFixed(2)}</strong>
                      </div>
                      <div className="bg-purple-900/50 p-1.5 rounded border border-purple-800/60">
                        <span className="text-purple-300 text-[9.5px] block">Retest Price:</span>
                        <strong className="text-amber-300 text-xs">₹{analysis.pullback15mBounce.retestPrice.toFixed(2)}</strong>
                      </div>
                      <div className="bg-purple-900/50 p-1.5 rounded border border-purple-800/60">
                        <span className="text-purple-300 text-[9.5px] block">Bounce Gain:</span>
                        <strong className="text-emerald-300 text-xs">+{analysis.pullback15mBounce.bouncePct.toFixed(2)}%</strong>
                      </div>
                    </div>

                    <p className="text-[10px] text-purple-200/90 leading-snug font-sans">
                      {analysis.pullback15mBounce.detail}
                    </p>
                  </div>
                )}

                {/* 3. SIGNAL VERIFICATION & FALSE BREAKOUT RISK BAR */}
                <div className="bg-slate-900 text-white p-3 rounded-xl border border-slate-800 space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center space-x-1.5 font-bold">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Confluence Quality:</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${analysis.confluenceValidation.badgeColor}`}>
                      {analysis.confluenceValidation.statusLabel}
                    </span>
                  </div>

                  <p className="text-[10.5px] text-slate-300 leading-snug font-sans">
                    {analysis.confluenceValidation.summaryReason}
                  </p>

                  <button
                    onClick={() => setExpandedChecklistStockId(expandedChecklistStockId === stock.id ? null : stock.id)}
                    className="w-full text-center py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center space-x-1 border border-slate-700/80"
                  >
                    <span>{expandedChecklistStockId === stock.id ? 'Hide 5 Confluence Checks' : 'Inspect 5 Confluences (Prevent False Signals)'}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transform transition-transform ${expandedChecklistStockId === stock.id ? 'rotate-180' : ''}`} />
                  </button>

                  {expandedChecklistStockId === stock.id && (
                    <div className="pt-2 border-t border-slate-800 space-y-1.5">
                      <div className="text-[9.5px] font-bold text-amber-400 uppercase tracking-wider">
                        5 Non-Negotiable Confluences Matrix:
                      </div>
                      <div className="space-y-1">
                        {analysis.confluenceValidation.checks.map((chk) => (
                          <div key={chk.id} className="p-1.5 rounded bg-slate-950/90 border border-slate-800 flex items-start space-x-1.5">
                            <span className={`shrink-0 text-xs ${chk.passed ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {chk.passed ? '✅' : '❌'}
                            </span>
                            <div className="flex-1 text-[9.5px] leading-snug">
                              <span className={`font-bold ${chk.passed ? 'text-white' : 'text-rose-300'}`}>{chk.name}:</span>{' '}
                              <span className="text-slate-300">{chk.detail}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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

                  {/* 15-Minute Intraday Confluence Time & Entry Point Box */}
                  <div className="bg-slate-900 text-white p-3 rounded-xl space-y-2 border border-slate-800">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="flex items-center space-x-1.5 text-amber-300">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>15m Confluence Trigger ({selectedDate})</span>
                      </span>
                      <button
                        onClick={() => setExpanded15MinStockId(expanded15MinStockId === stock.id ? null : stock.id)}
                        className="text-[10px] text-blue-300 hover:text-white underline font-semibold flex items-center space-x-1"
                      >
                        <span>{expanded15MinStockId === stock.id ? 'Hide 15m Bars' : '15m Timeline'}</span>
                        {expanded15MinStockId === stock.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      {/* Bullish Trigger info */}
                      <div className={`p-2 rounded-lg border ${
                        analysis.intradayConfluence.bullishConfluenceTime !== 'Not Met'
                          ? 'bg-emerald-950/80 border-emerald-700/80 text-emerald-200'
                          : 'bg-slate-800/60 border-slate-700/60 text-slate-400'
                      }`}>
                        <div className="font-extrabold text-[9.5px] uppercase tracking-wider text-emerald-400 flex items-center justify-between">
                          <span>🔥 Bull Met</span>
                          <span className="font-mono text-[9px]">{analysis.intradayConfluence.bullishTriggerScore}/100</span>
                        </div>
                        <div className="mt-1 flex flex-col font-mono leading-tight">
                          <span className="text-[11px] font-black text-white">
                            ⏱️ {analysis.intradayConfluence.bullishConfluenceTime}
                          </span>
                          <span className="text-[10px] font-extrabold text-emerald-300">
                            Entry: ₹{analysis.intradayConfluence.bullishEntryPoint}
                          </span>
                        </div>
                      </div>

                      {/* Bearish Trigger info */}
                      <div className={`p-2 rounded-lg border ${
                        analysis.intradayConfluence.bearishConfluenceTime !== 'Not Met'
                          ? 'bg-rose-950/80 border-rose-700/80 text-rose-200'
                          : 'bg-slate-800/60 border-slate-700/60 text-slate-400'
                      }`}>
                        <div className="font-extrabold text-[9.5px] uppercase tracking-wider text-rose-400 flex items-center justify-between">
                          <span>🔻 Bear Met</span>
                          <span className="font-mono text-[9px]">{analysis.intradayConfluence.bearishTriggerScore}/100</span>
                        </div>
                        <div className="mt-1 flex flex-col font-mono leading-tight">
                          <span className="text-[11px] font-black text-white">
                            ⏱️ {analysis.intradayConfluence.bearishConfluenceTime}
                          </span>
                          <span className="text-[10px] font-extrabold text-rose-300">
                            Entry: ₹{analysis.intradayConfluence.bearishEntryPoint}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Expanded 15-Minute Timeline Bar */}
                    {expanded15MinStockId === stock.id && (
                      <div className="mt-2 pt-2 border-t border-slate-800 space-y-1.5 max-h-56 overflow-y-auto pr-1 text-[10px] font-mono">
                        <div className="text-[9.5px] text-slate-400 font-sans font-bold flex items-center justify-between">
                          <span>15-Min Candle Log ({selectedDate} • 09:15 AM – 03:15 PM)</span>
                          <span className="text-amber-400">25 Bars</span>
                        </div>
                        <div className="space-y-1">
                          {analysis.intradayConfluence.timeline.map((bar, bIdx) => {
                            const isBullTriggerBar = bar.time === analysis.intradayConfluence.bullishConfluenceTime;
                            const isBearTriggerBar = bar.time === analysis.intradayConfluence.bearishConfluenceTime;

                            return (
                              <div
                                key={bIdx}
                                className={`p-1.5 rounded flex items-center justify-between border ${
                                  isBullTriggerBar
                                    ? 'bg-emerald-900/90 border-emerald-500 text-white font-bold ring-1 ring-emerald-400'
                                    : isBearTriggerBar
                                    ? 'bg-rose-900/90 border-rose-500 text-white font-bold ring-1 ring-rose-400'
                                    : 'bg-slate-800/40 border-slate-700/50 text-slate-300'
                                }`}
                              >
                                <div className="flex items-center space-x-2">
                                  <span className="text-slate-400 w-14 text-[9.5px]">{bar.time}</span>
                                  <span className="font-bold text-white">₹{bar.price.toFixed(2)}</span>
                                  <span className="text-[9px] text-slate-400">RSI {bar.rsi}</span>
                                </div>
                                <div className="flex items-center space-x-1.5">
                                  {isBullTriggerBar && (
                                    <span className="bg-emerald-500 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded shadow-xs">
                                      🎯 BULL ENTRY
                                    </span>
                                  )}
                                  {isBearTriggerBar && (
                                    <span className="bg-rose-500 text-white font-black text-[9px] px-1.5 py-0.5 rounded shadow-xs">
                                      🎯 BEAR ENTRY
                                    </span>
                                  )}
                                  <span className="text-emerald-400 font-bold">B:{bar.bullishScore}</span>
                                  <span className="text-rose-400 font-bold">R:{bar.bearishScore}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
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

      {/* 🎯 14-POINT HIGH-CONFIDENCE TRADE INSPECTION MODAL */}
      {inspectHighConfidenceStock && (() => {
        const hc = evaluateHighConfidenceTrade(inspectHighConfidenceStock);
        const ltp = inspectHighConfidenceStock.closePrice || inspectHighConfidenceStock.openPrice || 0;
        return (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-700 text-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-800 flex items-start justify-between bg-slate-950">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xl font-black text-white">{inspectHighConfidenceStock.symbol}</span>
                    <span className="text-sm font-semibold text-slate-400">{inspectHighConfidenceStock.companyName}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${
                      hc.isHighConfidence 
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400' 
                        : 'bg-amber-500/20 text-amber-300 border-amber-400'
                    }`}>
                      {hc.isHighConfidence ? '🎯 14/14 ALL CONFLUENCES MET' : `⚠️ ${hc.passedConditionsCount}/14 Confluences Met`}
                    </span>
                    {hc.isEntryTriggerActive && (
                      <span className="bg-amber-400 text-slate-950 font-black text-xs px-2.5 py-0.5 rounded-full border border-yellow-300 animate-pulse">
                        🚀 ENTRY TRIGGER ACTIVE
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
                    <span>LTP: <strong className="text-white">₹{ltp.toFixed(2)}</strong></span>
                    <span>Change: <strong className={(inspectHighConfidenceStock.pctChange || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      {(inspectHighConfidenceStock.pctChange || 0) >= 0 ? '+' : ''}{(inspectHighConfidenceStock.pctChange || 0).toFixed(2)}%
                    </strong></span>
                    <span>Score: <strong className="text-yellow-400">{hc.scorePercent}/100</strong></span>
                  </div>
                </div>

                <button
                  onClick={() => setInspectHighConfidenceStock(null)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body - 14 Confluences Checklist */}
              <div className="p-5 overflow-y-auto space-y-4">
                {/* Summary Banner */}
                <div className={`p-3.5 rounded-2xl border text-xs leading-relaxed ${
                  hc.isHighConfidence
                    ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-200'
                    : 'bg-amber-950/80 border-amber-500/80 text-amber-200'
                }`}>
                  <div className="font-extrabold flex items-center gap-1.5 mb-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>High-Confidence System Validation</span>
                  </div>
                  <p>{hc.summaryReason}</p>
                </div>

                {/* Final Trigger Status Card */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-yellow-400 fill-current" />
                      <span>Final Entry Trigger Execution</span>
                    </span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                      hc.isEntryTriggerActive 
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400' 
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {hc.isEntryTriggerActive ? 'EXECUTE BUY NOW' : 'WAIT FOR TRIGGER'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-mono pt-1">
                    <div className={`p-2 rounded-xl border ${hc.isHighConfidence ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
                      <div className="text-[9.5px] uppercase font-bold text-slate-400">14 Mandatory Rules</div>
                      <div className="font-black">{hc.isHighConfidence ? '✅ ALL TRUE' : `❌ ${hc.passedConditionsCount}/14 MET`}</div>
                    </div>
                    <div className={`p-2 rounded-xl border ${hc.finalTrigger.isCurrentCandleBullish ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
                      <div className="text-[9.5px] uppercase font-bold text-slate-400">Current Candle</div>
                      <div className="font-black">{hc.finalTrigger.isCurrentCandleBullish ? '✅ BULLISH (GREEN)' : '❌ RED CANDLE'}</div>
                    </div>
                    <div className={`p-2 rounded-xl border ${hc.finalTrigger.isCloseAbovePrevHigh ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
                      <div className="text-[9.5px] uppercase font-bold text-slate-400">Close &gt; Prev High</div>
                      <div className="font-black">{hc.finalTrigger.isCloseAbovePrevHigh ? '✅ BREAKOUT HIGH' : '❌ BELOW PREV HIGH'}</div>
                    </div>
                  </div>
                </div>

                {/* 14 Mandatory Conditions List */}
                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>14 Mandatory Confluences</span>
                    <span>{hc.passedConditionsCount} / {hc.totalConditionsCount} Met</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {hc.conditions.map((cond, idx) => (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-xl border text-xs transition-colors flex items-start gap-2.5 ${
                          cond.passed
                            ? 'bg-slate-950/80 border-emerald-500/40 text-slate-200'
                            : 'bg-slate-950/50 border-slate-800/80 text-slate-400'
                        }`}
                      >
                        <div className={`p-1 rounded-md shrink-0 mt-0.5 ${
                          cond.passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {cond.passed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                        </div>
                        <div className="space-y-0.5 flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className={`font-black text-[11px] truncate ${cond.passed ? 'text-white' : 'text-slate-400'}`}>
                              {idx + 1}. {cond.name}
                            </span>
                            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded shrink-0 ${
                              cond.passed ? 'bg-emerald-900/60 text-emerald-300' : 'bg-rose-950/60 text-rose-400'
                            }`}>
                              {cond.passed ? 'PASS' : 'FAIL'}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Actual: <span className={cond.passed ? 'text-emerald-300' : 'text-rose-300'}>{cond.actualValue}</span>
                          </div>
                          <div className="text-[9.5px] text-slate-500">
                            Required: {cond.requiredCriteria}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onOpenRsiAnalyst(inspectHighConfidenceStock);
                      setInspectHighConfidenceStock(null);
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>RSI Timeline</span>
                  </button>
                  <button
                    onClick={() => {
                      onOpenPositionSizer(inspectHighConfidenceStock);
                      setInspectHighConfidenceStock(null);
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    <span>Position Size</span>
                  </button>
                </div>

                <button
                  onClick={() => setInspectHighConfidenceStock(null)}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-colors"
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
};
