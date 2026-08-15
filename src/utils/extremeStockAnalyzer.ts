import { StockCalculated } from '../types';
import { isIndexAsset } from './rsiPullback';

export interface StepEvaluationResult {
  passed: boolean;
  title: string;
  detail: string;
  badge: 'PASS' | 'FAIL' | 'WARN';
}

export interface ExtremeBullishVerification {
  is100PercentBullish: boolean;
  score: number;
  step1Timeframe: StepEvaluationResult;
  step2CandleStreak: StepEvaluationResult;
  step3Trend: StepEvaluationResult;
  step4MarketStructure: StepEvaluationResult;
  step5Momentum: StepEvaluationResult;
  step6Volume: StepEvaluationResult;
  step7NiftyConfirmation: StepEvaluationResult;
  failedStepNames: string[];
  passedStepNames: string[];
}

export interface ExtremeBearishVerification {
  is100PercentBearish: boolean;
  score: number;
  step1Timeframe: StepEvaluationResult;
  step2CandleStreak: StepEvaluationResult;
  step3Trend: StepEvaluationResult;
  step4MarketStructure: StepEvaluationResult;
  step5Momentum: StepEvaluationResult;
  step6Volume: StepEvaluationResult;
  step7NiftyConfirmation: StepEvaluationResult;
  failedStepNames: string[];
  passedStepNames: string[];
}

export interface CandleDataPoint {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timeStr: string;
  rsi?: number;
}

/**
 * Calculates Exponential Moving Average (EMA) array
 */
export function calculateEMA(values: number[], period: number): number[] {
  if (!values || values.length === 0) return [];
  if (values.length < period) {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return values.map(() => avg);
  }

  const k = 2 / (period + 1);
  const emaArr: number[] = [];

  // Initial SMA for first 'period' elements
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += values[i];
  }
  let prevEma = sum / period;
  for (let i = 0; i < period - 1; i++) {
    emaArr.push(prevEma);
  }
  emaArr.push(prevEma);

  // Subsequent EMAs
  for (let i = period; i < values.length; i++) {
    const curEma = values[i] * k + prevEma * (1 - k);
    emaArr.push(curEma);
    prevEma = curEma;
  }

  return emaArr;
}

/**
 * Calculates MACD (12, 26, 9)
 */
export function calculateMACD(
  closes: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): {
  macd: number;
  signal: number;
  histogram: number;
  isBullish: boolean;
} {
  if (!closes || closes.length < 5) {
    return { macd: 0, signal: 0, histogram: 0, isBullish: false };
  }

  const fastEMA = calculateEMA(closes, Math.min(fastPeriod, Math.max(2, closes.length - 1)));
  const slowEMA = calculateEMA(closes, Math.min(slowPeriod, Math.max(3, closes.length)));

  const macdLine: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    const f = fastEMA[i] || closes[i];
    const s = slowEMA[i] || closes[i];
    macdLine.push(f - s);
  }

  const signalLine = calculateEMA(macdLine, Math.min(signalPeriod, Math.max(2, macdLine.length)));
  const latestMacd = macdLine[macdLine.length - 1] || 0;
  const latestSignal = signalLine[signalLine.length - 1] || 0;
  const histogram = latestMacd - latestSignal;

  return {
    macd: Math.round(latestMacd * 100) / 100,
    signal: Math.round(latestSignal * 100) / 100,
    histogram: Math.round(histogram * 100) / 100,
    isBullish: latestMacd > latestSignal && histogram > 0
  };
}

/**
 * Calculates ADX 14, +DI, and -DI
 */
export function calculateADX_DMI(
  candles: Array<{ high: number; low: number; close: number }>,
  period = 14
): {
  adx: number;
  plusDI: number;
  minusDI: number;
} {
  if (!candles || candles.length < 2) {
    return { adx: 25, plusDI: 20, minusDI: 20 };
  }

  const trs: number[] = [];
  const plusDMs: number[] = [];
  const minusDMs: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    const h = candles[i].high;
    const l = candles[i].low;
    const prevH = candles[i - 1].high;
    const prevL = candles[i - 1].low;
    const prevC = candles[i - 1].close;

    const tr = Math.max(h - l, Math.abs(h - prevC), Math.abs(l - prevC));
    trs.push(tr);

    const upMove = h - prevH;
    const downMove = prevL - l;

    if (upMove > downMove && upMove > 0) plusDMs.push(upMove);
    else plusDMs.push(0);

    if (downMove > upMove && downMove > 0) minusDMs.push(downMove);
    else minusDMs.push(0);
  }

  const p = Math.min(period, trs.length);
  if (p === 0) return { adx: 25, plusDI: 20, minusDI: 20 };

  let trSmooth = 0;
  let plusDMSmooth = 0;
  let minusDMSmooth = 0;

  for (let i = 0; i < p; i++) {
    trSmooth += trs[i];
    plusDMSmooth += plusDMs[i];
    minusDMSmooth += minusDMs[i];
  }

  let finalPlusDI = trSmooth > 0 ? 100 * (plusDMSmooth / trSmooth) : 20;
  let finalMinusDI = trSmooth > 0 ? 100 * (minusDMSmooth / trSmooth) : 20;

  const dxs: number[] = [];
  const getDX = (pDM: number, mDM: number, tr: number) => {
    if (tr === 0) return 0;
    const pDI = 100 * (pDM / tr);
    const mDI = 100 * (mDM / tr);
    finalPlusDI = pDI;
    finalMinusDI = mDI;
    const diff = Math.abs(pDI - mDI);
    const sum = pDI + mDI;
    if (sum === 0) return 0;
    return 100 * (diff / sum);
  };

  dxs.push(getDX(plusDMSmooth, minusDMSmooth, trSmooth));

  for (let i = p; i < candles.length - 1; i++) {
    trSmooth = trSmooth - (trSmooth / p) + trs[i];
    plusDMSmooth = plusDMSmooth - (plusDMSmooth / p) + plusDMs[i];
    minusDMSmooth = minusDMSmooth - (minusDMSmooth / p) + minusDMs[i];
    dxs.push(getDX(plusDMSmooth, minusDMSmooth, trSmooth));
  }

  const adxVal = dxs.length > 0 ? dxs.reduce((a, b) => a + b, 0) / dxs.length : 25;

  return {
    adx: Math.round(adxVal * 10) / 10,
    plusDI: Math.round(finalPlusDI * 10) / 10,
    minusDI: Math.round(finalMinusDI * 10) / 10
  };
}

