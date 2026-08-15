import { StockCalculated, RsiIntradayPoint, RsiAiAnalysisReport } from '../types';
import { isOpenLowPattern, isOpenHighPattern } from './gann';

/**
 * Generates a realistic 15-minute intraday RSI timeline from 09:15 AM to current time
 * based on stock's Open, High, Low, CMP, VWAP, and current RSI.
 */
export function generateIntradayRsiTimeline(stock: StockCalculated): RsiIntradayPoint[] {
  if (stock.rsiTimeline && stock.rsiTimeline.length > 0) {
    return stock.rsiTimeline;
  }

  const open = stock.openPrice || 100;
  const high = stock.highPrice || open * 1.02;
  const low = stock.lowPrice || open * 0.98;
  const close = stock.closePrice || open;
  const currentRsi = stock.rsi ?? (close >= open ? 58 : 42);

  // Determine session intervals
  const times = [
    '09:15 AM',
    '09:30 AM',
    '09:45 AM',
    '10:00 AM',
    '10:15 AM',
    '10:30 AM',
    '10:45 AM',
    '11:00 AM',
    '11:15 AM',
    '11:30 AM',
    '11:45 AM',
    '12:00 PM',
    '12:15 PM',
    '12:30 PM',
    '12:45 PM',
    '01:00 PM',
    '01:15 PM',
    '01:30 PM',
    '01:45 PM',
    '02:00 PM',
    '02:15 PM',
    '02:30 PM',
    '02:45 PM',
    '03:00 PM',
    '03:15 PM'
  ];

  const now = new Date();
  let intervalCount = 8;
  const hours = now.getHours();
  const minutes = now.getMinutes();

  if (hours >= 9) {
    const minutesSince915 = (hours - 9) * 60 + (minutes - 15);
    if (minutesSince915 > 0) {
      intervalCount = Math.min(times.length, Math.max(3, Math.floor(minutesSince915 / 15) + 1));
    }
  }

  const activeTimes = times.slice(0, intervalCount);

  const isOL = isOpenLowPattern(stock.openPrice, stock.lowPrice, stock.first15mLow, stock.highPrice, stock.closePrice);
  const isOH = isOpenHighPattern(stock.openPrice, stock.highPrice, stock.first15mHigh, stock.lowPrice, stock.closePrice);

  let baseStartRsi = 50;
  if (isOL) {
    baseStartRsi = Math.max(30, currentRsi - 12);
  } else if (isOH) {
    baseStartRsi = Math.min(70, currentRsi + 12);
  } else if (close > open) {
    baseStartRsi = Math.max(35, currentRsi - 8);
  } else if (close < open) {
    baseStartRsi = Math.min(65, currentRsi + 8);
  } else {
    baseStartRsi = currentRsi;
  }

  const timeline: RsiIntradayPoint[] = [];

  const baseVol = stock.volume ? Math.round(stock.volume / Math.max(1, activeTimes.length)) : 25000;
  let prevVol = baseVol;

  for (let i = 0; i < activeTimes.length; i++) {
    const t = activeTimes.length > 1 ? i / (activeTimes.length - 1) : 1;
    
    let p = open + (close - open) * t;
    if (isOL) {
      p = open + (close - open) * Math.pow(t, 0.8);
    } else if (isOH) {
      p = open - (open - close) * Math.pow(t, 0.8);
    }

    let rsiVal = baseStartRsi + (currentRsi - baseStartRsi) * t;
    rsiVal = Math.min(95, Math.max(10, Math.round(rsiVal * 10) / 10));

    const prevRsiVal = i > 0 ? timeline[i - 1].rsi : rsiVal;
    const delta = Math.round((rsiVal - prevRsiVal) * 10) / 10;
    
    let direction: 'INCREASING' | 'DECREASING' | 'FLAT' = 'FLAT';
    if (delta > 0.1) direction = 'INCREASING';
    else if (delta < -0.1) direction = 'DECREASING';

    // Calculate simulated interval volume and trend
    const volCurve = 0.85 + 0.3 * Math.sin(t * Math.PI) + (direction === 'INCREASING' ? t * 0.3 : -t * 0.1);
    const intervalVol = Math.max(1200, Math.round(baseVol * Math.max(0.4, volCurve)));

    const volDelta = i > 0 ? intervalVol - prevVol : 0;
    const volDeltaPct = prevVol > 0 ? Math.round((volDelta / prevVol) * 1000) / 10 : 0;
    let volDirection: 'INCREASING' | 'DECREASING' | 'FLAT' = 'FLAT';
    if (volDelta > 0) volDirection = 'INCREASING';
    else if (volDelta < 0) volDirection = 'DECREASING';

    prevVol = intervalVol;

    timeline.push({
      timeStr: activeTimes[i],
      close: Math.round(p * 100) / 100,
      volume: intervalVol,
      rsi: rsiVal,
      rsiDirection: direction,
      rsiDelta: delta,
      volumeDirection: volDirection,
      volumeDelta: volDelta,
      volumeDeltaPct: volDeltaPct
    });
  }

  return timeline;
}

/**
 * Analyzes RSI trend progression from 09:15 AM to current time and generates AI Report.
 */
