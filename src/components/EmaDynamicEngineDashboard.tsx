import React, { useState, useMemo } from 'react';
import { StockCalculated, DhanApiCredentials } from '../types';
import { runEmaDynamicEngine, EmaTradeSignal, EmaEngineSummary } from '../utils/emaEngine';
import { Zap, TrendingUp, TrendingDown, Shield, Clock, RefreshCw, BarChart2, CheckCircle2, AlertTriangle, Layers, Award } from 'lucide-react';

interface EmaDynamicEngineDashboardProps {
  stocks: StockCalculated[];
  credentials: DhanApiCredentials;
  onFetchAllStocks: () => Promise<void> | void;
  isLoading?: boolean;
}

export const EmaDynamicEngineDashboard: React.FC<EmaDynamicEngineDashboardProps> = ({
  stocks,
  credentials,
  onFetchAllStocks,
  isLoading = false
}) => {
  const [activeTab, setActiveTab] = useState<'CARDS' | 'TABLE' | 'CONFIG'>('CARDS');

  const engineSummary: EmaEngineSummary = useMemo(() => {
    return runEmaDynamicEngine(stocks);
  }, [stocks]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/40 rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
                <span>Institutional Quantitative Engine</span>
              </span>
              <span className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-full text-xs font-mono">
                9 / 21 / 50 EMA &bull; ADX &bull; ATR
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <span>⚡ 3 EMA Dynamic Intraday Engine</span>
              <span className="text-xs px-3 py-1 rounded-xl font-mono bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                Win Rate: {engineSummary.winRatePct}%
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Algorithmic NSE intraday strategy executing on 15-minute 9/21/50 EMA crossovers filtered by ADX &gt; 25 trend strength and managed with dynamic ATR 1:2 risk-to-reward matrices.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onFetchAllStocks}
              disabled={isLoading}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Market Data</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Total Trades</div>
          <div className="text-xl font-black text-slate-900 mt-0.5">{engineSummary.totalTrades}</div>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Win Rate</div>
          <div className="text-xl font-black text-emerald-600 mt-0.5">{engineSummary.winRatePct}%</div>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Gross Profit</div>
          <div className="text-xl font-black text-emerald-600 mt-0.5">+{engineSummary.grossProfit} pts</div>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Gross Loss</div>
          <div className="text-xl font-black text-rose-600 mt-0.5">-{engineSummary.grossLoss} pts</div>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Net Return</div>
          <div className={`text-xl font-black mt-0.5 ${engineSummary.netReturn >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {engineSummary.netReturn >= 0 ? '+' : ''}{engineSummary.netReturn} pts
          </div>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Max Consec Losses</div>
          <div className="text-xl font-black text-amber-600 mt-0.5">{engineSummary.maxConsecutiveLosses}</div>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="flex items-center justify-between bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setActiveTab('CARDS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'CARDS'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            📦 Institutional Stock Cards
          </button>
          <button
            onClick={() => setActiveTab('TABLE')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'TABLE'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            📊 Summary Metrics Table
          </button>
          <button
            onClick={() => setActiveTab('CONFIG')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'CONFIG'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            ⚙️ Strategy Rules &amp; Config
          </button>
        </div>
        <div className="text-xs text-slate-500 px-3 font-mono">
          Timeframe: 15m | Window: 09:30–14:30 IST
        </div>
      </div>

      {/* Content Area */}
      {activeTab === 'CARDS' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {engineSummary.trades.length > 0 ? (
            engineSummary.trades.map((trade) => {
              const isLong = trade.direction === 'BULLISH LONG';
              return (
                <div 
                  key={trade.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4 font-mono text-xs relative overflow-hidden"
                >
                  <div className={`absolute top-0 left-0 w-full h-1.5 ${isLong ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 tracking-tight font-sans">
                        📦 STOCK CARD: {trade.symbol}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-sans">{trade.companyName}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                      isLong ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {trade.direction}
                    </span>
                  </div>

                  <div className="space-y-2 text-slate-700">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Signal Trigger:</span>
                      <span className="font-bold text-slate-900">{trade.triggerTimestamp}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Execution Entry:</span>
                      <span className="font-bold text-slate-900">₹{trade.executionEntryPrice.toFixed(2)}</span>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1">
                      <div className="text-[10px] font-bold text-slate-500 uppercase font-sans">Calculated Setup Risk</div>
                      <div className="flex justify-between text-rose-600 font-bold">
                        <span>🛑 Hard SL:</span>
                        <span>₹{trade.stopLoss.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-emerald-600 font-bold">
                        <span>🎯 Target TP:</span>
                        <span>₹{trade.takeProfit.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1">
                      <div className="text-[10px] font-bold text-slate-500 uppercase font-sans">Execution Exit &amp; Resolution</div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Exit Timestamp:</span>
                        <span className="text-slate-900">{trade.exitTimestamp}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Exit Locked Price:</span>
                        <span className="text-slate-900">₹{trade.exitPrice.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span className="text-slate-500">Outcome:</span>
                        <span className={trade.outcome.includes('TP') ? 'text-emerald-600' : 'text-rose-600'}>
                          {trade.outcome}
                        </span>
                      </div>
                      <div className="flex justify-between font-bold pt-1 border-t border-slate-200">
                        <span className="text-slate-500">Net Points:</span>
                        <span className={trade.netPoints >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                          {trade.netPoints >= 0 ? '+' : ''}{trade.netPoints} pts ({trade.netReturnPct}%)
                        </span>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-500 flex justify-between pt-1">
                      <span>ADX: {trade.adx}</span>
                      <span>ATR: {trade.atr}</span>
                      <span>9/21/50 EMA: {trade.ema9}/{trade.ema21}/{trade.ema50}</span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
              No completed trades generated. Ensure stock 15m candle prices are loaded and ADX &gt; 25 conditions are met.
            </div>
          )}
        </div>
      ) : activeTab === 'TABLE' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-6">
          <h3 className="text-base font-black text-slate-900 uppercase tracking-wide">
            📊 Unified Strategy Metrics Summary Table
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3">Metric Name</th>
                  <th className="px-4 py-3 text-right">Strategy Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-4 py-3 font-bold text-slate-800">Total Completed Trades</td>
                  <td className="px-4 py-3 text-right font-black text-slate-900">{engineSummary.totalTrades}</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-bold text-slate-800">Win Rate %</td>
                  <td className="px-4 py-3 text-right font-black text-emerald-600">{engineSummary.winRatePct}%</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-bold text-slate-800">Gross Profit</td>
                  <td className="px-4 py-3 text-right font-black text-emerald-600">+{engineSummary.grossProfit} pts</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-bold text-slate-800">Gross Loss</td>
                  <td className="px-4 py-3 text-right font-black text-rose-600">-{engineSummary.grossLoss} pts</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-bold text-slate-800">Net Return</td>
                  <td className={`px-4 py-3 text-right font-black ${engineSummary.netReturn >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {engineSummary.netReturn >= 0 ? '+' : ''}{engineSummary.netReturn} pts
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-bold text-slate-800">Max Consecutive Losses</td>
                  <td className="px-4 py-3 text-right font-black text-amber-600">{engineSummary.maxConsecutiveLosses}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4 text-xs leading-relaxed text-slate-700 font-sans">
          <h3 className="text-base font-black text-slate-900 uppercase tracking-wide">
            ⚙️ Institutional 3 EMA Dynamic Engine Strategy Configuration
          </h3>
          <ul className="list-disc pl-5 space-y-2 font-mono text-[11px]">
            <li><strong>Candle Timeframe:</strong> 15 Minutes</li>
            <li><strong>Trading Style:</strong> Pure Intraday (Zero overnight carryover)</li>
            <li><strong>Indicators:</strong> 9 EMA (Fast), 21 EMA (Medium Trend), 50 EMA (Macro Bias), 14 ADX (Trend Strength), 14 ATR (Volatility Risk).</li>
            <li><strong>Allowed Entry Window:</strong> 09:30 IST to 14:30 IST.</li>
            <li><strong>Absolute Liquidation:</strong> 15:00 IST (Force close all active positions).</li>
            <li><strong>Trend Filter:</strong> ADX &gt; 25 required (Suppress signals when ADX &le; 25).</li>
            <li><strong>Bullish Entry:</strong> 9 EMA crosses above 21 EMA while Close &gt; 50 EMA.</li>
            <li><strong>Bearish Entry:</strong> 9 EMA crosses below 21 EMA while Close &lt; 50 EMA.</li>
            <li><strong>Risk Management:</strong> Unit Risk (R) = 1.5 * ATR, Take-Profit = 3.0 * ATR (1:2 Risk-to-Reward).</li>
          </ul>
        </div>
      )}
    </div>
  );
};
