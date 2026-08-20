import React from 'react';
import { Key, Calculator, Download, Upload, RefreshCw, ShieldCheck, Calendar, Lock, Clock, PauseCircle, PlayCircle, Zap, Moon, Target, Compass, Flame } from 'lucide-react';
import { DhanApiCredentials } from '../types';

interface HeaderProps {
  credentials: DhanApiCredentials;
  onOpenSettings: () => void;
  onOpenManualCalc: () => void;
  onOpenPositionSizer: () => void;
  onOpenCsvImport: () => void;
  onExportCsv: () => void;
  totalStocks: number;
  calculatedCount: number;
  onSimulateAll: () => void;
  isBulkLoading: boolean;
  onFetchAll: () => void;
  onDateChange: (newDate: string) => void;
  onLock?: () => void;
  activeDashboardTab: 'gann' | 'gann_dashboard' | 'rsi_pullback' | 'btst' | 'parabolic_rally' | 'user_tracker' | 'sector_strength';
  onChangeDashboardTab: (tab: 'gann' | 'gann_dashboard' | 'rsi_pullback' | 'btst' | 'parabolic_rally' | 'user_tracker' | 'sector_strength') => void;
  // Auto-Fetch Props
  isAutoFetchEnabled?: boolean;
  onToggleAutoFetch?: () => void;
  nextFetchSeconds?: number;
  lastFetchTime?: string | null;
  autoFetchIntervalMinutes?: number;
  onChangeAutoFetchInterval?: (mins: number) => void;
}

