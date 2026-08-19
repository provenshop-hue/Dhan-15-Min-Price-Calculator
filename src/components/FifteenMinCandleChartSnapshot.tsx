import React, { useEffect, useRef, useState, memo } from 'react';
import { 
  BarChart2, 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  Target, 
  ExternalLink, 
  Layers, 
  Zap, 
  Maximize2,
  Clock,
  RefreshCw,
  Compass
} from 'lucide-react';
import { StockCalculated } from '../types';

interface TradingViewChartSnapshotProps {
  stock: StockCalculated;
  sectorName?: string;
  sectorAvgPct?: number;
  tradeDirection?: 'BULLISH' | 'BEARISH';
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const TradingViewChartSnapshot: React.FC<TradingViewChartSnapshotProps> = memo(({
  stock,
  sectorName = 'Sector',
  sectorAvgPct = 0,
  tradeDirection = 'BULLISH',
  onRefresh,
  isRefreshing = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeInterval, setActiveInterval] = useState<string>('15');
  const [chartKey, setChartKey] = useState<number>(0);

  // Normalize symbol for TradingView NSE feeds
  const cleanSymbol = (stock.symbol || 'TATAMOTORS').trim().toUpperCase();
  const tvSymbol = cleanSymbol.includes(':') 
    ? cleanSymbol 
    : cleanSymbol === 'NIFTY' 
    ? 'NSE:NIFTY' 
    : cleanSymbol === 'BANKNIFTY' 
    ? 'NSE:BANKNIFTY' 
    : `NSE:${cleanSymbol}`;

  // Inject official TradingView Advanced Chart Widget
  useEffect(() => {
    const currentContainer = containerRef.current;
    if (!currentContainer) return;

    // Clear previous widget content
    currentContainer.innerHTML = '';

    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.style.height = '100%';
    widgetDiv.style.width = '100%';
    currentContainer.appendChild(widgetDiv);

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.async = true;

    const widgetConfig = {
      autosize: true,
      symbol: tvSymbol,
      interval: activeInterval,
      timezone: 'Asia/Kolkata',
      theme: 'dark',
      style: '1', // 1 = Real Japanese Candlesticks (no curves or bends)
      locale: 'in',
      enable_publishing: false,
      hide_side_toolbar: false,
      allow_symbol_change: true,
      save_image: true,
      calendar: false,
      hide_volume: false,
      support_host: 'https://www.tradingview.com',
      studies: [
        'STD;VWAP',
        'STD;RSI'
      ],
      container_id: 'tradingview_advanced_chart'
    };

    script.innerHTML = JSON.stringify(widgetConfig);
    currentContainer.appendChild(script);

    return () => {
      if (currentContainer) {
        currentContainer.innerHTML = '';
      }
    };
  }, [tvSymbol, activeInterval, chartKey]);

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-3xl p-4 sm:p-5 text-white shadow-xl space-y-3.5 relative overflow-hidden">
      
      {/* Top Header Bar: Stock Info + Gann Levels + Timeframe Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-slate-800/80 pb-3.5">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shrink-0">
            <BarChart2 className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <h4 className="text-base font-black tracking-tight text-white font-mono flex items-center gap-1.5">
                <span>{tvSymbol}</span>
              </h4>
              <span className="text-xs font-sans font-bold bg-blue-950 text-blue-300 border border-blue-500/40 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                <span>TradingView 15M Live Candlesticks</span>
              </span>
              <span className={`text-xs font-sans font-bold px-2 py-0.5 rounded-full border ${
                sectorAvgPct >= 0 
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30' 
                  : 'bg-rose-950/80 text-rose-300 border-rose-500/30'
              }`}>
                {sectorName} ({sectorAvgPct >= 0 ? '+' : ''}{sectorAvgPct.toFixed(2)}%)
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
              <span>{stock.companyName}</span>
              <span>&bull;</span>
              <span>IST (UTC+5:30)</span>
              {stock.closePrice && (
                <>
                  <span>&bull;</span>
                  <span className="font-bold text-white">LTP: ₹{stock.closePrice.toFixed(2)}</span>
                  <span className={`font-bold ${(stock.pctChange || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ({(stock.pctChange || 0) >= 0 ? '+' : ''}{(stock.pctChange || 0).toFixed(2)}%)
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Timeframe Selector & Direct TradingView Tools */}
        <div className="flex items-center space-x-2 shrink-0 flex-wrap gap-y-2">
          {/* Timeframe Tabs */}
          <div className="flex items-center space-x-1 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs font-mono font-bold">
            {[
              { label: '5m', val: '5' },
              { label: '15m (Gann)', val: '15' },
              { label: '1h', val: '60' },
              { label: '1D', val: 'D' }
            ].map((tf) => (
              <button
                key={tf.val}
                onClick={() => setActiveInterval(tf.val)}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  activeInterval === tf.val
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {onRefresh && (
            <button
              onClick={() => {
                onRefresh();
                setChartKey((k) => k + 1);
              }}
              disabled={isRefreshing}
              className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-800 transition-all cursor-pointer disabled:opacity-50"
              title="Refresh Live Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          )}

          <a
            href={`https://in.tradingview.com/chart/?symbol=${encodeURIComponent(tvSymbol)}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-1 px-3 py-1.5 bg-slate-900 hover:bg-indigo-600 text-slate-300 hover:text-white rounded-xl border border-slate-800 text-xs font-bold transition-all cursor-pointer"
            title="Open in TradingView Full Screen"
          >
            <span>Full TV Chart</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Institutional Gann & Confluence HUD Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-900/90 border border-slate-800/90 p-2.5 rounded-2xl text-[11px] font-mono">
        <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800/60">
          <span className="text-slate-400 text-[10px] uppercase font-bold block flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Gann Buy Trigger
          </span>
          <span className="text-sm font-black text-emerald-400 mt-0.5 block">
            {stock.buyAbove ? `Above ₹${stock.buyAbove.toFixed(1)}` : '-'}
          </span>
          <span className="text-[10px] text-slate-400">
            T1: ₹{stock.targetsUp?.[0]?.toFixed(1) || '-'} &bull; T2: ₹{stock.targetsUp?.[1]?.toFixed(1) || '-'}
          </span>
        </div>

        <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800/60">
          <span className="text-slate-400 text-[10px] uppercase font-bold block flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            Gann Sell Trigger
          </span>
          <span className="text-sm font-black text-rose-400 mt-0.5 block">
            {stock.sellBelow ? `Below ₹${stock.sellBelow.toFixed(1)}` : '-'}
          </span>
          <span className="text-[10px] text-slate-400">
            T1: ₹{stock.targetsDown?.[0]?.toFixed(1) || '-'} &bull; T2: ₹{stock.targetsDown?.[1]?.toFixed(1) || '-'}
          </span>
        </div>

        <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800/60">
          <span className="text-slate-400 text-[10px] uppercase font-bold block flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            Session VWAP
          </span>
          <span className="text-sm font-black text-purple-300 mt-0.5 block">
            {stock.vwap ? `₹${stock.vwap.toFixed(1)}` : '-'}
          </span>
          <span className="text-[10px] text-slate-400">
            {(stock.closePrice || 0) >= (stock.vwap || 0) ? '🟢 Trading Above VWAP' : '🔴 Trading Below VWAP'}
          </span>
        </div>

        <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800/60">
          <span className="text-slate-400 text-[10px] uppercase font-bold block flex items-center gap-1">
            <Compass className="w-3 h-3 text-amber-400" />
            Sector Confluence
          </span>
          <span className={`text-sm font-black mt-0.5 block ${sectorAvgPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {sectorAvgPct >= 0 ? 'Bullish Tailwind' : 'Bearish Headwind'}
          </span>
          <span className="text-[10px] text-slate-400">
            Industry Avg: {sectorAvgPct >= 0 ? '+' : ''}{sectorAvgPct.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* TradingView Advanced Real-Time Chart Container */}
      <div className="relative w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-inner" style={{ height: '440px' }}>
        <div 
          ref={containerRef} 
          className="tradingview-widget-container w-full h-full"
        />
      </div>

      {/* Footer Notes */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] font-mono text-slate-400">
        <div className="flex items-center space-x-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
          <span>Real-time TradingView Candlestick Engine with volume, VWAP &amp; RSI</span>
        </div>
        <div>
          <span>Timeframe: <strong>{activeInterval === '15' ? '15 Minutes (Default Intraday)' : activeInterval}</strong></span>
        </div>
      </div>

    </div>
  );
});

export const FifteenMinCandleChartSnapshot = TradingViewChartSnapshot;
export default TradingViewChartSnapshot;
