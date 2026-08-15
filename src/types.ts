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
  candleTimestamp?: string | null;
  previousClose?: number | null;

  // Gann Calculated Values
  openCalc?: number | null; // ((sqrt(open) * 15) - 15) % 15
  closeCalc?: number | null; // ((sqrt(close) * 15) - 15) % 15
  
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
  isFetched?: boolean;
  isLoading?: boolean;
  error?: string | null;
  isManual?: boolean;
}

export type TrendFilterType =
  | 'ALL'
  | 'VERY_BULLISH'
  | 'BULLISH'
  | 'VERY_BEARISH'
  | 'BEARISH'
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

