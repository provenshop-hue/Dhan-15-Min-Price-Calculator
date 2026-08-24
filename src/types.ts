export interface StockCalculated {
  id: string;
  companyName: string;
  screenerUrl: string;
  symbol: string;
  lotSizeJun2026: number | null;
  lotSizeJul2026: number | null;
  lotSizeAug2026: number | null;
  securityId?: string;
  exchangeSegment?: 'NSE_EQ' | 'NSE_FNO';
  
  // 15-min Candle Data
  openPrice?: number | null;
  closePrice?: number | null;
  highPrice?: number | null;
  lowPrice?: number | null;
  first15mHigh?: number | null;
  first15mLow?: number | null;
  volume?: number | null;
  volumeRatio?: number | null;
  volumeSpike?: boolean | null;
  candleTimestamp?: string | null;
  previousClose?: number | null;

  // Gann Calculated Values
  openCalc?: number | null; // ((sqrt(open) * 15) - 15) % 15
  closeCalc?: number | null; // ((sqrt(close) * 15) - 15) % 15
  totalCalc?: number | null; // openCalc + closeCalc
  
  // Gann Square of 9 Levels
  buyAbove?: number | null;
  sellBelow?: number | null;
  targetsUp?: number[];
  targetsDown?: number[];
  trend?: 'Very Bullish' | 'Bullish' | 'Very Bearish' | 'Bearish' | 'Neutral' | null;
  pctChange?: number | null;
  gannScore?: number | null;
  rsi?: number | null;
  adx?: number | null;
  rsiTimeline?: RsiIntradayPoint[];
  vwap?: number | null;
  vwapStatus?: 'Above' | 'Below' | 'At' | null;

  // Open = Low / Open = High / High = Close Intraday Pattern Flags
  isOpenEqualLow?: boolean;
  isOpenEqualHigh?: boolean;
  isHighEqualClose?: boolean;
  openLowDiffPct?: number | null;
  openHighDiffPct?: number | null;

  // Fibonacci 38.2% Retracement
  fib382Bull?: number | null;
  fib382Bear?: number | null;
  fibPullbackPct?: number | null;
  fibStatus?: 'Retraced Yes' | 'Approaching 38.2%' | 'No Retracement' | null;
  isFib382Retrace?: boolean;
  fib382Time?: string | null;

  // Fetch status
  fetchedDate?: string;
  isFetched?: boolean;
  isLoading?: boolean;
  error?: string | null;
  isManual?: boolean;
}

export type TrendFilterType =
  | 'ALL'
  | 'VERY_BULLISH'
  | 'BULLISH'
  | 'BOUNCE_930_BULLISH'
  | 'VERY_BEARISH'
  | 'BEARISH'
  | 'BOUNCE_930_BEARISH'
  | 'OPEN_LOW'
  | 'OPEN_HIGH'
  | 'HIGH_CLOSE'
  | 'FIB_382_RETRACE'
  | 'GANN_CALC_LESS_3'
  | 'BOTH_CALC_LESS_3'
  | 'OPEN_CALC_LESS_3'
  | 'CLOSE_CALC_LESS_3'
  | 'OPEN_2DEC_LESS_CLOSE'
  | 'OPEN_2DEC_GREATER_CLOSE'
  | 'OPEN_LESS_DEC_LESS_CLOSE_HIGHER_DEC'
  | 'OPEN_LESS_3_CLOSE_GREATER_10'
  | 'OPEN_GREATER_10_CLOSE_LESS_3'
  | 'BULLISH_COMBO_1'
  | 'BULLISH_COMBO_2'
  | 'BULLISH_COMBO_3'
  | 'BULLISH_COMBO_ALL'
  | 'BULLISH_COMBO_ANY'
  | 'CALCULATED';

export interface DhanApiCredentials {
  clientId: string;
  accessToken: string;
  date: string; // YYYY-MM-DD
  segment: 'NSE_EQ' | 'NSE_FNO';
  isConfigured: boolean;
}

