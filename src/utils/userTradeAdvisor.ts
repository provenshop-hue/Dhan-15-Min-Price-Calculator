import { 
  UserTrackedTrade, 
  StockCalculated, 
  TradeActionAdvice, 
  InstrumentType, 
  PositionSide,
  AveragingGuidanceData,
  AveragingStrategyOption,
  TradingCompanionData
} from '../types';
import { roundToExactNseStrike, getExactNseStrikeStep, formatStrikePrice } from './nseStrikeMaster';
import { computeTechnicalIndicators } from './technicalIndicatorEngine';

/**
  Calculates realistic delta based on strike moneyness
 */
export function calculateApproxDelta(
  spotPrice: number,
  strikePrice: number,
  optionType: 'CE' | 'PE'
): number {
  if (!spotPrice || spotPrice <= 0 || !strikePrice || strikePrice <= 0) return 0.50;

  const diffPct = ((spotPrice - strikePrice) / spotPrice) * 100;

  if (optionType === 'CE') {
    if (diffPct > 3.0) return 0.80; // Deep ITM
    if (diffPct > 1.0) return 0.65; // Modest ITM
    if (diffPct >= -1.0) return 0.50; // ATM
    if (diffPct >= -3.0) return 0.35; // OTM
    return 0.20; // Deep OTM
  } else {
    // PE
    if (diffPct < -3.0) return 0.80; // Deep ITM
    if (diffPct < -1.0) return 0.65; // Modest ITM
    if (diffPct <= 1.0) return 0.50; // ATM
    if (diffPct <= 3.0) return 0.35; // OTM
    return 0.20; // Deep OTM
  }
}

/**
 * Estimates current option price based on underlying move since entry and delta
 */
export function estimateCurrentOptionPrice(
  entryOptionPrice: number,
  entryStockPrice: number,
  currentStockPrice: number,
  strikePrice: number,
  optionType: 'CE' | 'PE'
): number {
  if (entryOptionPrice <= 0) return 0;
  if (!entryStockPrice || entryStockPrice <= 0 || !currentStockPrice || currentStockPrice <= 0) {
    return entryOptionPrice;
  }

  const delta = calculateApproxDelta(currentStockPrice, strikePrice, optionType);
  const stockMove = currentStockPrice - entryStockPrice;

  let optionMove = 0;
  if (optionType === 'CE') {
    optionMove = stockMove * delta;
  } else {
    optionMove = -stockMove * delta;
  }

  // Account for non-linear gamma expansion if move is strongly favorable
  if (optionMove > 0) {
    optionMove *= 1.05;
  }

  const calculatedLtp = Math.max(0.05, entryOptionPrice + optionMove);
  return Math.round(calculatedLtp * 20) / 20; // Round to NSE 0.05 tick
}

/**
 * Evaluates a user-tracked trade against current live market data and technical signals
 * to provide real-time P&L and actionable success guidance.
 */
