import React from 'react';
import { Key, Calculator, Download, Upload, RefreshCw, ShieldCheck, ShieldAlert, Calendar, Lock } from 'lucide-react';
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
  onSimulateAll,
  isBulkLoading,
  onFetchAll,
  onDateChange,
  onLock
}) => {
  return (
    <header className="bg-white border-b border-slate-200/80 text-slate-800 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-500/20 flex items-center justify-center font-bold text-lg">
              𝒢
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  Gannformula-app
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
            {/* Dhan API Settings Button (Protected by Code 1212) */}
            <button
              onClick={onOpenSettings}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                credentials.isConfigured
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>Dhan API Settings</span>
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

        {/* Stats Strip */}
        <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
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
