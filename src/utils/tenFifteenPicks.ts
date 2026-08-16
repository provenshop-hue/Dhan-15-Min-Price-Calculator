import { StockCalculated } from '../types';
import { is100PercentBullishMove, is100PercentBearishMove } from './rsiPullback';
import { isOpenLowPattern, isOpenHighPattern, isAboveFirst15mCandle, isBelowFirst15mCandle } from './gann';
import { analyzeBullishCombinations } from './bullishCombinations';
import { getNseStrikeLadder, formatStrikePrice } from './nseStrikeMaster';

export interface TenFifteenTradePick {
  rank: 1 | 2 | 3;
  stockId: string;
  symbol: string;
  companyName: string;
  direction: 'BULLISH' | 'BEARISH';
  cmp: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  previousClose: number | null;
  pctChange: number;
  openCalc: number | null;
  closeCalc: number | null;
  totalCalc: number | null;
  rsi: number | null;
  vwap: number | null;
  vwapStatus: 'Above' | 'Below' | 'At' | null;
  adx: number | null;
  volume: number | null;
  candleTimestamp: string | null;
  convictionScore: number; // 0 to 100
  is100PercentFormulaMet: boolean;
  isOpenPatternMet: boolean; // Open=Low for Bullish, Open=High for Bearish
  is15mBreakoutOrBreakdown: boolean;
  catalysts: string[];
  tradeSetup: {
    entryZone: { min: number; max: number; label: string };
    stopLoss: number;
    target1: number;
    target2: number;
    target3: number;
    riskRewardRatio: string;
    riskPerShare: number;
    rewardPerShare: number;
    recommendedStrike: string; // e.g. "2960 CE" or "1420 PE"
    strikeType: 'CE' | 'PE';
    strikePrice: number;
    lotSize: number;
    estProfitPerLot: number;
    executionTiming: string; // e.g. "10:15 – 10:30 AM Entry"
  };
}

export interface TenFifteenAnalysisResult {
  bullishPicks: TenFifteenTradePick[];
  bearishPicks: TenFifteenTradePick[];
  marketBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  bullishCountTotal: number;
  bearishCountTotal: number;
  scannedCount: number;
  timestamp: string;
  is1015PrimeWindow: boolean;
}

/**
 * Computes a multi-factor 10:15 AM Bullish Conviction Score (0 - 100)
 */
export function calculate1015BullishScore(stock: StockCalculated): { score: number; catalysts: string[] } {
  const cmp = stock.closePrice || stock.openPrice || 0;
  if (cmp <= 0) return { score: 0, catalysts: [] };

  let score = 25; // Base score for participating
  const catalysts: string[] = [];

  // 1. 100% Bullish Move Formula Met (+30 pts)
  if (is100PercentBullishMove(stock)) {
    score += 30;
    catalysts.push('💯 100% Bullish Move Formula Confirmed');
  } else if (stock.closePrice && stock.openPrice && stock.closePrice > stock.openPrice) {
    score += 10;
  }

  // 2. Open = Low Pattern (+15 pts)
  if (stock.openPrice && stock.openPrice > 0 && isOpenLowPattern(stock.openPrice, stock.lowPrice, stock.first15mLow)) {
    score += 15;
    catalysts.push('🛡️ Strict Open = Low (No Downside Wick)');
  }

  // 3. Breakout Above 15-Minute Candle High (+15 pts)
  if (isAboveFirst15mCandle(stock)) {
    score += 15;
    catalysts.push('🚀 15-Min Opening High Breakout');
  }

  // 4. Confluence: Intraday VWAP (+10 pts)
  if (stock.vwapStatus === 'Above' || (stock.vwap && cmp > stock.vwap)) {
    score += 10;
    catalysts.push(`📈 Above Intraday VWAP (₹${stock.vwap?.toFixed(2) || ''})`);
  }

  // 5. Confluence: RSI 14 in Momentum Sweet Spot 55 - 75 (+10 pts)
  if (stock.rsi !== undefined && stock.rsi !== null) {
    if (stock.rsi >= 55 && stock.rsi <= 75) {
      score += 10;
      catalysts.push(`⚡ RSI Momentum (RSI ${stock.rsi.toFixed(1)})`);
    } else if (stock.rsi > 50) {
      score += 5;
    }
  }

  // 6. Bullish Multi-Combo or Triple Power (+10 pts)
  const combos = analyzeBullishCombinations(stock);
  if (combos.isAllCombosMet) {
    score += 10;
    catalysts.push('🔥 Triple Power Confluence Combo Met');
  } else if (combos.isAnyComboMet) {
    score += 5;
    catalysts.push('🎯 Bullish Pattern Combo Active');
  }

  // 7. Gann Modulo Calculation Bonus
  if (stock.openCalc !== undefined && stock.openCalc !== null && stock.openCalc < 3) {
    score += 5;
    catalysts.push('📐 Gann Open Calc < 3 Harmonic Alignment');
  }

  // Cap score at 99
  const finalScore = Math.min(99, Math.max(10, Math.round(score)));
  return { score: finalScore, catalysts };
}

