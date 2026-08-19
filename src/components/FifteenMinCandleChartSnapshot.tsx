import React, { useState, useMemo } from 'react';
import { 
  BarChart2, 
  TrendingUp, 
  TrendingDown, 
  Layers, 
  Zap, 
  Activity, 
  Clock, 
  ShieldCheck, 
  Target, 
  ExternalLink,
  Info,
  Maximize2,
  RefreshCw
} from 'lucide-react';
import { StockCalculated } from '../types';

interface FifteenMinCandleChartSnapshotProps {
  stock: StockCalculated;
  sectorName?: string;
  sectorAvgPct?: number;
  tradeDirection?: 'BULLISH' | 'BEARISH';
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export interface CandleDataPoint {
  timeStr: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  rsi?: number;
  vwap?: number;
  isFirst15m?: boolean;
  isLatest?: boolean;
}

export const FifteenMinCandleChartSnapshot: React.FC<FifteenMinCandleChartSnapshotProps> = ({
  stock,
  sectorName = 'Sector',
  sectorAvgPct = 0,
  tradeDirection = 'BULLISH',
  onRefresh,
  isRefreshing = false
}) => {
  const [hoveredCandle, setHoveredCandle] = useState<CandleDataPoint | null>(null);
  const [showTechnicalOverlays, setShowTechnicalOverlays] = useState<boolean>(true);

  // Generate 15-min candle list from rsiTimeline or synthesize from OHLC
  const candleList: CandleDataPoint[] = useMemo(() => {
    if (stock.rsiTimeline && Array.isArray(stock.rsiTimeline) && stock.rsiTimeline.length > 0) {
      return stock.rsiTimeline.map((item, idx) => {
        const isFirst = idx === 0 || item.timeStr?.includes('09:15');
        const isLast = idx === stock.rsiTimeline!.length - 1;
        const cOpen = Number(item.open) || (idx === 0 ? stock.openPrice || 100 : stock.closePrice || 100);
        const cClose = Number(item.close) || stock.closePrice || cOpen;
        const cHigh = Number(item.high) || Math.max(cOpen, cClose) * 1.002;
        const cLow = Number(item.low) || Math.min(cOpen, cClose) * 0.998;
        const cVol = Number(item.volume) || (stock.volume ? Math.round(stock.volume / stock.rsiTimeline!.length) : 10000);

        return {
          timeStr: item.timeStr || `15m-${idx + 1}`,
          open: Math.round(cOpen * 100) / 100,
          high: Math.round(cHigh * 100) / 100,
          low: Math.round(cLow * 100) / 100,
          close: Math.round(cClose * 100) / 100,
          volume: cVol,
          rsi: item.rsi,
          vwap: stock.vwap || undefined,
          isFirst15m: isFirst,
          isLatest: isLast
        };
      });
    }

    // Fallback: Synthesize 15-minute intraday candle progression
    const open = stock.openPrice || stock.closePrice || 100;
    const close = stock.closePrice || open;
    const high = stock.highPrice || Math.max(open, close) * 1.01;
    const low = stock.lowPrice || Math.min(open, close) * 0.99;
    const firstHigh = stock.first15mHigh || Math.max(open, close);
    const firstLow = stock.first15mLow || Math.min(open, low);

    const timeSlots = [
      '09:15 AM', '09:30 AM', '09:45 AM', '10:00 AM', '10:15 AM', 
      '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', 
      '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:15 PM'
    ];

    const synthetic: CandleDataPoint[] = [];
    const numSlots = 8; // show primary session progression
    const stepDiff = (close - open) / (numSlots - 1);

    for (let i = 0; i < numSlots; i++) {
      const isFirst = i === 0;
      const isLast = i === numSlots - 1;
      const t = timeSlots[i] || `${9 + Math.floor(i / 4)}:${(i % 4) * 15 || '00'}`;

      let cOpen = isFirst ? open : open + (stepDiff * (i - 0.5));
      let cClose = isFirst ? (firstHigh + firstLow) / 2 : (isLast ? close : open + (stepDiff * i));
      
      let cHigh = Math.max(cOpen, cClose) + (Math.abs(close - open) * 0.15);
      let cLow = Math.min(cOpen, cClose) - (Math.abs(close - open) * 0.15);

      if (isFirst) {
        cHigh = firstHigh;
        cLow = firstLow;
      }
      if (cHigh > high) cHigh = high;
      if (cLow < low) cLow = low;

      synthetic.push({
        timeStr: t,
        open: Math.round(cOpen * 100) / 100,
        high: Math.round(cHigh * 100) / 100,
        low: Math.round(cLow * 100) / 100,
        close: Math.round(cClose * 100) / 100,
        volume: stock.volume ? Math.round(stock.volume / numSlots) : 25000,
        rsi: stock.rsi || 52,
        vwap: stock.vwap || undefined,
        isFirst15m: isFirst,
        isLatest: isLast
      });
    }

    return synthetic;
  }, [stock]);

  // Price range calculations for Chart Canvas
  const { minPrice, maxPrice, priceRange, maxVol } = useMemo(() => {
    if (candleList.length === 0) {
      return { minPrice: 100, maxPrice: 110, priceRange: 10, maxVol: 1000 };
    }

    let min = Infinity;
    let max = -Infinity;
    let highestV = 0;

    candleList.forEach((c) => {
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
      if (c.volume > highestV) highestV = c.volume;
    });

    if (stock.buyAbove && showTechnicalOverlays) {
      if (stock.buyAbove > max) max = stock.buyAbove;
      if (stock.buyAbove < min) min = stock.buyAbove;
    }
    if (stock.sellBelow && showTechnicalOverlays) {
      if (stock.sellBelow > max) max = stock.sellBelow;
      if (stock.sellBelow < min) min = stock.sellBelow;
    }
    if (stock.vwap && showTechnicalOverlays) {
      if (stock.vwap > max) max = stock.vwap;
      if (stock.vwap < min) min = stock.vwap;
    }

    const padding = (max - min) * 0.10 || 2;
    return {
      minPrice: min - padding,
      maxPrice: max + padding,
      priceRange: (max + padding) - (min - padding) || 1,
      maxVol: highestV || 1000
    };
  }, [candleList, stock, showTechnicalOverlays]);

  // Chart SVG Dimension Constants
  const SVG_WIDTH = 640;
  const SVG_HEIGHT = 220;
  const PADDING_TOP = 20;
  const PADDING_BOTTOM = 36;
  const PADDING_LEFT = 15;
  const PADDING_RIGHT = 60;

  const chartWidth = SVG_WIDTH - PADDING_LEFT - PADDING_RIGHT;
  const chartHeight = SVG_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

  // Helper coordinate mapper
  const getY = (price: number) => {
    const ratio = (price - minPrice) / priceRange;
    return PADDING_TOP + chartHeight * (1 - ratio);
  };

  const candleSpacing = chartWidth / (candleList.length || 1);
  const candleBodyWidth = Math.max(4, Math.min(18, candleSpacing * 0.65));

  const activeCandle = hoveredCandle || (candleList.length > 0 ? candleList[candleList.length - 1] : null);

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-3xl p-4 sm:p-5 text-white shadow-xl space-y-3.5 relative overflow-hidden">
      
      {/* Background ambient gradient */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar: Chart Title + Live Info + Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 border-b border-slate-800/80 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <BarChart2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="text-sm font-black tracking-tight text-white font-mono flex items-center gap-1.5">
                <span>{stock.symbol}</span>
                <span className="text-[11px] font-sans font-bold bg-indigo-950 text-indigo-300 border border-indigo-500/40 px-2 py-0.2 rounded-full">
                  15-Min Candle Snapshot
                </span>
              </h4>
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              {stock.candleTimestamp || '09:15 AM - 03:30 PM (15m Intraday)'}
            </p>
          </div>
        </div>

        {/* Level Toggles & Refresh */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowTechnicalOverlays(!showTechnicalOverlays)}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold font-mono transition-all border cursor-pointer ${
              showTechnicalOverlays
                ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/40'
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
            title="Toggle Gann & VWAP overlay levels"
          >
            {showTechnicalOverlays ? '🎯 Gann & VWAP: ON' : '🎯 Gann & VWAP: OFF'}
          </button>

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
              title="Refresh 15-min candles"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          )}

          <a
            href={stock.screenerUrl}
            target="_blank"
            rel="noreferrer"
            className="p-1.5 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-all"
            title="Open Live Chart in ScanX / TradingView"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Active / Hovered Candle HUD Stats Bar */}
      {activeCandle && (
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 bg-slate-900/90 border border-slate-800/80 p-2.5 rounded-2xl text-[11px] font-mono">
          <div>
            <span className="text-slate-500 text-[10px] block">Time Slot</span>
            <span className="font-bold text-white flex items-center gap-1">
              <Clock className="w-3 h-3 text-indigo-400" />
              {activeCandle.timeStr}
            </span>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] block">Open</span>
            <span className="font-bold text-slate-200">₹{activeCandle.open.toFixed(1)}</span>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] block">High</span>
            <span className="font-bold text-emerald-400">₹{activeCandle.high.toFixed(1)}</span>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] block">Low</span>
            <span className="font-bold text-rose-400">₹{activeCandle.low.toFixed(1)}</span>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] block">Close (LTP)</span>
            <span className={`font-bold ${activeCandle.close >= activeCandle.open ? 'text-emerald-400' : 'text-rose-400'}`}>
              ₹{activeCandle.close.toFixed(1)}
            </span>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] block">RSI (14)</span>
            <span className={`font-bold ${
              (activeCandle.rsi || 50) >= 60 ? 'text-emerald-400' : (activeCandle.rsi || 50) <= 40 ? 'text-rose-400' : 'text-slate-300'
            }`}>
              {activeCandle.rsi ? activeCandle.rsi.toFixed(1) : (stock.rsi ? stock.rsi.toFixed(1) : '-')}
            </span>
          </div>
        </div>
      )}

      {/* SVG Candlestick Chart Canvas */}
      <div className="relative w-full overflow-x-auto">
        <svg 
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} 
          className="w-full h-auto max-h-64 select-none"
          style={{ minWidth: '460px' }}
        >
          {/* Horizontal Gridlines & Price Scales */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const priceVal = minPrice + priceRange * (1 - ratio);
            const y = PADDING_TOP + chartHeight * ratio;
            return (
              <g key={ratio}>
                <line 
                  x1={PADDING_LEFT} 
                  y1={y} 
                  x2={SVG_WIDTH - PADDING_RIGHT} 
                  y2={y} 
                  stroke="#1e293b" 
                  strokeDasharray="3,3" 
                  strokeWidth="1" 
                />
                <text 
                  x={SVG_WIDTH - PADDING_RIGHT + 6} 
                  y={y + 3.5} 
                  fill="#64748b" 
                  fontSize="9.5" 
                  fontFamily="monospace"
                >
                  ₹{priceVal.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Technical Overlays (Gann Buy Above, Sell Below, VWAP) */}
          {showTechnicalOverlays && (
            <>
              {/* Gann Buy Above Level (Emerald Line) */}
              {stock.buyAbove && stock.buyAbove >= minPrice && stock.buyAbove <= maxPrice && (
                <g>
                  <line 
                    x1={PADDING_LEFT} 
                    y1={getY(stock.buyAbove)} 
                    x2={SVG_WIDTH - PADDING_RIGHT} 
                    y2={getY(stock.buyAbove)} 
                    stroke="#10b981" 
                    strokeWidth="1.5" 
                    strokeDasharray="4,2" 
                  />
                  <rect 
                    x={SVG_WIDTH - PADDING_RIGHT + 2} 
                    y={getY(stock.buyAbove) - 7} 
                    width="54" 
                    height="14" 
                    rx="3" 
                    fill="#064e3b" 
                  />
                  <text 
                    x={SVG_WIDTH - PADDING_RIGHT + 5} 
                    y={getY(stock.buyAbove) + 3} 
                    fill="#34d399" 
                    fontSize="8.5" 
                    fontWeight="bold" 
                    fontFamily="monospace"
                  >
                    BUY ₹{stock.buyAbove.toFixed(0)}
                  </text>
                </g>
              )}

              {/* Gann Sell Below Level (Rose Line) */}
              {stock.sellBelow && stock.sellBelow >= minPrice && stock.sellBelow <= maxPrice && (
                <g>
                  <line 
                    x1={PADDING_LEFT} 
                    y1={getY(stock.sellBelow)} 
                    x2={SVG_WIDTH - PADDING_RIGHT} 
                    y2={getY(stock.sellBelow)} 
                    stroke="#f43f5e" 
                    strokeWidth="1.5" 
                    strokeDasharray="4,2" 
                  />
                  <rect 
                    x={SVG_WIDTH - PADDING_RIGHT + 2} 
                    y={getY(stock.sellBelow) - 7} 
                    width="54" 
                    height="14" 
                    rx="3" 
                    fill="#881337" 
                  />
                  <text 
                    x={SVG_WIDTH - PADDING_RIGHT + 5} 
                    y={getY(stock.sellBelow) + 3} 
                    fill="#fb7185" 
                    fontSize="8.5" 
                    fontWeight="bold" 
                    fontFamily="monospace"
                  >
                    SELL ₹{stock.sellBelow.toFixed(0)}
                  </text>
                </g>
              )}

              {/* Session VWAP Line (Purple Line) */}
              {stock.vwap && stock.vwap >= minPrice && stock.vwap <= maxPrice && (
                <g>
                  <line 
                    x1={PADDING_LEFT} 
                    y1={getY(stock.vwap)} 
                    x2={SVG_WIDTH - PADDING_RIGHT} 
                    y2={getY(stock.vwap)} 
                    stroke="#a855f7" 
                    strokeWidth="1.5" 
                  />
                  <text 
                    x={PADDING_LEFT + 6} 
                    y={getY(stock.vwap) - 4} 
                    fill="#c084fc" 
                    fontSize="8.5" 
                    fontWeight="bold" 
                    fontFamily="monospace"
                  >
                    VWAP ₹{stock.vwap.toFixed(1)}
                  </text>
                </g>
              )}
            </>
          )}

          {/* Render 15-Min Candlesticks */}
          {candleList.map((c, i) => {
            const isGreen = c.close >= c.open;
            const x = PADDING_LEFT + (i + 0.5) * candleSpacing;
            const yHigh = getY(c.high);
            const yLow = getY(c.low);
            const yOpen = getY(c.open);
            const yClose = getY(c.close);

            const bodyTop = Math.min(yOpen, yClose);
            const bodyHeight = Math.max(2, Math.abs(yClose - yOpen));
            const isHovered = hoveredCandle?.timeStr === c.timeStr;

            return (
              <g 
                key={i}
                className="cursor-pointer transition-opacity hover:opacity-100"
                onMouseEnter={() => setHoveredCandle(c)}
                onMouseLeave={() => setHoveredCandle(null)}
              >
                {/* Candle Wick */}
                <line 
                  x1={x} 
                  y1={yHigh} 
                  x2={x} 
                  y2={yLow} 
                  stroke={isGreen ? '#10b981' : '#f43f5e'} 
                  strokeWidth="1.5" 
                />

                {/* Candle Body */}
                <rect 
                  x={x - candleBodyWidth / 2} 
                  y={bodyTop} 
                  width={candleBodyWidth} 
                  height={bodyHeight} 
                  rx="1.5"
                  fill={isGreen ? '#10b981' : '#f43f5e'} 
                  stroke={isHovered ? '#ffffff' : (isGreen ? '#059669' : '#e11d48')} 
                  strokeWidth={isHovered ? 1.5 : 0.5} 
                />

                {/* First 15-min Opening Range Badge (09:15 AM) */}
                {c.isFirst15m && (
                  <circle 
                    cx={x} 
                    cy={yHigh - 6} 
                    r="2.5" 
                    fill="#38bdf8" 
                  />
                )}

                {/* Time Label on X-axis */}
                {(i === 0 || i === Math.floor(candleList.length / 2) || i === candleList.length - 1 || i % 2 === 0) && (
                  <text 
                    x={x} 
                    y={SVG_HEIGHT - 10} 
                    fill="#94a3b8" 
                    fontSize="8.5" 
                    textAnchor="middle" 
                    fontFamily="monospace"
                  >
                    {c.timeStr.replace(' AM', '').replace(' PM', '')}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Footer Confluence & Timing Summary */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-[11px] font-mono">
        <div className="flex items-center space-x-2 text-slate-300">
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            Buy: Above ₹{stock.buyAbove?.toFixed(1) || '-'}
          </span>
          <span className="text-slate-600">&bull;</span>
          <span className="flex items-center gap-1 text-rose-400">
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
            Sell: Below ₹{stock.sellBelow?.toFixed(1) || '-'}
          </span>
          {stock.vwap && (
            <>
              <span className="text-slate-600">&bull;</span>
              <span className="text-purple-400">
                VWAP: ₹{stock.vwap.toFixed(1)} ({(stock.closePrice || 0) >= stock.vwap ? 'Above' : 'Below'})
              </span>
            </>
          )}
        </div>

        <div className="text-slate-400">
          Tailwind: <strong className={sectorAvgPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
            {sectorName} ({sectorAvgPct >= 0 ? '+' : ''}{sectorAvgPct.toFixed(2)}%)
          </strong>
        </div>
      </div>

    </div>
  );
};
