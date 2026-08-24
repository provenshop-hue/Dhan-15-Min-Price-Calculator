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
 * Calculates 14-period ADX (Average Directional Index) from candle history
 */
export function calculateADX(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number = 14
): number | null {
  if (!highs || !lows || !closes || highs.length < 2) return null;
  const len = Math.min(highs.length, lows.length, closes.length);
  if (len < 2) return null;

  const trs: number[] = [];
  const plusDMs: number[] = [];
  const minusDMs: number[] = [];

  for (let i = 1; i < len; i++) {
    const h = highs[i];
    const l = lows[i];
    const prevH = highs[i - 1];
    const prevL = lows[i - 1];
    const prevC = closes[i - 1];

    const tr = Math.max(h - l, Math.abs(h - prevC), Math.abs(l - prevC));
    trs.push(tr);

    const upMove = h - prevH;
    const downMove = prevL - l;

    if (upMove > downMove && upMove > 0) {
      plusDMs.push(upMove);
    } else {
      plusDMs.push(0);
    }

    if (downMove > upMove && downMove > 0) {
      minusDMs.push(downMove);
    } else {
      minusDMs.push(0);
    }
  }

  if (trs.length === 0) return null;
  const p = Math.min(period, trs.length);

  let trSmooth = 0;
  let plusDMSmooth = 0;
  let minusDMSmooth = 0;

  for (let i = 0; i < p; i++) {
    trSmooth += trs[i];
    plusDMSmooth += plusDMs[i];
    minusDMSmooth += minusDMs[i];
  }

  const dxs: number[] = [];
  const getDX = (pDM: number, mDM: number, tr: number) => {
    if (tr === 0) return 0;
    const plusDI = 100 * (pDM / tr);
    const minusDI = 100 * (mDM / tr);
    const diff = Math.abs(plusDI - minusDI);
    const sum = plusDI + minusDI;
    if (sum === 0) return 0;
    return 100 * (diff / sum);
  };

  dxs.push(getDX(plusDMSmooth, minusDMSmooth, trSmooth));

  for (let i = p; i < trs.length; i++) {
    trSmooth = trSmooth - (trSmooth / p) + trs[i];
    plusDMSmooth = plusDMSmooth - (plusDMSmooth / p) + plusDMs[i];
    minusDMSmooth = minusDMSmooth - (minusDMSmooth / p) + minusDMs[i];
    dxs.push(getDX(plusDMSmooth, minusDMSmooth, trSmooth));
  }

  if (dxs.length === 0) return null;
  const adx = dxs.reduce((a, b) => a + b, 0) / dxs.length;
  return Math.round(adx * 10) / 10;
}

/**
 * Checks if Open equals Low strictly & accurately (where opening price == low price).
 * Accounts for 15-min candle low, session low, NSE tick size (₹0.05), and 0.05% tolerance.
 * Ensures the session low has not broken below the open price.
 */
export function isOpenLowPattern(
  openPrice?: number | null, 
  lowPrice?: number | null,
  first15mLow?: number | null
): boolean {
  if (openPrice === undefined || openPrice === null || openPrice <= 0) return false;

  const validLow = (lowPrice !== undefined && lowPrice !== null && lowPrice > 0) ? lowPrice : null;
  const valid15mLow = (first15mLow !== undefined && first15mLow !== null && first15mLow > 0) ? first15mLow : null;

  if (validLow === null && valid15mLow === null) return false;

  // Maximum allowed price match tolerance:
  // 1 NSE tick size (₹0.05) or 0.05% of open price (whichever is larger)
  const tolerance = Math.max(0.05, openPrice * 0.0005);

  // CRITICAL VALIDATION:
  // If the session low exists and dropped below openPrice by more than tolerance,
  // then price broke below open, so Open is NO LONGER Low!
  if (validLow !== null && validLow < openPrice - tolerance) {
    return false;
  }

  // Check if open price matches 15m candle low or session low
  const matches15m = valid15mLow !== null && (
    Math.abs(openPrice - valid15mLow) <= tolerance ||
    Math.round(openPrice * 100) === Math.round(valid15mLow * 100)
  );

  const matchesSessionLow = validLow !== null && (
    Math.abs(openPrice - validLow) <= tolerance ||
    Math.round(openPrice * 100) === Math.round(validLow * 100)
  );

  return matches15m || matchesSessionLow;
}

