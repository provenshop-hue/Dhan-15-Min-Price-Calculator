/**
 * Comprehensive NSE F&O Strike Intervals and Symbol mapping.
 * Matches exact strike steps available in Dhan, Zerodha Kite, Upstox, and NSE terminal.
 */

// Specific stock overrides where NSE has fixed strike step intervals
export const NSE_SPECIFIC_STRIKE_STEPS: Record<string, number> = {
  // Indices
  'NIFTY': 50,
  'BANKNIFTY': 100,
  'FINNIFTY': 50,
  'MIDCPNIFTY': 25,
  'SENSEX': 100,
  'BANKEX': 100,

  // High Value Stocks (> 3000)
  'MRF': 500,
  'PAGEIND': 500,
  'HONAUT': 500,
  'SHREECEM': 250,
  'NESTLEIND': 25, // Split adjusted
  'BOSCHLTD': 250,
  'DIXON': 100,
  'BAJAJ-AUTO': 100,
  'HEROMOTOCO': 50,
  'BRITANNIA': 50,
  'TCS': 50,
  'LTIM': 50,
  'COFORGE': 50,
  'PERSISTENT': 50,
  'POLYCAB': 50,
  'APOLLOHOSP': 50,
  'DIVISLAB': 50,
  'DRREDDY': 50,
  'EICHERMOT': 50,
  'LT': 50,
  'ULTRACEMCO': 100,
  'MARUTI': 100,
  'NAUKRI': 50,
  'BAJFINANCE': 50,
  'BAJAJFINSV': 20,
  'BAJAJHLDNG': 100,

  // 1000 - 3000 range stocks
  'RELIANCE': 20,
  'INFY': 20,
  'HDFCBANK': 10,
  'ICICIBANK': 10,
  'KOTAKBANK': 20,
  'AXISBANK': 10,
  'SBIN': 5,
  'BHARTIARTL': 20,
  'ASIANPAINT': 25,
  'HINDUNILVR': 25,
  'TITAN': 25,
  'INDUSINDBK': 20,
  'TRENT': 50,
  'SUNPHARMA': 20,
  'CIPLA': 20,
  'GRASIM': 20,
  'JSWSTEEL': 10,
  'TATASTEEL': 1,
  'TATAMOTORS': 10,
  'NTPC': 2.5,
  'POWERGRID': 2.5,
  'ONGC': 2.5,
  'COALINDIA': 2.5,
  'HCLTECH': 20,
  'WIPRO': 5,
  'TECHM': 20,
  'ADANIENT': 20,
  'ADANIPORTS': 20,
  'ADANIPOWER': 5,
  'ADANIGREEN': 10,
  'ADANIENSOL': 10,
  'HAL': 50,
  'BEL': 2.5,
  'BHEL': 2.5,
  'BPCL': 5,
  'IOC': 1,
  'HDFCLIFE': 5,
  'SBILIFE': 10,
  'ICICIPRULI': 10,
  'HDFCAMC': 50,
  'BSE': 50,
  'CDSL': 20,
  'MCX': 50,
  'ANGELONE': 50,
  'ZOMATO': 2.5,
  'ETERNAL': 2.5,
  'PAYTM': 10,
  'JIOFIN': 2.5,
  'DLF': 10,
  'GODREJPROP': 20,
  'OBEROIRLTY': 20,
  'LODHA': 10,
  'SIEMENS': 50,
  'ABB': 50,
  'CUMMINSIND': 25,
  'CHOLAFIN': 20,
  'MUTHOOTFIN': 20,
  'MANAPPURAM': 2.5,
  'PFC': 5,
  'RECLTD': 5,
  'IRCTC': 5,
  'IRFC': 1,
  'RVNL': 2.5,
  'TVSMOTOR': 20,
  'M&M': 20,
  'ASHOKLEY': 2.5,
  'BALKRISIND': 25,
  'PIDILITIND': 25,
  'BERGEPAINT': 5,
  'COLPAL': 25,
  'DABUR': 5,
  'MARICO': 5,
  'TATACONSUM': 10,
  'ITC': 5,
  'VBL': 5,
  'UNITDSPR': 10,
  'FEDERALBNK': 2.5,
  'IDFCFIRSTB': 1,
  'PNB': 1,
  'CANBK': 1,
  'BANKBARODA': 2.5,
  'UNIONBANK': 1,
  'AUBANK': 10,
  'BANDHANBNK': 2.5,
  'ABCAPITAL': 2.5,
  'LICHSGFIN': 5,
  'CANFINHOME': 10,
  'TATAPOWER': 5,
  'JSWENERGY': 5,
  'TORNTPOWER': 20,
  'NHPC': 1,
  'VEDL': 5,
  'HINDALCO': 5,
  'NATIONALUM': 2.5,
  'NMDC': 2.5,
  'SAIL': 1,
  'JINDALSTEL': 10,
  'TATACOMM': 20,
  'INDHOTEL': 10,
  'JUBLFOOD': 5,
  'DEVYANI': 1,
  'LUPIN': 20,
  'AUROPHARMA': 10,
  'BIOCON': 2.5,
  'ALKEM': 50,
  'TORNTPHARM': 25,
  'ZYDUSLIFE': 10,
  'MANKIND': 25,
  'GLENMARK': 10,
  'LAURUSLABS': 5,
  'SYNGENE': 5,
  'IPCALAB': 10,
  'FORTIS': 5,
  'MAXHEALTH': 10,
  'LALPATHLAB': 25,
  'METROPOLIS': 20,
  'APLAPOLLO': 20,
  'ASTRAL': 20,
  'SUPREMEIND': 50,
  'HAVELLS': 20,
  'VOLTAS': 20,
  'BLUESTARCO': 20,
  'CROMPTON': 5,
  'AMBER': 50,
  'KAYNES': 50,
  'GMRINFRA': 1,
  'GMRAIRPORT': 1,
  'COCHINSHIP': 20,
  'MAZDOCK': 50,
  'GRSE': 20,
  'BDL': 20,
  'SOLARINDS': 100
};

