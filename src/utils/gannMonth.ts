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
  cmpAngle: number; // MOD(SQRT(cmp)*180 - 225, 360)
  openPrice: number;
  
  prevMonthHigh: number;
  prevMonthHighDate: string; // e.g. "16 Jul 2026"
  prevMonthHighAngle: number; // MOD(SQRT(pmh)*180 - 225, 360)
  
  prevMonthLow: number;
  prevMonthLowDate: string; // e.g. "04 Jul 2026"
  prevMonthLowAngle: number; // MOD(SQRT(pml)*180 - 225, 360)
  
  prevMonthClose: number;
  prevMonthRange: number; // High - Low (C4)
  prevMonthRangePct: number; // ((High - Low) / Low) * 100
  prevMonthRangeAngle: number; // MOD(SQRT(C4)*180 - 225, 360) where C4 = PMH - PML
  
  // Time Span Analysis between PMH Date & PML Date
  pmhToPmlCalendarDays: number;
  pmhToPmlTradingDays: number;
  pmhToPmlHolidays: number;
  pmhToPmlWeekends: number;
  pmhPmlSequence: 'PMH_FIRST' | 'PML_FIRST' | 'SAME_DAY';
  pmhPmlHolidayNames: string[];
  
  calendarDaysAngle: number; // MOD(SQRT(CalendarDays)*180 - 225, 360)
  tradingDaysAngle: number; // MOD(SQRT(TradingDays)*180 - 225, 360)
  lowestDegree: number; // Min of (Range Degree, Calendar Days Degree, Trading Days Degree)
  lowestDegreeSource: string; // 'Range (C4)' | 'Calendar Days' | 'Trading Days'
  highestDegree: number; // Max of (Range Degree, Calendar Days Degree, Trading Days Degree)
  highestDegreeSource: string; // 'Range (C4)' | 'Calendar Days' | 'Trading Days'
  
  minAngleIterativeLevels: GannIterativeLevel[]; // Formula: (2*N + 2*A/365 + 1.25)^2 for N=1..7 with Min Angle A
  maxAngleIterativeLevels: GannIterativeLevel[]; // Formula: (2*N + 2*A/365 + 1.25)^2 for N=1..7 with Max Angle A
  
  gannMidpoint: number; // (High + Low) / 2
  gannMidpointAngle: number;
  
  gannBuyAbove: number; // Gann Square of 9 breakout target level above PMH
  gannBuyAboveAngle: number;
  gannSellBelow: number; // Gann Square of 9 breakdown target level below PML
  gannSellBelowAngle: number;
  
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
 * Official NSE Trading Holidays for 2026
 */
export const NSE_HOLIDAYS_2026: Record<string, string> = {
  '2026-01-15': 'Municipal Corporation Election - Maharashtra',
  '2026-01-26': 'Republic Day',
  '2026-02-15': 'Mahashivratri (Sunday)',
  '2026-03-03': 'Holi',
  '2026-03-21': 'Id-Ul-Fitr / Ramadan Eid (Saturday)',
  '2026-03-26': 'Shri Ram Navami',
  '2026-03-31': 'Shri Mahavir Jayanti',
  '2026-04-03': 'Good Friday',
  '2026-04-14': 'Dr. Baba Saheb Ambedkar Jayanti',
  '2026-05-01': 'Maharashtra Day',
  '2026-05-28': 'Bakri Id',
  '2026-06-26': 'Muharram',
  '2026-08-15': 'Independence Day (Saturday)',
  '2026-09-14': 'Ganesh Chaturthi',
  '2026-10-02': 'Mahatma Gandhi Jayanti',
  '2026-10-20': 'Dussehra',
  '2026-11-08': 'Diwali Laxmi Pujan (Sunday)',
  '2026-11-10': 'Diwali-Balipratipada',
  '2026-11-24': 'Prakash Gurpurb Sri Guru Nanak Dev',
  '2026-12-25': 'Christmas',
};

/**
 * Parses date string in various formats (e.g. "16 Jul 2026", "2026-07-16", "16/07/2026") into a Date object
 */
export function parseDateString(dateStr: string): Date | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();
  
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) return d;
  
  const monthMap: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };
  
  const parts = trimmed.split(/\s+|-|\//);
  if (parts.length === 3) {
    let day = parseInt(parts[0], 10);
    let monthStr = parts[1].toLowerCase().substring(0, 3);
    let year = parseInt(parts[2], 10);
    
    if (parts[0].length === 4) {
      year = parseInt(parts[0], 10);
      monthStr = parts[1].toLowerCase().substring(0, 3);
      day = parseInt(parts[2], 10);
    }
    
    if (!isNaN(day) && monthMap[monthStr] !== undefined && !isNaN(year)) {
      return new Date(year, monthMap[monthStr], day);
    }
  }
  
  return null;
}

/**
 * Calculates Calendar Days vs Trading Days between PMH Date & PML Date
 * Subtracts weekend days (Sat/Sun) and NSE trading holidays
 */