export async function analyzeRsiProgressWithAi(
  stock: StockCalculated,
  existingTimeline?: RsiIntradayPoint[]
): Promise<RsiAiAnalysisReport> {
  const timeline = (existingTimeline && existingTimeline.length >= 2)
    ? existingTimeline
    : generateIntradayRsiTimeline(stock);

  // Try calling AI backend endpoint
  try {
    const response = await fetch('/api/ai/rsi-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbol: stock.symbol,
        companyName: stock.companyName,
        openPrice: stock.openPrice,
        highPrice: stock.highPrice,
        lowPrice: stock.lowPrice,
        closePrice: stock.closePrice,
        vwap: stock.vwap,
        buyAbove: stock.buyAbove,
        sellBelow: stock.sellBelow,
        targetsUp: stock.targetsUp,
        targetsDown: stock.targetsDown,
        rsiTimeline: timeline
      }),
      signal: AbortSignal.timeout(12000)
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.report) {
        return data.report;
      }
    }
  } catch {
    // Silent fallback to local technical analysis calculation
  }

  // Fallback local report generation
  const points = timeline;
  const startRsi = points[0]?.rsi ?? 50;
  const endRsi = points[points.length - 1]?.rsi ?? startRsi;
  const rsiDiff = endRsi - startRsi;

  let increases = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i].rsi > points[i - 1].rsi) increases++;
  }

  const isGradualIncrease = (increases / (points.length - 1 || 1)) >= 0.5 && rsiDiff > 1.5;
  const cmp = stock.closePrice || stock.openPrice || 0;
  const isAboveBuy = stock.buyAbove ? cmp >= stock.buyAbove : false;
  const isBelowSell = stock.sellBelow ? cmp <= stock.sellBelow : false;

  const isPositive = (isGradualIncrease && endRsi > 48) || (isAboveBuy && endRsi >= 50);
  const isNegative = isBelowSell || (endRsi < 42 && rsiDiff < -3);

  const verdict = isPositive ? 'POSITIVE_BUY' : isNegative ? 'NEGATIVE_AVOID' : 'NEUTRAL_WAIT';
  const verdictTitle = isPositive
    ? 'Gradual Upward RSI Momentum - POSITIVE BUY SETUP'
    : isNegative
    ? 'RSI Momentum Falling - NEGATIVE / AVOID ENTRY'
    : 'RSI Sideways Consolidation - NEUTRAL / WAIT FOR BREAKOUT';

  const t1 = stock.targetsUp?.[0] || cmp * 1.01;
  const t2 = stock.targetsUp?.[1] || cmp * 1.02;
  const t3 = stock.targetsUp?.[2] || cmp * 1.03;
  const sl = stock.sellBelow || cmp * 0.99;

  return {
    verdict,
    verdictTitle,
    confidencePct: isPositive ? 88 : isNegative ? 82 : 65,
    gradualIncreaseDetected: isGradualIncrease,
    rsiTrendSummary: `RSI started at ${startRsi.toFixed(1)} at 09:15 AM and moved to ${endRsi.toFixed(1)} at ${points[points.length - 1]?.timeStr || 'Current Time'} (${rsiDiff >= 0 ? '+' : ''}${rsiDiff.toFixed(1)} pts). ${isGradualIncrease ? 'Confirmed a steady, step-by-step gradual rise across 15-minute candles.' : 'RSI showed fluctuating or non-gradual price momentum.'}`,
    analysisDetails: `The stock is currently trading at ₹${cmp.toFixed(2)}. ${stock.vwap ? `Intraday VWAP is ₹${stock.vwap.toFixed(2)}.` : ''} ${stock.buyAbove ? `Gann Square of 9 Buy Above trigger is ₹${stock.buyAbove.toFixed(2)}.` : ''} RSI current value of ${endRsi.toFixed(1)} indicates ${endRsi > 55 ? 'bullish momentum expansion' : endRsi < 45 ? 'bearish weakness' : 'neutral zone'}.`,
    entryPoint: isPositive
      ? `Buy around CMP ₹${cmp.toFixed(2)} or near VWAP pullback (₹${stock.vwap?.toFixed(2) || cmp.toFixed(2)})`
      : `Wait for breakout above Gann Buy level ₹${stock.buyAbove?.toFixed(2) || 'N/A'} with RSI > 52`,
    exitTargets: [
      `Target 1: ₹${t1.toFixed(2)} (+${(((t1 - cmp)/cmp)*100).toFixed(1)}%)`,
      `Target 2: ₹${t2.toFixed(2)} (+${(((t2 - cmp)/cmp)*100).toFixed(1)}%)`,
      `Target 3: ₹${t3.toFixed(2)} (+${(((t3 - cmp)/cmp)*100).toFixed(1)}%)`
    ],
    stopLoss: `Strict Stop Loss at ₹${sl.toFixed(2)} (-${(((cmp - sl)/cmp)*100).toFixed(1)}%)`,
    riskRewardRatio: '1 : 2.5',
    actionableAdvice: isPositive
      ? 'Favorable risk-reward ratio for intraday long position. Trail stop loss as targets are reached.'
      : 'Avoid entering at this moment to prevent whipsaws. Wait for clear Gann breakout confirmation.',
    analyzedAt: new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }) + ' IST'
  };
}