export interface GannCalcResult {
  matchOpenPrice: number;
  matchClosePrice: number;
  openCalc: number;
  closeCalc: number;
  totalCalc: number;
  buyAbove: number;
  sellBelow: number;
  targetsUp: number[];
  targetsDown: number[];
  trend: 'Very Bullish' | 'Bullish' | 'Very Bearish' | 'Bearish' | 'Neutral';
  pctChange: number;
  gannScore: number;
  rsi?: number | null;
  adx?: number | null;
  vwap?: number | null;
  vwapStatus?: 'Above' | 'Below' | 'At' | null;
  isOpenEqualLow?: boolean;
  isOpenEqualHigh?: boolean;
  isHighEqualClose?: boolean;
  openLowDiffPct?: number | null;
  openHighDiffPct?: number | null;
  fib382Bull?: number | null;
  fib382Bear?: number | null;
  fibPullbackPct?: number | null;
  fibStatus?: 'Retraced Yes' | 'Approaching 38.2%' | 'No Retracement' | null;
  isFib382Retrace?: boolean;
  fib382Time?: string | null;
}

export interface RsiIntradayPoint {
  timeStr: string; // e.g. "09:15 AM", "09:30 AM", "09:45 AM", etc.
  close: number;
  volume?: number;
  rsi: number;
  rsiDirection: 'INCREASING' | 'DECREASING' | 'FLAT';
  rsiDelta: number;
  volumeDirection?: 'INCREASING' | 'DECREASING' | 'FLAT';
  volumeDelta?: number;
  volumeDeltaPct?: number;
}

export interface RsiAiAnalysisReport {
  verdict: 'POSITIVE_BUY' | 'NEGATIVE_AVOID' | 'NEUTRAL_WAIT';
  verdictTitle: string;
  confidencePct: number;
  gradualIncreaseDetected: boolean;
  rsiTrendSummary: string;
  analysisDetails: string;
  entryPoint: string;
  exitTargets: string[];
  stopLoss: string;
  riskRewardRatio: string;
  actionableAdvice: string;
  analyzedAt: string;
}

export interface FadedStockRecord {
  id: string;
  symbol: string;
  companyName: string;
  fadeType: '100% Bullish Move' | '100% Bearish Move';
  fadedAtTime: string; // e.g. "10:25:14 AM"
  fadedAtIso: string;  // ISO timestamp for sorting
  reason: string;      // Detailed explanation of why it faded
  lastLtp: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  pctChange: number;
  vwap?: number | null;
  rsi?: number | null;
}

export type TradeTrajectoryVerdict =
  | 'PROFIT_EXPANDING'
  | 'TARGET_1_HIT'
  | 'TARGET_2_HIT'
  | 'HEALTHY_PULLBACK'
  | 'MOMENTUM_COOLING'
  | 'EXIT_INVALIDATED';

export interface FetchSnapshot {
  timeStr: string;
  isoTimestamp: string;
  price: number;
  open: number;
  high: number;
  low: number;
  trend: 'Very Bullish' | 'Bullish' | 'Very Bearish' | 'Bearish' | 'Neutral';
  rsi?: number | null;
  vwap?: number | null;
  vwapStatus?: 'Above' | 'Below' | 'At' | null;
  gannScore?: number | null;
  pctChange?: number | null;
  pnlFromTriggerPct: number;
  target1Hit: boolean;
  target2Hit: boolean;
  stopLossBreached: boolean;
}

export interface StockTradeJourney {
  stockId: string;
  symbol: string;
  companyName: string;
  signalType: 'BULLISH' | 'BEARISH';
  signalCategory: 'VERY_BULLISH' | 'BULLISH_COMBO' | 'OPEN_LOW' | 'VERY_BEARISH' | 'OPEN_HIGH';
  inceptionTime: string;
  inceptionPrice: number;
  latestPrice: number;
  currentPnLPercent: number;
  currentPnLAmount: number;
  peakPnLPercent: number;
  maxDrawdownPercent: number;
  entryPrice: number;
  target1: number;
  target2: number;
  target3: number;
  stopLoss: number;
  verdict: TradeTrajectoryVerdict;
  verdictTitle: string;
  verdictBadgeClass: string;
  confidenceScore: number;
  actionableGuidance: string;
  keySupportResistance: string;
  fetchSnapshots: FetchSnapshot[];
  totalFetchesTracked: number;
  consecutiveBullishCount: number;
  lastUpdatedTime: string;
}

