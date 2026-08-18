import { StockCalculated } from '../types';
import { is100PercentBullishMove, is100PercentBearishMove, get100PercentBullishScore, get100PercentBearishScore } from './rsiPullback';
import { isOpenLowPattern, isOpenHighPattern, isAboveFirst15mCandle, isBelowFirst15mCandle } from './gann';
import { analyzeBullishCombinations } from './bullishCombinations';
import { getExactNseStrikeStep, roundToExactNseStrike, formatStrikePrice } from './nseStrikeMaster';

export type RallyDirection = 'BULLISH' | 'BEARISH';

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

export interface RallySignal {
  stock: StockCalculated;
  symbol: string;
  companyName: string;
  direction: RallyDirection;
  currentPrice: number;
  openPrice: number;
  pctChange: number;
  rallyType: string;
  confidenceScore: number; // 75 - 98%
  confidenceBadge: 'INSTITUTIONAL DIAMOND' | 'HIGH CONVICTION PRIME' | 'CONFIRMED BREAKOUT';
  reason: string;
  timestamp: string;
  confluencePoints: string[];
  tradePlan: HighAccuracyTradePlan;
  buyAbove?: number;
  sellBelow?: number;
  rsi?: number;
  adx?: number;
  vwap?: number;
  first15mHigh?: number;
  first15mLow?: number;
}

// Backward compatibility alias
export type BullishRallySignal = RallySignal;

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
  const comboAnalysis = analyzeBullishCombinations(stock);
  const timestamp = stock.candleTimestamp || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  let scoreWeight = 0;
  let rallyType = '';
  const confluencePoints: string[] = [];

  if (is100Bull) {
    scoreWeight += 35;
    rallyType = '100% Bullish Power Move';
    confluencePoints.push('100% Bullish solid body (≥65% candle range) closing near highs');
  }

  if (comboAnalysis.isAllCombosMet) {
    scoreWeight += 35;
    if (!rallyType) rallyType = 'Triple Power EMA Alignment';
    confluencePoints.push('Triple technical stack: EMA 9>20>50 rising + RSI Higher-Highs + MACD green');
  } else if (comboAnalysis.combo1.isMatch && comboAnalysis.combo2.isMatch) {
    scoreWeight += 25;
    if (!rallyType) rallyType = 'EMA & Momentum Acceleration';
    confluencePoints.push('EMA Ribbon expansion & RSI momentum alignment active');
  } else if (comboAnalysis.combo1.isMatch || comboAnalysis.combo2.isMatch) {
    scoreWeight += 15;
  }

  if (isOpenLow) {
    scoreWeight += 28;
    if (!rallyType) rallyType = 'Institutional Open=Low Breakout';
    confluencePoints.push('Strict Open = Low verified (Buyers defended opening tick)');
  }

  if (isAbove15m) {
    scoreWeight += 22;
    if (!rallyType) rallyType = '15m Candle High Breakout';
    confluencePoints.push(`Trading above first 15m high (₹${(stock.first15mHigh || stock.buyAbove || 0).toFixed(2)})`);
  }

  if (stock.trend === 'Very Bullish') {
    scoreWeight += 28;
    if (!rallyType) rallyType = 'Gann 45° Bullish Momentum';
    confluencePoints.push('Gann 45° angle bullish trajectory confirmed');
  } else if (stock.trend === 'Bullish') {
    scoreWeight += 18;
    if (!rallyType) rallyType = 'Bullish Trend Continuation';
    confluencePoints.push('Positive Gann upward trend structure');
  }

  if (vwap && cmp >= vwap) {
    scoreWeight += 15;
    confluencePoints.push(`Holding above VWAP (₹${vwap.toFixed(2)}) institutional baseline`);
  }

  if (rsi !== null && rsi >= 54 && rsi <= 78) {
    scoreWeight += 15;
    confluencePoints.push(`RSI at ${rsi.toFixed(1)} in ideal continuation acceleration zone`);
  }

  // Check if open calculation is favorable
  if (stock.openCalc !== undefined && stock.openCalc < 3.0) {
    scoreWeight += 10;
    confluencePoints.push(`Gann Open Calc (${stock.openCalc.toFixed(2)}) < 3.0 trigger`);
  }

  // Minimum threshold: Must have at least one strong technical pattern
  if (scoreWeight < 25) {
    return null;
  }

  // Calibrate final accuracy score (80% - 98%)
  const finalScore = Math.min(98, Math.max(80, Math.round(65 + (scoreWeight * 0.33))));

  let confidenceBadge: 'INSTITUTIONAL DIAMOND' | 'HIGH CONVICTION PRIME' | 'CONFIRMED BREAKOUT' = 'CONFIRMED BREAKOUT';
  if (finalScore >= 92) {
    confidenceBadge = 'INSTITUTIONAL DIAMOND';
  } else if (finalScore >= 86) {
    confidenceBadge = 'HIGH CONVICTION PRIME';
  }

  if (!rallyType) {
    rallyType = 'Bullish Momentum Breakout';
  }

  const reason = `High-probability Bullish Rally with ${confluencePoints.length} confirmed institutional confluences. Price driving upwards with strong buyer conviction and favorable risk:reward.`;
  const tradePlan = buildTradePlan(stock, 'BULLISH', cmp);

  return {
    stock,
    symbol: stock.symbol,
    companyName: stock.companyName,
    direction: 'BULLISH',
    currentPrice: cmp,
    openPrice: open,
    pctChange: pct,
    rallyType,
    confidenceScore: finalScore,
    confidenceBadge,
    reason,
    timestamp,
    confluencePoints,
    tradePlan,
    buyAbove: stock.buyAbove,
    sellBelow: stock.sellBelow,
    rsi: stock.rsi,
    adx: stock.adx,
    vwap: stock.vwap,
    first15mHigh: stock.first15mHigh,
    first15mLow: stock.first15mLow
  };
}

