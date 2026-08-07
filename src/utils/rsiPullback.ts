import { StockCalculated } from '../types';

export interface RallyConfluenceFactor {
  id: string;
  label: string;
  points: number;
  passed: boolean;
}

export interface RallyScoreResult {
  score: number;
  interpretation: 'Strong Bullish Rally' | 'Bullish Rally' | 'Moderate / Wait' | 'Weak' | 'Bearish' | 'Strong Bearish Rally' | 'Bearish Rally' | 'Bullish';
  interpretationCode: 'STRONG_BULL' | 'BULL' | 'MODERATE' | 'WEAK' | 'BEAR' | 'STRONG_BEAR';
  badgeColor: string;
  factors: RallyConfluenceFactor[];
}

export interface RsiPullbackAnalysis {
  rsiVal: number;
  pullbackCategory: 'BULLISH_RALLY' | 'BEARISH_RALLY' | 'BULLISH_SWEET_SPOT' | 'BULLISH_MOMENTUM' | 'OVERSOLD_BOUNCE' | 'OVERBOUGHT' | 'NEUTRAL';
  pullbackCategoryLabel: string;
  pullbackSignal: 'STRONG BUY' | 'BUY ON DIP' | 'OVERSOLD WATCH' | 'SHORT ON RALLY' | 'NEUTRAL' | 'STRONG SHORT';
  pullbackScore: number; // 0 to 100
  qualityStars: number; // 1 to 5
  bullishRally: RallyScoreResult;
  bearishRally: RallyScoreResult;
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
  * Calculates 10-Factor Bullish Rally Confluence Score (0 - 100)
  */
export function calculateBullishRallyScore(
  stock: StockCalculated,
  rsiVal: number,
  rsiDirection: 'UP' | 'DOWN' | 'FLAT',
  rsiDelta: number,
  volumeDirection: 'INCREASING' | 'DECREASING' | 'FLAT',
  volumeDeltaPct: number
): RallyScoreResult {
  const open = stock.openPrice || 100;
  const close = stock.closePrice || open;
  const high = stock.highPrice || Math.max(open, close);
  const low = stock.lowPrice || Math.min(open, close);
  const vwap = stock.vwap || (open + high + low + close) / 4;
  const range = high - low;
  const body = Math.abs(close - open);

  // 1. Candle Strength (Large green body)
  const isGreen = close > open || stock.pctChange >= 0;
  const bodyRatio = range > 0 ? body / range : 0.5;
  const candleStrengthPass = isGreen && bodyRatio >= 0.4;

  // 2. Close Near High (Small upper wick)
  const upperWick = high - Math.max(open, close);
  const closeNearHighPass = isGreen && (range > 0 ? (upperWick / range) <= 0.25 || (close - low) / range >= 0.75 : true);

  // 3. Relative Volume (RVOL > 1.3 - 1.5)
  const rvolPass = volumeDeltaPct >= 20 || volumeDirection === 'INCREASING' || (stock.volume ? stock.volume > 100000 : false) || stock.isOpenEqualLow;

  // 4. Buy Volume Dominates
  const buyVolumePass = isGreen && (close >= vwap || stock.isOpenEqualLow || volumeDirection === 'INCREASING');

  // 5. RSI > 55
  const rsiAbove55Pass = rsiVal > 55;

  // 6. RSI Rising
  const rsiRisingPass = rsiDirection === 'UP' || rsiDelta > 0;

  // 7. Price Above VWAP
  const aboveVwapPass = close >= vwap;

  // 8. Break/Hold Above Previous High / PDC
  const pdhPass = (stock.buyAbove ? close >= stock.buyAbove * 0.998 : close >= high * 0.998) || (stock.pctChange || 0) >= 0.3 || stock.isOpenEqualLow;

  // 9. Sector / Trend Bullish
  const sectorBullishPass = stock.trend === 'Bullish' || stock.trend === 'Very Bullish' || (stock.pctChange || 0) > 0;

  // 10. Resistance Breakout / Gann Score
  const breakoutPass = (stock.gannScore || 0) >= 50 || (stock.pctChange || 0) >= 0.5 || stock.isOpenEqualLow;

  const factors: RallyConfluenceFactor[] = [
    { id: 'candle_strength', label: '1. First Candle Body Strength (Large Green)', points: 10, passed: candleStrengthPass },
    { id: 'close_near_high', label: '2. Close Near Candle High (Small Upper Wick)', points: 10, passed: closeNearHighPass },
    { id: 'rvol', label: '3. Relative Volume (RVOL > 1.3–1.5)', points: 15, passed: rvolPass },
    { id: 'buy_volume', label: '4. Buy Volume Imbalance Dominance', points: 15, passed: buyVolumePass },
    { id: 'rsi_55', label: '5. RSI > 55 Strength Zone', points: 10, passed: rsiAbove55Pass },
    { id: 'rsi_rising', label: '6. RSI Momentum Rising Tick', points: 5, passed: rsiRisingPass },
    { id: 'above_vwap', label: '7. Price Above VWAP Support', points: 10, passed: aboveVwapPass },
    { id: 'above_pdh', label: '8. Holds Above PDH / PDC Level', points: 10, passed: pdhPass },
    { id: 'sector_bullish', label: '9. Sector / Market Trend Bullish', points: 5, passed: sectorBullishPass },
    { id: 'resistance_breakout', label: '10. Resistance Breakout Confirmation', points: 5, passed: breakoutPass },
  ];

  const score = factors.reduce((acc, f) => acc + (f.passed ? f.points : 0), 0);

  let interpretation: RallyScoreResult['interpretation'] = 'Moderate / Wait';
  let interpretationCode: RallyScoreResult['interpretationCode'] = 'MODERATE';
  let badgeColor = 'bg-amber-100 text-amber-800 border-amber-300';

  if (score >= 80) {
    interpretation = 'Strong Bullish Rally';
    interpretationCode = 'STRONG_BULL';
    badgeColor = 'bg-emerald-600 text-white border-emerald-700 shadow-xs';
  } else if (score >= 65) {
    interpretation = 'Bullish Rally';
    interpretationCode = 'BULL';
    badgeColor = 'bg-emerald-100 text-emerald-900 border-emerald-400';
  } else if (score >= 50) {
    interpretation = 'Moderate / Wait';
    interpretationCode = 'MODERATE';
    badgeColor = 'bg-yellow-100 text-yellow-900 border-yellow-300';
  } else if (score >= 35) {
    interpretation = 'Weak';
    interpretationCode = 'WEAK';
    badgeColor = 'bg-orange-100 text-orange-900 border-orange-300';
  } else {
    interpretation = 'Bearish';
    interpretationCode = 'BEAR';
    badgeColor = 'bg-rose-100 text-rose-900 border-rose-300';
  }

  return {
    score,
    interpretation,
    interpretationCode,
    badgeColor,
    factors
  };
}

/**
  * Calculates 10-Factor Bearish Rally Confluence Score (0 - 100)
  */
export function calculateBearishRallyScore(
  stock: StockCalculated,
  rsiVal: number,
  rsiDirection: 'UP' | 'DOWN' | 'FLAT',
  rsiDelta: number,
  volumeDirection: 'INCREASING' | 'DECREASING' | 'FLAT',
  volumeDeltaPct: number
): RallyScoreResult {
  const open = stock.openPrice || 100;
  const close = stock.closePrice || open;
  const high = stock.highPrice || Math.max(open, close);
  const low = stock.lowPrice || Math.min(open, close);
  const vwap = stock.vwap || (open + high + low + close) / 4;
  const range = high - low;
  const body = Math.abs(close - open);

  // 1. Candle Strength (Large red body)
  const isRed = close < open || (stock.pctChange || 0) < 0;
  const bodyRatio = range > 0 ? body / range : 0.5;
  const candleStrengthPass = isRed && bodyRatio >= 0.4;

  // 2. Close Near Low (Small lower wick)
  const lowerWick = Math.min(open, close) - low;
  const closeNearLowPass = isRed && (range > 0 ? (lowerWick / range) <= 0.25 || (high - close) / range >= 0.75 : true);

  // 3. Relative Volume (RVOL > 1.3 - 1.5)
  const rvolPass = volumeDeltaPct >= 20 || volumeDirection === 'INCREASING' || (stock.volume ? stock.volume > 100000 : false) || stock.isOpenEqualHigh;

  // 4. Sell Volume Dominates
  const sellVolumePass = isRed && (close <= vwap || stock.isOpenEqualHigh || volumeDirection === 'INCREASING');

  // 5. RSI < 45
  const rsiBelow45Pass = rsiVal < 45;

  // 6. RSI Falling
  const rsiFallingPass = rsiDirection === 'DOWN' || rsiDelta < 0;

  // 7. Price Below VWAP
  const belowVwapPass = close <= vwap;

  // 8. Break Below Previous Low / PDC
  const pdlPass = (stock.sellBelow ? close <= stock.sellBelow * 1.002 : close <= low * 1.002) || (stock.pctChange || 0) <= -0.3 || stock.isOpenEqualHigh;

  // 9. Sector / Trend Bearish
  const sectorBearishPass = stock.trend === 'Bearish' || stock.trend === 'Very Bearish' || (stock.pctChange || 0) < 0;

  // 10. Support Breakdown
  const breakdownPass = (stock.pctChange || 0) <= -0.5 || stock.isOpenEqualHigh;

  const factors: RallyConfluenceFactor[] = [
    { id: 'candle_strength', label: '1. First Candle Body Strength (Large Red)', points: 10, passed: candleStrengthPass },
    { id: 'close_near_low', label: '2. Close Near Candle Low (Small Lower Wick)', points: 10, passed: closeNearLowPass },
    { id: 'rvol', label: '3. Relative Volume (RVOL > 1.3–1.5)', points: 15, passed: rvolPass },
    { id: 'sell_volume', label: '4. Selling Volume Dominance', points: 15, passed: sellVolumePass },
    { id: 'rsi_45', label: '5. RSI < 45 Bearish Zone', points: 10, passed: rsiBelow45Pass },
    { id: 'rsi_falling', label: '6. RSI Momentum Falling Tick', points: 5, passed: rsiFallingPass },
    { id: 'below_vwap', label: '7. Price Below VWAP Resistance', points: 10, passed: belowVwapPass },
    { id: 'below_pdl', label: '8. Breaks Below PDL / PDC Level', points: 10, passed: pdlPass },
    { id: 'sector_bearish', label: '9. Sector / Market Trend Bearish', points: 5, passed: sectorBearishPass },
    { id: 'support_breakdown', label: '10. Support Breakdown Confirmation', points: 5, passed: breakdownPass },
  ];

  const score = factors.reduce((acc, f) => acc + (f.passed ? f.points : 0), 0);

  let interpretation: RallyScoreResult['interpretation'] = 'Moderate / Wait';
  let interpretationCode: RallyScoreResult['interpretationCode'] = 'MODERATE';
  let badgeColor = 'bg-amber-100 text-amber-800 border-amber-300';

  if (score >= 80) {
    interpretation = 'Strong Bearish Rally';
    interpretationCode = 'STRONG_BEAR';
    badgeColor = 'bg-rose-600 text-white border-rose-700 shadow-xs';
  } else if (score >= 65) {
    interpretation = 'Bearish Rally';
    interpretationCode = 'BEAR';
    badgeColor = 'bg-rose-100 text-rose-900 border-rose-400';
  } else if (score >= 50) {
    interpretation = 'Moderate / Wait';
    interpretationCode = 'MODERATE';
    badgeColor = 'bg-yellow-100 text-yellow-900 border-yellow-300';
  } else if (score >= 35) {
    interpretation = 'Weak';
    interpretationCode = 'WEAK';
    badgeColor = 'bg-orange-100 text-orange-900 border-orange-300';
  } else {
    interpretation = 'Bullish';
    interpretationCode = 'BULL';
    badgeColor = 'bg-emerald-100 text-emerald-900 border-emerald-300';
  }

  return {
    score,
    interpretation,
    interpretationCode,
    badgeColor,
    factors
  };
}

/**
 * Calculates comprehensive RSI Pullback & First-Candle Rally strategy metrics for a stock
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

  // Calculate 10-Factor Bullish & Bearish Rally Scores
  const bullishRally = calculateBullishRallyScore(stock, currentRsi, rsiDirection, rsiDelta, volumeDirection, volumeDeltaPct);
  const bearishRally = calculateBearishRallyScore(stock, currentRsi, rsiDirection, rsiDelta, volumeDirection, volumeDeltaPct);

  let pullbackCategory: RsiPullbackAnalysis['pullbackCategory'] = 'NEUTRAL';
  let pullbackCategoryLabel = 'Neutral Zone';
  let pullbackSignal: RsiPullbackAnalysis['pullbackSignal'] = 'NEUTRAL';
  let pullbackScore = 50;
  let reasoning = '';

  // Priority 1: High Conviction Bullish Rally (Score >= 65)
  if (bullishRally.score >= 65 && close >= open) {
    pullbackCategory = 'BULLISH_RALLY';
    pullbackCategoryLabel = `🔥 Bullish Rally (${bullishRally.score}/100)`;
    pullbackSignal = bullishRally.score >= 80 ? 'STRONG BUY' : 'BUY ON DIP';
    pullbackScore = Math.max(88, bullishRally.score);
    reasoning = `First-candle Bullish Rally setup with ${bullishRally.score}/100 score. ${bullishRally.interpretation} confirmed with RSI at ${currentRsi.toFixed(1)} and price ${vwapStatus.toLowerCase()} VWAP.`;
  }
  // Priority 2: High Conviction Bearish Rally (Score >= 65)
  else if (bearishRally.score >= 65 && close <= open) {
    pullbackCategory = 'BEARISH_RALLY';
    pullbackCategoryLabel = `🔻 Bearish Rally (${bearishRally.score}/100)`;
    pullbackSignal = bearishRally.score >= 80 ? 'STRONG SHORT' : 'SHORT ON RALLY';
    pullbackScore = Math.max(85, bearishRally.score);
    reasoning = `First-candle Bearish Rally breakdown with ${bearishRally.score}/100 score. ${bearishRally.interpretation} confirmed with RSI at ${currentRsi.toFixed(1)} and price ${vwapStatus.toLowerCase()} VWAP.`;
  }
  // Bullish Sweet Spot Pullback: RSI between 40 and 55 with price above VWAP or strong Gann support
  else if (currentRsi >= 40 && currentRsi <= 55 && (isAboveVwap || stock.isOpenEqualLow)) {
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
  // Bearish Counter Rally: Price below VWAP and RSI rallied up to 48-62
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

  if (pullbackCategory === 'BULLISH_RALLY' || pullbackCategory === 'BULLISH_SWEET_SPOT' || pullbackCategory === 'BULLISH_MOMENTUM' || pullbackCategory === 'OVERSOLD_BOUNCE') {
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
    bullishRally,
    bearishRally,
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