export type IdealTradeTimingStatus =
  | 'PRIME_ENTRY_NOW'
  | 'BREAKOUT_SURGE'
  | 'PULLBACK_RETEST'
  | 'TARGET_PROGRESSION';

export interface IdealOptionTrade {
  stockId: string;
  symbol: string;
  companyName: string;
  spotPrice: number;
  direction: 'BULLISH_CE' | 'BEARISH_PE';
  convictionScore: number; // 0 to 100
  timingStatus: IdealTradeTimingStatus;
  timingStatusLabel: string;
  recommendedOptionStrike: string; // e.g. "RELIANCE 2900 CE"
  strikePrice: number;
  strikeStep: number;
  optionType: 'CE' | 'PE';
  moneyness: 'ATM' | 'ITM (Delta 0.65)' | 'OTM';
  strikeLadder: {
    atm: number;
    itm: number;
    otm: number;
    atmContract: string;
    itmContract: string;
    otmContract: string;
  };
  lotSize: number;
  approxOptionLtp: number;
  optionEntryRange: string;
  optionTarget1: number;
  optionTarget2: number;
  optionStopLoss: number;
  capitalRequiredPerLot: number;
  potentialGainPerLot: number;
  riskPerLot: number;
  riskRewardRatio: string;
  historicAuditConfluence: string[];
  whyThisWillProfit: string;
  stockAction: 'BUY (Long Cash / Futures)' | 'SELL (Short Cash / Futures)';
  stockBuySellAbove: number;
  stockTarget1: number;
  stockTarget2: number;
  stockStopLoss: number;
  currentSpotPnLPct: number;
  totalFetchesTracked: number;
  lastUpdated: string;
}

export type BtstGapDirection = 'GAP_UP' | 'GAP_DOWN';

export interface BtstConfluenceRule {
  id: string;
  name: string;
  passed: boolean;
  score: number;
  description: string;
}

export interface BtstPredictionItem {
  id: string;
  stockId: string;
  symbol: string;
  companyName: string;
  isIndex: boolean;
  category: 'INDEX' | 'STOCK';
  predictedDirection: BtstGapDirection;
  directionLabel: string;
  convictionScore: number; // 70 - 99%
  convictionTier: 'ULTRA_HIGH' | 'VERY_HIGH' | 'HIGH';
  
  // Price and Gap Metrics
  cmp: number;
  dayOpen: number;
  dayHigh: number;
  dayLow: number;
  dayChangePct: number;
  closeToHighPct: number; // 0-100% position in day's range
  closeToLowPct: number;
  
  // Gap Estimation
  expectedGapPctMin: number;
  expectedGapPctMax: number;
  expectedGapPointsMin: number;
  expectedGapPointsMax: number;
  estimatedOpeningPrice: number;
  
  // Indicators
  vwap?: number | null;
  vwapDistancePct?: number | null;
  rsi?: number | null;
  adx?: number | null;
  gannBuyAbove?: number | null;
  gannSellBelow?: number | null;
  isOpenEqualLow?: boolean;
  isOpenEqualHigh?: boolean;
  isHighEqualClose?: boolean;
  volumeRatio?: number | null;
  
  // Strategy Plans
  cashStrategy: {
    action: 'BUY (BTST)' | 'SELL (STBT)';
    entryWindow: string; // e.g., "3:15 PM - 3:28 PM"
    entryPrice: number;
    targetOpenPrice: number;
    overnightStopLoss: number;
    estimatedGainPct: number;
    riskPct: number;
    riskRewardRatio: string;
  };
  
  optionsStrategy: {
    recommendedContract: string; // e.g. "NIFTY 24600 CE" or "HDFCBANK 1660 CE"
    optionType: 'CE' | 'PE';
    strikePrice: number;
    strikeStep: number;
    lotSize: number;
    approxEntryPremium: number;
    expectedGapOpenPremium: number;
    optionStopLoss: number;
    estProfitPerLot: number;
    estRiskPerLot: number;
    capitalRequiredPerLot: number;
    riskRewardRatio: string;
  };
  
