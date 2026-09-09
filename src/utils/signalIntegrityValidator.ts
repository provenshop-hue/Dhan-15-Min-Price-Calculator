import { StockCalculated } from '../types';
import { is100PercentBullishMove, is100PercentBearishMove } from './rsiPullback';

export interface SignalValidationResult {
  isValid: boolean;
  vetoReason?: string;
  reasons: string[];
  intradayColor: 'GREEN' | 'RED' | 'DOJI';
  vwapRelation: 'ABOVE_VWAP' | 'BELOW_VWAP' | 'AT_VWAP';
  netDayReturn: number;
}

/**
 * Validates whether a stock can legitimately be published as a BULLISH signal.
 * Strictly prevents red candles, below-VWAP breakdowns, Open=High bearish patterns,
 * and negative session returns from being falsely tagged as bullish.
 */
export function validateBullishIntegrity(stock: StockCalculated): SignalValidationResult {
  const open = stock.openPrice;
  const close = stock.closePrice;
  const high = stock.highPrice ?? close ?? 0;
  const low = stock.lowPrice ?? open ?? 0;
  const prevClose = stock.previousClose ?? open;
  const vwap = stock.vwap;

  const reasons: string[] = [];

  if (open == null || close == null || open <= 0 || close <= 0) {
    return {
      isValid: false,
      vetoReason: 'Missing or non-positive price data',
      reasons: ['No valid open/close prices available'],
      intradayColor: 'DOJI',
      vwapRelation: 'AT_VWAP',
      netDayReturn: 0
    };
  }

  const netDayReturn = stock.pctChange ?? (prevClose && prevClose > 0 ? ((close - prevClose) / prevClose) * 100 : 0);
  const intradayDiff = close - open;
  const intradayColor = intradayDiff > 0.05 ? 'GREEN' : intradayDiff < -0.05 ? 'RED' : 'DOJI';

  const vwapRelation = !vwap || vwap <= 0
    ? 'AT_VWAP'
    : close >= vwap * 1.001
    ? 'ABOVE_VWAP'
    : close <= vwap * 0.999
    ? 'BELOW_VWAP'
    : 'AT_VWAP';

  // 1. HARD VETO: Red Candle (Close < Open)
  // A stock where sellers pushed the price below the open cannot be published as Bullish
  if (close < open - 0.0001) {
    const dropFromOpenPct = ((open - close) / open) * 100;
    return {
      isValid: false,
      vetoReason: `Red Candle (CMP ₹${close.toFixed(2)} is -${dropFromOpenPct.toFixed(2)}% below Open ₹${open.toFixed(2)})`,
      reasons: ['Intraday candle is RED (Sellers in control)'],
      intradayColor,
      vwapRelation,
      netDayReturn
    };
  }

  // 2. HARD VETO: Open = High Bearish Pattern
  if (stock.isOpenEqualHigh) {
    return {
      isValid: false,
      vetoReason: 'Open = High Bearish Pattern (Immediate selling pressure from the opening bell)',
      reasons: ['Open = High confirmed'],
      intradayColor,
      vwapRelation,
      netDayReturn
    };
  }

  // 3. HARD VETO: Trading below Session VWAP
  if (vwap && vwap > 0 && close < vwap * 0.996) {
    const vwapDeficitPct = ((vwap - close) / vwap) * 100;
    return {
      isValid: false,
      vetoReason: `Price is trapped below VWAP (CMP ₹${close.toFixed(2)} is -${vwapDeficitPct.toFixed(2)}% below VWAP ₹${vwap.toFixed(2)})`,
      reasons: ['Below institutional volume-weighted average price'],
      intradayColor,
      vwapRelation,
      netDayReturn
    };
  }

  // 4. HARD VETO: Negative Day Return
  if (netDayReturn < -0.15) {
    return {
      isValid: false,
      vetoReason: `Negative Day Performance (${netDayReturn.toFixed(2)}% change from previous close)`,
      reasons: ['Stock is down on the session'],
      intradayColor,
      vwapRelation,
      netDayReturn
    };
  }

  // 5. HARD VETO: Cross-Engine 100% Bearish Move
  if (is100PercentBearishMove(stock)) {
    return {
      isValid: false,
      vetoReason: 'Stock meets 100% Bearish Move criteria (Closing in bottom 20% of range)',
      reasons: ['100% Bearish Move active'],
      intradayColor,
      vwapRelation,
      netDayReturn
    };
  }

  // 6. Upper Wick Rejection Exhaustion Check
  const range = high - low;
  if (range > 0) {
    const upperWick = high - Math.max(open, close);
    const upperWickPct = (upperWick / range) * 100;
    if (upperWickPct > 70 && close < low + (range * 0.35)) {
      return {
        isValid: false,
        vetoReason: `Severe Upper Wick Rejection (${upperWickPct.toFixed(0)}% of range sold off from High ₹${high.toFixed(2)})`,
        reasons: ['Extreme profit booking / shooting star pattern'],
        intradayColor,
        vwapRelation,
        netDayReturn
      };
    }
  }

  reasons.push('Green intraday candle (Close ≥ Open)');
  if (netDayReturn >= 0) reasons.push(`Positive session change (+${netDayReturn.toFixed(2)}%)`);
  if (vwapRelation === 'ABOVE_VWAP') reasons.push('Holding above Session VWAP');
  if (stock.isOpenEqualLow) reasons.push('Open = Low institutional accumulation base');

  return {
    isValid: true,
    reasons,
    intradayColor,
    vwapRelation,
    netDayReturn
  };
}