/**
 * Returns the exact NSE Strike Step interval for any symbol and price.
 * Follows exact NSE Exchange F&O circular specifications.
 */
export function getExactNseStrikeStep(symbol: string, price: number): number {
  const cleanSym = symbol.toUpperCase().trim();
  
  if (NSE_SPECIFIC_STRIKE_STEPS[cleanSym]) {
    return NSE_SPECIFIC_STRIKE_STEPS[cleanSym];
  }

  // Index defaults
  if (cleanSym.includes('BANKNIFTY') || cleanSym.includes('SENSEX') || cleanSym.includes('BANKEX')) {
    return 100;
  }
  if (cleanSym.includes('NIFTY') || cleanSym.includes('FINNIFTY')) {
    return 50;
  }
  if (cleanSym.includes('MIDCP')) {
    return 25;
  }

  // Standard NSE Stock Option Price Tier Strike Interval Rule
  if (price < 30) return 0.5;
  if (price < 50) return 1;
  if (price < 100) return 2.5;
  if (price < 250) return 5;
  if (price < 500) return 10;
  if (price < 1000) return 20;
  if (price < 2000) return 20;
  if (price < 3500) return 25;
  if (price < 5000) return 50;
  if (price < 10000) return 100;
  if (price < 25000) return 200;
  return 500;
}

/**
 * Rounds a price to the nearest valid NSE strike price
 */
export function roundToExactNseStrike(price: number, symbol: string): number {
  if (!price || price <= 0) return 0;
  const step = getExactNseStrikeStep(symbol, price);
  
  if (step === 2.5) {
    return Math.round(price / 2.5) * 2.5;
  }
  if (step === 0.5) {
    return Math.round(price * 2) / 2;
  }
  
  return Math.round(price / step) * step;
}

/**
 * Formats strike price cleanly (e.g., 2950, 1660, 242.5)
 */
export function formatStrikePrice(strike: number): string {
  if (Number.isInteger(strike)) {
    return strike.toString();
  }
  return strike.toFixed(1).replace(/\.0$/, '');
}

/**
 * Returns complete strike ladder for terminal verification (ITM, ATM, OTM strikes)
 */
export function getNseStrikeLadder(cmp: number, symbol: string) {
  const step = getExactNseStrikeStep(symbol, cmp);
  const atm = roundToExactNseStrike(cmp, symbol);
  
  return {
    step,
    atm,
    ceStrikes: {
      deepItm: atm - (2 * step),
      itm: atm - step,
      atm: atm,
      otm: atm + step,
      deepOtm: atm + (2 * step),
    },
    peStrikes: {
      deepItm: atm + (2 * step),
      itm: atm + step,
      atm: atm,
      otm: atm - step,
      deepOtm: atm - (2 * step),
    }
  };
}