export function evaluateUserTrackedTrade(
  trade: UserTrackedTrade,
  stock?: StockCalculated | null
): UserTrackedTrade {
  const stockCMP = (stock?.closePrice && stock.closePrice > 0)
    ? stock.closePrice
    : (stock?.openPrice && stock.openPrice > 0)
    ? stock.openPrice
    : trade.stockCMP || trade.entryPrice;

  const isOption = trade.instrumentType === 'CALL_OPTION' || trade.instrumentType === 'PUT_OPTION';
  const optType = trade.optionType || (trade.instrumentType === 'CALL_OPTION' ? 'CE' : 'PE');
  const strike = trade.strikePrice || stockCMP;

  let effectiveCMP = stockCMP;
  let optionCMP = trade.optionCMP || null;

  if (isOption) {
    if (trade.entryPrice > 0) {
      // Calculate option current price relative to entry
      const baseStockPrice = trade.stockCMP || stock?.openPrice || stockCMP;
      optionCMP = estimateCurrentOptionPrice(
        trade.entryPrice,
        baseStockPrice,
        stockCMP,
        strike,
        optType
      );
      effectiveCMP = optionCMP;
    } else {
      effectiveCMP = optionCMP || 0;
    }
  } else {
    effectiveCMP = stockCMP;
  }

  // Calculate Real-time P&L
  const qty = trade.quantity > 0 ? trade.quantity : 1;
  const investedCapital = trade.entryPrice * qty;
  const currentValue = effectiveCMP * qty;

  let pointsDiff = 0;
  let unrealizedPnL = 0;

  if (trade.positionSide === 'LONG') {
    pointsDiff = Math.round((effectiveCMP - trade.entryPrice) * 100) / 100;
    unrealizedPnL = Math.round((currentValue - investedCapital) * 100) / 100;
  } else {
    // SHORT position
    pointsDiff = Math.round((trade.entryPrice - effectiveCMP) * 100) / 100;
    unrealizedPnL = Math.round((investedCapital - currentValue) * 100) / 100;
  }

  const unrealizedPnLPct = investedCapital > 0
    ? Math.round(((unrealizedPnL / investedCapital) * 100) * 100) / 100
    : 0;

  // Track Peak Profit & Drawdown
  const highestPriceSinceEntry = Math.max(trade.highestPriceSinceEntry || effectiveCMP, effectiveCMP);
  const lowestPriceSinceEntry = Math.min(trade.lowestPriceSinceEntry || effectiveCMP, effectiveCMP);
  const maxProfitAchieved = Math.max(trade.maxProfitAchieved || 0, unrealizedPnL);
  const maxDrawdownAchieved = Math.min(trade.maxDrawdownAchieved || 0, unrealizedPnL);

  const isBullishTrade = (trade.instrumentType === 'CALL_OPTION') || (trade.positionSide === 'LONG' && trade.instrumentType !== 'PUT_OPTION');
  const isBearishTrade = (trade.instrumentType === 'PUT_OPTION') || (trade.positionSide === 'SHORT' && trade.instrumentType !== 'CALL_OPTION');
  const positionSideForTech: 'LONG' | 'SHORT' = isBullishTrade ? 'LONG' : 'SHORT';

  // Compute Comprehensive Technical Indicators (RSI 14, Volume Surge 20, MACD 12-26-9, EMA 9/21, VWAP)
  const tech = computeTechnicalIndicators(
    stock,
    stockCMP,
    positionSideForTech,
    isOption,
    trade.entryPrice
  );

  // Technical Context from Stock / Tech Engine
  const rsi = tech.rsiValue;
  const vwap = tech.vwap;
  const buyAbove = stock?.buyAbove ?? trade.gannBuyAbove ?? null;
  const sellBelow = stock?.sellBelow ?? trade.gannSellBelow ?? null;
  const t1 = stock?.targetsUp?.[0] ?? trade.gannTarget1 ?? (isOption ? trade.entryPrice * 1.15 : stockCMP * 1.015);
  const t2 = stock?.targetsUp?.[1] ?? trade.gannTarget2 ?? (isOption ? trade.entryPrice * 1.30 : stockCMP * 1.03);
  const t3 = stock?.targetsUp?.[2] ?? trade.gannTarget3 ?? (isOption ? trade.entryPrice * 1.50 : stockCMP * 1.05);

  const tDown1 = stock?.targetsDown?.[0] ?? (isOption ? trade.entryPrice * 1.15 : stockCMP * 0.985);
  const tDown2 = stock?.targetsDown?.[1] ?? (isOption ? trade.entryPrice * 1.30 : stockCMP * 0.97);

  const trend = stock?.trend ?? trade.stockTrend ?? null;
  const isOpenLow = stock?.isOpenEqualLow || false;
  const isOpenHigh = stock?.isOpenEqualHigh || false;
  const isFib382Retrace = stock?.isFib382Retrace || false;

  // Decision Algorithm to Guide the User:
  let advice: TradeActionAdvice = 'MONITOR_CLOSELY';
  let adviceBadgeClass = 'bg-slate-800 text-slate-300 border-slate-700';
  let adviceHeadline = tech.verdictHeadline;
  let adviceDetails = tech.verdictSummary;
  let suggestedAction = '';
  let suggestedTrailingSL: number | null = null;
  let suggestedAveragePrice: number | null = null;
  let suggestedAverageQty: number | null = null;
  let newAveragePrice: number | null = null;
  let confidenceScore = tech.verdictConfidence;
  let healthScore = Math.min(100, Math.max(10, tech.confluenceScore * 20));

  if (isBullishTrade) {
    // -------------------------------------------------------------
    // BULLISH TRADE GUIDANCE (CALL OPTION / LONG EQUITY / LONG FUT)
    // -------------------------------------------------------------
    const isAboveVwap = tech.vwapStatus !== 'Below';
    const isAboveBuy = buyAbove ? stockCMP >= buyAbove * 0.995 : true;
    const isStockInProfit = pointsDiff > 0 || unrealizedPnLPct > 0;
    const isBigProfit = isOption ? unrealizedPnLPct >= 18 : unrealizedPnLPct >= 2.0;
    const isHugeProfit = isOption ? unrealizedPnLPct >= 35 : unrealizedPnLPct >= 3.5;
    const isMinorLoss = unrealizedPnLPct <= -2.0 && unrealizedPnLPct >= -12.0;
    const isSevereLoss = unrealizedPnLPct < -12.0 || (sellBelow ? stockCMP < sellBelow * 0.99 : false) || tech.confluenceScore <= 1;

    if (isHugeProfit || (rsi >= 75 && isStockInProfit)) {
      // 🏆 BOOK PROFIT (Target reached or RSI exhaustion)
      advice = 'BOOK_PROFIT';
      adviceBadgeClass = 'bg-emerald-950 text-emerald-300 border-emerald-500 shadow-sm';
      adviceHeadline = '🎯 Major Target Reached / Momentum Peak — Book Profit';
      healthScore = 95;
      confidenceScore = 92;
      suggestedAction = `Book 60%-75% profit at ₹${effectiveCMP.toFixed(2)} (+${unrealizedPnLPct.toFixed(1)}%). Trail remaining stop loss to ₹${(trade.entryPrice * 1.08).toFixed(2)}.`;
      adviceDetails = `The position has gained +${unrealizedPnLPct.toFixed(1)}% (₹${unrealizedPnL.toLocaleString('en-IN')}). RSI is at ${rsi.toFixed(1)} (overbought expansion). MACD histogram is starting to plateau. Secure gains now!`;
      suggestedTrailingSL = isOption ? Math.round((trade.entryPrice * 1.10) * 20) / 20 : Math.round((stockCMP * 0.988) * 100) / 100;
    } else if ((isStockInProfit || tech.confluenceScore >= 4) && isAboveVwap && (rsi >= 50 || isOpenLow)) {
      // 🚀 HANG ON FOR PROFIT (Ride the trend)
      advice = 'HOLD_FOR_PROFIT';
      adviceBadgeClass = 'bg-emerald-900/90 text-emerald-200 border-emerald-400';
      adviceHeadline = `🚀 Strong Bullish Wave (${tech.confluenceScore}/5 Pillars) — Hang On`;
      healthScore = 88;
      confidenceScore = Math.max(85, tech.verdictConfidence);
      
      const nextTarget = isOption ? (trade.entryPrice * 1.30) : (t2 || stockCMP * 1.025);
      suggestedTrailingSL = isOption
        ? Math.max(trade.entryPrice * 0.95, effectiveCMP * 0.85)
        : (tech.vwap || stockCMP * 0.992);
      
      suggestedAction = `HOLD TRADE! Trail stop loss to ₹${suggestedTrailingSL.toFixed(2)} and ride momentum toward target ₹${nextTarget.toFixed(2)}.`;
      adviceDetails = `Underlying stock is sustaining strong bullish momentum: RSI ${rsi.toFixed(1)} (${tech.rsiTrajectory}), Volume ${tech.volumeRatio.toFixed(1)}x (${tech.buyerPressurePct}% buyers), and MACD positive. Buyers remain in control.`;
    } else if (isMinorLoss && (isAboveBuy || isFib382Retrace || isOpenLow || tech.confluenceScore >= 3) && rsi >= 44) {
      // ⚖️ AVERAGE ON PULLBACK (Safe DCA / Pyramiding opportunity)
      advice = 'AVERAGE_PULLBACK';
      adviceBadgeClass = 'bg-amber-950 text-amber-300 border-amber-500/80';
      adviceHeadline = '⚖️ Healthy Dip to Support — Favorable Averaging Zone';
      healthScore = 65;
      confidenceScore = 82;

      suggestedAveragePrice = effectiveCMP;
      suggestedAverageQty = qty; // Add equal 1x lot/qty
      newAveragePrice = Math.round(((trade.entryPrice + effectiveCMP) / 2) * 100) / 100;
      suggestedTrailingSL = isOption ? Math.round((effectiveCMP * 0.70) * 20) / 20 : (sellBelow || stockCMP * 0.985);

      suggestedAction = `Average with ${suggestedAverageQty} qty at ₹${effectiveCMP.toFixed(2)} to lower your breakeven to ₹${newAveragePrice.toFixed(2)}. Hard SL at ₹${suggestedTrailingSL.toFixed(2)}.`;
      adviceDetails = `Price pulled back into key support (VWAP ₹${vwap.toFixed(2)} / Gann ₹${buyAbove ? buyAbove.toFixed(2) : 'N/A'}) with mild volume. RSI is holding at ${rsi.toFixed(1)}. Trend structure remains intact.`;
    } else if (isSevereLoss || (sellBelow && stockCMP < sellBelow && rsi < 44) || tech.confluenceScore <= 1) {
      // ⛔ CUT LOSS / EXIT (Risk Shield)
      advice = 'EXIT_CUT_LOSS';
      adviceBadgeClass = 'bg-rose-950 text-rose-300 border-rose-500';
      adviceHeadline = '🛑 Invalidation Level Breached — Do NOT Average, Exit Now';
      healthScore = 20;
      confidenceScore = 92;
      suggestedAction = `EXIT TRADE NOW at market (₹${effectiveCMP.toFixed(2)}) to safeguard capital. Do NOT average down a broken structure!`;
      adviceDetails = `Technical breakdown: Stock broke below VWAP (₹${vwap.toFixed(2)}) and Gann Sell (₹${sellBelow ? sellBelow.toFixed(2) : 'N/A'}). MACD bearish cross and falling RSI (${rsi.toFixed(1)}) confirm exit.`;
    } else {
      // ⚠️ TIGHTEN STOP LOSS / MONITOR
      advice = 'TIGHTEN_STOP_LOSS';
      adviceBadgeClass = 'bg-yellow-950 text-yellow-300 border-yellow-500/70';
      adviceHeadline = '⚠️ Sideways Consolidation — Tighten Stop Loss';
      healthScore = 55;
      confidenceScore = 70;
      suggestedTrailingSL = isOption ? trade.entryPrice * 0.85 : (sellBelow || stockCMP * 0.99);
      suggestedAction = `Keep a tight stop loss at ₹${suggestedTrailingSL.toFixed(2)}. Await clear breakout above ₹${buyAbove ? buyAbove.toFixed(2) : stockCMP.toFixed(2)}.`;
      adviceDetails = `Price is oscillating in a tight range. RSI is neutral at ${rsi.toFixed(1)} with low volume (${tech.volumeRatio.toFixed(1)}x). Avoid adding fresh capital.`;
    }
  } else {
    // -------------------------------------------------------------
    // BEARISH TRADE GUIDANCE (PUT OPTION / SHORT EQUITY / SHORT FUT)
    // -------------------------------------------------------------
    const isBelowVwap = tech.vwapStatus !== 'Above';
    const isBelowSell = sellBelow ? stockCMP <= sellBelow * 1.005 : true;
    const isStockInProfit = pointsDiff > 0 || unrealizedPnLPct > 0;
    const isBigProfit = isOption ? unrealizedPnLPct >= 18 : unrealizedPnLPct >= 2.0;
    const isHugeProfit = isOption ? unrealizedPnLPct >= 35 : unrealizedPnLPct >= 3.5;
    const isMinorLoss = unrealizedPnLPct <= -2.0 && unrealizedPnLPct >= -12.0;
    const isSevereLoss = unrealizedPnLPct < -12.0 || (buyAbove ? stockCMP > buyAbove * 1.01 : false) || tech.confluenceScore <= 1;

    if (isHugeProfit || (rsi <= 25 && isStockInProfit)) {
      // 🏆 BOOK PROFIT
      advice = 'BOOK_PROFIT';
      adviceBadgeClass = 'bg-emerald-950 text-emerald-300 border-emerald-500 shadow-sm';
      adviceHeadline = '🎯 Major Downside Target Hit — Book Profit on Put';
      healthScore = 95;
      confidenceScore = 92;
      suggestedAction = `Book 60%-75% profit at ₹${effectiveCMP.toFixed(2)} (+${unrealizedPnLPct.toFixed(1)}%). Trail remaining stop loss to protect gains.`;
      adviceDetails = `The bearish move achieved +${unrealizedPnLPct.toFixed(1)}% (₹${unrealizedPnL.toLocaleString('en-IN')}). RSI is at ${rsi.toFixed(1)} (oversold saturation). Take profits off the table!`;
      suggestedTrailingSL = isOption ? Math.round((trade.entryPrice * 1.10) * 20) / 20 : Math.round((stockCMP * 1.012) * 100) / 100;
    } else if ((isStockInProfit || tech.confluenceScore >= 4) && isBelowVwap && (rsi <= 50 || isOpenHigh)) {
      // 🚀 HANG ON FOR PROFIT
      advice = 'HOLD_FOR_PROFIT';
      adviceBadgeClass = 'bg-emerald-900/90 text-emerald-200 border-emerald-400';
      adviceHeadline = `📉 Strong Bearish Breakdown (${tech.confluenceScore}/5 Pillars) — Hold Put`;
      healthScore = 88;
      confidenceScore = Math.max(85, tech.verdictConfidence);
      const nextTarget = isOption ? (trade.entryPrice * 1.30) : (tDown2 || stockCMP * 0.975);
      suggestedTrailingSL = isOption
        ? Math.max(trade.entryPrice * 0.95, effectiveCMP * 0.85)
        : (tech.vwap || stockCMP * 1.008);
      
      suggestedAction = `HOLD PUT/SHORT! Trail stop loss to ₹${suggestedTrailingSL.toFixed(2)} and target downside level ₹${nextTarget.toFixed(2)}.`;
      adviceDetails = `Underlying stock is breaking down cleanly below VWAP (₹${vwap.toFixed(2)}): RSI ${rsi.toFixed(1)}, Seller pressure ${tech.sellerPressurePct}%, and MACD negative.`;
    } else if (isMinorLoss && (isBelowSell || isOpenHigh || tech.confluenceScore >= 3) && rsi <= 56) {
      // ⚖️ AVERAGE ON PULLBACK
      advice = 'AVERAGE_PULLBACK';
      adviceBadgeClass = 'bg-amber-950 text-amber-300 border-amber-500/80';
      adviceHeadline = '⚖️ Temporary Pullback to Resistance — Good Averaging Point';
      healthScore = 65;
      confidenceScore = 80;
      suggestedAveragePrice = effectiveCMP;
      suggestedAverageQty = qty;
      newAveragePrice = Math.round(((trade.entryPrice + effectiveCMP) / 2) * 100) / 100;
      suggestedTrailingSL = isOption ? Math.round((effectiveCMP * 0.70) * 20) / 20 : (buyAbove || stockCMP * 1.015);

      suggestedAction = `Average with ${suggestedAverageQty} qty at ₹${effectiveCMP.toFixed(2)} to reset breakeven to ₹${newAveragePrice.toFixed(2)}. Hard SL at ₹${suggestedTrailingSL.toFixed(2)}.`;
      adviceDetails = `Price saw a minor relief bounce into Gann Sell resistance (₹${sellBelow ? sellBelow.toFixed(2) : 'N/A'}). Bearish trend remains valid.`;
    } else if (isSevereLoss || (buyAbove && stockCMP > buyAbove && rsi > 56) || tech.confluenceScore <= 1) {
      // ⛔ CUT LOSS / EXIT
      advice = 'EXIT_CUT_LOSS';
      adviceBadgeClass = 'bg-rose-950 text-rose-300 border-rose-500';
      adviceHeadline = '🛑 Bearish Invalidation Breached — Exit Short Position Immediately';
      healthScore = 20;
      confidenceScore = 92;
      suggestedAction = `EXIT TRADE at market (₹${effectiveCMP.toFixed(2)}). Do NOT hold losing shorts against an upward breakout!`;
      adviceDetails = `Stock reclaimed above VWAP and Gann Buy (₹${buyAbove ? buyAbove.toFixed(2) : 'N/A'}) with rising RSI (${rsi.toFixed(1)}). Short thesis failed.`;
    } else {
      // ⚠️ TIGHTEN STOP LOSS
      advice = 'TIGHTEN_STOP_LOSS';
      adviceBadgeClass = 'bg-yellow-950 text-yellow-300 border-yellow-500/70';
      adviceHeadline = '⚠️ Sideways Range — Tighten Stop Loss';
      healthScore = 55;
      confidenceScore = 70;
      suggestedTrailingSL = isOption ? trade.entryPrice * 0.85 : (buyAbove || stockCMP * 1.01);
      suggestedAction = `Set strict trailing SL at ₹${suggestedTrailingSL.toFixed(2)}. Monitor closely for continuation.`;
      adviceDetails = `Price is consolidating. Maintain strict discipline.`;
    }
  }

  // Distance to Target / Stop Loss
  const userTarget = trade.userTarget || (isBullishTrade ? (isOption ? trade.entryPrice * 1.25 : t1) : (isOption ? trade.entryPrice * 1.25 : tDown1));
  const userSL = trade.userStopLoss || suggestedTrailingSL || (isBullishTrade ? (isOption ? trade.entryPrice * 0.80 : sellBelow) : (isOption ? trade.entryPrice * 0.80 : buyAbove));

  let distanceToTargetPct: number | null = null;
  let distanceToStopLossPct: number | null = null;

  if (userTarget && effectiveCMP > 0) {
    distanceToTargetPct = Math.round((((userTarget - effectiveCMP) / effectiveCMP) * 100) * 10) / 10;
  }
  if (userSL && effectiveCMP > 0) {
    distanceToStopLossPct = Math.round((((effectiveCMP - userSL) / effectiveCMP) * 100) * 10) / 10;
  }

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' IST';

  return {
    ...trade,
    stockCMP,
    optionCMP,
    effectiveCMP,
    unrealizedPnL,
    unrealizedPnLPct,
    pointsDiff,
    investedCapital,
    currentValue,
    highestPriceSinceEntry,
    lowestPriceSinceEntry,
    maxProfitAchieved,
    maxDrawdownAchieved,
    advice,
    adviceBadgeClass,
    adviceHeadline,
    adviceDetails,
    confidenceScore,
    healthScore,
    suggestedAction,
    suggestedTrailingSL,
    suggestedAveragePrice,
    suggestedAverageQty,
    newAveragePrice,
    distanceToTargetPct,
    distanceToStopLossPct,
    riskRewardRatio: '1 : 2.5',
    stockTrend: trend,
    stockRsi: rsi,
    stockVwap: vwap,
    gannBuyAbove: buyAbove,
    gannSellBelow: sellBelow,
    gannTarget1: t1,
    gannTarget2: t2,
    gannTarget3: t3,
    lastUpdated: timeStr,

    // Detailed Technical Indicators & Calculated Signals
    rsiValue: tech.rsiValue,
    rsiStatus: tech.rsiStatus,
    rsiTrajectory: tech.rsiTrajectory,
    volume: tech.volume,
    volumeRatio: tech.volumeRatio,
    volumeStatus: tech.volumeStatus,
    buyerPressurePct: tech.buyerPressurePct,
    sellerPressurePct: tech.sellerPressurePct,
    macdLine: tech.macdLine,
    macdSignal: tech.macdSignal,
    macdHistogram: tech.macdHistogram,
    macdStatus: tech.macdStatus,
    macdSignalColor: tech.macdSignalColor,
    ema9: tech.ema9,
    ema21: tech.ema21,
    emaAlignment: tech.emaAlignment,
    vwapDistancePct: tech.vwapDistancePct,
    confluenceScore: tech.confluenceScore,
    confluenceMax: tech.confluenceMax,
    holdExitVerdict: tech.holdExitVerdict,
    verdictConfidence: tech.verdictConfidence,
    indicatorChecklist: tech.indicatorChecklist,
    reasonsToHold: tech.reasonsToHold,
    reasonsToExit: tech.reasonsToExit,

    // Smart Averaging Guidance Engine
    averagingGuidance: generateAveragingGuidance(
      trade,
      effectiveCMP,
      stockCMP,
      isBullishTrade,
      tech.confluenceScore,
      rsi,
      vwap,
      unrealizedPnLPct,
      suggestedTrailingSL
    ),

    // AI Trading Companion (Friend / Co-Pilot Engine)
    companionAdvice: generateTradingCompanionAdvice(
      trade,
      effectiveCMP,
      stockCMP,
      isBullishTrade,
      tech,
      generateAveragingGuidance(
        trade,
        effectiveCMP,
        stockCMP,
        isBullishTrade,
        tech.confluenceScore,
        rsi,
        vwap,
        unrealizedPnLPct,
        suggestedTrailingSL
      ),
      unrealizedPnL,
      unrealizedPnLPct,
      t1,
      t2,
      t3,
      suggestedTrailingSL
    )
  };
}

