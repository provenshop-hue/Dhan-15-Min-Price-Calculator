import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { AccessCodeGate } from './components/AccessCodeGate';
import { DhanApiGateModal } from './components/DhanApiGateModal';
import { StockTable } from './components/StockTable';
import { GannHighlights } from './components/GannHighlights';
import { RsiPullbackDashboard } from './components/RsiPullbackDashboard';
import { GannDashboard } from './components/GannDashboard';
import { DhanSettingsModal } from './components/DhanSettingsModal';
import { ManualCalculatorModal } from './components/ManualCalculatorModal';
import { StockDetailModal } from './components/StockDetailModal';
import { CsvImportModal } from './components/CsvImportModal';
import { PositionSizingModal } from './components/PositionSizingModal';
import { RsiAnalystModal } from './components/RsiAnalystModal';
import { INITIAL_STOCKS, StockItem } from './data/stocks';
import { getDhanSecurityId } from './data/dhanSecurityMap';
import { StockCalculated, DhanApiCredentials, TrendFilterType } from './types';
import { calculateGann15Min } from './utils/gann';
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

  // Active filter state
  const [activeTrendFilter, setActiveTrendFilter] = useState<TrendFilterType>('ALL');

  // Active Dashboard View Tab ('gann', 'gann_dashboard', or 'rsi_pullback')
  const [activeDashboardTab, setActiveDashboardTab] = useState<'gann' | 'gann_dashboard' | 'rsi_pullback'>('gann');

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

  const handleOpenPositionSizer = (stock?: StockCalculated | null) => {
    setPositionSizerStock(stock || null);
    setIsPositionSizerOpen(true);
  };

  // Bulk Loading State
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [notification, setNotification] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  // Auto-hide notification
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Save credentials to localStorage
  const handleSaveCredentials = (newCreds: DhanApiCredentials) => {
    setCredentials(newCreds);
    localStorage.setItem('dhan_gann_creds', JSON.stringify(newCreds));
    setNotification({
      type: 'success',
      message: 'Dhan API credentials saved successfully!'
    });
  };

  // Handle Date Change directly from Header bar or Settings
  const handleDateChange = (newDate: string) => {
    const updated = { ...credentials, date: newDate };
    setCredentials(updated);
    localStorage.setItem('dhan_gann_creds', JSON.stringify(updated));
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
    if (!credentials.isConfigured || !credentials.clientId || !credentials.accessToken) {
      setIsSettingsOpen(true);
      setNotification({
        type: 'error',
        message: 'Dhan API Credentials required! Please enter your Client ID and Access Token in Dhan Settings.'
      });
      return;
    }

    setStocks((prev) =>
      prev.map((s) => (s.id === stock.id ? { ...s, isLoading: true, error: null } : s))
    );

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
                first15mHigh: data.first15mHigh,
                first15mLow: data.first15mLow,
                volume: data.volume,
                rsi: rsi !== undefined && rsi !== null ? rsi : (s.rsi ?? null),
                adx: calc.adx ?? adx ?? s.adx ?? null,
                rsiTimeline: data.rsiTimeline || s.rsiTimeline,
                vwap: calc.vwap,
                vwapStatus: calc.vwapStatus,
                candleTimestamp: data.candleTimestamp,
                openCalc: calc.openCalc,
                closeCalc: calc.closeCalc,
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

      setNotification({
        type: 'success',
        message: `Fetched 15-min candle for ${stock.symbol}! Open: ₹${openPrice}, Close: ₹${closePrice}`
      });
    } else {
      setStocks((prev) =>
        prev.map((s) =>
          s.id === stock.id ? { ...s, isLoading: false, error: result.error || 'Fetch failed' } : s
        )
      );
      setNotification({
        type: 'error',
        message: `Error fetching ${stock.symbol}: ${result.error}`
      });
    }
  };

  // Fetch all stocks via Dhan API
  const handleFetchAllDhan = async () => {
    if (!credentials.isConfigured || !credentials.clientId || !credentials.accessToken) {
      setIsSettingsOpen(true);
      setNotification({
        type: 'error',
        message: 'Dhan API credentials required! Please enter your Client ID and Access Token to fetch real live market candles.'
      });
      return;
    }

    setIsBulkLoading(true);
    setBulkProgress({ current: 0, total: stocks.length });

    // Reset errors
    setStocks((prev) =>
      prev.map((s) => ({ ...s, error: null }))
    );

    const CONCURRENCY = 3;
    let completed = 0;

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
                      first15mHigh: data.first15mHigh,
                      first15mLow: data.first15mLow,
                      volume: data.volume,
                      rsi: rsi !== undefined && rsi !== null ? rsi : (s.rsi ?? null),
                      adx: calc.adx ?? adx ?? s.adx ?? null,
                      rsiTimeline: data.rsiTimeline || s.rsiTimeline,
                      vwap: calc.vwap,
                      vwapStatus: calc.vwapStatus,
                      candleTimestamp: data.candleTimestamp,
                      openCalc: calc.openCalc,
                      closeCalc: calc.closeCalc,
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

      await new Promise((resolve) => setTimeout(resolve, 80));
    }

    setIsBulkLoading(false);
    setNotification({
      type: 'success',
      message: 'Completed fetching 15-minute candles for all stocks from Dhan API!'
    });
  };

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
      message: `Updated Gann calculations for ${manualStock.symbol}`
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
      'Open Gann Calculation',
      'Close Gann Calculation',
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
    link.setAttribute('download', `Gann_15Min_Report_${credentials.date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const calculatedCount = stocks.filter((s) => s.openCalc !== undefined && s.openCalc !== null).length;

  if (!isUnlocked) {
    return <AccessCodeGate onUnlock={() => setIsUnlocked(true)} />;
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
      />

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

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

            {/* Stock Table */}
            <StockTable
              stocks={stocks}
              onUpdateStockPrices={handleUpdateStockPrices}
              onFetchSingleStock={handleFetchSingleDhan}
              onSelectStockDetail={(s) => setSelectedDetailStock(s)}
              onEditStockManual={(s) => {
                setEditingStockManual(s);
                setIsManualCalcOpen(true);
              }}
              onOpenPositionSizer={(s) => handleOpenPositionSizer(s)}
              onOpenRsiAnalyst={(s) => setRsiAnalystStock(s)}
              credentials={credentials}
              activeTrendFilter={activeTrendFilter}
              onTrendFilterChange={(f) => setActiveTrendFilter(f)}
            />
          </>
        ) : activeDashboardTab === 'gann_dashboard' ? (
          /* Dedicated Gann Month High/Low Dashboard */
          <GannDashboard
            stocks={stocks}
            credentials={credentials}
            onOpenSettings={() => setIsDhanGateOpen(true)}
            selectedDate={credentials.date}
          />
        ) : (
          /* Dedicated RSI Pullback Dashboard */
          <RsiPullbackDashboard
            stocks={stocks}
            onSelectStockDetail={(s) => setSelectedDetailStock(s)}
            onOpenPositionSizer={(s) => handleOpenPositionSizer(s)}
            onOpenRsiAnalyst={(s) => setRsiAnalystStock(s)}
            onFetchSingleStock={handleFetchSingleDhan}
            selectedDate={credentials.date}
            onDateChange={handleDateChange}
            onFetchAll={handleFetchAllDhan}
            isBulkLoading={isBulkLoading}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            Gannformula-app &bull; Powered by Dhan HQ Data API & Nifty F&O Master List
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
        onClose={() => setSelectedDetailStock(null)}
        onOpenPositionSizer={(s) => handleOpenPositionSizer(s)}
        onOpenRsiAnalyst={(s) => setRsiAnalystStock(s)}
      />

      <RsiAnalystModal
        stock={rsiAnalystStock}
        onClose={() => setRsiAnalystStock(null)}
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

    </div>
  );
}