export function calculateTradingTimeSpan(pmhDateStr: string, pmlDateStr: string) {
  const dtHigh = parseDateString(pmhDateStr);
  const dtLow = parseDateString(pmlDateStr);
  
  if (!dtHigh || !dtLow) {
    return {
      calendarDays: 0,
      tradingDays: 0,
      holidaysSubtracted: 0,
      weekendDaysSubtracted: 0,
      holidayNames: [] as string[],
      sequence: 'SAME_DAY' as const,
    };
  }
  
  const highTime = dtHigh.getTime();
  const lowTime = dtLow.getTime();
  
  let sequence: 'PMH_FIRST' | 'PML_FIRST' | 'SAME_DAY' = 'SAME_DAY';
  if (highTime < lowTime) {
    sequence = 'PMH_FIRST';
  } else if (lowTime < highTime) {
    sequence = 'PML_FIRST';
  } else {
    return {
      calendarDays: 0,
      tradingDays: 0,
      holidaysSubtracted: 0,
      weekendDaysSubtracted: 0,
      holidayNames: [],
      sequence: 'SAME_DAY' as const,
    };
  }
  
  const startDate = new Date(Math.min(highTime, lowTime));
  const endDate = new Date(Math.max(highTime, lowTime));
  
  const calendarDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  let tradingDays = 0;
  let holidaysSubtracted = 0;
  let weekendDaysSubtracted = 0;
  const holidayNames: string[] = [];
  
  const curr = new Date(startDate.getTime());
  while (curr.getTime() < endDate.getTime()) {
    curr.setDate(curr.getDate() + 1);
    
    const dayOfWeek = curr.getDay(); // 0 = Sun, 6 = Sat
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      weekendDaysSubtracted++;
    } else {
      const yyyy = curr.getFullYear();
      const mm = String(curr.getMonth() + 1).padStart(2, '0');
      const dd = String(curr.getDate()).padStart(2, '0');
      const dateKey = `${yyyy}-${mm}-${dd}`;
      
      if (NSE_HOLIDAYS_2026[dateKey]) {
        holidaysSubtracted++;
        holidayNames.push(`${NSE_HOLIDAYS_2026[dateKey]} (${dd}/${mm})`);
      } else {
        tradingDays++;
      }
    }
  }
  
  return {
    calendarDays,
    tradingDays,
    holidaysSubtracted,
    weekendDaysSubtracted,
    holidayNames,
    sequence,
  };
}

/**
 * Calculates Gann Angle / Degree for a given price using the Square of 9 formula:
 * MOD(SQRT(Price) * 180 - 225, 360)
 */
export function calculateGannAngle(price: number): number {
  if (!price || price <= 0) return 0;
  const rawValue = Math.sqrt(price) * 180 - 225;
  const angle = ((rawValue % 360) + 360) % 360;
  return Math.round(angle * 100) / 100;
}

export interface GannIterativeLevel {
  n: number;
  level: number;
  degree: number;
  daysAdded: number;
  projectedDate: string;
  projectedDayName: string;
  baseDate: string;
}

/**
  * Applies formula (2*N + 2*(A/365) + 1.25)^2 for N = 1..7
  * where A is the given angle (e.g. Minimum Angle or Maximum Angle).
  * Adds each output degree as days to the baseDate (High Appeared Date or Low Appeared Date)
  * to generate 7 projected target dates in that month/future.
  */
export function calculateGannIterativeFormula(angle: number, baseDateStr?: string): GannIterativeLevel[] {
  const levels: GannIterativeLevel[] = [];
  const baseDateObj = baseDateStr ? (parseDateString(baseDateStr) || new Date()) : new Date();
  
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let n = 1; n <= 7; n++) {
    const rawLevel = Math.pow(2 * n + 2 * (angle / 365) + 1.25, 2);
    const level = Math.round(rawLevel * 100) / 100;
    const degree = calculateGannAngle(level);
    
    // Add Projected Level (as calendar days) to High or Low Appeared Date
    const daysToAdd = Math.round(level);
    const targetDateObj = new Date(baseDateObj.getTime() + daysToAdd * 86400000);
    
    const projectedDate = `${pad(targetDateObj.getDate())} ${monthNames[targetDateObj.getMonth()]} ${targetDateObj.getFullYear()}`;
    const projectedDayName = dayNames[targetDateObj.getDay()];

    levels.push({
      n,
      level,
      degree,
      daysAdded: daysToAdd,
      projectedDate,
      projectedDayName,
      baseDate: baseDateStr || '',
    });
  }
  return levels;
}

/**
 * Finds the Lowest Degree and Highest Degree among:
 * 1. Range Gann Degree (C4)
 * 2. Calendar Days Degree
 * 3. Trading Days Degree
 */
