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

  // Gann Square of 9 levels based on the 15-min Candle base price
  // 1 Degree in Square of 9 = 0.0027778 in sqrt domain
  // 45 Deg = 0.125 | 90 Deg = 0.25 | 135 Deg = 0.375 | 180 Deg = 0.5 | 360 Deg = 1.0
  const basePrice = closePrice > 0 ? closePrice : openPrice;
  const sqrtBase = Math.sqrt(basePrice);

  const factor45 = 0.125;
  const factor90 = 0.25;
  const factor135 = 0.375;
  const factor180 = 0.5;
  const factor225 = 0.625;
  const factor270 = 0.75;
  const factor360 = 1.0;

  const buyAbove = Math.pow(sqrtBase + factor45, 2);
  const sellBelow = Math.pow(sqrtBase - factor45, 2);

  const targetsUp = [
    Math.pow(sqrtBase + factor90, 2),
    Math.pow(sqrtBase + factor135, 2),
    Math.pow(sqrtBase + factor180, 2),
    Math.pow(sqrtBase + factor225, 2),
    Math.pow(sqrtBase + factor270, 2),
    Math.pow(sqrtBase + factor360, 2),
  ];

  const targetsDown = [
    Math.pow(sqrtBase - factor90, 2),
    Math.pow(sqrtBase - factor135, 2),
    Math.pow(sqrtBase - factor180, 2),
    Math.pow(sqrtBase - factor225, 2),
    Math.pow(sqrtBase - factor270, 2),
    Math.pow(sqrtBase - factor360, 2),
  ];

  const trend = closePrice > openPrice ? 'Bullish' : closePrice < openPrice ? 'Bearish' : 'Neutral';

  return {
    matchOpenPrice: openPrice,
    matchClosePrice: closePrice,
    openCalc,
    closeCalc,
    buyAbove,
    sellBelow,
    targetsUp,
    targetsDown,
    trend
  };
}
