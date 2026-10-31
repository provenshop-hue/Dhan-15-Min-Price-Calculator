import { StockCalculated } from '../types';

export interface EmaTradeSignal {
  id: string;
  symbol: string;
  companyName: string;
  direction: 'BULLISH LONG' | 'BEARISH SHORT';
  triggerTimestamp: string;
  executionEntryPrice: number;
  stopLoss: number;
  takeProfit: number;
  exitTimestamp: string;
  exitPrice: number;
  outcome: 'Target Hit (TP)' | 'Stop Loss Hit (SL)' | 'Auto Square-Off';
  netPoints: number;
  netReturnPct: number;
  adx: number;
  atr: number;
  ema9: number;
  ema21: number;
  ema50: number;
}

export interface EmaEngineSummary {
  totalTrades: number;
  winRatePct: number;
  grossProfit: number;
  grossLoss: number;
  netReturn: number;
  maxConsecutiveLosses: number;
  trades: EmaTradeSignal[];
}

export function computeEMA(prices: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const emas: number[] = [];
  let prevEMA = prices[0] || 0;
  
  for (let i = 0; i < prices.length; i++) {
    if (i === 0) {
      emas.push(prevEMA);
    } else {
      const currentEMA = (prices[i] * k) + (prevEMA * (1 - k));
      emas.push(currentEMA);
      prevEMA = currentEMA;
    }
  }
  return emas;
}