  // AI & Quantitative Synthesis
  aiHeadline: string;
  aiThesis: string;
  institutionalFlowVerdict: string;
  morningExitGuidance: string;
  confluenceRules: BtstConfluenceRule[];
  rulesPassedCount: number;
  rulesTotalCount: number;
  
  lastAnalyzedTime: string;
}

export type InstrumentType = 'EQUITY' | 'CALL_OPTION' | 'PUT_OPTION' | 'FUTURES';
export type PositionSide = 'LONG' | 'SHORT';
export type TradeActionAdvice =
  | 'HOLD_FOR_PROFIT'
  | 'BOOK_PROFIT'
  | 'AVERAGE_PULLBACK'
  | 'EXIT_CUT_LOSS'
  | 'TIGHTEN_STOP_LOSS'
  | 'MONITOR_CLOSELY';

export interface UserTrackedTrade {
  id: string;
  symbol: string;
  companyName: string;
  instrumentType: InstrumentType;
  positionSide: PositionSide; // 'LONG' | 'SHORT'
  
  // Option specific fields
  strikePrice?: number | null;
  optionType?: 'CE' | 'PE' | null;
  expiryDate?: string | null;
  
  // Entry Details
  entryPrice: number; // Entry rate user took
  quantity: number; // Shares or total option contracts
  lots?: number | null;
  lotSize?: number | null;
  entryDate: string; // YYYY-MM-DD
  entryTime: string; // HH:MM AM/PM
  entryNotes?: string;
  strategyTag?: string; // e.g. "15m Bounce", "Gann Breakout", "RSI Dip", "BTST", "Custom"
  
  // User Set Targets / SL
  userStopLoss?: number | null;
  userTarget?: number | null;
  
  // Live Market State (Refreshed via Dhan API every 5 mins)
  stockCMP: number; // Underlying Stock Current Market Price
  optionCMP?: number | null; // Option CMP (Live/Calculated)
  effectiveCMP: number; // CMP used for P&L (stockCMP for equity/fut, optionCMP for options)
  
  // Real-time P&L
  unrealizedPnL: number; // ₹ Total gain/loss
  unrealizedPnLPct: number; // % Gain/loss
  pointsDiff: number; // Points gained/lost per share/contract
  investedCapital: number; // Total amount invested (entryPrice * quantity)
  currentValue: number; // Current value (effectiveCMP * quantity)
  
  // High / Low Peak Journey
  highestPriceSinceEntry: number;
  lowestPriceSinceEntry: number;
  maxProfitAchieved: number;
  maxDrawdownAchieved: number;
  
  // Smart Success Advisory & Guidance
  advice: TradeActionAdvice;
  adviceBadgeClass: string;
  adviceHeadline: string;
  adviceDetails: string;
  confidenceScore: number; // 0 - 100%
  healthScore: number; // 0 - 100% trade health
  
  // Actionable Guidance Steps
  suggestedAction: string; // e.g. "Hang on for Target 2", "Add 1 lot at ₹X pullback", "Book 50% profit", "Exit now"
  suggestedTrailingSL?: number | null;
  suggestedAveragePrice?: number | null;
  suggestedAverageQty?: number | null;
  newAveragePrice?: number | null;
  distanceToTargetPct?: number | null;
  distanceToStopLossPct?: number | null;
  riskRewardRatio?: string;
  
  // Technical Signals from Underlying
  stockTrend?: 'Very Bullish' | 'Bullish' | 'Very Bearish' | 'Bearish' | 'Neutral' | null;
  stockRsi?: number | null;
  stockVwap?: number | null;
  gannBuyAbove?: number | null;
  gannSellBelow?: number | null;
  gannTarget1?: number | null;
  gannTarget2?: number | null;
  gannTarget3?: number | null;
  
