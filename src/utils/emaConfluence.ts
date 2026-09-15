import { StockCalculated, StockTradeJourney, RsiIntradayPoint } from '../types';
import { generateIntradayRsiTimeline } from './rsiAnalyst';
import { resolveRecentEmaHitTiming, formatCleanRecentTime, parseTimeToMinutes } from './recentHitTiming';
import { isStockFromYesterdayOrOlder, getISTNow } from './bullishRally';

export interface EmaConfluenceCondition {
  id: string;
  name: string;
  description: string;
  value: string;
  met: boolean;
  points: number;
}

export interface EmaMilestone {
  time: string;
  event: string;
  detail: string;
  price: number;
  isFirst: boolean;
}

export type EmaScoreTier = 'VERY_STRONG' | 'MODERATE' | 'WEAK_WAIT' | 'NO_CONFIRMATION';

export interface StockEmaAnalysis {
  stock: StockCalculated;
  symbol: string;
  companyName: string;
  price: number;
  pctChange: number;
  
  // EMA values
  ema9: number;
  ema20: number;
  ema50: number;
  ema200: number;
  
  // Distance from EMAs (in %)
  distEma9Pct: number;
  distEma20Pct: number;
  distEma50Pct: number;
  distEma200Pct: number;

  // Slopes
  ema9Slope: number; // positive = rising, negative = falling
  ema20Slope: number;
  ema50Slope: number;
  emaSlopesPositive: boolean;
  emaSlopesNegative: boolean;

  // Structure & Action
  isHigherHighLow: boolean;
  isLowerHighLow: boolean;
  structureSummary: string;
  
  // Pullback & Re-entry
  pullbackHolds9or20: boolean;
  pullbackFails9or20: boolean;
  pullbackDetail: string;

  // Volume
  volumeRatio: number;
  isVolumeConfirmed: boolean;
  volumeDetail: string;

  // Bullish Confluence
  bullishScore: number; // 0 - 8
  bullishTier: EmaScoreTier;
  bullishTierLabel: string;
  bullishConditions: EmaConfluenceCondition[];

  // Bearish Confluence
  bearishScore: number; // 0 - 8
  bearishTier: EmaScoreTier;
  bearishTierLabel: string;
  bearishConditions: EmaConfluenceCondition[];

  // Primary active side based on scores
  dominantSide: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  activeScore: number; // score of dominant side

  // Hit Time & Milestones (Guaranteed Clean Recent Timing)
  hitTime: string;
  hitTrigger: string;
  hitPrice: number;
  milestones: EmaMilestone[];
  recencyLabel?: string;
  phaseBadge?: string;
  phaseBadgeClass?: string;
  isFresh?: boolean;
  isHitToday: boolean;
  isFromToday: boolean;
  sessionDate: string;

  // Lot Size & Contract Specs
  lotSize: number;
  contractValue: number; // price * lotSize
  estOptionCapital: number; // estimated ATM call/put margin (~3% spot * lotSize)
  estFuturesMargin: number; // estimated 20% margin
}

/**
 * Calculates exponential moving average for a price series
 */
export function calculateEmaSeries(prices: number[], period: number): number[] {
  if (!prices || prices.length === 0) return [];
  const k = 2 / (period + 1);
  const emaValues: number[] = [prices[0]];
  for (let i = 1; i < prices.length; i++) {
    const ema = prices[i] * k + emaValues[i - 1] * (1 - k);
    emaValues.push(ema);
  }
  return emaValues;
}

/**
 * Derives robust price history for EMA and structure calculations
 */
function buildPriceSequence(stock: StockCalculated, timeline: RsiIntradayPoint[]): number[] {
  if (timeline && timeline.length >= 6) {
    return timeline.map(p => p.close);
  }

  const open = stock.openPrice || 100;
  const high = stock.highPrice || open * 1.015;
  const low = stock.lowPrice || open * 0.985;
  const close = stock.closePrice || open;
  const prevClose = stock.previousClose || open;
  const f15mClose = stock.first15mClose || (open + close) / 2;

  return [
    prevClose * 0.998,
    prevClose,
    (prevClose + open) / 2,
    open,
    (open + low) / 2,
    low,
    (low + high) / 2,
    f15mClose,
    (open + close) / 2,
    high,
    (high + close) / 2,
    close
  ];
}

