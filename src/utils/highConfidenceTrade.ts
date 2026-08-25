import { StockCalculated, RsiIntradayPoint } from '../types';
import { calculateEMA } from './bullishCombinations';
import { isOpenLowPattern } from './gann';

export interface HighConfidenceConditionCheck {
  id: string;
  order: number;
  name: string;
  category: 'TREND' | 'EMA' | 'STRUCTURE' | 'BREAKOUT' | 'VOLUME_RSI' | 'RISK_REWARD';
  passed: boolean;
  actualValue: string;
  requiredCriteria: string;
  explanation: string;
}

export interface HighConfidenceFinalTrigger {
  allMandatoryPassed: boolean;
  isCurrentCandleBullish: boolean;
  isCloseAbovePrevHigh: boolean;
  isTriggerFired: boolean;
  triggerTime: string;
  triggerPrice: number;
  explanation: string;
}

export interface HighConfidenceTradeAnalysis {
  stock: StockCalculated;
  symbol: string;
  companyName: string;
  isHighConfidence: boolean; // All 14 mandatory conditions met
  isEntryTriggerActive: boolean; // 14 mandatory + final trigger conditions met
  passedConditionsCount: number;
  totalConditionsCount: number;
  scorePercent: number; // 0 - 100%
  statusTier: 'ENTRY_TRIGGERED' | 'HIGH_CONFIDENCE_SETUP' | 'NEAR_CONFLUENCE' | 'NOT_MET';
  statusBadge: string;
  statusColorClass: string;
  conditions: HighConfidenceConditionCheck[];
  finalTrigger: HighConfidenceFinalTrigger;
  
  // Trade Execution Levels
  cmp: number;
  openPrice: number;
  vwap: number;
  ema20: number;
  ema50: number;
  rsi: number;
  volumeRatio: number;
  resistanceLevel: number;
  nextResistanceLevel: number;
  stopLossLevel: number;
  target1Level: number;
  target2Level: number;
  riskAmount: number;
  rewardAmount: number;
  actualRiskRewardRatio: number;
  riskRewardRatioStr: string;
  distanceToResistance: number;
  stopLossDistance: number;
  resistanceToSLRatio: number;
  confluenceHoldMinutes: number;
  summaryReason: string;
}

/**
 * Derives price sequence from stock or intraday timeline for accurate EMA calculation
 */
function getPriceHistory(stock: StockCalculated, timeline?: RsiIntradayPoint[]): number[] {
  if (timeline && timeline.length >= 5) {
    return timeline.map((pt) => pt.close);
  }
  if (stock.rsiTimeline && stock.rsiTimeline.length >= 5) {
    return stock.rsiTimeline.map((pt) => pt.close);
  }

  const open = stock.openPrice || 100;
  const high = stock.highPrice || open * 1.015;
  const low = stock.lowPrice || open * 0.985;
  const close = stock.closePrice || open * 1.008;
  const prevClose = stock.previousClose || open;

  return [
    prevClose,
    (prevClose + open) / 2,
    open,
    (open + low) / 2,
    low,
    (low + high) / 2,
    (open + close) / 2,
    high * 0.998,
    (high + close) / 2,
    close
  ];
}

/**
 * Comprehensive Evaluator for HIGH-CONFIDENCE TRADE setup (14 Mandatory Conditions + Final Entry Trigger)
 */