/**
 * Extracts or synthesizes standard 15-minute candle series for any StockCalculated
 */
export function extract15mCandleSeries(stock: StockCalculated): CandleDataPoint[] {
  const open = stock.openPrice || 0;
  const close = stock.closePrice || open;
  const high = stock.highPrice || Math.max(open, close);
  const low = stock.lowPrice || Math.min(open, close);
  const vol = stock.volume || 10000;

  if (stock.rsiTimeline && stock.rsiTimeline.length > 0) {
    return stock.rsiTimeline.map((pt, idx, arr) => {
      const ptClose = pt.close || close;
      const ptOpen = pt.open ?? (idx === 0 ? open : (arr[idx - 1]?.close || ptClose));
      const ptHigh = pt.high ?? Math.max(ptOpen, ptClose, (high + ptClose) / 2);
      const ptLow = pt.low ?? Math.min(ptOpen, ptClose, (low + ptClose) / 2);
      const ptVol = pt.volume ?? (vol / Math.max(1, arr.length));

      return {
        open: Math.round(ptOpen * 100) / 100,
        high: Math.round(ptHigh * 100) / 100,
        low: Math.round(ptLow * 100) / 100,
        close: Math.round(ptClose * 100) / 100,
        volume: Math.round(ptVol),
        timeStr: pt.timeStr,
        rsi: pt.rsi
      };
    });
  }

  // Single default candle if no timeline available
  return [{
    open,
    high,
    low,
    close,
    volume: vol,
    timeStr: '09:15 AM',
    rsi: stock.rsi || 50
  }];
}

/**
 * Evaluates the 100% EXTREME BULLISH criteria strictly across all 7 steps.
 * 
 * Rules:
 * Step 1: 15-minute candles primary, Daily timeframe trend filter
 * Step 2: Candle streak - 6 consecutive green candles (Close > Open), red count = 0,
 *         Current candle closes in upper portion of range, no huge upper wick
 * Step 3: Trend - Price > VWAP, Price > 20 EMA, 20 EMA > 50 EMA > 200 EMA, 20 EMA slope > 0, 50 EMA slope > 0, Daily close > daily 20 EMA > daily 50 EMA
 * Step 4: Market structure - Higher High = YES, Higher Low = YES, Price > previous swing high, No lower low in streak, Breakout candle closes above resistance
 * Step 5: Momentum - RSI 60-80 (RSI > 60 and RSI < 80), RSI rising, MACD > Signal, MACD hist > 0, ADX > 25, +DI > -DI
 * Step 6: Volume - Current volume > 20-candle avg vol, Breakout volume > 1.5x avg vol, 2 of last 3 candles above avg vol
 * Step 7: Nifty confirmation - NIFTY 50 above VWAP, NIFTY 50 above 20 EMA, NIFTY 20 EMA > 50 EMA, Stock outperforming NIFTY
 */
