export interface CandleInput {
  high: number;
  low: number;
  close: number;
}

export interface SupertrendResult {
  trend: 'BULLISH' | 'BEARISH';
  supertrendLine: number;
  isBullish: boolean;
  isBearish: boolean;
}

export function calculateSupertrend(candles: CandleInput[], period = 10, multiplier = 3): SupertrendResult {
  if (!candles || candles.length === 0) {
    return { trend: 'BULLISH', supertrendLine: 0, isBullish: true, isBearish: false };
  }

  // Calculate True Range (TR) and ATR
  const trs: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    if (i === 0) {
      trs.push(c.high - c.low);
    } else {
      const prevClose = candles[i - 1].close;
      const tr = Math.max(c.high - c.low, Math.abs(c.high - prevClose), Math.abs(c.low - prevClose));
      trs.push(tr);
    }
  }

  // Compute ATR over period
  const atrs: number[] = [];
  let currentAtr = 0;
  for (let i = 0; i < trs.length; i++) {
    if (i < period) {
      currentAtr += trs[i];
      if (i === period - 1) currentAtr /= period;
    } else {
      currentAtr = (currentAtr * (period - 1) + trs[i]) / period;
    }
    atrs.push(currentAtr || (candles[i].high - candles[i].low));
  }

  let finalUpperBand = 0;
  let finalLowerBand = 0;
  let supertrendVal = 0;
  let isUptrend = true;

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const atr = atrs[i];
    const hl2 = (c.high + c.low) / 2;

    const basicUpperBand = hl2 + multiplier * atr;
    const basicLowerBand = hl2 - multiplier * atr;

    if (i === 0) {
      finalUpperBand = basicUpperBand;
      finalLowerBand = basicLowerBand;
      supertrendVal = finalLowerBand;
      isUptrend = c.close >= supertrendVal;
      continue;
    }

    const prevClose = candles[i - 1].close;

    if (basicUpperBand < finalUpperBand || prevClose > finalUpperBand) {
      finalUpperBand = basicUpperBand;
    }

    if (basicLowerBand > finalLowerBand || prevClose < finalLowerBand) {
      finalLowerBand = basicLowerBand;
    }

    if (isUptrend) {
      supertrendVal = finalLowerBand;
      if (c.close < supertrendVal) {
        isUptrend = false;
        supertrendVal = finalUpperBand;
      }
    } else {
      supertrendVal = finalUpperBand;
      if (c.close > supertrendVal) {
        isUptrend = true;
        supertrendVal = finalLowerBand;
      }
    }
  }

  const lastClose = candles[candles.length - 1].close;
  const bullish = isUptrend || lastClose >= supertrendVal;

  return {
    trend: bullish ? 'BULLISH' : 'BEARISH',
    supertrendLine: Math.round(supertrendVal * 100) / 100,
    isBullish: bullish,
    isBearish: !bullish
  };
}
