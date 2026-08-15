import { StockCalculated, StockTradeJourney, FetchSnapshot, TradeTrajectoryVerdict } from '../types';
import { isOpenLowPattern, isOpenHighPattern, isAboveFirst15mCandle, isBelowFirst15mCandle } from './gann';
import { analyzeBullishCombinations } from './bullishCombinations';

const STORAGE_KEY = 'dhan_trade_journey_history_v1';

/**
 * Loads stored trade journey tracks from localStorage
 */
export function getStoredTradeJourneys(): Record<string, StockTradeJourney> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load trade journeys from storage', e);
    return {};
  }
}

/**
 * Persists trade journey tracks to localStorage
 */
export function saveTradeJourneys(journeys: Record<string, StockTradeJourney>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(journeys));
  } catch (e) {
    console.error('Failed to save trade journeys to storage', e);
  }
}

/**
 * Clears all stored trade journeys
 */
export function clearTradeJourneys(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear trade journeys', e);
  }
}

/**
 * Evaluates trade trajectory and calculates confidence score, PnL, target progress, and actionable guidance
 */
export function evaluateStockTradeJourney(
  stock: StockCalculated,
  existingJourney?: StockTradeJourney
): StockTradeJourney | null {
  const cmp = stock.closePrice || stock.openPrice;
  if (!cmp || cmp <= 0) return null;

  const isOpenLow = (stock.openPrice !== undefined && stock.openPrice !== null && stock.openPrice > 0)
    ? isOpenLowPattern(stock.openPrice, stock.lowPrice, stock.first15mLow)
    : false;
  const isOpenHigh = (stock.openPrice !== undefined && stock.openPrice !== null && stock.openPrice > 0)
    ? isOpenHighPattern(stock.openPrice, stock.highPrice, stock.first15mHigh)
    : false;
  const comboAnalysis = analyzeBullishCombinations(stock);

  const isBullishSignal = stock.trend === 'Very Bullish' || stock.trend === 'Bullish' || isOpenLow || comboAnalysis.isAnyComboMet;
  const isBearishSignal = stock.trend === 'Very Bearish' || stock.trend === 'Bearish' || isOpenHigh;

  if (!isBullishSignal && !isBearishSignal && !existingJourney) {
    return null;
  }

  const signalType: 'BULLISH' | 'BEARISH' = isBullishSignal ? 'BULLISH' : 'BEARISH';
  const signalCategory = isOpenLow 
    ? 'OPEN_LOW' 
    : comboAnalysis.isAnyComboMet 
    ? 'BULLISH_COMBO' 
    : stock.trend === 'Very Bullish' 
    ? 'VERY_BULLISH' 
    : isOpenHigh 
    ? 'OPEN_HIGH' 
    : 'VERY_BEARISH';

  // Determine Entry/Inception Price
  const openPrice = stock.openPrice || cmp;
  const highPrice = stock.highPrice || cmp;
  const lowPrice = stock.lowPrice || cmp;
  const vwap = stock.vwap || null;
  const rsi = stock.rsi ?? null;

  // Inception price & time
  let inceptionPrice = existingJourney ? existingJourney.inceptionPrice : (stock.buyAbove || openPrice);
  let inceptionTime = existingJourney ? existingJourney.inceptionTime : (stock.candleTimestamp || '09:15 AM');

  // If new journey, calculate realistic targets based on Gann or ATR %
  const target1 = stock.targetsUp && stock.targetsUp[0] ? stock.targetsUp[0] : Math.round((inceptionPrice * (signalType === 'BULLISH' ? 1.015 : 0.985)) * 100) / 100;
  const target2 = stock.targetsUp && stock.targetsUp[1] ? stock.targetsUp[1] : Math.round((inceptionPrice * (signalType === 'BULLISH' ? 1.03 : 0.97)) * 100) / 100;
  const target3 = stock.targetsUp && stock.targetsUp[2] ? stock.targetsUp[2] : Math.round((inceptionPrice * (signalType === 'BULLISH' ? 1.05 : 0.95)) * 100) / 100;
  const stopLoss = signalType === 'BULLISH'
    ? (stock.first15mLow || stock.lowPrice || Math.round((inceptionPrice * 0.99) * 100) / 100)
    : (stock.first15mHigh || stock.highPrice || Math.round((inceptionPrice * 1.01) * 100) / 100);

  // Current PnL calculation
  const currentPnLAmount = signalType === 'BULLISH' ? cmp - inceptionPrice : inceptionPrice - cmp;
  const currentPnLPercent = Math.round(((currentPnLAmount / inceptionPrice) * 100) * 100) / 100;

  // Calculate Peak PnL & Max Drawdown
  let peakPnLPercent = existingJourney ? Math.max(existingJourney.peakPnLPercent, currentPnLPercent) : Math.max(0, currentPnLPercent);
  let maxDrawdownPercent = existingJourney ? Math.min(existingJourney.maxDrawdownPercent, currentPnLPercent) : Math.min(0, currentPnLPercent);

  // Target Hit Flags
  const target1Hit = signalType === 'BULLISH' ? cmp >= target1 : cmp <= target1;
  const target2Hit = signalType === 'BULLISH' ? cmp >= target2 : cmp <= target2;
  const stopLossBreached = signalType === 'BULLISH' ? cmp < stopLoss : cmp > stopLoss;

  // Create current fetch snapshot
  const nowIso = new Date().toISOString();
  const timeNowStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const displayTime = stock.candleTimestamp || timeNowStr;

  const currentSnapshot: FetchSnapshot = {
    timeStr: displayTime,
    isoTimestamp: nowIso,
    price: cmp,
    open: openPrice,
    high: highPrice,
    low: lowPrice,
    trend: (stock.trend as any) || (isBullishSignal ? 'Bullish' : 'Bearish'),
    rsi,
    vwap,
    vwapStatus: stock.vwapStatus || (vwap ? (cmp > vwap ? 'Above' : cmp < vwap ? 'Below' : 'At') : null),
    gannScore: stock.gannScore,
    pctChange: stock.pctChange,
    pnlFromTriggerPct: currentPnLPercent,
    target1Hit,
    target2Hit,
    stopLossBreached
  };

  // Build snapshot timeline: merge with existing or backfill from rsiTimeline
  let fetchSnapshots: FetchSnapshot[] = existingJourney ? [...existingJourney.fetchSnapshots] : [];

  if (fetchSnapshots.length === 0 && stock.rsiTimeline && stock.rsiTimeline.length > 0) {
    // Backfill historical candles from Dhan 15m candle timeline
    fetchSnapshots = stock.rsiTimeline.map((item, idx) => {
      const pnl = Math.round((((item.close - inceptionPrice) / inceptionPrice) * 100) * 100) / 100;
      return {
        timeStr: item.timeStr,
        isoTimestamp: nowIso,
        price: item.close,
        open: openPrice,
        high: Math.max(item.close, highPrice),
        low: Math.min(item.close, lowPrice),
        trend: pnl >= 0 ? (pnl >= 1.5 ? 'Very Bullish' : 'Bullish') : (pnl <= -1.5 ? 'Very Bearish' : 'Bearish'),
        rsi: item.rsi,
        vwap,
        vwapStatus: vwap ? (item.close > vwap ? 'Above' : 'Below') : null,
        gannScore: 75,
        pctChange: pnl,
        pnlFromTriggerPct: signalType === 'BULLISH' ? pnl : -pnl,
        target1Hit: signalType === 'BULLISH' ? item.close >= target1 : item.close <= target1,
        target2Hit: signalType === 'BULLISH' ? item.close >= target2 : item.close <= target2,
        stopLossBreached: signalType === 'BULLISH' ? item.close < stopLoss : item.close > stopLoss
      };
    });
  }

  // Avoid duplicate snapshots at identical timestamps
  const lastSnap = fetchSnapshots[fetchSnapshots.length - 1];
  if (!lastSnap || lastSnap.timeStr !== currentSnapshot.timeStr || Math.abs(lastSnap.price - currentSnapshot.price) > 0.05) {
    fetchSnapshots.push(currentSnapshot);
  } else {
    // Update the last snapshot with latest price
    fetchSnapshots[fetchSnapshots.length - 1] = currentSnapshot;
  }

  // Cap snapshots at 30
  if (fetchSnapshots.length > 30) {
    fetchSnapshots = fetchSnapshots.slice(fetchSnapshots.length - 30);
  }

  // Evaluate Consecutive Bullish Counts
  let consecutiveBullishCount = 0;
  for (let i = fetchSnapshots.length - 1; i >= 0; i--) {
    const s = fetchSnapshots[i];
    if (signalType === 'BULLISH' && s.pnlFromTriggerPct >= -0.3 && s.trend !== 'Very Bearish') {
      consecutiveBullishCount++;
    } else if (signalType === 'BEARISH' && s.pnlFromTriggerPct >= -0.3 && s.trend !== 'Very Bullish') {
      consecutiveBullishCount++;
    } else {
      break;
    }
  }

  // Calculate Confidence Score (0-100)
  let confidence = 50;

  // Factor 1: PnL Progression
  if (currentPnLPercent >= 2.0) confidence += 25;
  else if (currentPnLPercent >= 1.0) confidence += 20;
  else if (currentPnLPercent > 0) confidence += 15;
  else if (currentPnLPercent > -0.5) confidence += 5;
  else if (currentPnLPercent <= -1.5) confidence -= 30;

  // Factor 2: VWAP position
  if (vwap) {
    if (signalType === 'BULLISH' && cmp > vwap) confidence += 15;
    else if (signalType === 'BULLISH' && cmp < vwap) confidence -= 20;
    else if (signalType === 'BEARISH' && cmp < vwap) confidence += 15;
    else if (signalType === 'BEARISH' && cmp > vwap) confidence -= 20;
  }

  // Factor 3: RSI Momentum
  if (rsi !== null) {
    if (signalType === 'BULLISH') {
      if (rsi >= 58 && rsi <= 75) confidence += 15;
      else if (rsi > 75) confidence += 5; // overbought warning
      else if (rsi < 45) confidence -= 20;
    } else {
      if (rsi <= 42 && rsi >= 25) confidence += 15;
      else if (rsi > 55) confidence -= 20;
    }
  }

  // Factor 4: Persistence across multiple fetches
  if (consecutiveBullishCount >= 3) confidence += 10;
  if (consecutiveBullishCount >= 5) confidence += 5;

  // Factor 5: Pattern Confirmation
  if (isOpenLow || isOpenHigh) confidence += 10;
  if (comboAnalysis.isAllCombosMet) confidence += 10;

  // Clamp Confidence Score
  const confidenceScore = Math.max(5, Math.min(99, confidence));

  // Determine Trajectory Verdict
  let verdict: TradeTrajectoryVerdict = 'HEALTHY_PULLBACK';
  let verdictTitle = 'Healthy Pullback (Holding Support)';
  let verdictBadgeClass = 'bg-amber-100 text-amber-900 border-amber-300';
  let actionableGuidance = 'Price is pulling back gently while maintaining key support. Hold your trade; Stop Loss is safe.';

  if (stopLossBreached || currentPnLPercent <= -1.8) {
    verdict = 'EXIT_INVALIDATED';
    verdictTitle = '⚠️ Exit Alert (Signal Invalidated)';
    verdictBadgeClass = 'bg-rose-600 text-white font-black border-rose-300 animate-pulse';
    actionableGuidance = `Stop loss at ₹${stopLoss.toFixed(2)} was breached or momentum reversed. Exit trade immediately to protect capital.`;
  } else if (target2Hit || currentPnLPercent >= 3.0) {
    verdict = 'TARGET_2_HIT';
    verdictTitle = '🎯 Target 2 Reached (+3% Gain)';
    verdictBadgeClass = 'bg-purple-700 text-yellow-300 font-black border-purple-400 shadow-md';
    actionableGuidance = `Outstanding rally! Target 2 is achieved (+${currentPnLPercent}% profit). Book 70% profit and trail remaining Stop Loss to ₹${target1.toFixed(2)}.`;
  } else if (target1Hit || currentPnLPercent >= 1.5) {
    verdict = 'TARGET_1_HIT';
    verdictTitle = '✅ Target 1 Hit (Trail SL to Cost)';
    verdictBadgeClass = 'bg-emerald-600 text-white font-black border-emerald-300 shadow-md';
    actionableGuidance = `Target 1 reached with +${currentPnLPercent}% profit! Book partial profit (30-50%) and move Stop Loss to your Entry price (₹${inceptionPrice.toFixed(2)}) for a risk-free ride to Target 2.`;
  } else if (currentPnLPercent >= 0.5 && (!vwap || (signalType === 'BULLISH' ? cmp > vwap : cmp < vwap))) {
    verdict = 'PROFIT_EXPANDING';
    verdictTitle = '🚀 Profit Expanding (Strong Momentum)';
    verdictBadgeClass = 'bg-emerald-100 text-emerald-900 font-extrabold border-emerald-400';
    actionableGuidance = `Stock is gaining smoothly (+${currentPnLPercent}%). Momentum is intact above VWAP (₹${vwap ? vwap.toFixed(2) : '-'}). Hold tight for Target 1 (₹${target1.toFixed(2)}).`;
  } else if (rsi !== null && ((signalType === 'BULLISH' && rsi < 50) || (signalType === 'BEARISH' && rsi > 50))) {
    verdict = 'MOMENTUM_COOLING';
    verdictTitle = '⏸️ Momentum Cooling (Tighten SL)';
    verdictBadgeClass = 'bg-orange-100 text-orange-900 font-bold border-orange-300';
    actionableGuidance = `RSI momentum is slowing (${rsi.toFixed(1)}). If holding profits, tighten your trailing stop to ₹${(signalType === 'BULLISH' ? Math.max(stopLoss, inceptionPrice * 0.995) : Math.min(stopLoss, inceptionPrice * 1.005)).toFixed(2)}.`;
  }

  const keySupportResistance = signalType === 'BULLISH'
    ? `Support: ₹${stopLoss.toFixed(2)} (SL) | VWAP: ₹${vwap?.toFixed(2) ?? '-'} | T1: ₹${target1.toFixed(2)} | T2: ₹${target2.toFixed(2)}`
    : `Resistance: ₹${stopLoss.toFixed(2)} (SL) | VWAP: ₹${vwap?.toFixed(2) ?? '-'} | T1: ₹${target1.toFixed(2)} | T2: ₹${target2.toFixed(2)}`;

  return {
    stockId: stock.id,
    symbol: stock.symbol,
    companyName: stock.companyName,
    signalType,
    signalCategory,
    inceptionTime,
    inceptionPrice,
    latestPrice: cmp,
    currentPnLPercent,
    currentPnLAmount: Math.round(currentPnLAmount * 100) / 100,
    peakPnLPercent,
    maxDrawdownPercent,
    entryPrice: inceptionPrice,
    target1,
    target2,
    target3,
    stopLoss,
    verdict,
    verdictTitle,
    verdictBadgeClass,
    confidenceScore,
    actionableGuidance,
    keySupportResistance,
    fetchSnapshots,
    totalFetchesTracked: fetchSnapshots.length,
    consecutiveBullishCount,
    lastUpdatedTime: displayTime
  };
}

/**
 * Bulk updates trade journeys for all stocks and stores in localStorage
 */
export function updateAllTradeJourneys(
  stocks: StockCalculated[],
  existingJourneys: Record<string, StockTradeJourney> = {}
): Record<string, StockTradeJourney> {
  const updated: Record<string, StockTradeJourney> = { ...existingJourneys };

  stocks.forEach((stock) => {
    const prev = updated[stock.id];
    const journey = evaluateStockTradeJourney(stock, prev);
    if (journey) {
      updated[stock.id] = journey;
    }
  });

  saveTradeJourneys(updated);
  return updated;
}