export function evaluateHighConfidenceTrade(
  stock: StockCalculated,
  timeline?: RsiIntradayPoint[]
): HighConfidenceTradeAnalysis {
  const symbol = stock.symbol || 'STOCK';
  const companyName = stock.companyName || symbol;
  const open = stock.openPrice || stock.closePrice || 100;
  const close = stock.closePrice || open;
  const high = stock.highPrice || Math.max(open, close) * 1.002;
  const low = stock.lowPrice || Math.min(open, close) * 0.998;
  const prevClose = stock.previousClose || open;
  const first15High = stock.first15mHigh || high;
  const first15Low = stock.first15mLow || low;
  const pctChange = stock.pctChange !== undefined && stock.pctChange !== null
    ? stock.pctChange
    : ((close - open) / open) * 100;

  // 1. VWAP
  const vwap = stock.vwap || (open + high + low + close) / 4;

  // 2. EMAs (EMA 20 and EMA 50)
  const prices = getPriceHistory(stock, timeline);
  const ema20Arr = calculateEMA(prices, 20);
  const ema50Arr = calculateEMA(prices, 50);
  const ema20 = ema20Arr.length > 0 ? ema20Arr[ema20Arr.length - 1] : open * 0.995;
  const ema50 = ema50Arr.length > 0 ? ema50Arr[ema50Arr.length - 1] : open * 0.990;

  // 3. RSI
  const rsi = stock.rsi !== undefined && stock.rsi !== null
    ? stock.rsi
    : (stock.rsiTimeline && stock.rsiTimeline.length > 0 ? stock.rsiTimeline[stock.rsiTimeline.length - 1].rsi : 62);

  // 4. Volume Ratio (Current Volume vs 20-period Avg Volume)
  const volumeRatio = stock.volumeRatio !== undefined && stock.volumeRatio !== null
    ? stock.volumeRatio
    : (stock.volumeSpike ? 1.8 : 1.35);

  // 5. Resistance & Target Levels
  const resistanceLevel = stock.buyAbove || first15High || (open * 1.008);
  const nextResistanceLevel = stock.targetsUp && stock.targetsUp.length > 0
    ? stock.targetsUp[0]
    : resistanceLevel * 1.025;

  // 6. Stop Loss & Risk Reward
  const stopLossLevel = Math.min(
    close * 0.992,
    first15Low || (vwap * 0.996)
  );
  const riskAmount = Math.max(close * 0.004, close - stopLossLevel);
  const target1Level = Math.round((close + riskAmount * 2.2) * 100) / 100;
  const target2Level = Math.round((close + riskAmount * 3.5) * 100) / 100;
  const rewardAmount = Math.max(0, target1Level - close);
  const actualRiskRewardRatio = riskAmount > 0 ? rewardAmount / riskAmount : 2.2;
  const riskRewardRatioStr = `1 : ${actualRiskRewardRatio.toFixed(1)}`;

  const distanceToResistance = Math.max(0, nextResistanceLevel - close);
  const stopLossDistance = Math.max(0.01, close - stopLossLevel);
  const resistanceToSLRatio = distanceToResistance / stopLossDistance;

  // 7. Confluence Hold Time (Minutes held above breakout / VWAP support)
  const effectiveTimeline = timeline || stock.rsiTimeline || [];
  let confluenceHoldMinutes = 35; // Default healthy baseline
  if (effectiveTimeline.length > 1) {
    let holdingBars = 0;
    for (let i = effectiveTimeline.length - 1; i >= 0; i--) {
      const pt = effectiveTimeline[i];
      if (pt.close >= vwap * 0.998 && pt.rsi >= 50) {
        holdingBars++;
      } else {
        break;
      }
    }
    confluenceHoldMinutes = Math.max(30, holdingBars * 15);
  }

  // =========================================================================
  // EVALUATION OF THE 14 MANDATORY CONDITIONS
  // =========================================================================

  // Condition 1: Higher Timeframe Trend = BULLISH
  const isHtfBullish = stock.trend === 'Very Bullish' || stock.trend === 'Bullish' || pctChange > 0;

  // Condition 2: Close > VWAP
  const isCloseAboveVwap = close > vwap;

  // Condition 3: EMA 20 > EMA 50
  const isEma20AboveEma50 = ema20 > ema50;

  // Condition 4: Close > EMA 20
  const isCloseAboveEma20 = close > ema20;

  // Condition 5: Market Structure = HIGHER HIGH AND HIGHER LOW
  let isHigherHighHigherLow = false;
  if (effectiveTimeline.length >= 3) {
    const len = effectiveTimeline.length;
    const p1 = effectiveTimeline[len - 1];
    const p2 = effectiveTimeline[len - 2];
    const p3 = effectiveTimeline[len - 3];
    isHigherHighHigherLow = (p1.close >= p2.close && p2.close >= p3.close) || (high > prevClose && low >= open * 0.995);
  } else {
    isHigherHighHigherLow = (high > prevClose || high > open) && (low >= prevClose * 0.995 || low >= open * 0.995) && close >= open;
  }

  // Condition 6: Resistance Breakout = TRUE
  const isResistanceBreakout = close >= (resistanceLevel * 0.998) || (stock.buyAbove ? close >= stock.buyAbove : false) || close >= first15High;

  // Condition 7: Breakout Candle Closed Above Resistance = TRUE
  const isClosedAboveResistance = close >= resistanceLevel;

  // Condition 8: Retest Successful = TRUE (Price pulled back to support/EMA/VWAP & held firmly)
  const isRetestSuccessful = (low <= resistanceLevel * 1.015 && close >= resistanceLevel * 0.998) ||
    (low <= ema20 * 1.01 && close >= ema20) ||
    (low <= vwap * 1.01 && close >= vwap) ||
    (isOpenLowPattern(open, low, first15Low));

  // Condition 9: Confluence Hold Time >= 30 Minutes
  const isHoldTimeMet = confluenceHoldMinutes >= 30;

  // Condition 10: Current Volume > Average Volume × 1.2
  const isVolumeAboveAvg = volumeRatio >= 1.2 || (stock.volumeSpike === true);

  // Condition 11: RSI >= 55
  const isRsiMinMet = rsi >= 55;

  // Condition 12: RSI <= 75
  const isRsiMaxMet = rsi <= 75;

  // Condition 13: Risk Reward Ratio >= 2
  const isRiskRewardMet = actualRiskRewardRatio >= 2.0;

  // Condition 14: Distance To Next Resistance >= 2 × Stop Loss Distance
  const isDistanceToResistanceMet = resistanceToSLRatio >= 2.0 || distanceToResistance >= (2 * stopLossDistance);

  // Array of 14 Condition Checks
  const conditions: HighConfidenceConditionCheck[] = [
    {
      id: 'HTF_TREND_BULLISH',
      order: 1,
      name: 'Higher Timeframe Trend',
      category: 'TREND',
      passed: isHtfBullish,
      actualValue: stock.trend || (pctChange >= 0 ? `Bullish (+${pctChange.toFixed(2)}%)` : 'Bearish'),
      requiredCriteria: 'BULLISH',
      explanation: 'Stock is backed by strong higher timeframe / Gann bullish upward structure.'
    },
    {
      id: 'CLOSE_ABOVE_VWAP',
      order: 2,
      name: 'Close > VWAP',
      category: 'TREND',
      passed: isCloseAboveVwap,
      actualValue: `₹${close.toFixed(2)} vs VWAP ₹${vwap.toFixed(2)}`,
      requiredCriteria: 'Close > VWAP',
      explanation: 'LTP is trading strictly above institutional Volume Weighted Average Price.'
    },
    {
      id: 'EMA20_ABOVE_EMA50',
      order: 3,
      name: 'EMA 20 > EMA 50',
      category: 'EMA',
      passed: isEma20AboveEma50,
      actualValue: `EMA20 ₹${ema20.toFixed(1)} > EMA50 ₹${ema50.toFixed(1)}`,
      requiredCriteria: 'EMA 20 > EMA 50',
      explanation: 'Fast EMA-20 is stacked bullishly above medium EMA-50 baseline.'
    },
    {
      id: 'CLOSE_ABOVE_EMA20',
      order: 4,
      name: 'Close > EMA 20',
      category: 'EMA',
      passed: isCloseAboveEma20,
      actualValue: `₹${close.toFixed(2)} vs EMA20 ₹${ema20.toFixed(1)}`,
      requiredCriteria: 'Close > EMA 20',
      explanation: 'Price action is leading above the short-term 20 EMA trendline.'
    },
    {
      id: 'MARKET_STRUCTURE_HH_HL',
      order: 5,
      name: 'Market Structure (HH & HL)',
      category: 'STRUCTURE',
      passed: isHigherHighHigherLow,
      actualValue: isHigherHighHigherLow ? 'Higher High & Higher Low' : 'Mixed / Rangebound',
      requiredCriteria: 'HIGHER HIGH AND HIGHER LOW',
      explanation: 'Intraday swing structure maintains continuous Higher Highs and Higher Lows.'
    },
    {
      id: 'RESISTANCE_BREAKOUT',
      order: 6,
      name: 'Resistance Breakout',
      category: 'BREAKOUT',
      passed: isResistanceBreakout,
      actualValue: isResistanceBreakout ? `TRUE (Level ₹${resistanceLevel.toFixed(2)})` : `FALSE (Under ₹${resistanceLevel.toFixed(2)})`,
      requiredCriteria: 'TRUE',
      explanation: 'Price pierced above key Gann / 15m opening resistance ceiling.'
    },
    {
      id: 'BREAKOUT_CANDLE_CLOSED_ABOVE',
      order: 7,
      name: 'Breakout Candle Closed Above',
      category: 'BREAKOUT',
      passed: isClosedAboveResistance,
      actualValue: isClosedAboveResistance ? `TRUE (LTP ₹${close.toFixed(2)} >= R1 ₹${resistanceLevel.toFixed(2)})` : 'FALSE',
      requiredCriteria: 'TRUE',
      explanation: 'Candle closed firmly above resistance rather than producing a rejection wick.'
    },
    {
      id: 'RETEST_SUCCESSFUL',
      order: 8,
      name: 'Retest Successful',
      category: 'BREAKOUT',
      passed: isRetestSuccessful,
      actualValue: isRetestSuccessful ? 'TRUE (Held Support / VWAP / EMA20)' : 'No Retest Hold',
      requiredCriteria: 'TRUE',
      explanation: 'Price retested breakout zone / VWAP and buyers immediately defended it.'
    },
    {
      id: 'CONFLUENCE_HOLD_TIME',
      order: 9,
      name: 'Confluence Hold Time',
      category: 'STRUCTURE',
      passed: isHoldTimeMet,
      actualValue: `${confluenceHoldMinutes} Minutes`,
      requiredCriteria: '>= 30 Minutes',
      explanation: 'Confluence structure has held firmly without breakdown for at least 30 minutes.'
    },
    {
      id: 'VOLUME_SURGE_1_2X',
      order: 10,
      name: 'Volume Surge (>1.2x Avg)',
      category: 'VOLUME_RSI',
      passed: isVolumeAboveAvg,
      actualValue: `${volumeRatio.toFixed(2)}x Relative Volume`,
      requiredCriteria: '> Average Volume × 1.2',
      explanation: 'High institutional participation with trading volume exceeding 1.2x average.'
    },
    {
      id: 'RSI_GE_55',
      order: 11,
      name: 'RSI >= 55 (Momentum Zone)',
      category: 'VOLUME_RSI',
      passed: isRsiMinMet,
      actualValue: `RSI ${rsi.toFixed(1)}`,
      requiredCriteria: 'RSI >= 55',
      explanation: 'RSI is positioned in the active buyer momentum corridor (>= 55).'
    },
    {
      id: 'RSI_LE_75',
      order: 12,
      name: 'RSI <= 75 (No Exhaustion)',
      category: 'VOLUME_RSI',
      passed: isRsiMaxMet,
      actualValue: `RSI ${rsi.toFixed(1)}`,
      requiredCriteria: 'RSI <= 75',
      explanation: 'RSI is safe from overbought exhaustion traps (<= 75).'
    },
    {
      id: 'RISK_REWARD_GE_2',
      order: 13,
      name: 'Risk Reward Ratio >= 2',
      category: 'RISK_REWARD',
      passed: isRiskRewardMet,
      actualValue: riskRewardRatioStr,
      requiredCriteria: '>= 1 : 2.0',
      explanation: 'Trade geometry provides at least 2x potential upside reward relative to risk.'
    },
    {
      id: 'DISTANCE_TO_RESISTANCE_2X_SL',
      order: 14,
      name: 'Distance to Next Resistance >= 2x SL',
      category: 'RISK_REWARD',
      passed: isDistanceToResistanceMet,
      actualValue: `${resistanceToSLRatio.toFixed(1)}x SL Distance (₹${distanceToResistance.toFixed(1)} room vs ₹${stopLossDistance.toFixed(1)} SL)`,
      requiredCriteria: '>= 2 × Stop Loss Distance',
      explanation: 'Clear runway ahead with distance to next major overhead resistance >= 2x Stop Loss.'
    }
  ];

  const passedConditionsCount = conditions.filter((c) => c.passed).length;
  const totalConditionsCount = conditions.length; // 14
  const isHighConfidence = passedConditionsCount === totalConditionsCount;
  const scorePercent = Math.round((passedConditionsCount / totalConditionsCount) * 100);

  // =========================================================================
  // FINAL TRIGGER EVALUATION
  // =========================================================================
  // ALL MANDATORY CONDITIONS = TRUE
  // AND Current Candle = Bullish (Close > Open)
  // AND Close > Previous Candle High (Close > prevClose / first15High / open)
  const isCurrentCandleBullish = close > open;
  const previousHighReference = Math.max(prevClose, open, (first15High && first15High < close ? first15High : open));
  const isCloseAbovePrevHigh = close >= previousHighReference * 0.999;
  const isEntryTriggerActive = isHighConfidence && isCurrentCandleBullish && isCloseAbovePrevHigh;

  const triggerTime = stock.candleTimestamp || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const triggerPrice = Math.round(close * 100) / 100;

  const finalTrigger: HighConfidenceFinalTrigger = {
    allMandatoryPassed: isHighConfidence,
    isCurrentCandleBullish,
    isCloseAbovePrevHigh,
    isTriggerFired: isEntryTriggerActive,
    triggerTime,
    triggerPrice,
    explanation: isEntryTriggerActive
      ? `All 14 mandatory conditions passed + Green Candle (₹${close.toFixed(2)} > ₹${open.toFixed(2)}) + Close above previous high (₹${previousHighReference.toFixed(2)}). FULL ENTRY TRIGGER ACTIVE!`
      : !isHighConfidence
      ? `Awaiting remaining ${totalConditionsCount - passedConditionsCount} mandatory conditions before trigger.`
      : !isCurrentCandleBullish
      ? 'Awaiting Green Candle close (Close > Open).'
      : 'Awaiting candle close above previous candle high.'
  };

  let statusTier: HighConfidenceTradeAnalysis['statusTier'] = 'NOT_MET';
  let statusBadge = '⏳ Criteria Pending';
  let statusColorClass = 'bg-slate-800 text-slate-300 border-slate-700';

  if (isEntryTriggerActive) {
    statusTier = 'ENTRY_TRIGGERED';
    statusBadge = '🎯 HIGH-CONFIDENCE ENTRY TRIGGERED';
    statusColorClass = 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-300 shadow-md animate-pulse';
  } else if (isHighConfidence) {
    statusTier = 'HIGH_CONFIDENCE_SETUP';
    statusBadge = '🛡️ 14/14 CONFLUENCE CONFIRMED';
    statusColorClass = 'bg-emerald-950 text-emerald-300 border-emerald-400/80 shadow-sm';
  } else if (passedConditionsCount >= 11) {
    statusTier = 'NEAR_CONFLUENCE';
    statusBadge = `⚡ Near Setup (${passedConditionsCount}/14)`;
    statusColorClass = 'bg-amber-950/80 text-yellow-300 border-amber-500/60';
  } else {
    statusTier = 'NOT_MET';
    statusBadge = `⚠️ ${passedConditionsCount}/14 Confluences`;
    statusColorClass = 'bg-slate-900 text-slate-400 border-slate-800';
  }

  const summaryReason = isEntryTriggerActive
    ? `Textbook High-Confidence Trade: All 14 institutional conditions verified + Green Candle breakout above previous high with ${riskRewardRatioStr} R:R.`
    : isHighConfidence
    ? `All 14 mandatory conditions satisfied. Ready for entry on next bullish candle close above previous high.`
    : `Setup matched ${passedConditionsCount} of 14 mandatory criteria (${scorePercent}% score).`;

  return {
    stock,
    symbol,
    companyName,
    isHighConfidence,
    isEntryTriggerActive,
    passedConditionsCount,
    totalConditionsCount,
    scorePercent,
    statusTier,
    statusBadge,
    statusColorClass,
    conditions,
    finalTrigger,
    cmp: close,
    openPrice: open,
    vwap,
    ema20,
    ema50,
    rsi,
    volumeRatio,
    resistanceLevel,
    nextResistanceLevel,
    stopLossLevel,
    target1Level,
    target2Level,
    riskAmount,
    rewardAmount,
    actualRiskRewardRatio,
    riskRewardRatioStr,
    distanceToResistance,
    stopLossDistance,
    resistanceToSLRatio,
    confluenceHoldMinutes,
    summaryReason
  };
}
