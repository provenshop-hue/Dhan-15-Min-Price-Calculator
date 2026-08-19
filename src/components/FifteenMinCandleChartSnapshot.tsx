import React, { useEffect, useRef, useState, useMemo, memo } from 'react';
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
  Compass,
  Eye,
  EyeOff,
  Sliders,
  AlertCircle
} from 'lucide-react';
import { StockCalculated } from '../types';
import { 
  createChart, 
  CandlestickSeries, 
  HistogramSeries, 
  ColorType, 
  CrosshairMode, 
  IChartApi, 
  ISeriesApi, 
  CandlestickData, 
  Time,
  LineStyle
} from 'lightweight-charts';

interface FifteenMinCandleChartSnapshotProps {
  stock: StockCalculated;
  sectorName?: string;
  sectorAvgPct?: number;
  tradeDirection?: 'BULLISH' | 'BEARISH';
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const FifteenMinCandleChartSnapshot: React.FC<FifteenMinCandleChartSnapshotProps> = memo(({
  stock,
  sectorName = 'Sector',
  sectorAvgPct = 0,
  tradeDirection = 'BULLISH',
  onRefresh,
  isRefreshing = false
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<IChartApi | null>(null);
  const [renderError, setRenderError] = useState<boolean>(false);
  
  const [showGannOverlays, setShowGannOverlays] = useState<boolean>(true);
  const [showVolume, setShowVolume] = useState<boolean>(true);
  const [hoveredCandle, setHoveredCandle] = useState<{
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    changePct: number;
    rsi?: number;
  } | null>(null);

  // Clean symbol string
  const displaySymbol = (stock.symbol || 'STOCK').trim().toUpperCase();

  // Convert stock candle stream / rsiTimeline into ordered 15m CandlestickData points
  const { candleData, volumeData, rawCandles } = useMemo(() => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const baseDate = new Date(`${dateStr}T09:15:00+05:30`);
    const baseTimestamp = Math.floor(baseDate.getTime() / 1000);

    const candles: CandlestickData<Time>[] = [];
    const volumes: { time: Time; value: number; color: string }[] = [];
    const rawList: Array<{ timeStr: string; open: number; high: number; low: number; close: number; volume: number; rsi?: number }> = [];

    // Helper to parse time string like "09:15 AM" into timestamp
    const parseTimeToTimestamp = (timeStr: string, index: number): number => {
      try {
        const parts = timeStr.trim().split(' ');
        const timePart = parts[0];
        const ampm = (parts[1] || 'AM').toUpperCase();
        const [hStr, mStr] = timePart.split(':');
        let h = parseInt(hStr, 10) || 9;
        const m = parseInt(mStr, 10) || 0;
        if (ampm === 'PM' && h < 12) h += 12;
        if (ampm === 'AM' && h === 12) h = 0;

        const d = new Date(`${dateStr}T${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00+05:30`);
        const ts = Math.floor(d.getTime() / 1000);
        if (!isNaN(ts) && ts > 0) return ts;
      } catch (e) {
        // fallback
      }
      return baseTimestamp + (index * 900); // 15 mins = 900 seconds
    };

    if (stock.rsiTimeline && Array.isArray(stock.rsiTimeline) && stock.rsiTimeline.length > 0) {
      let lastTimestamp = 0;
      stock.rsiTimeline.forEach((item, idx) => {
        let ts = parseTimeToTimestamp(item.timeStr || '', idx);
        if (ts <= lastTimestamp) {
          ts = lastTimestamp + 900;
        }
        lastTimestamp = ts;

        const cOpen = Number(item.open) || (idx === 0 ? stock.openPrice || 100 : stock.closePrice || 100);
        const cClose = Number(item.close) || stock.closePrice || cOpen;
        const cHigh = Number(item.high) || Math.max(cOpen, cClose) * 1.002;
        const cLow = Number(item.low) || Math.min(cOpen, cClose) * 0.998;
        const cVol = Number(item.volume) || (stock.volume ? Math.round(stock.volume / stock.rsiTimeline!.length) : 15000);

        candles.push({
          time: ts as Time,
          open: Math.round(cOpen * 100) / 100,
          high: Math.round(cHigh * 100) / 100,
          low: Math.round(cLow * 100) / 100,
          close: Math.round(cClose * 100) / 100
        });

        volumes.push({
          time: ts as Time,
          value: cVol,
          color: cClose >= cOpen ? 'rgba(8, 153, 129, 0.45)' : 'rgba(242, 54, 69, 0.45)'
        });

        rawList.push({
          timeStr: item.timeStr || `15m-${idx + 1}`,
          open: Math.round(cOpen * 100) / 100,
          high: Math.round(cHigh * 100) / 100,
          low: Math.round(cLow * 100) / 100,
          close: Math.round(cClose * 100) / 100,
          volume: cVol,
          rsi: item.rsi
        });
      });
    } else {
      // Synthesize 15-minute session candles (09:15 AM to current time)
      const open = stock.openPrice || stock.closePrice || 1000;
      const close = stock.closePrice || open;
      const high = stock.highPrice || Math.max(open, close) * 1.012;
      const low = stock.lowPrice || Math.min(open, close) * 0.988;
      const firstHigh = stock.first15mHigh || Math.max(open, close);
      const firstLow = stock.first15mLow || Math.min(open, low);

      const numCandles = 12; // 3 hours of 15m session candles
      const step = (close - open) / (numCandles - 1 || 1);

      const timeSlotNames = [
        '09:15 AM', '09:30 AM', '09:45 AM', '10:00 AM',
        '10:15 AM', '10:30 AM', '10:45 AM', '11:00 AM',
        '11:15 AM', '11:30 AM', '11:45 AM', '12:00 PM'
      ];

      for (let i = 0; i < numCandles; i++) {
        const ts = (baseTimestamp + (i * 900)) as Time;
        const isFirst = i === 0;
        const isLast = i === numCandles - 1;

        let cOpen = isFirst ? open : open + (step * (i - 0.4));
        let cClose = isFirst ? (firstHigh + firstLow) / 2 : (isLast ? close : open + (step * i));
        
        let cHigh = Math.max(cOpen, cClose) + (Math.abs(close - open) * 0.18) + (open * 0.001);
        let cLow = Math.min(cOpen, cClose) - (Math.abs(close - open) * 0.18) - (open * 0.001);

        if (isFirst) {
          cHigh = firstHigh;
          cLow = firstLow;
        }
        if (cHigh > high) cHigh = high;
        if (cLow < low) cLow = low;

        const o = Math.round(cOpen * 100) / 100;
        const h = Math.round(cHigh * 100) / 100;
        const l = Math.round(cLow * 100) / 100;
        const c = Math.round(cClose * 100) / 100;
        const v = stock.volume ? Math.round(stock.volume / numCandles) : 25000 + Math.round(Math.random() * 10000);

        candles.push({
          time: ts,
          open: o,
          high: h,
          low: l,
          close: c
        });

        volumes.push({
          time: ts,
          value: v,
          color: c >= o ? 'rgba(8, 153, 129, 0.45)' : 'rgba(242, 54, 69, 0.45)'
        });

        rawList.push({
          timeStr: timeSlotNames[i] || `${9 + Math.floor(i / 4)}:${(i % 4) * 15 || '00'}`,
          open: o,
          high: h,
          low: l,
          close: c,
          volume: v,
          rsi: stock.rsi || 54
        });
      }
    }

    return { candleData: candles, volumeData: volumes, rawCandles: rawList };
  }, [stock]);

  // Initialize Lightweight Charts instance (TradingView v5 Engine)
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    try {
      // Clean up existing chart
      if (chartInstanceRef.current) {
        chartInstanceRef.current.remove();
        chartInstanceRef.current = null;
      }

      const initialWidth = container.clientWidth || 600;

      // TradingView Dark Theme styling parameters
      const chart = createChart(container, {
        width: initialWidth,
        height: 380,
        layout: {
          background: { type: ColorType.Solid, color: '#131722' },
          textColor: '#9ea2ad',
          fontSize: 11,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif"
        },
        grid: {
          vertLines: { color: 'rgba(42, 46, 57, 0.6)', style: 1 },
          horzLines: { color: 'rgba(42, 46, 57, 0.6)', style: 1 }
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: {
            color: '#758696',
            width: 1,
            style: 3,
            labelBackgroundColor: '#2a2e39'
          },
          horzLine: {
            color: '#758696',
            width: 1,
            style: 3,
            labelBackgroundColor: '#2a2e39'
          }
        },
        rightPriceScale: {
          borderColor: 'rgba(42, 46, 57, 0.8)',
          visible: true,
          scaleMargins: {
            top: 0.12,
            bottom: 0.22
          }
        },
        timeScale: {
          borderColor: 'rgba(42, 46, 57, 0.8)',
          timeVisible: true,
          secondsVisible: false,
          fixLeftEdge: true,
          fixRightEdge: true
        }
      });

      chartInstanceRef.current = chart;

      // Volume Series (TradingView v5 HistogramSeries)
      const volumeSeries = chart.addSeries(HistogramSeries, {
        color: '#26a69a',
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume_scale'
      });
      chart.priceScale('volume_scale').applyOptions({
        scaleMargins: {
          top: 0.80,
          bottom: 0
        }
      });
      if (showVolume && volumeData.length > 0) {
        volumeSeries.setData(volumeData);
      }

      // Candlestick Series (TradingView v5 CandlestickSeries)
      const candlestickSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#089981',
        downColor: '#f23645',
        borderVisible: false,
        wickUpColor: '#089981',
        wickDownColor: '#f23645'
      });
      if (candleData.length > 0) {
        candlestickSeries.setData(candleData);
      }

      // Gann Levels & VWAP Price Lines
      if (showGannOverlays) {
        if (stock.buyAbove) {
          candlestickSeries.createPriceLine({
            price: stock.buyAbove,
            color: '#089981',
            lineWidth: 2,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `GANN BUY ₹${stock.buyAbove.toFixed(1)}`
          });
        }

        if (stock.sellBelow) {
          candlestickSeries.createPriceLine({
            price: stock.sellBelow,
            color: '#f23645',
            lineWidth: 2,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `GANN SELL ₹${stock.sellBelow.toFixed(1)}`
          });
        }

        if (stock.vwap) {
          candlestickSeries.createPriceLine({
            price: stock.vwap,
            color: '#a855f7',
            lineWidth: 2,
            lineStyle: LineStyle.Solid,
            axisLabelVisible: true,
            title: `VWAP ₹${stock.vwap.toFixed(1)}`
          });
        }
      }

      // Interactive Crosshair Move Listener
      chart.subscribeCrosshairMove((param) => {
        if (
          !param.point ||
          !param.time ||
          param.point.x < 0 ||
          param.point.x > container.clientWidth ||
          param.point.y < 0 ||
          param.point.y > container.clientHeight
        ) {
          setHoveredCandle(null);
          return;
        }

        const priceData = param.seriesData.get(candlestickSeries) as CandlestickData<Time> | undefined;
        const volData = param.seriesData.get(volumeSeries) as { value: number } | undefined;

        if (priceData && typeof priceData.open === 'number') {
          const chg = priceData.open > 0 ? ((priceData.close - priceData.open) / priceData.open) * 100 : 0;
          
          let timeLabel = '';
          if (typeof param.time === 'number') {
            const dt = new Date(param.time * 1000);
            timeLabel = dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
          } else {
            timeLabel = String(param.time);
          }

          setHoveredCandle({
            time: timeLabel,
            open: priceData.open,
            high: priceData.high,
            low: priceData.low,
            close: priceData.close,
            volume: volData?.value || 0,
            changePct: chg,
            rsi: stock.rsi || undefined
          });
        }
      });

      // Auto-fit time scale
      chart.timeScale().fitContent();

      // Resize observer
      const resizeObserver = new ResizeObserver((entries) => {
        if (entries.length === 0 || !entries[0].contentRect) return;
        const { width } = entries[0].contentRect;
        if (width > 0 && chartInstanceRef.current) {
          chartInstanceRef.current.applyOptions({ width });
        }
      });
      resizeObserver.observe(container);

      setRenderError(false);

      return () => {
        resizeObserver.disconnect();
        if (chartInstanceRef.current) {
          chartInstanceRef.current.remove();
          chartInstanceRef.current = null;
        }
      };
    } catch (err) {
      console.warn('Lightweight charts init error, switching to SVG engine fallback:', err);
      setRenderError(true);
    }
  }, [candleData, volumeData, showGannOverlays, showVolume, stock.buyAbove, stock.sellBelow, stock.vwap]);

  // Last candle default for HUD when cursor is not hovering
  const activeHUD = hoveredCandle || (candleData.length > 0 ? {
    time: stock.candleTimestamp?.split(' ')?.[1] || '15m Live',
    open: candleData[candleData.length - 1].open,
    high: candleData[candleData.length - 1].high,
    low: candleData[candleData.length - 1].low,
    close: candleData[candleData.length - 1].close,
    volume: stock.volume || 0,
    changePct: stock.pctChange || 0,
    rsi: stock.rsi || undefined
  } : null);

  // SVG Fallback Price Calculation in case Canvas/WebGL fails
  const svgCalculations = useMemo(() => {
    if (rawCandles.length === 0) return null;
    let min = Infinity;
    let max = -Infinity;
    rawCandles.forEach((c) => {
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
    });
    if (stock.buyAbove && showGannOverlays) {
      if (stock.buyAbove > max) max = stock.buyAbove;
      if (stock.buyAbove < min) min = stock.buyAbove;
    }
    if (stock.sellBelow && showGannOverlays) {
      if (stock.sellBelow > max) max = stock.sellBelow;
      if (stock.sellBelow < min) min = stock.sellBelow;
    }
    const pad = (max - min) * 0.12 || 2;
    return {
      min: min - pad,
      max: max + pad,
      range: (max + pad) - (min - pad) || 1
    };
  }, [rawCandles, stock, showGannOverlays]);

  return (
    <div className="bg-[#131722] border border-[#2a2e39] rounded-3xl p-4 sm:p-5 text-white shadow-2xl space-y-3 relative overflow-hidden">
      
      {/* TradingView Top Navigation & Metadata Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-[#2a2e39] pb-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
            <BarChart2 className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="text-base font-black text-white font-mono tracking-tight">
                {displaySymbol}
              </span>
              <span className="text-[11px] font-sans font-bold bg-[#1e222d] text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-md">
                15m &bull; NSE Intraday
              </span>
              <span className={`text-[11px] font-sans font-bold px-2 py-0.5 rounded-md border ${
                sectorAvgPct >= 0 
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30' 
                  : 'bg-rose-950/60 text-rose-300 border-rose-500/30'
              }`}>
                {sectorName} ({sectorAvgPct >= 0 ? '+' : ''}{sectorAvgPct.toFixed(2)}%)
              </span>
            </div>
            <p className="text-[11px] text-[#787b86] font-mono mt-0.5">
              {stock.companyName} &bull; Dhan Live Feed &bull; 15-Minute Gann Setup
            </p>
          </div>
        </div>

        {/* Chart View Controls & Overlays */}
        <div className="flex items-center space-x-2 shrink-0 flex-wrap gap-y-1.5">
          <button
            onClick={() => setShowGannOverlays(!showGannOverlays)}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all border cursor-pointer ${
              showGannOverlays
                ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50'
                : 'bg-[#1e222d] text-[#787b86] border-[#2a2e39]'
            }`}
            title="Toggle Gann Buy/Sell Levels on Chart"
          >
            {showGannOverlays ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>Gann Levels</span>
          </button>

          <button
            onClick={() => setShowVolume(!showVolume)}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all border cursor-pointer ${
              showVolume
                ? 'bg-[#26a69a]/20 text-[#26a69a] border-[#26a69a]/40'
                : 'bg-[#1e222d] text-[#787b86] border-[#2a2e39]'
            }`}
            title="Toggle Volume Histogram"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Volume</span>
          </button>

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-1.5 bg-[#1e222d] hover:bg-[#2a2e39] text-[#9ea2ad] hover:text-white rounded-lg border border-[#2a2e39] transition-all cursor-pointer disabled:opacity-50"
              title="Refresh Dhan 15-min Candles"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          )}

          <a
            href={stock.screenerUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-1 px-2.5 py-1 bg-[#1e222d] hover:bg-indigo-600 text-[#9ea2ad] hover:text-white rounded-lg border border-[#2a2e39] text-xs font-bold transition-all"
            title="Open Stock Analysis in ScanX"
          >
            <span>ScanX</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* TradingView Legend / Live HUD Bar */}
      {activeHUD && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 bg-[#1e222d] border border-[#2a2e39] px-3.5 py-2 rounded-xl text-xs font-mono text-[#d1d4dc]">
          <div className="flex items-center space-x-1 text-[#787b86]">
            <span>{displaySymbol}</span>
            <span>&bull;</span>
            <span className="text-[#2962ff] font-bold">15m</span>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-[#787b86]">O:</span>
            <span className="font-bold text-white">₹{activeHUD.open.toFixed(2)}</span>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-[#787b86]">H:</span>
            <span className="font-bold text-[#089981]">₹{activeHUD.high.toFixed(2)}</span>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-[#787b86]">L:</span>
            <span className="font-bold text-[#f23645]">₹{activeHUD.low.toFixed(2)}</span>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-[#787b86]">C:</span>
            <span className={`font-bold ${activeHUD.close >= activeHUD.open ? 'text-[#089981]' : 'text-[#f23645]'}`}>
              ₹{activeHUD.close.toFixed(2)}
            </span>
          </div>

          <div className="flex items-center space-x-1">
            <span className={`font-bold ${activeHUD.changePct >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>
              {activeHUD.changePct >= 0 ? '+' : ''}{activeHUD.changePct.toFixed(2)}%
            </span>
          </div>

          {activeHUD.volume > 0 && (
            <div className="flex items-center space-x-1.5">
              <span className="text-[#787b86]">Vol:</span>
              <span className="text-[#9ea2ad]">{activeHUD.volume.toLocaleString('en-IN')}</span>
            </div>
          )}

          {stock.rsi && (
            <div className="flex items-center space-x-1.5 ml-auto">
              <span className="text-[#787b86]">RSI(14):</span>
              <span className={`font-bold ${stock.rsi >= 60 ? 'text-[#089981]' : stock.rsi <= 40 ? 'text-[#f23645]' : 'text-[#d1d4dc]'}`}>
                {stock.rsi.toFixed(1)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Primary Chart Canvas (Lightweight-Charts v5 Engine) */}
      {!renderError ? (
        <div 
          ref={chartContainerRef} 
          className="w-full rounded-2xl overflow-hidden border border-[#2a2e39] bg-[#131722] relative"
          style={{ minHeight: '380px' }}
        />
      ) : (
        /* Pixel-Perfect Fallback TradingView SVG Engine */
        <div className="w-full rounded-2xl overflow-hidden border border-[#2a2e39] bg-[#131722] p-2 relative">
          {svgCalculations && (
            <svg viewBox="0 0 700 280" className="w-full h-72 select-none">
              {/* Gridlines */}
              {[0, 0.25, 0.5, 0.75, 1].map((r) => {
                const p = svgCalculations.min + svgCalculations.range * (1 - r);
                const y = 20 + 220 * r;
                return (
                  <g key={r}>
                    <line x1="20" y1={y} x2="620" y2={y} stroke="#2a2e39" strokeDasharray="2,2" />
                    <text x="625" y={y + 3} fill="#787b86" fontSize="9" fontFamily="monospace">₹{p.toFixed(1)}</text>
                  </g>
                );
              })}

              {/* Gann Buy Above Line */}
              {showGannOverlays && stock.buyAbove && (
                <line 
                  x1="20" 
                  y1={20 + 220 * (1 - (stock.buyAbove - svgCalculations.min) / svgCalculations.range)} 
                  x2="620" 
                  y2={20 + 220 * (1 - (stock.buyAbove - svgCalculations.min) / svgCalculations.range)} 
                  stroke="#089981" 
                  strokeWidth="1.5" 
                  strokeDasharray="4,2" 
                />
              )}

              {/* Gann Sell Below Line */}
              {showGannOverlays && stock.sellBelow && (
                <line 
                  x1="20" 
                  y1={20 + 220 * (1 - (stock.sellBelow - svgCalculations.min) / svgCalculations.range)} 
                  x2="620" 
                  y2={20 + 220 * (1 - (stock.sellBelow - svgCalculations.min) / svgCalculations.range)} 
                  stroke="#f23645" 
                  strokeWidth="1.5" 
                  strokeDasharray="4,2" 
                />
              )}

              {/* Candlesticks */}
              {rawCandles.map((c, i) => {
                const isGreen = c.close >= c.open;
                const spacing = 580 / (rawCandles.length || 1);
                const x = 30 + i * spacing;
                const yH = 20 + 220 * (1 - (c.high - svgCalculations.min) / svgCalculations.range);
                const yL = 20 + 220 * (1 - (c.low - svgCalculations.min) / svgCalculations.range);
                const yO = 20 + 220 * (1 - (c.open - svgCalculations.min) / svgCalculations.range);
                const yC = 20 + 220 * (1 - (c.close - svgCalculations.min) / svgCalculations.range);
                const top = Math.min(yO, yC);
                const h = Math.max(2, Math.abs(yC - yO));

                return (
                  <g key={i}>
                    {/* 1px Wick */}
                    <line x1={x} y1={yH} x2={x} y2={yL} stroke={isGreen ? '#089981' : '#f23645'} strokeWidth="1" />
                    {/* Body */}
                    <rect x={x - 6} y={top} width="12" height={h} fill={isGreen ? '#089981' : '#f23645'} />
                    {/* Time */}
                    {i % 2 === 0 && (
                      <text x={x} y="260" fill="#787b86" fontSize="8.5" textAnchor="middle" fontFamily="monospace">
                        {c.timeStr.replace(' AM', '').replace(' PM', '')}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          )}
        </div>
      )}

      {/* TradingView Chart Bottom Indicator Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] font-mono text-[#787b86] border-t border-[#2a2e39]/60">
        <div className="flex items-center space-x-3">
          {stock.buyAbove && (
            <span className="flex items-center gap-1 text-[#089981]">
              <span className="w-2 h-0.5 bg-[#089981] inline-block" />
              Gann Buy: Above ₹{stock.buyAbove.toFixed(1)}
            </span>
          )}
          {stock.sellBelow && (
            <span className="flex items-center gap-1 text-[#f23645]">
              <span className="w-2 h-0.5 bg-[#f23645] inline-block" />
              Gann Sell: Below ₹{stock.sellBelow.toFixed(1)}
            </span>
          )}
          {stock.vwap && (
            <span className="flex items-center gap-1 text-[#a855f7]">
              <span className="w-2 h-0.5 bg-[#a855f7] inline-block" />
              VWAP: ₹{stock.vwap.toFixed(1)}
            </span>
          )}
        </div>

        <div>
          <span>Dhan API 15M Live Candles &bull; Direct Engine</span>
        </div>
      </div>

    </div>
  );
});

export const TradingViewChartSnapshot = FifteenMinCandleChartSnapshot;
export default FifteenMinCandleChartSnapshot;
