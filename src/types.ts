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
  volume?: number | null;
  candleTimestamp?: string | null;

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

  // Open = Low / Open = High Intraday Pattern Flags
  isOpenEqualLow?: boolean;
  isOpenEqualHigh?: boolean;
  openLowDiffPct?: number | null;
  openHighDiffPct?: number | null;

  // Fibonacci 38.2% Retracement
  fib382Bull?: number | null;
  fib382Bear?: number | null;
  fibPullbackPct?: number | null;
  fibStatus?: 'Retraced Yes' | 'Approaching 38.2%' | 'No Retracement' | null;
  isFib382Retrace?: boolean;

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
  | 'FIB_382_RETRACE'
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
  openLowDiffPct?: number | null;
  openHighDiffPct?: number | null;
  fib382Bull?: number | null;
  fib382Bear?: number | null;
  fibPullbackPct?: number | null;
  fibStatus?: 'Retraced Yes' | 'Approaching 38.2%' | 'No Retracement' | null;
  isFib382Retrace?: boolean;
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