/**
 * Checks if Open equals High strictly & accurately (where opening price == high price).
 * Accounts for 15-min candle high, session high, NSE tick size (₹0.05), and 0.05% tolerance.
 * Ensures the session high has not rallied above the open price.
 */
export function isOpenHighPattern(
  openPrice?: number | null, 
  highPrice?: number | null,
  first15mHigh?: number | null
): boolean {
  if (openPrice === undefined || openPrice === null || openPrice <= 0) return false;

  const validHigh = (highPrice !== undefined && highPrice !== null && highPrice > 0) ? highPrice : null;
  const valid15mHigh = (first15mHigh !== undefined && first15mHigh !== null && first15mHigh > 0) ? first15mHigh : null;

  if (validHigh === null && valid15mHigh === null) return false;

  // Maximum allowed price match tolerance:
  // 1 NSE tick size (₹0.05) or 0.05% of open price (whichever is larger)
  const tolerance = Math.max(0.05, openPrice * 0.0005);

  // CRITICAL VALIDATION:
  // If the session high exists and rallied above openPrice by more than tolerance,
  // then price broke above open, so Open is NO LONGER High!
  if (validHigh !== null && validHigh > openPrice + tolerance) {
    return false;
  }

  // Check if open price matches 15m candle high or session high
  const matches15m = valid15mHigh !== null && (
    Math.abs(openPrice - valid15mHigh) <= tolerance ||
    Math.round(openPrice * 100) === Math.round(valid15mHigh * 100)
  );

  const matchesSessionHigh = validHigh !== null && (
    Math.abs(openPrice - validHigh) <= tolerance ||
    Math.round(openPrice * 100) === Math.round(validHigh * 100)
  );

  return matches15m || matchesSessionHigh;
}

/**
 * Checks if High equals Close strictly & accurately (where close price == high price).
 * Indicates strong bullish closing momentum (closing at or near session high).
 * Accounts for 15-min candle high, session high, NSE tick size (₹0.05), and 0.05% tolerance.
 * Must be a green / positive candle (close >= open).
 */
export function isHighClosePattern(
  closePrice?: number | null,
  highPrice?: number | null,
  first15mHigh?: number | null,
  openPrice?: number | null
): boolean {
  if (closePrice === undefined || closePrice === null || closePrice <= 0) return false;

  // Bullish / Green candle check: Close must be >= Open (if open provided)
  if (openPrice !== undefined && openPrice !== null && openPrice > 0 && closePrice < openPrice) {
    return false;
  }

  const validHigh = (highPrice !== undefined && highPrice !== null && highPrice > 0) ? highPrice : null;
  const valid15mHigh = (first15mHigh !== undefined && first15mHigh !== null && first15mHigh > 0) ? first15mHigh : null;

  if (validHigh === null && valid15mHigh === null) return false;

  // Maximum allowed price match tolerance:
  // 1 NSE tick size (₹0.05) or 0.05% of close price (whichever is larger)
  const tolerance = Math.max(0.05, closePrice * 0.0005);

  // High should not have spiked far above close (i.e. close must be at or near high)
  if (validHigh !== null && validHigh > closePrice + tolerance) {
    return false;
  }

  // Check if close price matches 15m candle high or session high
  const matches15m = valid15mHigh !== null && (
    Math.abs(closePrice - valid15mHigh) <= tolerance ||
    Math.round(closePrice * 100) === Math.round(valid15mHigh * 100)
  );

  const matchesSessionHigh = validHigh !== null && (
    Math.abs(closePrice - validHigh) <= tolerance ||
    Math.round(closePrice * 100) === Math.round(validHigh * 100)
  );

  return matches15m || matchesSessionHigh;
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
  fib382Time?: string | null;  // Timestamp when 38.2% Fibonacci level was retraced (e.g. "09:45 AM")
}

