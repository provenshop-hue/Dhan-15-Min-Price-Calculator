import { StockCalculated } from '../types';
import { is100PercentBullishMove, get100PercentBullishScore } from './rsiPullback';
import { isOpenLowPattern, isAboveFirst15mCandle } from './gann';
import { analyzeBullishCombinations } from './bullishCombinations';

export interface BullishRallySignal {
  stock: StockCalculated;
  symbol: string;
  companyName: string;
  currentPrice: number;
  openPrice: number;
  pctChange: number;
  rallyType: '100% Bullish Move' | 'Triple Power Bullish' | 'Very Bullish Trend' | 'Open=Low Breakout' | 'Bullish Momentum';
  confidenceScore: number; // 50 - 100
  reason: string;
  timestamp: string;
  buyAbove?: number;
  rsi?: number;
  adx?: number;
  vwap?: number;
  first15mHigh?: number;
}

/**
 * Evaluates whether a stock is currently in an active Bullish Rally.
 */
export function detectBullishRally(stock: StockCalculated): BullishRallySignal | null {
  if (!stock.openPrice || !stock.closePrice || stock.openPrice <= 0 || stock.closePrice <= 0) {
    return null;
  }

  const open = stock.openPrice;
  const cmp = stock.closePrice;
  const pct = stock.pctChange !== undefined && stock.pctChange !== null
    ? stock.pctChange
    : ((cmp - open) / open) * 100;

  const is100Bull = is100PercentBullishMove(stock);
  const isOpenLow = isOpenLowPattern(stock.openPrice, stock.lowPrice, stock.first15mLow);
  const isAbove15m = isAboveFirst15mCandle(stock);
  const comboAnalysis = analyzeBullishCombinations(stock);

  const timestamp = stock.candleTimestamp || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  // 1. Priority 1: 100% Bullish Move Pattern
  if (is100Bull) {
    const score = get100PercentBullishScore(stock);
    return {
      stock,
      symbol: stock.symbol,
      companyName: stock.companyName,
      currentPrice: cmp,
      openPrice: open,
      pctChange: pct,
      rallyType: '100% Bullish Move',
      confidenceScore: score || 95,
      reason: '100% Bullish candle breakout with strong body (≥65% range), close near highs, and positive intraday momentum.',
      timestamp,
      buyAbove: stock.buyAbove,
      rsi: stock.rsi,
      adx: stock.adx,
      vwap: stock.vwap,
      first15mHigh: stock.first15mHigh
    };
  }

  // 2. Priority 2: Triple Power Bullish (All 3 EMA, RSI, and MACD combos met)
  if (comboAnalysis.isAllCombosMet) {
    return {
      stock,
      symbol: stock.symbol,
      companyName: stock.companyName,
      currentPrice: cmp,
      openPrice: open,
      pctChange: pct,
      rallyType: 'Triple Power Bullish',
      confidenceScore: 92,
      reason: 'Triple technical alignment: 9/20/50 EMA stack rising + RSI 55–70 Higher Highs + MACD bullish crossover.',
      timestamp: comboAnalysis.firstTripleHitTime || timestamp,
      buyAbove: stock.buyAbove,
      rsi: stock.rsi,
      adx: stock.adx,
      vwap: stock.vwap,
      first15mHigh: stock.first15mHigh
    };
  }

  // 3. Priority 3: Very Bullish Trend with positive % gain
  if (stock.trend === 'Very Bullish' && pct > 0) {
    return {
      stock,
      symbol: stock.symbol,
      companyName: stock.companyName,
      currentPrice: cmp,
      openPrice: open,
      pctChange: pct,
      rallyType: 'Very Bullish Trend',
      confidenceScore: 88,
      reason: `Gann 45° Bullish breakout confirmed with RSI ${stock.rsi ? stock.rsi.toFixed(1) : '>58'} & strong momentum.`,
      timestamp,
      buyAbove: stock.buyAbove,
      rsi: stock.rsi,
      adx: stock.adx,
      vwap: stock.vwap,
      first15mHigh: stock.first15mHigh
    };
  }

  // 4. Priority 4: Open = Low institutional buying with breakout above first 15m candle high
  if (isOpenLow && isAbove15m && pct > 0.4) {
    return {
      stock,
      symbol: stock.symbol,
      companyName: stock.companyName,
      currentPrice: cmp,
      openPrice: open,
      pctChange: pct,
      rallyType: 'Open=Low Breakout',
      confidenceScore: 85,
      reason: `Open = Low institutional buying pattern with price breaking above first 15m candle high (₹${stock.first15mHigh?.toFixed(2) || 'N/A'}).`,
      timestamp,
      buyAbove: stock.buyAbove,
      rsi: stock.rsi,
      adx: stock.adx,
      vwap: stock.vwap,
      first15mHigh: stock.first15mHigh
    };
  }

  // 5. Priority 5: Double Combo (Combo 1 + Combo 2) with positive intraday gain
  if (comboAnalysis.combo1.isMatch && comboAnalysis.combo2.isMatch && pct > 0.6) {
    return {
      stock,
      symbol: stock.symbol,
      companyName: stock.companyName,
      currentPrice: cmp,
      openPrice: open,
      pctChange: pct,
      rallyType: 'Bullish Momentum',
      confidenceScore: 80,
      reason: 'EMA alignment and RSI 55–70 bullish momentum acceleration.',
      timestamp,
      buyAbove: stock.buyAbove,
      rsi: stock.rsi,
      adx: stock.adx,
      vwap: stock.vwap,
      first15mHigh: stock.first15mHigh
    };
  }

  return null;
}

/**
 * Returns all stocks currently in a Bullish Rally, sorted by confidence score and % change.
 */
export function getAllBullishRallyStocks(stocks: StockCalculated[]): BullishRallySignal[] {
  const results: BullishRallySignal[] = [];

  stocks.forEach((s) => {
    const signal = detectBullishRally(s);
    if (signal) {
      results.push(signal);
    }
  });

  return results.sort((a, b) => {
    if (b.confidenceScore !== a.confidenceScore) {
      return b.confidenceScore - a.confidenceScore;
    }
    return b.pctChange - a.pctChange;
  });
}

/**
 * Gentle Web Audio alert sound for when a bullish rally is detected.
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
    // Ignore audio autoplay restrictions safely
    console.debug('Audio play note:', err);
  }
}
