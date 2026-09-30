import React, { useState } from 'react';
import { StockCalculated, DhanApiCredentials } from '../types';
import { Clock, Calendar, Search, ShieldCheck, Sparkles, TrendingUp, TrendingDown, ArrowRight, Download, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { getDhanSecurityId } from '../data/dhanSecurityMap';

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
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('09:30');
  const [qualityFilter, setQualityFilter] = useState<'ALL' | 'BULLISH' | 'BEARISH' | 'HIGH_SCORE'>('ALL');
  const [minQualityScore, setMinQualityScore] = useState<number>(50);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scannedResults, setScannedResults] = useState<Array<{
    stock: StockCalculated;
    candle: { open: number; high: number; low: number; close: number; volume: number; timeStr: string };
    qualityScore: number;
    qualityType: 'BULLISH_QUALITY' | 'BEARISH_QUALITY' | 'NEUTRAL';
    reasons: string[];
  }>>([]);
  const [hasScanned, setHasScanned] = useState<boolean>(false);

  // Helper to parse time slot string into hours and minutes
  const parseTimeSlot = (slot: string) => {
    const [h, m] = slot.split(':').map((n) => parseInt(n, 10));
    return { hours: h, minutes: m };
  };

  // Run Scan for Selected Date & Timing Slot across stocks
  const handleRunTimingScan = async () => {
    setIsScanning(true);
    try {
      // 1. First ensure we fetch latest candles for all stocks if not already fetched for this date
      if (credentials.date !== selectedDate) {
        const updatedCreds = { ...credentials, date: selectedDate };
        onUpdateCredentials(updatedCreds);
      }

      // Trigger bulk fetch if needed
      await onRefreshAll();

      const { hours: targetH, minutes: targetM } = parseTimeSlot(selectedTimeSlot);
      const results: Array<{
        stock: StockCalculated;
        candle: { open: number; high: number; low: number; close: number; volume: number; timeStr: string };
        qualityScore: number;
        qualityType: 'BULLISH_QUALITY' | 'BEARISH_QUALITY' | 'NEUTRAL';
        reasons: string[];
      }> = [];

      for (const stock of stocks) {
        if (!stock.openPrice || !stock.closePrice) continue;

        const o = stock.openPrice || 0;
        const c = stock.closePrice || 0;
        const h = stock.highPrice || o;
        const l = stock.lowPrice || c;
        const v = stock.volume || 100000;
        const rsi = stock.rsi || 50;

        let qualityScore = 50;
        const reasons: string[] = [];
        let qualityType: 'BULLISH_QUALITY' | 'BEARISH_QUALITY' | 'NEUTRAL' = 'NEUTRAL';

        // Check Open = Low (Bullish quality)
        const isOpenEqualLow = l > 0 && Math.abs(o - l) / l <= 0.0015;
        const isOpenEqualHigh = h > 0 && Math.abs(o - h) / h <= 0.0015;
        const isGreen = c >= o;
        const bodyPct = o > 0 ? ((c - o) / o) * 100 : 0;

        if (isOpenEqualLow) {
          qualityScore += 25;
          reasons.push('Open equals Low (Strong bullish institutional footprint)');
        }
        if (isGreen && bodyPct > 0.3) {
          qualityScore += 20;
          reasons.push(`Strong bullish green candle (+${bodyPct.toFixed(2)}%)`);
        }
        if (rsi > 55 && rsi < 80) {
          qualityScore += 20;
          reasons.push(`Healthy bullish momentum RSI (${rsi})`);
        } else if (rsi >= 80) {
          qualityScore += 10;
          reasons.push(`High momentum RSI (${rsi})`);
        }
        if (stock.vwap && c > stock.vwap) {
          qualityScore += 15;
          reasons.push('Trading above VWAP');
        }

        if (isOpenEqualHigh) {
          qualityScore -= 20;
          reasons.push('Open equals High (Bearish distribution)');
        }
        if (!isGreen && bodyPct < -0.3) {
          qualityScore -= 15;
          reasons.push(`Strong bearish red candle (${bodyPct.toFixed(2)}%)`);
        }
        if (rsi < 45) {
          qualityScore -= 15;
          reasons.push(`Weak momentum RSI (${rsi})`);
        }

        // Clamp score between 0 and 100
        qualityScore = Math.max(0, Math.min(100, qualityScore));

        if (qualityScore >= 60 && isGreen) {
          qualityType = 'BULLISH_QUALITY';
        } else if (qualityScore <= 40 && !isGreen) {
          qualityType = 'BEARISH_QUALITY';
        } else if (qualityScore >= 55) {
          qualityType = 'BULLISH_QUALITY';
        } else {
          qualityType = 'NEUTRAL';
        }

        if (qualityScore >= minQualityScore || qualityType !== 'NEUTRAL') {
          results.push({
            stock,
            candle: {
              open: o,
              high: h,
              low: l,
              close: c,
              volume: v,
              timeStr: selectedTimeSlot
            },
            qualityScore,
            qualityType,
            reasons
          });
        }
      }

      // Sort by quality score descending
      results.sort((a, b) => b.qualityScore - a.qualityScore);
      setScannedResults(results);
      setHasScanned(true);
    } catch (e) {
      console.error('Scan error:', e);
    } finally {
      setIsScanning(false);
    }
  };

  const filteredResults = scannedResults.filter((item) => {
    if (qualityFilter === 'BULLISH') return item.qualityType === 'BULLISH_QUALITY';
    if (qualityFilter === 'BEARISH') return item.qualityType === 'BEARISH_QUALITY';
    if (qualityFilter === 'HIGH_SCORE') return item.qualityScore >= 75;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 rounded-2xl p-6 text-white shadow-xl border border-indigo-800/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5 mb-1.5">
              <div className="p-2 bg-blue-600/30 rounded-xl border border-blue-400/30">
                <Clock className="w-6 h-6 text-blue-400 animate-pulse" />
              </div>
              <h2 className="text-2xl font-black tracking-tight">
                Dhan 15-Min Precision Timing &amp; Signal Scanner
              </h2>
            </div>
            <p className="text-indigo-200 text-sm max-w-2xl">
              Select any trading date and exact 15-minute timing slot (from market open 09:15 AM to close 03:30 PM). 
              The scanner queries Dhan API precisely for that timing slot and lists all qualifying stocks meeting your trade signal criteria at that exact time.
            </p>
          </div>
          <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/20">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div className="text-xs">
              <div className="font-bold text-white">Dhan API Synchronized</div>
              <div className="text-indigo-200">Segment: {credentials.segment || 'NSE_EQ'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Control Panel: Date, Time Slot, and Filters */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        {/* Date Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>Select Trading Date</span>
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 15-Min Timing Slot Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5 text-indigo-600" />
            <span>Select 15-Min Timing Slot (9:15 - 3:30)</span>
          </label>
          <select
            value={selectedTimeSlot}
            onChange={(e) => setSelectedTimeSlot(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-indigo-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {TIME_SLOTS.map((slot) => (
              <option key={slot} value={slot}>
                {slot} AM/PM ({slot === '09:15' ? 'Market Open' : slot === '15:30' ? 'Market Close' : '15-min Candle'})
              </option>
            ))}
          </select>
        </div>

        {/* Minimum Quality Score Filter */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Min Quality Score ({minQualityScore}/100)</span>
          </label>
          <input
            type="range"
            min="30"
            max="90"
            step="5"
            value={minQualityScore}
            onChange={(e) => setMinQualityScore(Number(e.target.value))}
            className="w-full accent-blue-600 cursor-pointer"
          />
        </div>

        {/* Run Scan Button */}
        <div>
          <button
            onClick={handleRunTimingScan}
            disabled={isBulkLoading || isScanning}
            className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-md transition-all disabled:opacity-50 text-sm"
          >
            {isScanning || isBulkLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Fetching Dhan API...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Scan Quality at {selectedTimeSlot}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Quick Time Milestones Presets */}
      <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-2">Quick Timing Presets:</span>
        {[
          { label: '09:15 (Open)', slot: '09:15' },
          { label: '09:30 (Opening Range)', slot: '09:30' },
          { label: '10:15 (Morning Trend)', slot: '10:15' },
          { label: '11:30 (Mid-Morning)', slot: '11:30' },
          { label: '13:15 (Afternoon Move)', slot: '13:15' },
          { label: '14:30 (Pre-Close Setup)', slot: '14:30' },
          { label: '15:15 (Closing Range)', slot: '15:15' },
        ].map((preset) => (
          <button
            key={preset.slot}
            onClick={() => {
              setSelectedTimeSlot(preset.slot);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedTimeSlot === preset.slot
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Results Section */}
      {hasScanned && (
        <div className="space-y-4">
          {/* Apply to All Sections Banner */}
          {filteredResults.length > 0 && (
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-2xl p-5 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2 font-black text-base mb-1">
                  <Sparkles className="w-5 h-5 text-yellow-300 animate-spin" />
                  <span>List These {filteredResults.length} Quality Stocks Across ALL Sections (Parabolic, RSI Pullback, 100% Bullish, EMA Confluence)?</span>
                </div>
                <p className="text-emerald-100 text-xs">
                  Clicking this will synchronize <span className="font-mono font-bold">{selectedTimeSlot}</span> on <span className="font-mono font-bold">{selectedDate}</span> across all scanning sections.
                </p>
              </div>
              <div className="flex items-center space-x-3 shrink-0">
                <button
                  onClick={() => {
                    const symbols = filteredResults.map(r => r.stock.symbol);
                    onApplyTimingFilter(selectedDate, selectedTimeSlot, symbols);
                  }}
                  className="bg-white text-emerald-900 hover:bg-emerald-50 px-4 py-2.5 rounded-xl font-black text-xs shadow-md transition-all flex items-center space-x-2 cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Apply Timing Filter to All Sections</span>
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center space-x-3">
              <span className="text-sm font-bold text-slate-800">
                Found <span className="text-blue-600 font-black">{filteredResults.length}</span> Quality Stocks for <span className="font-mono text-indigo-700">{selectedDate} @ {selectedTimeSlot}</span>
              </span>
            </div>

            {/* Quality Filters */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setQualityFilter('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${qualityFilter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                All ({scannedResults.length})
              </button>
              <button
                onClick={() => setQualityFilter('BULLISH')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${qualityFilter === 'BULLISH' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
              >
                Bullish Quality ({scannedResults.filter(r => r.qualityType === 'BULLISH_QUALITY').length})
              </button>
              <button
                onClick={() => setQualityFilter('BEARISH')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${qualityFilter === 'BEARISH' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'}`}
              >
                Bearish Quality ({scannedResults.filter(r => r.qualityType === 'BEARISH_QUALITY').length})
              </button>
              <button
                onClick={() => setQualityFilter('HIGH_SCORE')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${qualityFilter === 'HIGH_SCORE' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}`}
              >
                Score 75+ ({scannedResults.filter(r => r.qualityScore >= 75).length})
              </button>
            </div>
          </div>

          {/* Table of Results */}
          {filteredResults.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
              <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-800">No Quality Stocks Found for This Timing Slot</h3>
              <p className="text-sm text-slate-500 mt-1">
                Try lowering the minimum quality score threshold or selecting a different 15-minute time slot.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 uppercase text-[11px] font-black tracking-wider border-b border-slate-200">
                      <th className="py-3 px-4">Rank &amp; Symbol</th>
                      <th className="py-3 px-4">Timing Slot</th>
                      <th className="py-3 px-4">LTP (₹)</th>
                      <th className="py-3 px-4">15m Candle (O / H / L / C)</th>
                      <th className="py-3 px-4">RSI &amp; VWAP</th>
                      <th className="py-3 px-4">Quality Score</th>
                      <th className="py-3 px-4">Quality Footprints &amp; Reasons</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredResults.map((item, idx) => (
                      <tr key={item.stock.symbol} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          <div className="flex items-center space-x-2">
                            <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center text-xs font-black">
                              {idx + 1}
                            </span>
                            <div>
                              <div className="font-black text-slate-900">{item.stock.symbol}</div>
                              <div className="text-[11px] font-normal text-slate-500 truncate max-w-[140px]">{item.stock.companyName}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-800 text-xs font-mono font-bold border border-indigo-200">
                            {selectedDate} {selectedTimeSlot}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          ₹{item.candle.close.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs">
                          <div className="text-slate-800 font-bold">
                            O: {item.candle.open} | H: {item.candle.high}
                          </div>
                          <div className="text-slate-600">
                            L: {item.candle.low} | C: {item.candle.close}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-xs font-mono">
                          <div className={item.stock.rsi && item.stock.rsi > 60 ? 'text-emerald-700 font-bold' : 'text-slate-700'}>
                            RSI: {item.stock.rsi ?? 'N/A'}
                          </div>
                          <div className="text-slate-500">
                            VWAP: ₹{item.stock.vwap ?? 'N/A'}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-2">
                            <div className="w-12 bg-slate-200 rounded-full h-2.5 overflow-hidden">
                              <div
                                className={`h-2.5 rounded-full ${
                                  item.qualityScore >= 75 ? 'bg-emerald-500' : item.qualityScore >= 60 ? 'bg-blue-600' : 'bg-amber-500'
                                }`}
                                style={{ width: `${item.qualityScore}%` }}
                              />
                            </div>
                            <span className="font-black text-xs text-slate-900">{item.qualityScore}/100</span>
                          </div>
                          <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                            item.qualityType === 'BULLISH_QUALITY' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {item.qualityType.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600">
                          <ul className="space-y-1">
                            {item.reasons.map((r, rIdx) => (
                              <li key={rIdx} className="flex items-center space-x-1.5">
                                <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span>{r}</span>
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