  // Timestamps & Status
  lastUpdated: string;
  status: 'OPEN' | 'CLOSED';
  closedAt?: string | null;
  exitPrice?: number | null;
  realizedPnL?: number | null;
  realizedPnLPct?: number | null;
  closingReason?: string | null;

  // Detailed Technical Indicators & Calculated Signals
  rsiValue?: number;
  rsiStatus?: string;
  rsiTrajectory?: 'RISING' | 'FALLING' | 'FLAT';
  volume?: number;
  volumeRatio?: number;
  volumeStatus?: 'SURGE' | 'HIGH' | 'NORMAL' | 'LOW';
  buyerPressurePct?: number;
  sellerPressurePct?: number;
  macdLine?: number;
  macdSignal?: number;
  macdHistogram?: number;
  macdStatus?: string;
  macdSignalColor?: 'GREEN' | 'RED' | 'YELLOW';
  ema9?: number;
  ema21?: number;
  emaAlignment?: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  vwapDistancePct?: number;
  confluenceScore?: number;
  confluenceMax?: number;
  holdExitVerdict?: 'HOLD' | 'EXIT' | 'BOOK_PARTIAL' | 'AVERAGE';
  verdictConfidence?: number;
  indicatorChecklist?: {
    name: string;
    value: string;
    verdict: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    description: string;
  }[];
  reasonsToHold?: string[];
  reasonsToExit?: string[];

  // Smart Averaging Guidance Engine
  averagingGuidance?: AveragingGuidanceData;

  // AI Trading Companion (Friend/Co-Pilot Mode)
  companionAdvice?: TradingCompanionData;
}

export interface TradingCompanionData {
  friendGreeting: string; // e.g. "Hey friend, stay calm! Bulls are firmly holding the line."
  overallStatus: 'HOLD_STRONG' | 'WAIT_PATIENTLY' | 'SCALE_IN_AVERAGE' | 'TAKE_PROFIT' | 'PROTECT_CAPITAL_EXIT';
  verdictTitle: string; // e.g. "🤝 STRONG HOLD — High Probability Setup"
  friendlySummary: string; // Conversational story of current trade health
  
  // RSI & Volume Companion Coach
  rsiCoach: {
    value: number;
    trajectory: 'RISING' | 'FALLING' | 'FLAT';
    statusText: string;
    friendlyExplanation: string; // Plain-English friendly interpretation
  };
  volumeCoach: {
    ratio: number;
    buyerPressurePct: number;
    sellerPressurePct: number;
    volumeStatus: 'SURGE' | 'HIGH' | 'NORMAL' | 'LOW';
    friendlyExplanation: string; // Plain-English friendly interpretation
  };

  // Best Place to Exit Plan
  exitPlan: {
    bestTargetPrice: number;
    bestTargetLabel: string;
    expectedProfit: number;
    expectedProfitPct: number;
    partialExitTrigger: string; // e.g. "Book 50% at ₹62.00, trail rest"
    hardStopLoss: number;
    trailingStopLoss: number;
    exitStrategyAdvice: string;
  };

  // Best Price to Average & Quantity
  averagingPlan: {
    isRecommended: boolean;
    recommendationLabel: string; // e.g. "Optimal Scale-In Dip", "Wait for Support Bounce", "Do Not Add"
    bestPrice: number;
    bestPriceZone: string; // e.g. "₹48.00 - ₹49.50"
    bestQuantity: number;
    bestLots?: number;
    capitalNeeded: number;
    newAveragePrice: number;
    breakevenDropPct: number;
    friendlyTip: string;
  };

  // Emotional & Discipline Coaching
  emotionalCoaching: string;
  speechSummary: string; // Optimized text for voice synthesis
}

export interface AveragingStrategyOption {
  name: string; // "Equal 1x (Recommended)", "Conservative 0.5x", "Aggressive 2x"
  ratio: number; // 1.0, 0.5, 2.0
  addQuantity: number;
  addLots?: number;
  addPrice: number;
  capitalRequired: number;
  newAveragePrice: number;
  newTotalQuantity: number;
  reductionInBreakevenPct: number; // e.g. -8.5%
  revisedRiskReward: string;
  revisedStopLoss: number;
}

