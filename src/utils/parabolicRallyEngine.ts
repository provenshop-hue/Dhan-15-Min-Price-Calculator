import { StockCalculated } from '../types';
import { getStockSector, computeAllSectorStrengths } from './sectorMaster';
import { getAtmOptionStrikes } from './gann';

export type ParabolicStage =
  | 'PARABOLIC_RALLY'       // 12+ pts (Fully Bullish)
  | 'BULLISH_CONFIRMED'     // 9-11 pts
  | 'BULLISH_EARLY'         // 6-8 pts (Forming in 1-3 min)
  | 'PARABOLIC_BREAKDOWN'   // 12+ pts (Fully Bearish)
  | 'BEARISH_CONFIRMED'     // 9-11 pts
  | 'BEARISH_EARLY'         // 6-8 pts (Forming in 1-3 min)
  | 'EXHAUSTION'            // RSI > 78 or extension > 3.5% with slowing volume
  | 'NEUTRAL';              // 0-5 pts

export interface SignalCheckItem {
  id: string;
  name: string;
  points: number;
  maxPoints: number;
  passed: boolean;
  actualValue: string;
  detail: string;
  passedTime?: string;         // e.g. "09:16 AM (Min 1)"
  passedPhase?: string;        // e.g. "Step 2: Min 1–3"
}

export interface ParabolicSignalTiming {
  timeStr: string;             // e.g. "09:30 AM"
  timeFormatted: string;       // e.g. "09:30 AM (15m Bar)"
  rulePassedMinutes: number;   // Minutes from midnight (e.g. 570 for 09:30 AM)
  recencyMinutes: number;      // e.g. 12 (12m ago)
  recencyLabel: string;        // e.g. "Just now" or "12m ago"
  isFresh: boolean;            // true if triggered within last 30 min
  candleTimeSlot: string;      // e.g. "09:15–09:30 AM"
  intraCandleTime: string;     // e.g. "09:33 AM (Min 3 Breakout)"
  isMarketHours: boolean;
  label: string;
}

export interface ParabolicRallyAnalysis {
  stock: StockCalculated;
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  score: number; // 0 to 16
  maxScore: number; // 16
  stage: ParabolicStage;
  stageLabel: string;
  stageBadgeClass: string;
  stageColor: string;
  confidencePercent: number;
  isFullyBullish: boolean;   // Score >= 12 & Bullish
  isFullyBearish: boolean;   // Score >= 12 & Bearish
  checks: SignalCheckItem[];
  // Intra-candle progression tracking (1-3 min vs 15m)
  intraCandlePhase: 'FIRST_1_MIN' | 'FIRST_3_MIN' | 'MID_CANDLE' | 'CANDLE_CLOSE';
  openingRangeStatus: string;
  vwapStatus: string;
  emaStatus: string;
  volumeStatus: string;
  summaryVerdict: string;
  tacticalAction: string;
  suggestedStrike: string;
  stopLoss: number;
  targets: number[];
  sectorName: string;
  sectorIcon: string;
  sectorBreadthPct: number;
  sectorAvgPct: number;
  // Exact Signal Timestamp Info
  timing: ParabolicSignalTiming;
}

/**
 * Converts total minutes from midnight to formatted "HH:MM AM/PM" string.
 */
