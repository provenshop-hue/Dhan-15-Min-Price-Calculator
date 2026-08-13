import { StockCalculated, RsiIntradayPoint } from '../types';
import { generateIntradayRsiTimeline } from './rsiAnalyst';

export interface BullishCombo1Result {
  isMatch: boolean;
  ema9: number;
  ema20: number;
  ema50: number;
  isEmaStacked: boolean; // 9 EMA > 20 EMA > 50 EMA
  isPriceAboveAll: boolean; // Price above all three EMAs
  isEmaRising: boolean; // EMAs rising
  isPullbackRespected: boolean; // Pullback respects 9/20 EMA
  score: number; // 0 - 100
  details: string;
}

export interface BullishCombo2Result {
  isMatch: boolean;
  rsi: number;
  isRsiInZone: boolean; // RSI preferably 55–70
  isPriceHigherHighs: boolean; // Price making higher highs
  isRsiHigherHighs: boolean; // RSI also making higher highs
  score: number; // 0 - 100
  details: string;
}

export interface BullishCombo3Result {
  isMatch: boolean;
  macd: number;
  signal: number;
  histogram: number;
  isBullishCrossover: boolean; // MACD bullish crossover
  isAboveZero: boolean; // MACD above zero
  isHistogramIncreasing: boolean; // Histogram increasing
  isPriceAboveMajorMAs: boolean; // Price above major moving averages
  score: number; // 0 - 100
  details: string;
}

export interface BullishSectionAnalysis {
  combo1: BullishCombo1Result;
  combo2: BullishCombo2Result;
  combo3: BullishCombo3Result;
  totalCombosMet: number; // 0, 1, 2, 3
  isAllCombosMet: boolean; // Combination 1 & 2 & 3
  isAnyComboMet: boolean; // At least one combination met
  bullishConfluenceScore: number; // Overall 0 - 100 score
  summaryBadge: string;
  badgeClass: string;
}

/**
 * Calculates exponential moving average array
 */