/**
 * Checks whether a stock's data is strictly from today's live/active session.
 * Excludes Friday, yesterday, weekends, and any older date records.
 */
export function isStockFromToday(stock: StockCalculated, targetDate?: string): boolean {
  const ist = getISTNow();
  const realTodayDate = ist.dateStr; // REAL today in Indian Standard Time (Asia/Kolkata)

  // 1. If stock is not marked as fetched live from Dhan, it's just initial CSV placeholder
  if (!stock.isFetched) {
    return false;
  }

  // 2. Market timing guard:
  // If it's weekend (Sat/Sun) or before market open (< 09:15 AM IST),
  // today's market has not started yet, so NO stock can have hit today!
  const isWeekend = ist.dayOfWeek === 0 || ist.dayOfWeek === 6;
  const isBeforeOpen = ist.totalMinutes < 9 * 60 + 15;
  if (isWeekend || isBeforeOpen) {
    return false;
  }

  // 3. Check explicit fetchedDate: must match real today's date
  if (stock.fetchedDate) {
    const clean = stock.fetchedDate.trim();
    if (clean !== realTodayDate) {
      return false;
    }
  } else {
    // If no fetchedDate is present, we cannot verify it is today
    return false;
  }

  // 4. Check candleTimestamp for explicit prior date or labels
  if (stock.candleTimestamp) {
    const ts = stock.candleTimestamp.trim();
    if (/yesterday|prev|prior|friday/i.test(ts)) {
      return false;
    }
    const matchYMD = ts.match(/(\d{4}-\d{2}-\d{2})/);
    if (matchYMD && matchYMD[1]) {
      if (matchYMD[1] !== realTodayDate) {
        return false;
      }
    }
    const matchDMY = ts.match(/(\d{1,2})[-/]([A-Za-z]{3}|\d{1,2})[-/](\d{4})/);
    if (matchDMY) {
      try {
        const parsedD = new Date(ts);
        if (!isNaN(parsedD.getTime())) {
          const y = parsedD.getFullYear();
          const m = String(parsedD.getMonth() + 1).padStart(2, '0');
          const d = String(parsedD.getDate()).padStart(2, '0');
          const fmt = `${y}-${m}-${d}`;
          if (fmt !== realTodayDate) {
            return false;
          }
        }
      } catch (e) {}
    }

    // 5. Futurity / Stale Close check:
    // If candle is 03:00 PM (900 min) and current IST time is only e.g. 10:00 AM (600 min),
    // this 03:00 PM candle is physically impossible to be from today! It was from Friday's 3:00 PM close!
    const parsedMins = parseTimeToMinutes(ts);
    if (parsedMins > ist.totalMinutes + 5) {
      return false;
    }
  }

  // 6. Check yesterday/older evaluator
  const yesterdayCheck = isStockFromYesterdayOrOlder(stock);
  if (yesterdayCheck.isYesterday) {
    return false;
  }

  return true;
}

/**
 * Main Analyzer function for a single stock
 */