export function findMinMaxDegrees(
  rangeAngle: number,
  calendarDaysAngle: number,
  tradingDaysAngle: number
) {
  const items = [
    { degree: rangeAngle, source: 'Range (C4)' },
    { degree: calendarDaysAngle, source: 'Calendar Days' },
    { degree: tradingDaysAngle, source: 'Trading Days' },
  ];

  items.sort((a, b) => a.degree - b.degree);

  const lowest = items[0];
  const highest = items[items.length - 1];

  return {
    calendarDaysAngle,
    tradingDaysAngle,
    lowestDegree: lowest.degree,
    lowestDegreeSource: lowest.source,
    highestDegree: highest.degree,
    highestDegreeSource: highest.source,
  };
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
  } else if (symUpper.includes('SENSEX')) {
    defaultPrice = 81500;
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
    } else if (cleanSym === 'SENSEX' || cleanSym === 'BSESENSEX' || cleanSym === 'SENSEX50') {
      pmh = 82500.00;
      pmhDate = `16 ${bounds.shortMonth} ${bounds.prevYear}`;
      pml = 79500.00;
      pmlDate = `03 ${bounds.shortMonth} ${bounds.prevYear}`;
      pmc = 81200.00;
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
  
  // Gann Angle / Degree calculations using formula MOD(SQRT(Price)*180-225, 360)
  const pmhAngle = calculateGannAngle(pmh);
  const pmlAngle = calculateGannAngle(pml);
  const rangeAngle = calculateGannAngle(range); // C4 = PMH - PML
  const cmpAngle = calculateGannAngle(cmp);
  const midpointAngle = calculateGannAngle(midpoint);
  const buyAboveAngle = calculateGannAngle(buyAbove);
  const sellBelowAngle = calculateGannAngle(sellBelow);

  // Time Span Analysis (Calendar Days vs Trading Days & Trading Holidays Subtraction)
  const timeSpan = calculateTradingTimeSpan(pmhDate, pmlDate);
  const calendarDaysAngle = calculateGannAngle(timeSpan.calendarDays);
  const tradingDaysAngle = calculateGannAngle(timeSpan.tradingDays);

  // Compare 3 Degrees: Range Gann Degree (C4), Calendar Days Degree, Trading Days Degree
  const degreeComp = findMinMaxDegrees(rangeAngle, calendarDaysAngle, tradingDaysAngle);

  // Compute 7-Iteration formula (2*N + 2*A/365 + 1.25)^2 for Lowest & Highest Degrees
  // Minimum Angle output degrees added to High Appeared Date (pmhDate)
  // Maximum Angle output degrees added to Low Appeared Date (pmlDate)
  const minAngleIterativeLevels = calculateGannIterativeFormula(degreeComp.lowestDegree, pmhDate);
  const maxAngleIterativeLevels = calculateGannIterativeFormula(degreeComp.highestDegree, pmlDate);

  return {
    stockId: stock.id,
    symbol: stock.symbol,
    companyName: stock.companyName,
    targetMonth: bounds.targetMonthName,
    prevMonthName: bounds.prevMonthName,
    prevMonthStartDate: bounds.prevMonthStartDate,
    prevMonthEndDate: bounds.prevMonthEndDate,
    cmp,
    cmpAngle,
    openPrice,
    prevMonthHigh: pmh,
    prevMonthHighDate: pmhDate,
    prevMonthHighAngle: pmhAngle,
    prevMonthLow: pml,
    prevMonthLowDate: pmlDate,
    prevMonthLowAngle: pmlAngle,
    prevMonthClose: pmc,
    prevMonthRange: range,
    prevMonthRangePct: rangePct,
    prevMonthRangeAngle: rangeAngle,
    pmhToPmlCalendarDays: timeSpan.calendarDays,
    pmhToPmlTradingDays: timeSpan.tradingDays,
    pmhToPmlHolidays: timeSpan.holidaysSubtracted,
    pmhToPmlWeekends: timeSpan.weekendDaysSubtracted,
    pmhPmlSequence: timeSpan.sequence,
    pmhPmlHolidayNames: timeSpan.holidayNames,
    calendarDaysAngle,
    tradingDaysAngle,
    lowestDegree: degreeComp.lowestDegree,
    lowestDegreeSource: degreeComp.lowestDegreeSource,
    highestDegree: degreeComp.highestDegree,
    highestDegreeSource: degreeComp.highestDegreeSource,
    minAngleIterativeLevels,
    maxAngleIterativeLevels,
    gannMidpoint: midpoint,
    gannMidpointAngle: midpointAngle,
    gannBuyAbove: buyAbove,
    gannBuyAboveAngle: buyAboveAngle,
    gannSellBelow: sellBelow,
    gannSellBelowAngle: sellBelowAngle,
    gannTargetsUp,
    gannTargetsDown,
    gannOctaves: octaves,
    cmpStatus,
    cmpStatusLabel,
    cmpStatusBadgeClass,
    isRealApiData: isReal
  };
}