export function calculateEMA(prices: number[], period: number): number[] {
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
 * Calculates MACD (12, 26, 9)
 */
export function calculateMACD(prices: number[]): { macd: number[]; signal: number[]; histogram: number[] } {
  if (!prices || prices.length < 5) {
    return { macd: [0], signal: [0], histogram: [0] };
  }
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macdLine = prices.map((_, i) => ema12[i] - ema26[i]);
  const signalLine = calculateEMA(macdLine, 9);
  const histogram = macdLine.map((m, i) => m - signalLine[i]);

  return { macd: macdLine, signal: signalLine, histogram };
}

/**
 * Derives a price sequence for indicator calculations
 */
function getPriceSequence(stock: StockCalculated, timeline: RsiIntradayPoint[]): number[] {
  if (timeline && timeline.length >= 5) {
    return timeline.map((pt) => pt.close);
  }
  
  const open = stock.openPrice || 100;
  const high = stock.highPrice || open * 1.01;
  const low = stock.lowPrice || open * 0.99;
  const close = stock.closePrice || open;
  const prevClose = stock.previousClose || open;

  // Construct synthetic price steps
  const prices: number[] = [
    prevClose,
    (prevClose + open) / 2,
    open,
    (open + low) / 2,
    low,
    (low + high) / 2,
    (open + close) / 2,
    high,
    (high + close) / 2,
    close
  ];
  return prices;
}

/**
 * Combination 1:
 * - 9 EMA > 20 EMA > 50 EMA
 * - Price above all three
 * - EMAs rising
 * - Pullback respects 9/20 EMA
 */
export function analyzeBullishCombo1(stock: StockCalculated, timeline: RsiIntradayPoint[]): BullishCombo1Result {
  const prices = getPriceSequence(stock, timeline);
  const close = stock.closePrice || prices[prices.length - 1] || 100;
  const low = stock.lowPrice || close * 0.99;

  const ema9Arr = calculateEMA(prices, 9);
  const ema20Arr = calculateEMA(prices, 20);
  const ema50Arr = calculateEMA(prices, 50);

  const currEma9 = ema9Arr[ema9Arr.length - 1];
  const currEma20 = ema20Arr[ema20Arr.length - 1];
  const currEma50 = ema50Arr[ema50Arr.length - 1];

  const prevEma9 = ema9Arr.length > 1 ? ema9Arr[ema9Arr.length - 2] : currEma9;
  const prevEma20 = ema20Arr.length > 1 ? ema20Arr[ema20Arr.length - 2] : currEma20;
  const prevEma50 = ema50Arr.length > 1 ? ema50Arr[ema50Arr.length - 2] : currEma50;

  // 1. Stacked check: 9 EMA > 20 EMA > 50 EMA
  const isEmaStacked = currEma9 > currEma20 && currEma20 > currEma50;

  // 2. Price above all three
  const isPriceAboveAll = close > currEma9 && close > currEma20 && close > currEma50;

  // 3. EMAs rising
  const isEmaRising = currEma9 >= prevEma9 && currEma20 >= prevEma20 && currEma50 >= prevEma50;

  // 4. Pullback respects 9/20 EMA:
  // Low touched or stayed near 9/20 EMA (above 50 EMA) while price close remains above 9/20 EMA or 50 EMA
  const isPullbackRespected = low >= currEma50 && low <= currEma9 * 1.015 && close >= currEma20 * 0.998;

  let score = 0;
  if (isEmaStacked) score += 30;
  if (isPriceAboveAll) score += 35;
  if (isEmaRising) score += 20;
  if (isPullbackRespected) score += 15;

  const isMatch = isEmaStacked && isPriceAboveAll && isEmaRising && isPullbackRespected;

  const details = [
    `EMA Stack (9>20>50): ${isEmaStacked ? 'PASS' : 'FAIL'} (9: ₹${currEma9.toFixed(1)}, 20: ₹${currEma20.toFixed(1)}, 50: ₹${currEma50.toFixed(1)})`,
    `Price > EMAs: ${isPriceAboveAll ? 'PASS' : 'FAIL'} (LTP: ₹${close.toFixed(2)})`,
    `EMAs Rising: ${isEmaRising ? 'PASS' : 'FAIL'}`,
    `Pullback Respects 9/20 EMA: ${isPullbackRespected ? 'PASS' : 'FAIL'} (Low: ₹${low.toFixed(2)})`
  ].join(' | ');

  return {
    isMatch,
    ema9: currEma9,
    ema20: currEma20,
    ema50: currEma50,
    isEmaStacked,
    isPriceAboveAll,
    isEmaRising,
    isPullbackRespected,
    score,
    details
  };
}

/**
 * Combination 2:
 * - RSI preferably 55–70
 * - Price making higher highs
 * - RSI also making higher highs
 */
export function analyzeBullishCombo2(stock: StockCalculated, timeline: RsiIntradayPoint[]): BullishCombo2Result {
  const currentRsi = stock.rsi ?? (timeline && timeline.length > 0 ? timeline[timeline.length - 1].rsi : 60);

  // 1. RSI preferably 55–70
  const isRsiInZone = currentRsi >= 55 && currentRsi <= 70;

  // Check higher highs across timeline points or current price vs open / previous close
  let isPriceHigherHighs = false;
  let isRsiHigherHighs = false;

  if (timeline && timeline.length >= 3) {
    const len = timeline.length;
    const lastPrice = timeline[len - 1].close;
    const prevPrice = timeline[len - 2].close;
    const prevPrice2 = timeline[len - 3].close;

    const lastRsi = timeline[len - 1].rsi;
    const prevRsi = timeline[len - 2].rsi;
    const prevRsi2 = timeline[len - 3].rsi;

    isPriceHigherHighs = (lastPrice > prevPrice && prevPrice >= prevPrice2) || (stock.highPrice ? stock.highPrice > (stock.previousClose || stock.openPrice || 0) : false);
    isRsiHigherHighs = (lastRsi > prevRsi && prevRsi >= prevRsi2) || (timeline[len - 1].rsiDelta > 0);
  } else {
    const open = stock.openPrice || 100;
    const high = stock.highPrice || open;
    const close = stock.closePrice || open;
    const prevClose = stock.previousClose || open;

    isPriceHigherHighs = high > prevClose && close > open;
    isRsiHigherHighs = currentRsi > 52 && (stock.pctChange || 0) > 0;
  }

  let score = 0;
  if (isRsiInZone) score += 40;
  else if (currentRsi >= 50 && currentRsi <= 75) score += 20;

  if (isPriceHigherHighs) score += 30;
  if (isRsiHigherHighs) score += 30;

  const isMatch = isRsiInZone && isPriceHigherHighs && isRsiHigherHighs;

  const details = [
    `RSI 55-70 Zone: ${isRsiInZone ? 'PASS' : 'FAIL'} (Current RSI: ${currentRsi.toFixed(1)})`,
    `Price Higher Highs: ${isPriceHigherHighs ? 'PASS' : 'FAIL'}`,
    `RSI Higher Highs: ${isRsiHigherHighs ? 'PASS' : 'FAIL'}`
  ].join(' | ');

  return {
    isMatch,
    rsi: currentRsi,
    isRsiInZone,
    isPriceHigherHighs,
    isRsiHigherHighs,
    score,
    details
  };
}

/**
 * Combination 3:
 * - MACD bullish crossover
 * - MACD above zero
 * - Histogram increasing
 * - Price above major moving averages (20 & 50 EMA)
 */
export function analyzeBullishCombo3(stock: StockCalculated, timeline: RsiIntradayPoint[]): BullishCombo3Result {
  const prices = getPriceSequence(stock, timeline);
  const close = stock.closePrice || prices[prices.length - 1] || 100;

  const { macd, signal, histogram } = calculateMACD(prices);
  const currMacd = macd[macd.length - 1];
  const currSignal = signal[signal.length - 1];
  const currHist = histogram[histogram.length - 1];

  const prevHist = histogram.length > 1 ? histogram[histogram.length - 2] : currHist;

  const ema20Arr = calculateEMA(prices, 20);
  const ema50Arr = calculateEMA(prices, 50);
  const currEma20 = ema20Arr[ema20Arr.length - 1];
  const currEma50 = ema50Arr[ema50Arr.length - 1];

  // 1. MACD Bullish Crossover: MACD > Signal
  const isBullishCrossover = currMacd >= currSignal;

  // 2. MACD Above Zero
  const isAboveZero = currMacd > 0;

  // 3. Histogram Increasing
  const isHistogramIncreasing = currHist > prevHist && currHist > 0;

  // 4. Price above major moving averages (20 EMA and 50 EMA)
  const isPriceAboveMajorMAs = close > currEma20 && close > currEma50;

  let score = 0;
  if (isBullishCrossover) score += 30;
  if (isAboveZero) score += 25;
  if (isHistogramIncreasing) score += 25;
  if (isPriceAboveMajorMAs) score += 20;

  const isMatch = isBullishCrossover && isAboveZero && isHistogramIncreasing && isPriceAboveMajorMAs;

  const details = [
    `MACD Crossover: ${isBullishCrossover ? 'PASS' : 'FAIL'} (MACD: ${currMacd.toFixed(2)}, Signal: ${currSignal.toFixed(2)})`,
    `MACD > 0: ${isAboveZero ? 'PASS' : 'FAIL'}`,
    `Hist Increasing: ${isHistogramIncreasing ? 'PASS' : 'FAIL'} (${currHist.toFixed(2)} > ${prevHist.toFixed(2)})`,
    `Price > Major MAs: ${isPriceAboveMajorMAs ? 'PASS' : 'FAIL'} (LTP: ₹${close.toFixed(2)} vs 20EMA: ₹${currEma20.toFixed(1)}, 50EMA: ₹${currEma50.toFixed(1)})`
  ].join(' | ');

  return {
    isMatch,
    macd: currMacd,
    signal: currSignal,
    histogram: currHist,
    isBullishCrossover,
    isAboveZero,
    isHistogramIncreasing,
    isPriceAboveMajorMAs,
    score,
    details
  };
}

/**
 * Main analyzer function for all 3 Bullish Combinations
 */
export function analyzeBullishCombinations(stock: StockCalculated): BullishSectionAnalysis {
  const timeline = generateIntradayRsiTimeline(stock);

  const combo1 = analyzeBullishCombo1(stock, timeline);
  const combo2 = analyzeBullishCombo2(stock, timeline);
  const combo3 = analyzeBullishCombo3(stock, timeline);

  let totalCombosMet = 0;
  if (combo1.isMatch) totalCombosMet++;
  if (combo2.isMatch) totalCombosMet++;
  if (combo3.isMatch) totalCombosMet++;

  const isAllCombosMet = combo1.isMatch && combo2.isMatch && combo3.isMatch;
  const isAnyComboMet = combo1.isMatch || combo2.isMatch || combo3.isMatch;

  const bullishConfluenceScore = Math.round((combo1.score + combo2.score + combo3.score) / 3);

  let summaryBadge = 'No Combo Met';
  let badgeClass = 'bg-slate-100 text-slate-600 border-slate-300';

  if (isAllCombosMet) {
    summaryBadge = '🔥 TRIPLE BULLISH POWER (All 3 Met)';
    badgeClass = 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-300';
  } else if (totalCombosMet === 2) {
    summaryBadge = '🚀 Strong Bullish (2 Combos Met)';
    badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
  } else if (totalCombosMet === 1) {
    summaryBadge = '🟢 Moderate Bullish (1 Combo Met)';
    badgeClass = 'bg-blue-100 text-blue-800 border-blue-300 font-semibold';
  }

  return {
    combo1,
    combo2,
    combo3,
    totalCombosMet,
    isAllCombosMet,
    isAnyComboMet,
    bullishConfluenceScore,
    summaryBadge,
    badgeClass
  };
}