/**
 * Validates whether a stock can legitimately be published as a BEARISH signal.
 * Strictly prevents green candles, above-VWAP rallies, Open=Low bullish patterns,
 * and positive session returns from being falsely tagged as bearish.
 */
export function validateBearishIntegrity(stock: StockCalculated): SignalValidationResult {
  const open = stock.openPrice;
  const close = stock.closePrice;
  const high = stock.highPrice ?? close ?? 0;
  const low = stock.lowPrice ?? open ?? 0;
  const prevClose = stock.previousClose ?? open;
  const vwap = stock.vwap;

  const reasons: string[] = [];

  if (open == null || close == null || open <= 0 || close <= 0) {
    return {
      isValid: false,
      vetoReason: 'Missing or non-positive price data',
      reasons: ['No valid open/close prices available'],
      intradayColor: 'DOJI',
      vwapRelation: 'AT_VWAP',
      netDayReturn: 0
    };
  }

  const netDayReturn = stock.pctChange ?? (prevClose && prevClose > 0 ? ((close - prevClose) / prevClose) * 100 : 0);
  const intradayDiff = close - open;
  const intradayColor = intradayDiff > 0.05 ? 'GREEN' : intradayDiff < -0.05 ? 'RED' : 'DOJI';

  const vwapRelation = !vwap || vwap <= 0
    ? 'AT_VWAP'
    : close >= vwap * 1.001
    ? 'ABOVE_VWAP'
    : close <= vwap * 0.999
    ? 'BELOW_VWAP'
    : 'AT_VWAP';

  // 1. HARD VETO: Green Candle (Close > Open)
  // A stock where buyers pushed the price above the open cannot be published as Bearish
  if (close > open + 0.0001) {
    const gainFromOpenPct = ((close - open) / open) * 100;
    return {
      isValid: false,
      vetoReason: `Green Candle (CMP ₹${close.toFixed(2)} is +${gainFromOpenPct.toFixed(2)}% above Open ₹${open.toFixed(2)})`,
      reasons: ['Intraday candle is GREEN (Buyers in control)'],
      intradayColor,
      vwapRelation,
      netDayReturn
    };
  }

  // 2. HARD VETO: Open = Low Bullish Pattern
  if (stock.isOpenEqualLow) {
    return {
      isValid: false,
      vetoReason: 'Open = Low Bullish Pattern (Immediate buying support from opening bell)',
      reasons: ['Open = Low confirmed'],
      intradayColor,
      vwapRelation,
      netDayReturn
    };
  }

  // 3. HARD VETO: Trading above Session VWAP
  if (vwap && vwap > 0 && close > vwap * 1.004) {
    const vwapSurplusPct = ((close - vwap) / vwap) * 100;
    return {
      isValid: false,
      vetoReason: `Price is sustained above VWAP (CMP ₹${close.toFixed(2)} is +${vwapSurplusPct.toFixed(2)}% above VWAP ₹${vwap.toFixed(2)})`,
      reasons: ['Above institutional volume-weighted average price'],
      intradayColor,
      vwapRelation,
      netDayReturn
    };
  }

  // 4. HARD VETO: Positive Day Return
  if (netDayReturn > 0.15) {
    return {
      isValid: false,
      vetoReason: `Positive Day Performance (+${netDayReturn.toFixed(2)}% change from previous close)`,
      reasons: ['Stock is up on the session'],
      intradayColor,
      vwapRelation,
      netDayReturn
    };
  }

  // 5. HARD VETO: Cross-Engine 100% Bullish Move
  if (is100PercentBullishMove(stock)) {
    return {
      isValid: false,
      vetoReason: 'Stock meets 100% Bullish Move criteria (Closing in top 20% of range with strong body)',
      reasons: ['100% Bullish Move active'],
      intradayColor,
      vwapRelation,
      netDayReturn
    };
  }

  // 6. Lower Wick Absorption Rebound Check
  const range = high - low;
  if (range > 0) {
    const lowerWick = Math.min(open, close) - low;
    const lowerWickPct = (lowerWick / range) * 100;
    if (lowerWickPct > 70 && close > low + (range * 0.65)) {
      return {
        isValid: false,
        vetoReason: `Severe Lower Wick Absorption (${lowerWickPct.toFixed(0)}% of range rebounded from Low ₹${low.toFixed(2)})`,
        reasons: ['Strong bottom fishing / hammer reversal'],
        intradayColor,
        vwapRelation,
        netDayReturn
      };
    }
  }

  reasons.push('Red intraday candle (Close ≤ Open)');
  if (netDayReturn <= 0) reasons.push(`Negative session change (${netDayReturn.toFixed(2)}%)`);
  if (vwapRelation === 'BELOW_VWAP') reasons.push('Trapped below Session VWAP');
  if (stock.isOpenEqualHigh) reasons.push('Open = High institutional selling resistance');

  return {
    isValid: true,
    reasons,
    intradayColor,
    vwapRelation,
    netDayReturn
  };
}

