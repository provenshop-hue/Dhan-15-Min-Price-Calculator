import React, { useMemo, useState } from 'react';
import { 
  Target, 
  TrendingUp, 
  Filter, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  BarChart3, 
  ExternalLink,
  Clock,
  Sparkles,
  ArrowUpDown,
  Flame,
  Zap,
  ChevronDown,
  ChevronUp,
  Calculator,
  SlidersHorizontal,
  Activity,
  Calendar
} from 'lucide-react';
import { StockCalculated, StockTradeJourney } from '../types';
import { generateIntradayRsiTimeline } from '../utils/rsiAnalyst';
import { 
  resolveRecentHundredBullishHitTiming, 
  parseTimeToMinutes, 
  formatCleanRecentTime 
} from '../utils/recentHitTiming';

interface Props {
  stocks: StockCalculated[];
  niftyStock?: StockCalculated;
  tradeJourneys?: Record<string, StockTradeJourney>;
  onSelectStockDetail: (stock: StockCalculated) => void;
  onOpenPositionSizer?: (stock: StockCalculated) => void;
  onOpenRsiAnalyst?: (stock: StockCalculated) => void;
}

interface ConfluenceCheck {
  id: string;
  name: string;
  value: string;
  met: boolean;
  type: 'CALCULATED' | 'INFERRED' | 'PENDING';
  hitTime?: string;
}

export interface ConfluenceMilestone {
  time: string;
  name: string;
  detail: string;
  price: number;
  isFirst: boolean;
}

export interface ConfluenceTimingInfo {
  firstHitTime: string;
  firstHitTrigger: string;
  firstHitPrice: number;
  firstHitDetail: string;
  phaseBadge: string;
  phaseBadgeClass: string;
  milestones: ConfluenceMilestone[];
}

interface AnalyzedStock extends StockCalculated {
  variance: number;
  checks: ConfluenceCheck[];
  score: number;
  timing: ConfluenceTimingInfo;
}