/**
 * Computes a multi-factor 10:15 AM Bearish Conviction Score (0 - 100)
 */
export function calculate1015BearishScore(stock: StockCalculated): { score: number; catalysts: string[] } {
  const cmp = stock.closePrice || stock.openPrice || 0;
  if (cmp <= 0) return { score: 0, catalysts: [] };

  let score = 25; // Base score
  const catalysts: string[] = [];

  // 1. 100% Bearish Move Formula Met (+30 pts)
  if (is100PercentBearishMove(stock)) {
    score += 30;
    catalysts.push('💥 100% Bearish Move Formula Confirmed');
  } else if (stock.closePrice && stock.openPrice && stock.closePrice < stock.openPrice) {
    score += 10;
  }

  // 2. Open = High Pattern (+15 pts)
  if (stock.openPrice && stock.openPrice > 0 && isOpenHighPattern(stock.openPrice, stock.highPrice, stock.first15mHigh)) {
    score += 15;
    catalysts.push('🎯 Strict Open = High (Zero Upside Wick)');
  }

  // 3. Breakdown Below 15-Minute Candle Low (+15 pts)
  if (isBelowFirst15mCandle(stock)) {
    score += 15;
    catalysts.push('🔻 15-Min Opening Low Breakdown');
  }

  // 4. Confluence: Below Intraday VWAP (+10 pts)
  if (stock.vwapStatus === 'Below' || (stock.vwap && cmp < stock.vwap)) {
    score += 10;
    catalysts.push(`📉 Below Intraday VWAP (₹${stock.vwap?.toFixed(2) || ''})`);
  }

  // 5. Confluence: RSI 14 Weakness (< 45) (+10 pts)
  if (stock.rsi !== undefined && stock.rsi !== null) {
    if (stock.rsi <= 45 && stock.rsi >= 20) {
      score += 10;
      catalysts.push(`⚡ RSI Bearish Pressure (RSI ${stock.rsi.toFixed(1)})`);
    } else if (stock.rsi < 50) {
      score += 5;
    }
  }

  // 6. Gann Close Calc < 3 or Breakdown Align
  if (stock.closeCalc !== undefined && stock.closeCalc !== null && stock.closeCalc < 3) {
    score += 5;
    catalysts.push('📐 Gann Close Calc < 3 Harmonic Alignment');
  }

  // 7. Negative Intraday Loss (% change <= -1.0%)
  if ((stock.pctChange || 0) <= -1.0) {
    score += 5;
    catalysts.push(`🔻 Strong Selling Flow (${(stock.pctChange || 0).toFixed(2)}%)`);
  }

  const finalScore = Math.min(99, Math.max(10, Math.round(score)));
  return { score: finalScore, catalysts };
}

/**
 * Builds the exact trade targets, stop loss, and recommended ATM option contract
 */
