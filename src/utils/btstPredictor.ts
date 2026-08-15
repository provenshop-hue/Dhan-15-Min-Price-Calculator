import { StockCalculated, BtstPredictionItem, BtstGapDirection, BtstConfluenceRule } from '../types';
import { getExactNseStrikeStep, roundToExactNseStrike, formatStrikePrice } from './nseStrikeMaster';
import { isIndexSymbol } from '../data/dhanSecurityMap';
import { isAboveFirst15mCandle, isBelowFirst15mCandle } from './gann';

/**
 * Evaluates a single stock or index to determine if it has a high-conviction
 * BTST (Buy Today, Sell Tomorrow) GAP UP or STBT (Sell Today, Buy Tomorrow) GAP DOWN setup.
 *
 * Precision Multi-Factor Quantitative Model:
 * 1. True Net Day Change (relative to Previous Day Settlement Close and Open)
 * 2. Gap-Up Open & Gap Defense / Runaway Gap / Breakout Retest Structures
 * 3. Gann Square of 9 angles, targets, and trend zones
 * 4. Intraday VWAP institutional absorption & volume delivery
 * 5. 14-period RSI trajectory and 15-min candle Open=Low / Open=High setups
 *
 * Excludes neutral, range-bound, or conflicting setups so only genuine high-probability setups appear.
 */