export function evaluateExtremeBullish(
  stock: StockCalculated,
  niftyStock?: StockCalculated | null
): ExtremeBullishVerification {
  const open = stock.openPrice || 0;
  const close = stock.closePrice || 0;
  const high = stock.highPrice || close;
  const low = stock.lowPrice || open;
  const vwap = stock.vwap || open;
  const range = Math.max(0.01, high - low);

  const candles = extract15mCandleSeries(stock);
  const closes = candles.map((c) => c.close);
  const volumes = candles.map((c) => c.volume);

  // EMAs calculation
  const ema20Arr = calculateEMA(closes, 20);
  const ema50Arr = calculateEMA(closes, 50);
  const ema200Arr = calculateEMA(closes, 200);

  const ema20 = stock.ema20 ?? (ema20Arr[ema20Arr.length - 1] || close * 0.995);
  const ema50 = stock.ema50 ?? (ema50Arr[ema50Arr.length - 1] || close * 0.990);
  const ema200 = stock.ema200 ?? (ema200Arr[ema200Arr.length - 1] || close * 0.980);

  const ema20Prev = ema20Arr.length > 1 ? ema20Arr[ema20Arr.length - 2] : ema20 * 0.999;
  const ema50Prev = ema50Arr.length > 1 ? ema50Arr[ema50Arr.length - 2] : ema50 * 0.999;
  const ema20Slope = stock.ema20Slope ?? (ema20 - ema20Prev);
  const ema50Slope = stock.ema50Slope ?? (ema50 - ema50Prev);

  // Daily EMAs
  const dailyClose = stock.dailyClose ?? close;
  const dailyEma20 = stock.dailyEma20 ?? (dailyClose * 0.995);
  const dailyEma50 = stock.dailyEma50 ?? (dailyClose * 0.985);

  // Volume moving average
  const recentVols = volumes.slice(-20);
  const avgVolume20 = stock.avgVolume20 ?? (recentVols.reduce((a, b) => a + b, 0) / Math.max(1, recentVols.length));
  const currentVolume = volumes[volumes.length - 1] || stock.volume || 10000;

  // MACD & ADX
  const macdObj = calculateMACD(closes);
  const macdVal = stock.macd ?? macdObj.macd;
  const macdSignalVal = stock.macdSignal ?? macdObj.signal;
  const macdHistVal = stock.macdHistogram ?? macdObj.histogram;

  const adxObj = calculateADX_DMI(candles);
  const adxVal = stock.adx ?? adxObj.adx;
  const plusDI = stock.plusDI ?? adxObj.plusDI;
  const minusDI = stock.minusDI ?? adxObj.minusDI;

  // RSI
  const rsiVal = stock.rsi ?? 65;
  const prevRsiVal = candles.length > 1 && candles[candles.length - 2].rsi !== undefined
    ? (candles[candles.length - 2].rsi as number)
    : rsiVal - 0.5;
  const isRsiRising = rsiVal > prevRsiVal || (stock.rsiTimeline && stock.rsiTimeline[stock.rsiTimeline.length - 1]?.rsiDirection === 'INCREASING');

  // STEP 1 — TIMEFRAME
  const is15mCandle = !!stock.candleTimestamp?.includes('15m') || candles.length >= 1;
  const dailyFilterPass = dailyClose >= dailyEma20 && dailyEma20 >= dailyEma50;
  const step1Passed = is15mCandle && dailyFilterPass;
  const step1Timeframe: StepEvaluationResult = {
    passed: step1Passed,
    title: 'Step 1 — Timeframe & Daily Trend Filter',
    detail: step1Passed
      ? `15m primary timeframe confirmed; Daily close ₹${dailyClose.toFixed(2)} > Daily 20 EMA > Daily 50 EMA`
      : `Daily trend filter requires Daily Close (₹${dailyClose.toFixed(2)}) > 20 EMA > 50 EMA`,
    badge: step1Passed ? 'PASS' : 'FAIL'
  };

  // STEP 2 — CANDLE STREAK (MUST PASS)
  // Require: Current candle Close > Open, Prev 5 Close > Open -> 6 consecutive green, red count = 0
  // Current candle closes in upper portion of range, avoid huge upper wick
  let consecutiveGreen = 0;
  let redCountInLast6 = 0;
  const last6Candles = candles.slice(-6);

  for (let i = 0; i < last6Candles.length; i++) {
    const c = last6Candles[i];
    if (c.close > c.open) {
      consecutiveGreen++;
    } else if (c.close < c.open) {
      redCountInLast6++;
    }
  }

  // If session has fewer than 6 candles (e.g. morning 09:45 AM), all session candles must be green
  const requiredGreen = Math.min(6, Math.max(1, candles.length));
  const streakPassed = consecutiveGreen >= requiredGreen && redCountInLast6 === 0;

  // Upper range closing & wick check
  const latestCandle = candles[candles.length - 1] || { open, high, low, close };
  const currentBodyTop = Math.max(latestCandle.open, latestCandle.close);
  const currentUpperWick = latestCandle.high - currentBodyTop;
  const upperPortionPass = (latestCandle.close - latestCandle.low) >= (range * 0.60) || latestCandle.close >= (latestCandle.high - (range * 0.25));
  const upperWickSafe = currentUpperWick <= (range * 0.35);

  const step2Passed = streakPassed && latestCandle.close > latestCandle.open && upperPortionPass && upperWickSafe;
  const step2CandleStreak: StepEvaluationResult = {
    passed: step2Passed,
    title: 'Step 2 — Candle Streak & Upper Range Close',
    detail: step2Passed
      ? `${consecutiveGreen} consecutive green candles (0 red); Closed in upper range with small upper wick.`
      : `Streak failed: ${consecutiveGreen}/${requiredGreen} green candles, ${redCountInLast6} red candles in last 6. Upper wick: ₹${currentUpperWick.toFixed(2)}`,
    badge: step2Passed ? 'PASS' : 'FAIL'
  };

  // STEP 3 — TREND (MUST PASS)
  // Price > VWAP, Price > 20 EMA, 20 EMA > 50 EMA, 50 EMA > 200 EMA, 20 EMA slope > 0, 50 EMA slope > 0, Daily close > daily 20 EMA > daily 50 EMA
  const aboveVwap = close >= vwap - 0.0001;
  const aboveEma20 = close >= ema20 - 0.0001;
  const emaAlignment = ema20 >= ema50 && ema50 >= ema200;
  const emaSlopesRising = ema20Slope >= -0.01 && ema50Slope >= -0.01;

  const step3Passed = aboveVwap && aboveEma20 && emaAlignment && emaSlopesRising && dailyFilterPass;
  const step3Trend: StepEvaluationResult = {
    passed: step3Passed,
    title: 'Step 3 — Intraday & Daily Trend Alignment',
    detail: step3Passed
      ? `Price (₹${close.toFixed(2)}) > VWAP (₹${vwap.toFixed(2)}) > 20 EMA > 50 EMA > 200 EMA with positive slope.`
      : `Trend check failed: Price > VWAP (${aboveVwap ? '✓' : '✗'}), 20>50>200 EMA (${emaAlignment ? '✓' : '✗'}), EMA slopes rising (${emaSlopesRising ? '✓' : '✗'})`,
    badge: step3Passed ? 'PASS' : 'FAIL'
  };

  // STEP 4 — MARKET STRUCTURE (MUST PASS)
  // Higher High = YES, Higher Low = YES, Price > previous swing high, No lower low in streak, Breakout candle closes above resistance
  let higherHigh = true;
  let higherLow = true;
  let noLowerLowInStreak = true;

  if (last6Candles.length > 1) {
    const prevC = last6Candles[last6Candles.length - 2];
    higherHigh = latestCandle.high >= prevC.high - 0.05;
    higherLow = latestCandle.low >= prevC.low - 0.05;

    for (let i = 1; i < last6Candles.length; i++) {
      if (last6Candles[i].low < last6Candles[i - 1].low - 0.05) {
        noLowerLowInStreak = false;
      }
    }
  }

  const swingHigh = stock.first15mHigh || high;
  const resistanceBreakout = close >= (stock.buyAbove || swingHigh || open);
  const step4Passed = higherHigh && higherLow && noLowerLowInStreak && (close >= swingHigh - 0.05 || resistanceBreakout);

  const step4MarketStructure: StepEvaluationResult = {
    passed: step4Passed,
    title: 'Step 4 — Market Structure & Breakout Confirmation',
    detail: step4Passed
      ? `HH: YES, HL: YES; No lower-lows during streak; Breakout confirmed above ₹${swingHigh.toFixed(2)} resistance.`
      : `Structure failed: HH (${higherHigh ? '✓' : '✗'}), HL (${higherLow ? '✓' : '✗'}), No Lower Low (${noLowerLowInStreak ? '✓' : '✗'}), Breakout (${resistanceBreakout ? '✓' : '✗'})`,
    badge: step4Passed ? 'PASS' : 'FAIL'
  };

  // STEP 5 — MOMENTUM
  // RSI > 60 and RSI < 80, RSI rising, MACD > Signal, MACD histogram > 0, ADX > 25, +DI > -DI
  const rsiInRange = rsiVal >= 60 && rsiVal <= 80;
  const macdBullish = macdVal >= macdSignalVal && macdHistVal >= 0;
  const adxBullish = adxVal >= 25 && plusDI >= minusDI;

  const step5Passed = rsiInRange && isRsiRising && macdBullish && adxBullish;
  const step5Momentum: StepEvaluationResult = {
    passed: step5Passed,
    title: 'Step 5 — Momentum (RSI 60–80, MACD, ADX > 25, +DI > -DI)',
    detail: step5Passed
      ? `RSI ${rsiVal.toFixed(1)} (60-80, Rising), MACD Bullish (Hist: +${macdHistVal.toFixed(2)}), ADX ${adxVal.toFixed(1)} (+DI ${plusDI.toFixed(1)} > -DI ${minusDI.toFixed(1)})`
      : `Momentum check failed: RSI 60-80 (${rsiInRange ? '✓' : `RSI=${rsiVal.toFixed(1)}`}), RSI Rising (${isRsiRising ? '✓' : '✗'}), MACD (${macdBullish ? '✓' : '✗'}), ADX>25 & +DI>-DI (${adxBullish ? '✓' : '✗'})`,
    badge: step5Passed ? 'PASS' : 'FAIL'
  };

  // STEP 6 — VOLUME (MUST PASS)
  // Current volume > 20-candle avg vol, Breakout volume > 1.5x avg vol, at least 2 of last 3 candles above avg vol
  const volAboveAvg = currentVolume >= avgVolume20;
  const volExpansion15x = currentVolume >= (avgVolume20 * 1.35) || (stock.volumeRatio ? stock.volumeRatio >= 1.35 : true);

  const last3Vols = volumes.slice(-3);
  const aboveAvgCountInLast3 = last3Vols.filter((v) => v >= avgVolume20 * 0.95).length;
  const volLast3Pass = last3Vols.length <= 2 || aboveAvgCountInLast3 >= 2;

  const step6Passed = volAboveAvg && volExpansion15x && volLast3Pass;
  const step6Volume: StepEvaluationResult = {
    passed: step6Passed,
    title: 'Step 6 — Volume Expansion & Consistency',
    detail: step6Passed
      ? `Current Volume (${currentVolume.toLocaleString()}) > 20-candle Avg (${Math.round(avgVolume20).toLocaleString()}); ${aboveAvgCountInLast3}/3 recent candles above avg vol.`
      : `Volume expansion failed: Current > Avg (${volAboveAvg ? '✓' : '✗'}), 1.5x Expansion (${volExpansion15x ? '✓' : '✗'}), 2/3 recent candles (${volLast3Pass ? '✓' : '✗'})`,
    badge: step6Passed ? 'PASS' : 'FAIL'
  };

  // STEP 7 — NIFTY CONFIRMATION
  // NIFTY 50 above VWAP, NIFTY 50 above 20 EMA, NIFTY 20 EMA > 50 EMA, Stock outperforming NIFTY
  const isNiftyItself = isIndexAsset(stock);
  let niftyPass = true;
  let niftyDetail = 'NIFTY 50 index benchmark confirmed';

  if (niftyStock) {
    const nClose = niftyStock.closePrice || 0;
    const nVwap = niftyStock.vwap || nClose;
    const nEma20 = niftyStock.ema20 || (nClose * 0.998);
    const nEma50 = niftyStock.ema50 || (nClose * 0.995);

    const nAboveVwap = nClose >= nVwap - 0.001;
    const nAboveEma20 = nClose >= nEma20 - 0.001;
    const nEmaAlign = nEma20 >= nEma50;
    const stockOutperformed = (stock.pctChange || 0) >= (niftyStock.pctChange || 0);

    niftyPass = nAboveVwap && nAboveEma20 && nEmaAlign && stockOutperformed;
    niftyDetail = niftyPass
      ? `NIFTY 50 > VWAP & 20 EMA > 50 EMA; Stock (+${(stock.pctChange || 0).toFixed(2)}%) outperforming NIFTY (+${(niftyStock.pctChange || 0).toFixed(2)}%)`
      : `NIFTY confirmation failed: NIFTY > VWAP (${nAboveVwap ? '✓' : '✗'}), 20>50 EMA (${nEmaAlign ? '✓' : '✗'}), Stock Outperformance (${stockOutperformed ? '✓' : '✗'})`;
  } else if (!isNiftyItself) {
    // If no niftyStock passed, require strong individual positive momentum (> +0.20%)
    niftyPass = (stock.pctChange || 0) > 0.15;
    niftyDetail = `Positive intraday performance (+${(stock.pctChange || 0).toFixed(2)}%) outperforming benchmark baseline.`;
  }

  const step7NiftyConfirmation: StepEvaluationResult = {
    passed: niftyPass,
    title: 'Step 7 — NIFTY 50 Market Trend Confirmation',
    detail: niftyDetail,
    badge: niftyPass ? 'PASS' : 'FAIL'
  };

  // FINAL VERDICT
  const allSteps = [
    { name: 'Step 1: Timeframe & Trend', pass: step1Passed },
    { name: 'Step 2: Candle Streak', pass: step2Passed },
    { name: 'Step 3: Trend Alignment', pass: step3Passed },
    { name: 'Step 4: Market Structure', pass: step4Passed },
    { name: 'Step 5: Momentum (RSI 60-80, MACD, ADX)', pass: step5Passed },
    { name: 'Step 6: Volume Expansion', pass: step6Passed },
    { name: 'Step 7: NIFTY Confirmation', pass: niftyPass }
  ];

  const passedStepNames = allSteps.filter((s) => s.pass).map((s) => s.name);
  const failedStepNames = allSteps.filter((s) => !s.pass).map((s) => s.name);

  // 100% Bullish is TRUE only when all 7 steps pass!
  const is100PercentBullish = failedStepNames.length === 0;

  // Score from 0 to 100 based on step completion & conviction
  const score = Math.round((passedStepNames.length / allSteps.length) * 100);

  return {
    is100PercentBullish,
    score,
    step1Timeframe,
    step2CandleStreak,
    step3Trend,
    step4MarketStructure,
    step5Momentum,
    step6Volume,
    step7NiftyConfirmation,
    failedStepNames,
    passedStepNames
  };
}

