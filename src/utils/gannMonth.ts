import { StockCalculated } from '../types';

export interface PrevMonthGannData {
  stockId: string;
  symbol: string;
  companyName: string;
  targetMonth: string; // e.g. "August 2026"
  prevMonthName: string; // e.g. "July 2026"
  prevMonthStartDate: string; // e.g. "01 Jul 2026"
  prevMonthEndDate: string; // e.g. "31 Jul 2026"
  
  cmp: number; // Current Market Price
  openPrice: number;
  
  prevMonthHigh: number;
  prevMonthHighDate: string; // e.g. "16 Jul 2026"
  
  prevMonthLow: number;
  prevMonthLowDate: string; // e.g. "04 Jul 2026"
  
  prevMonthClose: number;
  prevMonthRange: number; // High - Low
  prevMonthRangePct: number; // ((High - Low) / Low) * 100
  
  gannMidpoint: number; // (High + Low) / 2
  
  gannBuyAbove: number; // Gann Square of 9 breakout target level above PMH
  gannSellBelow: number; // Gann Square of 9 breakdown target level below PML
  
  gannTargetsUp: number[];
  gannTargetsDown: number[];
  
  gannOctaves: {
    level000: number; // 0% (PML)
    level125: number; // 12.5%
    level250: number; // 25.0%
    level375: number; // 37.5%
    level500: number; // 50.0% (Midpoint)
    level625: number; // 62.5%
    level750: number; // 75.0%
    level875: number; // 87.5%
    level1000: number; // 100% (PMH)
  };
  
  cmpStatus: 'SUPER_BULLISH' | 'NEAR_PMH' | 'ABOVE_MIDPOINT' | 'BELOW_MIDPOINT' | 'NEAR_PML' | 'SUPER_BEARISH';
  cmpStatusLabel: string;
  cmpStatusBadgeClass: string;
  isRealApiData?: boolean;
}

/**
 * Resolves Target Month and Previous Month names & date bounds from a date string (YYYY-MM-DD or Month Year)
 */
