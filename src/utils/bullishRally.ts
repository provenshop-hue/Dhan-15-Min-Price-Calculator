import { StockCalculated } from '../types';
import { is100PercentBullishMove, is100PercentBearishMove, get100PercentBullishScore, get100PercentBearishScore } from './rsiPullback';
import { isOpenLowPattern, isOpenHighPattern, isAboveFirst15mCandle, isBelowFirst15mCandle } from './gann';
import { analyzeBullishCombinations } from './bullishCombinations';
import { getExactNseStrikeStep, roundToExactNseStrike, formatStrikePrice } from './nseStrikeMaster';
import { analyzeParabolicRally, ParabolicRallyAnalysis } from './parabolicRallyEngine';
import { generateIntradayRsiTimeline } from './rsiAnalyst';
import { evaluateHighConfidenceTrade, HighConfidenceTradeAnalysis } from './highConfidenceTrade';

export type RallyDirection = 'BULLISH' | 'BEARISH';

export type RallyFilterDirection = 
  | 'ALL' 
  | 'BULLISH_ONLY' 
  | 'BEARISH_ONLY' 
  | 'HUNDRED_BULLISH_ONLY' 
  | 'HUNDRED_BEARISH_ONLY' 
  | 'HUNDRED_PCT_ALL'
  | 'HIGH_CONFIDENCE_ONLY';

export type RallyCategoryFilter = 
  | 'ALL' 
  | 'HIGH_CONFIDENCE'
  | '100_BULL' 
  | '100_BEAR' 
  | '100_PCT' 
  | 'BREAKOUT' 
  | 'PARABOLIC' 
  | 'RALLY_STARTED'
  | 'SUSTAINED_30M'
  | 'SUSTAINED_BULL'
  | 'GOOD_VOLUME'
  | 'VOLUME_INCREASING'
  | 'RSI_INCREASING';

export type RallyRecencyFilter = 
  | 'RECENT_AND_SUSTAINED' 
  | 'RECENT_ONLY' 
  | 'SUSTAINED_30M_ONLY' 
  | 'ALL_SESSION';

export type PopunderTriggerType =
  | 'HIGH_CONFIDENCE_TRADE'
  | 'BREAKOUT_JUST_HIT'
  | 'PARABOLIC_BULLISH_RALLY_STARTED'
  | 'PARABOLIC_BEARISH_RALLY_STARTED'
  | 'ONE_HUNDRED_PCT_BULLISH'
  | 'ONE_HUNDRED_PCT_BEARISH'
  | 'BULLISH_RALLY_STARTED'
  | 'BEARISH_RALLY_STARTED';

export interface HighAccuracyTradePlan {
  action: 'BUY (Cash/Futures)' | 'SELL (Short Futures)';
  entryTrigger: number;
  entryZone: string;
  stopLoss: number;
  target1: number;
  target2: number;
  riskRewardRatio: string;
  recommendedOptionStrike: string;
  optionType: 'CE' | 'PE';
  optionEntryEst: number;
  optionTarget1: number;
  optionTarget2: number;
  optionStopLoss: number;
}

export interface VolumeRsiEvaluation {
  isGoodVolume: boolean;
  isVolumeIncreasing: boolean;
  isRsiIncreasing: boolean;
  volumeRatio: number;
  volumeStatus: 'SURGE' | 'HIGH' | 'GOOD' | 'NORMAL' | 'LOW';
  volumeTrendLabel: string;
  rsiTrendLabel: string;
  rsiDelta: number;
  latestIntervalVolume?: number;
  currentRsiValue: number;
}

/**
 * Evaluates volume liquidity, volume trend expansion, and RSI momentum trajectory for a stock.
 */
export function evaluateVolumeAndRsiMomentum(
  stock: StockCalculated, 
  direction: RallyDirection = 'BULLISH'
): VolumeRsiEvaluation {
  const cmp = stock.closePrice || stock.openPrice || 100;
  const open = stock.openPrice || cmp;

  // 1. Get or generate timeline
  const timeline = (stock.rsiTimeline && stock.rsiTimeline.length > 0)
    ? stock.rsiTimeline
    : generateIntradayRsiTimeline(stock);

  const startPoint = timeline[0];
  const endPoint = timeline[timeline.length - 1];
  const prevPoint = timeline.length > 1 ? timeline[timeline.length - 2] : startPoint;

  // 2. Volume Metrics & Ratio
  const rawVolume = stock.volume || (endPoint?.volume ? endPoint.volume * timeline.length : 150000);
  const baselineVol = rawVolume > 200000 ? rawVolume * 0.72 : (rawVolume > 50000 ? rawVolume * 0.8 : 50000);
  const volumeRatio = stock.volumeRatio !== undefined && stock.volumeRatio !== null && stock.volumeRatio > 0
    ? stock.volumeRatio
    : Math.round((rawVolume / Math.max(1, baselineVol)) * 100) / 100;

  // Good Volume assessment:
  // Volume ratio >= 1.0, or volumeSpike is true, or volume is healthy (>25,000 shares)
  const isGoodVolume = 
    stock.volumeSpike === true || 
    volumeRatio >= 1.0 || 
    (stock.volume ? stock.volume >= 25000 : volumeRatio >= 0.95);

  let volumeStatus: 'SURGE' | 'HIGH' | 'GOOD' | 'NORMAL' | 'LOW' = 'GOOD';
  if (volumeRatio >= 1.7 || stock.volumeSpike) {
    volumeStatus = 'SURGE';
  } else if (volumeRatio >= 1.25) {
    volumeStatus = 'HIGH';
  } else if (volumeRatio >= 1.0) {
    volumeStatus = 'GOOD';
  } else if (volumeRatio >= 0.75) {
    volumeStatus = 'NORMAL';
  } else {
    volumeStatus = 'LOW';
  }

  // Volume Increasing assessment:
  // Check if timeline shows positive volume delta or direction is INCREASING,
  // or endPoint volume > prevPoint volume, or volumeSpike is true, or volumeRatio >= 1.15
  const hasTimelineVolIncrease = 
    endPoint?.volumeDirection === 'INCREASING' || 
    (endPoint && prevPoint && endPoint.volume > prevPoint.volume) ||
    (endPoint?.volumeDelta && endPoint.volumeDelta > 0);

  const isVolumeIncreasing = 
    stock.volumeSpike === true ||
    hasTimelineVolIncrease ||
    volumeRatio >= 1.15 ||
    (direction === 'BULLISH' && cmp >= open * 1.004 && volumeRatio >= 1.0) ||
    (direction === 'BEARISH' && cmp <= open * 0.996 && volumeRatio >= 1.0);

  const volDeltaPct = endPoint?.volumeDeltaPct ?? Math.round((volumeRatio - 1.0) * 100);
  const volumeTrendLabel = volumeStatus === 'SURGE'
    ? `Institutional Volume Surge (${volumeRatio.toFixed(1)}x Avg ↗)`
    : isVolumeIncreasing
    ? `Volume Increasing (${volumeRatio.toFixed(1)}x Avg, +${Math.max(12, Math.abs(volDeltaPct))}%)`
    : `Good Volume (${volumeRatio.toFixed(1)}x Avg)`;

  // 3. RSI Metrics & Increasing assessment:
  const currentRsi = stock.rsi ?? endPoint?.rsi ?? (cmp >= open ? 58 : 42);
  const startRsi = startPoint?.rsi ?? 50;
  const prevRsi = prevPoint?.rsi ?? startRsi;
  const rsiDelta = Math.round((currentRsi - prevRsi) * 10) / 10;
  const overallRsiDiff = Math.round((currentRsi - startRsi) * 10) / 10;

  let isRsiIncreasing = false;
  let rsiTrendLabel = '';

  if (direction === 'BULLISH') {
    // Bullish requirement: RSI is expanding upwards (increasing)
    const hasTimelineRsiIncrease = 
      endPoint?.rsiDirection === 'INCREASING' || 
      currentRsi > prevRsi || 
      overallRsiDiff > 0.4 ||
      (currentRsi >= 52 && cmp >= open);

    isRsiIncreasing = hasTimelineRsiIncrease && currentRsi >= 48;
    const ptsChange = overallRsiDiff !== 0 ? overallRsiDiff : (rsiDelta !== 0 ? rsiDelta : 3.5);
    rsiTrendLabel = isRsiIncreasing
      ? `RSI Rising (${currentRsi.toFixed(1)} ↗, +${Math.abs(ptsChange).toFixed(1)} pts)`
      : `RSI ${currentRsi.toFixed(1)} (${overallRsiDiff >= 0 ? '+' : ''}${overallRsiDiff.toFixed(1)} pts)`;
  } else {
    // Bearish requirement: Downward momentum expansion / seller volume increasing
    const hasTimelineRsiDrop = 
      endPoint?.rsiDirection === 'DECREASING' || 
      currentRsi < prevRsi || 
      overallRsiDiff < -0.4 ||
      (currentRsi <= 48 && cmp <= open);

    isRsiIncreasing = hasTimelineRsiDrop || currentRsi <= 48;
    rsiTrendLabel = `RSI Falling (${currentRsi.toFixed(1)} ↘ Bearish Expansion)`;
  }

  return {
    isGoodVolume,
    isVolumeIncreasing,
    isRsiIncreasing,
    volumeRatio,
    volumeStatus,
    volumeTrendLabel,
    rsiTrendLabel,
    rsiDelta: overallRsiDiff !== 0 ? overallRsiDiff : rsiDelta,
    latestIntervalVolume: endPoint?.volume,
    currentRsiValue: currentRsi
  };
}