export function HundredPercentBullishScanner({ 
  stocks, 
  niftyStock, 
  tradeJourneys,
  onSelectStockDetail,
  onOpenPositionSizer,
  onOpenRsiAnalyst
}: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [priceFilter, setPriceFilter] = useState<'ALL' | '1000_TO_2500' | 'ABOVE_2500'>('ALL');
  const [timeFilter, setTimeFilter] = useState<'ALL' | '09:15' | '09:30' | '09:45_PLUS'>('ALL');
  const [sortBy, setSortBy] = useState<'SCORE_DESC' | 'TIME_ASC' | 'TIME_DESC' | 'VARIANCE_ASC' | 'PCT_DESC'>('SCORE_DESC');
  const [expandedTimelines, setExpandedTimelines] = useState<Set<string>>(new Set());

  const toggleTimeline = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setExpandedTimelines(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const analyzedStocks = useMemo(() => {
    return stocks.map(stock => {
      // Must have basic prices
      if (stock.openPrice == null || stock.highPrice == null || stock.lowPrice == null || stock.closePrice == null) {
        return null;
      }
      
      const open = stock.first1mOpen ?? stock.openPrice;
      const low = stock.first1mLow ?? stock.lowPrice;
      const high = stock.highPrice;
      const close = stock.closePrice;
      const prevClose = stock.previousClose;
      const f15mHigh = stock.first15mHigh;
      const vwap = stock.vwap ?? open;
      
      // Calculate Open = Low variance
      const variance = Math.abs(open - low) / open * 100;
      
      // Filter out anything > 0.20% variance early
      if (variance > 0.20) {
        return null;
      }

      const isGapUp = prevClose ? open > prevClose : false;
      const breaksORB = f15mHigh ? close > f15mHigh : false;
      const volRatio = stock.volumeRatio || 0;
      const isHighVol = volRatio >= 1.5;
      const aboveVwap = stock.vwap ? close > stock.vwap : false;

      // 1. Calculate Confluence Milestones
      const milestones: ConfluenceMilestone[] = [];

      // Milestone 1: 09:15 AM Opening Bell Open = Low
      milestones.push({
        time: '09:15 AM',
        name: 'Open = Low Base Formed',
        detail: `Open ₹${open.toFixed(2)} = Low ₹${low.toFixed(2)} (${variance.toFixed(2)}% Var)${isGapUp ? ' + Gap Up' : ''}`,
        price: open,
        isFirst: false
      });

      // Milestone 2: 09:30 AM (if ORB High broken)
      if (breaksORB && f15mHigh) {
        milestones.push({
          time: '09:30 AM',
          name: '15m ORB High Breakout',
          detail: `Broke 15m candle high ₹${f15mHigh.toFixed(2)} with strong drive`,
          price: f15mHigh,
          isFirst: false
        });
      }

      // Milestone 3: 09:45 AM (if RVOL surge + VWAP)
      if (isHighVol && aboveVwap) {
        milestones.push({
          time: '09:45 AM',
          name: 'Institutional Volume Surge',
          detail: `Volume ratio expanded to ${volRatio.toFixed(1)}x while sustaining above VWAP ₹${vwap.toFixed(2)}`,
          price: vwap,
          isFirst: false
        });
      }

      // Milestone 4: 10:00 AM (RSI Momentum Sweet Spot)
      if (stock.rsi && stock.rsi >= 55 && stock.rsi <= 75) {
        milestones.push({
          time: '10:00 AM',
          name: 'RSI 55–75 Momentum Continuation',
          detail: `RSI stable at ${stock.rsi.toFixed(1)} confirming parabolic momentum`,
          price: close,
          isFirst: false
        });
      }

      // Determine Recent Confluence Hit Time (Guaranteed Clean Recent Timing, No Yesterday)
      const tradeJourney = tradeJourneys ? (tradeJourneys[stock.id] || tradeJourneys[stock.symbol]) : undefined;
      const recentTiming = resolveRecentHundredBullishHitTiming(
        stock,
        variance,
        breaksORB,
        tradeJourney
      );

      const firstHitTime = recentTiming.hitTime;
      const firstHitTrigger = recentTiming.hitTrigger;
      const firstHitPrice = recentTiming.hitPrice;
      const phaseBadge = recentTiming.phaseBadge;
      const phaseBadgeClass = recentTiming.phaseBadgeClass;

      // Add a milestone for recent hit if later than 09:30 AM
      if (firstHitTime !== '09:15 AM' && firstHitTime !== '09:30 AM') {
        milestones.push({
          time: firstHitTime,
          name: '100% Bullish Surge Triggered',
          detail: firstHitTrigger,
          price: firstHitPrice,
          isFirst: true
        });
      }

      // Mark the milestone matching firstHitTime
      if (milestones.length > 0) {
        milestones.forEach(m => { m.isFirst = false; });
        const matchingMs = milestones.find(m => m.time === firstHitTime) || milestones[milestones.length - 1];
        matchingMs.isFirst = true;
      }

      const timing: ConfluenceTimingInfo = {
        firstHitTime,
        firstHitTrigger,
        firstHitPrice,
        firstHitDetail: `Recent confluence hit at ${firstHitTime} @ ₹${firstHitPrice.toFixed(2)}`,
        phaseBadge,
        phaseBadgeClass,
        milestones
      };

      const checks: ConfluenceCheck[] = [];

      // 1. Open = Low (Variance <= 0.20%)
      checks.push({
        id: 'open_low',
        name: 'Open = Low (≤ 0.20%)',
        value: `${variance.toFixed(2)}% Var • Met @ 09:15 AM`,
        met: true,
        type: 'CALCULATED',
        hitTime: '09:15 AM'
      });

      // 2. Close near High (Body >= 60% of candle)
      const candleRange = high - low;
      const body = close - open;
      const bodyPct = candleRange > 0 ? (body / candleRange) * 100 : 0;
      const isStrongClose = bodyPct >= 60;
      checks.push({
        id: 'body_pct',
        name: 'Body ≥ 60% of Range',
        value: `${bodyPct.toFixed(1)}%`,
        met: isStrongClose,
        type: 'CALCULATED',
        hitTime: firstHitTime
      });

      // 3. Volume > 1.5x
      checks.push({
        id: 'volume',
        name: 'Volume / RVOL > 1.5x',
        value: `${volRatio.toFixed(1)}x`,
        met: isHighVol,
        type: 'CALCULATED',
        hitTime: '09:45 AM'
      });

      // 4. Above VWAP
      checks.push({
        id: 'vwap',
        name: 'Price Above VWAP',
        value: stock.vwap ? `₹${stock.vwap.toFixed(2)} • Met` : 'N/A',
        met: aboveVwap,
        type: 'CALCULATED',
        hitTime: '09:15 AM'
      });

      // 5. Open above Previous Close
      checks.push({
        id: 'prev_close',
        name: 'Gap Up / Open > Prev Close',
        value: prevClose ? `₹${prevClose.toFixed(2)} • Met @ 09:15 AM` : 'N/A',
        met: isGapUp,
        type: 'CALCULATED',
        hitTime: '09:15 AM'
      });

      // 6. Breaks First 15m High (ORB)
      checks.push({
        id: 'orb',
        name: 'Breaks 15m High (ORB)',
        value: f15mHigh ? (breaksORB ? `₹${f15mHigh.toFixed(2)} • Met @ 09:30 AM` : `₹${f15mHigh.toFixed(2)}`) : 'N/A',
        met: breaksORB,
        type: 'CALCULATED',
        hitTime: '09:30 AM'
      });

      // 7. RSI 55-75
      const rsi = stock.rsi || 0;
      const isBullishRsi = rsi >= 55 && rsi <= 75;
      checks.push({
        id: 'rsi',
        name: 'RSI (55-75)',
        value: rsi ? `${rsi.toFixed(1)} • Met` : 'N/A',
        met: isBullishRsi,
        type: 'CALCULATED',
        hitTime: '10:00 AM'
      });

      // 8. Market/NIFTY Bullish
      const niftyPct = niftyStock?.pctChange || 0;
      const marketBullish = niftyPct > 0;
      checks.push({
        id: 'market',
        name: 'Market (NIFTY) Stable/Bull',
        value: `${niftyPct > 0 ? '+' : ''}${niftyPct.toFixed(2)}%`,
        met: marketBullish,
        type: 'CALCULATED'
      });

      // 9. Sector Stronger than NIFTY
      const stockPct = stock.pctChange || 0;
      const strongerThanMarket = stockPct > niftyPct;
      checks.push({
        id: 'sector',
        name: 'Stock/Sector > NIFTY',
        value: `Diff: ${(stockPct - niftyPct).toFixed(2)}%`,
        met: strongerThanMarket,
        type: 'CALCULATED'
      });

      // 10. 1-Hour Trend Bullish (Proxy via 15m)
      checks.push({
        id: '1h_trend',
        name: '1H Trend Bullish',
        value: stockPct > 1 ? 'Strong' : 'Weak',
        met: stockPct > 1,
        type: 'INFERRED'
      });

      // 11. 5-min Structure HH+HL (Proxy)
      checks.push({
        id: '5m_struct',
        name: '5m Struct: HH+HL',
        value: isStrongClose ? 'Intact' : 'Broken',
        met: isStrongClose,
        type: 'INFERRED'
      });

      // 12. Breaks Previous Day High (PDH) - Proxy
      checks.push({
        id: 'pdh',
        name: 'Breaks Prev Day High',
        value: stockPct > 1.5 ? 'Likely Yes' : 'Pending',
        met: stockPct > 1.5,
        type: 'INFERRED'
      });

      // 13. Futures OI increasing
      checks.push({
        id: 'oi',
        name: 'Price ↑ + OI ↑',
        value: isHighVol && stockPct > 0 ? 'Expansion' : 'Contraction',
        met: isHighVol && stockPct > 0,
        type: 'INFERRED'
      });

      const metCount = checks.filter(c => c.met).length;
      
      return {
        ...stock,
        variance,
        checks,
        score: metCount,
        timing
      } as AnalyzedStock;

    }).filter(Boolean) as AnalyzedStock[];
  }, [stocks, niftyStock, tradeJourneys]);

  // Filter and Sort
  const filteredStocks = useMemo(() => {
    return analyzedStocks
      .filter(s => {
        if (!searchTerm) return true;
        const q = searchTerm.toLowerCase();
        return s.symbol.toLowerCase().includes(q) || s.companyName.toLowerCase().includes(q);
      })
      .filter(s => {
        const price = s.closePrice || s.openPrice || 0;
        if (priceFilter === '1000_TO_2500') {
          return price > 1000 && price <= 2500;
        } else if (priceFilter === 'ABOVE_2500') {
          return price > 2500;
        }
        return true;
      })
      .filter(s => {
        if (timeFilter === '09:15') return s.timing.firstHitTime === '09:15 AM';
        if (timeFilter === '09:30') return s.timing.firstHitTime === '09:30 AM';
        if (timeFilter === '09:45_PLUS') return s.timing.firstHitTime !== '09:15 AM' && s.timing.firstHitTime !== '09:30 AM';
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'TIME_ASC') {
          return parseTimeToMinutes(a.timing.firstHitTime) - parseTimeToMinutes(b.timing.firstHitTime);
        }
        if (sortBy === 'TIME_DESC') {
          return parseTimeToMinutes(b.timing.firstHitTime) - parseTimeToMinutes(a.timing.firstHitTime);
        }
        if (sortBy === 'VARIANCE_ASC') {
          return a.variance - b.variance;
        }
        if (sortBy === 'PCT_DESC') {
          return (b.pctChange || 0) - (a.pctChange || 0);
        }
        // Default: SCORE_DESC, then lowest variance
        return b.score - a.score || a.variance - b.variance;
      });
  }, [analyzedStocks, searchTerm, priceFilter, timeFilter, sortBy]);

  // Overall timing stats
  const timingStats = useMemo(() => {
    if (analyzedStocks.length === 0) {
      return { total: 0, earliest: 'N/A', latest: 'N/A', avgScore: 0, count915: 0, count930: 0 };
    }
    const times = [...analyzedStocks.map(s => s.timing.firstHitTime)].sort((a, b) => parseTimeToMinutes(a) - parseTimeToMinutes(b));
    const count915 = analyzedStocks.filter(s => s.timing.firstHitTime === '09:15 AM').length;
    const count930 = analyzedStocks.filter(s => s.timing.firstHitTime === '09:30 AM').length;
    const totalScore = analyzedStocks.reduce((acc, s) => acc + s.score, 0);

    return {
      total: analyzedStocks.length,
      earliest: times[0] || '09:15 AM',
      latest: times[times.length - 1] || '09:15 AM',
      avgScore: totalScore / analyzedStocks.length,
      count915,
      count930
    };
  }, [analyzedStocks]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl shadow-inner">
              <Target className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black text-white font-mono flex items-center gap-2">
                  100% Bullish Setup Scanner
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-emerald-400" />
                  {filteredStocks.length} Active
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Open = Low (≤0.20% Variance) + 12 Confluences with <strong className="text-amber-300">First Confluence Hit Time</strong> tracking
              </p>
            </div>
          </div>

          {/* Quick Timing Summary Badges */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Earliest Confluence Hit</span>
                <span className="font-mono font-black text-amber-300">{timingStats.earliest}</span>
              </div>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Avg Confluence Score</span>
                <span className="font-mono font-black text-emerald-300">{timingStats.avgScore.toFixed(1)} / 13</span>
              </div>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-400" />
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">09:15 AM Open Low</span>
                <span className="font-mono font-black text-blue-300">{timingStats.count915} Stocks</span>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Sort Controls Toolbar */}
        <div className="mt-4 pt-4 border-t border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative w-full md:w-72">
            <input
              type="text"
              placeholder="Search symbol or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-4 py-2 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-semibold hidden sm:inline">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 text-amber-300 font-mono text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="SCORE_DESC">Score (Highest First)</option>
                <option value="TIME_ASC">First Hit Time (Earliest First 09:15 AM ⬆)</option>
                <option value="TIME_DESC">First Hit Time (Latest First ⬇)</option>
                <option value="VARIANCE_ASC">Open=Low Variance (Lowest First)</option>
                <option value="PCT_DESC">% Gain (Highest First)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs Strip */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-2.5 rounded-2xl border border-slate-800/80">
        {/* Price Filters */}
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-2">Price:</span>
          <button
            onClick={() => setPriceFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 cursor-pointer ${
              priceFilter === 'ALL'
                ? 'bg-slate-700 text-white shadow-xs' 
                : 'bg-slate-950/60 text-slate-400 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <span>All Prices</span>
          </button>
          <button
            onClick={() => setPriceFilter('1000_TO_2500')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 cursor-pointer ${
              priceFilter === '1000_TO_2500'
                ? 'bg-emerald-600 text-white border-emerald-400 shadow-xs' 
                : 'bg-slate-950/60 text-slate-400 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <span>₹1000 - ₹2500</span>
          </button>
          <button
            onClick={() => setPriceFilter('ABOVE_2500')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 cursor-pointer ${
              priceFilter === 'ABOVE_2500'
                ? 'bg-emerald-600 text-white border-emerald-400 shadow-xs' 
                : 'bg-slate-950/60 text-slate-400 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <span>&gt; ₹2500</span>
          </button>
        </div>

        {/* First Confluence Hit Time Filters */}
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400/80 px-2 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-400" />
            Hit Time:
          </span>
          <button
            onClick={() => setTimeFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              timeFilter === 'ALL'
                ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                : 'bg-slate-950/60 text-slate-400 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            All Times
          </button>
          <button
            onClick={() => setTimeFilter('09:15')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
              timeFilter === '09:15'
                ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                : 'bg-slate-950/60 text-amber-300/80 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <span>🔔 09:15 AM</span>
            <span className="text-[10px] opacity-75 font-mono">({timingStats.count915})</span>
          </button>
          <button
            onClick={() => setTimeFilter('09:30')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
              timeFilter === '09:30'
                ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                : 'bg-slate-950/60 text-emerald-300/80 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <span>⚡ 09:30 AM</span>
            <span className="text-[10px] opacity-75 font-mono">({timingStats.count930})</span>
          </button>
          <button
            onClick={() => setTimeFilter('09:45_PLUS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              timeFilter === '09:45_PLUS'
                ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                : 'bg-slate-950/60 text-slate-400 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            🚀 Post-09:30
          </button>
        </div>
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredStocks.map(stock => {
          const isTimelineExpanded = expandedTimelines.has(stock.id);

          return (
            <div 
              key={stock.symbol}
              onClick={() => onSelectStockDetail(stock)}
              className="group bg-slate-900 rounded-2xl border border-emerald-500/20 hover:border-emerald-500/50 hover:shadow-[0_8px_30px_rgba(16,185,129,0.15)] transition-all cursor-pointer overflow-hidden flex flex-col"
            >
              {/* Card Header Top: First Confluence Hit Time Bar */}
              <div className="px-4 py-2.5 bg-gradient-to-r from-amber-950/40 via-slate-950 to-emerald-950/40 border-b border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="p-1 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[11px] text-slate-400 font-semibold">Recent Confluence Hit:</span>
                    <span className="text-xs font-black font-mono text-amber-300 tracking-wide">
                      {stock.timing.firstHitTime}
                    </span>
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${stock.timing.phaseBadgeClass}`}>
                  {stock.timing.phaseBadge}
                </span>
              </div>

              {/* Card Main Info Bar */}
              <div className="px-4 py-3 border-b border-emerald-500/10 bg-emerald-500/5 flex items-center justify-between">
                <div className="flex flex-col">
                  <h3 className="font-bold text-lg text-white font-mono flex items-center gap-2">
                    {stock.symbol}
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  </h3>
                  <span className="text-xs text-slate-400 truncate max-w-[170px]">{stock.companyName}</span>
                </div>
                <div className="px-2.5 py-1 rounded-lg text-xs font-black font-mono shadow-xs flex flex-col items-end bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                  <span className="text-white text-sm">₹{stock.closePrice?.toFixed(2)}</span>
                  <span>{stock.pctChange > 0 ? '+' : ''}{stock.pctChange.toFixed(2)}%</span>
                </div>
              </div>

              {/* First Confluence Specific Detail Pill */}
              <div className="px-4 py-2 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between text-xs gap-2">
                <div className="flex items-center gap-1.5 text-slate-300 min-w-0">
                  <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="text-[11px] text-slate-400 truncate">Trigger:</span>
                  <span className="text-[11px] font-semibold text-slate-200 truncate" title={stock.timing.firstHitTrigger}>
                    {stock.timing.firstHitTrigger}
                  </span>
                </div>
                <span className="font-mono text-[11px] font-bold text-emerald-400 shrink-0 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/60">
                  @ ₹{stock.timing.firstHitPrice.toFixed(2)}
                </span>
              </div>

              {/* Progress Bar / Confluence Score */}
              <div className="px-4 pt-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <span>Confluence Score</span>
                    <span className="text-[10px] text-emerald-400 font-normal">({Math.round((stock.score / 13) * 100)}% Pass)</span>
                  </span>
                  <span className="text-sm font-black text-emerald-400 font-mono">{stock.score}/13</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className={`h-1.5 rounded-full transition-all ${
                      stock.score >= 10 ? 'bg-emerald-400' : 'bg-emerald-500'
                    }`} 
                    style={{ width: `${(stock.score / 13) * 100}%` }}
                  />
                </div>
              </div>

              {/* Checklists */}
              <div className="p-4 flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5">
                  {stock.checks.map(check => (
                    <div 
                      key={check.id} 
                      className={`flex items-center justify-between py-1 px-1.5 rounded-lg border-b border-slate-800/40 last:border-0 ${
                        check.id === 'open_low' ? 'bg-amber-500/5 border border-amber-500/20' : ''
                      }`}
                    >
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        {check.met ? (
                          <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${check.id === 'open_low' ? 'text-amber-400' : 'text-emerald-500'}`} />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                        )}
                        <span className={`text-[11px] truncate ${check.met ? (check.id === 'open_low' ? 'text-amber-200 font-bold' : 'text-slate-300') : 'text-slate-500'}`} title={check.name}>
                          {check.name}
                        </span>
                      </div>
                      <span className={`text-[10px] font-mono shrink-0 ml-1.5 ${check.met ? (check.id === 'open_low' ? 'text-amber-300 font-bold' : 'text-emerald-400/80') : 'text-slate-600'}`}>
                        {check.value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Confluence Milestones Timeline Accordion Toggle */}
                {stock.timing.milestones.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-800/70">
                    <button
                      onClick={(e) => toggleTimeline(e, stock.id)}
                      className="w-full text-[11px] font-bold text-slate-400 hover:text-amber-300 flex items-center justify-between py-1 transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-amber-400" />
                        <span>Confluence Hit Timeline ({stock.timing.milestones.length} Steps)</span>
                      </span>
                      {isTimelineExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </button>

                    {isTimelineExpanded && (
                      <div className="mt-2 space-y-1.5 bg-slate-950/90 rounded-xl p-2.5 border border-slate-800/80">
                        {stock.timing.milestones.map((ms, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs">
                            <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded font-black shrink-0 ${
                              ms.isFirst 
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                                : 'bg-slate-800 text-slate-300'
                            }`}>
                              {ms.time}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className={`font-semibold text-[11px] ${ms.isFirst ? 'text-amber-200' : 'text-slate-200'}`}>
                                  {ms.name}
                                </span>
                                <span className="font-mono text-[10px] text-emerald-400 shrink-0">
                                  ₹{ms.price.toFixed(2)}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{ms.detail}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Card Footer Quick Actions */}
              <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectStockDetail(stock);
                  }}
                  className="text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>Analysis</span>
                  <ExternalLink className="w-3 h-3 text-emerald-400" />
                </button>

                <div className="flex items-center gap-1.5">
                  {onOpenPositionSizer && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenPositionSizer(stock);
                      }}
                      className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/60 flex items-center gap-1 cursor-pointer transition-colors"
                      title="Calculate Risk & Position Size"
                    >
                      <Calculator className="w-3 h-3" />
                      <span>Sizer</span>
                    </button>
                  )}

                  {onOpenRsiAnalyst && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenRsiAnalyst(stock);
                      }}
                      className="text-[11px] font-bold text-blue-400 hover:text-blue-300 px-2 py-1 rounded-lg bg-blue-950/60 hover:bg-blue-900/60 border border-blue-800/60 flex items-center gap-1 cursor-pointer transition-colors"
                      title="View 15m RSI Analyst Timeline"
                    >
                      <Activity className="w-3 h-3" />
                      <span>RSI</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredStocks.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-slate-500" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No Setups Found</h3>
          <p className="text-slate-400 max-w-md mx-auto">
            {searchTerm 
              ? `No stocks matching "${searchTerm}" meet the 100% Bullish criteria.`
              : timeFilter !== 'ALL'
              ? `No stocks found with First Confluence Hit Time matching the "${timeFilter}" filter.`
              : `No stocks currently meet the Open = Low (≤0.20% var) baseline requirement.`}
          </p>
        </div>
      )}
    </div>
  );
}

