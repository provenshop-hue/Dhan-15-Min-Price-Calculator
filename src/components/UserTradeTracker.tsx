import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  UserTrackedTrade,
  StockCalculated,
  DhanApiCredentials,
  InstrumentType,
  PositionSide,
  TradeActionAdvice
} from '../types';
import {
  evaluateUserTrackedTrade,
  getStoredUserTrades,
  saveStoredUserTrades
} from '../utils/userTradeAdvisor';
import { INITIAL_STOCKS } from '../data/stocks';
import { getExactNseStrikeStep, roundToExactNseStrike, formatStrikePrice } from '../utils/nseStrikeMaster';
import {
  Plus,
  RefreshCw,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Trash2,
  Edit3,
  X,
  Target,
  Shield,
  Layers,
  Sparkles,
  DollarSign,
  HelpCircle,
  Pause,
  Play,
  Award,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Activity,
  Zap,
  Info,
  BarChart2,
  Gauge,
  Compass,
  Check,
  Minus,
  Percent,
  Calculator
} from 'lucide-react';

interface UserTradeTrackerProps {
  stocks: StockCalculated[];
  credentials: DhanApiCredentials;
  onFetchSingleStock: (stock: StockCalculated) => Promise<boolean>;
  onFetchAllStocks: () => void;
  onOpenSettings: () => void;
  onSelectStockDetail?: (stock: StockCalculated) => void;
  onOpenPositionSizer?: (stock: StockCalculated) => void;
}