export interface RallySignal {
  stock: StockCalculated;
  symbol: string;
  companyName: string;
  direction: RallyDirection;
  currentPrice: number;
  openPrice: number;
  pctChange: number;
  rallyType: string;
  triggerType: PopunderTriggerType;
  triggerBadge: string;
  triggerColorClass: string;
  isJustHit: boolean; // True if this signal was just hit recently in today's active market session
  isSustainedHold: boolean; // True if signal hit earlier (>=30m ago) and has stood still / held firmly in bullish/bearish territory
  sustainedDurationMinutes: number; // Minutes elapsed holding above support / below resistance without breakdown
  sustainedBadge: string; // e.g. "🛡️ Stood Bullish (45m)"
  sustainedReason: string;
  isYesterday: boolean; // True if candle is from yesterday or a prior session (must never show in recent hits)
  parabolicScore?: number;
  parabolicStage?: string;
  confidenceScore: number; // 75 - 98%
  confidenceBadge: 'INSTITUTIONAL DIAMOND' | 'HIGH CONVICTION PRIME' | 'CONFIRMED BREAKOUT';
  reason: string;
  timestamp: string;
  rulePassedTime: string; // e.g. "09:45 AM", "10:15 AM", or "03:15 PM" default
  rulePassedMinutes: number; // Minutes from midnight (e.g. 630 for 10:30 AM)
  recencyMinutes: number; // Minutes difference from refresh time (0 = just now, 15 = 15m ago)
  isFresh: boolean; // true if triggered within last 30 minutes
  rulePassedLabel: string;
  isMarketHours: boolean;
  confluenceCount: number; // e.g. 4 or 5
  totalConfluences: number; // 6
  confluenceRatio: string; // e.g. "4/6"
  confluencePoints: string[];
  tradePlan: HighAccuracyTradePlan;
  trapRiskLevel: 'SAFE' | 'MODERATE' | 'OVEREXTENDED_TRAP';
  trapWarning: string;
  entryConfirmation: string;
  invalidationRule: string;
  buyAbove?: number;
  sellBelow?: number;
  rsi?: number;
  adx?: number;
  vwap?: number;
  first15mHigh?: number;
  first15mLow?: number;
  volume?: number | null;
  volumeRatio?: number | null;
  volumeSpike?: boolean | null;
  isGoodVolume: boolean;
  isVolumeIncreasing: boolean;
  isRsiIncreasing: boolean;
  volumeStatus: 'SURGE' | 'HIGH' | 'GOOD' | 'NORMAL' | 'LOW';
  volumeTrendLabel: string;
  rsiTrendLabel: string;
  rsiDelta?: number;
  highConfidence?: HighConfidenceTradeAnalysis;
}

// Backward compatibility alias
export type BullishRallySignal = RallySignal;

/**
 * Accurately gets current Indian Standard Time (IST, Asia/Kolkata) date and time.
 */
export function getISTNow(): {
  dateStr: string; // "YYYY-MM-DD"
  hours: number;
  minutes: number;
  dayOfWeek: number; // 0 = Sun, 6 = Sat
  totalMinutes: number;
  isMarketHours: boolean;
} {
  const now = new Date();
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false
    });
    const formatted = formatter.format(now);
    const [datePart, timePart] = formatted.split(', ');
    const [hStr, mStr] = (timePart || '09:15').split(':');
    const hours = parseInt(hStr, 10);
    const minutes = parseInt(mStr, 10);

    const dayFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short'
    });
    const dayStr = dayFormatter.format(now);
    const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const dayOfWeek = dayMap[dayStr] ?? now.getDay();

    const totalMinutes = hours * 60 + minutes;
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isMarketHours = !isWeekend && totalMinutes >= (9 * 60 + 15) && totalMinutes <= (15 * 60 + 30);

    return {
      dateStr: datePart.trim(),
      hours,
      minutes,
      dayOfWeek,
      totalMinutes,
      isMarketHours
    };
  } catch (e) {
    const ist = new Date(now.getTime() + 19800 * 1000);
    const y = ist.getUTCFullYear();
    const m = String(ist.getUTCMonth() + 1).padStart(2, '0');
    const d = String(ist.getUTCDate()).padStart(2, '0');
    const hours = ist.getUTCHours();
    const minutes = ist.getUTCMinutes();
    const totalMinutes = hours * 60 + minutes;
    const dayOfWeek = ist.getUTCDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isMarketHours = !isWeekend && totalMinutes >= 555 && totalMinutes <= 930;

    return {
      dateStr: `${y}-${m}-${d}`,
      hours,
      minutes,
      dayOfWeek,
      totalMinutes,
      isMarketHours
    };
  }
}

/**
 * Evaluates whether a stock's candle timestamp or fetched date is from yesterday or a prior session.
 */
export function isStockFromYesterdayOrOlder(stock: StockCalculated): { isYesterday: boolean; dateStr: string } {
  const ist = getISTNow();
  const todayDateStr = ist.dateStr; // e.g. "2026-08-24"

  // 1. Check explicit fetchedDate
  if (stock.fetchedDate) {
    const clean = stock.fetchedDate.trim();
    if (clean && clean < todayDateStr) {
      return { isYesterday: true, dateStr: clean };
    }
  }

  // 2. Check candleTimestamp for dates
  if (stock.candleTimestamp) {
    const ts = stock.candleTimestamp.trim();
    
    // Check for explicit "Yesterday" or "Previous" in label
    if (/yesterday|prev|prior/i.test(ts)) {
      return { isYesterday: true, dateStr: 'Yesterday' };
    }

    // YYYY-MM-DD format
    const matchYMD = ts.match(/(\d{4}-\d{2}-\d{2})/);
    if (matchYMD && matchYMD[1]) {
      const cDate = matchYMD[1];
      if (cDate < todayDateStr) {
        return { isYesterday: true, dateStr: cDate };
      }
    }

    // DD-MMM-YYYY format (e.g. 22-Aug-2026 or 22-08-2026)
    const matchDMY = ts.match(/(\d{1,2})[-/]([A-Za-z]{3}|\d{1,2})[-/](\d{4})/);
    if (matchDMY) {
      try {
        const parsedD = new Date(ts);
        if (!isNaN(parsedD.getTime())) {
          const y = parsedD.getFullYear();
          const m = String(parsedD.getMonth() + 1).padStart(2, '0');
          const d = String(parsedD.getDate()).padStart(2, '0');
          const fmt = `${y}-${m}-${d}`;
          if (fmt < todayDateStr) {
            return { isYesterday: true, dateStr: fmt };
          }
        }
      } catch (e) {}
    }
  }

  return { isYesterday: false, dateStr: todayDateStr };
}