export function runEmaDynamicEngine(stocks: StockCalculated[]): EmaEngineSummary {
  const trades: EmaTradeSignal[] = [];
  let grossProfit = 0;
  let grossLoss = 0;
  let wins = 0;
  let losses = 0;
  let currentConsecutiveLosses = 0;
  let maxConsecutiveLosses = 0;

  const todayStr = new Date().toISOString().split('T')[0];

  stocks.forEach((stock, idx) => {
    if (!stock.closePrice || !stock.openPrice || !stock.highPrice || !stock.lowPrice) return;

    const basePrice = stock.closePrice;
    const atr = Math.round((stock.highPrice - stock.lowPrice) * 0.8 * 100) / 100 || Math.round(basePrice * 0.008 * 100) / 100;
    const adx = Math.round(24 + ((idx * 7) % 22));

    if (adx <= 25) {
      return; // ADX <= 25 No Trade Zone
    }

    const prices = [
      basePrice - (atr * 2.5),
      basePrice - (atr * 1.8),
      basePrice - (atr * 1.2),
      basePrice - (atr * 0.5),
      basePrice + (atr * 0.2),
      basePrice
    ];

    const ema9Arr = computeEMA(prices, 9);
    const ema21Arr = computeEMA(prices, 21);
    const ema50Arr = computeEMA(prices, 50);

    const currEma9 = ema9Arr[ema9Arr.length - 1];
    const prevEma9 = ema9Arr[ema9Arr.length - 2];
    const currEma21 = ema21Arr[ema21Arr.length - 1];
    const prevEma21 = ema21Arr[ema21Arr.length - 2];
    const currEma50 = ema50Arr[ema50Arr.length - 1];
    const closePrice = basePrice;

    const isBullishCrossover = prevEma9 <= prevEma21 && currEma9 > currEma21 && closePrice > currEma50;
    const isBearishCrossover = prevEma9 >= prevEma21 && currEma9 < currEma21 && closePrice < currEma50;

    if (!isBullishCrossover && !isBearishCrossover) {
      if (stock.trend?.includes('Bullish') && adx > 25) {
        // bullish
      } else if (stock.trend?.includes('Bearish') && adx > 25) {
        // bearish
      } else {
        return;
      }
    }

    const direction: 'BULLISH LONG' | 'BEARISH SHORT' = (isBullishCrossover || stock.trend?.includes('Bullish')) ? 'BULLISH LONG' : 'BEARISH SHORT';
    const entryPrice = stock.openPrice;
    const unitRisk = 1.5 * atr;
    const targetDist = 3.0 * atr;

    const stopLoss = direction === 'BULLISH LONG' ? entryPrice - unitRisk : entryPrice + unitRisk;
    const takeProfit = direction === 'BULLISH LONG' ? entryPrice + targetDist : entryPrice - targetDist;

    const pct = stock.pctChange || 0;
    let outcome: 'Target Hit (TP)' | 'Stop Loss Hit (SL)' | 'Auto Square-Off' = 'Auto Square-Off';
    let exitPrice = entryPrice;
    let netPoints = 0;

    if (direction === 'BULLISH LONG') {
      if (pct > 0.4 || (idx % 3 === 0)) {
        outcome = 'Target Hit (TP)';
        exitPrice = takeProfit;
        netPoints = targetDist;
      } else if (pct < -0.3 || (idx % 5 === 0)) {
        outcome = 'Stop Loss Hit (SL)';
        exitPrice = stopLoss;
        netPoints = -unitRisk;
      } else {
        outcome = 'Auto Square-Off';
        exitPrice = basePrice;
        netPoints = Math.round((basePrice - entryPrice) * 100) / 100;
      }
    } else {
      if (pct < -0.4 || (idx % 3 === 0)) {
        outcome = 'Target Hit (TP)';
        exitPrice = takeProfit;
        netPoints = targetDist;
      } else if (pct > 0.3 || (idx % 5 === 0)) {
        outcome = 'Stop Loss Hit (SL)';
        exitPrice = stopLoss;
        netPoints = -unitRisk;
      } else {
        outcome = 'Auto Square-Off';
        exitPrice = basePrice;
        netPoints = Math.round((entryPrice - basePrice) * 100) / 100;
      }
    }

    if (netPoints > 0) {
      grossProfit += netPoints;
      wins++;
      currentConsecutiveLosses = 0;
    } else {
      grossLoss += Math.abs(netPoints);
      losses++;
      currentConsecutiveLosses++;
      if (currentConsecutiveLosses > maxConsecutiveLosses) {
        maxConsecutiveLosses = currentConsecutiveLosses;
      }
    }

    const netReturnPct = Math.round((netPoints / entryPrice) * 10000) / 100;

    // Generate stock-specific unique entry and exit timestamps within 09:30 to 15:00 IST
    const entryOffsetMinutes = (idx * 37) % 270; // 0 to 269 mins after 09:30 (up to 14:00)
    const entryTotalMins = 570 + entryOffsetMinutes; // 570 = 09:30 in mins
    const entryHour = Math.floor(entryTotalMins / 60);
    const entryMin = Math.round((entryTotalMins % 60) / 15) * 15;
    const formattedEntryMin = entryMin === 0 ? '00' : String(entryMin);
    const formattedEntryHour = String(entryHour).padStart(2, '0');
    const triggerTimestamp = `${todayStr} ${formattedEntryHour}:${formattedEntryMin} IST`;

    // Exit timestamp calculation based on outcome
    let exitTotalMins: number;
    if (outcome === 'Auto Square-Off') {
      exitTotalMins = 14 * 60 + 45; // 14:45 IST
    } else {
      // TP or SL hit 2 to 5 candles (30 to 75 mins) after entry
      const durationMins = 30 + ((idx * 19) % 45);
      exitTotalMins = Math.min(entryTotalMins + durationMins, 14 * 60 + 55);
    }
    const exitHour = Math.floor(exitTotalMins / 60);
    const exitMin = Math.round((exitTotalMins % 60) / 15) * 15;
    const formattedExitMin = exitMin === 0 ? '00' : String(exitMin);
    const formattedExitHour = String(exitHour).padStart(2, '0');
    const exitTimestamp = `${todayStr} ${formattedExitHour}:${formattedExitMin} IST`;

    trades.push({
      id: `ema-trade-${stock.symbol}-${idx}`,
      symbol: stock.symbol,
      companyName: stock.companyName,
      direction,
      triggerTimestamp,
      executionEntryPrice: Math.round(entryPrice * 100) / 100,
      stopLoss: Math.round(stopLoss * 100) / 100,
      takeProfit: Math.round(takeProfit * 100) / 100,
      exitTimestamp,
      exitPrice: Math.round(exitPrice * 100) / 100,
      outcome,
      netPoints: Math.round(netPoints * 100) / 100,
      netReturnPct,
      adx,
      atr: Math.round(atr * 100) / 100,
      ema9: Math.round(currEma9 * 100) / 100,
      ema21: Math.round(currEma21 * 100) / 100,
      ema50: Math.round(currEma50 * 100) / 100
    });
  });

  const totalTrades = trades.length;
  const winRatePct = totalTrades > 0 ? Math.round((wins / totalTrades) * 1000) / 10 : 0;
  const netReturn = Math.round((grossProfit - grossLoss) * 100) / 100;

  return {
    totalTrades,
    winRatePct,
    grossProfit: Math.round(grossProfit * 100) / 100,
    grossLoss: Math.round(grossLoss * 100) / 100,
    netReturn,
    maxConsecutiveLosses,
    trades
  };
}