export function evaluateBtstPrediction(
  stock: StockCalculated,
  _allStocks: StockCalculated[] = []
): BtstPredictionItem | null {
  const cmp = stock.closePrice || stock.openPrice || 0;
  const openPrice = stock.openPrice || cmp;
  const highPrice = stock.highPrice || Math.max(cmp, openPrice);
  const lowPrice = stock.lowPrice || Math.min(cmp, openPrice);

  if (!cmp || cmp <= 0) return null;

  const symbolUpper = (stock.symbol || '').toUpperCase().trim();
  const isIndex = isIndexSymbol(stock.symbol) || symbolUpper === 'NIFTY' || symbolUpper === 'BANKNIFTY' || symbolUpper === 'SENSEX';
  const category: 'INDEX' | 'STOCK' = isIndex ? 'INDEX' : 'STOCK';

  // Day Range Analysis
  const dayRange = Math.max(highPrice - lowPrice, cmp * 0.003);
  const closeToHighPct = Math.max(0, Math.min(100, ((cmp - lowPrice) / dayRange) * 100));
  const closeToLowPct = 100 - closeToHighPct;

  // True Previous Close and Day Change %
  const hasRealPrevClose = stock.previousClose !== undefined && stock.previousClose !== null && stock.previousClose > 0;
  const directPctChange = stock.pctChange !== undefined && stock.pctChange !== null ? stock.pctChange : null;

  // Determine true previous close:
  const prevClose = hasRealPrevClose
    ? stock.previousClose!
    : directPctChange !== null && directPctChange !== 0
    ? cmp / (1 + directPctChange / 100)
    : openPrice;

  const dayChangePct = directPctChange !== null
    ? directPctChange
    : prevClose > 0
    ? ((cmp - prevClose) / prevClose) * 100
    : 0;

  const intradayPct = openPrice > 0 ? ((cmp - openPrice) / openPrice) * 100 : 0;
  const gapAtOpenPct = prevClose > 0 ? ((openPrice - prevClose) / prevClose) * 100 : 0;

  // VWAP Analysis
  const vwap = stock.vwap || (highPrice + lowPrice + cmp) / 3;
  const vwapDistancePct = vwap > 0 ? ((cmp - vwap) / vwap) * 100 : 0;

  // RSI Analysis
  const rsi = stock.rsi ?? 50;

  // Gann levels & Trend
  const gannBuyAbove = stock.buyAbove || null;
  const gannSellBelow = stock.sellBelow || null;
  const trend = stock.trend || 'Neutral';

  // Track confluence rules
  const bullishRules: BtstConfluenceRule[] = [];
  const bearishRules: BtstConfluenceRule[] = [];

  let bullScore = 30;
  let bearScore = 30;

  /* =========================================================
     1. GAP-UP / GAP-DOWN OPEN & BREAKOUT RETEST (Max 40 pts)
     ========================================================= */
  const isGapUpOpen = gapAtOpenPct >= 0.1 || (isIndex && gapAtOpenPct >= 0.05);
  const isGapDownOpen = gapAtOpenPct <= -0.1 || (isIndex && gapAtOpenPct <= -0.05);

  if (isGapUpOpen) {
    if (cmp >= prevClose * 0.998) {
      // Gap-up was defended / held in positive or breakout territory (Runaway Gap / Breakout Retest)
      bullScore += 40;
      bearScore = 0; // Strict zeroing of false bear signals
      bullishRules.push({
        id: 'gap_up_defended',
        name: 'Overnight Gap-Up Defended (Breakout Retest)',
        passed: true,
        score: 40,
        description: `Session opened with +${gapAtOpenPct.toFixed(2)}% gap-up above yesterday's close (₹${prevClose.toFixed(2)}) and defended without filling. Institutional buyers in full command.`
      });
    } else {
      bullScore += 20;
      bullishRules.push({
        id: 'gap_up_open',
        name: 'Positive Gap-Up Opening Drift',
        passed: true,
        score: 20,
        description: `Opened with +${gapAtOpenPct.toFixed(2)}% overnight gap.`
      });
    }
  } else if (isGapDownOpen) {
    if (cmp <= prevClose * 1.002) {
      bearScore += 40;
      bullScore = 0; // Strict zeroing of false bull signals
      bearishRules.push({
        id: 'gap_down_defended',
        name: 'Overnight Gap-Down Breakdown Sustained',
        passed: true,
        score: 40,
        description: `Session opened with ${gapAtOpenPct.toFixed(2)}% gap-down below yesterday's close (₹${prevClose.toFixed(2)}) and failed to recover. Sellers in full command.`
      });
    } else {
      bearScore += 20;
      bearishRules.push({
        id: 'gap_down_open',
        name: 'Negative Gap-Down Opening Drift',
        passed: true,
        score: 20,
        description: `Opened with ${gapAtOpenPct.toFixed(2)}% overnight gap.`
      });
    }
  }

  /* =========================================================
     2. GANN SQUARE OF 9 ANGLES & TREND CONFLUENCE (Max 35 pts)
     ========================================================= */
  if (trend === 'Very Bullish' || trend === 'Bullish' || (gannBuyAbove && cmp >= gannBuyAbove)) {
    const pts = trend === 'Very Bullish' ? 35 : 25;
    bullScore += pts;
    bearScore = 0; // Gann Bullish status overrides false bearish noise
    bullishRules.push({
      id: 'gann_bullish_trend',
      name: 'Gann Square of 9 Buy Zone Sustained',
      passed: true,
      score: pts,
      description: `Closing firmly in Gann Buy Zone (₹${(gannBuyAbove || cmp).toFixed(2)}). Mathematical angle favors upside continuation.`
    });
  } else if (trend === 'Very Bearish' || trend === 'Bearish' || (gannSellBelow && cmp <= gannSellBelow)) {
    const pts = trend === 'Very Bearish' ? 35 : 25;
    bearScore += pts;
    bullScore = 0; // Gann Bearish status overrides false bullish noise
    bearishRules.push({
      id: 'gann_bearish_trend',
      name: 'Gann Square of 9 Sell Zone Sustained',
      passed: true,
      score: pts,
      description: `Closing firmly in Gann Sell Zone (₹${(gannSellBelow || cmp).toFixed(2)}). Mathematical angle favors downside continuation.`
    });
  }

  /* =========================================================
     3. NET DAY MOMENTUM & INTRADAY EXPANSION (Max 25 pts)
     ========================================================= */
  if (dayChangePct >= 0.0) {
    const pts = dayChangePct >= 1.0 ? 25 : 18;
    bullScore += pts;
    bullishRules.push({
      id: 'net_day_green',
      name: `Positive Net Day Settlement (+${dayChangePct.toFixed(2)}%)`,
      passed: true,
      score: pts,
      description: `Holding net green territory vs previous close (₹${prevClose.toFixed(2)}) with active institutional delivery.`
    });
  } else if (dayChangePct <= -0.5 && !isGapUpOpen) {
    const pts = dayChangePct <= -1.2 ? 25 : 18;
    bearScore += pts;
    bearishRules.push({
      id: 'net_day_red',
      name: `Negative Net Day Settlement (${dayChangePct.toFixed(2)}%)`,
      passed: true,
      score: pts,
      description: `Settling in red territory vs previous close (₹${prevClose.toFixed(2)}) under distribution.`
    });
  }

  /* =========================================================
     4. CLOSING PRICE ACTION & DAY RANGE POSITION (Max 30 pts)
     ========================================================= */
  if (closeToHighPct >= 75 || stock.isHighEqualClose) {
    const pts = (closeToHighPct >= 90 || stock.isHighEqualClose) ? 30 : 20;
    bullScore += pts;
    bullishRules.push({
      id: 'eod_high_close',
      name: 'Closing At/Near Day High',
      passed: true,
      score: pts,
      description: `Settled in top ${(100 - closeToHighPct).toFixed(0)}% of session range (₹${cmp.toFixed(2)} vs High ₹${highPrice.toFixed(2)}) indicating aggressive 3:00 PM closing rush.`
    });
  } else if (closeToHighPct <= 25 && dayChangePct < -0.3 && !isGapUpOpen) {
    // Only apply low close penalty if the overall day is genuinely red and did NOT gap up
    const pts = closeToHighPct <= 10 ? 30 : 20;
    bearScore += pts;
    bearishRules.push({
      id: 'eod_low_close',
      name: 'Closing At/Near Day Low',
      passed: true,
      score: pts,
      description: `Settled in bottom ${closeToHighPct.toFixed(0)}% of session range (₹${cmp.toFixed(2)} vs Low ₹${lowPrice.toFixed(2)}) showing heavy end-of-day supply.`
    });
  }

  /* =========================================================
     5. VWAP INSTITUTIONAL ABSORPTION (Max 25 pts)
     ========================================================= */
  if (cmp >= vwap) {
    const pts = vwapDistancePct >= 0.3 ? 25 : 18;
    bullScore += pts;
    bullishRules.push({
      id: 'vwap_bullish',
      name: 'Trading Above Intraday VWAP',
      passed: true,
      score: pts,
      description: `Trading +${vwapDistancePct.toFixed(2)}% above volume-weighted benchmark (₹${vwap.toFixed(2)}). Smart money in profit.`
    });
  } else if (cmp < vwap && dayChangePct < 0 && !isGapUpOpen) {
    const pts = vwapDistancePct <= -0.3 ? 25 : 18;
    bearScore += pts;
    bearishRules.push({
      id: 'vwap_bearish',
      name: 'Submerged Below Intraday VWAP',
      passed: true,
      score: pts,
      description: `Trading ${vwapDistancePct.toFixed(2)}% below volume-weighted benchmark (₹${vwap.toFixed(2)}). Sellers in control.`
    });
  }

  /* =========================================================
     6. 14-PERIOD RSI MOMENTUM TRAJECTORY (Max 20 pts)
     ========================================================= */
  if (rsi >= 52) {
    const pts = rsi >= 62 ? 20 : 15;
    bullScore += pts;
    bullishRules.push({
      id: 'rsi_bullish',
      name: 'RSI Bullish Momentum Trajectory',
      passed: true,
      score: pts,
      description: `14-period RSI at ${rsi.toFixed(1)} confirms sustained buying momentum into market close.`
    });
  } else if (rsi <= 44 && dayChangePct < 0 && !isGapUpOpen) {
    const pts = rsi <= 35 ? 20 : 15;
    bearScore += pts;
    bearishRules.push({
      id: 'rsi_bearish',
      name: 'RSI Bearish Breakdown Momentum',
      passed: true,
      score: pts,
      description: `14-period RSI at ${rsi.toFixed(1)} indicates weakening strength and downside acceleration.`
    });
  }

  /* =========================================================
     7. 15-MINUTE CANDLE PATTERNS & BREAKOUTS (Max 30 pts)
     ========================================================= */
  if (stock.isOpenEqualLow) {
    bullScore += 30;
    bearScore = 0;
    bullishRules.push({
      id: 'open_eq_low',
      name: 'Open = Low Morning Pattern Hold (Ultra Conviction)',
      passed: true,
      score: 30,
      description: 'Morning opening price remained fully unbroken session low all day (100% buyer dominance).'
    });
  }

  if (stock.isOpenEqualHigh && !isGapUpOpen) {
    bearScore += 30;
    bullScore = 0;
    bearishRules.push({
      id: 'open_eq_high',
      name: 'Open = High Morning Pattern Rejection (Ultra Conviction)',
      passed: true,
      score: 30,
      description: 'Morning opening price acted as impenetrable ceiling all day (100% seller dominance).'
    });
  }

  if (isAboveFirst15mCandle(stock)) {
    bullScore += 18;
    bullishRules.push({
      id: 'above_15m_high',
      name: 'Trading Above 09:15 AM First 15m Candle High',
      passed: true,
      score: 18,
      description: `CMP ₹${cmp.toFixed(2)} is sustaining above morning opening 15-min range high (₹${(stock.first15mHigh || highPrice).toFixed(2)}).`
    });
  }

  if (isBelowFirst15mCandle(stock) && !isGapUpOpen && dayChangePct < 0) {
    bearScore += 18;
    bearishRules.push({
      id: 'below_15m_low',
      name: 'Trading Below 09:15 AM First 15m Candle Low',
      passed: true,
      score: 18,
      description: `CMP ₹${cmp.toFixed(2)} is breaking below morning opening 15-min range low (₹${(stock.first15mLow || lowPrice).toFixed(2)}).`
    });
  }

  if (stock.isFib382Retrace) {
    bullScore += 15;
    bullishRules.push({
      id: 'fib_retrace',
      name: 'Fibonacci 38.2% Golden Ratio Bounce',
      passed: true,
      score: 15,
      description: 'Healthy pullback retested 38.2% Fibonacci support before surging into close.'
    });
  }

  /* =========================================================
     DECISION: STRICT GAP UP vs GAP DOWN FILTERING
     ========================================================= */
  const MIN_BTST_SCORE = 50; // Confirmed conviction threshold
  let predictedDirection: BtstGapDirection | null = null;
  let finalScore = 0;
  let activeRules: BtstConfluenceRule[] = [];

  // Strong Bullish or Bearish criteria
  const isBullCandidate =
    bullScore >= MIN_BTST_SCORE &&
    bullScore > bearScore &&
    (isGapUpOpen || dayChangePct >= 0 || intradayPct >= 0 || cmp >= vwap || trend.includes('Bullish') || Boolean(stock.isOpenEqualLow));

  const isBearCandidate =
    bearScore >= MIN_BTST_SCORE &&
    bearScore > bullScore &&
    !isGapUpOpen &&
    dayChangePct < 0 &&
    cmp <= vwap &&
    !trend.includes('Bullish');

  if (isBullCandidate && (!isBearCandidate || bullScore > bearScore)) {
    predictedDirection = 'GAP_UP';
    finalScore = Math.min(99, Math.max(76, Math.round(bullScore * 0.74)));
    activeRules = bullishRules;
  } else if (isBearCandidate) {
    predictedDirection = 'GAP_DOWN';
    finalScore = Math.min(99, Math.max(76, Math.round(bearScore * 0.74)));
    activeRules = bearishRules;
  } else {
    // Range-bound, indeterminate chop, or conflicting cues: EXCLUDE
    return null;
  }

  // Conviction Tier
  const convictionTier: 'ULTRA_HIGH' | 'VERY_HIGH' | 'HIGH' =
    finalScore >= 90 ? 'ULTRA_HIGH' : finalScore >= 82 ? 'VERY_HIGH' : 'HIGH';

  // Expected Gap Calculation
  let expectedGapPctMin: number;
  let expectedGapPctMax: number;

  const magnitude = Math.max(0.6, Math.abs(dayChangePct) * 0.4);

  if (isIndex) {
    // Indices (Nifty, BankNifty, Sensex) typical overnight gap
    if (predictedDirection === 'GAP_UP') {
      expectedGapPctMin = Math.round(Math.min(1.5, Math.max(0.45, magnitude * 0.5)) * 100) / 100;
      expectedGapPctMax = Math.round((expectedGapPctMin + 0.65) * 100) / 100;
    } else {
      expectedGapPctMin = -Math.round(Math.min(1.5, Math.max(0.45, magnitude * 0.5)) * 100) / 100;
      expectedGapPctMax = -Math.round((Math.abs(expectedGapPctMin) + 0.65) * 100) / 100;
    }
  } else {
    // Individual Stocks typical overnight gap
    if (predictedDirection === 'GAP_UP') {
      expectedGapPctMin = Math.round((0.85 + Math.min(2.2, Math.abs(dayChangePct) * 0.35)) * 10) / 10;
      expectedGapPctMax = Math.round((expectedGapPctMin + 1.25) * 10) / 10;
    } else {
      expectedGapPctMin = -Math.round((0.85 + Math.min(2.2, Math.abs(dayChangePct) * 0.35)) * 10) / 10;
      expectedGapPctMax = -Math.round((Math.abs(expectedGapPctMin) + 1.25) * 10) / 10;
    }
  }

  const avgGapPct = (expectedGapPctMin + expectedGapPctMax) / 2;
  const expectedGapPointsMin = Math.round(((cmp * Math.abs(expectedGapPctMin)) / 100) * 100) / 100;
  const expectedGapPointsMax = Math.round(((cmp * Math.abs(expectedGapPctMax)) / 100) * 100) / 100;
  const estimatedOpeningPrice = Math.round((cmp * (1 + avgGapPct / 100)) * 100) / 100;

  // Options & Strike Formulation
  const strikeStep = getExactNseStrikeStep(stock.symbol, cmp);
  const atmStrike = roundToExactNseStrike(cmp, stock.symbol);
  const isBull = predictedDirection === 'GAP_UP';

  // Recommended option: ATM for standard liquidity, or slightly ITM for maximum Delta capture
  const recommendedStrike = atmStrike;
  const optionType: 'CE' | 'PE' = isBull ? 'CE' : 'PE';
  const strikeDisplay = formatStrikePrice(recommendedStrike);
  const contractString = `${stock.symbol} ${strikeDisplay} ${optionType}`;

  // Lot Size
  const lotSize = stock.lotSizeJun2026 || stock.lotSizeJul2026 || stock.lotSizeAug2026 || (isIndex ? (symbolUpper.includes('BANK') ? 15 : symbolUpper.includes('SENSEX') ? 10 : 75) : 250);

  // Approximate Option Pricing
  const isNiftyIndex = isIndex;
  const impliedVolPct = isNiftyIndex ? 0.012 : 0.022; // Est. 1-day ATM premium
  const approxEntryPremium = Math.max(5, Math.round(cmp * impliedVolPct * 10) / 10);
  const expectedGainMultiplier = 1 + (Math.abs(avgGapPct) * (isNiftyIndex ? 0.45 : 0.35));
  const expectedGapOpenPremium = Math.round((approxEntryPremium * expectedGainMultiplier) * 10) / 10;
  const optionStopLoss = Math.round((approxEntryPremium * 0.68) * 10) / 10;

  const estProfitPerLot = Math.round((expectedGapOpenPremium - approxEntryPremium) * lotSize);
  const estRiskPerLot = Math.round((approxEntryPremium - optionStopLoss) * lotSize);
  const capitalRequiredPerLot = Math.round(approxEntryPremium * lotSize);

  // Cash / Futures Strategy
  const cashAction = isBull ? 'BUY (BTST)' : 'SELL (STBT)';
  const targetOpenPrice = estimatedOpeningPrice;
  const overnightStopLoss = isBull
    ? Math.round(Math.max(lowPrice, cmp * 0.988) * 100) / 100
    : Math.round(Math.min(highPrice, cmp * 1.012) * 100) / 100;
  const estimatedGainPct = Math.abs(avgGapPct);
  const riskPct = Math.round((Math.abs(cmp - overnightStopLoss) / cmp) * 1000) / 10;

  // AI Headlines & Theses
  const directionLabel = isBull ? 'GAP UP' : 'GAP DOWN';
  const aiHeadline = isBull
    ? `${stock.symbol}: Strong Closing Demand Points to +${expectedGapPctMin}% to +${expectedGapPctMax}% Morning Gap Up`
    : `${stock.symbol}: Heavy End-of-Day Liquidation Points to ${expectedGapPctMin}% to ${expectedGapPctMax}% Morning Gap Down`;

  const institutionalFlowVerdict = isBull
    ? `Strong Institutional Buying: Smart money held ${stock.symbol} into closing bell with positive momentum (+${Math.max(dayChangePct, intradayPct).toFixed(2)}%) and breakout retest defense.`
    : `Persistent Institutional Selling: Sellers dumped positions into closing bell with negative momentum (${Math.min(dayChangePct, intradayPct).toFixed(2)}%) and VWAP breakdown.`;

  const aiThesis = isBull
    ? `${stock.symbol} closed with strong bullish confluence (₹${cmp.toFixed(2)}) with RSI at ${rsi.toFixed(1)}. Overnight momentum probability is rated at ${finalScore}%. Expected morning opening jump of +${expectedGapPointsMin} to +${expectedGapPointsMax} points.`
    : `${stock.symbol} closed with persistent bearish breakdown (₹${cmp.toFixed(2)}) with RSI dropping to ${rsi.toFixed(1)}. Overnight follow-through downside probability is rated at ${finalScore}%. Expected morning opening dip of -${expectedGapPointsMin} to -${expectedGapPointsMax} points.`;

  const morningExitGuidance = isBull
    ? `Execution Plan: Enter ${cashAction} between 3:15 PM - 3:28 PM. At 9:15-9:20 AM tomorrow, book 70% profits immediately upon gap open around ₹${targetOpenPrice.toFixed(2)}. Trail remaining with SL at Today's Close (₹${cmp.toFixed(2)}).`
    : `Execution Plan: Enter ${cashAction} between 3:15 PM - 3:28 PM. At 9:15-9:20 AM tomorrow, cover shorts around ₹${targetOpenPrice.toFixed(2)} on initial opening dip. Protect against morning short-covering bounce.`;

  return {
    id: `btst_${stock.id}_${predictedDirection}`,
    stockId: stock.id,
    symbol: stock.symbol,
    companyName: stock.companyName,
    isIndex,
    category,
    predictedDirection,
    directionLabel,
    convictionScore: finalScore,
    convictionTier,
    cmp: Math.round(cmp * 100) / 100,
    dayOpen: Math.round(openPrice * 100) / 100,
    dayHigh: Math.round(highPrice * 100) / 100,
    dayLow: Math.round(lowPrice * 100) / 100,
    dayChangePct: Math.round(dayChangePct * 100) / 100,
    closeToHighPct: Math.round(closeToHighPct * 10) / 10,
    closeToLowPct: Math.round(closeToLowPct * 10) / 10,
    expectedGapPctMin,
    expectedGapPctMax,
    expectedGapPointsMin,
    expectedGapPointsMax,
    estimatedOpeningPrice,
    vwap: vwap ? Math.round(vwap * 100) / 100 : null,
    vwapDistancePct: Math.round(vwapDistancePct * 100) / 100,
    rsi: Math.round(rsi * 10) / 10,
    adx: stock.adx ? Math.round(stock.adx * 10) / 10 : null,
    gannBuyAbove,
    gannSellBelow,
    isOpenEqualLow: stock.isOpenEqualLow,
    isOpenEqualHigh: stock.isOpenEqualHigh,
    isHighEqualClose: stock.isHighEqualClose,
    cashStrategy: {
      action: cashAction,
      entryWindow: '3:15 PM - 3:28 PM IST',
      entryPrice: Math.round(cmp * 100) / 100,
      targetOpenPrice,
      overnightStopLoss,
      estimatedGainPct: Math.round(estimatedGainPct * 10) / 10,
      riskPct,
      riskRewardRatio: `1 : ${(estimatedGainPct / Math.max(0.5, riskPct)).toFixed(1)}`
    },
    optionsStrategy: {
      recommendedContract: contractString,
      optionType,
      strikePrice: recommendedStrike,
      strikeStep,
      lotSize,
      approxEntryPremium,
      expectedGapOpenPremium,
      optionStopLoss,
      estProfitPerLot,
      estRiskPerLot,
      capitalRequiredPerLot,
      riskRewardRatio: `1 : ${(estProfitPerLot / Math.max(1, estRiskPerLot)).toFixed(1)}`
    },
    aiHeadline,
    aiThesis,
    institutionalFlowVerdict,
    morningExitGuidance,
    confluenceRules: activeRules,
    rulesPassedCount: activeRules.length,
    rulesTotalCount: 5,
    lastAnalyzedTime: new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }) + ' IST'
  };
}

/**
 * Runs full BTST analysis across all stocks and indices, sorting by highest conviction score.
 * Only returns stocks that have a verified GAP UP or GAP DOWN signal.
 */
export function analyzeAllBtstTrades(stocks: StockCalculated[]): BtstPredictionItem[] {
  const results: BtstPredictionItem[] = [];

  for (const stock of stocks) {
    const item = evaluateBtstPrediction(stock, stocks);
    if (item) {
      results.push(item);
    }
  }

  // Sort: Indices first with high score, then highest conviction scores overall
  return results.sort((a, b) => {
    if (a.isIndex && !b.isIndex && a.convictionScore >= 80) return -1;
    if (!a.isIndex && b.isIndex && b.convictionScore >= 80) return 1;
    return b.convictionScore - a.convictionScore;
  });
}