export interface AveragingGuidanceData {
  status: 'RECOMMENDED' | 'WAIT_FOR_TRIGGER' | 'DO_NOT_AVERAGE' | 'PYRAMID_ON_STRENGTH';
  statusBadge: string;
  statusHeadline: string;
  recommendedPrice: number;
  recommendedPriceRange: string; // e.g. "₹47.50 - ₹49.20"
  recommendedQuantity: number;
  recommendedLots?: number;
  newAveragePrice: number;
  capitalRequired: number;
  breakevenReductionPct: number; // % dropped in breakeven
  hardStopLoss: number;
  maxDrawdownRisk: number; // Max loss if SL hit on combined position
  reason: string;
  technicalSupportLevel: string; // e.g. "Intraday VWAP (₹2,910) / Gann S1"
  strategies: AveragingStrategyOption[];
  isSafeToAverage: boolean;
}

export type CapitalStageType = 'MICRO_GROWTH' | 'CAPITAL_COMPOUNDER' | 'PRO_POSITION_SCALER' | 'INSTITUTIONAL_ELITE';

export interface CapitalJourneyMilestone {
  stageName: string;
  targetCapital: number;
  targetProfitGain: number;
  maxLotsAllowed: number;
  maxPositionsAllowed: number;
  status: 'ACTIVE' | 'UPCOMING' | 'COMPLETED';
  description: string;
}

export interface UserCapitalProfile {
  totalTradingCapital: number; // User configurable bankroll (e.g. ₹1,00,000)
  deployedCapital: number; // Deployed in active open trades
  freeCashCapital: number; // Unallocated cash balance
  reservedAveragingBuffer: number; // 35% suggested allocation for tactical averaging
  emergencyRiskBuffer: number; // 15% safety buffer
  stage: CapitalStageType;
  stageTitle: string;
  stageDescription: string;
  nextMilestoneCapital: number;
  progressToNextMilestonePct: number;
  maxRiskPerTradeAmount: number;
  maxRiskPerTradePct: number; // e.g. 2%
  recommendedMaxActiveTrades: number;
  recommendedMaxLotSize: number;
  milestones: CapitalJourneyMilestone[];
  journeyActionableRules: string[];
  friendJourneyAdvice: string;
}

export interface JourneyTimelineStep {
  stepIndex: number;
  timeStr: string; // e.g. "09:15 AM", "09:20 AM"
  minutesElapsed: number; // 0, 5, 10, 15...
  price: number;
  pointsDiff: number;
  pnl: number;
  pnlPct: number;
  rsi: number;
  rsiTrajectory: 'RISING' | 'FALLING' | 'FLAT';
  volumeRatio: number;
  buyerPressurePct: number;
  vwap: number;
  isAboveVwap: boolean;
  verdictAction: 'STRONG_HOLD' | 'WAIT_PATIENTLY' | 'SCALE_IN_AVERAGE' | 'BOOK_PARTIAL_PROFIT' | 'EXIT_CAPITAL_PRESERVATION';
  verdictBadge: string;
  friendGuidanceMessage: string;
  actionCallout: string;
  isMilestone: boolean;
  milestoneTag?: string; // e.g. "🎯 Target 1 Achieved", "⚖️ Support Bounce & Averaging Trigger"
}

export interface StockJourneyTimelineConfig {
  tradeId: string;
  symbol: string;
  isEnabled: boolean; // Enable / disable 5-minute journey tracking
  timelineStartTime: string; // e.g. "09:15"
  timelineIntervalMinutes: number; // 5
  autoIterateEnabled: boolean;
  lastSimulatedStepIndex: number;
}

export interface StockJourneyData {
  config: StockJourneyTimelineConfig;
  trade: UserTrackedTrade;
  steps: JourneyTimelineStep[];
  totalSteps: number;
  activeStepIndex: number;
  overallJourneySummary: string;
  journeyOutcome: 'IN_PROGRESS' | 'TARGET_HIT' | 'AVERAGED_REBOUND' | 'STOP_LOSS_PRESERVED';
}