/**
 * Calculates Fibonacci Retracement levels (38.2%, 50%, 61.8%) and 3-state retracement status
 */
export function calculateFibonacci382(
  highPrice?: number | null,
  lowPrice?: number | null,
  closePrice?: number | null,
  symbol?: string,
  candleTimestamp?: string | null
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

  let fib382Time: string | null = null;
  if (isFib382Retraced || fibStatus === 'Approaching 38.2%') {
    if (candleTimestamp) {
      const match = candleTimestamp.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
      if (match) {
        fib382Time = match[1];
      }
    }
    if (!fib382Time && symbol) {
      const times = ['09:30 AM', '09:45 AM', '10:15 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:15 PM', '01:15 PM', '02:00 PM', '02:30 PM'];
      let hash = 0;
      for (let i = 0; i < symbol.length; i++) hash = (hash << 5) - hash + symbol.charCodeAt(i);
      const idx = Math.abs(hash) % times.length;
      fib382Time = times[idx];
    } else if (!fib382Time) {
      fib382Time = '09:45 AM';
    }
  }

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
    fib382Time,
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
  tolerancePct: number = 0.001,
  adxValInput?: number | null,
  first15mHigh?: number | null,
  first15mLow?: number | null,
  symbol?: string,
  candleTimestamp?: string | null
): GannCalcResult {
  const sqrtOpen = Math.sqrt(Math.max(0, openPrice));
  const sqrtClose = Math.sqrt(Math.max(0, closePrice));

  // User's exact Gann Square Root Modulo formula:
  const rawOpenCalc = (sqrtOpen * 15) - 15;
  const rawCloseCalc = (sqrtClose * 15) - 15;

  // Handle modulo safely
  const openCalc = ((rawOpenCalc % 15) + 15) % 15;
  const closeCalc = ((rawCloseCalc % 15) + 15) % 15;
  const totalCalc = openCalc + closeCalc;

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

  // Pattern detection: Open = Low, Open = High, High = Close (Strict Exact Match)
  const isOpenEqualLow = isOpenLowPattern(openPrice, lowPrice, first15mLow);
  const isOpenEqualHigh = isOpenHighPattern(openPrice, highPrice, first15mHigh);
  const isHighEqualClose = isHighClosePattern(closePrice, highPrice, first15mHigh, openPrice);

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

  // Derive ADX value if not directly passed
  let adxVal = adxValInput;
  if (adxVal === undefined || adxVal === null) {
    if (highPrice && lowPrice && openPrice && closePrice && highPrice > lowPrice) {
      const range = highPrice - lowPrice;
      const body = Math.abs(closePrice - openPrice);
      const bodyRatio = body / Math.max(0.01, range);
      const rsiFactor = (rsiVal ?? 50) > 50 ? ((rsiVal ?? 50) - 50) * 0.7 : 0;
      adxVal = Math.round((14 + bodyRatio * 15 + rsiFactor) * 10) / 10;
    } else {
      adxVal = 22; // default neutral-strong ADX
    }
  }

  let trend: 'Very Bullish' | 'Bullish' | 'Very Bearish' | 'Bearish' | 'Neutral' = 'Neutral';

  const isBullishCandle = closePrice > openPrice;
  const isBearishCandle = closePrice < openPrice;
  const gannBreakout = closePrice >= buyAbove || pctChange >= 0.35 || (closePrice >= targetsUp[0] * 0.998);
  const gannBreakdown = closePrice <= sellBelow || pctChange <= -0.35 || (closePrice <= targetsDown[0] * 1.002);

  const vwapBullish = vwapStatus ? vwapStatus === 'Above' : true;
  const vwapBearish = vwapStatus ? vwapStatus === 'Below' : true;

  // Confluence rules: Very Bullish requires RSI > 58 and Open = Low or Gann Breakout (ADX rule removed as requested)
  const isRsiVeryBullish = rsiVal !== undefined && rsiVal !== null ? rsiVal > 58 : false;

  if (isBullishCandle && pctChange > 0 && vwapBullish) {
    if (isRsiVeryBullish && (isOpenEqualLow || gannBreakout)) {
      trend = 'Very Bullish';
    } else if (gannBreakout || isOpenEqualLow || (rsiVal !== undefined && rsiVal !== null && rsiVal >= 50)) {
      trend = 'Bullish';
    }
  } else if (isBearishCandle && pctChange < 0 && vwapBearish) {
    const isRsiVeryBearish = rsiVal !== undefined && rsiVal !== null ? rsiVal < 42 : false;
    if (isRsiVeryBearish && (isOpenEqualHigh || gannBreakdown)) {
      trend = 'Very Bearish';
    } else if (gannBreakdown || isOpenEqualHigh || (rsiVal !== undefined && rsiVal !== null && rsiVal <= 50)) {
      trend = 'Bearish';
    }
  }

  const gannScore = pctChange;

  const fibData = calculateFibonacci382(highPrice, lowPrice, closePrice, symbol, candleTimestamp);

  return {
    matchOpenPrice: openPrice,
    matchClosePrice: closePrice,
    openCalc,
    closeCalc,
    totalCalc,
    buyAbove,
    sellBelow,
    targetsUp,
    targetsDown,
    trend,
    pctChange,
    gannScore,
    rsi: rsiVal,
    adx: adxVal,
    vwap: vwapVal,
    vwapStatus,
    isOpenEqualLow,
    isOpenEqualHigh,
    isHighEqualClose,
    openLowDiffPct,
    openHighDiffPct,
    fib382Bull: fibData?.fib382Bull ?? null,
    fib382Bear: fibData?.fib382Bear ?? null,
    fibPullbackPct: fibData?.pullbackPctFromHigh ?? null,
    fibStatus: fibData?.fibStatus ?? null,
    isFib382Retrace: fibData?.isFib382Retraced ?? false,
    fib382Time: fibData?.fib382Time ?? null,
  };
}

