import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { GannFormulaCard } from './components/GannFormulaCard';
import { StockTable } from './components/StockTable';
import { DhanSettingsModal } from './components/DhanSettingsModal';
import { ManualCalculatorModal } from './components/ManualCalculatorModal';
import { StockDetailModal } from './components/StockDetailModal';
import { CsvImportModal } from './components/CsvImportModal';
import { INITIAL_STOCKS, StockItem } from './data/stocks';
import { StockCalculated, DhanApiCredentials } from './types';
import { calculateGann15Min } from './utils/gann';
import { Download, RefreshCw, Sparkles, CheckCircle } from 'lucide-react';

export default function App() {
  // Dhan API Credentials State
  const [credentials, setCredentials] = useState<DhanApiCredentials>(() => {
    const saved = localStorage.getItem('dhan_gann_creds');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved credentials', e);
      }
    }
    return {
      clientId: '',
      accessToken: '',
      date: new Date().toISOString().split('T')[0],
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

  // Modal visibility states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isManualCalcOpen, setIsManualCalcOpen] = useState(false);
  const [isCsvImportOpen, setIsCsvImportOpen] = useState(false);
  const [selectedDetailStock, setSelectedDetailStock] = useState<StockCalculated | null>(null);
  const [editingStockManual, setEditingStockManual] = useState<StockCalculated | null>(null);

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

  // Update stock prices inline & recalculate Gann values
  const handleUpdateStockPrices = (stockId: string, openPrice: number, closePrice: number) => {
    setStocks((prev) =>
      prev.map((s) => {
        if (s.id !== stockId) return s;

        if (openPrice <= 0 && closePrice <= 0) {
          return {
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
            isFetched: false
          };
        }

        const calc = calculateGann15Min(openPrice, closePrice);
        return {
          ...s,
          openPrice,
          closePrice,
          openCalc: calc.openCalc,
          closeCalc: calc.closeCalc,
          buyAbove: calc.buyAbove,
          sellBelow: calc.sellBelow,
          targetsUp: calc.targetsUp,
          targetsDown: calc.targetsDown,
          trend: calc.trend,
          isFetched: true
        };
      })
    );
  };

  // Populate realistic sample 15-min open & close prices for testing across all stocks
  const handleSimulateAllPrices = () => {
    setStocks((prev) =>
      prev.map((s, idx) => {
        // Base price generated deterministically per stock symbol length and index
        const base = 250 + ((s.symbol.charCodeAt(0) * 17 + idx * 37) % 3500);
        const randomVar = ((idx * 13) % 40) - 20;
        const openPrice = Math.round((base + randomVar) * 100) / 100;
        const closePrice = Math.round((openPrice + (((idx % 2 === 0 ? 1 : -1) * ((idx * 7) % 35)) + 2.5)) * 100) / 100;

        const calc = calculateGann15Min(openPrice, closePrice);

        return {
          ...s,
          openPrice,
          closePrice,
          openCalc: calc.openCalc,
          closeCalc: calc.closeCalc,
          buyAbove: calc.buyAbove,
          sellBelow: calc.sellBelow,
          targetsUp: calc.targetsUp,
          targetsDown: calc.targetsDown,
          trend: calc.trend,
          isFetched: true,
          candleTimestamp: '15-min Candle (Sample)'
        };
      })
    );

    setNotification({
      type: 'info',
      message: 'Sample 15-minute Open & Close prices populated for all stocks!'
    });
  };

  // Fetch single stock candle from Dhan API
  const handleFetchSingleDhan = async (stock: StockCalculated) => {
    if (!credentials.isConfigured) {
      setIsSettingsOpen(true);
      return;
    }

    setStocks((prev) =>
      prev.map((s) => (s.id === stock.id ? { ...s, isLoading: true, error: null } : s))
    );

    try {
      const res = await fetch('/api/dhan/intraday-15m', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: credentials.clientId,
          accessToken: credentials.accessToken,
          securityId: stock.securityId || '1333',
          exchangeSegment: credentials.segment,
          symbol: stock.symbol,
          date: credentials.date
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const openPrice = data.open;
        const closePrice = data.close;
        const calc = calculateGann15Min(openPrice, closePrice);

        setStocks((prev) =>
          prev.map((s) =>
            s.id === stock.id
              ? {
                  ...s,
                  openPrice,
                  closePrice,
                  highPrice: data.high,
                  lowPrice: data.low,
                  volume: data.volume,
                  candleTimestamp: data.candleTimestamp,
                  openCalc: calc.openCalc,
                  closeCalc: calc.closeCalc,
                  buyAbove: calc.buyAbove,
                  sellBelow: calc.sellBelow,
                  targetsUp: calc.targetsUp,
                  targetsDown: calc.targetsDown,
                  trend: calc.trend,
                  isFetched: true,
                  isLoading: false,
                  error: null
                }
              : s
          )
        );

        setNotification({
          type: 'success',
          message: `Fetched 15-min candle for ${stock.symbol}!`
        });
      } else {
        throw new Error(data.error || 'Failed to fetch candle data');
      }
    } catch (err: any) {
      setStocks((prev) =>
        prev.map((s) =>
          s.id === stock.id ? { ...s, isLoading: false, error: err.message } : s
        )
      );
      setNotification({
        type: 'error',
        message: `Error fetching ${stock.symbol}: ${err.message}`
      });
    }
  };

  // Fetch all stocks via Dhan API
  const handleFetchAllDhan = async () => {
    if (!credentials.isConfigured) {
      setIsSettingsOpen(true);
      return;
    }

    setIsBulkLoading(true);
    setBulkProgress({ current: 0, total: stocks.length });

    for (let i = 0; i < stocks.length; i++) {
      const stock = stocks[i];
      setBulkProgress({ current: i + 1, total: stocks.length });

      try {
        const res = await fetch('/api/dhan/intraday-15m', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: credentials.clientId,
            accessToken: credentials.accessToken,
            securityId: stock.securityId || '1333',
            exchangeSegment: credentials.segment,
            symbol: stock.symbol,
            date: credentials.date
          })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          const calc = calculateGann15Min(data.open, data.close);
          setStocks((prev) =>
            prev.map((s) =>
              s.id === stock.id
                ? {
                    ...s,
                    openPrice: data.open,
                    closePrice: data.close,
                    openCalc: calc.openCalc,
                    closeCalc: calc.closeCalc,
                    buyAbove: calc.buyAbove,
                    sellBelow: calc.sellBelow,
                    targetsUp: calc.targetsUp,
                    targetsDown: calc.targetsDown,
                    trend: calc.trend,
                    isFetched: true
                  }
                : s
            )
          );
        }
      } catch (err) {
        console.error(`Error fetching ${stock.symbol}:`, err);
      }

      // Small delay between requests
      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    setIsBulkLoading(false);
    setNotification({
      type: 'success',
      message: 'Batch Dhan API fetch complete!'
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
      imported.map((item) => ({
        ...item,
        isFetched: false,
        isLoading: false
      }))
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
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenManualCalc={() => {
          setEditingStockManual(null);
          setIsManualCalcOpen(true);
        }}
        onOpenCsvImport={() => setIsCsvImportOpen(true)}
        onExportCsv={handleExportCsv}
        totalStocks={stocks.length}
        calculatedCount={calculatedCount}
        onSimulateAll={handleSimulateAllPrices}
        isBulkLoading={isBulkLoading}
        onFetchAll={handleFetchAllDhan}
      />

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

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

        {/* Gann Formula Reference Banner */}
        <GannFormulaCard />

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
          credentials={credentials}
        />

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            Gann 15-Minute Price Finder & Calculator &bull; Powered by Dhan HQ Data API & Nifty F&O Master List
          </div>
          <div className="text-slate-500">
            Formula: <code className="text-blue-700 font-mono bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">((sqrt(P) * 15) - 15) % 15</code>
          </div>
        </div>
      </footer>

      {/* Modals */}
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