function buildTradeSetup(
  stock: StockCalculated,
  direction: 'BULLISH' | 'BEARISH'
): TenFifteenTradePick['tradeSetup'] {
  const cmp = stock.closePrice || stock.openPrice || 1000;
  const high = stock.highPrice || cmp;
  const low = stock.lowPrice || cmp;
  const range = Math.max(cmp * 0.012, high - low);
  const ladder = getNseStrikeLadder(cmp, stock.symbol);
  const lotSize = stock.lotSizeJun2026 || stock.lotSizeJul2026 || 500;

  if (direction === 'BULLISH') {
    const entryMin = Math.round(cmp * 0.998 * 100) / 100;
    const entryMax = Math.round(Math.max(cmp, high) * 1.002 * 100) / 100;
    // Stop loss placed just below low or 0.8% below cmp
    const sl = Math.round(Math.min(cmp * 0.991, low * 0.998) * 100) / 100;
    const riskPerShare = Math.max(cmp * 0.007, cmp - sl);
    
    // Target 1 = +1.2R, Target 2 = +2.2R, Target 3 = +3.5R
    const t1 = Math.round((cmp + riskPerShare * 1.25) * 100) / 100;
    const t2 = Math.round((cmp + riskPerShare * 2.25) * 100) / 100;
    const t3 = Math.round((cmp + riskPerShare * 3.5) * 100) / 100;
    
    const rewardPerShare = t2 - cmp;
    const rrRatio = `1:${(rewardPerShare / riskPerShare).toFixed(1)}`;
    const strikePrice = ladder.atm;
    const recommendedStrike = `${formatStrikePrice(strikePrice)} CE`;
    const estProfitPerLot = Math.round(rewardPerShare * 0.65 * lotSize);

    return {
      entryZone: { min: entryMin, max: entryMax, label: `₹${entryMin.toFixed(2)} – ₹${entryMax.toFixed(2)}` },
      stopLoss: sl,
      target1: t1,
      target2: t2,
      target3: t3,
      riskRewardRatio: rrRatio,
      riskPerShare,
      rewardPerShare,
      recommendedStrike,
      strikeType: 'CE',
      strikePrice,
      lotSize,
      estProfitPerLot,
      executionTiming: '10:15 – 10:30 AM Entry'
    };
  } else {
    const entryMin = Math.round(Math.min(cmp, low) * 0.998 * 100) / 100;
    const entryMax = Math.round(cmp * 1.002 * 100) / 100;
    // Stop loss placed above high or 0.8% above cmp
    const sl = Math.round(Math.max(cmp * 1.009, high * 1.002) * 100) / 100;
    const riskPerShare = Math.max(cmp * 0.007, sl - cmp);
    
    const t1 = Math.round((cmp - riskPerShare * 1.25) * 100) / 100;
    const t2 = Math.round((cmp - riskPerShare * 2.25) * 100) / 100;
    const t3 = Math.round((cmp - riskPerShare * 3.5) * 100) / 100;
    
    const rewardPerShare = cmp - t2;
    const rrRatio = `1:${(rewardPerShare / riskPerShare).toFixed(1)}`;
    const strikePrice = ladder.atm;
    const recommendedStrike = `${formatStrikePrice(strikePrice)} PE`;
    const estProfitPerLot = Math.round(rewardPerShare * 0.65 * lotSize);

    return {
      entryZone: { min: entryMin, max: entryMax, label: `₹${entryMin.toFixed(2)} – ₹${entryMax.toFixed(2)}` },
      stopLoss: sl,
      target1: t1,
      target2: t2,
      target3: t3,
      riskRewardRatio: rrRatio,
      riskPerShare,
      rewardPerShare,
      recommendedStrike,
      strikeType: 'PE',
      strikePrice,
      lotSize,
      estProfitPerLot,
      executionTiming: '10:15 – 10:30 AM Entry'
    };
  }
}

/**
 * Main Engine: Analyzes all stocks and extracts the Top 3 Bullish and Top 3 Bearish stocks for the day @ 10:15 AM
 */