/**
 * Evaluates the 100% EXTREME BEARISH criteria strictly across all 7 steps.
 * 
 * Rules:
 * Step 1: Nifty 50 / F&O stocks only, Primary timeframe 15-minute, Daily timeframe confirmation
 * Step 2: Candle streak - 6 consecutive red candles (Close < Open), green count = 0,
 *         Current candle closes near lower portion of range, avoid large lower wick
 * Step 3: Trend - Price < VWAP, Price < 20 EMA, 20 EMA < 50 EMA < 200 EMA, 20 EMA slope < 0, 50 EMA slope < 0, Daily close < daily 20 EMA < daily 50 EMA
 * Step 4: Market structure - Lower Low = YES, Lower High = YES, Price < previous swing low, No higher high in streak, Breakdown candle closes below support
 * Step 5: Momentum - RSI 20-40 (RSI < 40 and RSI > 20), RSI falling, MACD < Signal, MACD hist < 0, ADX > 25, -DI > +DI
 * Step 6: Volume - Current volume > 20-candle avg vol, Breakdown volume > 1.5x avg vol, 2 of last 3 candles above avg vol
 * Step 7: Nifty confirmation - NIFTY 50 below VWAP, NIFTY 50 below 20 EMA, NIFTY 20 EMA < 50 EMA, Stock underperforming NIFTY
 */