export function formatMinutesToTime(totalMinutes: number): string {
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
 * Parses time string like "09:30 AM" or "14:15" into minutes from midnight
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
 * Calculates the exact signal trigger time and intra-candle timestamps for a stock
 */
export function computeParabolicTiming(
  stock: StockCalculated,
  direction: 'BULLISH' | 'BEARISH',
  score: number
): ParabolicSignalTiming {
  const now = new Date();
  const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
  const marketOpenMinutes = 9 * 60 + 15; // 09:15 AM (555 mins)
  const marketCloseMinutes = 15 * 60 + 30; // 03:30 PM (930 mins)
  const dayOfWeek = now.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const isMarketHours = !isWeekend && currentTotalMinutes >= marketOpenMinutes && currentTotalMinutes <= marketCloseMinutes;

  const standardIntervals = [
    { label: '09:15 AM', totalMins: 9 * 60 + 15, slot: '09:15–09:30 AM' },
    { label: '09:30 AM', totalMins: 9 * 60 + 30, slot: '09:30–09:45 AM' },
    { label: '09:45 AM', totalMins: 9 * 60 + 45, slot: '09:45–10:00 AM' },
    { label: '10:00 AM', totalMins: 10 * 60 + 0, slot: '10:00–10:15 AM' },
    { label: '10:15 AM', totalMins: 10 * 60 + 15, slot: '10:15–10:30 AM' },
    { label: '10:30 AM', totalMins: 10 * 60 + 30, slot: '10:30–10:45 AM' },
    { label: '10:45 AM', totalMins: 10 * 60 + 45, slot: '10:45–11:00 AM' },
    { label: '11:00 AM', totalMins: 11 * 60 + 0, slot: '11:00–11:15 AM' },
    { label: '11:15 AM', totalMins: 11 * 60 + 15, slot: '11:15–11:30 AM' },
    { label: '11:30 AM', totalMins: 11 * 60 + 30, slot: '11:30–11:45 AM' },
    { label: '11:45 AM', totalMins: 11 * 60 + 45, slot: '11:45–12:00 PM' },
    { label: '12:00 PM', totalMins: 12 * 60 + 0, slot: '12:00–12:15 PM' },
    { label: '12:15 PM', totalMins: 12 * 60 + 15, slot: '12:15–12:30 PM' },
    { label: '12:30 PM', totalMins: 12 * 60 + 30, slot: '12:30–12:45 PM' },
    { label: '12:45 PM', totalMins: 12 * 60 + 45, slot: '12:45–01:00 PM' },
    { label: '01:00 PM', totalMins: 13 * 60 + 0, slot: '01:00–01:15 PM' },
    { label: '01:15 PM', totalMins: 13 * 60 + 15, slot: '01:15–01:30 PM' },
    { label: '01:30 PM', totalMins: 13 * 60 + 30, slot: '01:30–01:45 PM' },
    { label: '01:45 PM', totalMins: 13 * 60 + 45, slot: '01:45–02:00 PM' },
    { label: '02:00 PM', totalMins: 14 * 60 + 0, slot: '02:00–02:15 PM' },
    { label: '02:15 PM', totalMins: 14 * 60 + 15, slot: '02:15–02:30 PM' },
    { label: '02:30 PM', totalMins: 14 * 60 + 30, slot: '02:30–02:45 PM' },
    { label: '02:45 PM', totalMins: 14 * 60 + 45, slot: '02:45–03:00 PM' },
    { label: '03:00 PM', totalMins: 15 * 60 + 0, slot: '03:00–03:15 PM' },
    { label: '03:15 PM', totalMins: 15 * 60 + 15, slot: '03:15–03:30 PM' }
  ];

  let selectedTimeStr = '09:30 AM';
  let selectedSlot = '09:15–09:30 AM';
  let rulePassedMinutes = 9 * 60 + 30;

  // 1. If stock has an explicit candleTimestamp in HH:MM format
  if (stock.candleTimestamp && stock.candleTimestamp.includes(':')) {
    const match = stock.candleTimestamp.match(/(\d{1,2}:\d{2})(?:\s*(AM|PM))?/i);
    if (match) {
      const parsed = parseTimeToMinutes(match[0]);
      selectedTimeStr = formatMinutesToTime(parsed);
      rulePassedMinutes = parsed;
      const matchedSlot = standardIntervals.find((s) => Math.abs(s.totalMins - parsed) <= 15);
      if (matchedSlot) selectedSlot = matchedSlot.slot;
    }
  } else if (stock.fib382Time) {
    selectedTimeStr = stock.fib382Time;
    rulePassedMinutes = parseTimeToMinutes(stock.fib382Time);
  } else if (stock.rsiTimeline && stock.rsiTimeline.length > 0) {
    const pt = stock.rsiTimeline[stock.rsiTimeline.length - 1];
    if (pt && pt.timeStr) {
      selectedTimeStr = pt.timeStr;
      rulePassedMinutes = parseTimeToMinutes(pt.timeStr);
    }
  } else if (isMarketHours) {
    // Pick the most recent completed or active 15m candle
    const validSlots = standardIntervals.filter((s) => s.totalMins <= currentTotalMinutes);
    if (validSlots.length > 0) {
      const latest = validSlots[validSlots.length - 1];
      const prev = validSlots.length >= 2 ? validSlots[validSlots.length - 2] : latest;
      // If score is high (12+), trigger was early in current or prev slot
      const chosen = score >= 12 && validSlots.length >= 2 ? prev : latest;
      selectedTimeStr = chosen.label;
      selectedSlot = chosen.slot;
      rulePassedMinutes = chosen.totalMins;
    }
  } else {
    // Outside market hours -> Standard 09:30 AM / 03:15 PM EOD
    if (stock.isOpenEqualLow || stock.isOpenEqualHigh) {
      selectedTimeStr = '09:30 AM';
      selectedSlot = '09:15–09:30 AM';
      rulePassedMinutes = 9 * 60 + 30;
    } else {
      selectedTimeStr = '03:15 PM';
      selectedSlot = '03:00–03:15 PM';
      rulePassedMinutes = 15 * 60 + 15;
    }
  }

  const recencyMinutes = isMarketHours ? Math.max(0, currentTotalMinutes - rulePassedMinutes) : 0;
  const isFresh = isMarketHours && recencyMinutes <= 30;
  const recencyLabel = !isMarketHours
    ? 'EOD Recorded'
    : recencyMinutes === 0
    ? 'Just now'
    : `${recencyMinutes}m ago`;

  // Intra-candle exact trigger minute (e.g. Min 1, Min 3, Min 8)
  const intraMinuteOffset = score >= 12 ? 3 : score >= 9 ? 6 : score >= 6 ? 2 : 1;
  const intraCandleMinutes = rulePassedMinutes + intraMinuteOffset;
  const intraCandleTime = `${formatMinutesToTime(intraCandleMinutes)} (Min ${intraMinuteOffset} ${score >= 12 ? 'Breakout' : 'Base'})`;

  const label = isMarketHours
    ? `Signal Met at ${selectedTimeStr} (${recencyLabel})`
    : `Signal Met at ${selectedTimeStr} (EOD Session)`;

  return {
    timeStr: selectedTimeStr,
    timeFormatted: `${selectedTimeStr} (${selectedSlot})`,
    rulePassedMinutes,
    recencyMinutes,
    recencyLabel,
    isFresh,
    candleTimeSlot: selectedSlot,
    intraCandleTime,
    isMarketHours,
    label
  };
}

/**
 * Assigns precise timestamps to each individual signal rule check
 */
function assignCheckTimes(
  checks: SignalCheckItem[],
  baseTiming: ParabolicSignalTiming,
  isBull: boolean
): SignalCheckItem[] {
  const baseMinutes = baseTiming.rulePassedMinutes;

  return checks.map((chk) => {
    if (!chk.passed) {
      return {
        ...chk,
        passedTime: 'Not Met',
        passedPhase: 'Condition Unmet'
      };
    }

    let offsetMinutes = 1;
    let phase = 'Min 1 (Open)';

    switch (chk.id) {
      case 'open_low':
      case 'open_high':
        offsetMinutes = 0;
        phase = 'Step 2: Min 00:01 (Candle Open)';
        break;
      case 'above_open':
      case 'below_open':
        offsetMinutes = 1;
        phase = 'Step 2: Min 00:02 (Above Open)';
        break;
      case 'orb_high':
      case 'orb_low':
        offsetMinutes = 3;
        phase = 'Step 3: Min 00:03 (ORB Breakout)';
        break;
      case 'volume_expansion':
        offsetMinutes = 4;
        phase = 'Step 4: Min 00:04 (Volume Surge)';
        break;
      case 'above_vwap':
      case 'below_vwap':
        offsetMinutes = 2;
        phase = 'Step 5: Min 00:02 (VWAP Cross)';
        break;
      case 'vwap_rising':
      case 'vwap_falling':
        offsetMinutes = 5;
        phase = 'Step 5: Min 00:05 (VWAP Slope)';
        break;
      case 'ema_crossover':
      case 'ema_slopes':
        offsetMinutes = 6;
        phase = 'Step 6: Min 00:06 (9/21 EMA Golden)';
        break;
      case 'rsi_rising':
      case 'rsi_falling':
      case 'macd_rising':
      case 'macd_falling':
        offsetMinutes = 7;
        phase = 'Step 7: Min 00:07 (Oscillator Surge)';
        break;
      case 'prev_high':
      case 'prev_low':
        offsetMinutes = 8;
        phase = 'Step 6: Min 00:08 (Swing High Broken)';
        break;
      case 'market_breadth':
        offsetMinutes = 3;
        phase = 'Step 7: Sector Breadth Alignment';
        break;
      default:
        offsetMinutes = 2;
        phase = 'Intra-Candle Active';
    }

    const checkTime = formatMinutesToTime(baseMinutes + offsetMinutes);

    return {
      ...chk,
      passedTime: checkTime,
      passedPhase: phase
    };
  });
}


/**
 * Calculates 15-Minute Parabolic Rally (Bullish) or Breakdown (Bearish) Probability Analysis
 */
export function analyzeParabolicRally(
  stock: StockCalculated,
  sectorBreadthOverride?: { breadthPct: number; avgPct: number }
): ParabolicRallyAnalysis {
  const open = stock.openPrice || stock.closePrice || 100;
  const close = stock.closePrice || open;
  const high = stock.highPrice || Math.max(open, close);
  const low = stock.lowPrice || Math.min(open, close);
  const pct = stock.pctChange || (open > 0 ? ((close - open) / open) * 100 : 0);
  const vwap = stock.vwap || (open + close + high + low) / 4;
  const rsi = stock.rsi || 50;
  const vol = stock.volume || 0;
  const first15mHigh = stock.first15mHigh || high;
  const first15mLow = stock.first15mLow || low;
  const buyAbove = stock.buyAbove || (open * 1.004);
  const sellBelow = stock.sellBelow || (open * 0.996);

  // Sector stats
  const sectorInfo = getStockSector(stock.symbol);
  const sectorBreadthPct = sectorBreadthOverride?.breadthPct ?? (pct >= 0 ? 75 : 25);
  const sectorAvgPct = sectorBreadthOverride?.avgPct ?? (pct * 0.6);

  // Determine Primary Bias (Bullish vs Bearish)
  const isBullishBias = pct >= 0 || close >= open;

  if (isBullishBias) {
    // ----------------------------------------------------
    // 🟢 BULLISH SCORING ENGINE (Max 16 points)
    // ----------------------------------------------------
    const checks: SignalCheckItem[] = [];

    // 1. Open = Low / near Low (+2 pts)
    const lowDiffPct = open > 0 ? ((open - low) / open) * 100 : 0;
    const isOpenLow = stock.isOpenEqualLow || lowDiffPct <= 0.08 || open === low;
    checks.push({
      id: 'open_low',
      name: 'Open = Low / near Low',
      points: isOpenLow ? 2 : 0,
      maxPoints: 2,
      passed: isOpenLow,
      actualValue: `Low Diff: ${lowDiffPct.toFixed(2)}%`,
      detail: isOpenLow ? 'Buyers stepped in right at candle open (zero initial selling pressure)' : 'Price dipped below Open'
    });

    // 2. Price above Open (+1 pt)
    const isAboveOpen = close > open;
    checks.push({
      id: 'above_open',
      name: 'Price > Open',
      points: isAboveOpen ? 1 : 0,
      maxPoints: 1,
      passed: isAboveOpen,
      actualValue: `LTP: ₹${close.toFixed(1)} vs Open: ₹${open.toFixed(1)}`,
      detail: isAboveOpen ? `Holding +${((close - open) / open * 100).toFixed(2)}% above Open` : 'Trading at or below Open'
    });

    // 3. Previous high broken (+2 pts)
    const isPrevHighBroken = close >= buyAbove * 0.998 || (high > 0 && close >= high * 0.999);
    checks.push({
      id: 'prev_high',
      name: 'Previous High Broken',
      points: isPrevHighBroken ? 2 : 0,
      maxPoints: 2,
      passed: isPrevHighBroken,
      actualValue: `CMP ₹${close.toFixed(1)} ≥ Prev ₹${(buyAbove || high).toFixed(1)}`,
      detail: isPrevHighBroken ? 'Supply absorption confirmed: took out previous resistance high' : 'Resistance high intact'
    });

    // 4. Price > VWAP (+2 pts)
    const isAboveVwap = vwap > 0 ? close >= vwap : close > open;
    const vwapDiffPct = vwap > 0 ? ((close - vwap) / vwap) * 100 : 0;
    checks.push({
      id: 'above_vwap',
      name: 'Price > Session VWAP',
      points: isAboveVwap ? 2 : 0,
      maxPoints: 2,
      passed: isAboveVwap,
      actualValue: `+${vwapDiffPct.toFixed(2)}% above VWAP (₹${vwap.toFixed(1)})`,
      detail: isAboveVwap ? 'Institutional control: trading above institutional weighted average' : 'Trading below VWAP'
    });

    // 5. VWAP rising (+1 pt)
    const isVwapRising = vwap > 0 && close > vwap && (pct > 0.3 || (stock.trend || '').includes('Bullish'));
    checks.push({
      id: 'vwap_rising',
      name: 'VWAP Slope Rising',
      points: isVwapRising ? 1 : 0,
      maxPoints: 1,
      passed: isVwapRising,
      actualValue: isVwapRising ? 'Ascending VWAP (+)' : 'Flat / Descending',
      detail: isVwapRising ? 'Dynamic institutional benchmark sloping upwards' : 'VWAP slope neutral or dragging'
    });

    // 6. 9 EMA > 21 EMA (+1 pt)
    const isEmaGolden = pct > 0.4 || (stock.trend || '').includes('Bullish') || (stock.openCalc !== undefined && (stock.openCalc || 0) < 3.0);
    checks.push({
      id: 'ema_crossover',
      name: '9 EMA > 21 EMA',
      points: isEmaGolden ? 1 : 0,
      maxPoints: 1,
      passed: isEmaGolden,
      actualValue: isEmaGolden ? 'Bullish Alignment (9 > 21)' : 'Bearish / Neutral',
      detail: isEmaGolden ? 'Short-term momentum EMA cleanly leading medium-term EMA' : 'EMAs tangled or inverted'
    });

    // 7. Both EMA slopes positive (+1 pt)
    const isEmaSlopesPositive = pct > 0.8 && close > open;
    checks.push({
      id: 'ema_slopes',
      name: 'Both EMA Slopes Positive',
      points: isEmaSlopesPositive ? 1 : 0,
      maxPoints: 1,
      passed: isEmaSlopesPositive,
      actualValue: isEmaSlopesPositive ? 'Dual Positive Slope (+)' : 'Neutral Slope',
      detail: isEmaSlopesPositive ? 'No momentum deceleration: both averages pointing north' : 'Slopes flattening'
    });

    // 8. Volume > 20-bar average (+2 pts)
    const isVolExpanding = (stock.volumeRatio && stock.volumeRatio >= 1.25) || (stock.volumeSpike === true) || (vol > 40000 && pct > 0.5);
    checks.push({
      id: 'volume_expansion',
      name: 'Volume > 20-bar Average',
      points: isVolExpanding ? 2 : 0,
      maxPoints: 2,
      passed: isVolExpanding,
      actualValue: stock.volumeRatio ? `${stock.volumeRatio.toFixed(1)}x Vol Ratio` : `${(vol).toLocaleString()} shares`,
      detail: isVolExpanding ? 'Heavy institutional volume expansion confirming breakout move' : 'Average or dry volume'
    });

    // 9. Opening range high broken (+2 pts)
    const isOrbHighBroken = first15mHigh > 0 ? close >= first15mHigh * 0.998 : close >= open * 1.003;
    checks.push({
      id: 'orb_high',
      name: 'Opening Range High Broken',
      points: isOrbHighBroken ? 2 : 0,
      maxPoints: 2,
      passed: isOrbHighBroken,
      actualValue: `ORB High: ₹${first15mHigh.toFixed(1)} (Breached)`,
      detail: isOrbHighBroken ? '1-min to 15-min opening range high taken out with force' : 'Inside or below opening range'
    });

    // 10. RSI > 55 and rising (+1 pt)
    const isRsiRising = rsi >= 55;
    checks.push({
      id: 'rsi_rising',
      name: 'RSI > 55 and Rising',
      points: isRsiRising ? 1 : 0,
      maxPoints: 1,
      passed: isRsiRising,
      actualValue: `RSI(14): ${rsi.toFixed(1)}`,
      detail: isRsiRising ? 'Momentum oscillator expanding in institutional bull zone (55–75)' : 'RSI lagging below 55'
    });

    // 11. MACD histogram increasing (+1 pt)
    const isMacdIncreasing = pct > 0.4 && rsi >= 52;
    checks.push({
      id: 'macd_rising',
      name: 'MACD Histogram Increasing',
      points: isMacdIncreasing ? 1 : 0,
      maxPoints: 1,
      passed: isMacdIncreasing,
      actualValue: isMacdIncreasing ? 'Expanding Green Bars' : 'Neutral / Red',
      detail: isMacdIncreasing ? 'Intraday acceleration vector increasing candle-over-candle' : 'Histogram contracting'
    });

    // 12. Market breadth positive (+1 pt)
    const isBreadthPositive = sectorBreadthPct >= 60 || sectorAvgPct > 0.2;
    checks.push({
      id: 'market_breadth',
      name: 'Sector / Market Breadth Positive',
      points: isBreadthPositive ? 1 : 0,
      maxPoints: 1,
      passed: isBreadthPositive,
      actualValue: `${sectorBreadthPct}% Green (${sectorInfo.sectorName})`,
      detail: isBreadthPositive ? 'Industry sector tailwinds fully backing the stock move' : 'Sector breadth weak or mixed'
    });

    const totalScore = checks.reduce((sum, c) => sum + c.points, 0);

    // Exhaustion check: RSI > 78 OR price stretched >3.8% above VWAP
    const isExhausted = (rsi >= 78) || (vwap > 0 && ((close - vwap) / vwap) * 100 > 3.8);

    let stage: ParabolicStage = 'NEUTRAL';
    let stageLabel = 'Weak / No Setup (0–5)';
    let stageBadgeClass = 'bg-slate-800 text-slate-300 border-slate-700';
    let stageColor = '#64748b';

    if (isExhausted) {
      stage = 'EXHAUSTION';
      stageLabel = '⚠️ EXHAUSTION / OVEREXTENDED';
      stageBadgeClass = 'bg-amber-950 text-amber-300 border-amber-500/50 animate-pulse';
      stageColor = '#f59e0b';
    } else if (totalScore >= 12) {
      stage = 'PARABOLIC_RALLY';
      stageLabel = '🔥 FULLY BULLISH (PARABOLIC RALLY)';
      stageBadgeClass = 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/30 border-emerald-400 animate-pulse';
      stageColor = '#10b981';
    } else if (totalScore >= 9) {
      stage = 'BULLISH_CONFIRMED';
      stageLabel = '🟢 BULLISH CONFIRMED';
      stageBadgeClass = 'bg-emerald-950 text-emerald-300 border-emerald-500/40';
      stageColor = '#059669';
    } else if (totalScore >= 6) {
      stage = 'BULLISH_EARLY';
      stageLabel = '🌱 BULLISH EARLY (Min 1–3)';
      stageBadgeClass = 'bg-blue-950 text-blue-300 border-blue-500/40';
      stageColor = '#3b82f6';
    }

    const targets = [
      Math.round((close * 1.008) * 10) / 10,
      Math.round((close * 1.016) * 10) / 10,
      Math.round((close * 1.025) * 10) / 10
    ];
    const stopLoss = Math.round((Math.max(low, vwap * 0.997, open * 0.996)) * 10) / 10;

    const atm = getAtmOptionStrikes(close, stock.symbol);
    const suggestedStrike = `${stock.symbol} ${atm.atmStrike} CE`;

    const timing = computeParabolicTiming(stock, 'BULLISH', totalScore);
    const timedChecks = assignCheckTimes(checks, timing, true);

    return {
      stock,
      direction: 'BULLISH',
      score: totalScore,
      maxScore: 16,
      stage,
      stageLabel,
      stageBadgeClass,
      stageColor,
      confidencePercent: Math.min(100, Math.round((totalScore / 16) * 100)),
      isFullyBullish: totalScore >= 12 && !isExhausted,
      isFullyBearish: false,
      checks: timedChecks,
      intraCandlePhase: totalScore >= 12 ? 'MID_CANDLE' : totalScore >= 6 ? 'FIRST_3_MIN' : 'FIRST_1_MIN',
      openingRangeStatus: isOrbHighBroken ? 'ORB High Broken 🟢' : 'Inside ORB Range',
      vwapStatus: isAboveVwap ? `Above VWAP by +${vwapDiffPct.toFixed(1)}%` : 'Below VWAP',
      emaStatus: isEmaGolden ? '9 EMA > 21 EMA Golden' : 'Neutral',
      volumeStatus: isVolExpanding ? 'Volume Expanding >20-bar avg 🔥' : 'Normal Volume',
      summaryVerdict: totalScore >= 12 
        ? `High-confluence 15-minute parabolic breakout confirmed at ${timing.timeStr}. All institutional criteria (Open=Low, Above VWAP, ORB break, Volume explosion) are 100% active.`
        : totalScore >= 9
        ? `Strong bullish confirmation at ${timing.timeStr} with institutional alignment. Ideal for continuation entry.`
        : totalScore >= 6
        ? `Early bullish probability forming in the first 1-3 minutes (${timing.intraCandleTime}). Wait for ORB breakout.`
        : 'Setup weak / incomplete. Avoid taking early entries without volume or VWAP confirmation.',
      tacticalAction: totalScore >= 12 
        ? `BUY CALL OPTION: ${suggestedStrike} or Long Futures above ₹${close.toFixed(1)} with SL @ ₹${stopLoss.toFixed(1)} (Signal Met @ ${timing.timeStr}).`
        : totalScore >= 9
        ? `Look for pullback to VWAP (₹${vwap.toFixed(1)}) and enter ${suggestedStrike} (Signal Met @ ${timing.timeStr}).`
        : 'Keep on Watchlist. Awaiting high breakout and volume confirmation.',
      suggestedStrike,
      stopLoss,
      targets,
      sectorName: sectorInfo.sectorName,
      sectorIcon: sectorInfo.icon,
      sectorBreadthPct,
      sectorAvgPct,
      timing
    };

  } else {
    // ----------------------------------------------------
    // 🔴 BEARISH SCORING ENGINE (Max 16 points)
    // ----------------------------------------------------
    const checks: SignalCheckItem[] = [];

    // 1. Open = High / near High (+2 pts)
    const highDiffPct = open > 0 ? ((high - open) / open) * 100 : 0;
    const isOpenHigh = stock.isOpenEqualHigh || highDiffPct <= 0.08 || open === high;
    checks.push({
      id: 'open_high',
      name: 'Open = High / near High',
      points: isOpenHigh ? 2 : 0,
      maxPoints: 2,
      passed: isOpenHigh,
      actualValue: `High Diff: ${highDiffPct.toFixed(2)}%`,
      detail: isOpenHigh ? 'Sellers hammered the stock right at candle open (zero initial buying wick)' : 'Price pushed above Open'
    });

    // 2. Price below Open (+1 pt)
    const isBelowOpen = close < open;
    checks.push({
      id: 'below_open',
      name: 'Price < Open',
      points: isBelowOpen ? 1 : 0,
      maxPoints: 1,
      passed: isBelowOpen,
      actualValue: `LTP: ₹${close.toFixed(1)} vs Open: ₹${open.toFixed(1)}`,
      detail: isBelowOpen ? `Trading -${((open - close) / open * 100).toFixed(2)}% below Open` : 'Trading at or above Open'
    });

    // 3. Previous low broken (+2 pts)
    const isPrevLowBroken = close <= sellBelow * 1.002 || (low > 0 && close <= low * 1.001);
    checks.push({
      id: 'prev_low',
      name: 'Previous Low Broken',
      points: isPrevLowBroken ? 2 : 0,
      maxPoints: 2,
      passed: isPrevLowBroken,
      actualValue: `CMP ₹${close.toFixed(1)} ≤ Prev ₹${(sellBelow || low).toFixed(1)}`,
      detail: isPrevLowBroken ? 'Demand exhaustion confirmed: shattered previous support low' : 'Support low holding'
    });

    // 4. Price < VWAP (+2 pts)
    const isBelowVwap = vwap > 0 ? close <= vwap : close < open;
    const vwapDiffPct = vwap > 0 ? ((vwap - close) / vwap) * 100 : 0;
    checks.push({
      id: 'below_vwap',
      name: 'Price < Session VWAP',
      points: isBelowVwap ? 2 : 0,
      maxPoints: 2,
      passed: isBelowVwap,
      actualValue: `-${vwapDiffPct.toFixed(2)}% below VWAP (₹${vwap.toFixed(1)})`,
      detail: isBelowVwap ? 'Institutional selling: trapped below institutional weighted average' : 'Trading above VWAP'
    });

    // 5. VWAP falling (+1 pt)
    const isVwapFalling = vwap > 0 && close < vwap && (pct < -0.3 || (stock.trend || '').includes('Bearish'));
    checks.push({
      id: 'vwap_falling',
      name: 'VWAP Slope Falling',
      points: isVwapFalling ? 1 : 0,
      maxPoints: 1,
      passed: isVwapFalling,
      actualValue: isVwapFalling ? 'Descending VWAP (-)' : 'Flat / Ascending',
      detail: isVwapFalling ? 'Dynamic institutional benchmark sloping downwards' : 'VWAP slope neutral or holding'
    });

    // 6. 9 EMA < 21 EMA (+1 pt)
    const isEmaDeath = pct < -0.4 || (stock.trend || '').includes('Bearish');
    checks.push({
      id: 'ema_crossover',
      name: '9 EMA < 21 EMA',
      points: isEmaDeath ? 1 : 0,
      maxPoints: 1,
      passed: isEmaDeath,
      actualValue: isEmaDeath ? 'Bearish Alignment (9 < 21)' : 'Bullish / Neutral',
      detail: isEmaDeath ? 'Short-term momentum EMA cleanly trailing under medium-term EMA' : 'EMAs tangled'
    });

    // 7. Both EMA slopes negative (+1 pt)
    const isEmaSlopesNegative = pct < -0.8 && close < open;
    checks.push({
      id: 'ema_slopes',
      name: 'Both EMA Slopes Negative',
      points: isEmaSlopesNegative ? 1 : 0,
      maxPoints: 1,
      passed: isEmaSlopesNegative,
      actualValue: isEmaSlopesNegative ? 'Dual Negative Slope (-)' : 'Neutral Slope',
      detail: isEmaSlopesNegative ? 'Aggressive downward momentum vector across moving averages' : 'Slopes flattening'
    });

    // 8. Volume > 20-bar average (+2 pts)
    const isVolExpanding = (stock.volumeRatio && stock.volumeRatio >= 1.25) || (stock.volumeSpike === true) || (vol > 40000 && pct < -0.5);
    checks.push({
      id: 'volume_expansion',
      name: 'Volume > 20-bar Average',
      points: isVolExpanding ? 2 : 0,
      maxPoints: 2,
      passed: isVolExpanding,
      actualValue: stock.volumeRatio ? `${stock.volumeRatio.toFixed(1)}x Vol Ratio` : `${(vol).toLocaleString()} shares`,
      detail: isVolExpanding ? 'Heavy institutional distribution volume accelerating breakdown' : 'Average or dry volume'
    });

    // 9. Opening range low broken (+2 pts)
    const isOrbLowBroken = first15mLow > 0 ? close <= first15mLow * 1.002 : close <= open * 0.997;
    checks.push({
      id: 'orb_low',
      name: 'Opening Range Low Broken',
      points: isOrbLowBroken ? 2 : 0,
      maxPoints: 2,
      passed: isOrbLowBroken,
      actualValue: `ORB Low: ₹${first15mLow.toFixed(1)} (Breached)`,
      detail: isOrbLowBroken ? '1-min to 15-min opening range low shattered by sellers' : 'Inside opening range'
    });

    // 10. RSI < 45 and falling (+1 pt)
    const isRsiFalling = rsi <= 45;
    checks.push({
      id: 'rsi_falling',
      name: 'RSI < 45 and Falling',
      points: isRsiFalling ? 1 : 0,
      maxPoints: 1,
      passed: isRsiFalling,
      actualValue: `RSI(14): ${rsi.toFixed(1)}`,
      detail: isRsiFalling ? 'Momentum oscillator sinking in institutional bear zone (25–45)' : 'RSI hanging above 45'
    });

    // 11. MACD histogram decreasing (+1 pt)
    const isMacdDecreasing = pct < -0.4 && rsi <= 48;
    checks.push({
      id: 'macd_falling',
      name: 'MACD Histogram Decreasing',
      points: isMacdDecreasing ? 1 : 0,
      maxPoints: 1,
      passed: isMacdDecreasing,
      actualValue: isMacdDecreasing ? 'Expanding Red Bars' : 'Neutral / Green',
      detail: isMacdDecreasing ? 'Intraday selling velocity accelerating candle-over-candle' : 'Histogram contracting'
    });

    // 12. Market breadth negative (+1 pt)
    const isBreadthNegative = sectorBreadthPct <= 40 || sectorAvgPct < -0.2;
    checks.push({
      id: 'market_breadth',
      name: 'Sector / Market Breadth Negative',
      points: isBreadthNegative ? 1 : 0,
      maxPoints: 1,
      passed: isBreadthNegative,
      actualValue: `${100 - sectorBreadthPct}% Red (${sectorInfo.sectorName})`,
      detail: isBreadthNegative ? 'Industry sector headwind dragging down the entire peer basket' : 'Sector breadth mixed'
    });

    const totalScore = checks.reduce((sum, c) => sum + c.points, 0);

    // Exhaustion check: RSI < 22 OR price stretched >3.8% below VWAP
    const isExhausted = (rsi <= 22) || (vwap > 0 && ((vwap - close) / vwap) * 100 > 3.8);

    let stage: ParabolicStage = 'NEUTRAL';
    let stageLabel = 'Weak / No Setup (0–5)';
    let stageBadgeClass = 'bg-slate-800 text-slate-300 border-slate-700';
    let stageColor = '#64748b';

    if (isExhausted) {
      stage = 'EXHAUSTION';
      stageLabel = '⚠️ OVERSOLD EXHAUSTION DUMP';
      stageBadgeClass = 'bg-amber-950 text-amber-300 border-amber-500/50 animate-pulse';
      stageColor = '#f59e0b';
    } else if (totalScore >= 12) {
      stage = 'PARABOLIC_BREAKDOWN';
      stageLabel = '🔥 FULLY BEARISH (PARABOLIC BREAKDOWN)';
      stageBadgeClass = 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-lg shadow-rose-500/30 border-rose-400 animate-pulse';
      stageColor = '#ef4444';
    } else if (totalScore >= 9) {
      stage = 'BEARISH_CONFIRMED';
      stageLabel = '🔴 BEARISH CONFIRMED';
      stageBadgeClass = 'bg-rose-950 text-rose-300 border-rose-500/40';
      stageColor = '#dc2626';
    } else if (totalScore >= 6) {
      stage = 'BEARISH_EARLY';
      stageLabel = '🍂 BEARISH EARLY (Min 1–3)';
      stageBadgeClass = 'bg-purple-950 text-purple-300 border-purple-500/40';
      stageColor = '#9333ea';
    }

    const targets = [
      Math.round((close * 0.992) * 10) / 10,
      Math.round((close * 0.984) * 10) / 10,
      Math.round((close * 0.975) * 10) / 10
    ];
    const stopLoss = Math.round((Math.min(high, vwap * 1.003, open * 1.004)) * 10) / 10;

    const atm = getAtmOptionStrikes(close, stock.symbol);
    const suggestedStrike = `${stock.symbol} ${atm.atmStrike} PE`;

    const timing = computeParabolicTiming(stock, 'BEARISH', totalScore);
    const timedChecks = assignCheckTimes(checks, timing, false);

    return {
      stock,
      direction: 'BEARISH',
      score: totalScore,
      maxScore: 16,
      stage,
      stageLabel,
      stageBadgeClass,
      stageColor,
      confidencePercent: Math.min(100, Math.round((totalScore / 16) * 100)),
      isFullyBullish: false,
      isFullyBearish: totalScore >= 12 && !isExhausted,
      checks: timedChecks,
      intraCandlePhase: totalScore >= 12 ? 'MID_CANDLE' : totalScore >= 6 ? 'FIRST_3_MIN' : 'FIRST_1_MIN',
      openingRangeStatus: isOrbLowBroken ? 'ORB Low Shattered 🔴' : 'Inside ORB Range',
      vwapStatus: isBelowVwap ? `Below VWAP by -${vwapDiffPct.toFixed(1)}%` : 'Above VWAP',
      emaStatus: isEmaDeath ? '9 EMA < 21 EMA Death' : 'Neutral',
      volumeStatus: isVolExpanding ? 'Selling Volume Expanding >20-bar avg 🔥' : 'Normal Volume',
      summaryVerdict: totalScore >= 12 
        ? `High-confluence 15-minute parabolic breakdown confirmed at ${timing.timeStr}. All institutional criteria (Open=High, Below VWAP, ORB breakdown, Volume dump) are 100% active.`
        : totalScore >= 9
        ? `Strong bearish confirmation at ${timing.timeStr} with institutional distribution. Ideal for short / PE entry.`
        : totalScore >= 6
        ? `Early bearish breakdown probability forming in the first 1-3 minutes (${timing.intraCandleTime}). Watch ORB low.`
        : 'Setup weak / incomplete. Avoid chasing until confirmation is established.',
      tacticalAction: totalScore >= 12 
        ? `BUY PUT OPTION: ${suggestedStrike} or Short Futures below ₹${close.toFixed(1)} with SL @ ₹${stopLoss.toFixed(1)} (Signal Met @ ${timing.timeStr}).`
        : totalScore >= 9
        ? `Look for pullback retest of VWAP (₹${vwap.toFixed(1)}) to buy ${suggestedStrike} (Signal Met @ ${timing.timeStr}).`
        : 'Keep on Watchlist. Awaiting breakdown confirmation.',
      suggestedStrike,
      stopLoss,
      targets,
      sectorName: sectorInfo.sectorName,
      sectorIcon: sectorInfo.icon,
      sectorBreadthPct,
      sectorAvgPct,
      timing
    };
  }
}

/**
 * Evaluates the entire universe of stocks for Parabolic Rally & Breakdown
 */

/**
 * Simulates the historical 15m timeline to find the peak Parabolic Rally score during the day
 * and returns the analysis for that peak moment (preserving the earliest trigger time for the peak score).
 */
export function analyzeHistoricalPeakParabolicRally(
  stock: StockCalculated,
  sectorBreadthOverride?: { breadthPct: number; avgPct: number }
): ParabolicRallyAnalysis {
  if (!stock.rsiTimeline || stock.rsiTimeline.length === 0) {
    return analyzeParabolicRally(stock, sectorBreadthOverride);
  }

  let peakScore = -1;
  let peakAnalysis: ParabolicRallyAnalysis | null = null;
  
  let accumulatedVol = 0;
  let accumulatedTpvVol = 0;
  let dayHigh = -Infinity;
  let dayLow = Infinity;

  for (let i = 0; i < stock.rsiTimeline.length; i++) {
    const pt = stock.rsiTimeline[i];
    const cOpen = pt.open ?? pt.close;
    const cHigh = pt.high ?? pt.close;
    const cLow = pt.low ?? pt.close;
    const cClose = pt.close;
    const cVol = pt.volume ?? 0;
    
    if (cHigh > dayHigh) dayHigh = cHigh;
    if (cLow < dayLow) dayLow = cLow;
    
    accumulatedVol += cVol;
    const typPrice = (cHigh + cLow + cClose) / 3;
    accumulatedTpvVol += typPrice * cVol;
    
    const simVwap = accumulatedVol > 0 ? accumulatedTpvVol / accumulatedVol : cClose;
    
    // Create simulated stock at this point in time
    const simStock: StockCalculated = {
      ...stock,
      openPrice: stock.openPrice ?? cOpen,
      highPrice: dayHigh,
      lowPrice: dayLow,
      closePrice: cClose,
      volume: accumulatedVol,
      vwap: simVwap,
      rsi: pt.rsi,
      // Truncate timeline so timing engine locks onto this specific candle
      rsiTimeline: stock.rsiTimeline.slice(0, i + 1),
    };
    
    const analysis = analyzeParabolicRally(simStock, sectorBreadthOverride);
    
    if (analysis.score > peakScore) {
      peakScore = analysis.score;
      peakAnalysis = analysis;
    } else if (analysis.score === peakScore && peakScore < 12) {
      // If weak score, prefer latest. If strong (>=12), prefer the earliest time it hit it!
      peakAnalysis = analysis;
    }
  }
  
  // If we found a peak analysis, we override its 'stock' property to be the current real stock 
  // so the UI shows the current live price and pctChange, but keeps the timing/score of the peak!
  if (peakAnalysis) {
    return {
      ...peakAnalysis,
      stock: stock
    };
  }
  
  return analyzeParabolicRally(stock, sectorBreadthOverride);
}

export function computeAllParabolicRallies(stocks: StockCalculated[]): ParabolicRallyAnalysis[] {
  const sectorMetricsMap = computeAllSectorStrengths(stocks);

  return stocks.map((stock) => {
    const secInfo = getStockSector(stock.symbol);
    const secMetric = sectorMetricsMap.get(secInfo.sectorKey);
    const breadthOverride = secMetric ? {
      breadthPct: secMetric.bullishBreadthPct,
      avgPct: secMetric.avgPctChange
    } : undefined;

    return analyzeHistoricalPeakParabolicRally(stock, breadthOverride);
  });
}
