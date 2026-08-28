import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Header } from './components/Header';
import { AccessCodeGate } from './components/AccessCodeGate';
import { DhanApiGateModal } from './components/DhanApiGateModal';
import { StockTable } from './components/StockTable';
import { GannHighlights } from './components/GannHighlights';
import { RsiPullbackDashboard } from './components/RsiPullbackDashboard';
import { GannDashboard } from './components/GannDashboard';
import { BtstPredictionHub } from './components/BtstPredictionHub';
import { DhanSettingsModal } from './components/DhanSettingsModal';
import { ManualCalculatorModal } from './components/ManualCalculatorModal';
import { StockDetailModal } from './components/StockDetailModal';
import { CsvImportModal } from './components/CsvImportModal';
import { PositionSizingModal } from './components/PositionSizingModal';
import { RsiAnalystModal } from './components/RsiAnalystModal';
import { StockTimingModal } from './components/StockTimingModal';
import { NotificationScroller } from './components/NotificationScroller';
import { TradeProfitTracker } from './components/TradeProfitTracker';
import { IdealTradeRadar } from './components/IdealTradeRadar';
import { TenFifteenPicksHub } from './components/TenFifteenPicksHub';
import { ParabolicRallyDashboard } from './components/ParabolicRallyDashboard';
import { UserTradeTracker } from './components/UserTradeTracker';
import { SectorStrengthDashboard } from './components/SectorStrengthDashboard';
import { OpenHighLowScanner } from './components/OpenHighLowScanner';
import { BullishRallyPopup } from './components/BullishRallyPopup';
import { INITIAL_STOCKS, StockItem } from './data/stocks';
import { getDhanSecurityId } from './data/dhanSecurityMap';
import { StockCalculated, DhanApiCredentials, TrendFilterType, FadedStockRecord, StockTradeJourney, IdealOptionTrade } from './types';
import { calculateGann15Min } from './utils/gann';
import { is100PercentBullishMove, is100PercentBearishMove, get100PercentBullishFadeReason, get100PercentBearishFadeReason, detectHistorical100Fades } from './utils/rsiPullback';
import { getStoredTradeJourneys, updateAllTradeJourneys, clearTradeJourneys } from './utils/tradeTracker';
import { analyzeIdealOptionsAndStocks } from './utils/idealTradeAnalyzer';
import { getStockSector } from './utils/sectorMaster';

import { Download, RefreshCw, Sparkles, CheckCircle } from 'lucide-react';

