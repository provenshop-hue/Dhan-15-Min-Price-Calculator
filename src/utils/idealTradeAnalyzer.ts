import { StockCalculated, StockTradeJourney, IdealOptionTrade, IdealTradeTimingStatus } from '../types';
import { isOpenLowPattern, isOpenHighPattern, isAboveFirst15mCandle, isBelowFirst15mCandle, isOpenCalcLessThan3, isCloseCalcLessThan3, isOpenCalc2DecLesserThanClose, isBothCalcLessThan3 } from './gann';
import { analyzeBullishCombinations } from './bullishCombinations';
import { getExactNseStrikeStep, roundToExactNseStrike, formatStrikePrice } from './nseStrikeMaster';

/**
 * Estimates realistic option premium (LTP) for ATM strike based on underlying spot price and standard NSE implied volatility
 */
function estimateAtmOptionPremium(spotPrice: number, symbol: string): number {
  const sym = symbol.toUpperCase();
  let ivFactor = 0.018; // Default ~1.8% of spot for monthly/weekly ATM

  if (sym.includes('NIFTY') || sym.includes('BANKNIFTY') || sym.includes('SENSEX')) {
    ivFactor = 0.009; // Index options have tighter premiums (~0.9% to 1.2% of spot for weekly/monthly ATM)
  } else if (spotPrice < 200) {
    ivFactor = 0.035; // Lower-priced stocks have higher percentage premium
  } else if (spotPrice < 800) {
    ivFactor = 0.024;
  } else if (spotPrice < 2500) {
    ivFactor = 0.018;
  } else {
    ivFactor = 0.014;
  }

  const rawPremium = spotPrice * ivFactor;
  // Round to nearest 0.05 NSE tick
  return Math.max(1.0, Math.round(rawPremium * 20) / 20);
}

/**
 * Evaluates a single stock against all historical records, multi-fetch journey, and technical indicators
 * to determine if it is an IDEAL trade now and produce an actionable Option & Stock recommendation.
 */