/**
 * Resolves the dominant side for EMA Confluence with strict directional verification.
 * Guarantees that no stock is ever tagged Bullish if it is a red candle / below VWAP / Open=High,
 * and no stock is ever tagged Bearish if it is a green candle / above VWAP / Open=Low.
 * Ties or mixed/consolidating stocks are strictly returned as 'NEUTRAL'.
 */
export function resolveStrictEmaConfluenceDirection(
  stock: StockCalculated,
  bullishScore: number,
  bearishScore: number
): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
  const bullVal = validateBullishIntegrity(stock);
  const bearVal = validateBearishIntegrity(stock);

  // If both are valid (e.g. exact doji at VWAP), or both are invalid (conflicting data), return NEUTRAL
  if (bullVal.isValid && bearVal.isValid) {
    return 'NEUTRAL';
  }

  if (bullVal.isValid && !bearVal.isValid) {
    // Bullish integrity is intact
    // Check score threshold
    if (bullishScore >= 4 && bullishScore > bearishScore) {
      return 'BULLISH';
    }
    if (bullishScore >= 5) {
      return 'BULLISH';
    }
    return 'NEUTRAL';
  }

  if (bearVal.isValid && !bullVal.isValid) {
    // Bearish integrity is intact
    // Check score threshold
    if (bearishScore >= 4 && bearishScore > bullishScore) {
      return 'BEARISH';
    }
    if (bearishScore >= 5) {
      return 'BEARISH';
    }
    return 'NEUTRAL';
  }

  // If neither side passed integrity verification, it is strictly NEUTRAL
  return 'NEUTRAL';
}