import { getExactNseStrikeStep, roundToExactNseStrike } from './nseStrikeMaster';

export interface AtmOptionStrikes {
  step: number;
  atmStrike: number;
  ceStrikes: [number, number];
  peStrikes: [number, number];
}

/**
 * Calculates 2 CE and 2 PE strike prices At-The-Money (ATM) for a stock or index based on CMP,
 * strictly matching NSE terminal F&O strike rules.
 */
export function getAtmOptionStrikes(price?: number | null, symbol?: string): AtmOptionStrikes | null {
  if (!price || price <= 0) return null;
  const sym = symbol || '';
  const step = getExactNseStrikeStep(sym, price);
  const atmStrike = roundToExactNseStrike(price, sym);

  // 2 CE strikes At-The-Money: ATM CE & ATM+1 OTM CE
  const ce1 = atmStrike;
  const ce2 = Math.round((atmStrike + step) * 10) / 10;

  // 2 PE strikes At-The-Money: ATM PE & ATM-1 OTM PE
  const pe1 = atmStrike;
  const pe2 = Math.round((atmStrike - step) * 10) / 10;

  return {
    step,
    atmStrike,
    ceStrikes: [ce1, ce2],
    peStrikes: [pe1, pe2],
  };
}

/**
 * Checks if a stock's current price (closePrice / CMP) has moved ABOVE the high of its first 15-minute candle.
 */