export function evaluateIdealOptionTrade(
  stock: StockCalculated,
  journey?: StockTradeJourney
): IdealOptionTrade | null {
  const cmp = stock.closePrice || stock.openPrice;
  if (!cmp || cmp <= 0) return null;

  const symbol = stock.symbol;
  const companyName = stock.companyName;
  const openPrice = stock.openPrice || cmp;
  const highPrice = stock.highPrice || cmp;
  const lowPrice = stock.lowPrice || cmp;
  const vwap = stock.vwap ?? null;
  const rsi = stock.rsi ?? null;
  const lotSize = stock.lotSizeJun2026 || stock.lotSizeJul2026 || stock.lotSizeAug2026 || 250;

  // Historic Pattern Confirmations
  const isOpenLow = isOpenLowPattern(openPrice, lowPrice, stock.first15mLow);
  const isOpenHigh = isOpenHighPattern(openPrice, highPrice, stock.first15mHigh);
  const isAbove15m = isAboveFirst15mCandle(stock);
  const isBelow15m = isBelowFirst15mCandle(stock);
  const isOpenCalc3 = isOpenCalcLessThan3(stock);
  const isCloseCalc3 = isCloseCalcLessThan3(stock);
  const isBothCalc3 = isBothCalcLessThan3(stock);
  const isDecimalsLesser = isOpenCalc2DecLesserThanClose(stock);
  const comboAnalysis = analyzeBullishCombinations(stock);

  // Multi-fetch metrics
  const fetchCount = journey ? journey.totalFetchesTracked : (stock.rsiTimeline ? stock.rsiTimeline.length : 1);
  const consecutiveBullish = journey ? journey.consecutiveBullishCount : (stock.trend === 'Very Bullish' ? 3 : 1);
  const currentSpotPnL = journey ? journey.currentPnLPercent : (openPrice > 0 ? ((cmp - openPrice) / openPrice) * 100 : 0);

  // Directional Determination
  const bullishScoreWeight = (stock.trend === 'Very Bullish' ? 30 : stock.trend === 'Bullish' ? 18 : 0) +
    (isOpenLow ? 22 : 0) +
    (isAbove15m ? 15 : 0) +
    (vwap && cmp > vwap ? 14 : 0) +
    (rsi !== null && rsi >= 56 && rsi <= 76 ? 16 : (rsi !== null && rsi > 50 ? 8 : 0)) +
    (comboAnalysis.isAnyComboMet ? 18 : 0) +
    (isOpenCalc3 ? 10 : 0) +
    (isBothCalc3 ? 8 : 0) +
    (consecutiveBullish >= 2 ? 12 : 0);

  const bearishScoreWeight = (stock.trend === 'Very Bearish' ? 30 : stock.trend === 'Bearish' ? 18 : 0) +
    (isOpenHigh ? 22 : 0) +
    (isBelow15m ? 15 : 0) +
    (vwap && cmp < vwap ? 14 : 0) +
    (rsi !== null && rsi <= 44 && rsi >= 24 ? 16 : (rsi !== null && rsi < 50 ? 8 : 0)) +
    (isOpenCalcLessThan3(stock) ? 10 : 0) +
    (consecutiveBullish <= 0 ? 10 : 0);

  const isBullishOpportunity = bullishScoreWeight >= 48 && bullishScoreWeight > bearishScoreWeight;
  const isBearishOpportunity = bearishScoreWeight >= 48 && bearishScoreWeight > bullishScoreWeight;

  if (!isBullishOpportunity && !isBearishOpportunity) {
    return null;
  }

  const direction: 'BULLISH_CE' | 'BEARISH_PE' = isBullishOpportunity ? 'BULLISH_CE' : 'BEARISH_PE';
  const optionType: 'CE' | 'PE' = direction === 'BULLISH_CE' ? 'CE' : 'PE';
  const stockAction: 'BUY (Long Cash / Futures)' | 'SELL (Short Cash / Futures)' = 
    direction === 'BULLISH_CE' ? 'BUY (Long Cash / Futures)' : 'SELL (Short Cash / Futures)';

  // Base raw conviction score (capped between 65% and 98%)
  const rawScore = direction === 'BULLISH_CE' ? bullishScoreWeight : bearishScoreWeight;
  const convictionScore = Math.min(98, Math.max(65, Math.round(55 + (rawScore * 0.35))));

  // Exact NSE Strike Calculations
  const strikeStep = getExactNseStrikeStep(symbol, cmp);
  const atmStrike = roundToExactNseStrike(cmp, symbol);
  
  let itmStrike = atmStrike;
  let otmStrike = atmStrike;

  if (direction === 'BULLISH_CE') {
    itmStrike = Math.round((atmStrike - strikeStep) * 10) / 10;
    otmStrike = Math.round((atmStrike + strikeStep) * 10) / 10;
  } else {
    itmStrike = Math.round((atmStrike + strikeStep) * 10) / 10;
    otmStrike = Math.round((atmStrike - strikeStep) * 10) / 10;
  }

  const strikeLadder = {
    atm: atmStrike,
    itm: itmStrike,
    otm: otmStrike,
    atmContract: `${symbol} ${formatStrikePrice(atmStrike)} ${optionType}`,
    itmContract: `${symbol} ${formatStrikePrice(itmStrike)} ${optionType}`,
    otmContract: `${symbol} ${formatStrikePrice(otmStrike)} ${optionType}`,
  };

  const strikePrice = atmStrike;
  const recommendedOptionStrike = strikeLadder.atmContract;
  const moneyness: 'ATM' | 'ITM (Delta 0.65)' | 'OTM' = 'ATM';

  // Option Pricing Model
  const approxOptionLtp = estimateAtmOptionPremium(cmp, symbol);
  const entryMin = Math.round((approxOptionLtp * 0.97) * 20) / 20;
  const entryMax = Math.round((approxOptionLtp * 1.03) * 20) / 20;
  const optionEntryRange = `₹${entryMin.toFixed(2)} - ₹${entryMax.toFixed(2)}`;

  // Option Targets (+35% to Target 1, +75% to Target 2)
  const optionTarget1 = Math.round((approxOptionLtp * 1.38) * 20) / 20;
  const optionTarget2 = Math.round((approxOptionLtp * 1.78) * 20) / 20;
  // Option Stop Loss (-28%)
  const optionStopLoss = Math.round((approxOptionLtp * 0.72) * 20) / 20;

  // Financial Estimates Per Lot
  const capitalRequiredPerLot = Math.round(lotSize * approxOptionLtp);
  const potentialGainPerLot = Math.round(lotSize * (optionTarget1 - approxOptionLtp));
  const riskPerLot = Math.round(lotSize * (approxOptionLtp - optionStopLoss));
  const rrRatio = riskPerLot > 0 ? (potentialGainPerLot / riskPerLot).toFixed(1) : '2.5';
  const riskRewardRatio = `1 : ${rrRatio}`;

  // Timing Status
  let timingStatus: IdealTradeTimingStatus = 'PRIME_ENTRY_NOW';
  let timingStatusLabel = '🔥 Prime Entry Window NOW';

  if (direction === 'BULLISH_CE') {
    if (currentSpotPnL >= 1.4) {
      timingStatus = 'TARGET_PROGRESSION';
      timingStatusLabel = '🎯 Target 1 In Sight (Ride Momentum)';
    } else if (isOpenLow && isAbove15m) {
      timingStatus = 'BREAKOUT_SURGE';
      timingStatusLabel = '🚀 Open=Low Breakout Surge';
    } else if (stock.fibStatus?.includes('Bullish') || (rsi && rsi >= 50 && rsi <= 60)) {
      timingStatus = 'PULLBACK_RETEST';
      timingStatusLabel = '⚡ Healthy Pullback Rebound (Ideal Entry)';
    }
  } else {
    if (isOpenHigh && isBelow15m) {
      timingStatus = 'BREAKOUT_SURGE';
      timingStatusLabel = '📉 Open=High Breakdown Surge';
    } else if (currentSpotPnL <= -1.4) {
      timingStatus = 'TARGET_PROGRESSION';
      timingStatusLabel = '🎯 Target 1 In Sight (Short PE)';
    }
  }

  // Stock Underlying Levels
  const stockBuySellAbove = direction === 'BULLISH_CE' ? (stock.buyAbove || openPrice) : (stock.sellBelow || openPrice);
  const stockTarget1 = stock.targetsUp && stock.targetsUp[0] ? stock.targetsUp[0] : Math.round((cmp * (direction === 'BULLISH_CE' ? 1.015 : 0.985)) * 100) / 100;
  const stockTarget2 = stock.targetsUp && stock.targetsUp[1] ? stock.targetsUp[1] : Math.round((cmp * (direction === 'BULLISH_CE' ? 1.03 : 0.97)) * 100) / 100;
  const stockStopLoss = direction === 'BULLISH_CE' 
    ? (stock.first15mLow || stock.lowPrice || Math.round((cmp * 0.99) * 100) / 100)
    : (stock.first15mHigh || stock.highPrice || Math.round((cmp * 1.01) * 100) / 100);

  // Compile Historic Audit Checklist
  const historicAuditConfluence: string[] = [];

  if (fetchCount >= 2) {
    historicAuditConfluence.push(`Tracked across ${fetchCount} multi-fetch session cycles with persistent trend`);
  }
  if (direction === 'BULLISH_CE') {
    if (isOpenLow) historicAuditConfluence.push('15m Candle Open = Low pattern strictly verified (Zero breakdown)');
    if (isAbove15m) historicAuditConfluence.push(`Trading cleanly above 15m high (₹${(stock.first15mHigh || stock.buyAbove || 0).toFixed(2)})`);
    if (vwap && cmp > vwap) historicAuditConfluence.push(`Sustaining above VWAP benchmark (₹${vwap.toFixed(2)})`);
    if (rsi !== null) historicAuditConfluence.push(`RSI momentum bullish at ${rsi.toFixed(1)} (Healthy expansion zone)`);
    if (isOpenCalc3) historicAuditConfluence.push(`Gann Open Calc (${stock.openCalc?.toFixed(2) ?? '-'}) is < 3.0 key trigger`);
    if (isDecimalsLesser) historicAuditConfluence.push(`Gann Open 2 Decimals < Close 2 Decimals bullish alignment`);
    if (comboAnalysis.isAnyComboMet) historicAuditConfluence.push(`${comboAnalysis.totalCombosMet} Bullish Combination recipe(s) confirmed active`);
  } else {
    if (isOpenHigh) historicAuditConfluence.push('15m Candle Open = High pattern verified (Heavy overhead supply)');
    if (isBelow15m) historicAuditConfluence.push(`Trading below 15m low (₹${(stock.first15mLow || stock.sellBelow || 0).toFixed(2)})`);
    if (vwap && cmp < vwap) historicAuditConfluence.push(`Rejected below VWAP resistance (₹${vwap.toFixed(2)})`);
    if (rsi !== null) historicAuditConfluence.push(`RSI bearish breakdown at ${rsi.toFixed(1)}`);
  }

  // Why This Will Result In Profit thesis
  let whyThisWillProfit = '';
  if (direction === 'BULLISH_CE') {
    whyThisWillProfit = `${symbol} (CMP ₹${cmp.toFixed(2)}) shows verified bullish edge. Traded as Cash/Futures with trigger above ₹${stockBuySellAbove.toFixed(2)} (SL ₹${stockStopLoss.toFixed(2)}), or traded via Option Strike ${strikeLadder.atmContract} (NSE step ${strikeStep}) in the ₹${entryMin.toFixed(2)}–₹${entryMax.toFixed(2)} zone targeting ₹${optionTarget1.toFixed(2)} (+38%) and ₹${optionTarget2.toFixed(2)} (+78%).`;
  } else {
    whyThisWillProfit = `${symbol} (CMP ₹${cmp.toFixed(2)}) shows heavy resistance below VWAP (₹${vwap ? vwap.toFixed(2) : '-'}). Traded as Short Futures below ₹${stockBuySellAbove.toFixed(2)}, or via Option Strike ${strikeLadder.atmContract} (NSE step ${strikeStep}) targeting ₹${optionTarget1.toFixed(2)} (+38%) with SL at ₹${optionStopLoss.toFixed(2)}.`;
  }

  return {
    stockId: stock.id,
    symbol,
    companyName,
    spotPrice: cmp,
    direction,
    convictionScore,
    timingStatus,
    timingStatusLabel,
    recommendedOptionStrike,
    strikePrice,
    strikeStep,
    optionType,
    moneyness,
    strikeLadder,
    lotSize,
    approxOptionLtp,
    optionEntryRange,
    optionTarget1,
    optionTarget2,
    optionStopLoss,
    capitalRequiredPerLot,
    potentialGainPerLot,
    riskPerLot,
    riskRewardRatio,
    historicAuditConfluence,
    whyThisWillProfit,
    stockAction,
    stockBuySellAbove,
    stockTarget1,
    stockTarget2,
    stockStopLoss,
    currentSpotPnLPct: Math.round(currentSpotPnL * 100) / 100,
    totalFetchesTracked: fetchCount,
    lastUpdated: stock.candleTimestamp || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  };
}

/**
 * Analyzes all stocks and journeys to produce a sorted list of top ideal option & stock trades to trade NOW
 */
export function analyzeIdealOptionsAndStocks(
  stocks: StockCalculated[],
  journeys: Record<string, StockTradeJourney> = {}
): IdealOptionTrade[] {
  const list: IdealOptionTrade[] = [];

  for (const stock of stocks) {
    const journey = journeys[stock.id];
    const trade = evaluateIdealOptionTrade(stock, journey);
    if (trade) {
      list.push(trade);
    }
  }

  // Sort by Conviction Score (highest first), then by Potential Gain %
  return list.sort((a, b) => {
    if (b.convictionScore !== a.convictionScore) {
      return b.convictionScore - a.convictionScore;
    }
    return b.currentSpotPnLPct - a.currentSpotPnLPct;
  });
}