export function getMonthBounds(dateStr: string) {
  const dt = new Date(dateStr || '2026-08-07');
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const targetYear = dt.getFullYear() || 2026;
  const targetMonthIdx = dt.getMonth(); // 0-indexed (7 for August)
  const targetMonthName = `${monthNames[targetMonthIdx]} ${targetYear}`;
  
  let prevMonthIdx = targetMonthIdx - 1;
  let prevYear = targetYear;
  if (prevMonthIdx < 0) {
    prevMonthIdx = 11;
    prevYear -= 1;
  }
  
  const prevMonthName = `${monthNames[prevMonthIdx]} ${prevYear}`;
  const lastDay = new Date(prevYear, prevMonthIdx + 1, 0).getDate();
  
  const shortMonth = monthNames[prevMonthIdx].substring(0, 3);
  const prevMonthStartDate = `01 ${shortMonth} ${prevYear}`;
  const prevMonthEndDate = `${lastDay} ${shortMonth} ${prevYear}`;
  
  return {
    targetMonthName,
    prevMonthName,
    prevMonthIdx,
    prevYear,
    lastDay,
    shortMonth,
    prevMonthStartDate,
    prevMonthEndDate,
    fromDateStr: `${prevYear}-${String(prevMonthIdx + 1).padStart(2, '0')}-01`,
    toDateStr: `${prevYear}-${String(prevMonthIdx + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  };
}

/**
 * Calculates Previous Month High & Low Gann Analysis for a stock
 */
export function calculateGannMonthData(
  stock: StockCalculated,
  dateStr: string = '2026-08-07',
  realApiData?: {
    prevMonthHigh: number;
    prevMonthHighDate: string;
    prevMonthLow: number;
    prevMonthLowDate: string;
    prevMonthClose: number;
  }
): PrevMonthGannData {
  const bounds = getMonthBounds(dateStr);
  const symUpper = (stock.symbol || '').toUpperCase();
  let defaultPrice = 1000;
  if (symUpper.includes('BANKNIFTY') || symUpper.includes('BANK NIFTY')) {
    defaultPrice = 52420;
  } else if (symUpper.includes('NIFTY')) {
    defaultPrice = 24850;
  }

  const cmp = stock.closePrice || stock.openPrice || defaultPrice;
  const openPrice = stock.openPrice || cmp;
  
  let pmh = 0;
  let pmhDate = '';
  let pml = 0;
  let pmlDate = '';
  let pmc = cmp;
  let isReal = false;
  
  if (realApiData && realApiData.prevMonthHigh > 0 && realApiData.prevMonthLow > 0) {
    pmh = realApiData.prevMonthHigh;
    pmhDate = realApiData.prevMonthHighDate;
    pml = realApiData.prevMonthLow;
    pmlDate = realApiData.prevMonthLowDate;
    pmc = realApiData.prevMonthClose || cmp;
    isReal = true;
  } else {
    const cleanSym = symUpper.replace(/[^A-Z0-9]/g, '');
    if (cleanSym === 'NIFTY' || cleanSym === 'NIFTY50' || cleanSym === 'NIFTY50INDEX') {
      pmh = 25078.30;
      pmhDate = `31 ${bounds.shortMonth} ${bounds.prevYear}`;
      pml = 24141.80;
      pmlDate = `04 ${bounds.shortMonth} ${bounds.prevYear}`;
      pmc = 24800.00;
    } else if (cleanSym === 'BANKNIFTY' || cleanSym === 'NIFTYBANK' || cleanSym === 'BANKNIFTYINDEX') {
      pmh = 53357.70;
      pmhDate = `16 ${bounds.shortMonth} ${bounds.prevYear}`;
      pml = 51080.40;
      pmlDate = `03 ${bounds.shortMonth} ${bounds.prevYear}`;
      pmc = 52300.00;
    } else {
      // Deterministic realistic previous month High / Low and dates based on symbol hash & current price
      let hash = 0;
      for (let i = 0; i < stock.symbol.length; i++) {
        hash = (hash << 5) - hash + stock.symbol.charCodeAt(i);
        hash |= 0;
      }
      const posHash = Math.abs(hash);
      
      // Range % between 4.5% and 12.0%
      const rangePct = 4.5 + (posHash % 75) / 10;
      
      // High date between 8th and 26th of previous month
      const highDayNum = 8 + (posHash % 18);
      // Low date between 2nd and 22nd of previous month (ensuring different day from high)
      let lowDayNum = 2 + ((posHash + 7) % 20);
      if (lowDayNum === highDayNum) lowDayNum = (highDayNum % 25) + 1;
      
      const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
      pmhDate = `${pad(highDayNum)} ${bounds.shortMonth} ${bounds.prevYear}`;
      pmlDate = `${pad(lowDayNum)} ${bounds.shortMonth} ${bounds.prevYear}`;
      
      // Determine high & low relative to CMP
      const centerBias = ((posHash % 100) - 45) / 100; // -0.45 to +0.55
      const halfRange = (cmp * (rangePct / 100)) / 2;
      
      pmh = Math.round((cmp + halfRange * (1 + centerBias)) * 100) / 100;
      pml = Math.round((cmp - halfRange * (1 - centerBias)) * 100) / 100;
      pmc = Math.round((pml + (pmh - pml) * 0.6) * 100) / 100;
    }
  }
  
  const range = Math.round((pmh - pml) * 100) / 100;
  const rangePct = Math.round(((pmh - pml) / pml) * 10000) / 100;
  const midpoint = Math.round(((pmh + pml) / 2) * 100) / 100;
  
  // Gann Square of 9 Breakouts derived from Previous Month High & Low
  const sqrtHigh = Math.sqrt(pmh);
  const sqrtLow = Math.sqrt(pml);
  
  // 1/8 turn = 0.125 addition to sqrt
  const buyAbove = Math.round(Math.pow(sqrtHigh + 0.25, 2) * 100) / 100;
  const sellBelow = Math.round(Math.pow(sqrtLow - 0.25, 2) * 100) / 100;
  
  const gannTargetsUp = [
    Math.round(Math.pow(sqrtHigh + 0.375, 2) * 100) / 100,
    Math.round(Math.pow(sqrtHigh + 0.50, 2) * 100) / 100,
    Math.round(Math.pow(sqrtHigh + 0.75, 2) * 100) / 100
  ];
  
  const gannTargetsDown = [
    Math.round(Math.pow(sqrtLow - 0.375, 2) * 100) / 100,
    Math.round(Math.pow(sqrtLow - 0.50, 2) * 100) / 100,
    Math.round(Math.pow(sqrtLow - 0.75, 2) * 100) / 100
  ];
  
  // 8-Level Gann Octave Retracements
  const step = range / 8;
  const octaves = {
    level000: Math.round(pml * 100) / 100,
    level125: Math.round((pml + step * 1) * 100) / 100,
    level250: Math.round((pml + step * 2) * 100) / 100,
    level375: Math.round((pml + step * 3) * 100) / 100,
    level500: midpoint,
    level625: Math.round((pml + step * 5) * 100) / 100,
    level750: Math.round((pml + step * 6) * 100) / 100,
    level875: Math.round((pml + step * 7) * 100) / 100,
    level1000: Math.round(pmh * 100) / 100
  };
  
  // Status Classification
  let cmpStatus: PrevMonthGannData['cmpStatus'] = 'ABOVE_MIDPOINT';
  let cmpStatusLabel = '📈 Above 50% Gann Level';
  let cmpStatusBadgeClass = 'bg-blue-100 text-blue-800 border-blue-300';
  
  if (cmp >= pmh) {
    cmpStatus = 'SUPER_BULLISH';
    cmpStatusLabel = `🔥 Above ${bounds.prevMonthName.split(' ')[0]} High`;
    cmpStatusBadgeClass = 'bg-emerald-600 text-white border-emerald-700 shadow-2xs';
  } else if (cmp >= pmh * 0.985) {
    cmpStatus = 'NEAR_PMH';
    cmpStatusLabel = `🟢 Near ${bounds.prevMonthName.split(' ')[0]} High Breakout`;
    cmpStatusBadgeClass = 'bg-emerald-100 text-emerald-900 border-emerald-300';
  } else if (cmp >= midpoint) {
    cmpStatus = 'ABOVE_MIDPOINT';
    cmpStatusLabel = '📈 Above 50% Gann Midpoint';
    cmpStatusBadgeClass = 'bg-blue-50 text-blue-800 border-blue-200';
  } else if (cmp <= pml) {
    cmpStatus = 'SUPER_BEARISH';
    cmpStatusLabel = `🔴 Below ${bounds.prevMonthName.split(' ')[0]} Low`;
    cmpStatusBadgeClass = 'bg-rose-600 text-white border-rose-700 shadow-2xs';
  } else if (cmp <= pml * 1.015) {
    cmpStatus = 'NEAR_PML';
    cmpStatusLabel = `🟠 Near ${bounds.prevMonthName.split(' ')[0]} Low Support`;
    cmpStatusBadgeClass = 'bg-rose-100 text-rose-900 border-rose-300';
  } else {
    cmpStatus = 'BELOW_MIDPOINT';
    cmpStatusLabel = '📉 Below 50% Gann Midpoint';
    cmpStatusBadgeClass = 'bg-amber-50 text-amber-800 border-amber-200';
  }
  
  return {
    stockId: stock.id,
    symbol: stock.symbol,
    companyName: stock.companyName,
    targetMonth: bounds.targetMonthName,
    prevMonthName: bounds.prevMonthName,
    prevMonthStartDate: bounds.prevMonthStartDate,
    prevMonthEndDate: bounds.prevMonthEndDate,
    cmp,
    openPrice,
    prevMonthHigh: pmh,
    prevMonthHighDate: pmhDate,
    prevMonthLow: pml,
    prevMonthLowDate: pmlDate,
    prevMonthClose: pmc,
    prevMonthRange: range,
    prevMonthRangePct: rangePct,
    gannMidpoint: midpoint,
    gannBuyAbove: buyAbove,
    gannSellBelow: sellBelow,
    gannTargetsUp,
    gannTargetsDown,
    gannOctaves: octaves,
    cmpStatus,
    cmpStatusLabel,
    cmpStatusBadgeClass,
    isRealApiData: isReal
  };
}
