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
  vwap?: number | null;
  vwapStatus?: 'Above' | 'Below' | 'At' | null;

  // Open = Low / Open = High Intraday Pattern Flags
  isOpenEqualLow?: boolean;
  isOpenEqualHigh?: boolean;
  openLowDiffPct?: number | null;
  openHighDiffPct?: number | null;

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
  vwap?: number | null;
  vwapStatus?: 'Above' | 'Below' | 'At' | null;
  isOpenEqualLow?: boolean;
  isOpenEqualHigh?: boolean;
  openLowDiffPct?: number | null;
  openHighDiffPct?: number | null;
}