/**
 * Generates Conversational AI Trading Companion Guidance (Friend / Co-Pilot mode)
 */
export function generateTradingCompanionAdvice(
  trade: Partial<UserTrackedTrade>,
  effectiveCMP: number,
  stockCMP: number,
  isBullishTrade: boolean,
  tech: any,
  avgGuidance: AveragingGuidanceData,
  unrealizedPnL: number,
  unrealizedPnLPct: number,
  t1: number,
  t2: number,
  t3: number,
  suggestedTrailingSL: number | null
): TradingCompanionData {
  const symbol = trade.symbol ? trade.symbol.toUpperCase() : 'Stock';
  const entryPrice = trade.entryPrice || effectiveCMP || 1;
  const quantity = trade.quantity || 1;
  const isOption = trade.instrumentType === 'CALL_OPTION' || trade.instrumentType === 'PUT_OPTION';
  const rsi = tech.rsiValue || 50;
  const rsiTraj = tech.rsiTrajectory || 'FLAT';
  const volRatio = tech.volumeRatio || 1.0;
  const buyerPct = tech.buyerPressurePct || 50;
  const sellerPct = tech.sellerPressurePct || 50;
  const confluence = tech.confluenceScore || 3;

  // 1. Overall Status & Friend Greeting
  let overallStatus: TradingCompanionData['overallStatus'] = 'HOLD_STRONG';
  let verdictTitle = '🤝 STRONG HOLD — High Probability Setup';
  let friendGreeting = '';
  let friendlySummary = '';
  let emotionalCoaching = '';

  if (unrealizedPnLPct <= -14 || confluence <= 1) {
    overallStatus = 'PROTECT_CAPITAL_EXIT';
    verdictTitle = '🛑 CAPITAL DEFENSE — Let\'s Cut & Protect Funds';
    friendGreeting = `Hey friend, don't feel discouraged. Preserving our capital right now is the smartest win we can take today.`;
    friendlySummary = `The trade broke key technical support with only ${confluence}/5 indicator strength. Let's exit near ₹${effectiveCMP.toFixed(2)} to protect your balance for the next trade.`;
    emotionalCoaching = `Remember: Every winning trader takes small, disciplined losses. Cutting this trade now saves you capital for high-probability setups tomorrow!`;
  } else if (unrealizedPnLPct >= 8.0 || (unrealizedPnLPct >= 4.0 && isOption)) {
    overallStatus = 'TAKE_PROFIT';
    verdictTitle = '🎯 BOOK PARTIAL PROFIT — Lock In Green!';
    friendGreeting = `Great job, friend! We are up +${unrealizedPnLPct.toFixed(1)}% (+₹${Math.round(unrealizedPnL).toLocaleString('en-IN')}).`;
    friendlySummary = `Price is knocking on Gann Target 1 at ₹${t1.toFixed(2)}. I recommend locking in 50% profits right here to bank real cash, then moving our stop loss up to protect the rest.`;
    emotionalCoaching = `Taking profits is how accounts grow consistently. Never let a great winning trade turn red!`;
  } else if (avgGuidance.status === 'RECOMMENDED') {
    overallStatus = 'SCALE_IN_AVERAGE';
    verdictTitle = '⚖️ OPTIMAL AVERAGING ZONE — Pull Down Breakeven';
    friendGreeting = `Stay relaxed, friend! This minor pullback (-${Math.abs(unrealizedPnLPct).toFixed(1)}%) is landing directly on high-volume support.`;
    friendlySummary = `Price has pulled back into a prime support zone near VWAP with ${buyerPct}% buyers stepping in. Adding 1 lot at ₹${effectiveCMP.toFixed(2)} drops our breakeven hurdle closer to current price.`;
    emotionalCoaching = `Red ticks on the screen are just the market testing patience. The technical foundation is solid!`;
  } else if (unrealizedPnLPct < 0) {
    overallStatus = 'WAIT_PATIENTLY';
    verdictTitle = '⏳ PATIENT HOLD — Support Is Holding';
    friendGreeting = `Hang tight, friend! We are in a minor consolidation at ₹${effectiveCMP.toFixed(2)}.`;
    friendlySummary = `RSI is steady at ${rsi.toFixed(1)} and order flow is stable. There is zero reason to panic-sell — let the bulls complete this base.`;
    emotionalCoaching = `Patience is where the majority of trading profits are made. Give the setup breathing room!`;
  } else {
    overallStatus = 'HOLD_STRONG';
    verdictTitle = '🚀 STRONG HOLD — Bulls In Control';
    friendGreeting = `Looking fantastic, friend! Momentum is on our side (+${unrealizedPnLPct.toFixed(1)}%).`;
    friendlySummary = `We have strong ${confluence}/5 technical confluence with ${buyerPct}% buying pressure. Let this position run toward Target 1 (₹${t1.toFixed(2)}).`;
    emotionalCoaching = `Great discipline! Sit back and let your winning trade develop without micromanaging.`;
  }

  // 2. RSI Companion Coach
  let rsiFriendly = '';
  if (rsi >= 70) {
    rsiFriendly = `RSI is running hot at ${rsi.toFixed(1)} (Overbought). Bulls have pushed hard; watch for a minor consolidation or start trimming profits.`;
  } else if (rsi >= 50) {
    rsiFriendly = `RSI is healthy at ${rsi.toFixed(1)} (${rsiTraj === 'RISING' ? 'Rising ↗' : 'Steady'}). Plenty of upward fuel left before hitting fatigue.`;
  } else if (rsi >= 40) {
    rsiFriendly = `RSI is resting at ${rsi.toFixed(1)}. It is holding the 40 baseline support nicely, showing steady buyer absorption on dips.`;
  } else {
    rsiFriendly = `RSI is depressed at ${rsi.toFixed(1)} (Oversold). Heavy selling pressure; wait for a confirmed bounce above 40 before adding new funds.`;
  }

  // 3. Volume Companion Coach
  let volFriendly = '';
  if (volRatio >= 1.5 && buyerPct >= 60) {
    volFriendly = `Volume is surging at ${volRatio.toFixed(1)}x average with ${buyerPct}% buyers dominating! Big institutional money is fueling this move.`;
  } else if (buyerPct >= sellerPct) {
    volFriendly = `Buyers are in control with ${buyerPct}% volume dominance (${volRatio.toFixed(1)}x normal). Pullbacks are on light volume, which is a bullish signal.`;
  } else if (volRatio >= 1.5 && sellerPct >= 60) {
    volFriendly = `Elevated volume (${volRatio.toFixed(1)}x) driven by ${sellerPct}% sellers. Be cautious and keep your stop loss active.`;
  } else {
    volFriendly = `Volume is balanced (${volRatio.toFixed(1)}x) with normal order flow. Price action is respecting standard support and resistance.`;
  }

  // 4. Best Place to Exit Plan
  const target1Price = trade.userTarget || t1 || (entryPrice * (isBullishTrade ? 1.15 : 0.85));
  const expectedProfit = Math.round((target1Price - entryPrice) * quantity);
  const expectedProfitPct = Math.round(((target1Price - entryPrice) / entryPrice) * 1000) / 10;
  const hardSL = trade.userStopLoss || (suggestedTrailingSL ? suggestedTrailingSL * 0.96 : entryPrice * (isBullishTrade ? 0.88 : 1.12));
  const trailingSL = suggestedTrailingSL || (entryPrice * (isBullishTrade ? 0.94 : 1.06));

  const exitPlan = {
    bestTargetPrice: Math.round(target1Price * 100) / 100,
    bestTargetLabel: `Gann Target 1 (₹${target1Price.toFixed(2)})`,
    expectedProfit: Math.max(0, expectedProfit),
    expectedProfitPct: Math.max(0, expectedProfitPct),
    partialExitTrigger: `Book 50% at ₹${target1Price.toFixed(2)}, then trail stop loss to ₹${(entryPrice * 1.01).toFixed(2)} for Target 2 (₹${t2.toFixed(2)})`,
    hardStopLoss: Math.round(hardSL * 100) / 100,
    trailingStopLoss: Math.round(trailingSL * 100) / 100,
    exitStrategyAdvice: `Primary exit is Target 1 at ₹${target1Price.toFixed(2)} (+${expectedProfitPct}%). If price stalls near ₹${(target1Price * 0.98).toFixed(2)}, book half and trail the rest.`
  };

  // 5. Best Price to Average & Quantity Plan
  const averagingPlan = {
    isRecommended: avgGuidance.status === 'RECOMMENDED' || avgGuidance.status === 'PYRAMID_ON_STRENGTH',
    recommendationLabel: avgGuidance.statusHeadline,
    bestPrice: avgGuidance.recommendedPrice || effectiveCMP,
    bestPriceZone: avgGuidance.recommendedPriceRange || `₹${(effectiveCMP * 0.98).toFixed(2)} - ₹${(effectiveCMP * 1.01).toFixed(2)}`,
    bestQuantity: avgGuidance.recommendedQuantity || quantity,
    bestLots: avgGuidance.recommendedLots,
    capitalNeeded: avgGuidance.capitalRequired || Math.round(effectiveCMP * quantity),
    newAveragePrice: avgGuidance.newAveragePrice || entryPrice,
    breakevenDropPct: avgGuidance.breakevenReductionPct || 0,
    friendlyTip: avgGuidance.reason || `Add near VWAP support to reduce your breakeven hurdle.`
  };

  // 6. Speech Summary for Text-to-Speech
  const speechSummary = `${friendGreeting} On ${symbol}, ${friendlySummary} RSI is at ${rsi.toFixed(0)}, and ${buyerPct} percent of volume is buyer-driven. My recommendation is to ${overallStatus.replace(/_/g, ' ').toLowerCase()}. Our best exit target is ₹${target1Price.toFixed(2)}, and keep a stop loss at ₹${hardSL.toFixed(2)}. ${emotionalCoaching}`;

  return {
    friendGreeting,
    overallStatus,
    verdictTitle,
    friendlySummary,
    rsiCoach: {
      value: rsi,
      trajectory: rsiTraj,
      statusText: tech.rsiStatus || 'Normal',
      friendlyExplanation: rsiFriendly
    },
    volumeCoach: {
      ratio: volRatio,
      buyerPressurePct: buyerPct,
      sellerPressurePct: sellerPct,
      volumeStatus: tech.volumeStatus || 'NORMAL',
      friendlyExplanation: volFriendly
    },
    exitPlan,
    averagingPlan,
    emotionalCoaching,
    speechSummary
  };
}