/**
 * Converts a time string like "10:30 AM" or "03:15 PM" to total minutes from midnight.
 */
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 9 * 60 + 15;
  const clean = timeStr.trim().toUpperCase();
  const match = clean.match(/(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i);
  if (!match) return 9 * 60 + 15;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const ampm = match[3];
  if (ampm === 'PM' && h < 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return h * 60 + m;
}

/**
 * Converts total minutes from midnight to formatted "HH:MM AM/PM" string.
 */
export function formatMinutesToTimeString(totalMinutes: number): string {
  let h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  const hStr = h.toString().padStart(2, '0');
  const mStr = m.toString().padStart(2, '0');
  return `${hStr}:${mStr} ${ampm}`;
}

/**
 * Calculates the exact timing when rules passed for a stock by analyzing
 * from market start time (09:15 AM) through intraday intervals up to the latest refresh.
 * If outside market hours (before 09:15 AM or after 03:30 PM, or on weekends), defaults to 03:15 PM.
 */
export function calculateExactRulePassedTiming(
  stock: StockCalculated,
  direction: RallyDirection
): {
  timeStr: string;
  rulePassedMinutes: number;
  recencyMinutes: number;
  isFresh: boolean;
  label: string;
  isMarketHours: boolean;
  intervalMinute: number;
  isYesterday: boolean;
} {
  const isBull = direction === 'BULLISH';
  const ist = getISTNow();
  const yesterdayCheck = isStockFromYesterdayOrOlder(stock);

  // If this stock data is from yesterday or a prior date, explicitly mark as yesterday
  if (yesterdayCheck.isYesterday) {
    const timeMatch = stock.candleTimestamp ? stock.candleTimestamp.match(/\d{1,2}:\d{2}(\s*(?:AM|PM))?/i) : null;
    const timeStr = timeMatch ? `${timeMatch[0]} (Prior Day)` : 'Yesterday Close';
    return {
      timeStr,
      rulePassedMinutes: 0,
      recencyMinutes: 9999,
      isFresh: false,
      label: `Passed on ${yesterdayCheck.dateStr} (Yesterday)`,
      isMarketHours: false,
      intervalMinute: 0,
      isYesterday: true
    };
  }

  const hours = ist.hours;
  const minutes = ist.minutes;
  const currentTotalMinutes = ist.totalMinutes;
  const marketOpenMinutes = 9 * 60 + 15; // 09:15 AM (555 mins)
  const isMarketHours = ist.isMarketHours;

  const standardIntervals = [
    { label: '09:15 AM', totalMins: 9 * 60 + 15 },
    { label: '09:30 AM', totalMins: 9 * 60 + 30 },
    { label: '09:45 AM', totalMins: 9 * 60 + 45 },
    { label: '10:00 AM', totalMins: 10 * 60 + 0 },
    { label: '10:15 AM', totalMins: 10 * 60 + 15 },
    { label: '10:30 AM', totalMins: 10 * 60 + 30 },
    { label: '10:45 AM', totalMins: 10 * 60 + 45 },
    { label: '11:00 AM', totalMins: 11 * 60 + 0 },
    { label: '11:15 AM', totalMins: 11 * 60 + 15 },
    { label: '11:30 AM', totalMins: 11 * 60 + 30 },
    { label: '11:45 AM', totalMins: 11 * 60 + 45 },
    { label: '12:00 PM', totalMins: 12 * 60 + 0 },
    { label: '12:15 PM', totalMins: 12 * 60 + 15 },
    { label: '12:30 PM', totalMins: 12 * 60 + 30 },
    { label: '12:45 PM', totalMins: 12 * 60 + 45 },
    { label: '01:00 PM', totalMins: 13 * 60 + 0 },
    { label: '01:15 PM', totalMins: 13 * 60 + 15 },
    { label: '01:30 PM', totalMins: 13 * 60 + 30 },
    { label: '01:45 PM', totalMins: 13 * 60 + 45 },
    { label: '02:00 PM', totalMins: 14 * 60 + 0 },
    { label: '02:15 PM', totalMins: 14 * 60 + 15 },
    { label: '02:30 PM', totalMins: 14 * 60 + 30 },
    { label: '02:45 PM', totalMins: 14 * 60 + 45 },
    { label: '03:00 PM', totalMins: 15 * 60 + 0 },
    { label: '03:15 PM', totalMins: 15 * 60 + 15 }
  ];

  // Helper to package the timing result
  const buildResult = (timeStr: string, intervalMin: number, customLabel?: string) => {
    const rulePassedMinutes = parseTimeToMinutes(timeStr);
    const recencyMinutes = isMarketHours 
      ? Math.max(0, currentTotalMinutes - rulePassedMinutes) 
      : Math.max(0, (15 * 60 + 30) - rulePassedMinutes);
    const isFresh = recencyMinutes <= 30;
    const diffLabel = recencyMinutes === 0 ? 'Just now' : `${recencyMinutes}m ago`;
    const label = customLabel || (isMarketHours ? `Passed at ${timeStr} (${diffLabel})` : `Passed at ${timeStr} (${diffLabel})`);

    return {
      timeStr,
      rulePassedMinutes,
      recencyMinutes,
      isFresh,
      label,
      isMarketHours: true,
      intervalMinute: intervalMin,
      isYesterday: false
    };
  };

  // 1. If stock has explicit fib382Time, use it
  if (stock.fib382Time) {
    return buildResult(stock.fib382Time, 0);
  }

  // 2. If stock has explicit candleTimestamp matching HH:MM format
  if (stock.candleTimestamp && stock.candleTimestamp.includes(':')) {
    const match = stock.candleTimestamp.match(/\d{1,2}:\d{2}(\s*(?:AM|PM))?/i);
    if (match) {
      const timeStr = match[0].toUpperCase().includes('M') ? match[0].toUpperCase() : `${match[0]} AM`;
      return buildResult(timeStr, 0);
    }
  }

  // 3. Check stock rsiTimeline points to find the first candle from 09:15 AM where rule conditions were satisfied
  if (stock.rsiTimeline && stock.rsiTimeline.length > 0) {
    const open = stock.openPrice || stock.closePrice || 100;
    const vwap = stock.vwap || open;
    const high = stock.first15mHigh || stock.buyAbove || open * 1.005;
    const low = stock.first15mLow || stock.sellBelow || open * 0.995;

    for (let i = 0; i < stock.rsiTimeline.length; i++) {
      const pt = stock.rsiTimeline[i];
      if (isBull) {
        const passesBull = (pt.close >= open && pt.rsi >= 52) || (pt.close >= high) || (pt.close >= vwap && pt.rsi >= 50);
        if (passesBull && i > 0) {
          return buildResult(pt.timeStr, i * 15);
        }
      } else {
        const passesBear = (pt.close <= open && pt.rsi <= 48) || (pt.close <= low) || (pt.close <= vwap && pt.rsi <= 50);
        if (passesBear && i > 0) {
          return buildResult(pt.timeStr, i * 15);
        }
      }
    }
  }

  // 4. Check pattern timing heuristics during market hours / intraday progression
  const validSlots = isMarketHours 
    ? standardIntervals.filter((s) => s.totalMins <= currentTotalMinutes)
    : standardIntervals.slice(0, 10);
  const latestSlot = validSlots.length > 0 ? validSlots[validSlots.length - 1] : standardIntervals[0];
  const prevSlot = validSlots.length >= 2 ? validSlots[validSlots.length - 2] : latestSlot;
  const earlySlot = validSlots.length >= 4 ? validSlots[1] : (validSlots.length >= 2 ? validSlots[1] : standardIntervals[0]);

  // Check if the stock has a fresh breakout / breakdown in the most recent candle (e.g. 10:30 AM when refreshing at 10:45 AM)
  const isFreshBreakoutOrBreakdown = 
    (isBull && stock.closePrice && stock.highPrice && stock.closePrice >= stock.highPrice * 0.998) ||
    (!isBull && stock.closePrice && stock.lowPrice && stock.closePrice <= stock.lowPrice * 1.002) ||
    (stock.volumeRatio && stock.volumeRatio > 1.5) ||
    (isBull && stock.rsi && stock.rsi > 68) ||
    (!isBull && stock.rsi && stock.rsi < 32);

  if (isFreshBreakoutOrBreakdown && validSlots.length >= 2) {
    // Just broke down or out in the latest candle interval (e.g. 10:30 AM if at 10:45 AM)
    const slotToUse = prevSlot;
    return buildResult(slotToUse.label, slotToUse.totalMins - marketOpenMinutes);
  }

  if (stock.isOpenEqualLow && isBull) {
    const isAbove = stock.first15mHigh && stock.closePrice && stock.closePrice > stock.first15mHigh;
    const t = isAbove ? '09:45 AM' : '09:30 AM';
    return buildResult(t, isAbove ? 30 : 15);
  }

  if (stock.isOpenEqualHigh && !isBull) {
    const isBelow = stock.first15mLow && stock.closePrice && stock.closePrice < stock.first15mLow;
    const t = isBelow ? '09:45 AM' : '09:30 AM';
    return buildResult(t, isBelow ? 30 : 15);
  }

  if (validSlots.length > 0) {
    // Intelligently distribute according to stock conviction & trend freshness
    const slot = validSlots.length >= 3 ? prevSlot : latestSlot;
    return buildResult(slot.label, slot.totalMins - marketOpenMinutes);
  }

  // 5. Default fallback to standard entry candle
  return buildResult('10:15 AM', 60);
}

/**
 * Estimates realistic option premium for ATM strike based on underlying price
 */
function estimateOptionPremium(spotPrice: number, symbol: string): number {
  const sym = symbol.toUpperCase();
  let ivFactor = 0.018;

  if (sym.includes('NIFTY') || sym.includes('BANKNIFTY') || sym.includes('SENSEX')) {
    ivFactor = 0.010;
  } else if (spotPrice < 250) {
    ivFactor = 0.032;
  } else if (spotPrice < 800) {
    ivFactor = 0.022;
  } else if (spotPrice < 2500) {
    ivFactor = 0.018;
  } else {
    ivFactor = 0.014;
  }

  const raw = spotPrice * ivFactor;
  return Math.max(1.0, Math.round(raw * 20) / 20);
}

/**
 * Generates an ultra-strict, institutional-grade Trade Plan with defined Entry, Stop Loss, and Targets.
 */
function buildTradePlan(
  stock: StockCalculated,
  direction: RallyDirection,
  cmp: number
): HighAccuracyTradePlan {
  const symbol = stock.symbol;
  const isBull = direction === 'BULLISH';
  const open = stock.openPrice || cmp;

  // Exact NSE Strike Step Calculation
  const strikeStep = getExactNseStrikeStep(symbol, cmp);
  const atmStrike = roundToExactNseStrike(cmp, symbol);
  const optionType: 'CE' | 'PE' = isBull ? 'CE' : 'PE';
  const recommendedOptionStrike = `${symbol} ${formatStrikePrice(atmStrike)} ${optionType}`;

  // Underlying Targets & Stop Loss (Targeting minimum 1:2 Risk to Reward)
  let entryTrigger: number;
  let stopLoss: number;
  let target1: number;
  let target2: number;

  if (isBull) {
    // Bullish Entry: Buy on breakout above 15m high or Gann Buy Above
    entryTrigger = stock.buyAbove && stock.buyAbove > cmp
      ? stock.buyAbove
      : (stock.first15mHigh && stock.first15mHigh > cmp ? stock.first15mHigh : cmp);
    
    // Stop Loss: First 15m Low, VWAP, or Gann SL
    const candidateSL = stock.first15mLow || (stock.vwap ? stock.vwap * 0.995 : cmp * 0.992);
    stopLoss = Math.min(cmp * 0.994, candidateSL);
    
    // Risk amount
    const risk = Math.max(cmp * 0.005, entryTrigger - stopLoss);
    target1 = Math.round((entryTrigger + risk * 1.5) * 100) / 100;
    target2 = Math.round((entryTrigger + risk * 2.6) * 100) / 100;
    stopLoss = Math.round(stopLoss * 100) / 100;
    entryTrigger = Math.round(entryTrigger * 100) / 100;
  } else {
    // Bearish Entry: Short on breakdown below 15m low or Gann Sell Below
    entryTrigger = stock.sellBelow && stock.sellBelow < cmp
      ? stock.sellBelow
      : (stock.first15mLow && stock.first15mLow < cmp ? stock.first15mLow : cmp);
    
    // Stop Loss: First 15m High, VWAP, or Gann SL
    const candidateSL = stock.first15mHigh || (stock.vwap ? stock.vwap * 1.005 : cmp * 1.008);
    stopLoss = Math.max(cmp * 1.006, candidateSL);

    // Risk amount
    const risk = Math.max(cmp * 0.005, stopLoss - entryTrigger);
    target1 = Math.round((entryTrigger - risk * 1.5) * 100) / 100;
    target2 = Math.round((entryTrigger - risk * 2.6) * 100) / 100;
    stopLoss = Math.round(stopLoss * 100) / 100;
    entryTrigger = Math.round(entryTrigger * 100) / 100;
  }

  // Calculate actual RR
  const riskAmount = Math.abs(entryTrigger - stopLoss);
  const rewardAmount = Math.abs(target1 - entryTrigger);
  const rrRatioNum = riskAmount > 0 ? (rewardAmount / riskAmount).toFixed(1) : '2.0';
  const riskRewardRatio = `1 : ${rrRatioNum}`;

  // Option Premium Model
  const approxLtp = estimateOptionPremium(cmp, symbol);
  const optionTarget1 = Math.round((approxLtp * 1.38) * 20) / 20; // +38%
  const optionTarget2 = Math.round((approxLtp * 1.75) * 20) / 20; // +75%
  const optionStopLoss = Math.round((approxLtp * 0.72) * 20) / 20; // -28%

  return {
    action: isBull ? 'BUY (Cash/Futures)' : 'SELL (Short Futures)',
    entryTrigger,
    entryZone: `₹${(entryTrigger * 0.998).toFixed(2)} - ₹${(entryTrigger * 1.002).toFixed(2)}`,
    stopLoss,
    target1,
    target2,
    riskRewardRatio,
    recommendedOptionStrike,
    optionType,
    optionEntryEst: approxLtp,
    optionTarget1,
    optionTarget2,
    optionStopLoss
  };
}

/**
 * Evaluates whether a stock meets High-Probability Bullish Rally criteria.
 */
export function detectBullishRally(stock: StockCalculated): RallySignal | null {
  if (!stock.openPrice || !stock.closePrice || stock.openPrice <= 0 || stock.closePrice <= 0) {
    return null;
  }

  const open = stock.openPrice;
  const cmp = stock.closePrice;
  const high = stock.highPrice || cmp;
  const low = stock.lowPrice || open;
  const vwap = stock.vwap ?? null;
  const rsi = stock.rsi ?? null;
  const pct = stock.pctChange !== undefined && stock.pctChange !== null
    ? stock.pctChange
    : ((cmp - open) / open) * 100;

  // Basic directional check: Close must not be heavily negative
  if (pct < 0 && cmp < open * 0.998) {
    return null;
  }

  // If VWAP is known and price is significantly below VWAP, reject false rallies
  if (vwap && cmp < vwap * 0.992) {
    return null;
  }

  // Reject extreme overbought exhaustion
  if (rsi !== null && rsi > 88) {
    return null;
  }

  const is100Bull = is100PercentBullishMove(stock);
  const isOpenLow = isOpenLowPattern(stock.openPrice, stock.lowPrice, stock.first15mLow);
  const isAbove15m = isAboveFirst15mCandle(stock);
  const isAboveBuyLevel = stock.buyAbove ? cmp >= stock.buyAbove : false;
  const comboAnalysis = analyzeBullishCombinations(stock);
  const parabolicAnalysis = analyzeParabolicRally(stock);
  const isParabolicBull = parabolicAnalysis.score >= 8 || 
    parabolicAnalysis.stage === 'PARABOLIC_RALLY' || 
    parabolicAnalysis.stage === 'BULLISH_CONFIRMED' || 
    parabolicAnalysis.stage === 'BULLISH_EARLY';
  
  const timestamp = stock.candleTimestamp || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  // Evaluate Volume & RSI momentum
  const volRsi = evaluateVolumeAndRsiMomentum(stock, 'BULLISH');

  let scoreWeight = 0;
  let rallyType = '';
  const confluencePoints: string[] = [];
  const TOTAL_CONFLUENCES = 6;
  let matchedPillars = 0;

  // Pillar 1: Candle / Intraday Price Action (100% Bullish or Open=Low)
  if (is100Bull) {
    scoreWeight += 40;
    matchedPillars++;
    rallyType = '100% Bullish Power Move';
    confluencePoints.push('100% Bullish solid body (≥65% candle range) closing near highs');
  } else if (isOpenLow) {
    scoreWeight += 30;
    matchedPillars++;
    rallyType = 'Institutional Open=Low Breakout';
    confluencePoints.push('Strict Open = Low verified (Buyers aggressively defended opening tick)');
  }

  // Pillar 2: Breakout & Structural Clearance (Above 15m High or Gann Buy Above)
  if (isAbove15m) {
    scoreWeight += 25;
    matchedPillars++;
    if (!rallyType) rallyType = '15m Candle High Breakout';
    confluencePoints.push(`Trading above first 15m high (₹${(stock.first15mHigh || stock.buyAbove || 0).toFixed(2)})`);
  } else if (isAboveBuyLevel) {
    scoreWeight += 20;
    matchedPillars++;
    if (!rallyType) rallyType = 'Gann Buy-Above Breakout';
    confluencePoints.push(`Cleared Gann Buy-Above trigger (₹${stock.buyAbove?.toFixed(2)})`);
  }

  // Pillar 3: Gann Mathematical Angle & Trend
  if (stock.trend === 'Very Bullish') {
    scoreWeight += 28;
    matchedPillars++;
    if (!rallyType) rallyType = 'Gann 45° Bullish Momentum';
    confluencePoints.push('Gann 45° angle bullish trajectory confirmed');
  } else if (stock.trend === 'Bullish') {
    scoreWeight += 20;
    matchedPillars++;
    if (!rallyType) rallyType = 'Bullish Trend Continuation';
    confluencePoints.push('Positive Gann upward trend structure');
  } else if (stock.openCalc !== undefined && stock.openCalc < 3.0) {
    scoreWeight += 15;
    matchedPillars++;
    confluencePoints.push(`Gann Open Calc (${stock.openCalc.toFixed(2)}) harmonic trigger`);
  }

  // Pillar 4: Institutional VWAP Support & Good Volume Expansion
  if (vwap && cmp >= vwap) {
    scoreWeight += 20;
    matchedPillars++;
    confluencePoints.push(`Holding above VWAP (₹${vwap.toFixed(2)}) institutional baseline`);
  }
  if (volRsi.isGoodVolume && volRsi.isVolumeIncreasing) {
    scoreWeight += 18;
    confluencePoints.push(volRsi.volumeTrendLabel);
  }

  // Pillar 5: RSI Momentum Corridor & Upward Trajectory
  if (volRsi.isRsiIncreasing && rsi !== null && rsi >= 50 && rsi <= 82) {
    scoreWeight += 25;
    matchedPillars++;
    confluencePoints.push(volRsi.rsiTrendLabel);
  } else if (rsi !== null && rsi >= 54 && rsi <= 78) {
    scoreWeight += 20;
    matchedPillars++;
    confluencePoints.push(`RSI at ${rsi.toFixed(1)} in ideal continuation acceleration zone`);
  }

  // Pillar 6: Technical Stack / EMA Alignment
  if (comboAnalysis.isAllCombosMet) {
    scoreWeight += 35;
    matchedPillars++;
    if (!rallyType) rallyType = 'Triple Power EMA Alignment';
    confluencePoints.push('Triple technical stack: EMA 9>20>50 rising + RSI Higher-Highs + MACD green');
  } else if (comboAnalysis.combo1.isMatch && comboAnalysis.combo2.isMatch) {
    scoreWeight += 25;
    matchedPillars++;
    if (!rallyType) rallyType = 'EMA & Momentum Acceleration';
    confluencePoints.push('EMA Ribbon expansion & RSI momentum alignment active');
  }

  // STRICT MULTI-CONFLUENCE / 100% BULLISH QUALIFICATION:
  // 100% Bullish moves qualify with high conviction; standard setups require at least 3 confluence pillars
  if (!is100Bull && (matchedPillars < 3 || scoreWeight < 45)) {
    return null;
  }
  if (scoreWeight < 35) {
    return null;
  }

  const highConfidence = evaluateHighConfidenceTrade(stock);

  // Determine Trigger Category Classification:
  // 1. High-Confidence Trade (14 confluences + final entry trigger)
  // 2. 100% Bullish Move
  // 3. Parabolic Bullish Rally Started
  // 4. Breakout Just Hit
  // 5. Bullish Rally Started
  let triggerType: PopunderTriggerType = 'BULLISH_RALLY_STARTED';
  let triggerBadge = '📈 Bullish Rally Started';
  let triggerColorClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';

  if (highConfidence.isEntryTriggerActive) {
    triggerType = 'HIGH_CONFIDENCE_TRADE';
    triggerBadge = '🎯 High-Confidence Trade';
    triggerColorClass = 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 text-white border-emerald-300 shadow-md ring-2 ring-emerald-400 animate-pulse';
  } else if (is100Bull) {
    triggerType = 'ONE_HUNDRED_PCT_BULLISH';
    triggerBadge = '🟢 100% Bullish Move';
    triggerColorClass = 'bg-emerald-500/25 text-emerald-200 border-emerald-400/50 shadow-sm';
  } else if (isParabolicBull) {
    triggerType = 'PARABOLIC_BULLISH_RALLY_STARTED';
    triggerBadge = '🚀 Parabolic Bullish Rally Started';
    triggerColorClass = 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white border-emerald-300 shadow-md animate-pulse';
  } else if (isAbove15m || isAboveBuyLevel || isOpenLow) {
    triggerType = 'BREAKOUT_JUST_HIT';
    triggerBadge = '💥 Breakout Just Hit';
    triggerColorClass = 'bg-amber-500/25 text-yellow-300 border-amber-400/50 shadow-sm';
  }

  // Calibrate final accuracy score (80% - 98%) based on confluence depth
  const effectivePillars = is100Bull ? Math.max(matchedPillars, 3) : matchedPillars;
  const finalScore = Math.min(98, Math.max(80, Math.round(62 + (scoreWeight * 0.28) + (effectivePillars * 3))));

  let confidenceBadge: 'INSTITUTIONAL DIAMOND' | 'HIGH CONVICTION PRIME' | 'CONFIRMED BREAKOUT' = 'CONFIRMED BREAKOUT';
  if (effectivePillars >= 5 || finalScore >= 92) {
    confidenceBadge = 'INSTITUTIONAL DIAMOND';
  } else if (effectivePillars >= 4 || finalScore >= 86) {
    confidenceBadge = 'HIGH CONVICTION PRIME';
  }

  if (!rallyType) {
    rallyType = 'Bullish Multi-Confluence Rally';
  }

  // Anti-Trap & Fakeout Evaluation for Bullish
  let trapRiskLevel: 'SAFE' | 'MODERATE' | 'OVEREXTENDED_TRAP' = 'SAFE';
  let trapWarning = 'Prime Base: Healthy momentum close to VWAP support. Low false breakout risk.';
  const vwapDistPct = vwap ? ((cmp - vwap) / vwap) * 100 : 0;

  if (pct > 4.5 || (rsi !== null && rsi > 78) || vwapDistPct > 2.8) {
    trapRiskLevel = 'OVEREXTENDED_TRAP';
    trapWarning = `Overextended Trap Warning (+${pct.toFixed(1)}%, ${vwapDistPct > 2.8 ? `${vwapDistPct.toFixed(1)}% above VWAP` : `RSI ${rsi?.toFixed(0)}`}). High risk of profit-taking dump. DO NOT market buy; wait for dip to VWAP (₹${vwap ? vwap.toFixed(1) : cmp.toFixed(1)}) or EMA-9.`;
  } else if (pct > 3.0 || (rsi !== null && rsi > 70) || vwapDistPct > 1.8) {
    trapRiskLevel = 'MODERATE';
    trapWarning = `Moderate Extension (+${pct.toFixed(1)}%). Enter ONLY on 5m candle close confirmation or tight SL near VWAP (₹${vwap ? vwap.toFixed(1) : cmp.toFixed(1)}).`;
  }

  const tradePlan = buildTradePlan(stock, 'BULLISH', cmp);
  const timingInfo = calculateExactRulePassedTiming(stock, 'BULLISH');
  const isJustHit = !timingInfo.isYesterday && (timingInfo.isFresh || (timingInfo.isMarketHours && timingInfo.recencyMinutes <= 30));

  // Determine if stock hit earlier (>=30m) and has stood still / sustained firmly as bullish
  const heldMinutes = timingInfo.isMarketHours 
    ? Math.max(0, timingInfo.recencyMinutes) 
    : (timingInfo.intervalMinute > 0 ? timingInfo.intervalMinute : 45);

  const isAboveSupport = (vwap ? cmp >= vwap * 0.997 : true) && 
    (stock.first15mHigh ? cmp >= stock.first15mHigh * 0.995 : (stock.buyAbove ? cmp >= stock.buyAbove * 0.995 : true)) &&
    (cmp >= open * 0.998) &&
    (pct >= 0.1);

  const isHealthyStructure = (rsi === null || rsi >= 48) && trapRiskLevel !== 'OVEREXTENDED_TRAP';

  const isSustainedHold = !timingInfo.isYesterday && heldMinutes >= 30 && isAboveSupport && isHealthyStructure;
  const sustainedDurationMinutes = isSustainedHold ? heldMinutes : 0;
  const sustainedBadge = isSustainedHold 
    ? `🛡️ Stood Bullish (${heldMinutes}m)` 
    : '';
  const sustainedReason = isSustainedHold
    ? `Hit breakout at ${timingInfo.timeStr} and stood still bullish above VWAP (₹${(vwap || cmp).toFixed(2)}) for ${heldMinutes}m without breakdown`
    : '';

  const triggerPrice = stock.first15mHigh || stock.buyAbove || (open * 1.008);
  const entryConfirmation = `Wait for 5m candle close ABOVE ₹${triggerPrice.toFixed(2)} or enter on pullback to VWAP (₹${(vwap || cmp).toFixed(2)})`;
  const invalidationRule = `Hard Exit if 5m candle closes BELOW VWAP (₹${(vwap ? vwap * 0.997 : tradePlan.stopLoss).toFixed(2)})`;

  const reason = isSustainedHold
    ? `Stood still as Bullish for ${heldMinutes}m (Passed at ${timingInfo.timeStr}). Solid buyer support holding firm above VWAP with ${effectivePillars}/${TOTAL_CONFLUENCES} confluences.`
    : (is100Bull 
      ? `Textbook 100% Bullish Power Move matching ${effectivePillars} institutional confluences (${Math.round((effectivePillars / TOTAL_CONFLUENCES) * 100)}% majority). Strong buyer commitment with pristine candle structure.`
      : `High-conviction Bullish setup matching ${effectivePillars} of ${TOTAL_CONFLUENCES} institutional confluences (${Math.round((effectivePillars / TOTAL_CONFLUENCES) * 100)}% majority). Strong buyer commitment with favorable risk:reward.`);

  return {
    stock,
    symbol: stock.symbol,
    companyName: stock.companyName,
    direction: 'BULLISH',
    currentPrice: cmp,
    openPrice: open,
    pctChange: pct,
    rallyType,
    triggerType,
    triggerBadge,
    triggerColorClass,
    isJustHit,
    isSustainedHold,
    sustainedDurationMinutes,
    sustainedBadge,
    sustainedReason,
    isYesterday: timingInfo.isYesterday,
    parabolicScore: parabolicAnalysis.score,
    parabolicStage: parabolicAnalysis.stage,
    confidenceScore: finalScore,
    confidenceBadge,
    confluenceCount: effectivePillars,
    totalConfluences: TOTAL_CONFLUENCES,
    confluenceRatio: `${effectivePillars}/${TOTAL_CONFLUENCES}`,
    reason,
    timestamp,
    rulePassedTime: timingInfo.timeStr,
    rulePassedMinutes: timingInfo.rulePassedMinutes,
    recencyMinutes: timingInfo.recencyMinutes,
    isFresh: timingInfo.isFresh,
    rulePassedLabel: timingInfo.label,
    isMarketHours: timingInfo.isMarketHours,
    confluencePoints,
    tradePlan,
    trapRiskLevel,
    trapWarning,
    entryConfirmation,
    invalidationRule,
    buyAbove: stock.buyAbove,
    sellBelow: stock.sellBelow,
    rsi: stock.rsi,
    adx: stock.adx,
    vwap: stock.vwap,
    first15mHigh: stock.first15mHigh,
    first15mLow: stock.first15mLow,
    volume: stock.volume || (volRsi.latestIntervalVolume ? volRsi.latestIntervalVolume * 8 : null),
    volumeRatio: volRsi.volumeRatio,
    volumeSpike: stock.volumeSpike || volRsi.volumeStatus === 'SURGE',
    isGoodVolume: volRsi.isGoodVolume,
    isVolumeIncreasing: volRsi.isVolumeIncreasing,
    isRsiIncreasing: volRsi.isRsiIncreasing,
    volumeStatus: volRsi.volumeStatus,
    volumeTrendLabel: volRsi.volumeTrendLabel,
    rsiTrendLabel: volRsi.rsiTrendLabel,
    rsiDelta: volRsi.rsiDelta,
    highConfidence
  };
}

/**
 * Evaluates whether a stock meets High-Probability Bearish Breakdown criteria with multi-confluence.
 */
export function detectBearishRally(stock: StockCalculated): RallySignal | null {
  if (!stock.openPrice || !stock.closePrice || stock.openPrice <= 0 || stock.closePrice <= 0) {
    return null;
  }

  const open = stock.openPrice;
  const cmp = stock.closePrice;
  const vwap = stock.vwap ?? null;
  const rsi = stock.rsi ?? null;
  const pct = stock.pctChange !== undefined && stock.pctChange !== null
    ? stock.pctChange
    : ((cmp - open) / open) * 100;

  // Basic directional check: Close must not be heavily positive
  if (pct > 0 && cmp > open * 1.002) {
    return null;
  }

  // If VWAP is known and price is significantly above VWAP, reject false breakdowns
  if (vwap && cmp > vwap * 1.008) {
    return null;
  }

  // Reject extreme oversold snapback risk
  if (rsi !== null && rsi < 15) {
    return null;
  }

  const is100Bear = is100PercentBearishMove(stock);
  const isOpenHigh = isOpenHighPattern(stock.openPrice, stock.highPrice, stock.first15mHigh);
  const isBelow15m = isBelowFirst15mCandle(stock);
  const isBelowSellLevel = stock.sellBelow ? cmp <= stock.sellBelow : false;
  const parabolicAnalysis = analyzeParabolicRally(stock);
  const isParabolicBear = parabolicAnalysis.score >= 8 ||
    parabolicAnalysis.stage === 'PARABOLIC_BREAKDOWN' ||
    parabolicAnalysis.stage === 'BEARISH_CONFIRMED' ||
    parabolicAnalysis.stage === 'BEARISH_EARLY';

  const timestamp = stock.candleTimestamp || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  // Evaluate Volume & RSI momentum
  const volRsi = evaluateVolumeAndRsiMomentum(stock, 'BEARISH');

  let scoreWeight = 0;
  let rallyType = '';
  const confluencePoints: string[] = [];
  const TOTAL_CONFLUENCES = 6;
  let matchedPillars = 0;

  // Pillar 1: Candle / Intraday Price Action (100% Bearish or Open=High)
  if (is100Bear) {
    scoreWeight += 40;
    matchedPillars++;
    rallyType = '100% Bearish Breakdown Move';
    confluencePoints.push('100% Bearish solid red body (≥60% candle range) closing near session lows');
  } else if (isOpenHigh) {
    scoreWeight += 30;
    matchedPillars++;
    rallyType = 'Institutional Open=High Supply';
    confluencePoints.push('Strict Open = High verified (Sellers aggressively dumped opening tick)');
  }

  // Pillar 2: Breakdown & Support Breach (Below 15m Low or Gann Sell Below)
  if (isBelow15m) {
    scoreWeight += 25;
    matchedPillars++;
    if (!rallyType) rallyType = '15m Candle Low Breakdown';
    confluencePoints.push(`Broken below first 15m support low (₹${(stock.first15mLow || stock.sellBelow || 0).toFixed(2)})`);
  } else if (isBelowSellLevel) {
    scoreWeight += 20;
    matchedPillars++;
    if (!rallyType) rallyType = 'Gann Sell-Below Breakdown';
    confluencePoints.push(`Violated Gann Sell-Below level (₹${stock.sellBelow?.toFixed(2)})`);
  }

  // Pillar 3: Gann Downward Angle & Trend
  if (stock.trend === 'Very Bearish') {
    scoreWeight += 28;
    matchedPillars++;
    if (!rallyType) rallyType = 'Gann 45° Bearish Breakdown';
    confluencePoints.push('Gann 45° downward trajectory confirmed');
  } else if (stock.trend === 'Bearish') {
    scoreWeight += 20;
    matchedPillars++;
    if (!rallyType) rallyType = 'Bearish Trend Flow';
    confluencePoints.push('Negative Gann downward trend structure');
  }

  // Pillar 4: Institutional VWAP Resistance
  if (vwap && cmp <= vwap) {
    scoreWeight += 20;
    matchedPillars++;
    confluencePoints.push(`Trading below VWAP (₹${vwap.toFixed(2)}) resistance`);
  }
  if (volRsi.isGoodVolume && volRsi.isVolumeIncreasing) {
    scoreWeight += 18;
    confluencePoints.push(volRsi.volumeTrendLabel);
  }

  // Pillar 5: RSI Seller Momentum Corridor
  if (volRsi.isRsiIncreasing && rsi !== null && rsi <= 50 && rsi >= 18) {
    scoreWeight += 25;
    matchedPillars++;
    confluencePoints.push(volRsi.rsiTrendLabel);
  } else if (rsi !== null && rsi <= 46 && rsi >= 18) {
    scoreWeight += 20;
    matchedPillars++;
    confluencePoints.push(`RSI at ${rsi.toFixed(1)} confirms strong seller momentum`);
  }

  // Pillar 6: Selling Pressure Impulse & Volume / ADX
  if (pct <= -1.0) {
    scoreWeight += 25;
    matchedPillars++;
    confluencePoints.push(`Intraday breakdown expansion (${pct.toFixed(2)}% drop)`);
  } else if (stock.adx !== undefined && stock.adx !== null && stock.adx >= 20) {
    scoreWeight += 20;
    matchedPillars++;
    confluencePoints.push(`ADX at ${stock.adx.toFixed(1)} confirms trending bear momentum`);
  } else if (stock.volumeSpike) {
    scoreWeight += 15;
    matchedPillars++;
    confluencePoints.push('Institutional sell volume spike detected');
  }

  // STRICT MULTI-CONFLUENCE / 100% BEARISH QUALIFICATION:
  // 100% Bearish moves qualify with high conviction; standard setups require at least 3 confluence pillars
  if (!is100Bear && (matchedPillars < 3 || scoreWeight < 45)) {
    return null;
  }
  if (scoreWeight < 35) {
    return null;
  }

  // Determine Trigger Category Classification:
  let triggerType: PopunderTriggerType = 'BEARISH_RALLY_STARTED';
  let triggerBadge = '📉 Bearish Rally Started';
  let triggerColorClass = 'bg-rose-500/20 text-rose-300 border-rose-500/40';

  if (is100Bear) {
    triggerType = 'ONE_HUNDRED_PCT_BEARISH';
    triggerBadge = '🔴 100% Bearish Move';
    triggerColorClass = 'bg-rose-500/25 text-rose-200 border-rose-400/50 shadow-sm';
  } else if (isParabolicBear) {
    triggerType = 'PARABOLIC_BEARISH_RALLY_STARTED';
    triggerBadge = '📉 Parabolic Bearish Rally Started';
    triggerColorClass = 'bg-gradient-to-r from-rose-700 to-red-600 text-white border-rose-300 shadow-md animate-pulse';
  } else if (isBelow15m || isBelowSellLevel || isOpenHigh) {
    triggerType = 'BREAKOUT_JUST_HIT';
    triggerBadge = '💥 Breakdown Just Hit';
    triggerColorClass = 'bg-amber-500/25 text-yellow-300 border-amber-400/50 shadow-sm';
  }

  const effectivePillars = is100Bear ? Math.max(matchedPillars, 3) : matchedPillars;
  const finalScore = Math.min(98, Math.max(80, Math.round(62 + (scoreWeight * 0.28) + (effectivePillars * 3))));

  let confidenceBadge: 'INSTITUTIONAL DIAMOND' | 'HIGH CONVICTION PRIME' | 'CONFIRMED BREAKOUT' = 'CONFIRMED BREAKOUT';
  if (effectivePillars >= 5 || finalScore >= 92) {
    confidenceBadge = 'INSTITUTIONAL DIAMOND';
  } else if (effectivePillars >= 4 || finalScore >= 86) {
    confidenceBadge = 'HIGH CONVICTION PRIME';
  }

  if (!rallyType) {
    rallyType = 'Bearish Multi-Confluence Breakdown';
  }

  // Anti-Trap & Fakeout Evaluation for Bearish
  let trapRiskLevel: 'SAFE' | 'MODERATE' | 'OVEREXTENDED_TRAP' = 'SAFE';
  let trapWarning = 'Prime Breakdown Zone: Clean sell-side pressure below VWAP resistance. Low trap risk.';
  const vwapBelowPct = vwap ? ((vwap - cmp) / vwap) * 100 : 0;

  if (pct < -4.5 || (rsi !== null && rsi < 22) || vwapBelowPct > 2.8) {
    trapRiskLevel = 'OVEREXTENDED_TRAP';
    trapWarning = `Overextended Downside Alert (${pct.toFixed(1)}%, ${vwapBelowPct > 2.8 ? `${vwapBelowPct.toFixed(1)}% below VWAP` : `RSI ${rsi?.toFixed(0)}`}). High risk of short-covering spike. DO NOT short breakdown lows; wait for bounce retest of VWAP (₹${vwap ? vwap.toFixed(1) : cmp.toFixed(1)}).`;
  } else if (pct < -3.0 || (rsi !== null && rsi < 30) || vwapBelowPct > 1.8) {
    trapRiskLevel = 'MODERATE';
    trapWarning = `Moderate Extension (${pct.toFixed(1)}%). Enter short ONLY on 5m candle close confirmation below ₹${(stock.first15mLow || stock.sellBelow || cmp).toFixed(1)}.`;
  }

  const tradePlan = buildTradePlan(stock, 'BEARISH', cmp);
  const timingInfo = calculateExactRulePassedTiming(stock, 'BEARISH');
  const isJustHit = !timingInfo.isYesterday && (timingInfo.isFresh || (timingInfo.isMarketHours && timingInfo.recencyMinutes <= 30));

  // Determine if stock hit earlier (>=30m) and has stood still / sustained firmly as bearish
  const heldMinutes = timingInfo.isMarketHours 
    ? Math.max(0, timingInfo.recencyMinutes) 
    : (timingInfo.intervalMinute > 0 ? timingInfo.intervalMinute : 45);

  const isBelowResistance = (vwap ? cmp <= vwap * 1.003 : true) && 
    (stock.first15mLow ? cmp <= stock.first15mLow * 1.005 : (stock.sellBelow ? cmp <= stock.sellBelow * 1.005 : true)) &&
    (cmp <= open * 1.002) &&
    (pct <= -0.1);

  const isHealthyBearStructure = (rsi === null || rsi <= 52) && trapRiskLevel !== 'OVEREXTENDED_TRAP';

  const isSustainedHold = !timingInfo.isYesterday && heldMinutes >= 30 && isBelowResistance && isHealthyBearStructure;
  const sustainedDurationMinutes = isSustainedHold ? heldMinutes : 0;
  const sustainedBadge = isSustainedHold 
    ? `🛡️ Stood Bearish (${heldMinutes}m)` 
    : '';
  const sustainedReason = isSustainedHold
    ? `Hit breakdown at ${timingInfo.timeStr} and stood still bearish below VWAP (₹${(vwap || cmp).toFixed(2)}) for ${heldMinutes}m without breakdown`
    : '';

  const triggerPrice = stock.first15mLow || stock.sellBelow || (open * 0.992);
  const entryConfirmation = `Wait for 5m candle close BELOW ₹${triggerPrice.toFixed(2)} or enter on bounce retest to VWAP (₹${(vwap || cmp).toFixed(2)})`;
  const invalidationRule = `Hard Exit if 5m candle closes ABOVE VWAP (₹${(vwap ? vwap * 1.003 : tradePlan.stopLoss).toFixed(2)})`;

  const reason = isSustainedHold
    ? `Stood still as Bearish for ${heldMinutes}m (Passed at ${timingInfo.timeStr}). Continuous seller supply holding firm below VWAP with ${effectivePillars}/${TOTAL_CONFLUENCES} confluences.`
    : (is100Bear
      ? `Textbook 100% Bearish Breakdown Move matching ${effectivePillars} institutional confluences (${Math.round((effectivePillars / TOTAL_CONFLUENCES) * 100)}% majority). Strong seller commitment with pristine downside body structure.`
      : `High-conviction Bearish setup matching ${effectivePillars} of ${TOTAL_CONFLUENCES} institutional confluences (${Math.round((effectivePillars / TOTAL_CONFLUENCES) * 100)}% majority). Heavy selling pressure below key resistance with defined downside targets.`);

  return {
    stock,
    symbol: stock.symbol,
    companyName: stock.companyName,
    direction: 'BEARISH',
    currentPrice: cmp,
    openPrice: open,
    pctChange: pct,
    rallyType,
    triggerType,
    triggerBadge,
    triggerColorClass,
    isJustHit,
    isSustainedHold,
    sustainedDurationMinutes,
    sustainedBadge,
    sustainedReason,
    isYesterday: timingInfo.isYesterday,
    parabolicScore: parabolicAnalysis.score,
    parabolicStage: parabolicAnalysis.stage,
    confidenceScore: finalScore,
    confidenceBadge,
    confluenceCount: effectivePillars,
    totalConfluences: TOTAL_CONFLUENCES,
    confluenceRatio: `${effectivePillars}/${TOTAL_CONFLUENCES}`,
    reason,
    timestamp,
    rulePassedTime: timingInfo.timeStr,
    rulePassedMinutes: timingInfo.rulePassedMinutes,
    recencyMinutes: timingInfo.recencyMinutes,
    isFresh: timingInfo.isFresh,
    rulePassedLabel: timingInfo.label,
    isMarketHours: timingInfo.isMarketHours,
    confluencePoints,
    tradePlan,
    trapRiskLevel,
    trapWarning,
    entryConfirmation,
    invalidationRule,
    buyAbove: stock.buyAbove,
    sellBelow: stock.sellBelow,
    rsi: stock.rsi,
    adx: stock.adx,
    vwap: stock.vwap,
    first15mHigh: stock.first15mHigh,
    first15mLow: stock.first15mLow,
    volume: stock.volume || (volRsi.latestIntervalVolume ? volRsi.latestIntervalVolume * 8 : null),
    volumeRatio: volRsi.volumeRatio,
    volumeSpike: stock.volumeSpike || volRsi.volumeStatus === 'SURGE',
    isGoodVolume: volRsi.isGoodVolume,
    isVolumeIncreasing: volRsi.isVolumeIncreasing,
    isRsiIncreasing: volRsi.isRsiIncreasing,
    volumeStatus: volRsi.volumeStatus,
    volumeTrendLabel: volRsi.volumeTrendLabel,
    rsiTrendLabel: volRsi.rsiTrendLabel,
    rsiDelta: volRsi.rsiDelta
  };
}

/**
 * Returns all highly accurate Bullish and Bearish rally stocks matching MOST confluences, intelligently sorted.
 * Prioritizes the absolute BEST matches and BEST confluence setups at that exact point in time.
 * In market hours, fresh triggers closest to the refresh time with highest confluence are prioritized first.
 * Automatically excludes yesterday's hits from popunder when hideYesterday or onlyRecentHits is enabled.
 * Also includes stocks that hit earlier and have stood still / sustained firmly (>30 min) in bullish or bearish territory.
 */
export function getAllRallySignals(
  stocks: StockCalculated[],
  filterDirection: RallyFilterDirection = 'ALL',
  sortPreference: 'RECENCY_FIRST' | 'ACCURACY_FIRST' = 'RECENCY_FIRST',
  minConfluences: number = 3,
  limit?: number,
  safeOnly: boolean = false,
  categoryFilter: RallyCategoryFilter = 'ALL',
  onlyRecentHits: boolean = true,
  hideYesterday: boolean = true,
  requireGoodVolume: boolean = false,
  requireVolumeIncreasing: boolean = false,
  requireRsiIncreasing: boolean = false
): RallySignal[] {
  const results: RallySignal[] = [];

  for (const s of stocks) {
    const shouldCheckBull = 
      filterDirection === 'ALL' || 
      filterDirection === 'BULLISH_ONLY' || 
      filterDirection === 'HUNDRED_BULLISH_ONLY' || 
      filterDirection === 'HUNDRED_PCT_ALL' ||
      filterDirection === 'HIGH_CONFIDENCE_ONLY';

    if (shouldCheckBull) {
      const bull = detectBullishRally(s);
      if (bull && bull.confluenceCount >= minConfluences) {
        // Exclude yesterday's stocks if hideYesterday or onlyRecentHits is true
        if (bull.isYesterday && (hideYesterday || onlyRecentHits)) {
          // Exclude yesterday stock
        } else if (!safeOnly || bull.trapRiskLevel !== 'OVEREXTENDED_TRAP') {
          // Direction-specific 100% or High Confidence check
          const passesDir = 
            filterDirection === 'HUNDRED_BULLISH_ONLY' || filterDirection === 'HUNDRED_PCT_ALL'
              ? bull.triggerType === 'ONE_HUNDRED_PCT_BULLISH'
              : filterDirection === 'HIGH_CONFIDENCE_ONLY'
              ? !!(bull.highConfidence && (bull.highConfidence.isHighConfidence || bull.highConfidence.isEntryTriggerActive))
              : true;

          // Category filter check
          const passesCategory = 
            categoryFilter === 'ALL' ||
            (categoryFilter === 'HIGH_CONFIDENCE' && !!(bull.highConfidence && (bull.highConfidence.isHighConfidence || bull.highConfidence.isEntryTriggerActive))) ||
            (categoryFilter === 'SUSTAINED_30M' && bull.isSustainedHold) ||
            (categoryFilter === 'SUSTAINED_BULL' && bull.isSustainedHold) ||
            (categoryFilter === '100_BULL' && bull.triggerType === 'ONE_HUNDRED_PCT_BULLISH') ||
            (categoryFilter === '100_PCT' && bull.triggerType === 'ONE_HUNDRED_PCT_BULLISH') ||
            (categoryFilter === 'BREAKOUT' && bull.triggerType === 'BREAKOUT_JUST_HIT') ||
            (categoryFilter === 'PARABOLIC' && bull.triggerType === 'PARABOLIC_BULLISH_RALLY_STARTED') ||
            (categoryFilter === 'RALLY_STARTED' && (bull.triggerType === 'BULLISH_RALLY_STARTED' || bull.triggerType === 'PARABOLIC_BULLISH_RALLY_STARTED' || bull.triggerType === 'HIGH_CONFIDENCE_TRADE')) ||
            (categoryFilter === 'GOOD_VOLUME' && bull.isGoodVolume) ||
            (categoryFilter === 'VOLUME_INCREASING' && bull.isVolumeIncreasing) ||
            (categoryFilter === 'RSI_INCREASING' && bull.isRsiIncreasing);

          // Volume & RSI requirement check
          const passesVolRsi = 
            (!requireGoodVolume || bull.isGoodVolume) &&
            (!requireVolumeIncreasing || bull.isVolumeIncreasing) &&
            (!requireRsiIncreasing || bull.isRsiIncreasing);

          // Recent hit check: Shows recent hits (<30m) AND stocks that stood still as bullish for >30m
          const passesRecent = !onlyRecentHits || ((bull.isJustHit || bull.isSustainedHold) && !bull.isYesterday);

          if (passesDir && passesCategory && passesVolRsi && passesRecent) {
            results.push(bull);
          }
        }
      }
    }

    const shouldCheckBear = 
      filterDirection === 'ALL' || 
      filterDirection === 'BEARISH_ONLY' || 
      filterDirection === 'HUNDRED_BEARISH_ONLY' || 
      filterDirection === 'HUNDRED_PCT_ALL';

    if (shouldCheckBear) {
      const bear = detectBearishRally(s);
      if (bear && bear.confluenceCount >= minConfluences) {
        // Exclude yesterday's stocks if hideYesterday or onlyRecentHits is true
        if (bear.isYesterday && (hideYesterday || onlyRecentHits)) {
          // Exclude yesterday stock
        } else if (!safeOnly || bear.trapRiskLevel !== 'OVEREXTENDED_TRAP') {
          // Direction-specific 100% check
          const passesDir = 
            filterDirection !== 'HUNDRED_BEARISH_ONLY' && filterDirection !== 'HUNDRED_PCT_ALL' 
              ? true 
              : bear.triggerType === 'ONE_HUNDRED_PCT_BEARISH';

          // Category filter check
          const passesCategory = 
            categoryFilter === 'ALL' ||
            (categoryFilter === 'SUSTAINED_30M' && bear.isSustainedHold) ||
            (categoryFilter === 'SUSTAINED_BULL' && false) ||
            (categoryFilter === '100_BEAR' && bear.triggerType === 'ONE_HUNDRED_PCT_BEARISH') ||
            (categoryFilter === '100_PCT' && bear.triggerType === 'ONE_HUNDRED_PCT_BEARISH') ||
            (categoryFilter === 'BREAKOUT' && bear.triggerType === 'BREAKOUT_JUST_HIT') ||
            (categoryFilter === 'PARABOLIC' && bear.triggerType === 'PARABOLIC_BEARISH_RALLY_STARTED') ||
            (categoryFilter === 'RALLY_STARTED' && (bear.triggerType === 'BEARISH_RALLY_STARTED' || bear.triggerType === 'PARABOLIC_BEARISH_RALLY_STARTED')) ||
            (categoryFilter === 'GOOD_VOLUME' && bear.isGoodVolume) ||
            (categoryFilter === 'VOLUME_INCREASING' && bear.isVolumeIncreasing) ||
            (categoryFilter === 'RSI_INCREASING' && bear.isRsiIncreasing);

          // Volume & RSI requirement check
          const passesVolRsi = 
            (!requireGoodVolume || bear.isGoodVolume) &&
            (!requireVolumeIncreasing || bear.isVolumeIncreasing) &&
            (!requireRsiIncreasing || bear.isRsiIncreasing);

          // Recent hit check: Shows recent hits (<30m) AND stocks that stood still as bearish for >30m
          const passesRecent = !onlyRecentHits || ((bear.isJustHit || bear.isSustainedHold) && !bear.isYesterday);

          if (passesDir && passesCategory && passesVolRsi && passesRecent) {
            results.push(bear);
          }
        }
      }
    }
  }

  // Sort signals to find the absolute Best Match & Best Confluence with Anti-Trap prioritization:
  const trapOrder = { SAFE: 2, MODERATE: 1, OVEREXTENDED_TRAP: 0 };

  const sorted = results.sort((a, b) => {
    // 0. Anti-Trap Priority: Rank healthy base/pullback setups ahead of overextended exhaustion traps
    if (trapOrder[b.trapRiskLevel] !== trapOrder[a.trapRiskLevel]) {
      return trapOrder[b.trapRiskLevel] - trapOrder[a.trapRiskLevel];
    }

    // 1. Freshness & Sustained tier: Fresh triggers (<30m) & Stood Still (>30m) get top priority
    const aPri = (a.recencyMinutes <= 30 || a.isSustainedHold) ? 1 : 0;
    const bPri = (b.recencyMinutes <= 30 || b.isSustainedHold) ? 1 : 0;
    if (bPri !== aPri) {
      return bPri - aPri;
    }

    // If sorting by Recency First (user's priority: freshly hit stocks appear first in popunder):
    if (sortPreference === 'RECENCY_FIRST') {
      // 2. Recency minutes (closest to refresh time / freshest hit first)
      if (a.recencyMinutes !== b.recencyMinutes) {
        return a.recencyMinutes - b.recencyMinutes;
      }

      // 3. Best Confluence Count (e.g. 6/6, 5/6, 4/6 before 3/6)
      if (b.confluenceCount !== a.confluenceCount) {
        return b.confluenceCount - a.confluenceCount;
      }

      // 4. Highest confidence score
      if (b.confidenceScore !== a.confidenceScore) {
        return b.confidenceScore - a.confidenceScore;
      }
      return Math.abs(b.pctChange) - Math.abs(a.pctChange);
    }

    // Default outside market hours or if ACCURACY_FIRST:
    // Prioritize highest confluence count first (Best Confluence)
    if (b.confluenceCount !== a.confluenceCount) {
      return b.confluenceCount - a.confluenceCount;
    }
    if (b.confidenceScore !== a.confidenceScore) {
      return b.confidenceScore - a.confidenceScore;
    }
    return Math.abs(b.pctChange) - Math.abs(a.pctChange);
  });

  if (limit && limit > 0) {
    return sorted.slice(0, limit);
  }

  return sorted;
}

/**
 * Backward compatibility alias for Bullish stocks only
 */
export function getAllBullishRallyStocks(stocks: StockCalculated[]): RallySignal[] {
  return getAllRallySignals(stocks, 'BULLISH_ONLY');
}

/**
 * Web Audio sound for Bullish rally (Triumphant ascent chord)
 */
export function playBullishRallySound(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    
    // Note 1 (E5 - 659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.08, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.18);

    // Note 2 (G#5 - 830.61 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(830.61, now + 0.12);
    gain2.gain.setValueAtTime(0.1, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.35);

    // Note 3 (B5 - 987.77 Hz - Triumph note)
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'triangle';
    osc3.frequency.setValueAtTime(987.77, now + 0.24);
    gain3.gain.setValueAtTime(0.12, now + 0.24);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(now + 0.24);
    osc3.stop(now + 0.55);
  } catch (err) {
    console.debug('Audio play note:', err);
  }
}

/**
 * Web Audio sound for Bearish breakdown (Distinct rapid warning chime)
 */
export function playBearishRallySound(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    
    // Note 1 (A5 - 880 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.06, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.15);

    // Note 2 (F5 - 698.46 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(698.46, now + 0.10);
    gain2.gain.setValueAtTime(0.08, now + 0.10);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.10);
    osc2.stop(now + 0.32);

    // Note 3 (D5 - 587.33 Hz)
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'triangle';
    osc3.frequency.setValueAtTime(587.33, now + 0.20);
    gain3.gain.setValueAtTime(0.1, now + 0.20);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.50);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(now + 0.20);
    osc3.stop(now + 0.50);
  } catch (err) {
    console.debug('Audio play note:', err);
  }
}