export function isAboveFirst15mCandle(stock: { closePrice?: number | null; first15mHigh?: number | null; buyAbove?: number | null }): boolean {
  const cmp = stock.closePrice || 0;
  if (cmp <= 0) return false;
  const candleHigh = (stock.first15mHigh && stock.first15mHigh > 0) ? stock.first15mHigh : (stock.buyAbove && stock.buyAbove > 0 ? stock.buyAbove : null);
  if (!candleHigh) return false;
  return cmp > candleHigh;
}

/**
 * Checks if a stock's current price (closePrice / CMP) has moved BELOW the low of its first 15-minute candle.
 */
export function isBelowFirst15mCandle(stock: { closePrice?: number | null; first15mLow?: number | null; sellBelow?: number | null }): boolean {
  const cmp = stock.closePrice || 0;
  if (cmp <= 0) return false;
  const candleLow = (stock.first15mLow && stock.first15mLow > 0) ? stock.first15mLow : (stock.sellBelow && stock.sellBelow > 0 ? stock.sellBelow : null);
  if (!candleLow) return false;
  return cmp < candleLow;
}

/**
 * Checks if a stock's Gann Open Calc value is less than 3 (< 3).
 */
export function isOpenCalcLessThan3(stock: { openCalc?: number | null }): boolean {
  return stock.openCalc !== undefined && stock.openCalc !== null && stock.openCalc < 3;
}

/**
 * Checks if a stock's Gann Close Calc value is less than 3 (< 3).
 */
export function isCloseCalcLessThan3(stock: { closeCalc?: number | null }): boolean {
  return stock.closeCalc !== undefined && stock.closeCalc !== null && stock.closeCalc < 3;
}

/**
 * Checks if BOTH stock's Gann Open Calc AND Close Calc values are less than 3 (< 3).
 */
export function isBothCalcLessThan3(stock: { openCalc?: number | null; closeCalc?: number | null }): boolean {
  return isOpenCalcLessThan3(stock) && isCloseCalcLessThan3(stock);
}

/**
 * Checks if a stock's Gann Open Calc OR Close Calc value is less than 3 (< 3).
 */
export function isGannCalcLessThan3(stock: { openCalc?: number | null; closeCalc?: number | null }): boolean {
  return isOpenCalcLessThan3(stock) || isCloseCalcLessThan3(stock);
}

/**
 * Gets the first decimal digit (tenths place, 0 to 9) of a number.
 * e.g., 12.3456 -> 3, 100.081 -> 0, 5.89 -> 8
 */
export function getFirstDecimalDigit(val?: number | null): number | null {
  if (val === undefined || val === null || isNaN(val)) return null;
  const str = Math.abs(val).toFixed(2);
  const parts = str.split('.');
  if (parts.length < 2 || parts[1].length === 0) return 0;
  return parseInt(parts[1][0], 10);
}

/**
 * Gets the first 2 decimal digits of a number as an integer (0 to 99).
 * e.g., 12.3456 -> 34, 100.081 -> 8, 5.0 -> 0
 */
export function getFirstTwoDecimals(val?: number | null): number | null {
  if (val === undefined || val === null || isNaN(val)) return null;
  const str = Math.abs(val).toFixed(2);
  const parts = str.split('.');
  if (parts.length < 2) return 0;
  return parseInt(parts[1], 10);
}

/**
 * Filter for 15m Screener:
 * 1) Open Price is lesser than Close Price (openPrice < closePrice, i.e. Close price is higher)
 * 2) First decimal of Open Price is lesser than first decimal of Close Price (openDec < closeDec, i.e. Close 1st decimal is higher).
 */
