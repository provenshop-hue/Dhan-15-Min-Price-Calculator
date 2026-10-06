import React, { useState } from 'react';
import { StockCalculated, DhanApiCredentials } from '../types';
import { Clock, Calendar, Search, ShieldCheck, Sparkles, TrendingUp, TrendingDown, ArrowRight, AlertCircle, CheckCircle, RefreshCw, Zap, Flame } from 'lucide-react';

interface DhanTimingQualityScannerProps {
  stocks: StockCalculated[];
  credentials: DhanApiCredentials;
  onUpdateCredentials: (creds: DhanApiCredentials) => void;
  onFetchSingle: (stock: StockCalculated) => Promise<void>;
  onRefreshAll: () => void;
  isBulkLoading: boolean;
  activeTimingFilter: { active: boolean; date: string; timeSlot: string; qualifyingSymbols: string[] };
  onApplyTimingFilter: (date: string, timeSlot: string, symbols: string[]) => void;
  onClearTimingFilter: () => void;
  onChangeDashboardTab: (tab: any) => void;
}

const TIME_SLOTS = [
  '09:15', '09:30', '09:45', '10:00', '10:15', '10:30', '10:45', '11:00',
  '11:15', '11:30', '11:45', '12:00', '12:15', '12:30', '12:45', '13:00',
  '13:15', '13:30', '13:45', '14:00', '14:15', '14:30', '14:45', '15:00',
  '15:15', '15:30'
];