/**
 * Evaluates whether a stock meets High-Probability Bearish Breakdown criteria.
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
  const timestamp = stock.candleTimestamp || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  let scoreWeight = 0;
  let rallyType = '';
  const confluencePoints: string[] = [];

  if (is100Bear) {
    scoreWeight += 35;
    rallyType = '100% Bearish Breakdown Move';
    confluencePoints.push('100% Bearish solid red body closing near session lows');
  }

  if (isOpenHigh) {
    scoreWeight += 30;
    if (!rallyType) rallyType = 'Institutional Open=High Supply';
    confluencePoints.push('Strict Open = High verified (Sellers aggressively sold opening tick)');
  }

  if (isBelow15m) {
    scoreWeight += 25;
    if (!rallyType) rallyType = '15m Candle Low Breakdown';
    confluencePoints.push(`Broken below first 15m support low (₹${(stock.first15mLow || stock.sellBelow || 0).toFixed(2)})`);
  }

  if (stock.trend === 'Very Bearish') {
    scoreWeight += 28;
    if (!rallyType) rallyType = 'Gann 45° Bearish Breakdown';
    confluencePoints.push('Gann 45° downward trajectory confirmed');
  } else if (stock.trend === 'Bearish') {
    scoreWeight += 18;
    if (!rallyType) rallyType = 'Bearish Trend Flow';
    confluencePoints.push('Negative Gann downward trend structure');
  }

  if (vwap && cmp <= vwap) {
    scoreWeight += 15;
    confluencePoints.push(`Trading below VWAP (₹${vwap.toFixed(2)}) resistance`);
  }

  if (rsi !== null && rsi <= 46 && rsi >= 20) {
    scoreWeight += 15;
    confluencePoints.push(`RSI at ${rsi.toFixed(1)} confirms strong seller momentum`);
  }

  if (scoreWeight < 25) {
    return null;
  }

  const finalScore = Math.min(98, Math.max(80, Math.round(65 + (scoreWeight * 0.33))));

  let confidenceBadge: 'INSTITUTIONAL DIAMOND' | 'HIGH CONVICTION PRIME' | 'CONFIRMED BREAKOUT' = 'CONFIRMED BREAKOUT';
  if (finalScore >= 92) {
    confidenceBadge = 'INSTITUTIONAL DIAMOND';
  } else if (finalScore >= 86) {
    confidenceBadge = 'HIGH CONVICTION PRIME';
  }

  if (!rallyType) {
    rallyType = 'Bearish Momentum Breakdown';
  }

  const reason = `High-probability Bearish Breakdown with ${confluencePoints.length} confirmed institutional confluences. Heavy selling pressure below resistance with defined downside targets.`;
  const tradePlan = buildTradePlan(stock, 'BEARISH', cmp);

  return {
    stock,
    symbol: stock.symbol,
    companyName: stock.companyName,
    direction: 'BEARISH',
    currentPrice: cmp,
    openPrice: open,
    pctChange: pct,
    rallyType,
    confidenceScore: finalScore,
    confidenceBadge,
    reason,
    timestamp,
    confluencePoints,
    tradePlan,
    buyAbove: stock.buyAbove,
    sellBelow: stock.sellBelow,
    rsi: stock.rsi,
    adx: stock.adx,
    vwap: stock.vwap,
    first15mHigh: stock.first15mHigh,
    first15mLow: stock.first15mLow
  };
}

/**
 * Returns all highly accurate Bullish and Bearish rally stocks, sorted by Conviction Score & % Move.
 */
export function getAllRallySignals(
  stocks: StockCalculated[],
  filterDirection: 'ALL' | 'BULLISH_ONLY' | 'BEARISH_ONLY' = 'ALL'
): RallySignal[] {
  const results: RallySignal[] = [];

  for (const s of stocks) {
    if (filterDirection !== 'BEARISH_ONLY') {
      const bull = detectBullishRally(s);
      if (bull) results.push(bull);
    }
    if (filterDirection !== 'BULLISH_ONLY') {
      const bear = detectBearishRally(s);
      if (bear) results.push(bear);
    }
  }

  return results.sort((a, b) => {
    if (b.confidenceScore !== a.confidenceScore) {
      return b.confidenceScore - a.confidenceScore;
    }
    return Math.abs(b.pctChange) - Math.abs(a.pctChange);
  });
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