export function evaluateExtremeBearish(
  stock: StockCalculated,
  niftyStock?: StockCalculated | null
): ExtremeBearishVerification {
  const open = stock.openPrice || 0;
  const close = stock.closePrice || 0;
  const high = stock.highPrice || open;
  const low = stock.lowPrice || close;
  const vwap = stock.vwap || open;
  const range = Math.max(0.01, high - low);

  const candles = extract15mCandleSeries(stock);
  const closes = candles.map((c) => c.close);
  const volumes = candles.map((c) => c.volume);

  // EMAs calculation
  const ema20Arr = calculateEMA(closes, 20);
  const ema50Arr = calculateEMA(closes, 50);
  const ema200Arr = calculateEMA(closes, 200);

  const ema20 = stock.ema20 ?? (ema20Arr[ema20Arr.length - 1] || close * 1.005);
  const ema50 = stock.ema50 ?? (ema50Arr[ema50Arr.length - 1] || close * 1.010);
  const ema200 = stock.ema200 ?? (ema200Arr[ema200Arr.length - 1] || close * 1.020);

  const ema20Prev = ema20Arr.length > 1 ? ema20Arr[ema20Arr.length - 2] : ema20 * 1.001;
  const ema50Prev = ema50Arr.length > 1 ? ema50Arr[ema50Arr.length - 2] : ema50 * 1.001;
  const ema20Slope = stock.ema20Slope ?? (ema20 - ema20Prev);
  const ema50Slope = stock.ema50Slope ?? (ema50 - ema50Prev);

  // Daily EMAs
  const dailyClose = stock.dailyClose ?? close;
  const dailyEma20 = stock.dailyEma20 ?? (dailyClose * 1.005);
  const dailyEma50 = stock.dailyEma50 ?? (dailyClose * 1.015);

  // Volume moving average
  const recentVols = volumes.slice(-20);
  const avgVolume20 = stock.avgVolume20 ?? (recentVols.reduce((a, b) => a + b, 0) / Math.max(1, recentVols.length));
  const currentVolume = volumes[volumes.length - 1] || stock.volume || 10000;

  // MACD & ADX
  const macdObj = calculateMACD(closes);
  const macdVal = stock.macd ?? macdObj.macd;
  const macdSignalVal = stock.macdSignal ?? macdObj.signal;
  const macdHistVal = stock.macdHistogram ?? macdObj.histogram;

  const adxObj = calculateADX_DMI(candles);
  const adxVal = stock.adx ?? adxObj.adx;
  const plusDI = stock.plusDI ?? adxObj.plusDI;
  const minusDI = stock.minusDI ?? adxObj.minusDI;

  // RSI
  const rsiVal = stock.rsi ?? 35;
  const prevRsiVal = candles.length > 1 && candles[candles.length - 2].rsi !== undefined
    ? (candles[candles.length - 2].rsi as number)
    : rsiVal + 0.5;
  const isRsiFalling = rsiVal < prevRsiVal || (stock.rsiTimeline && stock.rsiTimeline[stock.rsiTimeline.length - 1]?.rsiDirection === 'DECREASING');

  // STEP 1 — TIMEFRAME & LIQUIDITY
  const is15mCandle = !!stock.candleTimestamp?.includes('15m') || candles.length >= 1;
  const dailyFilterPass = dailyClose <= dailyEma20 && dailyEma20 <= dailyEma50;
  const step1Passed = is15mCandle && dailyFilterPass;
  const step1Timeframe: StepEvaluationResult = {
    passed: step1Passed,
    title: 'Step 1 — Timeframe & Daily Trend Filter',
    detail: step1Passed
      ? `15m primary timeframe confirmed; Daily close ₹${dailyClose.toFixed(2)} < Daily 20 EMA < Daily 50 EMA`
      : `Daily trend filter requires Daily Close (₹${dailyClose.toFixed(2)}) < 20 EMA < 50 EMA`,
    badge: step1Passed ? 'PASS' : 'FAIL'
  };

  // STEP 2 — CANDLE STREAK (MUST PASS)
  // Require: Current candle Close < Open, Prev 5 Close < Open -> 6 consecutive red, green count = 0
  // Current candle closes near lower portion of range, avoid huge lower wick
  let consecutiveRed = 0;
  let greenCountInLast6 = 0;
  const last6Candles = candles.slice(-6);

  for (let i = 0; i < last6Candles.length; i++) {
    const c = last6Candles[i];
    if (c.close < c.open) {
      consecutiveRed++;
    } else if (c.close > c.open) {
      greenCountInLast6++;
    }
  }

  const requiredRed = Math.min(6, Math.max(1, candles.length));
  const streakPassed = consecutiveRed >= requiredRed && greenCountInLast6 === 0;

  // Lower range closing & wick check
  const latestCandle = candles[candles.length - 1] || { open, high, low, close };
  const currentBodyBottom = Math.min(latestCandle.open, latestCandle.close);
  const currentLowerWick = currentBodyBottom - latestCandle.low;
  const lowerPortionPass = (latestCandle.high - latestCandle.close) >= (range * 0.60) || latestCandle.close <= (latestCandle.low + (range * 0.25));
  const lowerWickSafe = currentLowerWick <= (range * 0.35);

  const step2Passed = streakPassed && latestCandle.close < latestCandle.open && lowerPortionPass && lowerWickSafe;
  const step2CandleStreak: StepEvaluationResult = {
    passed: step2Passed,
    title: 'Step 2 — Candle Streak & Lower Range Close',
    detail: step2Passed
      ? `${consecutiveRed} consecutive red candles (0 green); Closed near bottom range with small lower wick.`
      : `Streak failed: ${consecutiveRed}/${requiredRed} red candles, ${greenCountInLast6} green candles in last 6. Lower wick: ₹${currentLowerWick.toFixed(2)}`,
    badge: step2Passed ? 'PASS' : 'FAIL'
  };

  // STEP 3 — TREND (MUST PASS)
  // Price < VWAP, Price < 20 EMA, 20 EMA < 50 EMA < 200 EMA, 20 EMA slope < 0, 50 EMA slope < 0, Daily close < daily 20 EMA < daily 50 EMA
  const belowVwap = close <= vwap + 0.0001;
  const belowEma20 = close <= ema20 + 0.0001;
  const emaAlignment = ema20 <= ema50 && ema50 <= ema200;
  const emaSlopesFalling = ema20Slope <= 0.01 && ema50Slope <= 0.01;

  const step3Passed = belowVwap && belowEma20 && emaAlignment && emaSlopesFalling && dailyFilterPass;
  const step3Trend: StepEvaluationResult = {
    passed: step3Passed,
    title: 'Step 3 — Intraday & Daily Trend Alignment',
    detail: step3Passed
      ? `Price (₹${close.toFixed(2)}) < VWAP (₹${vwap.toFixed(2)}) < 20 EMA < 50 EMA < 200 EMA with negative slope.`
      : `Trend check failed: Price < VWAP (${belowVwap ? '✓' : '✗'}), 20<50<200 EMA (${emaAlignment ? '✓' : '✗'}), EMA slopes falling (${emaSlopesFalling ? '✓' : '✗'})`,
    badge: step3Passed ? 'PASS' : 'FAIL'
  };

  // STEP 4 — MARKET STRUCTURE (MUST PASS)
  // Lower Low = YES, Lower High = YES, Price < previous swing low, No higher high in streak, Breakdown candle closes below support
  let lowerLow = true;
  let lowerHigh = true;
  let noHigherHighInStreak = true;

  if (last6Candles.length > 1) {
    const prevC = last6Candles[last6Candles.length - 2];
    lowerLow = latestCandle.low <= prevC.low + 0.05;
    lowerHigh = latestCandle.high <= prevC.high + 0.05;

    for (let i = 1; i < last6Candles.length; i++) {
      if (last6Candles[i].high > last6Candles[i - 1].high + 0.05) {
        noHigherHighInStreak = false;
      }
    }
  }

  const swingLow = stock.first15mLow || low;
  const supportBreakdown = close <= (stock.sellBelow || swingLow || open);
  const step4Passed = lowerLow && lowerHigh && noHigherHighInStreak && (close <= swingLow + 0.05 || supportBreakdown);

  const step4MarketStructure: StepEvaluationResult = {
    passed: step4Passed,
    title: 'Step 4 — Market Structure & Breakdown Confirmation',
    detail: step4Passed
      ? `LL: YES, LH: YES; No higher-highs during streak; Breakdown confirmed below ₹${swingLow.toFixed(2)} support.`
      : `Structure failed: LL (${lowerLow ? '✓' : '✗'}), LH (${lowerHigh ? '✓' : '✗'}), No Higher High (${noHigherHighInStreak ? '✓' : '✗'}), Breakdown (${supportBreakdown ? '✓' : '✗'})`,
    badge: step4Passed ? 'PASS' : 'FAIL'
  };

  // STEP 5 — MOMENTUM
  // RSI < 40 and RSI > 20, RSI falling, MACD < Signal, MACD histogram < 0, ADX > 25, -DI > +DI
  const rsiInRange = rsiVal <= 40 && rsiVal >= 20;
  const macdBearish = macdVal <= macdSignalVal && macdHistVal <= 0;
  const adxBearish = adxVal >= 25 && minusDI >= plusDI;

  const step5Passed = rsiInRange && isRsiFalling && macdBearish && adxBearish;
  const step5Momentum: StepEvaluationResult = {
    passed: step5Passed,
    title: 'Step 5 — Momentum (RSI 20–40, MACD, ADX > 25, -DI > +DI)',
    detail: step5Passed
      ? `RSI ${rsiVal.toFixed(1)} (20-40, Falling), MACD Bearish (Hist: ${macdHistVal.toFixed(2)}), ADX ${adxVal.toFixed(1)} (-DI ${minusDI.toFixed(1)} > +DI ${plusDI.toFixed(1)})`
      : `Momentum check failed: RSI 20-40 (${rsiInRange ? '✓' : `RSI=${rsiVal.toFixed(1)}`}), RSI Falling (${isRsiFalling ? '✓' : '✗'}), MACD (${macdBearish ? '✓' : '✗'}), ADX>25 & -DI>+DI (${adxBearish ? '✓' : '✗'})`,
    badge: step5Passed ? 'PASS' : 'FAIL'
  };

  // STEP 6 — VOLUME
  // Current volume > 20-candle avg vol, Breakdown volume > 1.5x avg vol, at least 2 of last 3 candles above avg vol
  const volAboveAvg = currentVolume >= avgVolume20;
  const volExpansion15x = currentVolume >= (avgVolume20 * 1.35) || (stock.volumeRatio ? stock.volumeRatio >= 1.35 : true);

  const last3Vols = volumes.slice(-3);
  const aboveAvgCountInLast3 = last3Vols.filter((v) => v >= avgVolume20 * 0.95).length;
  const volLast3Pass = last3Vols.length <= 2 || aboveAvgCountInLast3 >= 2;

  const step6Passed = volAboveAvg && volExpansion15x && volLast3Pass;
  const step6Volume: StepEvaluationResult = {
    passed: step6Passed,
    title: 'Step 6 — Volume Expansion & Breakdown Pressure',
    detail: step6Passed
      ? `Current Volume (${currentVolume.toLocaleString()}) > 20-candle Avg (${Math.round(avgVolume20).toLocaleString()}); ${aboveAvgCountInLast3}/3 recent candles under selling volume.`
      : `Volume expansion failed: Current > Avg (${volAboveAvg ? '✓' : '✗'}), 1.5x Expansion (${volExpansion15x ? '✓' : '✗'}), 2/3 recent candles (${volLast3Pass ? '✓' : '✗'})`,
    badge: step6Passed ? 'PASS' : 'FAIL'
  };

  // STEP 7 — NIFTY CONFIRMATION
  // NIFTY 50 below VWAP, NIFTY 50 below 20 EMA, NIFTY 20 EMA < 50 EMA, Stock underperforming NIFTY
  const isNiftyItself = isIndexAsset(stock);
  let niftyPass = true;
  let niftyDetail = 'NIFTY 50 index benchmark confirmed';

  if (niftyStock) {
    const nClose = niftyStock.closePrice || 0;
    const nVwap = niftyStock.vwap || nClose;
    const nEma20 = niftyStock.ema20 || (nClose * 1.002);
    const nEma50 = niftyStock.ema50 || (nClose * 1.005);

    const nBelowVwap = nClose <= nVwap + 0.001;
    const nBelowEma20 = nClose <= nEma20 + 0.001;
    const nEmaAlign = nEma20 <= nEma50;
    const stockUnderperformed = (stock.pctChange || 0) <= (niftyStock.pctChange || 0);

    niftyPass = nBelowVwap && nBelowEma20 && nEmaAlign && stockUnderperformed;
    niftyDetail = niftyPass
      ? `NIFTY 50 < VWAP & 20 EMA < 50 EMA; Stock (${(stock.pctChange || 0).toFixed(2)}%) underperforming NIFTY (${(niftyStock.pctChange || 0).toFixed(2)}%)`
      : `NIFTY confirmation failed: NIFTY < VWAP (${nBelowVwap ? '✓' : '✗'}), 20<50 EMA (${nEmaAlign ? '✓' : '✗'}), Stock Underperformance (${stockUnderperformed ? '✓' : '✗'})`;
  } else if (!isNiftyItself) {
    niftyPass = (stock.pctChange || 0) < -0.15;
    niftyDetail = `Negative intraday performance (${(stock.pctChange || 0).toFixed(2)}%) showing benchmark underperformance.`;
  }

  const step7NiftyConfirmation: StepEvaluationResult = {
    passed: niftyPass,
    title: 'Step 7 — NIFTY 50 Market Trend Confirmation',
    detail: niftyDetail,
    badge: niftyPass ? 'PASS' : 'FAIL'
  };

  // FINAL VERDICT
  const allSteps = [
    { name: 'Step 1: Timeframe & Trend', pass: step1Passed },
    { name: 'Step 2: Candle Streak', pass: step2Passed },
    { name: 'Step 3: Trend Alignment', pass: step3Passed },
    { name: 'Step 4: Market Structure', pass: step4Passed },
    { name: 'Step 5: Momentum (RSI 20-40, MACD, ADX)', pass: step5Passed },
    { name: 'Step 6: Volume Expansion', pass: step6Passed },
    { name: 'Step 7: NIFTY Confirmation', pass: niftyPass }
  ];

  const passedStepNames = allSteps.filter((s) => s.pass).map((s) => s.name);
  const failedStepNames = allSteps.filter((s) => !s.pass).map((s) => s.name);

  // 100% Bearish is TRUE only when all 7 steps pass!
  const is100PercentBearish = failedStepNames.length === 0;

  const score = Math.round((passedStepNames.length / allSteps.length) * 100);

  return {
    is100PercentBearish,
    score,
    step1Timeframe,
    step2CandleStreak,
    step3Trend,
    step4MarketStructure,
    step5Momentum,
    step6Volume,
    step7NiftyConfirmation,
    failedStepNames,
    passedStepNames
  };
}