export const DhanTimingQualityScanner: React.FC<DhanTimingQualityScannerProps> = ({
  stocks,
  credentials,
  onUpdateCredentials,
  onFetchSingle,
  onRefreshAll,
  isBulkLoading,
  activeTimingFilter,
  onApplyTimingFilter,
  onClearTimingFilter,
  onChangeDashboardTab
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(credentials.date || new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState<string>('09:30');
  const [endTime, setEndTime] = useState<string>('10:00');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scannedResults, setScannedResults] = useState<Array<{
    stock: StockCalculated;
    snapshotTimeStr: string;
    snapshotPrice: number;
    snapshotHigh: number;
    snapshotLow: number;
    snapshotVolume: number;
    qualityScore: number;
    notes: string[];
  }>>([]);
  const [hasScanned, setHasScanned] = useState<boolean>(false);

  const parseMins = (slot: string) => {
    const [h, m] = slot.split(':').map(n => parseInt(n, 10));
    return h * 60 + m;
  };

  const parseTimeStringToMinutes = (timeStr: string) => {
    if (!timeStr) return 0;
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!match) {
      const parts = timeStr.split(':').map(n => parseInt(n, 10));
      return (parts[0] || 0) * 60 + (parts[1] || 0);
    }
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const ampm = (match[3] || '').toUpperCase();
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  };

  const handleRunTimingScan = async () => {
    setIsScanning(true);
    setScannedResults([]); // Fresh clear

    try {
      if (credentials.date !== selectedDate) {
        onUpdateCredentials({ ...credentials, date: selectedDate });
      }

      // Fetch historical 15m candles from Dhan API
      await onRefreshAll();

      const startMins = parseMins(startTime);
      const endMins = parseMins(endTime);

      const results: Array<{
        stock: StockCalculated;
        snapshotTimeStr: string;
        snapshotPrice: number;
        snapshotHigh: number;
        snapshotLow: number;
        snapshotVolume: number;
        qualityScore: number;
        notes: string[];
      }> = [];

      for (let i = 0; i < stocks.length; i++) {
        const stock = stocks[i];
        if (!stock.openPrice) continue;

        const timeline = stock.rsiTimeline || [];
        
        // STRICT HISTORICAL WINDOW FILTER:
        // Only keep candles whose timestamp falls strictly within [startMins, endMins]
        const historicalCandlesInWindow = timeline.filter(pt => {
          const totalMins = parseTimeStringToMinutes(pt.timeStr);
          return totalMins >= startMins && totalMins <= endMins;
        });

        // If no candles fell within the exact [startTime, endTime] window, exclude this stock completely!
        if (historicalCandlesInWindow.length === 0) {
          continue;
        }

        const snapshotCandle = historicalCandlesInWindow[historicalCandlesInWindow.length - 1];
        const snapshotPrice = snapshotCandle.close;
        const snapshotHigh = Math.max(...historicalCandlesInWindow.map(c => c.high));
        const snapshotLow = Math.min(...historicalCandlesInWindow.map(c => c.low));
        const snapshotVolume = historicalCandlesInWindow.reduce((acc, c) => acc + (c.volume || 10000), 0);

        const openPrice = historicalCandlesInWindow[0].open;
        const changeInWindow = ((snapshotPrice - openPrice) / openPrice) * 100;
        const isGreen = changeInWindow >= 0;

        let qualityScore = 60;
        const notes = [
          `Strict Historical Window @ ${snapshotCandle.timeStr} (Range: ${startTime} - ${endTime})`,
          `Window Price Change: ${changeInWindow >= 0 ? '+' : ''}${changeInWindow.toFixed(2)}%`,
          `Window High: ₹${snapshotHigh.toFixed(2)} | Low: ₹${snapshotLow.toFixed(2)}`
        ];

        if (isGreen && changeInWindow > 0.2) {
          qualityScore += 20;
          notes.push('Bullish momentum confirmed inside time range');
        } else if (!isGreen && changeInWindow < -0.2) {
          qualityScore -= 10;
          notes.push('Bearish pressure confirmed inside time range');
        }

        results.push({
          stock,
          snapshotTimeStr: snapshotCandle.timeStr,
          snapshotPrice,
          snapshotHigh,
          snapshotLow,
          snapshotVolume,
          qualityScore,
          notes
        });
      }

      results.sort((a, b) => b.qualityScore - a.qualityScore);
      setScannedResults(results);
      setHasScanned(true);
    } catch (e) {
      console.error('Scan error:', e);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 animate-fade-in pb-20">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-950 rounded-2xl p-6 text-white shadow-xl border border-indigo-500/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5 mb-2">
              <div className="p-2.5 bg-blue-600/30 rounded-xl border border-blue-400/40">
                <Clock className="w-6 h-6 text-blue-400 animate-pulse" />
              </div>
              <h2 className="text-2xl font-black tracking-tight">
                Precision Timing Historical Snapshot (Strict Time Range)
              </h2>
            </div>
            <p className="text-indigo-200 text-sm max-w-3xl leading-relaxed">
              Strictly queries historical 15m candles and excludes any stock that triggered after your End Time (<span className="text-amber-300 font-bold">{endTime}</span>). No out-of-range stocks are shown.
            </p>
          </div>
          <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/20">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div className="text-xs">
              <div className="font-bold text-white">Strict Cutoff Active</div>
              <div className="text-indigo-200">{selectedDate} ({startTime} - {endTime})</div>
            </div>
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="bg-slate-900 rounded-2xl p-5 shadow-xl border border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        {/* Date Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            <span>Trading Date</span>
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setScannedResults([]);
              setHasScanned(false);
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Start Time */}
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>Start Time (From)</span>
          </label>
          <select
            value={startTime}
            onChange={(e) => {
              setStartTime(e.target.value);
              setScannedResults([]);
              setHasScanned(false);
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-bold text-indigo-300 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            {TIME_SLOTS.map((slot) => (
              <option key={slot} value={slot}>{slot}</option>
            ))}
          </select>
        </div>

        {/* End Time */}
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>End Time (STRICT HISTORICAL CUTOFF)</span>
          </label>
          <select
            value={endTime}
            onChange={(e) => {
              setEndTime(e.target.value);
              setScannedResults([]);
              setHasScanned(false);
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-bold text-amber-300 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            {TIME_SLOTS.map((slot) => (
              <option key={slot} value={slot}>{slot}</option>
            ))}
          </select>
        </div>

        {/* Scan Button */}
        <div>
          <button
            onClick={handleRunTimingScan}
            disabled={isBulkLoading || isScanning}
            className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg transition-all disabled:opacity-50 text-sm cursor-pointer"
          >
            {isScanning || isBulkLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Filtering Historical...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Fetch Historical Snapshot</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Results Section */}
      {hasScanned && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-900 p-4 rounded-xl border border-slate-800">
            <span className="text-sm font-bold text-white">
              Strict Time Range Result: <span className="text-blue-400 font-black">{scannedResults.length}</span> Stocks strictly between <span className="font-mono text-amber-300">{startTime} and {endTime}</span> (No post-{endTime} stocks included)
            </span>
            <button
              onClick={() => {
                const symbols = scannedResults.map(r => r.stock.symbol);
                onApplyTimingFilter(selectedDate, `${startTime}-${endTime}`, symbols);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-black shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Apply to All Sections</span>
            </button>
          </div>

          {scannedResults.length === 0 ? (
            <div className="bg-slate-900 rounded-2xl p-12 text-center border border-slate-800 text-slate-400">
              <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white">No Stocks Found in Strict Range {startTime} - {endTime}</h3>
              <p className="text-xs text-slate-500 mt-1">Try expanding the time range or selecting a different trading date.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {scannedResults.map((item) => (
                <div 
                  key={item.stock.symbol}
                  onClick={() => onSelectStockDetail(item.stock)}
                  className="bg-slate-900 rounded-2xl border border-slate-800 hover:border-indigo-500 transition-all cursor-pointer p-4 space-y-3 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-white font-mono text-base">{item.stock.symbol}</h4>
                      <span className="text-xs text-slate-400">{item.stock.companyName}</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono">
                      Snapshot @ {item.snapshotTimeStr}
                    </span>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Snapshot Price:</span>
                      <span className="text-white font-bold">₹{item.snapshotPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Window High / Low:</span>
                      <span className="text-amber-300 font-bold">₹{item.snapshotHigh.toFixed(2)} / ₹{item.snapshotLow.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Quality Score:</span>
                      <span className="text-emerald-400 font-bold">{item.qualityScore}/100</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    {item.notes.map((note, nIdx) => (
                      <div key={nIdx} className="text-[11px] text-slate-300 flex items-start space-x-1.5">
                        <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{note}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-indigo-400">
                    <span>Click for 15m Timeline</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