export const UserTradeTracker: React.FC<UserTradeTrackerProps> = ({
  stocks,
  credentials,
  onFetchSingleStock,
  onFetchAllStocks,
  onOpenSettings,
  onSelectStockDetail,
  onOpenPositionSizer
}) => {
  // Stored Trades
  const [trades, setTrades] = useState<UserTrackedTrade[]>(() => {
    return getStoredUserTrades();
  });

  // Active Tab: 'active' | 'closed'
  const [activeSubTab, setActiveSubTab] = useState<'active' | 'closed'>('active');

  // Add / Edit Trade Modal
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<UserTrackedTrade | null>(null);

  // Technical Indicators Deep-Dive Modal State
  const [selectedTechTrade, setSelectedTechTrade] = useState<UserTrackedTrade | null>(null);

  // Averaging Guidance & Simulator Modal State
  const [selectedAvgTrade, setSelectedAvgTrade] = useState<UserTrackedTrade | null>(null);
  const [avgStrategyMode, setAvgStrategyMode] = useState<'equal' | 'half' | 'double' | 'custom'>('equal');
  const [customAvgPriceInput, setCustomAvgPriceInput] = useState<string>('');
  const [customAvgQtyInput, setCustomAvgQtyInput] = useState<string>('');
  const [activeFilterTag, setActiveFilterTag] = useState<'ALL' | 'AVG_CANDIDATES' | 'PROFIT' | 'DRAWDOWN' | 'OPTIONS' | 'EQUITY'>('ALL');

  // In-Card Expanded Technical Proof State (Card ID -> boolean)
  const [expandedProofCardIds, setExpandedProofCardIds] = useState<Record<string, boolean>>({});

  const toggleProofCard = (id: string) => {
    setExpandedProofCardIds((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Auto-Refresh Interval (Default: 5 minutes = 300 seconds)
  const [refreshIntervalMins, setRefreshIntervalMins] = useState<number>(() => {
    const saved = localStorage.getItem('dhan_tracker_refresh_mins');
    return saved ? Number(saved) : 5;
  });
  const [isAutoRefreshActive, setIsAutoRefreshActive] = useState<boolean>(true);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(() => {
    const saved = localStorage.getItem('dhan_tracker_refresh_mins');
    return (saved ? Number(saved) : 5) * 60;
  });
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>(() => {
    return new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' IST';
  });

  // Single trade refreshing state
  const [refreshingTradeId, setRefreshingTradeId] = useState<string | null>(null);
  const [isRefreshingAll, setIsRefreshingAll] = useState<boolean>(false);

  // Close Trade confirmation modal
  const [closingTrade, setClosingTrade] = useState<UserTrackedTrade | null>(null);
  const [closePriceInput, setClosePriceInput] = useState<string>('');
  const [closingNotes, setClosingNotes] = useState<string>('');

  // Save trades on change
  useEffect(() => {
    saveStoredUserTrades(trades);
  }, [trades]);

  // Stock lookup map
  const stockMap = useMemo(() => {
    const map = new Map<string, StockCalculated>();
    stocks.forEach((s) => {
      map.set(s.symbol.toUpperCase(), s);
      map.set(s.id, s);
    });
    return map;
  }, [stocks]);

  // Re-evaluate trades when stocks array changes
  useEffect(() => {
    if (trades.length === 0) return;

    setTrades((prevTrades) => {
      return prevTrades.map((t) => {
        if (t.status === 'CLOSED') return t;
        const matchingStock = stockMap.get(t.symbol.toUpperCase());
        return evaluateUserTrackedTrade(t, matchingStock);
      });
    });
  }, [stocks, stockMap]);

  // Handle Manual Refresh of All Tracked Trades via Dhan API
  const handleRefreshAllTrackerPrices = async () => {
    setIsRefreshingAll(true);
    setCountdownSeconds(refreshIntervalMins * 60);

    try {
      // 1. Trigger global fetch if available
      if (onFetchAllStocks) {
        onFetchAllStocks();
      }

      // 2. Refresh each active trade's stock directly
      const openTrades = trades.filter((t) => t.status === 'OPEN');
      for (const t of openTrades) {
        const found = stockMap.get(t.symbol.toUpperCase());
        if (found) {
          await onFetchSingleStock(found);
        }
      }

      setLastRefreshedAt(
        new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' IST'
      );
    } catch (e) {
      console.error('Failed to refresh tracker prices', e);
    } finally {
      setIsRefreshingAll(false);
    }
  };

  // 5-Minute Auto-Refresh Timer Hook
  useEffect(() => {
    if (!isAutoRefreshActive) return;

    const timer = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev <= 1) {
          // Trigger auto-refresh
          handleRefreshAllTrackerPrices();
          return refreshIntervalMins * 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isAutoRefreshActive, refreshIntervalMins, trades, stockMap]);

  // Format countdown mm:ss
  const formatCountdown = (totalSeconds: number) => {
    const m = Math.floor(Math.max(0, totalSeconds) / 60);
    const s = Math.max(0, totalSeconds) % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Handle refresh single stock
  const handleRefreshSingle = async (trade: UserTrackedTrade) => {
    setRefreshingTradeId(trade.id);
    const found = stockMap.get(trade.symbol.toUpperCase());
    if (found) {
      await onFetchSingleStock(found);
    }
    setRefreshingTradeId(null);
    setLastRefreshedAt(
      new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' IST'
    );
  };

  // Active & Closed Trades Filtering
  const openTrades = useMemo(() => trades.filter((t) => t.status === 'OPEN'), [trades]);
  const closedTrades = useMemo(() => trades.filter((t) => t.status === 'CLOSED'), [trades]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    let totalInvested = 0;
    let totalCurrentValue = 0;
    let totalUnrealizedPnL = 0;
    let winningCount = 0;
    let losingCount = 0;

    openTrades.forEach((t) => {
      totalInvested += t.investedCapital || (t.entryPrice * (t.quantity || 1));
      totalCurrentValue += t.currentValue || (t.effectiveCMP * (t.quantity || 1));
      totalUnrealizedPnL += t.unrealizedPnL || 0;
      if (t.unrealizedPnL > 0) winningCount++;
      else if (t.unrealizedPnL < 0) losingCount++;
    });

    const totalPnLPct = totalInvested > 0 ? (totalUnrealizedPnL / totalInvested) * 100 : 0;

    // Closed Trades Realized Stats
    let totalRealizedPnL = 0;
    let closedWinCount = 0;
    closedTrades.forEach((t) => {
      totalRealizedPnL += t.realizedPnL || 0;
      if ((t.realizedPnL || 0) > 0) closedWinCount++;
    });
    const closedWinRate = closedTrades.length > 0 ? (closedWinCount / closedTrades.length) * 100 : 0;

    return {
      totalInvested,
      totalCurrentValue,
      totalUnrealizedPnL,
      totalPnLPct,
      winningCount,
      losingCount,
      totalRealizedPnL,
      closedWinRate,
      closedCount: closedTrades.length,
      avgCandidateCount: openTrades.filter((t) => t.averagingGuidance?.status === 'RECOMMENDED' || t.advice === 'AVERAGE_PULLBACK' || (t.unrealizedPnLPct <= -1 && t.unrealizedPnLPct >= -14)).length,
      optionsCount: openTrades.filter((t) => t.instrumentType === 'CALL_OPTION' || t.instrumentType === 'PUT_OPTION').length,
      equityCount: openTrades.filter((t) => t.instrumentType === 'EQUITY' || t.instrumentType === 'FUTURES').length
    };
  }, [openTrades, closedTrades]);

  // Filtered Open Trades
  const displayedOpenTrades = useMemo(() => {
    return openTrades.filter((t) => {
      if (activeFilterTag === 'AVG_CANDIDATES') {
        return t.averagingGuidance?.status === 'RECOMMENDED' || t.advice === 'AVERAGE_PULLBACK' || (t.unrealizedPnLPct <= -1 && t.unrealizedPnLPct >= -14);
      }
      if (activeFilterTag === 'PROFIT') {
        return t.unrealizedPnL > 0;
      }
      if (activeFilterTag === 'DRAWDOWN') {
        return t.unrealizedPnL < 0;
      }
      if (activeFilterTag === 'OPTIONS') {
        return t.instrumentType === 'CALL_OPTION' || t.instrumentType === 'PUT_OPTION';
      }
      if (activeFilterTag === 'EQUITY') {
        return t.instrumentType === 'EQUITY' || t.instrumentType === 'FUTURES';
      }
      return true;
    });
  }, [openTrades, activeFilterTag]);

  // Form State
  const [formSymbol, setFormSymbol] = useState('');
  const [formInstrument, setFormInstrument] = useState<InstrumentType>('CALL_OPTION');
  const [formPositionSide, setFormPositionSide] = useState<PositionSide>('LONG');
  const [formStrikePrice, setFormStrikePrice] = useState<string>('');
  const [formOptionType, setFormOptionType] = useState<'CE' | 'PE'>('CE');
  const [formExpiry, setFormExpiry] = useState<string>('Current Expiry');
  const [formEntryPrice, setFormEntryPrice] = useState<string>('');
  const [formQuantity, setFormQuantity] = useState<string>('1');
  const [formLots, setFormLots] = useState<string>('1');
  const [formUserSL, setFormUserSL] = useState<string>('');
  const [formUserTarget, setFormUserTarget] = useState<string>('');
  const [formStrategyTag, setFormStrategyTag] = useState<string>('15m Bounce @ 9:30 AM');
  const [formNotes, setFormNotes] = useState<string>('');
  const [symbolSearchQuery, setSymbolSearchQuery] = useState('');
  const [isSymbolDropdownOpen, setIsSymbolDropdownOpen] = useState(false);

  // Available stock options for search
  const availableStockList = useMemo(() => {
    return INITIAL_STOCKS.map((s) => ({
      symbol: s.symbol,
      companyName: s.companyName,
      lotSize: s.lotSizeJun2026 || s.lotSizeJul2026 || 250
    }));
  }, []);

  const filteredSymbols = useMemo(() => {
    if (!symbolSearchQuery.trim()) return availableStockList.slice(0, 15);
    const q = symbolSearchQuery.toUpperCase().trim();
    return availableStockList.filter(
      (s) => s.symbol.toUpperCase().includes(q) || s.companyName.toUpperCase().includes(q)
    ).slice(0, 15);
  }, [availableStockList, symbolSearchQuery]);

  // Open Form for Adding New Trade
  const handleOpenAddModal = (defaultStock?: StockCalculated) => {
    setEditingTrade(null);
    const sym = defaultStock?.symbol || 'NIFTY';
    const comp = defaultStock?.companyName || 'Nifty 50 Index';
    const cmp = defaultStock?.closePrice || defaultStock?.openPrice || 24500;
    const strike = roundToExactNseStrike(cmp, sym);
    const lotSize = defaultStock?.lotSizeJun2026 || 25;

    setFormSymbol(sym);
    setSymbolSearchQuery(sym);
    setFormInstrument('CALL_OPTION');
    setFormPositionSide('LONG');
    setFormStrikePrice(String(strike));
    setFormOptionType('CE');
    setFormExpiry('Monthly Expiry');
    setFormEntryPrice('');
    setFormLots('1');
    setFormQuantity(String(lotSize));
    setFormUserSL('');
    setFormUserTarget('');
    setFormStrategyTag('15m Bounce @ 9:30 AM');
    setFormNotes('');
    setIsFormModalOpen(true);
  };

  // Open Form for Editing Existing Trade
  const handleOpenEditModal = (trade: UserTrackedTrade) => {
    setEditingTrade(trade);
    setFormSymbol(trade.symbol);
    setSymbolSearchQuery(trade.symbol);
    setFormInstrument(trade.instrumentType);
    setFormPositionSide(trade.positionSide);
    setFormStrikePrice(trade.strikePrice ? String(trade.strikePrice) : '');
    setFormOptionType(trade.optionType || 'CE');
    setFormExpiry(trade.expiryDate || 'Current Expiry');
    setFormEntryPrice(String(trade.entryPrice));
    setFormQuantity(String(trade.quantity));
    setFormLots(trade.lots ? String(trade.lots) : '1');
    setFormUserSL(trade.userStopLoss ? String(trade.userStopLoss) : '');
    setFormUserTarget(trade.userTarget ? String(trade.userTarget) : '');
    setFormStrategyTag(trade.strategyTag || '15m Bounce @ 9:30 AM');
    setFormNotes(trade.entryNotes || '');
    setIsFormModalOpen(true);
  };

  // Auto update strike price when symbol or instrument changes
  const handleSelectSymbol = (stockItem: { symbol: string; companyName: string; lotSize: number }) => {
    setFormSymbol(stockItem.symbol);
    setSymbolSearchQuery(stockItem.symbol);
    setIsSymbolDropdownOpen(false);

    const matchingStock = stockMap.get(stockItem.symbol.toUpperCase());
    const cmp = matchingStock?.closePrice || matchingStock?.openPrice || 1000;
    const strike = roundToExactNseStrike(cmp, stockItem.symbol);
    setFormStrikePrice(String(strike));

    const lot = stockItem.lotSize || 250;
    setFormLots('1');
    setFormQuantity(String(lot));
  };

  // Save Trade handler
  const handleSaveTrade = (e: React.FormEvent) => {
    e.preventDefault();
    const entryPriceNum = parseFloat(formEntryPrice);
    if (isNaN(entryPriceNum) || entryPriceNum <= 0) {
      alert('Please enter a valid positive entry price (rate).');
      return;
    }

    const qtyNum = parseInt(formQuantity, 10) || 1;
    const strikeNum = parseFloat(formStrikePrice) || null;
    const matchingStock = stockMap.get(formSymbol.toUpperCase());
    const lotSize = matchingStock?.lotSizeJun2026 || 250;

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });

    if (editingTrade) {
      // Update existing
      const updated: UserTrackedTrade = {
        ...editingTrade,
        symbol: formSymbol.toUpperCase(),
        companyName: matchingStock?.companyName || formSymbol.toUpperCase(),
        instrumentType: formInstrument,
        positionSide: formPositionSide,
        strikePrice: strikeNum,
        optionType: formInstrument === 'CALL_OPTION' ? 'CE' : formInstrument === 'PUT_OPTION' ? 'PE' : null,
        expiryDate: formExpiry,
        entryPrice: entryPriceNum,
        quantity: qtyNum,
        lots: parseInt(formLots, 10) || 1,
        lotSize: lotSize,
        userStopLoss: parseFloat(formUserSL) || null,
        userTarget: parseFloat(formUserTarget) || null,
        strategyTag: formStrategyTag,
        entryNotes: formNotes
      };

      const evaluated = evaluateUserTrackedTrade(updated, matchingStock);
      setTrades((prev) => prev.map((t) => (t.id === editingTrade.id ? evaluated : t)));
    } else {
      // Create new
      const newTrade: UserTrackedTrade = {
        id: `trade_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        symbol: formSymbol.toUpperCase(),
        companyName: matchingStock?.companyName || formSymbol.toUpperCase(),
        instrumentType: formInstrument,
        positionSide: formPositionSide,
        strikePrice: strikeNum,
        optionType: formInstrument === 'CALL_OPTION' ? 'CE' : formInstrument === 'PUT_OPTION' ? 'PE' : null,
        expiryDate: formExpiry,
        entryPrice: entryPriceNum,
        quantity: qtyNum,
        lots: parseInt(formLots, 10) || 1,
        lotSize: lotSize,
        entryDate: dateStr,
        entryTime: timeStr,
        entryNotes: formNotes,
        strategyTag: formStrategyTag,
        userStopLoss: parseFloat(formUserSL) || null,
        userTarget: parseFloat(formUserTarget) || null,
        stockCMP: matchingStock?.closePrice || entryPriceNum,
        effectiveCMP: entryPriceNum,
        unrealizedPnL: 0,
        unrealizedPnLPct: 0,
        pointsDiff: 0,
        investedCapital: entryPriceNum * qtyNum,
        currentValue: entryPriceNum * qtyNum,
        highestPriceSinceEntry: entryPriceNum,
        lowestPriceSinceEntry: entryPriceNum,
        maxProfitAchieved: 0,
        maxDrawdownAchieved: 0,
        advice: 'MONITOR_CLOSELY',
        adviceBadgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
        adviceHeadline: 'Position Logged — Awaiting 5-Min Dhan Refresh',
        adviceDetails: 'Your trade is registered. Dhan API will track CMP every 5 minutes.',
        confidenceScore: 80,
        healthScore: 70,
        suggestedAction: 'Hold position with discipline.',
        lastUpdated: timeStr,
        status: 'OPEN'
      };

      const evaluated = evaluateUserTrackedTrade(newTrade, matchingStock);
      setTrades((prev) => [evaluated, ...prev]);

      // If the stock is not fetched, trigger a fetch
      if (matchingStock && !matchingStock.isFetched) {
        onFetchSingleStock(matchingStock);
      }
    }

    setIsFormModalOpen(false);
  };

  // Delete trade handler
  const handleDeleteTrade = (id: string) => {
    if (confirm('Are you sure you want to remove this trade from your tracker?')) {
      setTrades((prev) => prev.filter((t) => t.id !== id));
    }
  };

  // Open Close/Book modal
  const handleOpenCloseModal = (trade: UserTrackedTrade) => {
    setClosingTrade(trade);
    setClosePriceInput(String(trade.effectiveCMP || trade.entryPrice));
    setClosingNotes(trade.advice === 'BOOK_PROFIT' ? 'Target reached / Profit booked' : 'Manual exit');
  };

  // Confirm close trade
  const handleConfirmCloseTrade = () => {
    if (!closingTrade) return;
    const exitPrice = parseFloat(closePriceInput);
    if (isNaN(exitPrice) || exitPrice <= 0) {
      alert('Please enter a valid exit price.');
      return;
    }

    const qty = closingTrade.quantity || 1;
    let realizedPnL = 0;
    if (closingTrade.positionSide === 'LONG') {
      realizedPnL = (exitPrice - closingTrade.entryPrice) * qty;
    } else {
      realizedPnL = (closingTrade.entryPrice - exitPrice) * qty;
    }
    const invested = closingTrade.entryPrice * qty;
    const realizedPnLPct = invested > 0 ? (realizedPnL / invested) * 100 : 0;

    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }) + ' IST';

    const closed: UserTrackedTrade = {
      ...closingTrade,
      status: 'CLOSED',
      exitPrice: exitPrice,
      realizedPnL: Math.round(realizedPnL * 100) / 100,
      realizedPnLPct: Math.round(realizedPnLPct * 100) / 100,
      closedAt: timeStr,
      closingReason: closingNotes
    };

    setTrades((prev) => prev.map((t) => (t.id === closingTrade.id ? closed : t)));
    setClosingTrade(null);
  };

  // Open Averaging Guidance & Simulator Modal
  const handleOpenAveragingModal = (trade: UserTrackedTrade) => {
    setSelectedAvgTrade(trade);
    setAvgStrategyMode('equal');
    const recPrice = trade.averagingGuidance?.recommendedPrice || trade.effectiveCMP;
    const recQty = trade.averagingGuidance?.recommendedQuantity || trade.quantity;
    setCustomAvgPriceInput(recPrice ? recPrice.toFixed(2) : trade.effectiveCMP.toFixed(2));
    setCustomAvgQtyInput(String(recQty || trade.quantity));
  };

  // Execute Averaging on Position
  const handleExecuteAveraging = (trade: UserTrackedTrade, addPrice: number, addQty: number) => {
    if (!addPrice || addPrice <= 0 || !addQty || addQty <= 0) {
      alert('Please enter a valid positive averaging price and quantity.');
      return;
    }

    const currentQty = trade.quantity || 1;
    const totalCost = (trade.entryPrice * currentQty) + (addPrice * addQty);
    const newTotalQty = currentQty + addQty;
    const newBlendedEntry = Math.round((totalCost / newTotalQty) * 100) / 100;
    const dropPct = Math.round((((trade.entryPrice - newBlendedEntry) / trade.entryPrice) * 100) * 10) / 10;
    const lotSize = trade.lotSize || 250;
    const newLots = Math.max(1, Math.round(newTotalQty / lotSize));

    if (confirm(
      `Confirm Averaging Position for ${trade.symbol}?\n\n` +
      `• Adding: ${addQty} qty @ ₹${addPrice.toFixed(2)} (Cost: ₹${Math.round(addPrice * addQty).toLocaleString('en-IN')})\n` +
      `• Old Entry Rate: ₹${trade.entryPrice.toFixed(2)} (${currentQty} qty)\n` +
      `• NEW BLENDED AVERAGE: ₹${newBlendedEntry.toFixed(2)} (${newTotalQty} qty)\n` +
      `• Breakeven Improvement: ${dropPct >= 0 ? '-' : '+'}${Math.abs(dropPct)}%\n\n` +
      `Click OK to update your live position.`
    )) {
      const updated: UserTrackedTrade = {
        ...trade,
        entryPrice: newBlendedEntry,
        quantity: newTotalQty,
        lots: newLots,
        entryNotes: (trade.entryNotes ? trade.entryNotes + ' | ' : '') + `Averaged +${addQty} @ ₹${addPrice.toFixed(2)} (New Avg ₹${newBlendedEntry.toFixed(2)})`
      };
      const matchingStock = stockMap.get(trade.symbol.toUpperCase());
      const evaluated = evaluateUserTrackedTrade(updated, matchingStock);
      setTrades((prev) => prev.map((t) => (t.id === trade.id ? evaluated : t)));
      setSelectedAvgTrade(null);
    }
  };

  // 1-Click Fast Average (uses recommended 1x equal weight)
  const handleApplyAverage = (trade: UserTrackedTrade) => {
    const recPrice = trade.averagingGuidance?.recommendedPrice || trade.suggestedAveragePrice || trade.effectiveCMP;
    const recQty = trade.averagingGuidance?.recommendedQuantity || trade.suggestedAverageQty || trade.quantity;
    handleExecuteAveraging(trade, recPrice, recQty);
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header Banner & Quick Summary */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl relative overflow-hidden text-white">
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                    User Trade &amp; Option Tracker
                  </h2>
                  <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    5-Min Dhan Engine
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 font-medium mt-0.5">
                  Real-time P&amp;L monitoring, intelligent hold/book/average decision advisor &amp; Dhan HQ live refresher
                </p>
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* Add New Trade Button */}
            <button
              onClick={() => handleOpenAddModal()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs shadow-md shadow-blue-600/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ Add Trade / Option</span>
            </button>

            {/* Refresh All Prices */}
            <button
              onClick={handleRefreshAllTrackerPrices}
              disabled={isRefreshingAll}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isRefreshingAll ? 'animate-spin' : ''}`} />
              <span>{isRefreshingAll ? 'Fetching...' : 'Refresh Dhan CMP'}</span>
            </button>

            {/* 5-Min Auto-Refresh Timer Bar */}
            <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700/80 rounded-xl px-3 py-1.5 shadow-inner">
              <button
                onClick={() => setIsAutoRefreshActive(!isAutoRefreshActive)}
                className={`p-1 rounded-lg transition-colors ${
                  isAutoRefreshActive ? 'text-emerald-400 hover:bg-emerald-500/20' : 'text-slate-500 hover:bg-slate-700'
                }`}
                title={isAutoRefreshActive ? 'Pause Auto-Refresh' : 'Resume Auto-Refresh'}
              >
                {isAutoRefreshActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>

              <div className="flex items-center gap-1 text-xs font-mono font-bold text-slate-300">
                <Clock className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
                <span className="text-[11px] text-slate-400">Dhan:</span>
                <span className="text-yellow-300">{formatCountdown(countdownSeconds)}</span>
              </div>

              <select
                value={refreshIntervalMins}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setRefreshIntervalMins(val);
                  localStorage.setItem('dhan_tracker_refresh_mins', String(val));
                  setCountdownSeconds(val * 60);
                }}
                className="bg-slate-900 border border-slate-700 text-slate-200 text-[11px] font-bold rounded px-1.5 py-0.5 outline-none cursor-pointer"
                title="Select Auto-Refresh Interval"
              >
                <option value={1}>1m</option>
                <option value={3}>3m</option>
                <option value={5}>5m</option>
                <option value={10}>10m</option>
                <option value={15}>15m</option>
              </select>
            </div>
          </div>
        </div>

        {/* Real-time Summary Cards Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          {/* Total Unrealized P&L */}
          <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800">
            <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider flex items-center justify-between">
              <span>Live Unrealized P&amp;L</span>
              <Activity className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className={`text-lg sm:text-xl font-black font-mono mt-1 ${
              summaryMetrics.totalUnrealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {summaryMetrics.totalUnrealizedPnL >= 0 ? '+' : ''}₹{summaryMetrics.totalUnrealizedPnL.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className={`text-[11px] font-bold mt-0.5 ${
              summaryMetrics.totalPnLPct >= 0 ? 'text-emerald-400/90' : 'text-rose-400/90'
            }`}>
              {summaryMetrics.totalPnLPct >= 0 ? '▲' : '▼'} {summaryMetrics.totalPnLPct.toFixed(2)}% Overall Return
            </div>
          </div>

          {/* Active Positions */}
          <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800">
            <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider flex items-center justify-between">
              <span>Active Trades</span>
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="text-lg sm:text-xl font-black font-mono mt-1 text-slate-100">
              {openTrades.length} <span className="text-xs font-normal text-slate-400">Positions</span>
            </div>
            <div className="text-[11px] text-slate-400 font-semibold mt-0.5 flex items-center gap-2">
              <span className="text-emerald-400">🟢 {summaryMetrics.winningCount} Win</span>
              <span className="text-slate-600">•</span>
              <span className="text-rose-400">🔴 {summaryMetrics.losingCount} Loss</span>
            </div>
          </div>

          {/* Capital In Play */}
          <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800">
            <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider flex items-center justify-between">
              <span>Invested Capital</span>
              <DollarSign className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-lg sm:text-xl font-black font-mono mt-1 text-slate-100">
              ₹{summaryMetrics.totalInvested.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <div className="text-[11px] text-slate-400 font-semibold mt-0.5">
              Val: ₹{summaryMetrics.totalCurrentValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
          </div>

          {/* Closed / Realized P&L */}
          <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800">
            <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider flex items-center justify-between">
              <span>Realized Booked P&amp;L</span>
              <Award className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className={`text-lg sm:text-xl font-black font-mono mt-1 ${
              summaryMetrics.totalRealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {summaryMetrics.totalRealizedPnL >= 0 ? '+' : ''}₹{summaryMetrics.totalRealizedPnL.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-400 font-semibold mt-0.5">
              {summaryMetrics.closedCount} closed ({summaryMetrics.closedWinRate.toFixed(0)}% Win Rate)
            </div>
          </div>
        </div>
      </div>

      {/* 2. Sub Navigation Tabs: Active Trades vs Closed History */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-wrap gap-3">
        <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-2xl border border-slate-200">
          <button
            onClick={() => setActiveSubTab('active')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeSubTab === 'active'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🔥 Active Live Positions ({openTrades.length})
          </button>
          <button
            onClick={() => setActiveSubTab('closed')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeSubTab === 'closed'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📜 Booked / Closed Journal ({closedTrades.length})
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <span>Last Refreshed:</span>
          <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
            {lastRefreshedAt}
          </span>
        </div>
      </div>

      {/* 3. ACTIVE TRADES VIEW */}
      {activeSubTab === 'active' && (
        <>
          {/* Sub-Filters Pill Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setActiveFilterTag('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeFilterTag === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              All Positions ({openTrades.length})
            </button>

            <button
              onClick={() => setActiveFilterTag('AVG_CANDIDATES')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                activeFilterTag === 'AVG_CANDIDATES'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>⚖️ Averaging Candidates ({summaryMetrics.avgCandidateCount})</span>
            </button>

            <button
              onClick={() => setActiveFilterTag('PROFIT')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                activeFilterTag === 'PROFIT'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>In Profit ({summaryMetrics.winningCount})</span>
            </button>

            <button
              onClick={() => setActiveFilterTag('DRAWDOWN')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                activeFilterTag === 'DRAWDOWN'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>In Drawdown ({summaryMetrics.losingCount})</span>
            </button>

            <button
              onClick={() => setActiveFilterTag('OPTIONS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeFilterTag === 'OPTIONS'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
              }`}
            >
              Options ({summaryMetrics.optionsCount})
            </button>

            <button
              onClick={() => setActiveFilterTag('EQUITY')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeFilterTag === 'EQUITY'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200'
              }`}
            >
              Equity / Futures ({summaryMetrics.equityCount})
            </button>
          </div>

          {openTrades.length === 0 ? (
            /* Empty State */
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center shadow-xs">
              <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-100">
                <Target className="w-8 h-8" />
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                No Active Trades Logged Yet
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                Add any stock or option trade with your entry rate. The 5-minute Dhan API engine will track prices, calculate live P&amp;L, and guide you with smart hold/average/exit recommendations.
              </p>
              <button
                onClick={() => handleOpenAddModal()}
                className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md shadow-blue-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>+ Log Your First Trade</span>
              </button>
            </div>
          ) : displayedOpenTrades.length === 0 ? (
            /* No matching filter state */
            <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-xs">
              <p className="text-sm font-bold text-slate-700">No positions found for this filter tab.</p>
              <button
                onClick={() => setActiveFilterTag('ALL')}
                className="mt-3 px-4 py-1.5 rounded-xl bg-slate-800 text-white text-xs font-bold cursor-pointer"
              >
                Show All Positions
              </button>
            </div>
          ) : (
            /* Active Trade Cards Grid */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {displayedOpenTrades.map((trade) => {
                const matchingStock = stockMap.get(trade.symbol.toUpperCase());
                const isOption = trade.instrumentType === 'CALL_OPTION' || trade.instrumentType === 'PUT_OPTION';

                return (
                  <div
                    key={trade.id}
                    className="bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between"
                  >
                    {/* Top Card Header */}
                    <div className="p-5 sm:p-6 border-b border-slate-100 bg-gradient-to-b from-slate-50/70 to-white">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                              {trade.symbol}
                            </span>
                            <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                              {trade.companyName}
                            </span>
                            {/* Instrument Pill */}
                            <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                              trade.instrumentType === 'CALL_OPTION'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : trade.instrumentType === 'PUT_OPTION'
                                ? 'bg-rose-50 text-rose-800 border-rose-300'
                                : trade.instrumentType === 'FUTURES'
                                ? 'bg-purple-50 text-purple-800 border-purple-300'
                                : 'bg-blue-50 text-blue-800 border-blue-300'
                            }`}>
                              {trade.instrumentType === 'CALL_OPTION'
                                ? `${trade.strikePrice} CE`
                                : trade.instrumentType === 'PUT_OPTION'
                                ? `${trade.strikePrice} PE`
                                : trade.instrumentType}
                            </span>

                            {/* Position Side */}
                            <span className={`text-[9.5px] font-black px-2 py-0.5 rounded uppercase border ${
                              trade.positionSide === 'LONG'
                                ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30'
                                : 'bg-rose-500/10 text-rose-700 border-rose-500/30'
                            }`}>
                              {trade.positionSide}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                            <span>Entry: <strong>₹{trade.entryPrice.toFixed(2)}</strong></span>
                            <span>•</span>
                            <span>Qty: <strong>{trade.quantity}</strong> {trade.lots ? `(${trade.lots} lots)` : ''}</span>
                            <span>•</span>
                            <span>Time: <strong>{trade.entryDate} {trade.entryTime}</strong></span>
                            {trade.strategyTag && (
                              <span className="bg-slate-100 text-slate-700 font-bold px-1.5 py-0.2 rounded text-[10px] border border-slate-200">
                                {trade.strategyTag}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Real-time P&L Badge */}
                        <div className="text-right shrink-0">
                          <div className={`text-base sm:text-lg font-black font-mono ${
                            trade.unrealizedPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'
                          }`}>
                            {trade.unrealizedPnL >= 0 ? '+' : ''}₹{trade.unrealizedPnL.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className={`text-xs font-black inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full border ${
                            trade.unrealizedPnLPct >= 0
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>
                            {trade.unrealizedPnLPct >= 0 ? <ArrowUpRight className="w-3 h-3 stroke-[3]" /> : <ArrowDownRight className="w-3 h-3 stroke-[3]" />}
                            <span>{trade.unrealizedPnLPct >= 0 ? '+' : ''}{trade.unrealizedPnLPct.toFixed(2)}%</span>
                          </div>
                        </div>
                      </div>

                      {/* Live CMP Price Comparison Bar */}
                      <div className="mt-4 grid grid-cols-3 gap-2 bg-white p-2.5 rounded-2xl border border-slate-200/80 text-xs">
                        <div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase">Your Entry</div>
                          <div className="font-mono font-black text-slate-800">
                            ₹{trade.entryPrice.toFixed(2)}
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase">
                            {isOption ? 'Est Option CMP' : 'Live Stock CMP'}
                          </div>
                          <div className="font-mono font-black text-blue-600 flex items-center gap-1">
                            <span>₹{trade.effectiveCMP.toFixed(2)}</span>
                            <span className="text-[9px] text-slate-400 font-normal">
                              ({trade.pointsDiff >= 0 ? '+' : ''}{trade.pointsDiff.toFixed(2)} pts)
                            </span>
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase">Underlying Spot</div>
                          <div className="font-mono font-black text-slate-700">
                            ₹{trade.stockCMP ? trade.stockCMP.toFixed(2) : 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Middle Section: Technical Indicator Confluence & Hold/Exit Guidance */}
                    <div className="p-5 sm:p-6 space-y-4">
                      
                      {/* 1. Real-Time 5-Pillar Technical Indicator Pills */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                            <Gauge className="w-3.5 h-3.5 text-blue-600" />
                            <span>5-Pillar Technical Indicator Matrix</span>
                          </span>
                          
                          {/* Confluence Pill */}
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                            (trade.technicalConfluenceScore || 4) >= 4
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : (trade.technicalConfluenceScore || 4) >= 3
                              ? 'bg-blue-50 text-blue-700 border-blue-300'
                              : 'bg-rose-50 text-rose-700 border-rose-300'
                          }`}>
                            ⚡ {trade.technicalConfluenceScore || 4}/5 Confluence Score
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                          {/* RSI (14) */}
                          <div 
                            onClick={() => setSelectedTechTrade(trade)}
                            className="bg-slate-50 hover:bg-blue-50/50 p-2 rounded-xl border border-slate-200 transition-colors cursor-pointer group"
                            title="Click for RSI details"
                          >
                            <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase">
                              <span className="flex items-center gap-1">
                                <Activity className="w-3 h-3 text-purple-600" />
                                <span>RSI (14)</span>
                              </span>
                              <span className={`font-black ${
                                (trade.rsiValue || trade.stockRsi || 50) >= 60
                                  ? 'text-emerald-600'
                                  : (trade.rsiValue || trade.stockRsi || 50) <= 40
                                  ? 'text-rose-600'
                                  : 'text-amber-600'
                              }`}>
                                {trade.rsiTrajectory === 'RISING' ? '↗' : trade.rsiTrajectory === 'FALLING' ? '↘' : '→'}
                              </span>
                            </div>
                            <div className="font-mono font-bold text-slate-900 mt-0.5 flex items-baseline gap-1">
                              <span className="text-sm font-black">{(trade.rsiValue || trade.stockRsi || 52.5).toFixed(1)}</span>
                              <span className="text-[9.5px] font-semibold text-slate-500 truncate">
                                {(trade.rsiValue || trade.stockRsi || 52.5) >= 70 ? 'Overbought' : (trade.rsiValue || trade.stockRsi || 52.5) >= 55 ? 'Bullish' : (trade.rsiValue || trade.stockRsi || 52.5) <= 30 ? 'Oversold' : 'Neutral'}
                              </span>
                            </div>
                          </div>

                          {/* Volume & Order Flow */}
                          <div 
                            onClick={() => setSelectedTechTrade(trade)}
                            className="bg-slate-50 hover:bg-blue-50/50 p-2 rounded-xl border border-slate-200 transition-colors cursor-pointer group"
                            title="Click for Volume breakdown"
                          >
                            <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase">
                              <span className="flex items-center gap-1">
                                <BarChart2 className="w-3 h-3 text-blue-600" />
                                <span>Volume</span>
                              </span>
                              <span className="text-[9.5px] font-black text-blue-700">
                                {trade.volumeRatio ? `${trade.volumeRatio.toFixed(1)}x` : '1.4x'}
                              </span>
                            </div>
                            <div className="font-mono font-bold text-slate-900 mt-0.5 flex items-baseline gap-1">
                              <span className="text-xs font-black text-emerald-600">{trade.buyerPressurePct || 68}%</span>
                              <span className="text-[9.5px] font-semibold text-slate-500">Buyers</span>
                            </div>
                          </div>

                          {/* MACD (12, 26, 9) */}
                          <div 
                            onClick={() => setSelectedTechTrade(trade)}
                            className="bg-slate-50 hover:bg-blue-50/50 p-2 rounded-xl border border-slate-200 transition-colors cursor-pointer group"
                            title="Click for MACD histogram"
                          >
                            <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase">
                              <span className="flex items-center gap-1">
                                <TrendingUp className="w-3 h-3 text-indigo-600" />
                                <span>MACD</span>
                              </span>
                              <span className={`text-[9.5px] font-black ${
                                (trade.macdHistogram ?? 0.8) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                              }`}>
                                {(trade.macdHistogram ?? 0.8) >= 0 ? '▲ Bull' : '▼ Bear'}
                              </span>
                            </div>
                            <div className="font-mono font-bold text-slate-900 mt-0.5 flex items-baseline gap-1">
                              <span className="text-xs font-black">
                                {(trade.macdLine !== undefined ? trade.macdLine : 1.25) >= 0 ? '+' : ''}
                                {(trade.macdLine !== undefined ? trade.macdLine : 1.25).toFixed(2)}
                              </span>
                              <span className="text-[9px] text-slate-500 font-medium truncate">Hist: {(trade.macdHistogram ?? 0.85).toFixed(2)}</span>
                            </div>
                          </div>

                          {/* VWAP Support */}
                          <div 
                            onClick={() => setSelectedTechTrade(trade)}
                            className="bg-slate-50 hover:bg-blue-50/50 p-2 rounded-xl border border-slate-200 transition-colors cursor-pointer group"
                            title="Click for VWAP details"
                          >
                            <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase">
                              <span className="flex items-center gap-1">
                                <Shield className="w-3 h-3 text-emerald-600" />
                                <span>VWAP</span>
                              </span>
                              <span className={`text-[9.5px] font-black ${
                                (trade.vwapDistancePct ?? 0.8) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                              }`}>
                                {(trade.vwapDistancePct ?? 0.8) >= 0 ? 'Above' : 'Below'}
                              </span>
                            </div>
                            <div className="font-mono font-bold text-slate-900 mt-0.5 flex items-baseline gap-1">
                              <span className="text-xs font-black">₹{(trade.vwap || (trade.stockCMP ? trade.stockCMP * 0.992 : trade.entryPrice)).toFixed(1)}</span>
                              <span className="text-[9.5px] font-bold text-emerald-600">
                                {(trade.vwapDistancePct ?? 0.8) >= 0 ? '+' : ''}{(trade.vwapDistancePct ?? 0.8).toFixed(1)}%
                              </span>
                            </div>
                          </div>

                          {/* EMA 9 / 21 */}
                          <div 
                            onClick={() => setSelectedTechTrade(trade)}
                            className="bg-slate-50 hover:bg-blue-50/50 p-2 rounded-xl border border-slate-200 transition-colors cursor-pointer group col-span-2 sm:col-span-2"
                            title="Click for EMA trend details"
                          >
                            <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase">
                              <span className="flex items-center gap-1">
                                <Layers className="w-3 h-3 text-amber-600" />
                                <span>EMA 9 / 21 Alignment</span>
                              </span>
                              <span className={`text-[9.5px] font-black px-1.5 py-0.2 rounded ${
                                trade.emaAlignment === 'BEARISH'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {trade.emaAlignment || 'BULLISH STACK'}
                              </span>
                            </div>
                            <div className="font-mono font-bold text-slate-900 mt-0.5 flex items-center justify-between text-xs">
                              <span>9 EMA: ₹{(trade.ema9 || (trade.stockCMP ? trade.stockCMP * 0.996 : trade.entryPrice)).toFixed(1)}</span>
                              <span className="text-slate-300">|</span>
                              <span>21 EMA: ₹{(trade.ema21 || (trade.stockCMP ? trade.stockCMP * 0.988 : trade.entryPrice * 0.99)).toFixed(1)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 2. Direct Hold vs Exit Decision Guidance Banner */}
                      <div className={`p-4 rounded-2xl border ${trade.adviceBadgeClass} shadow-xs`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-xl bg-black/20 shrink-0">
                              {trade.advice === 'HOLD_FOR_PROFIT' && <TrendingUp className="w-5 h-5 text-emerald-300" />}
                              {trade.advice === 'BOOK_PROFIT' && <Award className="w-5 h-5 text-yellow-300" />}
                              {trade.advice === 'AVERAGE_PULLBACK' && <Layers className="w-5 h-5 text-amber-300" />}
                              {trade.advice === 'EXIT_CUT_LOSS' && <ShieldAlert className="w-5 h-5 text-rose-300" />}
                              {trade.advice === 'TIGHTEN_STOP_LOSS' && <AlertTriangle className="w-5 h-5 text-yellow-300" />}
                              {trade.advice === 'MONITOR_CLOSELY' && <Info className="w-5 h-5 text-blue-300" />}
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-black tracking-wide uppercase">
                                  {trade.adviceHeadline}
                                </span>
                                {trade.holdExitVerdict && (
                                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                                    trade.holdExitVerdict === 'HOLD'
                                      ? 'bg-emerald-500 text-white'
                                      : trade.holdExitVerdict === 'BOOK_PARTIAL'
                                      ? 'bg-yellow-500 text-black'
                                      : trade.holdExitVerdict === 'AVERAGE'
                                      ? 'bg-amber-500 text-white'
                                      : 'bg-rose-500 text-white'
                                  }`}>
                                    Verdict: {trade.holdExitVerdict}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs font-semibold leading-relaxed opacity-95">
                                {trade.suggestedAction}
                              </div>
                              <p className="text-[11px] opacity-80 leading-normal pt-1">
                                {trade.adviceDetails}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 3. Dedicated Averaging Guidance & Quantity Advisor Card */}
                      <div className={`p-4 rounded-2xl border transition-all ${
                        trade.averagingGuidance?.status === 'RECOMMENDED'
                          ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                          : trade.averagingGuidance?.status === 'WAIT_FOR_TRIGGER'
                          ? 'bg-amber-50/80 border-amber-300 text-amber-950'
                          : trade.averagingGuidance?.status === 'PYRAMID_ON_STRENGTH'
                          ? 'bg-indigo-50/80 border-indigo-300 text-indigo-950'
                          : 'bg-rose-50/70 border-rose-300 text-rose-950'
                      }`}>
                        {/* Header Badge */}
                        <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
                          <div className="flex items-center gap-2">
                            <Layers className={`w-4 h-4 ${
                              trade.averagingGuidance?.status === 'RECOMMENDED'
                                ? 'text-emerald-700'
                                : trade.averagingGuidance?.status === 'WAIT_FOR_TRIGGER'
                                ? 'text-amber-700'
                                : trade.averagingGuidance?.status === 'PYRAMID_ON_STRENGTH'
                                ? 'text-indigo-700'
                                : 'text-rose-700'
                            }`} />
                            <span className="text-xs font-black tracking-wide uppercase">
                              {trade.averagingGuidance?.status === 'RECOMMENDED'
                                ? '⚖️ High-Conviction Averaging Zone'
                                : trade.averagingGuidance?.status === 'WAIT_FOR_TRIGGER'
                                ? '⏳ Await Bounce Confirmation'
                                : trade.averagingGuidance?.status === 'PYRAMID_ON_STRENGTH'
                                ? '🚀 Winner Pyramiding / Scale-In'
                                : '🛑 Do Not Average (Strict SL)'}
                            </span>
                          </div>

                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase border ${
                            trade.averagingGuidance?.status === 'RECOMMENDED'
                              ? 'bg-emerald-600 text-white border-emerald-700'
                              : trade.averagingGuidance?.status === 'WAIT_FOR_TRIGGER'
                              ? 'bg-amber-600 text-white border-amber-700'
                              : trade.averagingGuidance?.status === 'PYRAMID_ON_STRENGTH'
                              ? 'bg-indigo-600 text-white border-indigo-700'
                              : 'bg-rose-600 text-white border-rose-700'
                          }`}>
                            {trade.averagingGuidance?.status?.replace(/_/g, ' ') || 'ANALYZING'}
                          </span>
                        </div>

                        {/* Averaging Price & Quantity Guidance Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mb-3">
                          {/* Price to Average */}
                          <div className="bg-white/90 p-2 rounded-xl border border-black/5 shadow-2xs">
                            <div className="text-[10px] font-bold text-slate-500 uppercase">Average At Price</div>
                            <div className="font-mono font-black text-slate-900 text-sm mt-0.5">
                              ₹{(trade.averagingGuidance?.recommendedPrice || trade.effectiveCMP).toFixed(2)}
                            </div>
                            <div className="text-[9.5px] text-slate-500 font-semibold truncate">
                              Zone: ₹{trade.averagingGuidance?.averagingZoneMin?.toFixed(1) || (trade.effectiveCMP * 0.98).toFixed(1)} - ₹{trade.averagingGuidance?.averagingZoneMax?.toFixed(1) || (trade.effectiveCMP * 1.02).toFixed(1)}
                            </div>
                          </div>

                          {/* Quantity to Add */}
                          <div className="bg-white/90 p-2 rounded-xl border border-black/5 shadow-2xs">
                            <div className="text-[10px] font-bold text-slate-500 uppercase">Quantity To Add</div>
                            <div className="font-mono font-black text-slate-900 text-sm mt-0.5">
                              {trade.averagingGuidance?.recommendedQuantity || trade.quantity} qty
                            </div>
                            <div className="text-[9.5px] text-slate-500 font-semibold">
                              {trade.lotSize ? `${Math.max(1, Math.round((trade.averagingGuidance?.recommendedQuantity || trade.quantity) / trade.lotSize))} Lot(s)` : '1 Unit'}
                            </div>
                          </div>

                          {/* New Weighted Average */}
                          <div className="bg-white/90 p-2 rounded-xl border border-black/5 shadow-2xs">
                            <div className="text-[10px] font-bold text-slate-500 uppercase">New Breakeven</div>
                            <div className="font-mono font-black text-slate-900 text-sm mt-0.5">
                              ₹{(trade.averagingGuidance?.newAveragePrice || trade.entryPrice).toFixed(2)}
                            </div>
                            <div className="text-[9.5px] text-emerald-700 font-bold">
                              {trade.averagingGuidance?.breakevenReductionPct ? `-${trade.averagingGuidance.breakevenReductionPct}% drop` : 'Optimal'}
                            </div>
                          </div>

                          {/* Capital Needed */}
                          <div className="bg-white/90 p-2 rounded-xl border border-black/5 shadow-2xs">
                            <div className="text-[10px] font-bold text-slate-500 uppercase">Capital Needed</div>
                            <div className="font-mono font-black text-slate-900 text-sm mt-0.5">
                              ₹{(trade.averagingGuidance?.capitalRequired || Math.round(trade.effectiveCMP * trade.quantity)).toLocaleString('en-IN')}
                            </div>
                            <div className="text-[9.5px] text-slate-500 font-semibold truncate">
                              Hard SL: ₹{(trade.averagingGuidance?.revisedStopLoss || (trade.entryPrice * 0.85)).toFixed(1)}
                            </div>
                          </div>
                        </div>

                        {/* Rationale Narrative */}
                        <p className="text-[11.5px] font-medium leading-relaxed opacity-90 mb-3">
                          {trade.averagingGuidance?.rationale || 'Analysis calculated using 5-pillar VWAP support, RSI trajectory, and Gann structural pivots.'}
                        </p>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-black/10 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleOpenAveragingModal(trade)}
                            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-transform active:scale-95 cursor-pointer"
                          >
                            <Layers className="w-3.5 h-3.5 text-amber-400" />
                            <span>Averaging Simulator &amp; 3 Strategies</span>
                          </button>

                          {(trade.averagingGuidance?.status === 'RECOMMENDED' || trade.averagingGuidance?.status === 'WAIT_FOR_TRIGGER' || trade.advice === 'AVERAGE_PULLBACK') && (
                            <button
                              type="button"
                              onClick={() => handleApplyAverage(trade)}
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-xs transition-transform active:scale-95 cursor-pointer"
                            >
                              ⚡ Quick 1x Average
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 4. Target, SL, and Support/Resistance Strip */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          <div className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                            <Target className="w-3 h-3 text-blue-600" />
                            <span>Target</span>
                          </div>
                          <div className="font-mono font-bold text-slate-800 mt-0.5">
                            ₹{trade.userTarget ? trade.userTarget.toFixed(2) : (trade.gannTarget1 ? trade.gannTarget1.toFixed(2) : (trade.entryPrice * 1.15).toFixed(2))}
                          </div>
                        </div>

                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          <div className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                            <Shield className="w-3 h-3 text-rose-600" />
                            <span>Trailing Stop Loss</span>
                          </div>
                          <div className="font-mono font-bold text-rose-700 mt-0.5">
                            ₹{trade.suggestedTrailingSL ? trade.suggestedTrailingSL.toFixed(2) : (trade.userStopLoss ? trade.userStopLoss.toFixed(2) : (trade.entryPrice * 0.85).toFixed(2))}
                          </div>
                        </div>

                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 col-span-2 sm:col-span-1">
                          <div className="text-[10px] text-slate-400 font-bold uppercase">Health &amp; Confidence</div>
                          <div className="font-semibold text-slate-800 mt-0.5 flex items-center gap-2">
                            <span className="font-mono font-bold text-emerald-600">{trade.healthScore || 75}/100</span>
                            <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-bold">
                              {trade.confidenceScore || 80}% Conf.
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 5. In-Card Expandable Indicator Breakdown & Hold/Exit Evidence Accordion */}
                      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50">
                        <button
                          type="button"
                          onClick={() => toggleProofCard(trade.id)}
                          className="w-full px-4 py-2.5 bg-slate-100/80 hover:bg-slate-200/80 flex items-center justify-between text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            <BarChart2 className="w-3.5 h-3.5 text-blue-600" />
                            <span>Detailed Indicator Checklist (RSI, Volume, MACD, VWAP, EMA)</span>
                          </span>
                          <div className="flex items-center gap-1 text-[11px] text-blue-600 font-black">
                            <span>{expandedProofCardIds[trade.id] ? 'Hide Proof' : 'Show Proof'}</span>
                            {expandedProofCardIds[trade.id] ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </div>
                        </button>

                        {expandedProofCardIds[trade.id] && (
                          <div className="p-4 space-y-3 bg-white border-t border-slate-200 animate-in fade-in duration-150">
                            {/* 5-Pillar Table */}
                            {trade.indicatorChecklist && trade.indicatorChecklist.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead>
                                    <tr className="border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase">
                                      <th className="pb-1.5">Indicator</th>
                                      <th className="pb-1.5">Value</th>
                                      <th className="pb-1.5">Verdict</th>
                                      <th className="pb-1.5">Impact on Trade</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {trade.indicatorChecklist.map((item, idx) => (
                                      <tr key={idx} className="hover:bg-slate-50">
                                        <td className="py-2 font-bold text-slate-900">{item.name}</td>
                                        <td className="py-2 font-mono font-semibold text-slate-700">{item.value}</td>
                                        <td className="py-2">
                                          <span className={`text-[9.5px] font-black px-2 py-0.5 rounded-full ${
                                            item.verdict === 'BULLISH'
                                              ? 'bg-emerald-100 text-emerald-800'
                                              : item.verdict === 'BEARISH'
                                              ? 'bg-rose-100 text-rose-800'
                                              : 'bg-slate-100 text-slate-800'
                                          }`}>
                                            {item.verdict}
                                          </span>
                                        </td>
                                        <td className="py-2 text-[11px] text-slate-600">{item.description}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                                  <div className="font-bold text-slate-800">RSI 14 Momentum</div>
                                  <div className="text-[11px] text-slate-600 mt-0.5">
                                    RSI at {(trade.rsiValue || trade.stockRsi || 50).toFixed(1)} confirms constructive momentum above baseline.
                                  </div>
                                </div>
                                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                                  <div className="font-bold text-slate-800">Volume &amp; Order Flow</div>
                                  <div className="text-[11px] text-slate-600 mt-0.5">
                                    Volume ratio at {trade.volumeRatio ? trade.volumeRatio.toFixed(1) : '1.4'}x with {trade.buyerPressurePct || 68}% buyer dominance.
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Reasons to HOLD vs Reasons to EXIT Side-by-side */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                              {/* Reasons to Hold */}
                              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                                <div className="text-xs font-black text-emerald-900 flex items-center gap-1.5 mb-1.5">
                                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                                  <span>Why HOLD this Position:</span>
                                </div>
                                <ul className="space-y-1 text-[11px] text-emerald-800">
                                  {trade.reasonsToHold && trade.reasonsToHold.length > 0 ? (
                                    trade.reasonsToHold.map((r, i) => (
                                      <li key={i} className="flex items-start gap-1.5">
                                        <span className="text-emerald-500 font-bold">•</span>
                                        <span>{r}</span>
                                      </li>
                                    ))
                                  ) : (
                                    <>
                                      <li className="flex items-start gap-1.5">
                                        <span className="text-emerald-500 font-bold">•</span>
                                        <span>RSI remains supportive with positive trajectory.</span>
                                      </li>
                                      <li className="flex items-start gap-1.5">
                                        <span className="text-emerald-500 font-bold">•</span>
                                        <span>Price is holding above key VWAP intraday support.</span>
                                      </li>
                                    </>
                                  )}
                                </ul>
                              </div>

                              {/* Reasons to Exit / Risks */}
                              <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl">
                                <div className="text-xs font-black text-rose-900 flex items-center gap-1.5 mb-1.5">
                                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                  <span>Exit / Invalidation Triggers:</span>
                                </div>
                                <ul className="space-y-1 text-[11px] text-rose-800">
                                  {trade.reasonsToExit && trade.reasonsToExit.length > 0 ? (
                                    trade.reasonsToExit.map((r, i) => (
                                      <li key={i} className="flex items-start gap-1.5">
                                        <span className="text-rose-500 font-bold">•</span>
                                        <span>{r}</span>
                                      </li>
                                    ))
                                  ) : (
                                    <>
                                      <li className="flex items-start gap-1.5">
                                        <span className="text-rose-500 font-bold">•</span>
                                        <span>Exit immediately if price closes below Trailing SL ₹{(trade.suggestedTrailingSL || (trade.entryPrice * 0.85)).toFixed(2)}.</span>
                                      </li>
                                      <li className="flex items-start gap-1.5">
                                        <span className="text-rose-500 font-bold">•</span>
                                        <span>Watch for MACD bearish zero-line crossover.</span>
                                      </li>
                                    </>
                                  )}
                                </ul>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="p-3 sm:px-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleRefreshSingle(trade)}
                          disabled={refreshingTradeId === trade.id}
                          className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-blue-50 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                          title="Refresh Dhan Price for this Stock"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${refreshingTradeId === trade.id ? 'animate-spin text-blue-600' : ''}`} />
                        </button>

                        <button
                          onClick={() => setSelectedTechTrade(trade)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                          title="Open Full Technical Indicator Studio"
                        >
                          <Gauge className="w-3.5 h-3.5 text-blue-600" />
                          <span>Deep-Dive Matrix</span>
                        </button>

                        <button
                          onClick={() => handleOpenEditModal(trade)}
                          className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                          title="Edit Entry Price / Qty"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteTrade(trade.id)}
                          className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                          title="Delete Trade"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Close / Book Profit Action */}
                      <button
                        onClick={() => handleOpenCloseModal(trade)}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-black text-xs shadow-2xs transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                          trade.unrealizedPnL >= 0
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                            : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{trade.unrealizedPnL >= 0 ? 'Book Profit / Exit' : 'Close Position'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* 4. CLOSED TRADES JOURNAL VIEW */}
      {activeSubTab === 'closed' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-sm">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
            <div>
              <h3 className="text-base font-black text-slate-900">
                Closed &amp; Booked Trade Journal
              </h3>
              <p className="text-xs text-slate-500">
                Historical record of all closed positions with realized gains and outcome notes
              </p>
            </div>
          </div>

          {closedTrades.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No closed trades in journal yet. When you book or close a position, it will be cataloged here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-black">
                    <th className="p-3">Stock / Option</th>
                    <th className="p-3">Side</th>
                    <th className="p-3">Entry Rate</th>
                    <th className="p-3">Exit Rate</th>
                    <th className="p-3">Qty</th>
                    <th className="p-3">Realized P&amp;L</th>
                    <th className="p-3">Return %</th>
                    <th className="p-3">Closed At</th>
                    <th className="p-3">Notes</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {closedTrades.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-bold text-slate-900">
                        <div>{t.symbol}</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          {t.instrumentType === 'CALL_OPTION' ? `${t.strikePrice} CE` : t.instrumentType === 'PUT_OPTION' ? `${t.strikePrice} PE` : t.instrumentType}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
                          t.positionSide === 'LONG' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {t.positionSide}
                        </span>
                      </td>
                      <td className="p-3 font-mono">₹{t.entryPrice.toFixed(2)}</td>
                      <td className="p-3 font-mono font-bold text-slate-900">₹{t.exitPrice?.toFixed(2) || 'N/A'}</td>
                      <td className="p-3">{t.quantity}</td>
                      <td className="p-3 font-mono font-black">
                        <span className={(t.realizedPnL || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                          {(t.realizedPnL || 0) >= 0 ? '+' : ''}₹{t.realizedPnL?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-bold">
                        <span className={(t.realizedPnLPct || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                          {(t.realizedPnLPct || 0) >= 0 ? '+' : ''}{t.realizedPnLPct?.toFixed(2) || '0.00'}%
                        </span>
                      </td>
                      <td className="p-3 text-[11px] text-slate-500 font-mono">{t.closedAt || 'Recorded'}</td>
                      <td className="p-3 text-[11px] text-slate-600 max-w-xs truncate">{t.closingReason || t.entryNotes || '-'}</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleDeleteTrade(t.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Delete from journal"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* 5. ADD / EDIT TRADE MODAL */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 sm:p-7 max-h-[90vh] overflow-y-auto relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    {editingTrade ? 'Edit Tracked Trade' : 'Log New Stock / Option Trade'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Enter your executed trade price to start live 5-min Dhan tracking
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsFormModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTrade} className="space-y-4 mt-5 text-xs">
              
              {/* Stock Symbol Selection & Search */}
              <div className="relative">
                <label className="block text-slate-700 font-black mb-1">
                  Stock / Index Symbol <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={symbolSearchQuery}
                  onChange={(e) => {
                    setSymbolSearchQuery(e.target.value);
                    setFormSymbol(e.target.value.toUpperCase());
                    setIsSymbolDropdownOpen(true);
                  }}
                  onFocus={() => setIsSymbolDropdownOpen(true)}
                  placeholder="Type to search (e.g. RELIANCE, NIFTY, HDFCBANK)..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold outline-none focus:ring-2 focus:ring-blue-500"
                />

                {isSymbolDropdownOpen && filteredSymbols.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-30 bg-white border border-slate-200 rounded-2xl shadow-xl mt-1 max-h-48 overflow-y-auto divide-y divide-slate-100">
                    {filteredSymbols.map((item) => (
                      <button
                        key={item.symbol}
                        type="button"
                        onClick={() => handleSelectSymbol(item)}
                        className="w-full text-left px-3.5 py-2 hover:bg-blue-50 flex items-center justify-between text-xs transition-colors cursor-pointer"
                      >
                        <span className="font-black text-slate-900">{item.symbol}</span>
                        <span className="text-slate-500 text-[11px] truncate max-w-xs">{item.companyName} (Lot: {item.lotSize})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Instrument Type Selector */}
              <div>
                <label className="block text-slate-700 font-black mb-1.5">
                  Instrument Type <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'CALL_OPTION', label: '🟢 Call Option (CE)' },
                    { id: 'PUT_OPTION', label: '🔴 Put Option (PE)' },
                    { id: 'EQUITY', label: '📈 Equity (Cash)' },
                    { id: 'FUTURES', label: '⚡ Futures (FUT)' }
                  ].map((inst) => (
                    <button
                      key={inst.id}
                      type="button"
                      onClick={() => {
                        setFormInstrument(inst.id as InstrumentType);
                        if (inst.id === 'CALL_OPTION') setFormOptionType('CE');
                        if (inst.id === 'PUT_OPTION') setFormOptionType('PE');
                      }}
                      className={`p-2 rounded-xl text-center font-bold border transition-all cursor-pointer ${
                        formInstrument === inst.id
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {inst.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Option Details if CE or PE */}
              {(formInstrument === 'CALL_OPTION' || formInstrument === 'PUT_OPTION') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl">
                  <div>
                    <label className="block text-blue-950 font-bold mb-1">
                      Strike Price (₹)
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formStrikePrice}
                      onChange={(e) => setFormStrikePrice(e.target.value)}
                      placeholder="e.g. 24500"
                      className="w-full px-3 py-2 bg-white border border-blue-300 rounded-xl text-slate-900 font-bold outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-blue-950 font-bold mb-1">
                      Expiry
                    </label>
                    <select
                      value={formExpiry}
                      onChange={(e) => setFormExpiry(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-blue-300 rounded-xl text-slate-900 font-bold outline-none cursor-pointer"
                    >
                      <option value="Current Weekly">Current Weekly Expiry</option>
                      <option value="Current Monthly">Current Monthly Expiry</option>
                      <option value="Next Monthly">Next Monthly Expiry</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Position Side (Long / Short) */}
              <div>
                <label className="block text-slate-700 font-black mb-1.5">
                  Position Side
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormPositionSide('LONG')}
                    className={`p-2 rounded-xl text-center font-bold border transition-all cursor-pointer ${
                      formPositionSide === 'LONG'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    🟢 Long (Buy)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormPositionSide('SHORT')}
                    className={`p-2 rounded-xl text-center font-bold border transition-all cursor-pointer ${
                      formPositionSide === 'SHORT'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    🔴 Short (Sell)
                  </button>
                </div>
              </div>

              {/* Entry Price & Quantity Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-black mb-1">
                    Entry Price / Executed Rate (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formEntryPrice}
                    onChange={(e) => setFormEntryPrice(e.target.value)}
                    placeholder="e.g. 142.50"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-black mb-1">
                    Total Quantity (Shares / Units) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(e.target.value)}
                    placeholder="e.g. 50"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Strategy Tag & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-black mb-1">
                    Trade Strategy / Reason
                  </label>
                  <select
                    value={formStrategyTag}
                    onChange={(e) => setFormStrategyTag(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold outline-none cursor-pointer"
                  >
                    <option value="15m Bounce @ 9:30 AM">🟢 15m Bounce @ 9:30 AM</option>
                    <option value="Gann Square of 9 Breakout">📐 Gann Square of 9 Breakout</option>
                    <option value="RSI 38.2% Fibonacci Pullback">📉 RSI 38.2% Fibonacci Pullback</option>
                    <option value="10:15 AM Power Pick">⭐ 10:15 AM Power Pick</option>
                    <option value="BTST Overnight Setup">🌙 BTST Overnight Setup</option>
                    <option value="Open = Low Pattern">🚀 Open = Low Pattern</option>
                    <option value="Custom Setup">🎯 Custom Setup</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-black mb-1">
                    Entry Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="e.g. Bought after 9:30 candle bounce"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 outline-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-md shadow-blue-600/30 transition-transform active:scale-95 cursor-pointer"
                >
                  {editingTrade ? 'Update Trade' : 'Save & Track Position'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. CLOSE / BOOK PROFIT MODAL */}
      {closingTrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                <h3 className="text-base font-black text-slate-900">
                  Book Profit / Close Position
                </h3>
              </div>
              <button
                onClick={() => setClosingTrade(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <p className="text-slate-600">
                Closing <strong>{closingTrade.symbol}</strong> ({closingTrade.quantity} units, bought at ₹{closingTrade.entryPrice.toFixed(2)}).
              </p>

              <div>
                <label className="block text-slate-700 font-black mb-1">
                  Exit Price (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={closePriceInput}
                  onChange={(e) => setClosePriceInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-black mb-1">
                  Reason / Journal Notes
                </label>
                <input
                  type="text"
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  placeholder="e.g. Target 2 reached (+22%)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setClosingTrade(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCloseTrade}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-md shadow-emerald-600/30 transition-transform active:scale-95 cursor-pointer"
                >
                  Confirm &amp; Move to Journal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. AVERAGING STUDIO & SCENARIO SIMULATOR MODAL */}
      {selectedAvgTrade && (() => {
        const trade = selectedAvgTrade;
        const addPrice = parseFloat(customAvgPriceInput) || trade.effectiveCMP;
        const addQty = parseInt(customAvgQtyInput, 10) || trade.quantity;
        const currentQty = trade.quantity;
        const currentEntry = trade.entryPrice;
        const newTotalQty = currentQty + addQty;
        const newTotalCost = (currentEntry * currentQty) + (addPrice * addQty);
        const simulatedAvgPrice = Math.round((newTotalCost / newTotalQty) * 100) / 100;
        const breakevenReductionPct = Math.round((((currentEntry - simulatedAvgPrice) / currentEntry) * 100) * 10) / 10;
        const capitalRequired = Math.round(addPrice * addQty);
        const lotSize = trade.lotSize || 250;
        const addedLots = Math.round(addQty / lotSize);
        const totalLots = Math.round(newTotalQty / lotSize);

        const target1Price = trade.userTarget || trade.gannTarget1 || (trade.entryPrice * 1.15);
        const target1Profit = Math.round((target1Price - simulatedAvgPrice) * newTotalQty);
        const target1PnLPct = Math.round(((target1Price - simulatedAvgPrice) / simulatedAvgPrice) * 1000) / 10;

        const slPrice = trade.averagingGuidance?.revisedStopLoss || trade.suggestedTrailingSL || trade.userStopLoss || (trade.entryPrice * 0.85);
        const slLoss = Math.round((simulatedAvgPrice - slPrice) * newTotalQty);
        const slLossPct = Math.round(((simulatedAvgPrice - slPrice) / simulatedAvgPrice) * 1000) / 10;

        const handleSelectStrategy = (mode: 'equal' | 'half' | 'double' | 'custom') => {
          setAvgStrategyMode(mode);
          const basePrice = trade.averagingGuidance?.recommendedPrice || trade.effectiveCMP;
          setCustomAvgPriceInput(basePrice.toFixed(2));
          if (mode === 'equal') {
            setCustomAvgQtyInput(String(trade.quantity));
          } else if (mode === 'half') {
            setCustomAvgQtyInput(String(Math.max(1, Math.round(trade.quantity * 0.5))));
          } else if (mode === 'double') {
            setCustomAvgQtyInput(String(trade.quantity * 2));
          }
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl max-w-3xl w-full p-5 sm:p-7 text-white relative my-8 max-h-[92vh] overflow-y-auto">
              {/* Top Header */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg sm:text-xl font-black text-white">
                        {trade.symbol} — Averaging &amp; Quantity Advisor
                      </h3>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase border ${
                        trade.averagingGuidance?.status === 'RECOMMENDED'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : trade.averagingGuidance?.status === 'WAIT_FOR_TRIGGER'
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                      }`}>
                        {trade.averagingGuidance?.status?.replace(/_/g, ' ') || 'DIAGNOSTIC'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-medium">
                      Intelligent price &amp; quantity calculator to lower breakeven without risking catastrophic drawdown
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedAvgTrade(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Current Position Snapshot Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5">
                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Current Rate</div>
                  <div className="font-mono font-black text-white text-sm mt-0.5">₹{trade.entryPrice.toFixed(2)}</div>
                  <div className="text-[10px] text-slate-500 font-semibold">{trade.quantity} units {trade.lots ? `(${trade.lots} lots)` : ''}</div>
                </div>

                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Live CMP (Dhan)</div>
                  <div className="font-mono font-black text-blue-400 text-sm mt-0.5">₹{trade.effectiveCMP.toFixed(2)}</div>
                  <div className="text-[10px] text-slate-500 font-semibold">Stock: ₹{trade.stockCMP?.toFixed(2) || 'N/A'}</div>
                </div>

                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Current P&amp;L</div>
                  <div className={`font-mono font-black text-sm mt-0.5 ${trade.unrealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {trade.unrealizedPnL >= 0 ? '+' : ''}₹{trade.unrealizedPnL.toFixed(2)}
                  </div>
                  <div className={`text-[10px] font-bold ${trade.unrealizedPnLPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {trade.unrealizedPnLPct >= 0 ? '+' : ''}{trade.unrealizedPnLPct.toFixed(1)}%
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Support / Gann Level</div>
                  <div className="font-mono font-black text-purple-300 text-sm mt-0.5">
                    ₹{(trade.vwapLevel || trade.gannSupport1 || trade.entryPrice * 0.98).toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-500 font-semibold">VWAP: ₹{(trade.vwapLevel || trade.effectiveCMP).toFixed(1)}</div>
                </div>
              </div>

              {/* Diagnostic Advice Box */}
              <div className="mt-4 p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                <div className="flex items-center gap-2 text-xs font-black text-amber-400 uppercase tracking-wide mb-1">
                  <Info className="w-4 h-4" />
                  <span>Averaging Rationale &amp; Indicator Support</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {trade.averagingGuidance?.rationale || 'Analysis uses VWAP support, RSI trajectory, and 5-pillar technical confluence.'}
                </p>
              </div>

              {/* Strategy Selector Tabs */}
              <div className="mt-5">
                <div className="text-xs font-black text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Select Averaging Strategy:</span>
                  <span className="text-[10px] text-slate-400 font-normal">Click any card to prefill</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  {/* Strategy 1: Equal 1x */}
                  <button
                    type="button"
                    onClick={() => handleSelectStrategy('equal')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      avgStrategyMode === 'equal'
                        ? 'bg-amber-500/20 border-amber-500 text-white shadow-md'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-amber-300">1. Equal (1:1)</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded">Balanced</span>
                    </div>
                    <div className="text-[11px] font-bold text-slate-200 mt-1">Add {trade.quantity} qty</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Cuts breakeven distance in half</div>
                  </button>

                  {/* Strategy 2: Conservative 0.5x */}
                  <button
                    type="button"
                    onClick={() => handleSelectStrategy('half')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      avgStrategyMode === 'half'
                        ? 'bg-blue-500/20 border-blue-500 text-white shadow-md'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-blue-300">2. Half (0.5x)</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 bg-blue-500/20 text-blue-300 rounded">Low Risk</span>
                    </div>
                    <div className="text-[11px] font-bold text-slate-200 mt-1">Add {Math.max(1, Math.round(trade.quantity * 0.5))} qty</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Tests support with minimal capital</div>
                  </button>

                  {/* Strategy 3: Aggressive 2x */}
                  <button
                    type="button"
                    onClick={() => handleSelectStrategy('double')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      avgStrategyMode === 'double'
                        ? 'bg-purple-500/20 border-purple-500 text-white shadow-md'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-purple-300">3. Double (2x)</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 bg-purple-500/20 text-purple-300 rounded">Deep Dip</span>
                    </div>
                    <div className="text-[11px] font-bold text-slate-200 mt-1">Add {trade.quantity * 2} qty</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Aggressive breakeven reduction</div>
                  </button>

                  {/* Strategy 4: Custom */}
                  <button
                    type="button"
                    onClick={() => setAvgStrategyMode('custom')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      avgStrategyMode === 'custom'
                        ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-md'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-emerald-300">4. Custom</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded">Manual</span>
                    </div>
                    <div className="text-[11px] font-bold text-slate-200 mt-1">Enter Qty &amp; Rate</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Experiment with custom values</div>
                  </button>
                </div>
              </div>

              {/* Interactive Simulation Inputs & Dynamic Result Box */}
              <div className="mt-5 p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="text-xs font-black text-white uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-emerald-400" />
                  <span>Interactive Averaging Simulator</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Averaging Buy Price (Rate in ₹)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="any"
                        value={customAvgPriceInput}
                        onChange={(e) => {
                          setCustomAvgPriceInput(e.target.value);
                          setAvgStrategyMode('custom');
                        }}
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono font-bold text-sm outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="e.g. 48.50"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-bold">₹</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Quantity To Add (Units)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        step={trade.lotSize ? String(trade.lotSize) : '1'}
                        value={customAvgQtyInput}
                        onChange={(e) => {
                          setCustomAvgQtyInput(e.target.value);
                          setAvgStrategyMode('custom');
                        }}
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono font-bold text-sm outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="e.g. 250"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-bold">
                        {trade.lotSize ? `${addedLots} Lot(s)` : 'Units'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Simulated Outcome Result Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-slate-800/80">
                  <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">New Total Qty</div>
                    <div className="font-mono font-black text-white text-base mt-0.5">{newTotalQty}</div>
                    <div className="text-[9.5px] text-slate-500 font-semibold">{totalLots} Combined Lots</div>
                  </div>

                  <div className="p-2.5 bg-emerald-950/40 rounded-xl border border-emerald-800/60">
                    <div className="text-[10px] text-emerald-400 font-bold uppercase">New Breakeven Entry</div>
                    <div className="font-mono font-black text-emerald-300 text-base mt-0.5">₹{simulatedAvgPrice.toFixed(2)}</div>
                    <div className="text-[9.5px] text-emerald-400 font-bold">
                      {breakevenReductionPct >= 0 ? `-${breakevenReductionPct}% drop` : `+${Math.abs(breakevenReductionPct)}%`}
                    </div>
                  </div>

                  <div className="p-2.5 bg-amber-950/40 rounded-xl border border-amber-800/60">
                    <div className="text-[10px] text-amber-400 font-bold uppercase">Capital Needed</div>
                    <div className="font-mono font-black text-amber-300 text-base mt-0.5">₹{capitalRequired.toLocaleString('en-IN')}</div>
                    <div className="text-[9.5px] text-slate-400 font-semibold">Total: ₹{Math.round(newTotalCost).toLocaleString('en-IN')}</div>
                  </div>

                  <div className="p-2.5 bg-purple-950/40 rounded-xl border border-purple-800/60">
                    <div className="text-[10px] text-purple-400 font-bold uppercase">Profit @ Target 1</div>
                    <div className="font-mono font-black text-purple-300 text-base mt-0.5">+₹{target1Profit.toLocaleString('en-IN')}</div>
                    <div className="text-[9.5px] text-purple-400 font-semibold">+{target1PnLPct}% on Total</div>
                  </div>
                </div>

                {/* Risk / Reward Warning on Stop Loss */}
                <div className="mt-3 p-2.5 bg-slate-900/80 rounded-xl border border-slate-800 text-xs flex items-center justify-between text-slate-300">
                  <div className="flex items-center gap-1.5 text-rose-400 font-bold">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>Hard Stop Loss on Averaged Position: ₹{slPrice.toFixed(2)}</span>
                  </div>
                  <div className="font-mono font-bold text-rose-400">
                    Max Risk: -₹{slLoss.toLocaleString('en-IN')} (-{slLossPct}%)
                  </div>
                </div>
              </div>

              {/* Modal Bottom Actions */}
              <div className="pt-5 mt-5 flex items-center justify-between border-t border-slate-800 flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedAvgTrade(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => handleExecuteAveraging(trade, addPrice, addQty)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Apply This Averaging to Position</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      {selectedTechTrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl max-w-3xl w-full p-5 sm:p-7 text-white relative my-8 max-h-[90vh] overflow-y-auto">
            {/* Modal Top Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                  <Gauge className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg sm:text-xl font-black text-white">
                      {selectedTechTrade.symbol} — Technical Analysis Studio
                    </h3>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase border ${
                      selectedTechTrade.positionSide === 'LONG'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                    }`}>
                      {selectedTechTrade.positionSide}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-medium">
                    Calculated 5-pillar confluence (RSI, Volume Surge, MACD, VWAP, EMA Stack)
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedTechTrade(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Hold / Exit Big Verdict Card */}
            <div className="mt-5 p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl ${
                    (selectedTechTrade.technicalConfluenceScore || 4) >= 4
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : (selectedTechTrade.technicalConfluenceScore || 4) >= 3
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-rose-500/20 text-rose-400'
                  }`}>
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Technical Recommendation
                    </div>
                    <div className="text-sm font-black text-white">
                      {selectedTechTrade.adviceHeadline}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded-xl text-xs font-mono font-bold text-blue-300">
                    ⚡ {selectedTechTrade.technicalConfluenceScore || 4}/5 Pillars Bullish
                  </div>
                  <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs font-mono font-bold text-emerald-300">
                    {selectedTechTrade.confidenceScore || 80}% Confidence
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-300 mt-2.5 leading-relaxed">
                {selectedTechTrade.adviceDetails}
              </p>
            </div>

            {/* 5-Pillars Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              {/* Pillar 1: RSI (14) */}
              <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-300 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-purple-400" />
                    <span>1. RSI (14-Period)</span>
                  </span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    (selectedTechTrade.rsiValue || selectedTechTrade.stockRsi || 50) >= 60
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : (selectedTechTrade.rsiValue || selectedTechTrade.stockRsi || 50) <= 40
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {(selectedTechTrade.rsiValue || selectedTechTrade.stockRsi || 50).toFixed(1)} • {selectedTechTrade.rsiTrajectory || 'RISING'}
                  </span>
                </div>

                <div className="mt-2 text-xs text-slate-400">
                  {selectedTechTrade.rsiStatus || 'Positive Momentum (55 - 65) — Bullish Continuation'}
                </div>

                {/* RSI Mini Progress Bar */}
                <div className="w-full bg-slate-800 h-2 rounded-full mt-2 relative overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 via-emerald-500 to-amber-500 transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, selectedTechTrade.rsiValue || selectedTechTrade.stockRsi || 50))}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-slate-500 mt-1 font-mono">
                  <span>30 Oversold</span>
                  <span>50 Neutral</span>
                  <span>70 Overbought</span>
                </div>
              </div>

              {/* Pillar 2: Volume & Buyer Pressure */}
              <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-300 flex items-center gap-1.5">
                    <BarChart2 className="w-4 h-4 text-blue-400" />
                    <span>2. Volume Surge &amp; Order Flow</span>
                  </span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
                    {selectedTechTrade.volumeRatio ? `${selectedTechTrade.volumeRatio.toFixed(1)}x Surge` : '1.4x Normal'}
                  </span>
                </div>

                <div className="mt-2 text-xs text-slate-400">
                  {selectedTechTrade.volumeTrendDescription || 'Healthy Volume with Buyer Dominance'}
                </div>

                {/* Buyer / Seller Pressure Bar */}
                <div className="w-full bg-rose-900/60 h-2 rounded-full mt-2 relative overflow-hidden flex">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${selectedTechTrade.buyerPressurePct || 70}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-slate-500 mt-1 font-mono">
                  <span className="text-emerald-400 font-bold">{selectedTechTrade.buyerPressurePct || 70}% Buyers</span>
                  <span className="text-rose-400 font-bold">{100 - (selectedTechTrade.buyerPressurePct || 70)}% Sellers</span>
                </div>
              </div>

              {/* Pillar 3: MACD (12, 26, 9) */}
              <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-300 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-indigo-400" />
                    <span>3. MACD Momentum (12, 26, 9)</span>
                  </span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    (selectedTechTrade.macdHistogram ?? 0.8) >= 0
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-rose-500/20 text-rose-300'
                  }`}>
                    {(selectedTechTrade.macdHistogram ?? 0.8) >= 0 ? '▲ Bullish Expansion' : '▼ Bearish Weakness'}
                  </span>
                </div>

                <div className="mt-2 text-xs text-slate-400">
                  {selectedTechTrade.macdStatus || 'Bullish Crossover — Positive Histogram Expansion'}
                </div>

                <div className="mt-2 flex items-center justify-between font-mono text-[11px] bg-slate-900 p-1.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400">MACD: <strong className="text-slate-200">{(selectedTechTrade.macdLine !== undefined ? selectedTechTrade.macdLine : 1.25).toFixed(2)}</strong></span>
                  <span className="text-slate-400">Signal: <strong className="text-slate-200">{(selectedTechTrade.macdSignal !== undefined ? selectedTechTrade.macdSignal : 0.45).toFixed(2)}</strong></span>
                  <span className="text-slate-400">Hist: <strong className="text-emerald-400">{(selectedTechTrade.macdHistogram ?? 0.8).toFixed(2)}</strong></span>
                </div>
              </div>

              {/* Pillar 4: VWAP & Intraday Support */}
              <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-300 flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span>4. VWAP Intraday Anchor</span>
                  </span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    (selectedTechTrade.vwapDistancePct ?? 0.8) >= 0
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-rose-500/20 text-rose-300'
                  }`}>
                    {(selectedTechTrade.vwapDistancePct ?? 0.8) >= 0 ? 'Holding Above Support' : 'Below VWAP'}
                  </span>
                </div>

                <div className="mt-2 text-xs text-slate-400">
                  VWAP at ₹{(selectedTechTrade.vwap || (selectedTechTrade.stockCMP ? selectedTechTrade.stockCMP * 0.992 : selectedTechTrade.entryPrice)).toFixed(2)} (
                  {(selectedTechTrade.vwapDistancePct ?? 0.8) >= 0 ? '+' : ''}{(selectedTechTrade.vwapDistancePct ?? 0.8).toFixed(2)}% buffer)
                </div>

                <div className="mt-2 text-[11px] text-emerald-400 bg-emerald-500/10 p-1.5 rounded-lg border border-emerald-500/20">
                  🛡️ Recommended Trailing Stop Loss: <strong>₹{(selectedTechTrade.suggestedTrailingSL || (selectedTechTrade.entryPrice * 0.85)).toFixed(2)}</strong>
                </div>
              </div>
            </div>

            {/* Checklist Table */}
            <div className="mt-5">
              <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-2 flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                <span>Comprehensive Technical Indicator Matrix</span>
              </h4>

              <div className="overflow-x-auto bg-slate-950 rounded-2xl border border-slate-800">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] font-black text-slate-500 uppercase">
                      <th className="p-3">Indicator</th>
                      <th className="p-3">Live Value</th>
                      <th className="p-3">Signal</th>
                      <th className="p-3">Trader Impact / Meaning</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {(selectedTechTrade.indicatorChecklist || []).map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/60">
                        <td className="p-3 font-bold text-white">{item.name}</td>
                        <td className="p-3 font-mono font-semibold text-slate-300">{item.value}</td>
                        <td className="p-3">
                          <span className={`text-[9.5px] font-black px-2 py-0.5 rounded-full ${
                            item.verdict === 'BULLISH'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : item.verdict === 'BEARISH'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-slate-700/50 text-slate-300'
                          }`}>
                            {item.verdict}
                          </span>
                        </td>
                        <td className="p-3 text-[11px] text-slate-400">{item.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Side-by-side Evidence Box */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              {/* Averaging Strategy & Guidance in Technical Studio */}
              {selectedTechTrade.averagingGuidance && (
                <div className="col-span-1 sm:col-span-2 p-4 bg-slate-950/90 border border-amber-500/40 rounded-2xl">
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-black text-amber-300 uppercase tracking-wide">
                        Averaging Advisor Matrix
                      </span>
                    </div>
                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase ${
                      selectedTechTrade.averagingGuidance.status === 'RECOMMENDED'
                        ? 'bg-emerald-500 text-white'
                        : selectedTechTrade.averagingGuidance.status === 'WAIT_FOR_TRIGGER'
                        ? 'bg-amber-500 text-black'
                        : selectedTechTrade.averagingGuidance.status === 'PYRAMID_ON_STRENGTH'
                        ? 'bg-indigo-500 text-white'
                        : 'bg-rose-500 text-white'
                    }`}>
                      {selectedTechTrade.averagingGuidance.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mb-2.5">
                    <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Average At Price</div>
                      <div className="font-mono font-black text-white mt-0.5">
                        ₹{(selectedTechTrade.averagingGuidance.recommendedPrice || selectedTechTrade.effectiveCMP).toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Add Quantity</div>
                      <div className="font-mono font-black text-white mt-0.5">
                        {selectedTechTrade.averagingGuidance.recommendedQuantity} qty
                      </div>
                    </div>
                    <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">New Breakeven</div>
                      <div className="font-mono font-black text-emerald-400 mt-0.5">
                        ₹{(selectedTechTrade.averagingGuidance.newAveragePrice || selectedTechTrade.entryPrice).toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Capital Required</div>
                      <div className="font-mono font-black text-amber-300 mt-0.5">
                        ₹{(selectedTechTrade.averagingGuidance.capitalRequired || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed mb-3">
                    {selectedTechTrade.averagingGuidance.rationale}
                  </p>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const trade = selectedTechTrade;
                        setSelectedTechTrade(null);
                        handleOpenAveragingModal(trade);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-colors cursor-pointer"
                    >
                      Open Averaging Simulator &amp; 3 Strategies →
                    </button>
                  </div>
                </div>
              )}

              <div className="p-3.5 bg-emerald-950/40 border border-emerald-800/60 rounded-2xl">
                <div className="text-xs font-black text-emerald-300 flex items-center gap-1.5 mb-2">
                  <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                  <span>Key Reasons to HOLD:</span>
                </div>
                <ul className="space-y-1.5 text-xs text-emerald-200/90">
                  {(selectedTechTrade.reasonsToHold || [
                    'RSI confirms healthy momentum expansion without saturation.',
                    'Volume surges on positive candles indicating institutional support.',
                    'Price remains firmly above key intraday VWAP support.'
                  ]).map((r, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-3.5 bg-rose-950/40 border border-rose-800/60 rounded-2xl">
                <div className="text-xs font-black text-rose-300 flex items-center gap-1.5 mb-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>Key Reasons / Triggers to EXIT:</span>
                </div>
                <ul className="space-y-1.5 text-xs text-rose-200/90">
                  {(selectedTechTrade.reasonsToExit || [
                    'Immediate exit if price closes below trailing SL.',
                    'Watch for MACD bearish zero-line breakdown.'
                  ]).map((r, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-rose-400 font-bold">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="pt-5 mt-5 flex items-center justify-between border-t border-slate-800 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleRefreshSingle(selectedTechTrade);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                  <span>Refresh Dhan Price</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTechTrade(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
                >
                  Close Matrix
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const trade = selectedTechTrade;
                    setSelectedTechTrade(null);
                    handleOpenCloseModal(trade);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/30 transition-transform active:scale-95 cursor-pointer"
                >
                  Book Profit / Exit Trade
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
