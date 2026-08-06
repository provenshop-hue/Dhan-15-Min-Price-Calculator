import { StockCalculated, VolumeAnalysisResult } from '../types';

/**
 * Calculates R-Volume (Relative Volume), Bull (Buy) Volume vs Bear (Sell) Volume,
 * and the 09:15 AM First Candle Buy/Sell volume ratio & multiplier.
 */
export function calculateVolumeAnalysis(stock: StockCalculated): VolumeAnalysisResult {
  const timeline = stock.rsiTimeline || [];

  const stockOpen = stock.openPrice || 100;
  const stockClose = stock.closePrice || stockOpen;
  const stockHigh = stock.highPrice || Math.max(stockOpen, stockClose);
  const stockLow = stock.lowPrice || Math.min(stockOpen, stockClose);
  const totalStockVol = stock.volume || 50000;

  // Helper to split a candle's volume into Buy Volume and Sell Volume
  const calcCandleBuySell = (
    cOpen: number,
    cHigh: number,
    cLow: number,
    cClose: number,
    vol: number
  ) => {
    const range = Math.max(0.01, cHigh - cLow);
    let buyFactor = 0.5;

    if (cHigh === cLow) {
      buyFactor = cClose >= cOpen ? 0.75 : 0.25;
    } else {
      // Distance of close from low relative to total candle range
      const closeLocation = (cClose - cLow) / range;
      // Body direction weight
      const bodyDir = cClose >= cOpen ? 0.1 : -0.1;
      buyFactor = closeLocation * 0.8 + 0.1 + bodyDir;
    }

    // Clamp factor between 5% and 95%
    buyFactor = Math.min(0.95, Math.max(0.05, buyFactor));
    const sellFactor = 1 - buyFactor;

    const buyVol = Math.round(vol * buyFactor);
    const sellVol = Math.round(vol * sellFactor);

    return { buyVol, sellVol, buyFactor, sellFactor };
  };

  // 1. First Candle (09:15 AM Opening Candle) Metrics
  let fOpen = stockOpen;
  let fHigh = stockHigh;
  let fLow = stockLow;
  let fClose = stockClose;
  let fVol = Math.round(totalStockVol / Math.max(1, timeline.length || 1));

  if (timeline.length > 0) {
    const pt0 = timeline[0];
    fOpen = pt0.open || stockOpen;
    fClose = pt0.close || stockClose;
    fHigh = pt0.high || Math.max(fOpen, fClose);
    fLow = pt0.low || Math.min(fOpen, fClose);
    fVol = pt0.volume || fVol;
  }

  const firstCandleSplit = calcCandleBuySell(fOpen, fHigh, fLow, fClose, fVol);
  const firstCandleBuyVol = firstCandleSplit.buyVol;
  const firstCandleSellVol = firstCandleSplit.sellVol;

  const buyVsSellRatio = Math.round((firstCandleBuyVol / Math.max(1, firstCandleSellVol)) * 10) / 10;
  const sellVsBuyRatio = Math.round((firstCandleSellVol / Math.max(1, firstCandleBuyVol)) * 10) / 10;

  let firstCandleDominantSide: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';
  let firstCandleMultiple = 1.0;
  let firstCandleDirectionLabel = '1.0X Balanced Vol';

  if (firstCandleBuyVol >= firstCandleSellVol) {
    firstCandleDominantSide = 'BUY';
    firstCandleMultiple = buyVsSellRatio;
    firstCandleDirectionLabel = `${firstCandleMultiple.toFixed(1)}X BUY VOL (Bullish)`;
  } else {
    firstCandleDominantSide = 'SELL';
    firstCandleMultiple = sellVsBuyRatio;
    firstCandleDirectionLabel = `${firstCandleMultiple.toFixed(1)}X SELL VOL (Bearish)`;
  }

  // 2. Session Cumulative Volume & Bull vs Bear Aggregation
  let totalVol = 0;
  let totalBullVol = 0;
  let totalBearVol = 0;

  if (timeline.length > 0) {
    for (const pt of timeline) {
      const pOpen = pt.open || pt.close;
      const pHigh = pt.high || Math.max(pOpen, pt.close);
      const pLow = pt.low || Math.min(pOpen, pt.close);
      const pClose = pt.close;
      const pVol = pt.volume || Math.round(totalStockVol / timeline.length);

      const split = calcCandleBuySell(pOpen, pHigh, pLow, pClose, pVol);
      totalVol += pVol;
      totalBullVol += split.buyVol;
      totalBearVol += split.sellVol;
    }
  } else {
    totalVol = totalStockVol;
    const split = calcCandleBuySell(stockOpen, stockHigh, stockLow, stockClose, totalStockVol);
    totalBullVol = split.buyVol;
    totalBearVol = split.sellVol;
  }

  const avgCandleVol = Math.round(totalVol / Math.max(1, timeline.length || 1));
  const otherVolSum = Math.max(0, totalVol - fVol);
  const avgOtherCandleVol = timeline.length > 1 ? Math.round(otherVolSum / (timeline.length - 1)) : avgCandleVol;
  const firstCandleRVol = avgOtherCandleVol > 0 ? Math.round((fVol / avgOtherCandleVol) * 10) / 10 : 1.0;

  const bullVolPct = Math.round((totalBullVol / Math.max(1, totalVol)) * 1000) / 10;
  const bearVolPct = Math.round((totalBearVol / Math.max(1, totalVol)) * 1000) / 10;
  const bullBearRatio = Math.round((totalBullVol / Math.max(1, totalBearVol)) * 100) / 100;

  // Calculate Relative Volume (R-Vol)
  // Compare total accumulated session volume to average base volume
  const baselineSessionVol = 120000;
  const rVolume = Math.round((totalVol / Math.max(1000, baselineSessionVol)) * 100) / 100;

  const isOpeningBuySurge = firstCandleDominantSide === 'BUY' && firstCandleMultiple >= 1.8;
  const isHighRVol = rVolume >= 1.2 || firstCandleRVol >= 1.5;

  return {
    firstCandleVol: fVol,
    firstCandleOpen: fOpen,
    firstCandleClose: fClose,
    firstCandleHigh: fHigh,
    firstCandleLow: fLow,
    firstCandleBuyVol,
    firstCandleSellVol,
    firstCandleBuyRatio: buyVsSellRatio,
    firstCandleSellRatio: sellVsBuyRatio,
    firstCandleMultiple,
    firstCandleDominantSide,
    firstCandleDirectionLabel,
    firstCandleRVol,
    totalVolume: totalVol,
    totalBullVol,
    totalBearVol,
    bullVolPct,
    bearVolPct,
    bullBearRatio,
    rVolume,
    avgCandleVol,
    isOpeningBuySurge,
    isHighRVol
  };
}