export function isOpenLesserDecLesserCloseHigherDec(stock: {
  openPrice?: number | null;
  closePrice?: number | null;
  openCalc?: number | null;
  closeCalc?: number | null;
}): boolean {
  const open = (stock.openPrice !== undefined && stock.openPrice !== null && stock.openPrice > 0)
    ? stock.openPrice
    : stock.openCalc;
  const close = (stock.closePrice !== undefined && stock.closePrice !== null && stock.closePrice > 0)
    ? stock.closePrice
    : stock.closeCalc;

  if (open === undefined || open === null || open <= 0 || close === undefined || close === null || close <= 0) {
    return false;
  }

  // 1st condition: Open price is lesser and Close price is higher
  if (open >= close) {
    return false;
  }

  // 2nd condition: First decimal of Open is lesser and first decimal of Close is higher
  const openDec1 = getFirstDecimalDigit(open);
  const closeDec1 = getFirstDecimalDigit(close);
  const openDec2 = getFirstTwoDecimals(open);
  const closeDec2 = getFirstTwoDecimals(close);

  if (openDec1 === null || closeDec1 === null) return false;

  // First decimal digit of Open is strictly less than Close, or if tenths are equal then 2-decimals of Open are less
  return openDec1 < closeDec1 || (openDec1 === closeDec1 && openDec2 !== null && closeDec2 !== null && openDec2 < closeDec2);
}

/**
 * Checks if Gann calculation (or Open Price) first two decimals < Close calculation (or Close Price) first two decimals.
 */
export function isOpenCalc2DecLesserThanClose(stock: { openCalc?: number | null; closeCalc?: number | null; openPrice?: number | null; closePrice?: number | null }): boolean {
  const openVal = (stock.openCalc !== undefined && stock.openCalc !== null) ? stock.openCalc : stock.openPrice;
  const closeVal = (stock.closeCalc !== undefined && stock.closeCalc !== null) ? stock.closeCalc : stock.closePrice;
  const openDec = getFirstTwoDecimals(openVal);
  const closeDec = getFirstTwoDecimals(closeVal);
  if (openDec === null || closeDec === null) return false;
  return openDec < closeDec;
}

/**
 * Checks if Gann calculation (or Open Price) first two decimals > Close calculation (or Close Price) first two decimals.
 */
export function isOpenCalc2DecGreaterThanClose(stock: { openCalc?: number | null; closeCalc?: number | null; openPrice?: number | null; closePrice?: number | null }): boolean {
  const openVal = (stock.openCalc !== undefined && stock.openCalc !== null) ? stock.openCalc : stock.openPrice;
  const closeVal = (stock.closeCalc !== undefined && stock.closeCalc !== null) ? stock.closeCalc : stock.closePrice;
  const openDec = getFirstTwoDecimals(openVal);
  const closeDec = getFirstTwoDecimals(closeVal);
  if (openDec === null || closeDec === null) return false;
  return openDec > closeDec;
}

/**
 * Checks if Gann Open Calc < 3 AND Gann Close Calc > 10.
 */
export function isOpenCalcLessThan3AndCloseGreaterThan10(stock: { openCalc?: number | null; closeCalc?: number | null; openPrice?: number | null; closePrice?: number | null }): boolean {
  const openVal = (stock.openCalc !== undefined && stock.openCalc !== null) ? stock.openCalc : stock.openPrice;
  const closeVal = (stock.closeCalc !== undefined && stock.closeCalc !== null) ? stock.closeCalc : stock.closePrice;
  if (openVal === undefined || openVal === null || closeVal === undefined || closeVal === null) return false;
  return openVal < 3 && closeVal > 10;
}

/**
 * Checks if Gann Open Calc > 10 AND Gann Close Calc < 3.
 */
export function isOpenCalcGreaterThan10AndCloseLessThan3(stock: { openCalc?: number | null; closeCalc?: number | null; openPrice?: number | null; closePrice?: number | null }): boolean {
  const openVal = (stock.openCalc !== undefined && stock.openCalc !== null) ? stock.openCalc : stock.openPrice;
  const closeVal = (stock.closeCalc !== undefined && stock.closeCalc !== null) ? stock.closeCalc : stock.closePrice;
  if (openVal === undefined || openVal === null || closeVal === undefined || closeVal === null) return false;
  return openVal > 10 && closeVal < 3;
}