export function analyzeTenFifteenPicks(stocks: StockCalculated[]): TenFifteenAnalysisResult {
  // Only consider stocks with loaded price data
  const validStocks = stocks.filter(
    (s) => s.openPrice !== undefined && s.openPrice !== null && s.openPrice > 0 &&
           s.closePrice !== undefined && s.closePrice !== null && s.closePrice > 0
  );

  // If no data is fetched yet, use initial stocks as placeholders with simulated base pricing
  const candidatePool = validStocks.length > 0 ? validStocks : stocks.slice(0, 30);

  // 1. Evaluate Bullish candidates
  const scoredBullish = candidatePool
    .map((s) => {
      const { score, catalysts } = calculate1015BullishScore(s);
      return { stock: s, score, catalysts };
    })
    .sort((a, b) => {
      // Prioritize 100% Bullish move first
      const a100 = is100PercentBullishMove(a.stock);
      const b100 = is100PercentBullishMove(b.stock);
      if (a100 && !b100) return -1;
      if (!a100 && b100) return 1;
      
      // Then score
      if (b.score !== a.score) return b.score - a.score;
      
      // Then % change
      return (b.stock.pctChange || 0) - (a.stock.pctChange || 0);
    });

  // Pick Top 3 Bullish
  const top3Bullish: TenFifteenTradePick[] = scoredBullish.slice(0, 3).map((item, idx) => {
    const s = item.stock;
    const cmp = s.closePrice || s.openPrice || 1000;
    const rank = (idx + 1) as 1 | 2 | 3;
    const is100 = is100PercentBullishMove(s);
    const isOpenLow = s.openPrice ? isOpenLowPattern(s.openPrice, s.lowPrice, s.first15mLow) : false;
    const is15mBreak = isAboveFirst15mCandle(s);

    return {
      rank,
      stockId: s.id,
      symbol: s.symbol,
      companyName: s.companyName,
      direction: 'BULLISH',
      cmp,
      openPrice: s.openPrice || cmp,
      highPrice: s.highPrice || cmp,
      lowPrice: s.lowPrice || cmp,
      previousClose: s.previousClose ?? null,
      pctChange: s.pctChange || 0,
      openCalc: s.openCalc ?? null,
      closeCalc: s.closeCalc ?? null,
      totalCalc: s.totalCalc ?? ((s.openCalc ?? 0) + (s.closeCalc ?? 0)),
      rsi: s.rsi ?? null,
      vwap: s.vwap ?? null,
      vwapStatus: s.vwapStatus ?? (s.vwap ? (cmp >= s.vwap ? 'Above' : 'Below') : null),
      adx: s.adx ?? null,
      volume: s.volume ?? null,
      candleTimestamp: s.candleTimestamp || '10:15 AM IST',
      convictionScore: item.score,
      is100PercentFormulaMet: is100,
      isOpenPatternMet: isOpenLow,
      is15mBreakoutOrBreakdown: is15mBreak,
      catalysts: item.catalysts,
      tradeSetup: buildTradeSetup(s, 'BULLISH')
    };
  });

  // 2. Evaluate Bearish candidates
  const scoredBearish = candidatePool
    .map((s) => {
      const { score, catalysts } = calculate1015BearishScore(s);
      return { stock: s, score, catalysts };
    })
    .sort((a, b) => {
      // Prioritize 100% Bearish move first
      const a100 = is100PercentBearishMove(a.stock);
      const b100 = is100PercentBearishMove(b.stock);
      if (a100 && !b100) return -1;
      if (!a100 && b100) return 1;

      // Then score
      if (b.score !== a.score) return b.score - a.score;

      // Then largest negative % drop
      return (a.stock.pctChange || 0) - (b.stock.pctChange || 0);
    });

  // Pick Top 3 Bearish
  const top3Bearish: TenFifteenTradePick[] = scoredBearish.slice(0, 3).map((item, idx) => {
    const s = item.stock;
    const cmp = s.closePrice || s.openPrice || 1000;
    const rank = (idx + 1) as 1 | 2 | 3;
    const is100 = is100PercentBearishMove(s);
    const isOpenHigh = s.openPrice ? isOpenHighPattern(s.openPrice, s.highPrice, s.first15mHigh) : false;
    const is15mBreak = isBelowFirst15mCandle(s);

    return {
      rank,
      stockId: s.id,
      symbol: s.symbol,
      companyName: s.companyName,
      direction: 'BEARISH',
      cmp,
      openPrice: s.openPrice || cmp,
      highPrice: s.highPrice || cmp,
      lowPrice: s.lowPrice || cmp,
      previousClose: s.previousClose ?? null,
      pctChange: s.pctChange || 0,
      openCalc: s.openCalc ?? null,
      closeCalc: s.closeCalc ?? null,
      totalCalc: s.totalCalc ?? ((s.openCalc ?? 0) + (s.closeCalc ?? 0)),
      rsi: s.rsi ?? null,
      vwap: s.vwap ?? null,
      vwapStatus: s.vwapStatus ?? (s.vwap ? (cmp >= s.vwap ? 'Above' : 'Below') : null),
      adx: s.adx ?? null,
      volume: s.volume ?? null,
      candleTimestamp: s.candleTimestamp || '10:15 AM IST',
      convictionScore: item.score,
      is100PercentFormulaMet: is100,
      isOpenPatternMet: isOpenHigh,
      is15mBreakoutOrBreakdown: is15mBreak,
      catalysts: item.catalysts,
      tradeSetup: buildTradeSetup(s, 'BEARISH')
    };
  });

  // Market Bias calculation
  const bullishCountTotal = candidatePool.filter((s) => (s.pctChange || 0) > 0).length;
  const bearishCountTotal = candidatePool.filter((s) => (s.pctChange || 0) < 0).length;
  let marketBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  if (bullishCountTotal > bearishCountTotal * 1.3) marketBias = 'BULLISH';
  else if (bearishCountTotal > bullishCountTotal * 1.3) marketBias = 'BEARISH';

  return {
    bullishPicks: top3Bullish,
    bearishPicks: top3Bearish,
    marketBias,
    bullishCountTotal,
    bearishCountTotal,
    scannedCount: candidatePool.length,
    timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    is1015PrimeWindow: true
  };
}
