import { StockCalculated } from '../types';

export interface RsiPullbackAnalysis {
  rsiVal: number;
  pullbackCategory: 'BULLISH_SWEET_SPOT' | 'BULLISH_MOMENTUM' | 'OVERSOLD_BOUNCE' | 'BEARISH_RALLY' | 'OVERBOUGHT' | 'NEUTRAL';
  pullbackCategoryLabel: string;
  pullbackSignal: 'STRONG BUY' | 'BUY ON DIP' | 'OVERSOLD WATCH' | 'SHORT ON RALLY' | 'NEUTRAL';
  pullbackScore: number; // 0 to 100
  qualityStars: number; // 1 to 5
  idealEntry: number;
  stopLoss: number;
  target1: number;
  target2: number;
  riskRewardRatio: string;
  reasoning: string;
  vwapStatus: 'Above' | 'Below' | 'At';
  isVwapBullish: boolean;
  rsiDirection: 'UP' | 'DOWN' | 'FLAT';
  rsiDelta: number;
  volumeDirection: 'INCREASING' | 'DECREASING' | 'FLAT';
  volumeDeltaPct: number;
}

/**
 * Calculates comprehensive RSI Pullback strategy metrics for a stock
 */
export function analyzeRsiPullback(stock: StockCalculated): RsiPullbackAnalysis {
  const open = stock.openPrice || 100;
  const close = stock.closePrice || open;
  const high = stock.highPrice || Math.max(open, close);
  const low = stock.lowPrice || Math.min(open, close);
  const vwap = stock.vwap || (open + high + low + close) / 4;
  const currentRsi = stock.rsi !== undefined && stock.rsi !== null ? stock.rsi : (close >= open ? 54 : 44);

  // Derive RSI timeline momentum & Volume trend if available
  let rsiDirection: 'UP' | 'DOWN' | 'FLAT' = 'FLAT';
  let rsiDelta = 0;
  let volumeDirection: 'INCREASING' | 'DECREASING' | 'FLAT' = 'FLAT';
  let volumeDeltaPct = 0;

  if (stock.rsiTimeline && stock.rsiTimeline.length >= 2) {
    const last = stock.rsiTimeline[stock.rsiTimeline.length - 1];
    const prev = stock.rsiTimeline[stock.rsiTimeline.length - 2];
    rsiDelta = Math.round((last.rsi - prev.rsi) * 10) / 10;
    if (rsiDelta > 0.3) rsiDirection = 'UP';
    else if (rsiDelta < -0.3) rsiDirection = 'DOWN';

    if (last.volumeDirection) volumeDirection = last.volumeDirection;
    if (last.volumeDeltaPct) volumeDeltaPct = last.volumeDeltaPct;
  } else {
    rsiDirection = close >= open ? 'UP' : 'DOWN';
    volumeDirection = close >= open ? 'INCREASING' : 'FLAT';
  }

  const isAboveVwap = close >= vwap;
  const vwapStatus: 'Above' | 'Below' | 'At' = Math.abs(close - vwap) < 0.1 ? 'At' : isAboveVwap ? 'Above' : 'Below';

  let pullbackCategory: RsiPullbackAnalysis['pullbackCategory'] = 'NEUTRAL';
  let pullbackCategoryLabel = 'Neutral Zone';
  let pullbackSignal: RsiPullbackAnalysis['pullbackSignal'] = 'NEUTRAL';
  let pullbackScore = 50;
  let reasoning = '';

  // Bullish Sweet Spot Pullback: RSI between 42 and 55 with price above VWAP or strong Gann support
  if (currentRsi >= 40 && currentRsi <= 55 && (isAboveVwap || stock.isOpenEqualLow)) {
    pullbackCategory = 'BULLISH_SWEET_SPOT';
    pullbackCategoryLabel = 'Bullish Prime Pullback (40-55 RSI)';
    pullbackSignal = currentRsi >= 45 ? 'STRONG BUY' : 'BUY ON DIP';
    pullbackScore = 85;
    
    if (stock.isOpenEqualLow) pullbackScore += 10;
    if (rsiDirection === 'UP') pullbackScore += 5;
    reasoning = `RSI pulled back to prime support zone (${currentRsi.toFixed(1)}) while price is trading ${vwapStatus.toLowerCase()} VWAP (₹${vwap.toFixed(2)}). Ideal low-risk entry setup.`;
  } 
  // Bullish Momentum Pullback: RSI 55 - 65
  else if (currentRsi > 55 && currentRsi <= 65 && isAboveVwap) {
    pullbackCategory = 'BULLISH_MOMENTUM';
    pullbackCategoryLabel = 'Momentum Pullback (55-65 RSI)';
    pullbackSignal = 'BUY ON DIP';
    pullbackScore = 75;
    if (stock.trend === 'Very Bullish' || stock.trend === 'Bullish') pullbackScore += 10;
    reasoning = `Strong momentum stock holding above VWAP with RSI at ${currentRsi.toFixed(1)}. Minor intraday pullback offering continuation entry.`;
  }
  // Deep Oversold / Oversold Bounce: RSI < 40
  else if (currentRsi < 40) {
    pullbackCategory = 'OVERSOLD_BOUNCE';
    pullbackCategoryLabel = 'Deep Oversold Dip (<40 RSI)';
    pullbackSignal = rsiDirection === 'UP' ? 'STRONG BUY' : 'OVERSOLD WATCH';
    pullbackScore = currentRsi < 32 ? 80 : 68;
    if (rsiDirection === 'UP') pullbackScore += 12;
    reasoning = `RSI reached oversold levels (${currentRsi.toFixed(1)}). ${rsiDirection === 'UP' ? 'RSI is turning up, confirming mean-reversion bounce.' : 'Wait for RSI tick-up before buying.'}`;
  }
  // Bearish Rally Pullback: Price below VWAP and RSI rallied up to 48-60
  else if (!isAboveVwap && currentRsi >= 48 && currentRsi <= 62) {
    pullbackCategory = 'BEARISH_RALLY';
    pullbackCategoryLabel = 'Bearish Counter Rally (48-62 RSI)';
    pullbackSignal = 'SHORT ON RALLY';
    pullbackScore = 78;
    if (stock.isOpenEqualHigh) pullbackScore += 10;
    reasoning = `Price below VWAP (₹${vwap.toFixed(2)}) with RSI rallying to resistance (${currentRsi.toFixed(1)}). Favorable bearish pullback setup.`;
  }
  // Overbought Zone: RSI > 65
  else if (currentRsi > 65) {
    pullbackCategory = 'OVERBOUGHT';
    pullbackCategoryLabel = 'Overbought (>65 RSI) - Wait for Dip';
    pullbackSignal = 'NEUTRAL';
    pullbackScore = 40;
    reasoning = `RSI is overextended at ${currentRsi.toFixed(1)}. Avoid buying at peak; wait for pullback to 45-52 zone.`;
  } else {
    pullbackCategory = 'NEUTRAL';
    pullbackCategoryLabel = 'Neutral RSI Range';
    pullbackSignal = 'NEUTRAL';
    pullbackScore = 50;
    reasoning = `RSI at ${currentRsi.toFixed(1)} with neutral price action. Monitor for a dip near VWAP or Gann support.`;
  }

  // Cap score at 100
  pullbackScore = Math.min(100, Math.max(10, pullbackScore));

  // Quality Stars (1 to 5)
  const qualityStars = pullbackScore >= 88 ? 5 : pullbackScore >= 75 ? 4 : pullbackScore >= 60 ? 3 : pullbackScore >= 45 ? 2 : 1;

  // Calculate Trade Levels
  let idealEntry = close;
  let stopLoss = low;
  let target1 = high;
  let target2 = high * 1.015;

  if (pullbackCategory === 'BULLISH_SWEET_SPOT' || pullbackCategory === 'BULLISH_MOMENTUM' || pullbackCategory === 'OVERSOLD_BOUNCE') {
    idealEntry = stock.buyAbove ? Math.min(close, stock.buyAbove) : close;
    const gannStop = stock.sellBelow || low;
    stopLoss = Math.min(low, gannStop);
    if (stopLoss >= idealEntry) stopLoss = idealEntry * 0.992; // 0.8% default buffer

    target1 = stock.targetsUp && stock.targetsUp[0] ? stock.targetsUp[0] : idealEntry + (idealEntry - stopLoss) * 1.8;
    target2 = stock.targetsUp && stock.targetsUp[1] ? stock.targetsUp[1] : idealEntry + (idealEntry - stopLoss) * 3.0;
  } else if (pullbackCategory === 'BEARISH_RALLY') {
    idealEntry = stock.sellBelow ? Math.max(close, stock.sellBelow) : close;
    stopLoss = Math.max(high, stock.buyAbove || high);
    if (stopLoss <= idealEntry) stopLoss = idealEntry * 1.008;

    target1 = stock.targetsDown && stock.targetsDown[0] ? stock.targetsDown[0] : idealEntry - (stopLoss - idealEntry) * 1.8;
    target2 = stock.targetsDown && stock.targetsDown[1] ? stock.targetsDown[1] : idealEntry - (stopLoss - idealEntry) * 3.0;
  }

  const risk = Math.abs(idealEntry - stopLoss);
  const reward = Math.abs(target1 - idealEntry);
  const rrVal = risk > 0 ? (reward / risk).toFixed(1) : '2.0';
  const riskRewardRatio = `1 : ${rrVal}`;

  return {
    rsiVal: currentRsi,
    pullbackCategory,
    pullbackCategoryLabel,
    pullbackSignal,
    pullbackScore,
    qualityStars,
    idealEntry: Math.round(idealEntry * 100) / 100,
    stopLoss: Math.round(stopLoss * 100) / 100,
    target1: Math.round(target1 * 100) / 100,
    target2: Math.round(target2 * 100) / 100,
    riskRewardRatio,
    reasoning,
    vwapStatus,
    isVwapBullish: isAboveVwap,
    rsiDirection,
    rsiDelta,
    volumeDirection,
    volumeDeltaPct
  };
}