export const Header: React.FC<HeaderProps> = ({
  credentials,
  onOpenSettings,
  onOpenManualCalc,
  onOpenPositionSizer,
  onOpenCsvImport,
  onExportCsv,
  totalStocks,
  calculatedCount,
  isBulkLoading,
  onFetchAll,
  onDateChange,
  onLock,
  activeDashboardTab,
  onChangeDashboardTab,
  isAutoFetchEnabled = true,
  onToggleAutoFetch,
  nextFetchSeconds = 300,
  lastFetchTime,
  autoFetchIntervalMinutes = 5,
  onChangeAutoFetchInterval
}) => {
  const formatCountdown = (totalSeconds: number) => {
    const mins = Math.floor(Math.max(0, totalSeconds) / 60);
    const secs = Math.max(0, totalSeconds) % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };
  return (
    <header className="bg-white border-b border-slate-200/80 text-slate-800 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-sm shadow-blue-500/20 flex items-center justify-center font-black text-sm tracking-tighter">
              ATM
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  StockMarket ATM
                </h1>
                <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full font-semibold border border-blue-200/60">
                  Nifty Futures F&O
                </span>
              </div>
              <p className="text-xs text-slate-500">
                15-Min Candle Analysis &amp; Dhan HQ Data API
              </p>
            </div>
          </div>

          {/* Action Buttons & Status */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Settings Button (Protected by Code 1212) */}
            <button
              onClick={onOpenSettings}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                credentials.isConfigured
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>Settings</span>
              {credentials.isConfigured && (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              )}
            </button>

            {/* Quick Manual Entry */}
            <button
              onClick={onOpenManualCalc}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-medium shadow-2xs transition-colors"
            >
              <Calculator className="w-3.5 h-3.5 text-blue-600" />
              <span>Manual Entry</span>
            </button>

            {/* Position Sizing Calculator */}
            <button
              onClick={onOpenPositionSizer}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 rounded-lg text-xs font-bold shadow-2xs transition-colors"
            >
              <Calculator className="w-3.5 h-3.5 text-blue-700" />
              <span>Position Sizer</span>
            </button>

            {/* CSV Import / OHLC Data */}
            <button
              onClick={onOpenCsvImport}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-medium shadow-2xs transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-indigo-600" />
              <span>Import CSV Data</span>
            </button>

            {/* Primary Action: Fetch All 15m Candles from Dhan API */}
            <button
              onClick={onFetchAll}
              disabled={isBulkLoading}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all disabled:opacity-50 ${
                credentials.isConfigured
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isBulkLoading ? 'animate-spin' : ''}`} />
              <span>{isBulkLoading ? 'Fetching Dhan Data...' : 'Fetch All 15m Candles'}</span>
            </button>

            {/* Auto-Fetch Toggle & Live Countdown (Default 5 min, fetching 15m candles) */}
            {onToggleAutoFetch && (
              <div className="flex items-center space-x-1 bg-purple-50/90 border border-purple-200/90 rounded-lg p-0.5 shadow-2xs">
                <button
                  onClick={onToggleAutoFetch}
                  className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-extrabold transition-all ${
                    isAutoFetchEnabled
                      ? 'bg-purple-700 text-white shadow-2xs'
                      : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                  }`}
                  title={
                    isAutoFetchEnabled
                      ? `Auto-Fetch is ACTIVE. Automatically fetches 15m candles every ${autoFetchIntervalMinutes} minutes.`
                      : 'Auto-Fetch is PAUSED. Click to activate automatic fetching.'
                  }
                >
                  {isAutoFetchEnabled ? (
                    <>
                      <Clock className="w-3.5 h-3.5 text-yellow-300 animate-pulse fill-current" />
                      <span>Auto {autoFetchIntervalMinutes}m:</span>
                      <span className="font-mono text-yellow-200 font-black">{formatCountdown(nextFetchSeconds)}</span>
                    </>
                  ) : (
                    <>
                      <PauseCircle className="w-3.5 h-3.5 text-slate-500" />
                      <span>Auto-Fetch: Off</span>
                    </>
                  )}
                </button>

                {isAutoFetchEnabled && onChangeAutoFetchInterval && (
                  <select
                    value={autoFetchIntervalMinutes}
                    onChange={(e) => onChangeAutoFetchInterval(Number(e.target.value))}
                    className="bg-purple-100 hover:bg-purple-200 text-purple-950 font-black text-[11px] rounded px-1 py-1 outline-none cursor-pointer border border-purple-300 transition-colors"
                    title="Select Auto-Fetch Interval (Fetches 15m candles)"
                  >
                    <option value={5}>5m (Default)</option>
                    <option value={10}>10m</option>
                    <option value={15}>15m</option>
                    <option value={30}>30m</option>
                  </select>
                )}

                {lastFetchTime && (
                  <span className="text-[10px] text-purple-900 font-mono font-bold px-1 hidden lg:inline" title="Last Auto/Manual Fetch Time">
                    Last: {lastFetchTime}
                  </span>
                )}
              </div>
            )}

            {/* Export Report */}
            <button
              onClick={onExportCsv}
              title="Export calculations to CSV"
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 text-xs shadow-2xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            {/* Lock App Button */}
            {onLock && (
              <button
                onClick={onLock}
                title="Lock App"
                className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg border border-slate-200 text-xs shadow-2xs transition-colors"
              >
                <Lock className="w-3.5 h-3.5 text-slate-600" />
              </button>
            )}
          </div>

        </div>

        {/* Dashboard Navigation Tabs & Stats Strip */}
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
          
          {/* Main Dashboard Navigation Tabs */}
          <div className="flex items-center space-x-1.5 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 flex-wrap">
            <button
              onClick={() => onChangeDashboardTab('gann')}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                activeDashboardTab === 'gann'
                  ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <span>📊 15m Scanner</span>
            </button>

            <button
              onClick={() => {
                onChangeDashboardTab('gann');
                setTimeout(() => {
                  const el = document.getElementById('ten-fifteen-picks-hub');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }, 50);
              }}
              className="flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white shadow-2xs transition-all hover:scale-105"
            >
              <Clock className="w-3.5 h-3.5 fill-current text-yellow-300 animate-pulse" />
              <span>⭐ 10:15 AM Power Picks</span>
              <span className="bg-amber-300 text-slate-950 text-[9px] px-1.5 py-0.2 rounded-full font-black uppercase">
                3B + 3S
              </span>
            </button>

            <button
              onClick={() => {
                onChangeDashboardTab('gann');
                setTimeout(() => {
                  const el = document.getElementById('ideal-trade-radar-hub');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }, 50);
              }}
              className="flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-black bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-2xs transition-all hover:scale-105"
            >
              <Zap className="w-3.5 h-3.5 fill-current text-yellow-200 animate-pulse" />
              <span>🔥 Ideal Trades NOW</span>
            </button>

            <button
              onClick={() => onChangeDashboardTab('gann_dashboard')}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                activeDashboardTab === 'gann_dashboard'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <span className="flex items-center gap-1">
                <span>🏛️ Monthly Dashboard</span>
                <span className="bg-amber-400 text-slate-950 text-[9px] px-1.5 py-0.2 rounded-full font-black uppercase">
                  MONTH
                </span>
              </span>
            </button>

            <button
              onClick={() => onChangeDashboardTab('rsi_pullback')}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeDashboardTab === 'rsi_pullback'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <span className="flex items-center gap-1">
                <span>📉 RSI Pullback</span>
              </span>
            </button>

            <button
              onClick={() => onChangeDashboardTab('btst')}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeDashboardTab === 'btst'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-700 hover:text-slate-950 hover:bg-indigo-50'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                <span>🌙 BTST Gap Predictor</span>
                <span className="bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 text-[9px] px-1.5 py-0.2 rounded-full font-black uppercase shadow-xs">
                  AI BTST
                </span>
              </span>
            </button>

            <button
              onClick={() => onChangeDashboardTab('parabolic_rally')}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeDashboardTab === 'parabolic_rally'
                  ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 text-white shadow-md shadow-orange-500/20 ring-1 ring-white/30'
                  : 'text-slate-700 hover:text-slate-950 hover:bg-orange-50'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Flame className={`w-3.5 h-3.5 ${activeDashboardTab === 'parabolic_rally' ? 'text-amber-200 fill-amber-200 animate-pulse' : 'text-orange-500 fill-orange-500'}`} />
                <span>⚡ Parabolic Rally</span>
                <span className="bg-gradient-to-r from-yellow-300 to-amber-400 text-slate-950 text-[9px] px-1.5 py-0.2 rounded-full font-black uppercase shadow-xs">
                  15M Bull/Bear
                </span>
              </span>
            </button>

            <button
              onClick={() => onChangeDashboardTab('user_tracker')}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeDashboardTab === 'user_tracker'
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-700 hover:text-slate-950 hover:bg-emerald-50'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-emerald-400" />
                <span>💼 User Tracker</span>
                <span className="bg-emerald-400 text-slate-950 text-[9px] px-1.5 py-0.2 rounded-full font-black uppercase shadow-xs">
                  5-Min Dhan
                </span>
              </span>
            </button>

            {/* 🏢 Sector Strength Menu Tab */}
            <button
              onClick={() => onChangeDashboardTab('sector_strength')}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeDashboardTab === 'sector_strength'
                  ? 'bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 text-white shadow-md shadow-indigo-500/30 ring-1 ring-white/30'
                  : 'text-slate-700 hover:text-slate-950 hover:bg-purple-50'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Compass className={`w-3.5 h-3.5 ${activeDashboardTab === 'sector_strength' ? 'text-yellow-300 animate-spin-slow' : 'text-indigo-600'}`} />
                <span>🏢 Sector Strength</span>
                <span className="bg-gradient-to-r from-yellow-400 to-amber-400 text-slate-950 text-[9px] px-1.5 py-0.2 rounded-full font-black uppercase shadow-xs">
                  18+ Sectors
                </span>
              </span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span>Total F&O Stocks: <strong className="text-slate-900">{totalStocks}</strong></span>
            <span>Calculated: <strong className="text-blue-600">{calculatedCount} / {totalStocks}</strong></span>
            
            {/* Interactive Date Selector */}
            <div className="flex items-center space-x-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-md px-2 py-0.5 transition-colors">
              <Calendar className="w-3 h-3 text-blue-600 shrink-0" />
              <span className="text-slate-600 font-medium">Trading Date:</span>
              <input
                type="date"
                value={credentials.date || new Date().toISOString().split('T')[0]}
                onChange={(e) => onDateChange(e.target.value)}
                className="bg-transparent text-slate-900 font-bold outline-none cursor-pointer text-[11px]"
              />
              <button
                type="button"
                onClick={() => onDateChange(new Date().toISOString().split('T')[0])}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-100/70 hover:bg-blue-100 px-1.5 py-0.2 rounded transition-colors"
                title="Reset to Today's Date"
              >
                Today
              </button>
            </div>
          </div>
        </div>

      </div>
    </header>
  );
};
