import { GannCalcResult } from '../types';

/**
 * Calculates Relative Strength Index (RSI) for an array of closing prices using Wilder's Smoothing method
 */
export function calculateRSI(closes: number[], period: number = 14): number | null {
  if (!closes || !Array.isArray(closes) || closes.length < 2) return null;
  const numCloses = closes.map(Number).filter((n) => !isNaN(n) && n > 0);
  if (numCloses.length < 2) return null;

  const N = Math.min(period, numCloses.length - 1);
  if (N < 1) return null;

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

  if (avgLoss === 0) {
    return avgGain === 0 ? 50 : 100;
  }

  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));
  return Math.round(rsi * 100) / 100;
}

/**
 * Checks if Open equals Low strictly (exact price match)
 */
export function isOpenLowPattern(openPrice?: number | null, lowPrice?: number | null): boolean {
  if (!openPrice || !lowPrice || openPrice <= 0 || lowPrice <= 0) return false;
  return Math.abs(openPrice - lowPrice) < 0.001;
}

/**
 * Checks if Open equals High strictly (exact price match)
 */
export function isOpenHighPattern(openPrice?: number | null, highPrice?: number | null): boolean {
  if (!openPrice || !highPrice || openPrice <= 0 || highPrice <= 0) return false;
  return Math.abs(openPrice - highPrice) < 0.001;
}

export type Fib382Status = 'Retraced Yes' | 'Approaching 38.2%' | 'No Retracement';

export interface Fib382Result {
  range: number;
  fib382Bull: number; // 38.2% Fibonacci support from High = High - 0.382 * (High - Low)
  fib500Bull: number; // 50.0% Fibonacci support from High = High - 0.500 * (High - Low)
  fib618Bull: number; // 61.8% Fibonacci support from High = High - 0.618 * (High - Low)
  fib382Bear: number; // 38.2% Fibonacci resistance from Low = Low + 0.382 * (High - Low)
  pullbackPctFromHigh: number; // ((High - CMP) / Range) * 100
  bouncePctFromLow: number;    // ((CMP - Low) / Range) * 100
  fibStatus: Fib382Status;     // 'Retraced Yes' | 'Approaching 38.2%' | 'No Retracement'
  isFib382Retraced: boolean;   // True if fibStatus === 'Retraced Yes'
  isBullish382Retrace: boolean;// Retraced between 38.2% and 75% from High (classic healthy pullback)
  isBearish382Retrace: boolean;// Bounced between 38.2% and 75% from Low
}

/**
 * Calculates Fibonacci Retracement levels (38.2%, 50%, 61.8%) and 3-state retracement status
 */
export function calculateFibonacci382(
  highPrice?: number | null,
  lowPrice?: number | null,
  closePrice?: number | null
): Fib382Result | null {
  if (!highPrice || !lowPrice || !closePrice || highPrice <= 0 || lowPrice <= 0 || closePrice <= 0) return null;
  const range = highPrice - lowPrice;
  if (range <= 0) return null;

  const fib382Bull = highPrice - (0.382 * range);
  const fib500Bull = highPrice - (0.500 * range);
  const fib618Bull = highPrice - (0.618 * range);
  const fib382Bear = lowPrice + (0.382 * range);

  const pullbackPctFromHigh = Math.round(((highPrice - closePrice) / range) * 1000) / 10;
  const bouncePctFromLow = Math.round(((closePrice - lowPrice) / range) * 1000) / 10;

  // Determine Fibonacci 38.2% Reversal Status:
  // - "Approaching 38.2%": if price has not reached 38.2% level yet (lowPrice > fib382Bull)
  // - "Retraced Yes": if price touched 38.2% level and returned back above it (lowPrice <= fib382Bull && closePrice >= fib382Bull)
  // - "No Retracement": if price crossed past 38.2% level without returning back (closePrice < fib382Bull)
  let fibStatus: Fib382Status = 'Approaching 38.2%';

  if (lowPrice <= fib382Bull && closePrice >= fib382Bull) {
    fibStatus = 'Retraced Yes';
  } else if (closePrice < fib382Bull) {
    fibStatus = 'No Retracement';
  } else {
    fibStatus = 'Approaching 38.2%';
  }

  if (highPrice >= fib382Bear && closePrice <= fib382Bear && fibStatus !== 'Retraced Yes') {
    fibStatus = 'Retraced Yes';
  }

  const isFib382Retraced = fibStatus === 'Retraced Yes';
  const isBullish382Retrace = pullbackPctFromHigh >= 38.2 && pullbackPctFromHigh <= 75.0;
  const isBearish382Retrace = bouncePctFromLow >= 38.2 && bouncePctFromLow <= 75.0;

  return {
    range,
    fib382Bull: Math.round(fib382Bull * 100) / 100,
    fib500Bull: Math.round(fib500Bull * 100) / 100,
    fib618Bull: Math.round(fib618Bull * 100) / 100,
    fib382Bear: Math.round(fib382Bear * 100) / 100,
    pullbackPctFromHigh,
    bouncePctFromLow,
    fibStatus,
    isFib382Retraced,
    isBullish382Retrace,
    isBearish382Retrace,
  };
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

  // Pattern detection: Open = Low and Open = High (Strict Exact Match)
  const isOpenEqualLow = isOpenLowPattern(openPrice, lowPrice);
  const isOpenEqualHigh = isOpenHighPattern(openPrice, highPrice);

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

  const fibData = calculateFibonacci382(highPrice, lowPrice, closePrice);

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
    openHighDiffPct,
    fib382Bull: fibData?.fib382Bull ?? null,
    fib382Bear: fibData?.fib382Bear ?? null,
    fibPullbackPct: fibData?.pullbackPctFromHigh ?? null,
    fibStatus: fibData?.fibStatus ?? null,
    isFib382Retrace: fibData?.isFib382Retraced ?? false,
  };
}

export interface AtmOptionStrikes {
  step: number;
  atmStrike: number;
  ceStrikes: [number, number];
  peStrikes: [number, number];
}

/**
 * Calculates 2 CE and 2 PE strike prices At-The-Money (ATM) for a stock or index based on CMP
 */
export function getAtmOptionStrikes(price?: number | null, symbol?: string): AtmOptionStrikes | null {
  if (!price || price <= 0) return null;
  const sym = (symbol || '').toUpperCase();

  let step = 10;
  if (sym.includes('BANKNIFTY')) {
    step = 100;
  } else if (sym.includes('NIFTY') || sym.includes('FINNIFTY')) {
    step = 50;
  } else if (sym.includes('SENSEX')) {
    step = 100;
  } else {
    if (price < 50) step = 1;
    else if (price < 100) step = 2.5;
    else if (price < 250) step = 5;
    else if (price < 500) step = 10;
    else if (price < 1000) step = 20;
    else if (price < 2500) step = 25;
    else if (price < 5000) step = 50;
    else step = 100;
  }

  const atmStrike = Math.round(price / step) * step;

  // 2 CE strikes At-The-Money: ATM CE & ATM+1 CE
  const ce1 = atmStrike;
  const ce2 = atmStrike + step;

  // 2 PE strikes At-The-Money: ATM PE & ATM-1 PE
  const pe1 = atmStrike;
  const pe2 = atmStrike - step;

  return {
    step,
    atmStrike,
    ceStrikes: [ce1, ce2],
    peStrikes: [pe1, pe2],
  };
}

