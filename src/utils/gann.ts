import { GannCalcResult } from '../types';

/**
 * Calculates Gann 15-minute open & close modulo values
 * Formula given:
 * Open calculation = ((sqrt(matchOpenPrice) * 15) - 15) % 15
 * Close calculation = ((sqrt(matchClosePrice) * 15) - 15) % 15
 */
export function calculateGann15Min(openPrice: number, closePrice: number): GannCalcResult {
  const sqrtOpen = Math.sqrt(Math.max(0, openPrice));
  const sqrtClose = Math.sqrt(Math.max(0, closePrice));

  // User's exact Gann Square Root Modulo formula:
  const rawOpenCalc = (sqrtOpen * 15) - 15;
  const rawCloseCalc = (sqrtClose * 15) - 15;

  // Handle modulo safely
  const openCalc = ((rawOpenCalc % 15) + 15) % 15;
  const closeCalc = ((rawCloseCalc % 15) + 15) % 15;

  // Gann Square of 9 levels based on the 15-min Candle open price
  // 1 Degree in Square of 9 = 0.0027778 in sqrt domain
  // 45 Deg = 0.125 | 90 Deg = 0.25 | 135 Deg = 0.375 | 180 Deg = 0.5 | 360 Deg = 1.0
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
  let trend: 'Very Bullish' | 'Bullish' | 'Very Bearish' | 'Bearish' | 'Neutral' = 'Neutral';

  // Gann Strength classification:
  // Very Bullish: Candle Close > Open AND (Close >= Buy Above (45° level) OR gain >= 0.35%)
  // Very Bearish: Candle Close < Open AND (Close <= Sell Below (45° level) OR drop <= -0.35%)
  if (closePrice > openPrice) {
    if (closePrice >= buyAbove || pctChange >= 0.35 || (closePrice >= targetsUp[0] * 0.998)) {
      trend = 'Very Bullish';
    } else {
      trend = 'Bullish';
    }
  } else if (closePrice < openPrice) {
    if (closePrice <= sellBelow || pctChange <= -0.35 || (closePrice <= targetsDown[0] * 1.002)) {
      trend = 'Very Bearish';
    } else {
      trend = 'Bearish';
    }
  }

  // Gann score: percentage move + distance relative to buyAbove/sellBelow
  const gannScore = pctChange;

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
    gannScore
  };
}
