import { GannCalcResult } from '../types';

/**
 * Calculates Relative Strength Index (RSI) for a array of closing prices
 */
export function calculateRSI(closes: number[], period: number = 14): number | null {
  if (!closes || !Array.isArray(closes) || closes.length < 2) return null;
  const numCloses = closes.map(Number).filter((n) => !isNaN(n) && n > 0);
  if (numCloses.length < 2) return null;

  const N = Math.min(period, numCloses.length - 1);
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= N; i++) {
    const diff = numCloses[i] - numCloses[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / N;
  let avgLoss = losses / N;

  for (let i = N + 1; i < numCloses.length; i++) {
    const diff = numCloses[i] - numCloses[i - 1];
    const gain = diff >= 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (N - 1) + gain) / N;
    avgLoss = (avgLoss * (N - 1) + loss) / N;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));
  return Math.round(rsi * 100) / 100;
}

/**
 * Checks if Open equals Low (or within specified tolerance)
 */
export function isOpenLowPattern(openPrice?: number | null, lowPrice?: number | null, tolerancePct: number = 0.001): boolean {
  if (!openPrice || !lowPrice || openPrice <= 0 || lowPrice <= 0) return false;
  if (openPrice === lowPrice) return true;
  const diffPct = Math.abs(openPrice - lowPrice) / openPrice;
  return diffPct <= tolerancePct;
}

/**
 * Checks if Open equals High (or within specified tolerance)
 */
export function isOpenHighPattern(openPrice?: number | null, highPrice?: number | null, tolerancePct: number = 0.001): boolean {
  if (!openPrice || !highPrice || openPrice <= 0 || highPrice <= 0) return false;
  if (openPrice === highPrice) return true;
  const diffPct = Math.abs(openPrice - highPrice) / openPrice;
  return diffPct <= tolerancePct;
}

/**
 * Calculates Gann 15-minute open & close modulo values and trend with RSI, VWAP & Open=Low/High pattern confluence
 */
export function calculateGann15Min(
  openPrice: number,
  closePrice: number,
  rsiVal?: number | null,
  vwapVal?: number | null,
  highPrice?: number | null,
  lowPrice?: number | null,
  tolerancePct: number = 0.001
): GannCalcResult {
  const sqrtOpen = Math.sqrt(Math.max(0, openPrice));
  const sqrtClose = Math.sqrt(Math.max(0, closePrice));

  // User's exact Gann Square Root Modulo formula:
  const rawOpenCalc = (sqrtOpen * 15) - 15;
  const rawCloseCalc = (sqrtClose * 15) - 15;

  // Handle modulo safely
  const openCalc = ((rawOpenCalc % 15) + 15) % 15;
  const closeCalc = ((rawCloseCalc % 15) + 15) % 15;

  // Gann Square of 9 levels based on the 15-min Candle open price
  const basePrice = openPrice > 0 ? openPrice : closePrice;
  const sqrtBase = Math.sqrt(Math.max(0, basePrice));

  const factor45 = 0.125;
  const factor90 = 0.25;
  const factor135 = 0.375;
  const factor180 = 0.5;
  const factor225 = 0.625;
  const factor270 = 0.75;
  const factor360 = 1.0;

  const buyAbove = Math.pow(sqrtBase + factor45, 2);
  const sellBelow = Math.pow(Math.max(0, sqrtBase - factor45), 2);

  const targetsUp = [
    Math.pow(sqrtBase + factor90, 2),
    Math.pow(sqrtBase + factor135, 2),
    Math.pow(sqrtBase + factor180, 2),
    Math.pow(sqrtBase + factor225, 2),
    Math.pow(sqrtBase + factor270, 2),
    Math.pow(sqrtBase + factor360, 2),
  ];

  const targetsDown = [
    Math.pow(Math.max(0, sqrtBase - factor90), 2),
    Math.pow(Math.max(0, sqrtBase - factor135), 2),
    Math.pow(Math.max(0, sqrtBase - factor180), 2),
    Math.pow(Math.max(0, sqrtBase - factor225), 2),
    Math.pow(Math.max(0, sqrtBase - factor270), 2),
    Math.pow(Math.max(0, sqrtBase - factor360), 2),
  ];

  const pctChange = openPrice > 0 ? ((closePrice - openPrice) / openPrice) * 100 : 0;

  // Pattern detection: Open = Low and Open = High
  const isOpenEqualLow = isOpenLowPattern(openPrice, lowPrice, tolerancePct);
  const isOpenEqualHigh = isOpenHighPattern(openPrice, highPrice, tolerancePct);

  const openLowDiffPct = openPrice > 0 && lowPrice && lowPrice > 0
    ? Math.abs(openPrice - lowPrice) / openPrice * 100
    : null;

  const openHighDiffPct = openPrice > 0 && highPrice && highPrice > 0
    ? Math.abs(openPrice - highPrice) / openPrice * 100
    : null;

  // Calculate VWAP Status
  let vwapStatus: 'Above' | 'Below' | 'At' | null = null;
  if (vwapVal !== undefined && vwapVal !== null && vwapVal > 0) {
    if (closePrice > vwapVal) vwapStatus = 'Above';
    else if (closePrice < vwapVal) vwapStatus = 'Below';
    else vwapStatus = 'At';
  }

  let trend: 'Very Bullish' | 'Bullish' | 'Very Bearish' | 'Bearish' | 'Neutral' = 'Neutral';

  const isBullishCandle = closePrice > openPrice;
  const isBearishCandle = closePrice < openPrice;
  const gannBreakout = closePrice >= buyAbove || pctChange >= 0.35 || (closePrice >= targetsUp[0] * 0.998);
  const gannBreakdown = closePrice <= sellBelow || pctChange <= -0.35 || (closePrice <= targetsDown[0] * 1.002);

  const rsiBullish = rsiVal !== undefined && rsiVal !== null ? rsiVal > 50 : true;
  const rsiBearish = rsiVal !== undefined && rsiVal !== null ? rsiVal < 50 : true;
  const vwapBullish = vwapStatus ? vwapStatus === 'Above' : true;
  const vwapBearish = vwapStatus ? vwapStatus === 'Below' : true;

  // Confluence rules:
  if (isBullishCandle) {
    if ((gannBreakout || isOpenEqualLow) && rsiBullish && vwapBullish) {
      trend = 'Very Bullish';
    } else {
      trend = 'Bullish';
    }
  } else if (isBearishCandle) {
    if ((gannBreakdown || isOpenEqualHigh) && rsiBearish && vwapBearish) {
      trend = 'Very Bearish';
    } else {
      trend = 'Bearish';
    }
  }

  const gannScore = pctChange;

  return {
    matchOpenPrice: openPrice,
    matchClosePrice: closePrice,
    openCalc,
    closeCalc,
    buyAbove,
    sellBelow,
    targetsUp,
    targetsDown,
    trend,
    pctChange,
    gannScore,
    rsi: rsiVal,
    vwap: vwapVal,
    vwapStatus,
    isOpenEqualLow,
    isOpenEqualHigh,
    openLowDiffPct,
    openHighDiffPct
  };
}