export default function App() {
  // Dhan API Credentials State
  const [credentials, setCredentials] = useState<DhanApiCredentials>(() => {
    const today = new Date().toISOString().split('T')[0];
    const saved = localStorage.getItem('dhan_gann_creds');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          date: today // Always default to today's date on startup
        };
      } catch (e) {
        console.error('Failed to parse saved credentials', e);
      }
    }
    return {
      clientId: '',
      accessToken: '',
      date: today,
      segment: 'NSE_EQ',
      isConfigured: false
    };
  });

  // Stocks State
  const [stocks, setStocks] = useState<StockCalculated[]>(() => {
    // Convert INITIAL_STOCKS to StockCalculated
    return INITIAL_STOCKS.map((item) => ({
      ...item,
      isFetched: false,
      isLoading: false
    }));
  });

  // Faded 100% Moves Disappearance Log State
  const [faded100Log, setFaded100Log] = useState<FadedStockRecord[]>(() => {
    const saved = localStorage.getItem('dhan_faded_100_moves_log');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse faded 100 moves log', e);
      }
    }
    return [];
  });

  const prevActive100MapRef = useRef<Record<string, '100% Bullish Move' | '100% Bearish Move'>>({});

  // Persist faded100Log to localStorage
  useEffect(() => {
    localStorage.setItem('dhan_faded_100_moves_log', JSON.stringify(faded100Log));
  }, [faded100Log]);

  const handleClearFadedLog = () => {
    setFaded100Log([]);
    localStorage.removeItem('dhan_faded_100_moves_log');
  };

  // Monitor stock state transitions to capture 100% Bullish / Bearish disappearances
  useEffect(() => {
    if (!stocks || stocks.length === 0) return;

    const newFades: FadedStockRecord[] = [];
    const currentActiveMap: Record<string, '100% Bullish Move' | '100% Bearish Move'> = {};

    stocks.forEach((stock) => {
      if (!stock.isFetched) return;

      const isBull = is100PercentBullishMove(stock);
      const isBear = is100PercentBearishMove(stock);
      const prevStatus = prevActive100MapRef.current[stock.symbol];

      if (isBull) {
        currentActiveMap[stock.symbol] = '100% Bullish Move';
      } else if (isBear) {
        currentActiveMap[stock.symbol] = '100% Bearish Move';
      } else {
        if (prevStatus === '100% Bullish Move') {
          const now = new Date();
          const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
          const reason = get100PercentBullishFadeReason(stock);

          newFades.push({
            id: `${stock.symbol}-bullish-${Date.now()}`,
            symbol: stock.symbol,
            companyName: stock.companyName,
            fadeType: '100% Bullish Move',
            fadedAtTime: timeStr,
            fadedAtIso: now.toISOString(),
            reason,
            lastLtp: stock.closePrice || 0,
            openPrice: stock.openPrice || 0,
            highPrice: stock.highPrice || 0,
            lowPrice: stock.lowPrice || 0,
            pctChange: stock.pctChange || 0,
            vwap: stock.vwap,
            rsi: stock.rsi
          });
        } else if (prevStatus === '100% Bearish Move') {
          const now = new Date();
          const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
          const reason = get100PercentBearishFadeReason(stock);

          newFades.push({
            id: `${stock.symbol}-bearish-${Date.now()}`,
            symbol: stock.symbol,
            companyName: stock.companyName,
            fadeType: '100% Bearish Move',
            fadedAtTime: timeStr,
            fadedAtIso: now.toISOString(),
            reason,
            lastLtp: stock.closePrice || 0,
            openPrice: stock.openPrice || 0,
            highPrice: stock.highPrice || 0,
            lowPrice: stock.lowPrice || 0,
            pctChange: stock.pctChange || 0,
            vwap: stock.vwap,
            rsi: stock.rsi
          });
        } else {
          const histFades = detectHistorical100Fades(stock);
          histFades.forEach((hf) => {
            if (!faded100Log.some((item) => item.symbol === hf.symbol && item.fadeType === hf.fadeType)) {
              newFades.push(hf);
            }
          });
        }
      }
    });

    prevActive100MapRef.current = currentActiveMap;

    if (newFades.length > 0) {
      setFaded100Log((prev) => {
        const combined = [...newFades, ...prev];
        const uniqueMap = new Map<string, FadedStockRecord>();
        combined.forEach((item) => {
          const key = `${item.symbol}-${item.fadeType}`;
          if (!uniqueMap.has(key)) {
            uniqueMap.set(key, item);
          }
        });
        return Array.from(uniqueMap.values()).slice(0, 100);
      });
    }
  }, [stocks]);

  // 🚀 Trade Confidence & Profit Trajectory Journey State (persisted across fetches)
  const [tradeJourneys, setTradeJourneys] = useState<Record<string, StockTradeJourney>>(() => {
    return getStoredTradeJourneys();
  });

  // 🎯 Top Ideal Options & Stock Trades to Trade NOW (recalculated across historical records on every fetch)
  const idealTrades = useMemo(() => {
    return analyzeIdealOptionsAndStocks(stocks, tradeJourneys);
  }, [stocks, tradeJourneys]);

  // Automatically update and track trade journeys on every stock price/RSI fetch
  useEffect(() => {
    if (stocks.length > 0) {
      setTradeJourneys((prev) => {
        const updated = updateAllTradeJourneys(stocks, prev);
        return updated;
      });
    }
  }, [stocks]);

  const handleClearTradeJourneys = () => {
    clearTradeJourneys();
    setTradeJourneys({});
    setNotification({ type: 'info', message: 'Trade journey history reset for active session.' });
  };

  // Active filter state
  const [activeTrendFilter, setActiveTrendFilter] = useState<TrendFilterType>('ALL');


  // Active Dashboard View Tab ('gann', 'gann_dashboard', 'rsi_pullback', 'btst', 'parabolic_rally', 'user_tracker', or 'sector_strength')
  const [activeDashboardTab, setActiveDashboardTab] = useState<'gann' | 'gann_dashboard' | 'rsi_pullback' | 'btst' | 'parabolic_rally' | 'user_tracker' | 'sector_strength' | 'open_high_low'>('gann');

  // Access Code State (7774)
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    return localStorage.getItem('gann_app_access_code_unlocked') === 'true' ||
           sessionStorage.getItem('gann_app_access_code_unlocked') === 'true';
  });

  // Modal visibility states
  const [isDhanGateOpen, setIsDhanGateOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isManualCalcOpen, setIsManualCalcOpen] = useState(false);
  const [isCsvImportOpen, setIsCsvImportOpen] = useState(false);
  const [isPositionSizerOpen, setIsPositionSizerOpen] = useState(false);
  const [positionSizerStock, setPositionSizerStock] = useState<StockCalculated | null>(null);
  const [selectedDetailStock, setSelectedDetailStock] = useState<StockCalculated | null>(null);
  const [editingStockManual, setEditingStockManual] = useState<StockCalculated | null>(null);
  const [rsiAnalystStock, setRsiAnalystStock] = useState<StockCalculated | null>(null);
  const [timingModalStock, setTimingModalStock] = useState<StockCalculated | null>(null);

  const handleOpenPositionSizer = (stock?: StockCalculated | null) => {
    setPositionSizerStock(stock || null);
    setIsPositionSizerOpen(true);
  };

  // Bulk Loading State
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [notification, setNotification] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  // Auto-Fetch State (Default: 5 minutes, fetching 15m candles)
  const [autoFetchIntervalMinutes, setAutoFetchIntervalMinutes] = useState<number>(() => {
    const saved = localStorage.getItem('dhan_auto_fetch_interval_mins');
    return saved ? Number(saved) : 5;
  });
  const [isAutoFetchEnabled, setIsAutoFetchEnabled] = useState<boolean>(() => {
    return localStorage.getItem('dhan_auto_fetch_enabled') !== 'false';
  });
  const [nextFetchSeconds, setNextFetchSeconds] = useState<number>(() => {
    const savedMins = localStorage.getItem('dhan_auto_fetch_interval_mins');
    return (savedMins ? Number(savedMins) : 5) * 60;
  });
  const [lastFetchTime, setLastFetchTime] = useState<string | null>(null);

  const isBulkLoadingRef = useRef(isBulkLoading);
  isBulkLoadingRef.current = isBulkLoading;

  const credentialsRef = useRef(credentials);
  credentialsRef.current = credentials;

  const handleFetchAllRef = useRef<() => Promise<void>>(() => Promise.resolve());

  // Auto-hide notification
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Helper to sync global settings to server
  const syncGlobalSettings = async (partialSettings: {
    dhanCredentials?: DhanApiCredentials;
    isUnlocked?: boolean;
    accountCapital?: string;
    pinnedStockIds?: string[];
  }) => {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partialSettings)
      });
    } catch (e) {
      console.error('Failed to sync global settings to server:', e);
    }
  };

  // Load global settings from server on initial mount
  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings) {
          const { dhanCredentials, isUnlocked: serverUnlocked, accountCapital, pinnedStockIds } = data.settings;
          
          if (dhanCredentials && (dhanCredentials.clientId || dhanCredentials.accessToken)) {
            setCredentials((prev) => {
              const updated: DhanApiCredentials = {
                ...prev,
                ...dhanCredentials,
                date: dhanCredentials.date || prev.date,
                isConfigured: Boolean(dhanCredentials.clientId && dhanCredentials.accessToken)
              };
              localStorage.setItem('dhan_gann_creds', JSON.stringify(updated));
              return updated;
            });
          }

          if (serverUnlocked === true) {
            setIsUnlocked(true);
            localStorage.setItem('gann_app_access_code_unlocked', 'true');
            sessionStorage.setItem('gann_app_access_code_unlocked', 'true');
          }

          if (accountCapital) {
            localStorage.setItem('gann_app_capital', accountCapital);
          }

          if (pinnedStockIds && Array.isArray(pinnedStockIds)) {
            localStorage.setItem('gann_pinned_stock_ids', JSON.stringify(pinnedStockIds));
          }
        }
      })
      .catch((err) => {
        console.warn('Could not fetch global settings from server:', err);
      });
  }, []);

  // Save credentials to localStorage and server
  const handleSaveCredentials = (newCreds: DhanApiCredentials) => {
    setCredentials(newCreds);
    localStorage.setItem('dhan_gann_creds', JSON.stringify(newCreds));
    syncGlobalSettings({ dhanCredentials: newCreds });
    setNotification({
      type: 'success',
      message: 'Dhan API credentials saved globally!'
    });
  };

  // Handle Date Change directly from Header bar or Settings
  const handleDateChange = (newDate: string) => {
    const updated = { ...credentials, date: newDate };
    setCredentials(updated);
    localStorage.setItem('dhan_gann_creds', JSON.stringify(updated));
    syncGlobalSettings({ dhanCredentials: updated });
    setNotification({
      type: 'info',
      message: `Date updated to ${newDate}. Click "Fetch All 15m Candles" to load candles for this date.`
    });
  };

  // Update stock prices inline & recalculate Gann values
  const handleUpdateStockPrices = (
    stockId: string,
    openPrice: number,
    closePrice: number,
    highPriceInput?: number | null,
    lowPriceInput?: number | null
  ) => {
    setStocks((prev) =>
      prev.map((s) => {
        if (s.id !== stockId) return s;

        if (openPrice <= 0 && closePrice <= 0) {
          return {
            ...s,
            openPrice: null,
            closePrice: null,
            highPrice: null,
            lowPrice: null,
            openCalc: null,
            closeCalc: null,
            buyAbove: null,
            sellBelow: null,
            targetsUp: [],
            targetsDown: [],
            trend: null,
            isOpenEqualLow: false,
            isOpenEqualHigh: false,
            openLowDiffPct: null,
            openHighDiffPct: null,
            isFetched: false
          };
        }

        const highPrice = highPriceInput !== undefined && highPriceInput !== null ? highPriceInput : s.highPrice;
        const lowPrice = lowPriceInput !== undefined && lowPriceInput !== null ? lowPriceInput : s.lowPrice;

        const calc = calculateGann15Min(openPrice, closePrice, s.rsi, s.vwap, highPrice, lowPrice, 0.001, s.adx, s.first15mHigh, s.first15mLow, s.symbol, s.candleTimestamp);
        return {
          ...s,
          openPrice,
          closePrice,
          highPrice,
          lowPrice,
          openCalc: calc.openCalc,
          closeCalc: calc.closeCalc,
          totalCalc: calc.totalCalc,
          buyAbove: calc.buyAbove,
          sellBelow: calc.sellBelow,
          targetsUp: calc.targetsUp,
          targetsDown: calc.targetsDown,
          trend: calc.trend,
          pctChange: calc.pctChange,
          gannScore: calc.gannScore,
          isOpenEqualLow: calc.isOpenEqualLow,
          isOpenEqualHigh: calc.isOpenEqualHigh,
          openLowDiffPct: calc.openLowDiffPct,
          openHighDiffPct: calc.openHighDiffPct,
          rsi: calc.rsi ?? s.rsi ?? null,
          adx: calc.adx ?? s.adx ?? null,
          vwap: calc.vwap,
          vwapStatus: calc.vwapStatus,
          fib382Bull: calc.fib382Bull,
          fib382Bear: calc.fib382Bear,
          fibPullbackPct: calc.fibPullbackPct,
          fibStatus: calc.fibStatus,
          isFib382Retrace: calc.isFib382Retrace,
          fib382Time: calc.fib382Time,
          isFetched: true
        };
      })
    );
  };

  // Clear all loaded prices
  const handleClearAllPrices = () => {
    setStocks((prev) =>
      prev.map((s) => ({
        ...s,
        openPrice: null,
        closePrice: null,
        openCalc: null,
        closeCalc: null,
        buyAbove: null,
        sellBelow: null,
        targetsUp: [],
        targetsDown: [],
        trend: null,
        volume: null,
        candleTimestamp: null,
        isFetched: false,
        isLoading: false,
        error: null
      }))
    );
    setNotification({
      type: 'info',
      message: 'Cleared all stock candle prices.'
    });
  };

  // Helper function to fetch single stock candle with retries
  const fetchSingleStockCandle = async (stock: StockCalculated) => {
    const secId = stock.securityId || getDhanSecurityId(stock.symbol);

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await fetch('/api/dhan/intraday-15m', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: credentials.clientId,
            accessToken: credentials.accessToken,
            securityId: secId,
            exchangeSegment: stock.exchangeSegment || credentials.segment || 'NSE_EQ',
            symbol: stock.symbol,
            date: credentials.date
          })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          return { success: true, data, secId };
        }

        if (attempt < 2 && (res.status >= 500 || res.status === 429)) {
          await new Promise((r) => setTimeout(r, 400));
          continue;
        }

        return { success: false, error: data.error || 'Failed to fetch candle data', secId };
      } catch (err: any) {
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 500));
          continue;
        }
        return { success: false, error: err.message || 'Network request failed', secId };
      }
    }
    return { success: false, error: 'Network request failed', secId };
  };

  // Fetch single stock candle from Dhan API
  const handleFetchSingleDhan = async (stock: StockCalculated) => {
    setStocks((prev) => {
      const exists = prev.some((s) => s.id === stock.id || s.symbol.toUpperCase() === stock.symbol.toUpperCase());
      if (exists) {
        return prev.map((s) => (s.id === stock.id || s.symbol.toUpperCase() === stock.symbol.toUpperCase() ? { ...s, isLoading: true, error: null } : s));
      } else {
        return [...prev, { ...stock, isLoading: true, error: null }];
      }
    });

    const result = await fetchSingleStockCandle(stock);

    if (result.success && result.data) {
      const data = result.data;
      const openPrice = data.open;
      const closePrice = data.close;
      const rsi = data.rsi;
      const adx = data.adx;
      const vwap = data.vwap !== undefined ? data.vwap : (data.high && data.low ? Math.round(((data.high + data.low + closePrice) / 3) * 100) / 100 : null);
      const calc = calculateGann15Min(openPrice, closePrice, rsi, vwap, data.high, data.low, 0.001, adx, data.first15mHigh, data.first15mLow, stock.symbol, data.candleTimestamp);

      const updatedObj: StockCalculated = {
        ...stock,
        securityId: data.securityId || result.secId,
        openPrice,
        closePrice,
        highPrice: data.high,
        lowPrice: data.low,
        previousClose: data.previousClose !== undefined ? data.previousClose : stock.previousClose,
        first15mHigh: data.first15mHigh,
        first15mLow: data.first15mLow,
        first1mOpen: data.first1mOpen,
        first1mHigh: data.first1mHigh,
        first1mLow: data.first1mLow,
        first1mClose: data.first1mClose,
        volume: data.volume,
        rsi: rsi !== undefined && rsi !== null ? rsi : (stock.rsi ?? null),
        adx: calc.adx ?? adx ?? stock.adx ?? null,
        rsiTimeline: data.rsiTimeline || stock.rsiTimeline,
        vwap: calc.vwap,
        vwapStatus: calc.vwapStatus,
        candleTimestamp: data.candleTimestamp,
        fetchedDate: data.fetchedDate || stock.fetchedDate,
        openCalc: calc.openCalc,
        closeCalc: calc.closeCalc,
        totalCalc: calc.totalCalc,
        buyAbove: calc.buyAbove,
        sellBelow: calc.sellBelow,
        targetsUp: calc.targetsUp,
        targetsDown: calc.targetsDown,
        trend: calc.trend,
        pctChange: calc.pctChange,
        gannScore: calc.gannScore,
        isOpenEqualLow: calc.isOpenEqualLow,
        isOpenEqualHigh: calc.isOpenEqualHigh,
        openLowDiffPct: calc.openLowDiffPct,
        openHighDiffPct: calc.openHighDiffPct,
        fib382Bull: calc.fib382Bull,
        fib382Bear: calc.fib382Bear,
        fibPullbackPct: calc.fibPullbackPct,
        fibStatus: calc.fibStatus,
        isFib382Retrace: calc.isFib382Retrace,
        fib382Time: calc.fib382Time,
        isFetched: true,
        isLoading: false,
        error: null
      };

      setStocks((prev) => {
        const exists = prev.some((s) => s.id === stock.id || s.symbol.toUpperCase() === stock.symbol.toUpperCase());
        if (exists) {
          return prev.map((s) => (s.id === stock.id || s.symbol.toUpperCase() === stock.symbol.toUpperCase() ? updatedObj : s));
        } else {
          return [...prev, updatedObj];
        }
      });

      setNotification({
        type: 'success',
        message: `Fetched 15-min candle for ${stock.symbol}! Open: ₹${openPrice}, Close: ₹${closePrice}`
      });
    } else {
      if (result.error && (result.error.toLowerCase().includes('missing dhan credentials') || result.error.toLowerCase().includes('client id and access token'))) {
        setIsSettingsOpen(true);
      }
      setStocks((prev) =>
        prev.map((s) =>
          (s.id === stock.id || s.symbol.toUpperCase() === stock.symbol.toUpperCase()) ? { ...s, isLoading: false, error: result.error || 'Fetch failed' } : s
        )
      );
      setNotification({
        type: 'error',
        message: `Error fetching ${stock.symbol}: ${result.error}`
      });
    }
  };

  // Fetch all stocks belonging to a specific sector from Dhan API for real-time sector strength
  const handleFetchSectorStocks = async (symbolOrSectorKey: string) => {
    const cleanSym = (symbolOrSectorKey || '').trim().toUpperCase();
    if (!cleanSym) return;

    const secMeta = getStockSector(cleanSym);
    const targetSectorKey = secMeta.sectorKey !== 'DIVERSIFIED' ? secMeta.sectorKey : cleanSym;

    // Find all peer stocks in that sector from current stocks list
    const sectorPeers = stocks.filter((s) => {
      const sm = getStockSector(s.symbol);
      return sm.sectorKey === targetSectorKey;
    });

    // Check if target symbol is already present
    const existingTarget = stocks.find((s) => s.symbol.toUpperCase() === cleanSym);
    const targetStock: StockCalculated = existingTarget || {
      id: `stock_${cleanSym}`,
      symbol: cleanSym,
      companyName: cleanSym,
      lotSizeJun2026: 500,
      lotSizeJul2026: 500,
      lotSizeAug2026: 500,
      screenerUrl: `https://scanx.trade/company/${cleanSym.toLowerCase()}`,
      securityId: getDhanSecurityId(cleanSym),
      closePrice: null,
      pctChange: 0,
      isFetched: false
    };

    // Combine target stock + its peer sector stocks (limiting to up to 14 peers for fast response)
    const listToFetch: StockCalculated[] = [
      targetStock,
      ...sectorPeers.filter((p) => p.symbol.toUpperCase() !== cleanSym).slice(0, 14)
    ];

    setNotification({
      type: 'info',
      message: `⚡ Fetching live Dhan candles for ${targetStock.symbol} & ${secMeta.sectorName} (${listToFetch.length} stocks)...`
    });

    // Fetch target stock first for immediate feedback
    await handleFetchSingleDhan(targetStock);

    // Fetch peer stocks in parallel batches of 4
    const remainingPeers = listToFetch.filter((s) => s.symbol.toUpperCase() !== cleanSym);
    const CONCURRENCY = 4;
    for (let i = 0; i < remainingPeers.length; i += CONCURRENCY) {
      const chunk = remainingPeers.slice(i, i + CONCURRENCY);
      await Promise.all(
        chunk.map(async (stk) => {
          try {
            const result = await fetchSingleStockCandle(stk);
            if (result.success && result.data) {
              const data = result.data;
              const openPrice = data.open;
              const closePrice = data.close;
              const rsi = data.rsi;
              const adx = data.adx;
              const vwap = data.vwap !== undefined ? data.vwap : (data.high && data.low ? Math.round(((data.high + data.low + closePrice) / 3) * 100) / 100 : null);
              const calc = calculateGann15Min(openPrice, closePrice, rsi, vwap, data.high, data.low, 0.001, adx, data.first15mHigh, data.first15mLow, stk.symbol, data.candleTimestamp);

              setStocks((prev) => {
                const exists = prev.some((s) => s.id === stk.id || s.symbol.toUpperCase() === stk.symbol.toUpperCase());
                const updatedItem: StockCalculated = {
                  ...(prev.find((s) => s.id === stk.id || s.symbol.toUpperCase() === stk.symbol.toUpperCase()) || stk),
                  securityId: data.securityId || result.secId,
                  openPrice,
                  closePrice,
                  highPrice: data.high,
                  lowPrice: data.low,
                  previousClose: data.previousClose !== undefined ? data.previousClose : stk.previousClose,
                  first15mHigh: data.first15mHigh,
                  first15mLow: data.first15mLow,
                  first1mOpen: data.first1mOpen,
                  first1mHigh: data.first1mHigh,
                  first1mLow: data.first1mLow,
                  first1mClose: data.first1mClose,
                  volume: data.volume,
                  rsi: rsi !== undefined && rsi !== null ? rsi : (stk.rsi ?? null),
                  adx: calc.adx ?? adx ?? stk.adx ?? null,
                  rsiTimeline: data.rsiTimeline || stk.rsiTimeline,
                  vwap: calc.vwap,
                  vwapStatus: calc.vwapStatus,
                  candleTimestamp: data.candleTimestamp,
                  fetchedDate: data.fetchedDate || stk.fetchedDate,
                  openCalc: calc.openCalc,
                  closeCalc: calc.closeCalc,
                  totalCalc: calc.totalCalc,
                  buyAbove: calc.buyAbove,
                  sellBelow: calc.sellBelow,
                  targetsUp: calc.targetsUp,
                  targetsDown: calc.targetsDown,
                  trend: calc.trend,
                  pctChange: calc.pctChange,
                  gannScore: calc.gannScore,
                  isOpenEqualLow: calc.isOpenEqualLow,
                  isOpenEqualHigh: calc.isOpenEqualHigh,
                  openLowDiffPct: calc.openLowDiffPct,
                  openHighDiffPct: calc.openHighDiffPct,
                  fib382Bull: calc.fib382Bull,
                  fib382Bear: calc.fib382Bear,
                  fibPullbackPct: calc.fibPullbackPct,
                  fibStatus: calc.fibStatus,
                  isFib382Retrace: calc.isFib382Retrace,
                  fib382Time: calc.fib382Time,
                  isFetched: true,
                  isLoading: false,
                  error: null
                };

                if (exists) {
                  return prev.map((s) => (s.id === stk.id || s.symbol.toUpperCase() === stk.symbol.toUpperCase() ? updatedItem : s));
                } else {
                  return [...prev, updatedItem];
                }
              });
            }
          } catch (e) {
            console.error(`Failed to fetch peer candle for ${stk.symbol}:`, e);
          }
        })
      );
    }

    setNotification({
      type: 'success',
      message: `✅ Live Sector Strength updated for ${secMeta.sectorName} from Dhan API!`
    });
  };

  // Fetch all stocks via Dhan API
  const handleFetchAllDhan = async () => {
    setIsBulkLoading(true);
    setBulkProgress({ current: 0, total: stocks.length });

    // Reset errors
    setStocks((prev) =>
      prev.map((s) => ({ ...s, error: null }))
    );

    const CONCURRENCY = 8;
    let completed = 0;
    let authErrorOccurred = false;

    for (let i = 0; i < stocks.length; i += CONCURRENCY) {
      const chunk = stocks.slice(i, i + CONCURRENCY);

      const chunkIds = new Set(chunk.map((c) => c.id));
      setStocks((prev) =>
        prev.map((s) => (chunkIds.has(s.id) ? { ...s, isLoading: true, error: null } : s))
      );

      await Promise.all(
        chunk.map(async (stock) => {
          const result = await fetchSingleStockCandle(stock);

          if (result.success && result.data) {
            const data = result.data;
            const openPrice = data.open;
            const closePrice = data.close;
            const rsi = data.rsi;
            const adx = data.adx;
            const vwap = data.vwap !== undefined ? data.vwap : (data.high && data.low ? Math.round(((data.high + data.low + closePrice) / 3) * 100) / 100 : null);
            const calc = calculateGann15Min(openPrice, closePrice, rsi, vwap, data.high, data.low, 0.001, adx, data.first15mHigh, data.first15mLow, stock.symbol, data.candleTimestamp);

            setStocks((prev) =>
              prev.map((s) =>
                s.id === stock.id
                  ? {
                      ...s,
                      securityId: data.securityId || result.secId,
                      openPrice,
                      closePrice,
                      highPrice: data.high,
                      lowPrice: data.low,
                      previousClose: data.previousClose !== undefined ? data.previousClose : s.previousClose,
                      first15mHigh: data.first15mHigh,
                      first15mLow: data.first15mLow,
                      first1mOpen: data.first1mOpen,
                      first1mHigh: data.first1mHigh,
                      first1mLow: data.first1mLow,
                      first1mClose: data.first1mClose,
                      volume: data.volume,
                      rsi: rsi !== undefined && rsi !== null ? rsi : (s.rsi ?? null),
                      adx: calc.adx ?? adx ?? s.adx ?? null,
                      rsiTimeline: data.rsiTimeline || s.rsiTimeline,
                      vwap: calc.vwap,
                      vwapStatus: calc.vwapStatus,
                      candleTimestamp: data.candleTimestamp,
                      fetchedDate: data.fetchedDate || s.fetchedDate,
                      openCalc: calc.openCalc,
                      closeCalc: calc.closeCalc,
                      totalCalc: calc.totalCalc,
                      buyAbove: calc.buyAbove,
                      sellBelow: calc.sellBelow,
                      targetsUp: calc.targetsUp,
                      targetsDown: calc.targetsDown,
                      trend: calc.trend,
                      pctChange: calc.pctChange,
                      gannScore: calc.gannScore,
                      isOpenEqualLow: calc.isOpenEqualLow,
                      isOpenEqualHigh: calc.isOpenEqualHigh,
                      openLowDiffPct: calc.openLowDiffPct,
                      openHighDiffPct: calc.openHighDiffPct,
                      fib382Bull: calc.fib382Bull,
                      fib382Bear: calc.fib382Bear,
                      fibPullbackPct: calc.fibPullbackPct,
                      fibStatus: calc.fibStatus,
                      isFib382Retrace: calc.isFib382Retrace,
                      fib382Time: calc.fib382Time,
                      isFetched: true,
                      isLoading: false,
                      error: null
                    }
                  : s
              )
            );
          } else {
            if (result.error && (result.error.toLowerCase().includes('missing dhan credentials') || result.error.toLowerCase().includes('client id and access token'))) {
              authErrorOccurred = true;
            }
            setStocks((prev) =>
              prev.map((s) =>
                s.id === stock.id
                  ? { ...s, isLoading: false, error: result.error || 'Fetch failed' }
                  : s
              )
            );
          }

          completed++;
          setBulkProgress({ current: completed, total: stocks.length });
        })
      );

      if (authErrorOccurred) {
        setIsSettingsOpen(true);
        setNotification({
          type: 'error',
          message: 'Dhan API credentials required! Please enter your Client ID and Access Token in Settings.'
        });
        setIsBulkLoading(false);
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 30));
    }

    setIsBulkLoading(false);
    const nowTimeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLastFetchTime(nowTimeStr);
    setNextFetchSeconds(autoFetchIntervalMinutes * 60);
    setNotification({
      type: 'success',
      message: 'Completed fetching 15-minute candles for all stocks from Dhan API!'
    });
  };

  handleFetchAllRef.current = handleFetchAllDhan;

  const handleToggleAutoFetch = () => {
    setIsAutoFetchEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('dhan_auto_fetch_enabled', String(next));
      if (next) {
        setNextFetchSeconds(autoFetchIntervalMinutes * 60);
      }
      return next;
    });
  };

  const handleChangeAutoFetchInterval = (mins: number) => {
    setAutoFetchIntervalMinutes(mins);
    localStorage.setItem('dhan_auto_fetch_interval_mins', String(mins));
    setNextFetchSeconds(mins * 60);
  };

  // 15-Minute Auto-Fetch Interval Effect
  useEffect(() => {
    if (!isAutoFetchEnabled) return;

    const intervalId = setInterval(() => {
      setNextFetchSeconds((prev) => {
        if (prev <= 1) {
          if (credentialsRef.current.isConfigured && !isBulkLoadingRef.current) {
            handleFetchAllRef.current();
            setNotification({
              type: 'info',
              message: `⏱️ Auto-Fetch triggered (${autoFetchIntervalMinutes}m interval)! Updating 15m candles...`
            });
          }
          return autoFetchIntervalMinutes * 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isAutoFetchEnabled, autoFetchIntervalMinutes]);

  // Add/edit manual stock entry
  const handleAddOrEditManualStock = (manualStock: StockCalculated) => {
    setStocks((prev) => {
      const existsIdx = prev.findIndex((s) => s.symbol === manualStock.symbol || s.id === manualStock.id);
      if (existsIdx >= 0) {
        const updated = [...prev];
        updated[existsIdx] = { ...updated[existsIdx], ...manualStock };
        return updated;
      } else {
        return [manualStock, ...prev];
      }
    });

    setNotification({
      type: 'success',
      message: `Updated calculations for ${manualStock.symbol}`
    });
  };

  // Reset CSV stock list to initial list
  const handleResetToDefaultCSV = () => {
    setStocks(
      INITIAL_STOCKS.map((item) => ({
        ...item,
        isFetched: false,
        isLoading: false
      }))
    );
    setNotification({
      type: 'info',
      message: 'Reset stock list to original Nifty Futures CSV.'
    });
  };

  // Import custom stock list
  const handleImportStocks = (imported: StockItem[]) => {
    setStocks(
      imported.map((item) => {
        if (item.openPrice && item.closePrice) {
          const calc = calculateGann15Min(item.openPrice, item.closePrice);
          return {
            ...item,
            openCalc: calc.openCalc,
            closeCalc: calc.closeCalc,
            buyAbove: calc.buyAbove,
            sellBelow: calc.sellBelow,
            targetsUp: calc.targetsUp,
            targetsDown: calc.targetsDown,
            trend: calc.trend,
            isFetched: true,
            isLoading: false,
            candleTimestamp: 'CSV Imported'
          };
        }
        return {
          ...item,
          isFetched: false,
          isLoading: false
        };
      })
    );
    setNotification({
      type: 'success',
      message: `Imported ${imported.length} stocks from custom CSV.`
    });
  };

  // Export report to CSV
  const handleExportCsv = () => {
    const headers = [
      'Symbol',
      'Company Name',
      'Lot Size (Jun 2026)',
      '15m Open Price',
      '15m Close Price',
      '15m Volume',
      'Open Calculation',
      'Close Calculation',
      'Buy Above (45°)',
      'Sell Below (-45°)',
      'Trend'
    ];

    const rows = stocks.map((s) => [
      `"${s.symbol}"`,
      `"${s.companyName.replace(/"/g, '""')}"`,
      s.lotSizeJun2026 ?? '',
      s.openPrice !== undefined && s.openPrice !== null ? s.openPrice.toFixed(2) : '',
      s.closePrice !== undefined && s.closePrice !== null ? s.closePrice.toFixed(2) : '',
      s.volume !== undefined && s.volume !== null ? s.volume : '',
      s.openCalc !== undefined && s.openCalc !== null ? s.openCalc.toFixed(4) : '',
      s.closeCalc !== undefined && s.closeCalc !== null ? s.closeCalc.toFixed(4) : '',
      s.buyAbove !== undefined && s.buyAbove !== null ? s.buyAbove.toFixed(2) : '',
      s.sellBelow !== undefined && s.sellBelow !== null ? s.sellBelow.toFixed(2) : '',
      `"${s.trend || ''}"`
    ]);

    const csvText = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `StockMarket_ATM_15Min_Report_${credentials.date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const calculatedCount = stocks.filter((s) => s.openCalc !== undefined && s.openCalc !== null).length;

  if (!isUnlocked) {
    return <AccessCodeGate onUnlock={() => {
      setIsUnlocked(true);
      syncGlobalSettings({ isUnlocked: true });
    }} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col selection:bg-blue-600 selection:text-white antialiased">
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center space-x-2.5 px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl shadow-xl text-xs font-semibold text-white animate-fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{notification.message}</span>
        </div>
      )}

      {/* Main Header */}
      <Header
        credentials={credentials}
        onOpenSettings={() => setIsDhanGateOpen(true)}
        onOpenManualCalc={() => {
          setEditingStockManual(null);
          setIsManualCalcOpen(true);
        }}
        onOpenPositionSizer={() => handleOpenPositionSizer(null)}
        onOpenCsvImport={() => setIsCsvImportOpen(true)}
        onExportCsv={handleExportCsv}
        totalStocks={stocks.length}
        calculatedCount={calculatedCount}
        onSimulateAll={handleClearAllPrices}
        isBulkLoading={isBulkLoading}
        onFetchAll={handleFetchAllDhan}
        onDateChange={handleDateChange}
        onLock={() => {
          localStorage.removeItem('gann_app_access_code_unlocked');
          sessionStorage.removeItem('gann_app_access_code_unlocked');
          setIsUnlocked(false);
        }}
        activeDashboardTab={activeDashboardTab}
        onChangeDashboardTab={setActiveDashboardTab}
        isAutoFetchEnabled={isAutoFetchEnabled}
        onToggleAutoFetch={handleToggleAutoFetch}
        nextFetchSeconds={nextFetchSeconds}
        lastFetchTime={lastFetchTime}
        autoFetchIntervalMinutes={autoFetchIntervalMinutes}
        onChangeAutoFetchInterval={handleChangeAutoFetchInterval}
      />

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Live Notification & Market Signal Scroller */}
        <NotificationScroller
          stocks={stocks}
          faded100Log={faded100Log}
          onSelectStockDetail={setSelectedDetailStock}
        />

        {/* Protected Dhan Setup Banner when not configured */}
        {!credentials.isConfigured && (
          <div className="p-4 bg-slate-100 border border-slate-200/80 rounded-2xl shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-slate-800 text-white rounded-xl shadow-2xs mt-0.5">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Dhan Data API Integration</span>
                  <span className="bg-slate-200 text-slate-800 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Protected</span>
                </h4>
                <p className="text-xs text-slate-600 mt-0.5 max-w-2xl leading-relaxed">
                  Live 15-minute market candle fetching via Dhan HQ. Access code required for setup.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={() => setIsDhanGateOpen(true)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-2xs transition-colors flex items-center space-x-1.5"
              >
                <span>Setup API Credentials (1212)</span>
              </button>
              <button
                onClick={() => setIsCsvImportOpen(true)}
                className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold text-xs rounded-xl shadow-2xs transition-colors"
              >
                <span>Import CSV</span>
              </button>
            </div>
          </div>
        )}

        {/* Bulk Loading Banner */}
        {isBulkLoading && (
          <div className="p-4 bg-white border border-blue-200/80 rounded-xl shadow-sm flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
              <div>
                <div className="text-xs font-bold text-slate-900">Fetching Dhan 15-Minute Candles...</div>
                <div className="text-[11px] text-slate-500">
                  Processing stock {bulkProgress.current} of {bulkProgress.total}
                </div>
              </div>
            </div>
            <div className="w-36 bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
              <div 
                className="bg-blue-600 h-full transition-all duration-200"
                style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Dashboard View Switcher */}
        {activeDashboardTab === 'gann' ? (
          <>
            {/* Gann Pro Signals & Open=Low/High Highlights Banner */}
            <GannHighlights
              stocks={stocks}
              onSelectStockDetail={(s) => setSelectedDetailStock(s)}
              onSelectTrendFilter={(f) => setActiveTrendFilter(f)}
            />

            {/* ⭐ 10:15 AM Daily Power Picks (Top 3 Bullish & Top 3 Bearish for the Day) */}
            <TenFifteenPicksHub
              stocks={stocks}
              onSelectStockDetail={(s) => setSelectedDetailStock(s)}
              onOpenPositionSizer={(s) => handleOpenPositionSizer(s)}
              onOpenRsiAnalyst={(s) => setRsiAnalystStock(s)}
              onRefreshAllPrices={handleFetchAllDhan}
              isLoading={isBulkLoading}
            />

            {/* 🎯 Ideal Options & High-Conviction Stocks to Trade NOW (Updated on Every Fetch) */}
            <IdealTradeRadar
              idealTrades={idealTrades}
              stocks={stocks}
              tradeJourneys={tradeJourneys}
              onSelectStockDetail={(s) => setSelectedDetailStock(s)}
              onOpenPositionSizer={(s) => handleOpenPositionSizer(s)}
              onOpenRsiAnalyst={(s) => setRsiAnalystStock(s)}
              onRefreshAllPrices={handleFetchAllDhan}
              isLoading={isBulkLoading}
            />

            {/* 🚀 Trade Profit & Timings Journey Tracker */}
            <TradeProfitTracker
              tradeJourneys={tradeJourneys}
              stocks={stocks}
              onSelectStockDetail={(s) => setSelectedDetailStock(s)}
              onOpenPositionSizer={(s) => handleOpenPositionSizer(s)}
              onOpenRsiAnalyst={(s) => setRsiAnalystStock(s)}
              onClearJourneys={handleClearTradeJourneys}
            />

            {/* Stock Table */}
            <div id="stock-table-section">
              <StockTable
                stocks={stocks}
                faded100Log={faded100Log}
                onUpdateStockPrices={handleUpdateStockPrices}
                onFetchSingleStock={handleFetchSingleDhan}
                onSelectStockDetail={(s) => setSelectedDetailStock(s)}
                onEditStockManual={(s) => {
                  setEditingStockManual(s);
                  setIsManualCalcOpen(true);
                }}
                onOpenPositionSizer={(s) => handleOpenPositionSizer(s)}
                onOpenRsiAnalyst={(s) => setRsiAnalystStock(s)}
                onOpenTimingAnalysis={(s) => setTimingModalStock(s)}
                credentials={credentials}
                tradeJourneys={tradeJourneys}
                activeTrendFilter={activeTrendFilter}
                onTrendFilterChange={(f) => setActiveTrendFilter(f)}
              />
            </div>
          </>
        ) : activeDashboardTab === 'gann_dashboard' ? (
          /* Dedicated Gann Month High/Low Dashboard */
          <GannDashboard
            stocks={stocks}
            credentials={credentials}
            onOpenSettings={() => setIsDhanGateOpen(true)}
            selectedDate={credentials.date}
          />
        ) : activeDashboardTab === 'rsi_pullback' ? (
          /* Dedicated RSI Pullback Dashboard */
          <RsiPullbackDashboard
            stocks={stocks}
            faded100Log={faded100Log}
            onClearFadedLog={handleClearFadedLog}
            onSelectStockDetail={(s) => setSelectedDetailStock(s)}
            onOpenPositionSizer={(s) => handleOpenPositionSizer(s)}
            onOpenRsiAnalyst={(s) => setRsiAnalystStock(s)}
            onFetchSingleStock={handleFetchSingleDhan}
            selectedDate={credentials.date}
            onDateChange={handleDateChange}
            onFetchAll={handleFetchAllDhan}
            isBulkLoading={isBulkLoading}
          />
        ) : activeDashboardTab === 'parabolic_rally' ? (
          /* Dedicated 15-Minute Parabolic Rally & Breakdown Probability Engine */
          <ParabolicRallyDashboard
            stocks={stocks}
            credentials={credentials}
            onFetchSingleStock={handleFetchSingleDhan}
            onFetchAllStocks={handleFetchAllDhan}
            onSelectStockDetail={(s) => setSelectedDetailStock(s)}
            onOpenPositionSizer={(s) => handleOpenPositionSizer(s)}
            onOpenSettings={() => setIsDhanGateOpen(true)}
            isLoading={isBulkLoading}
          />
        ) : activeDashboardTab === 'user_tracker' ? (
          /* Dedicated User Trade & Option Tracker with 5-Min Dhan Refresh */
          <UserTradeTracker
            stocks={stocks}
            credentials={credentials}
            onFetchSingleStock={handleFetchSingleDhan}
            onFetchAllStocks={handleFetchAllDhan}
            onOpenSettings={() => setIsDhanGateOpen(true)}
            onSelectStockDetail={(s) => setSelectedDetailStock(s)}
            onOpenPositionSizer={(s) => handleOpenPositionSizer(s)}
          />
        ) : activeDashboardTab === 'sector_strength' ? (
          /* Dedicated Sector Strength & Real-Time Stock Confluence Hub */
          <SectorStrengthDashboard
            stocks={stocks}
            credentials={credentials}
            onFetchSingleStock={handleFetchSingleDhan}
            onFetchSectorStocks={handleFetchSectorStocks}
            onFetchAllStocks={handleFetchAllDhan}
            onSelectStockDetail={(s) => setSelectedDetailStock(s)}
            onOpenPositionSizer={(s) => handleOpenPositionSizer(s)}
            onOpenRsiAnalyst={(s) => setRsiAnalystStock(s)}
            onOpenSettings={() => setIsSettingsOpen(true)}
            isLoading={isBulkLoading}
          />
        ) : activeDashboardTab === 'open_high_low' ? (
          /* Dedicated Open = High/Low Strategy Hub */
          <OpenHighLowScanner
            stocks={stocks}
            onSelectStockDetail={(s) => setSelectedDetailStock(s)}
            onOpenPositionSizer={(s) => handleOpenPositionSizer(s)}
          />
        ) : (
          /* Dedicated AI BTST & STBT Gap Prediction Hub */
          <BtstPredictionHub
            stocks={stocks}
            onSelectStock={(s) => setSelectedDetailStock(s)}
            onOpenPositionSizing={(s) => handleOpenPositionSizer(s)}
            isStandaloneView={true}
          />
        )}


      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            StockMarket ATM &bull; Powered by Dhan HQ Data API & Nifty F&O Master List
          </div>
          <div className="text-slate-400 font-mono text-[11px]">
            Protected Access System
          </div>
        </div>
      </footer>

      {/* Modals */}
      <DhanApiGateModal
        isOpen={isDhanGateOpen}
        onClose={() => setIsDhanGateOpen(false)}
        onSuccess={() => {
          setIsDhanGateOpen(false);
          setIsSettingsOpen(true);
        }}
      />

      <DhanSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        credentials={credentials}
        onSaveCredentials={handleSaveCredentials}
      />

      <ManualCalculatorModal
        isOpen={isManualCalcOpen}
        onClose={() => setIsManualCalcOpen(false)}
        onAddManualStock={handleAddOrEditManualStock}
        existingStock={editingStockManual}
      />

      <StockDetailModal
        stock={selectedDetailStock}
        allStocks={stocks}
        tradeJourney={selectedDetailStock ? tradeJourneys[selectedDetailStock.id] || null : null}
        onClose={() => setSelectedDetailStock(null)}
        onOpenPositionSizer={(s) => handleOpenPositionSizer(s)}
        onOpenRsiAnalyst={(s) => setRsiAnalystStock(s)}
      />

      <RsiAnalystModal
        stock={rsiAnalystStock}
        onClose={() => setRsiAnalystStock(null)}
      />

      <StockTimingModal
        stock={timingModalStock}
        tradeJourney={timingModalStock ? tradeJourneys[timingModalStock.id] || null : null}
        onClose={() => setTimingModalStock(null)}
      />

      <PositionSizingModal
        isOpen={isPositionSizerOpen}
        onClose={() => setIsPositionSizerOpen(false)}
        selectedStock={positionSizerStock}
        allStocks={stocks}
      />

      <CsvImportModal
        isOpen={isCsvImportOpen}
        onClose={() => setIsCsvImportOpen(false)}
        onImportStocks={handleImportStocks}
        onResetToDefault={handleResetToDefaultCSV}
      />

      {/* Bullish Rally Popup / Popunder Alert */}
      <BullishRallyPopup
        stocks={stocks}
        onSelectStockDetail={(s) => setSelectedDetailStock(s)}
        onOpenPositionSizer={(s) => handleOpenPositionSizer(s)}
      />

    </div>
  );
}