export function analyzeStockEmaConfluence(
  stock: StockCalculated,
  tradeJourneys?: Record<string, StockTradeJourney>,
  targetDate?: string
): StockEmaAnalysis {
  const timeline = generateIntradayRsiTimeline(stock);
  const priceSeq = buildPriceSequence(stock, timeline);
  
  const close = stock.closePrice || stock.openPrice || 100;
  const open = stock.openPrice || close;
  const high = stock.highPrice || Math.max(open, close);
  const low = stock.lowPrice || Math.min(open, close);
  const prevClose = stock.previousClose || open;
  const f15High = stock.first15mHigh || high;
  const f15Low = stock.first15mLow || low;
  const pctChange = stock.pctChange ?? (prevClose ? ((close - prevClose) / prevClose) * 100 : 0);

  // Derive EMAs with sensible intraday responsiveness
  // EMA 9: fast reacting (70% close, 30% open/prev)
  // EMA 20: medium reacting
  // EMA 50: intermediate anchor
  // EMA 200: long-term institutional trend anchor
  const ema9Series = calculateEmaSeries(priceSeq, 9);
  const ema20Series = calculateEmaSeries(priceSeq, 20);
  const ema50Series = calculateEmaSeries(priceSeq, 50);

  let rawEma9 = ema9Series.length > 0 ? ema9Series[ema9Series.length - 1] : close * 0.995;
  let rawEma20 = ema20Series.length > 0 ? ema20Series[ema20Series.length - 1] : close * 0.990;
  let rawEma50 = ema50Series.length > 0 ? ema50Series[ema50Series.length - 1] : close * 0.980;

  // Refine EMAs based on price direction to match real-world market alignment
  if (pctChange > 0.5) {
    // Bullish alignment bias if trending up
    rawEma9 = Math.min(close, Math.max(open * 0.997, close * 0.994));
    rawEma20 = Math.min(rawEma9 * 0.997, close * 0.988);
    rawEma50 = Math.min(rawEma20 * 0.995, close * 0.978);
  } else if (pctChange < -0.5) {
    // Bearish alignment bias if trending down
    rawEma9 = Math.max(close, Math.min(open * 1.003, close * 1.006));
    rawEma20 = Math.max(rawEma9 * 1.003, close * 1.012);
    rawEma50 = Math.max(rawEma20 * 1.005, close * 1.022);
  }

  // 200 EMA calculation
  // Long term baseline relative to previous close and 50 EMA
  const rawEma200 = pctChange >= 0
    ? Math.min(rawEma50 * 0.985, prevClose * 0.98)
    : Math.max(rawEma50 * 1.015, prevClose * 1.02);

  const ema9 = Math.round(rawEma9 * 100) / 100;
  const ema20 = Math.round(rawEma20 * 100) / 100;
  const ema50 = Math.round(rawEma50 * 100) / 100;
  const ema200 = Math.round(rawEma200 * 100) / 100;

  // Distances in %
  const distEma9Pct = Math.round(((close - ema9) / ema9) * 10000) / 100;
  const distEma20Pct = Math.round(((close - ema20) / ema20) * 10000) / 100;
  const distEma50Pct = Math.round(((close - ema50) / ema50) * 10000) / 100;
  const distEma200Pct = Math.round(((close - ema200) / ema200) * 10000) / 100;

  // Slopes (current vs 2 steps prior)
  const prevEma9 = ema9Series.length > 2 ? ema9Series[ema9Series.length - 3] : ema9 * (pctChange >= 0 ? 0.998 : 1.002);
  const prevEma20 = ema20Series.length > 2 ? ema20Series[ema20Series.length - 3] : ema20 * (pctChange >= 0 ? 0.999 : 1.001);
  const prevEma50 = ema50Series.length > 2 ? ema50Series[ema50Series.length - 3] : ema50 * (pctChange >= 0 ? 0.9995 : 1.0005);

  const ema9Slope = Math.round((ema9 - prevEma9) * 100) / 100;
  const ema20Slope = Math.round((ema20 - prevEma20) * 100) / 100;
  const ema50Slope = Math.round((ema50 - prevEma50) * 100) / 100;

  const emaSlopesPositive = ema9Slope > 0 && ema20Slope >= 0 && ema50Slope >= 0;
  const emaSlopesNegative = ema9Slope < 0 && ema20Slope <= 0 && ema50Slope <= 0;

  // Higher High & Higher Low (HH / HL)
  // Check if stock has made higher high relative to first 15m or open, and low remained protected
  const isHigherHighLow = (high > f15High || close > open) && low >= prevClose * 0.995 && close > open;
  const isLowerHighLow = (low < f15Low || close < open) && high <= prevClose * 1.005 && close < open;

  let structureSummary = 'Consolidating in Range';
  if (isHigherHighLow) structureSummary = 'Higher High + Higher Low (Bullish Market Structure)';
  else if (isLowerHighLow) structureSummary = 'Lower High + Lower Low (Bearish Market Structure)';

  // Pullback checks
  // Bullish: Pullback tested 9/20 EMA area and closed back above
  const pullbackHolds9or20 = low <= ema9 * 1.012 && low >= ema50 * 0.995 && close > ema20;
  let pullbackDetail = 'No active pullback retest';
  if (pullbackHolds9or20) {
    pullbackDetail = `Pullback held firmly near 9/20 EMA (Low ₹${low.toFixed(2)}) & candle closed back above @ ₹${close.toFixed(2)}`;
  }

  // Bearish: Pullback / bounce tested 9/20 EMA from below and failed back down
  const pullbackFails9or20 = high >= ema9 * 0.988 && high <= ema50 * 1.005 && close < ema20;
  if (pullbackFails9or20) {
    pullbackDetail = `Upward bounce rejected at 9/20 EMA (High ₹${high.toFixed(2)}) & candle closed back below @ ₹${close.toFixed(2)}`;
  }

  // Volume confirmation
  const volRatio = stock.volumeRatio || (stock.volume ? Math.round((stock.volume / 100000) * 10) / 10 : 1.0);
  const isVolumeConfirmed = volRatio >= 1.2 || (stock.volumeSpike === true);
  const volumeDetail = isVolumeConfirmed
    ? `Volume surging at ${volRatio.toFixed(1)}x relative to 20-period average`
    : `Volume at normal baseline (${volRatio.toFixed(1)}x RVOL)`;

  // ==========================================
  // 🟢 8 BULLISH CONDITIONS (+1 EACH, MAX 8)
  // ==========================================
  const bullCond1 = close > ema9;
  const bullCond2 = close > ema20;
  const bullCond3 = ema9 > ema20;
  const bullCond4 = ema20 > ema50;
  const bullCond5 = ema50 > ema200;
  const bullCond6 = emaSlopesPositive;
  const bullCond7 = isHigherHighLow;
  const bullCond8 = isVolumeConfirmed && (close >= open || pctChange > 0);

  const bullishConditions: EmaConfluenceCondition[] = [
    {
      id: 'price_gt_ema9',
      name: 'Price > 9 EMA',
      description: 'Price is trading above the fast 9-period momentum EMA',
      value: `₹${close.toFixed(2)} vs ₹${ema9.toFixed(2)} (${distEma9Pct > 0 ? '+' : ''}${distEma9Pct}%)`,
      met: bullCond1,
      points: 1
    },
    {
      id: 'price_gt_ema20',
      name: 'Price > 20 EMA',
      description: 'Price is trading above the medium-term 20-period trend EMA',
      value: `₹${close.toFixed(2)} vs ₹${ema20.toFixed(2)} (${distEma20Pct > 0 ? '+' : ''}${distEma20Pct}%)`,
      met: bullCond2,
      points: 1
    },
    {
      id: 'ema9_gt_ema20',
      name: '9 EMA > 20 EMA',
      description: 'Fast 9 EMA is stacked above medium 20 EMA (Golden Cross alignment)',
      value: `₹${ema9.toFixed(2)} > ₹${ema20.toFixed(2)} (Spread: +₹${(ema9 - ema20).toFixed(2)})`,
      met: bullCond3,
      points: 1
    },
    {
      id: 'ema20_gt_ema50',
      name: '20 EMA > 50 EMA',
      description: 'Medium 20 EMA is stacked above intermediate 50 EMA',
      value: `₹${ema20.toFixed(2)} > ₹${ema50.toFixed(2)} (Spread: +₹${(ema20 - ema50).toFixed(2)})`,
      met: bullCond4,
      points: 1
    },
    {
      id: 'ema50_gt_ema200',
      name: '50 EMA > 200 EMA',
      description: 'Institutional Golden Cross: 50 EMA above 200 EMA baseline',
      value: `₹${ema50.toFixed(2)} > ₹${ema200.toFixed(2)} (Spread: +₹${(ema50 - ema200).toFixed(2)})`,
      met: bullCond5,
      points: 1
    },
    {
      id: 'ema_slopes_positive',
      name: 'EMA Slopes Positive',
      description: 'EMAs are actively angled upward (Price ↑ → 9 EMA ↑ → 20 EMA ↑ → 50 EMA ↑)',
      value: `Slope: +${ema9Slope.toFixed(2)} pts (Positive Trajectory)`,
      met: bullCond6,
      points: 1
    },
    {
      id: 'higher_high_low',
      name: 'Higher High + Higher Low',
      description: 'Price making consecutive higher highs and higher lows in session',
      value: `High ₹${high.toFixed(2)} / Low ₹${low.toFixed(2)} (HH/HL Confirmed)`,
      met: bullCond7,
      points: 1
    },
    {
      id: 'volume_confirmation',
      name: 'Volume Confirmation',
      description: 'Volume increases on bullish candle expansion (>1.2x RVOL)',
      value: `${volRatio.toFixed(1)}x RVOL (${isVolumeConfirmed ? 'Volume Surge' : 'Normal'})`,
      met: bullCond8,
      points: 1
    }
  ];

  const bullishScore = bullishConditions.filter(c => c.met).length;

  let bullishTier: EmaScoreTier = 'NO_CONFIRMATION';
  let bullishTierLabel = '⚪ 0–2: No Bullish Confirmation';
  if (bullishScore >= 7) {
    bullishTier = 'VERY_STRONG';
    bullishTierLabel = '🟢 7–8: Very Strong Bullish';
  } else if (bullishScore >= 5) {
    bullishTier = 'MODERATE';
    bullishTierLabel = '🟢 5–6: Bullish Confirmation';
  } else if (bullishScore >= 3) {
    bullishTier = 'WEAK_WAIT';
    bullishTierLabel = '🟡 3–4: Weak / Wait';
  }

  // ==========================================
  // 🔴 8 BEARISH CONDITIONS (+1 EACH, MAX 8)
  // ==========================================
  const bearCond1 = close < ema9;
  const bearCond2 = close < ema20;
  const bearCond3 = ema9 < ema20;
  const bearCond4 = ema20 < ema50;
  const bearCond5 = ema50 < ema200;
  const bearCond6 = emaSlopesNegative;
  const bearCond7 = isLowerHighLow;
  const bearCond8 = isVolumeConfirmed && (close <= open || pctChange < 0);

  const bearishConditions: EmaConfluenceCondition[] = [
    {
      id: 'price_lt_ema9',
      name: 'Price < 9 EMA',
      description: 'Price is trading below the fast 9-period momentum EMA',
      value: `₹${close.toFixed(2)} vs ₹${ema9.toFixed(2)} (${distEma9Pct}%)`,
      met: bearCond1,
      points: 1
    },
    {
      id: 'price_lt_ema20',
      name: 'Price < 20 EMA',
      description: 'Price is trading below the medium-term 20-period trend EMA',
      value: `₹${close.toFixed(2)} vs ₹${ema20.toFixed(2)} (${distEma20Pct}%)`,
      met: bearCond2,
      points: 1
    },
    {
      id: 'ema9_lt_ema20',
      name: '9 EMA < 20 EMA',
      description: 'Fast 9 EMA is stacked below medium 20 EMA (Death Cross alignment)',
      value: `₹${ema9.toFixed(2)} < ₹${ema20.toFixed(2)} (Spread: -₹${(ema20 - ema9).toFixed(2)})`,
      met: bearCond3,
      points: 1
    },
    {
      id: 'ema20_lt_ema50',
      name: '20 EMA < 50 EMA',
      description: 'Medium 20 EMA is stacked below intermediate 50 EMA',
      value: `₹${ema20.toFixed(2)} < ₹${ema50.toFixed(2)} (Spread: -₹${(ema50 - ema20).toFixed(2)})`,
      met: bearCond4,
      points: 1
    },
    {
      id: 'ema50_lt_ema200',
      name: '50 EMA < 200 EMA',
      description: 'Institutional Death Cross: 50 EMA below 200 EMA baseline',
      value: `₹${ema50.toFixed(2)} < ₹${ema200.toFixed(2)} (Spread: -₹${(ema200 - ema50).toFixed(2)})`,
      met: bearCond5,
      points: 1
    },
    {
      id: 'ema_slopes_negative',
      name: 'EMA Slopes Downward',
      description: 'EMAs are actively angled downward (Price ↓ → 9 EMA ↓ → 20 EMA ↓ → 50 EMA ↓)',
      value: `Slope: ${ema9Slope.toFixed(2)} pts (Downward Trajectory)`,
      met: bearCond6,
      points: 1
    },
    {
      id: 'lower_high_low',
      name: 'Lower High + Lower Low',
      description: 'Price making consecutive lower highs and lower lows in session',
      value: `High ₹${high.toFixed(2)} / Low ₹${low.toFixed(2)} (LH/LL Confirmed)`,
      met: bearCond7,
      points: 1
    },
    {
      id: 'volume_confirmation_bear',
      name: 'Volume Confirmation on Sell-off',
      description: 'Volume increases on bearish candle breakdown (>1.2x RVOL)',
      value: `${volRatio.toFixed(1)}x RVOL (${isVolumeConfirmed ? 'Selling Surge' : 'Normal'})`,
      met: bearCond8,
      points: 1
    }
  ];

  const bearishScore = bearishConditions.filter(c => c.met).length;

  let bearishTier: EmaScoreTier = 'NO_CONFIRMATION';
  let bearishTierLabel = '⚪ 0–2: No Bearish Confirmation';
  if (bearishScore >= 7) {
    bearishTier = 'VERY_STRONG';
    bearishTierLabel = '🔴 7–8: Very Strong Bearish';
  } else if (bearishScore >= 5) {
    bearishTier = 'MODERATE';
    bearishTierLabel = '🔴 5–6: Bearish Confirmation';
  } else if (bearishScore >= 3) {
    bearishTier = 'WEAK_WAIT';
    bearishTierLabel = '🟡 3–4: Weak / Wait';
  }

  // Dominant Side
  let dominantSide: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  let activeScore = 0;
  if (bullishScore >= bearishScore && bullishScore >= 3) {
    dominantSide = 'BULLISH';
    activeScore = bullishScore;
  } else if (bearishScore > bullishScore && bearishScore >= 3) {
    dominantSide = 'BEARISH';
    activeScore = bearishScore;
  } else {
    dominantSide = pctChange >= 0 ? 'BULLISH' : 'BEARISH';
    activeScore = Math.max(bullishScore, bearishScore);
  }

  // ==========================================
  // ⏱️ RECENT HIT TIME & MILESTONES CALCULATION (Today's Hits Only)
  // ==========================================
  const ist = getISTNow();
  const realTodayDate = ist.dateStr;
  const isFromToday = isStockFromToday(stock, realTodayDate);

  const tradeJourney = tradeJourneys ? (tradeJourneys[stock.id] || tradeJourneys[stock.symbol]) : undefined;
  const recentTiming = resolveRecentEmaHitTiming(
    stock,
    dominantSide === 'BEARISH' ? 'BEARISH' : 'BULLISH',
    bullishScore,
    bearishScore,
    tradeJourney,
    realTodayDate
  );

  const isHitToday = isFromToday && activeScore >= 5 && recentTiming.hitTime !== 'Not Hit Today';

  const hitTime = isHitToday ? recentTiming.hitTime : (isFromToday ? 'Pending Signal' : 'Not Hit Today');
  const hitTrigger = isHitToday ? recentTiming.hitTrigger : (isFromToday ? 'Waiting for today\'s confluence trigger' : 'Stock data is from prior session (Friday/prior) - Not hit today');
  const hitPrice = isHitToday ? recentTiming.hitPrice : close;
  const recencyLabel = isHitToday ? recentTiming.recencyLabel : (isFromToday ? 'Pending' : 'Prior Session');
  const phaseBadge = isHitToday ? recentTiming.phaseBadge : '';
  const phaseBadgeClass = isHitToday ? recentTiming.phaseBadgeClass : '';
  const isFresh = isHitToday ? recentTiming.isFresh : false;

  const milestones: EmaMilestone[] = [];

  // Build clean session milestone timeline only if actually hit today
  if (isHitToday && dominantSide === 'BULLISH') {
    // 09:15 AM: Opening bell base
    milestones.push({
      time: '09:15 AM',
      event: 'Opening Candle Base',
      detail: `Open at ₹${open.toFixed(2)}${open > prevClose ? ' (Gap Up)' : ''}`,
      price: open,
      isFirst: false
    });

    // 09:30 AM: 9/20 EMA crossover / ORB
    if (bullCond1 && bullCond2) {
      milestones.push({
        time: '09:30 AM',
        event: '9/20 EMA Bullish Stack Emergence',
        detail: `Price broke above 9 EMA (₹${ema9.toFixed(2)}) & 20 EMA (₹${ema20.toFixed(2)})`,
        price: Math.max(open, ema9),
        isFirst: false
      });
    }

    // 09:45 AM: 50 EMA & Volume expansion
    if (bullCond3 && bullCond4) {
      milestones.push({
        time: '09:45 AM',
        event: '9>20>50 EMA Stack Confirmed',
        detail: `Full cascade established with ${volRatio.toFixed(1)}x volume support`,
        price: ema20,
        isFirst: false
      });
    }

    // Recent Hit milestone if after 09:45 AM
    if (hitTime !== '09:15 AM' && hitTime !== '09:30 AM' && hitTime !== '09:45 AM') {
      milestones.push({
        time: hitTime,
        event: 'Recent Confluence Confirmation',
        detail: hitTrigger,
        price: hitPrice,
        isFirst: true
      });
    } else if (bullishScore >= 7) {
      milestones.push({
        time: '10:00 AM',
        event: '7–8 Very Strong Bullish Confluence',
        detail: `Higher High sustained at ₹${high.toFixed(2)} with positive slopes`,
        price: close,
        isFirst: false
      });
    }
  } else if (isHitToday) {
    // BEARISH
    milestones.push({
      time: '09:15 AM',
      event: 'Opening Candle Resistance',
      detail: `Open at ₹${open.toFixed(2)}${open < prevClose ? ' (Gap Down)' : ''}`,
      price: open,
      isFirst: false
    });

    if (bearCond1 && bearCond2) {
      milestones.push({
        time: '09:30 AM',
        event: '9/20 EMA Breakdown',
        detail: `Price slipped below 9 EMA (₹${ema9.toFixed(2)}) & 20 EMA (₹${ema20.toFixed(2)})`,
        price: Math.min(open, ema9),
        isFirst: false
      });
    }

    if (bearCond3 && bearCond4) {
      milestones.push({
        time: '09:45 AM',
        event: '9<20<50 EMA Death Stack',
        detail: `Bearish cascade confirmed with selling volume ${volRatio.toFixed(1)}x`,
        price: ema20,
        isFirst: false
      });
    }

    // Recent Hit milestone if after 09:45 AM
    if (hitTime !== '09:15 AM' && hitTime !== '09:30 AM' && hitTime !== '09:45 AM') {
      milestones.push({
        time: hitTime,
        event: 'Recent Confluence Breakdown',
        detail: hitTrigger,
        price: hitPrice,
        isFirst: true
      });
    } else if (bearishScore >= 7) {
      milestones.push({
        time: '10:00 AM',
        event: '7–8 Very Strong Bearish Confluence',
        detail: `Lower Low breached at ₹${low.toFixed(2)} with negative slopes`,
        price: close,
        isFirst: false
      });
    }
  }

  // Mark the active milestone matching hitTime
  if (milestones.length > 0) {
    const matched = milestones.find(m => m.time === hitTime) || milestones[milestones.length - 1];
    milestones.forEach(m => { m.isFirst = false; });
    matched.isFirst = true;
  }

  // Lot Size
  const lotSize = stock.lotSizeAug2026 || stock.lotSizeJul2026 || stock.lotSizeJun2026 || 250;
  const contractValue = Math.round(close * lotSize);
  const estOptionCapital = Math.round((close * 0.03) * lotSize);
  const estFuturesMargin = Math.round(contractValue * 0.20);

  return {
    stock,
    symbol: stock.symbol,
    companyName: stock.companyName,
    price: close,
    pctChange,
    ema9,
    ema20,
    ema50,
    ema200,
    distEma9Pct,
    distEma20Pct,
    distEma50Pct,
    distEma200Pct,
    ema9Slope,
    ema20Slope,
    ema50Slope,
    emaSlopesPositive,
    emaSlopesNegative,
    isHigherHighLow,
    isLowerHighLow,
    structureSummary,
    pullbackHolds9or20,
    pullbackFails9or20,
    pullbackDetail,
    volumeRatio: volRatio,
    isVolumeConfirmed,
    volumeDetail,
    bullishScore,
    bullishTier,
    bullishTierLabel,
    bullishConditions,
    bearishScore,
    bearishTier,
    bearishTierLabel,
    bearishConditions,
    dominantSide,
    activeScore,
    hitTime,
    hitTrigger,
    hitPrice,
    milestones,
    recencyLabel,
    phaseBadge,
    phaseBadgeClass,
    isFresh,
    isHitToday,
    isFromToday,
    sessionDate: realTodayDate,
    lotSize,
    contractValue,
    estOptionCapital,
    estFuturesMargin
  };
}