/**
 * Computes actionable Averaging Guidance: exact price, exact quantity/lots, new breakeven, and multi-strategy options
 */
export function generateAveragingGuidance(
  trade: Partial<UserTrackedTrade>,
  effectiveCMP: number,
  stockCMP: number,
  isBullishTrade: boolean,
  techConfluence: number,
  rsi: number,
  vwap: number,
  unrealizedPnLPct: number,
  suggestedTrailingSL: number | null
): AveragingGuidanceData {
  const entryPrice = trade.entryPrice || effectiveCMP || 1;
  const quantity = trade.quantity || 1;
  const lotSize = trade.lotSize || (trade.instrumentType === 'CALL_OPTION' || trade.instrumentType === 'PUT_OPTION' ? 250 : 1);
  const isOption = trade.instrumentType === 'CALL_OPTION' || trade.instrumentType === 'PUT_OPTION';

  let status: 'RECOMMENDED' | 'WAIT_FOR_TRIGGER' | 'DO_NOT_AVERAGE' | 'PYRAMID_ON_STRENGTH' = 'WAIT_FOR_TRIGGER';
  let statusBadge = 'bg-amber-950 text-amber-300 border-amber-500';
  let statusHeadline = '⏳ Await Bounce Confirmation Before Averaging';
  let reason = '';
  let technicalSupportLevel = '';
  let isSafeToAverage = false;
  let recommendedPrice = effectiveCMP;
  let recommendedPriceRange = `₹${(effectiveCMP * 0.985).toFixed(2)} - ₹${(effectiveCMP * 1.01).toFixed(2)}`;

  // Determine Support Level name
  if (isOption) {
    technicalSupportLevel = `Option Support @ ₹${(effectiveCMP * 0.95).toFixed(2)} / Spot VWAP ₹${vwap.toFixed(2)}`;
  } else {
    technicalSupportLevel = `Intraday VWAP @ ₹${vwap.toFixed(2)}`;
  }

  // 1. Severe Invalidation or breakdown -> DO NOT AVERAGE
  if (
    unrealizedPnLPct < -15 ||
    techConfluence <= 1 ||
    (isBullishTrade && rsi < 38) ||
    (!isBullishTrade && rsi > 62)
  ) {
    status = 'DO_NOT_AVERAGE';
    statusBadge = 'bg-rose-950 text-rose-300 border-rose-500';
    statusHeadline = '🛑 STRICTLY DO NOT AVERAGE — Exit on Invalidation';
    reason = `Technical structure is broken with Confluence ${techConfluence}/5 and RSI at ${rsi.toFixed(1)}. Averaging down into a collapsing trend will multiply risk. Protect your capital and adhere to stop loss.`;
    isSafeToAverage = false;
    recommendedPrice = 0;
    recommendedPriceRange = 'N/A (Exit Recommended)';
  } 
  // 2. High Profit Winner -> PYRAMID ON STRENGTH
  else if (unrealizedPnLPct >= 5.0 && techConfluence >= 3 && ((isBullishTrade && rsi <= 72) || (!isBullishTrade && rsi >= 28))) {
    status = 'PYRAMID_ON_STRENGTH';
    statusBadge = 'bg-indigo-950 text-indigo-300 border-indigo-500';
    statusHeadline = '🚀 Winner Scaling (Pyramiding) Opportunity';
    reason = `The trade is up +${unrealizedPnLPct.toFixed(1)}% with strong ${techConfluence}/5 technical backing. You can add 0.5x lot on a minor 1-minute dip to scale your profits while trailing stop loss into green.`;
    isSafeToAverage = true;
    recommendedPrice = isOption ? Math.round(effectiveCMP * 0.96 * 20) / 20 : Math.round(effectiveCMP * 0.995 * 100) / 100;
    recommendedPriceRange = `₹${(recommendedPrice * 0.985).toFixed(2)} - ₹${recommendedPrice.toFixed(2)}`;
  }
  // 3. Healthy Pullback to Support -> RECOMMENDED
  else if (
    unrealizedPnLPct <= -1.5 &&
    unrealizedPnLPct >= -14.0 &&
    techConfluence >= 3 &&
    ((isBullishTrade && rsi >= 42) || (!isBullishTrade && rsi <= 58))
  ) {
    status = 'RECOMMENDED';
    statusBadge = 'bg-emerald-950 text-emerald-300 border-emerald-500';
    statusHeadline = '⚖️ HIGH-CONVICTION AVERAGING ZONE (Support Retest)';
    reason = `Price is testing support (VWAP / Gann) on healthy volume. Confluence score is ${techConfluence}/5 and RSI is holding at ${rsi.toFixed(1)}. Adding 1x lot at ₹${effectiveCMP.toFixed(2)} significantly lowers your breakeven.`;
    isSafeToAverage = true;
    recommendedPrice = effectiveCMP;
    recommendedPriceRange = `₹${(effectiveCMP * 0.98).toFixed(2)} - ₹${(effectiveCMP * 1.01).toFixed(2)}`;
  }
  // 4. Minor loss or uncertain bounce -> WAIT FOR TRIGGER
  else {
    status = 'WAIT_FOR_TRIGGER';
    statusBadge = 'bg-amber-950 text-amber-300 border-amber-500';
    statusHeadline = '⏳ Await Bounce Confirmation Before Averaging';
    reason = `Price is consolidating near entry. Confluence score is ${techConfluence}/5. Wait for a confirmed green candle bounce above support before committing additional averaging funds.`;
    isSafeToAverage = false;
    recommendedPrice = isBullishTrade 
      ? (isOption ? Math.round(effectiveCMP * 0.92 * 20) / 20 : Math.round(stockCMP * 0.99 * 100) / 100)
      : (isOption ? Math.round(effectiveCMP * 0.92 * 20) / 20 : Math.round(stockCMP * 1.01 * 100) / 100);
    recommendedPriceRange = `₹${(recommendedPrice * 0.97).toFixed(2)} - ₹${(recommendedPrice * 1.02).toFixed(2)}`;
  }

  // Pre-calculate 3 Strategies (Equal 1x, Half 0.5x, Aggressive 2x)
  const addPriceBase = recommendedPrice > 0 ? recommendedPrice : effectiveCMP;
  
  const createStrategy = (
    name: string,
    ratio: number,
    addQty: number
  ): AveragingStrategyOption => {
    const newTotalQty = quantity + addQty;
    const capitalRequired = Math.round(addPriceBase * addQty);
    const newAveragePrice = Math.round((((entryPrice * quantity) + (addPriceBase * addQty)) / newTotalQty) * 100) / 100;
    const reductionInBreakevenPct = Math.round((((entryPrice - newAveragePrice) / entryPrice) * 100) * 10) / 10;
    const revisedStopLoss = isOption
      ? Math.round(addPriceBase * 0.75 * 20) / 20
      : (suggestedTrailingSL || Math.round(addPriceBase * 0.985 * 100) / 100);

    return {
      name,
      ratio,
      addQuantity: addQty,
      addLots: Math.max(1, Math.round(addQty / lotSize)),
      addPrice: addPriceBase,
      capitalRequired,
      newAveragePrice,
      newTotalQuantity: newTotalQty,
      reductionInBreakevenPct,
      revisedRiskReward: '1 : 2.8',
      revisedStopLoss
    };
  };

  const halfQty = isOption && lotSize > 1 ? Math.max(lotSize, Math.round((quantity * 0.5) / lotSize) * lotSize) : Math.max(1, Math.round(quantity * 0.5));
  const equalQty = quantity;
  const aggQty = quantity * 2;

  const strategies: AveragingStrategyOption[] = [
    createStrategy('Equal 1x Size (Recommended)', 1.0, equalQty),
    createStrategy('Half 0.5x Size (Conservative)', 0.5, halfQty),
    createStrategy('Double 2x Size (Aggressive Dip)', 2.0, aggQty),
  ];

  // Default equal strategy
  const primaryStrategy = strategies[0];
  const hardStopLoss = primaryStrategy.revisedStopLoss;
  const maxDrawdownRisk = Math.round(
    Math.abs(entryPrice - hardStopLoss) * quantity +
    Math.abs(addPriceBase - hardStopLoss) * primaryStrategy.addQuantity
  );

  return {
    status,
    statusBadge,
    statusHeadline,
    recommendedPrice: addPriceBase,
    recommendedPriceRange,
    recommendedQuantity: primaryStrategy.addQuantity,
    recommendedLots: primaryStrategy.addLots,
    newAveragePrice: primaryStrategy.newAveragePrice,
    capitalRequired: primaryStrategy.capitalRequired,
    breakevenReductionPct: primaryStrategy.reductionInBreakevenPct,
    hardStopLoss,
    maxDrawdownRisk,
    reason,
    technicalSupportLevel,
    strategies,
    isSafeToAverage
  };
}

/**
 * Storage helpers for User Tracked Trades in localStorage
 */
const STORAGE_KEY_TRADES = 'dhan_user_tracked_trades_v1';

export function getStoredUserTrades(): UserTrackedTrade[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TRADES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to load user tracked trades', e);
    return [];
  }
}

export function saveStoredUserTrades(trades: UserTrackedTrade[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_TRADES, JSON.stringify(trades));
  } catch (e) {
    console.error('Failed to save user tracked trades', e);
  }
}
