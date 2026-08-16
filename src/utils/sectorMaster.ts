import { StockCalculated } from '../types';

export interface SectorMetric {
  sectorKey: string;
  sectorName: string;
  categoryIcon: string;
  totalStocks: number;
  validStocksCount: number;
  avgPctChange: number; // e.g. +1.45 or -0.82
  advancingCount: number;
  decliningCount: number;
  neutralCount: number;
  bullishBreadthPct: number; // 0 to 100 (%)
  sectorBias: 'STRONG_BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'STRONG_BEARISH';
  leaderSymbol?: string;
  leaderPct?: number;
  laggardSymbol?: string;
  laggardPct?: number;
}

export interface StockSectorAnalysis {
  sectorKey: string;
  sectorName: string;
  categoryIcon: string;
  sectorAvgPct: number;
  sectorBullishBreadthPct: number;
  sectorBias: 'STRONG_BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'STRONG_BEARISH';
  sectorTotalStocks: number;
  sectorAdvancing: number;
  sectorDeclining: number;
  tradeVerdict: 'ENTER' | 'CAUTION' | 'AVOID';
  verdictLabel: string;
  verdictDescription: string;
  badgeBg: string;
  badgeTextColor: string;
  badgeBorderColor: string;
  isAligned: boolean;
  scoreAdjustment: number;
}

// Master Sector Dictionary for all F&O / Nifty Futures stocks
export const STOCK_SECTOR_MAP: Record<string, { sectorKey: string; sectorName: string; icon: string }> = {
  // --- BANKING - PRIVATE ---
  'HDFCBANK': { sectorKey: 'PVT_BANK', sectorName: 'Banking (Private)', icon: '🏦' },
  'ICICIBANK': { sectorKey: 'PVT_BANK', sectorName: 'Banking (Private)', icon: '🏦' },
  'AXISBANK': { sectorKey: 'PVT_BANK', sectorName: 'Banking (Private)', icon: '🏦' },
  'KOTAKBANK': { sectorKey: 'PVT_BANK', sectorName: 'Banking (Private)', icon: '🏦' },
  'INDUSINDBK': { sectorKey: 'PVT_BANK', sectorName: 'Banking (Private)', icon: '🏦' },
  'AUBANK': { sectorKey: 'PVT_BANK', sectorName: 'Banking (Private)', icon: '🏦' },
  'BANDHANBNK': { sectorKey: 'PVT_BANK', sectorName: 'Banking (Private)', icon: '🏦' },
  'FEDERALBNK': { sectorKey: 'PVT_BANK', sectorName: 'Banking (Private)', icon: '🏦' },
  'IDFCFIRSTB': { sectorKey: 'PVT_BANK', sectorName: 'Banking (Private)', icon: '🏦' },
  'RBLBANK': { sectorKey: 'PVT_BANK', sectorName: 'Banking (Private)', icon: '🏦' },
  'YESBANK': { sectorKey: 'PVT_BANK', sectorName: 'Banking (Private)', icon: '🏦' },
  'BANKNIFTY': { sectorKey: 'PVT_BANK', sectorName: 'Banking Index', icon: '🏦' },

  // --- BANKING - PSU ---
  'SBIN': { sectorKey: 'PSU_BANK', sectorName: 'Banking (PSU)', icon: '🏛️' },
  'BANKBARODA': { sectorKey: 'PSU_BANK', sectorName: 'Banking (PSU)', icon: '🏛️' },
  'BANKINDIA': { sectorKey: 'PSU_BANK', sectorName: 'Banking (PSU)', icon: '🏛️' },
  'CANBK': { sectorKey: 'PSU_BANK', sectorName: 'Banking (PSU)', icon: '🏛️' },
  'INDIANB': { sectorKey: 'PSU_BANK', sectorName: 'Banking (PSU)', icon: '🏛️' },
  'PNB': { sectorKey: 'PSU_BANK', sectorName: 'Banking (PSU)', icon: '🏛️' },
  'UNIONBANK': { sectorKey: 'PSU_BANK', sectorName: 'Banking (PSU)', icon: '🏛️' },

  // --- IT & TECHNOLOGY ---
  'TCS': { sectorKey: 'IT', sectorName: 'IT & Software', icon: '💻' },
  'INFY': { sectorKey: 'IT', sectorName: 'IT & Software', icon: '💻' },
  'HCLTECH': { sectorKey: 'IT', sectorName: 'IT & Software', icon: '💻' },
  'WIPRO': { sectorKey: 'IT', sectorName: 'IT & Software', icon: '💻' },
  'TECHM': { sectorKey: 'IT', sectorName: 'IT & Software', icon: '💻' },
  'LTM': { sectorKey: 'IT', sectorName: 'IT & Software', icon: '💻' },
  'COFORGE': { sectorKey: 'IT', sectorName: 'IT & Software', icon: '💻' },
  'PERSISTENT': { sectorKey: 'IT', sectorName: 'IT & Software', icon: '💻' },
  'MPHASIS': { sectorKey: 'IT', sectorName: 'IT & Software', icon: '💻' },
  'KPITTECH': { sectorKey: 'IT', sectorName: 'IT & Software', icon: '💻' },
  'OFSS': { sectorKey: 'IT', sectorName: 'IT & Software', icon: '💻' },
  'TATAELXSI': { sectorKey: 'IT', sectorName: 'IT & Software', icon: '💻' },
  'NAUKRI': { sectorKey: 'IT', sectorName: 'Internet & Tech', icon: '🌐' },

  // --- AUTO & AUTO ANCILLARIES ---
  'MARUTI': { sectorKey: 'AUTO', sectorName: 'Auto & EV', icon: '🚗' },
  'TMPV': { sectorKey: 'AUTO', sectorName: 'Auto & EV', icon: '🚗' },
  'TATAMOTORS': { sectorKey: 'AUTO', sectorName: 'Auto & EV', icon: '🚗' },
  'M&M': { sectorKey: 'AUTO', sectorName: 'Auto & EV', icon: '🚗' },
  'BAJAJ-AUTO': { sectorKey: 'AUTO', sectorName: 'Auto & EV', icon: '🏍️' },
  'HEROMOTOCO': { sectorKey: 'AUTO', sectorName: 'Auto & EV', icon: '🏍️' },
  'EICHERMOT': { sectorKey: 'AUTO', sectorName: 'Auto & EV', icon: '🏍️' },
  'TVSMOTOR': { sectorKey: 'AUTO', sectorName: 'Auto & EV', icon: '🏍️' },
  'ASHOKLEY': { sectorKey: 'AUTO', sectorName: 'Auto & Commercial', icon: '🚚' },
  'FORCEMOT': { sectorKey: 'AUTO', sectorName: 'Auto & Commercial', icon: '🚚' },
  'HYUNDAI': { sectorKey: 'AUTO', sectorName: 'Auto & EV', icon: '🚗' },
  'BHARATFORG': { sectorKey: 'AUTO_ANC', sectorName: 'Auto Ancillary', icon: '⚙️' },
  'BOSCHLTD': { sectorKey: 'AUTO_ANC', sectorName: 'Auto Ancillary', icon: '⚙️' },
  'MOTHERSON': { sectorKey: 'AUTO_ANC', sectorName: 'Auto Ancillary', icon: '⚙️' },
  'SONACOMS': { sectorKey: 'AUTO_ANC', sectorName: 'Auto Ancillary', icon: '⚙️' },
  'UNOMINDA': { sectorKey: 'AUTO_ANC', sectorName: 'Auto Ancillary', icon: '⚙️' },
  'TIINDIA': { sectorKey: 'AUTO_ANC', sectorName: 'Auto Ancillary', icon: '⚙️' },
  'EXIDEIND': { sectorKey: 'AUTO_ANC', sectorName: 'Auto Battery', icon: '🔋' },

  // --- OIL & GAS / ENERGY / POWER ---
  'RELIANCE': { sectorKey: 'ENERGY', sectorName: 'Oil, Gas & Energy', icon: '🛢️' },
  'ONGC': { sectorKey: 'ENERGY', sectorName: 'Oil, Gas & Exploration', icon: '⛽' },
  'BPCL': { sectorKey: 'ENERGY', sectorName: 'Oil & Refining', icon: '⛽' },
  'IOC': { sectorKey: 'ENERGY', sectorName: 'Oil & Refining', icon: '⛽' },
  'HINDPETRO': { sectorKey: 'ENERGY', sectorName: 'Oil & Refining', icon: '⛽' },
  'GAIL': { sectorKey: 'ENERGY', sectorName: 'Gas & Distribution', icon: '🔥' },
  'PETRONET': { sectorKey: 'ENERGY', sectorName: 'Gas & LNG', icon: '🔥' },
  'OIL': { sectorKey: 'ENERGY', sectorName: 'Oil Exploration', icon: '🛢️' },
  'NTPC': { sectorKey: 'POWER', sectorName: 'Power & Generation', icon: '⚡' },
  'POWERGRID': { sectorKey: 'POWER', sectorName: 'Power Transmission', icon: '⚡' },
  'TATAPOWER': { sectorKey: 'POWER', sectorName: 'Power & Renewables', icon: '⚡' },
  'JSWENERGY': { sectorKey: 'POWER', sectorName: 'Power & Generation', icon: '⚡' },
  'NHPC': { sectorKey: 'POWER', sectorName: 'Hydro Power', icon: '💧' },
  'ADANIPOWER': { sectorKey: 'POWER', sectorName: 'Power Generation', icon: '⚡' },
  'ADANIGREEN': { sectorKey: 'POWER', sectorName: 'Green Energy', icon: '🌱' },
  'ADANIENSOL': { sectorKey: 'POWER', sectorName: 'Energy Solutions', icon: '⚡' },
  'INOXWIND': { sectorKey: 'POWER', sectorName: 'Wind Energy', icon: '💨' },
  'SUZLON': { sectorKey: 'POWER', sectorName: 'Wind Energy', icon: '💨' },
  'PREMIERENE': { sectorKey: 'POWER', sectorName: 'Solar & Clean Tech', icon: '☀️' },
  'WAAREEENER': { sectorKey: 'POWER', sectorName: 'Solar Energy', icon: '☀️' },
  'IEX': { sectorKey: 'POWER', sectorName: 'Energy Exchange', icon: '💡' },

  // --- METALS & MINING ---
  'TATASTEEL': { sectorKey: 'METALS', sectorName: 'Metals & Steel', icon: '🏗️' },
  'JSWSTEEL': { sectorKey: 'METALS', sectorName: 'Metals & Steel', icon: '🏗️' },
  'HINDALCO': { sectorKey: 'METALS', sectorName: 'Aluminium & Copper', icon: '🪙' },
  'JINDALSTEL': { sectorKey: 'METALS', sectorName: 'Metals & Steel', icon: '🏗️' },
  'VEDL': { sectorKey: 'METALS', sectorName: 'Mining & Diversified', icon: '⛏️' },
  'COALINDIA': { sectorKey: 'METALS', sectorName: 'Coal Mining', icon: '⛏️' },
  'NMDC': { sectorKey: 'METALS', sectorName: 'Iron Ore Mining', icon: '⛏️' },
  'NATIONALUM': { sectorKey: 'METALS', sectorName: 'Aluminium', icon: '🪙' },
  'SAIL': { sectorKey: 'METALS', sectorName: 'Metals & Steel', icon: '🏗️' },
  'HINDZINC': { sectorKey: 'METALS', sectorName: 'Zinc & Silver', icon: '🪙' },
  'APLAPOLLO': { sectorKey: 'METALS', sectorName: 'Steel Pipes & Tubes', icon: '🛠️' },

  // --- PHARMA & HEALTHCARE ---
  'SUNPHARMA': { sectorKey: 'PHARMA', sectorName: 'Pharma & Formulations', icon: '💊' },
  'DRREDDY': { sectorKey: 'PHARMA', sectorName: 'Pharma & Healthcare', icon: '💊' },
  'CIPLA': { sectorKey: 'PHARMA', sectorName: 'Pharma & Generics', icon: '💊' },
  'DIVISLAB': { sectorKey: 'PHARMA', sectorName: 'Pharma & API', icon: '🧪' },
  'LUPIN': { sectorKey: 'PHARMA', sectorName: 'Pharma & Formulations', icon: '💊' },
  'AUROPHARMA': { sectorKey: 'PHARMA', sectorName: 'Pharma & Healthcare', icon: '💊' },
  'ALKEM': { sectorKey: 'PHARMA', sectorName: 'Pharma Labs', icon: '💊' },
  'BIOCON': { sectorKey: 'PHARMA', sectorName: 'Biopharma', icon: '🧬' },
  'GLENMARK': { sectorKey: 'PHARMA', sectorName: 'Pharma & Healthcare', icon: '💊' },
  'LAURUSLABS': { sectorKey: 'PHARMA', sectorName: 'Pharma & API', icon: '🧪' },
  'MANKIND': { sectorKey: 'PHARMA', sectorName: 'Pharma & Consumer Health', icon: '💊' },
  'TORNTPHARM': { sectorKey: 'PHARMA', sectorName: 'Pharma & Healthcare', icon: '💊' },
  'ZYDUSLIFE': { sectorKey: 'PHARMA', sectorName: 'Life Sciences', icon: '💊' },
  'APOLLOHOSP': { sectorKey: 'HEALTHCARE', sectorName: 'Hospitals & Healthcare', icon: '🏥' },
  'FORTIS': { sectorKey: 'HEALTHCARE', sectorName: 'Hospitals & Healthcare', icon: '🏥' },
  'MAXHEALTH': { sectorKey: 'HEALTHCARE', sectorName: 'Hospitals & Healthcare', icon: '🏥' },

  // --- FINANCIAL SERVICES / NBFC / INSURANCE ---
  'BAJFINANCE': { sectorKey: 'FIN_SERVICES', sectorName: 'Financial Services / NBFC', icon: '💳' },
  'BAJAJFINSV': { sectorKey: 'FIN_SERVICES', sectorName: 'Fintech & Holdco', icon: '💳' },
  'BAJAJHLDNG': { sectorKey: 'FIN_SERVICES', sectorName: 'Financial Holdings', icon: '📈' },
  'CHOLAFIN': { sectorKey: 'FIN_SERVICES', sectorName: 'Vehicle Finance / NBFC', icon: '💳' },
  'MUTHOOTFIN': { sectorKey: 'FIN_SERVICES', sectorName: 'Gold Loans & NBFC', icon: '🪙' },
  'SHRIRAMFIN': { sectorKey: 'FIN_SERVICES', sectorName: 'Commercial NBFC', icon: '💳' },
  'PFC': { sectorKey: 'FIN_SERVICES', sectorName: 'Power Finance / NBFC', icon: '🏛️' },
  'RECLTD': { sectorKey: 'FIN_SERVICES', sectorName: 'Rural Electrification / NBFC', icon: '🏛️' },
  'IRFC': { sectorKey: 'FIN_SERVICES', sectorName: 'Railway Finance', icon: '🚆' },
  'IREDA': { sectorKey: 'FIN_SERVICES', sectorName: 'Renewable Finance', icon: '🌱' },
  'ABCAPITAL': { sectorKey: 'FIN_SERVICES', sectorName: 'Financial Services', icon: '💳' },
  'LTF': { sectorKey: 'FIN_SERVICES', sectorName: 'NBFC & Retail Loans', icon: '💳' },
  'MANAPPURAM': { sectorKey: 'FIN_SERVICES', sectorName: 'Gold Loans / NBFC', icon: '🪙' },
  'LICHSGFIN': { sectorKey: 'FIN_SERVICES', sectorName: 'Housing Finance', icon: '🏠' },
  'PNBHOUSING': { sectorKey: 'FIN_SERVICES', sectorName: 'Housing Finance', icon: '🏠' },
  'SAMMAANCAP': { sectorKey: 'FIN_SERVICES', sectorName: 'Housing Finance', icon: '🏠' },
  'HDFCLIFE': { sectorKey: 'INSURANCE', sectorName: 'Life Insurance', icon: '🛡️' },
  'SBILIFE': { sectorKey: 'INSURANCE', sectorName: 'Life Insurance', icon: '🛡️' },
  'ICICIPRULI': { sectorKey: 'INSURANCE', sectorName: 'Life Insurance', icon: '🛡️' },
  'ICICIGI': { sectorKey: 'INSURANCE', sectorName: 'General Insurance', icon: '🛡️' },
  'LICI': { sectorKey: 'INSURANCE', sectorName: 'Life Insurance', icon: '🛡️' },
  'MFSL': { sectorKey: 'INSURANCE', sectorName: 'Insurance & Financial', icon: '🛡️' },
  'HDFCAMC': { sectorKey: 'CAP_MARKETS', sectorName: 'Asset Management', icon: '📊' },
  'NAM-INDIA': { sectorKey: 'CAP_MARKETS', sectorName: 'Asset Management', icon: '📊' },
  'BSE': { sectorKey: 'CAP_MARKETS', sectorName: 'Stock Exchanges', icon: '🏛️' },
  'CDSL': { sectorKey: 'CAP_MARKETS', sectorName: 'Depositories & Registry', icon: '💾' },
  'MCX': { sectorKey: 'CAP_MARKETS', sectorName: 'Commodity Exchange', icon: '📊' },
  'CAMS': { sectorKey: 'CAP_MARKETS', sectorName: 'RTA & Fin Infrastructure', icon: '📋' },
  'KFINTECH': { sectorKey: 'CAP_MARKETS', sectorName: 'RTA & Fin Services', icon: '📋' },
  'ANGELONE': { sectorKey: 'CAP_MARKETS', sectorName: 'Retail Broking & Fintech', icon: '📱' },
  'MOTILALOFS': { sectorKey: 'CAP_MARKETS', sectorName: 'Securities & Wealth', icon: '📊' },
  'NUVAMA': { sectorKey: 'CAP_MARKETS', sectorName: 'Wealth Management', icon: '💎' },
  'POLICYBZR': { sectorKey: 'FIN_SERVICES', sectorName: 'Fintech & Insurance Aggregator', icon: '🛡️' },
  'JIOFIN': { sectorKey: 'FIN_SERVICES', sectorName: 'Digital Financial Services', icon: '📱' },
  'SBICARD': { sectorKey: 'FIN_SERVICES', sectorName: 'Credit Cards & Payments', icon: '💳' },

  // --- FMCG & CONSUMPTION ---
  'HINDUNILVR': { sectorKey: 'FMCG', sectorName: 'FMCG & Household', icon: '🧴' },
  'ITC': { sectorKey: 'FMCG', sectorName: 'FMCG & Cigarettes', icon: '📦' },
  'NESTLEIND': { sectorKey: 'FMCG', sectorName: 'FMCG & Foods', icon: '🍫' },
  'BRITANNIA': { sectorKey: 'FMCG', sectorName: 'FMCG & Bakery', icon: '🍪' },
  'TATACONSUM': { sectorKey: 'FMCG', sectorName: 'FMCG & Beverages', icon: '☕' },
  'DABUR': { sectorKey: 'FMCG', sectorName: 'FMCG & Ayurveda', icon: '🌿' },
  'MARICO': { sectorKey: 'FMCG', sectorName: 'FMCG & Personal Care', icon: '🧴' },
  'GODREJCP': { sectorKey: 'FMCG', sectorName: 'FMCG & Home Care', icon: '🧼' },
  'COLPAL': { sectorKey: 'FMCG', sectorName: 'FMCG & Oral Care', icon: '🪥' },
  'RADICO': { sectorKey: 'FMCG', sectorName: 'Alcohol & Spirits', icon: '🍾' },
  'UNITDSPR': { sectorKey: 'FMCG', sectorName: 'Alcohol & Spirits', icon: '🍷' },
  'PATANJALI': { sectorKey: 'FMCG', sectorName: 'FMCG & Edible Oils', icon: '🌻' },
  'GODFRYPHLP': { sectorKey: 'FMCG', sectorName: 'Tobacco & Consumer', icon: '🚬' },
  'VBL': { sectorKey: 'FMCG', sectorName: 'Beverages & Bottling', icon: '🥤' },

  // --- INFRASTRUCTURE, CAPITAL GOODS & DEFENCE ---
  'LT': { sectorKey: 'INFRA_CAPGOODS', sectorName: 'Infra & Engineering EPC', icon: '🏗️' },
  'SIEMENS': { sectorKey: 'INFRA_CAPGOODS', sectorName: 'Industrial Automation', icon: '⚙️' },
  'ABB': { sectorKey: 'INFRA_CAPGOODS', sectorName: 'Electrification & Robotics', icon: '🤖' },
  'BHEL': { sectorKey: 'INFRA_CAPGOODS', sectorName: 'Heavy Electricals', icon: '🏭' },
  'BEL': { sectorKey: 'DEFENCE', sectorName: 'Defence Electronics', icon: '🛡️' },
  'HAL': { sectorKey: 'DEFENCE', sectorName: 'Aerospace & Defence', icon: '✈️' },
  'BDL': { sectorKey: 'DEFENCE', sectorName: 'Defence Missiles', icon: '🚀' },
  'MAZDOCK': { sectorKey: 'DEFENCE', sectorName: 'Defence Shipbuilders', icon: '🚢' },
  'COCHINSHIP': { sectorKey: 'DEFENCE', sectorName: 'Shipbuilding & Marine', icon: '🚢' },
  'RVNL': { sectorKey: 'INFRA_CAPGOODS', sectorName: 'Rail Infrastructure', icon: '🚆' },
  'NBCC': { sectorKey: 'INFRA_CAPGOODS', sectorName: 'Civil Construction', icon: '🏢' },
  'CGPOWER': { sectorKey: 'INFRA_CAPGOODS', sectorName: 'Power & Industrial Goods', icon: '⚡' },
  'GVT&D': { sectorKey: 'INFRA_CAPGOODS', sectorName: 'Grid Solutions', icon: '⚡' },
  'POWERINDIA': { sectorKey: 'INFRA_CAPGOODS', sectorName: 'Hitachi Grid Energy', icon: '⚡' },
  'CUMMINSIND': { sectorKey: 'INFRA_CAPGOODS', sectorName: 'Engines & Generators', icon: '⚙️' },
  'HAVELLS': { sectorKey: 'CONSUMER_DURABLES', sectorName: 'Consumer Electricals', icon: '💡' },
  'VOLTAS': { sectorKey: 'CONSUMER_DURABLES', sectorName: 'Air Conditioners & Cooling', icon: '❄️' },
  'BLUESTARCO': { sectorKey: 'CONSUMER_DURABLES', sectorName: 'Commercial Cooling', icon: '❄️' },
  'POLYCAB': { sectorKey: 'CONSUMER_DURABLES', sectorName: 'Wires & Cables', icon: '🔌' },
  'KEI': { sectorKey: 'CONSUMER_DURABLES', sectorName: 'Wires & Cables', icon: '🔌' },
  'AMBER': { sectorKey: 'CONSUMER_DURABLES', sectorName: 'HVAC & Electronics EMS', icon: '❄️' },
  'KAYNES': { sectorKey: 'CONSUMER_DURABLES', sectorName: 'Electronics Manufacturing EMS', icon: '📟' },
  'PGEL': { sectorKey: 'CONSUMER_DURABLES', sectorName: 'Plastic & Electronics EMS', icon: '📺' },
  'CROMPTON': { sectorKey: 'CONSUMER_DURABLES', sectorName: 'Consumer Electricals', icon: '💡' },
  'DIXON': { sectorKey: 'CONSUMER_DURABLES', sectorName: 'Electronics EMS & Tech', icon: '📱' },
  'SOLARINDS': { sectorKey: 'INFRA_CAPGOODS', sectorName: 'Industrial Explosives', icon: '💥' },

  // --- REAL ESTATE & REALTY ---
  'DLF': { sectorKey: 'REALTY', sectorName: 'Real Estate & Realty', icon: '🏙️' },
  'GODREJPROP': { sectorKey: 'REALTY', sectorName: 'Real Estate & Realty', icon: '🏙️' },
  'OBEROIRLTY': { sectorKey: 'REALTY', sectorName: 'Real Estate & Luxury', icon: '🏙️' },
  'PHOENIXLTD': { sectorKey: 'REALTY', sectorName: 'Commercial Malls & Realty', icon: '🏬' },
  'PRESTIGE': { sectorKey: 'REALTY', sectorName: 'Real Estate & Realty', icon: '🏙️' },
  'LODHA': { sectorKey: 'REALTY', sectorName: 'Real Estate & Residential', icon: '🏙️' },

  // --- CEMENT, PAINTS & BUILDING MATERIALS ---
  'ULTRACEMCO': { sectorKey: 'CEMENT', sectorName: 'Cement & Concrete', icon: '🧱' },
  'AMBUJACEM': { sectorKey: 'CEMENT', sectorName: 'Cement & Materials', icon: '🧱' },
  'GRASIM': { sectorKey: 'CEMENT', sectorName: 'Cement & VSF', icon: '🧱' },
  'DALBHARAT': { sectorKey: 'CEMENT', sectorName: 'Cement', icon: '🧱' },
  'SHREECEM': { sectorKey: 'CEMENT', sectorName: 'Cement', icon: '🧱' },
  'ASIANPAINT': { sectorKey: 'PAINTS_BLDG', sectorName: 'Paints & Decor', icon: '🎨' },
  'PIDILITIND': { sectorKey: 'PAINTS_BLDG', sectorName: 'Adhesives & Chemicals', icon: '🧴' },
  'ASTRAL': { sectorKey: 'PAINTS_BLDG', sectorName: 'Pipes & Adhesives', icon: '🚰' },
  'SUPREMEIND': { sectorKey: 'PAINTS_BLDG', sectorName: 'Plastic Products', icon: '🪑' },

  // --- CONSUMER RETAIL, E-COMMERCE & SERVICES ---
  'TRENT': { sectorKey: 'RETAIL', sectorName: 'Fashion & Retail', icon: '👗' },
  'TITAN': { sectorKey: 'RETAIL', sectorName: 'Jewellery & Watches', icon: '💍' },
  'DMART': { sectorKey: 'RETAIL', sectorName: 'Hypermarket Retail', icon: '🛒' },
  'VMM': { sectorKey: 'RETAIL', sectorName: 'Value Retail', icon: '🛍️' },
  'ETERNAL': { sectorKey: 'CONSUMER_TECH', sectorName: 'Food Delivery & Quick Commerce', icon: '🛵' },
  'SWIGGY': { sectorKey: 'CONSUMER_TECH', sectorName: 'Food Delivery & Quick Comm', icon: '🛵' },
  'NYKAA': { sectorKey: 'CONSUMER_TECH', sectorName: 'Beauty & E-Commerce', icon: '💄' },
  'PAYTM': { sectorKey: 'CONSUMER_TECH', sectorName: 'Fintech & Digital Payments', icon: '📱' },
  'JUBLFOOD': { sectorKey: 'RETAIL', sectorName: 'Quick Service Restaurants', icon: '🍕' },
  'PAGEIND': { sectorKey: 'RETAIL', sectorName: 'Apparel & Innerwear', icon: '🩳' },
  'KALYANKJIL': { sectorKey: 'RETAIL', sectorName: 'Jewellery Retail', icon: '💎' },
  'INDHOTEL': { sectorKey: 'HOSPITALITY', sectorName: 'Hotels & Tourism', icon: '🏨' },

  // --- TELECOM & LOGISTICS ---
  'BHARTIARTL': { sectorKey: 'TELECOM', sectorName: 'Telecom Services', icon: '📶' },
  'IDEA': { sectorKey: 'TELECOM', sectorName: 'Telecom Services', icon: '📶' },
  'INDUSTOWER': { sectorKey: 'TELECOM', sectorName: 'Telecom Towers & Infra', icon: '📡' },
  'INDIGO': { sectorKey: 'LOGISTICS', sectorName: 'Aviation & Airlines', icon: '✈️' },
  'CONCOR': { sectorKey: 'LOGISTICS', sectorName: 'Container Logistics', icon: '📦' },
  'DELHIVERY': { sectorKey: 'LOGISTICS', sectorName: 'Supply Chain & Logistics', icon: '🚚' },
  'GMRAIRPORT': { sectorKey: 'LOGISTICS', sectorName: 'Airports & Transport', icon: '🛫' },
  'ADANIPORTS': { sectorKey: 'LOGISTICS', sectorName: 'Ports & Logistics SEZ', icon: '⚓' },

  // --- CHEMICALS & AGRI ---
  'SRF': { sectorKey: 'CHEMICALS', sectorName: 'Specialty Chemicals & Fluor', icon: '🧪' },
  'PIIND': { sectorKey: 'CHEMICALS', sectorName: 'Agrochemicals & Fine Chem', icon: '🌾' },
  'UPL': { sectorKey: 'CHEMICALS', sectorName: 'Crop Protection & Agri Chem', icon: '🌾' },

  // --- ADANI CONGLOMERATE ---
  'ADANIENT': { sectorKey: 'CONGLOMERATE', sectorName: 'Incubation & Diversified', icon: '🌐' }
};

/**
 * Returns the sector mapping for any given stock symbol
 */
export function getStockSector(symbol: string): { sectorKey: string; sectorName: string; icon: string } {
  const cleanSymbol = symbol.trim().toUpperCase();
  if (STOCK_SECTOR_MAP[cleanSymbol]) {
    return STOCK_SECTOR_MAP[cleanSymbol];
  }
  return { sectorKey: 'DIVERSIFIED', sectorName: 'Diversified & Others', icon: '📊' };
}

/**
 * Computes live Sector Strength metrics across all stocks in the active universe
 */
export function computeAllSectorStrengths(stocks: StockCalculated[]): Map<string, SectorMetric> {
  const sectorGroups = new Map<string, {
    key: string;
    name: string;
    icon: string;
    stocks: StockCalculated[];
  }>();

  // 1. Group stocks by Sector
  stocks.forEach((s) => {
    const sec = getStockSector(s.symbol);
    if (!sectorGroups.has(sec.sectorKey)) {
      sectorGroups.set(sec.sectorKey, {
        key: sec.sectorKey,
        name: sec.sectorName,
        icon: sec.icon,
        stocks: []
      });
    }
    sectorGroups.get(sec.sectorKey)!.stocks.push(s);
  });

  const result = new Map<string, SectorMetric>();

  sectorGroups.forEach((group, key) => {
    const validStocks = group.stocks.filter(
      (s) => s.pctChange !== undefined && s.pctChange !== null &&
             s.closePrice !== undefined && s.closePrice !== null && s.closePrice > 0
    );

    let avgPctChange = 0;
    let advancing = 0;
    let declining = 0;
    let neutral = 0;

    let leader: StockCalculated | null = null;
    let laggard: StockCalculated | null = null;

    if (validStocks.length > 0) {
      let sumPct = 0;
      validStocks.forEach((s) => {
        const pct = s.pctChange || 0;
        sumPct += pct;
        if (pct > 0.05) advancing++;
        else if (pct < -0.05) declining++;
        else neutral++;

        if (!leader || pct > (leader.pctChange || -999)) leader = s;
        if (!laggard || pct < (laggard.pctChange || 999)) laggard = s;
      });

      avgPctChange = sumPct / validStocks.length;
    }

    const totalDecided = advancing + declining;
    const bullishBreadthPct = totalDecided > 0 ? Math.round((advancing / totalDecided) * 100) : 50;

    let sectorBias: SectorMetric['sectorBias'] = 'NEUTRAL';
    if (avgPctChange >= 1.0 && bullishBreadthPct >= 70) {
      sectorBias = 'STRONG_BULLISH';
    } else if (avgPctChange >= 0.30 && bullishBreadthPct >= 55) {
      sectorBias = 'BULLISH';
    } else if (avgPctChange <= -1.0 && bullishBreadthPct <= 30) {
      sectorBias = 'STRONG_BEARISH';
    } else if (avgPctChange <= -0.30 && bullishBreadthPct <= 45) {
      sectorBias = 'BEARISH';
    }

    result.set(key, {
      sectorKey: key,
      sectorName: group.name,
      categoryIcon: group.icon,
      totalStocks: group.stocks.length,
      validStocksCount: validStocks.length,
      avgPctChange: Math.round(avgPctChange * 100) / 100,
      advancingCount: advancing,
      decliningCount: declining,
      neutralCount: neutral,
      bullishBreadthPct,
      sectorBias,
      leaderSymbol: leader?.symbol,
      leaderPct: leader?.pctChange ?? undefined,
      laggardSymbol: laggard?.symbol,
      laggardPct: laggard?.pctChange ?? undefined
    });
  });

  return result;
}

/**
 * Computes the exact Sector Confluence & "ENTER / AVOID / CAUTION" Indicator Verdict for a specific trade pick
 */
export function evaluateStockSectorConfluence(
  stock: StockCalculated,
  direction: 'BULLISH' | 'BEARISH',
  sectorMetricsMap: Map<string, SectorMetric>
): StockSectorAnalysis {
  const { sectorKey, sectorName, icon } = getStockSector(stock.symbol);
  const metric = sectorMetricsMap.get(sectorKey);

  const sectorAvgPct = metric ? metric.avgPctChange : (stock.pctChange || 0);
  const sectorBullishBreadthPct = metric ? metric.bullishBreadthPct : 50;
  const sectorBias = metric ? metric.sectorBias : 'NEUTRAL';
  const sectorTotalStocks = metric ? metric.totalStocks : 1;
  const sectorAdvancing = metric ? metric.advancingCount : 0;
  const sectorDeclining = metric ? metric.decliningCount : 0;

  if (direction === 'BULLISH') {
    // BULLISH TRADE VERDICT EVALUATION
    if (sectorAvgPct >= 0.40 && sectorBullishBreadthPct >= 60) {
      return {
        sectorKey,
        sectorName,
        categoryIcon: icon,
        sectorAvgPct,
        sectorBullishBreadthPct,
        sectorBias,
        sectorTotalStocks,
        sectorAdvancing,
        sectorDeclining,
        tradeVerdict: 'ENTER',
        verdictLabel: '🟢 ENTER (HIGH CONVICTION)',
        verdictDescription: `Strong Sector Tailwinds (+${sectorAvgPct.toFixed(2)}% Sector Avg • ${sectorBullishBreadthPct}% Bullish Breadth). Industry rally fuels continuation.`,
        badgeBg: 'bg-emerald-500/15',
        badgeTextColor: 'text-emerald-400',
        badgeBorderColor: 'border-emerald-500/30',
        isAligned: true,
        scoreAdjustment: 12
      };
    }

    if (sectorAvgPct <= -0.40 || sectorBullishBreadthPct <= 35) {
      return {
        sectorKey,
        sectorName,
        categoryIcon: icon,
        sectorAvgPct,
        sectorBullishBreadthPct,
        sectorBias,
        sectorTotalStocks,
        sectorAdvancing,
        sectorDeclining,
        tradeVerdict: 'AVOID',
        verdictLabel: '🔴 AVOID (SECTOR HEADWIND)',
        verdictDescription: `Fighting Sector Sell-off (${sectorAvgPct.toFixed(2)}% Sector Avg • ${100 - sectorBullishBreadthPct}% Declining). High risk of bull-trap reversal.`,
        badgeBg: 'bg-rose-500/15',
        badgeTextColor: 'text-rose-400',
        badgeBorderColor: 'border-rose-500/30',
        isAligned: false,
        scoreAdjustment: -15
      };
    }

    // Neutral / Mixed
    return {
      sectorKey,
      sectorName,
      categoryIcon: icon,
      sectorAvgPct,
      sectorBullishBreadthPct,
      sectorBias,
      sectorTotalStocks,
      sectorAdvancing,
      sectorDeclining,
      tradeVerdict: 'CAUTION',
      verdictLabel: '🟡 CAUTION (NEUTRAL SECTOR)',
      verdictDescription: `Sector is neutral/flat (${sectorAvgPct >= 0 ? '+' : ''}${sectorAvgPct.toFixed(2)}% Avg • ${sectorBullishBreadthPct}% Advancing). Stock is moving individually; keep tight Stop-Loss.`,
      badgeBg: 'bg-amber-500/15',
      badgeTextColor: 'text-amber-300',
      badgeBorderColor: 'border-amber-500/30',
      isAligned: false,
      scoreAdjustment: 0
    };
  } else {
    // BEARISH TRADE VERDICT EVALUATION
    if (sectorAvgPct <= -0.40 && sectorBullishBreadthPct <= 40) {
      return {
        sectorKey,
        sectorName,
        categoryIcon: icon,
        sectorAvgPct,
        sectorBullishBreadthPct,
        sectorBias,
        sectorTotalStocks,
        sectorAdvancing,
        sectorDeclining,
        tradeVerdict: 'ENTER',
        verdictLabel: '🟢 ENTER (HIGH CONVICTION SHORT)',
        verdictDescription: `Strong Sector Breakdown (${sectorAvgPct.toFixed(2)}% Sector Avg • ${100 - sectorBullishBreadthPct}% Declining). Broad institutional selloff accelerates drop.`,
        badgeBg: 'bg-emerald-500/15',
        badgeTextColor: 'text-emerald-400',
        badgeBorderColor: 'border-emerald-500/30',
        isAligned: true,
        scoreAdjustment: 12
      };
    }

    if (sectorAvgPct >= 0.40 || sectorBullishBreadthPct >= 65) {
      return {
        sectorKey,
        sectorName,
        categoryIcon: icon,
        sectorAvgPct,
        sectorBullishBreadthPct,
        sectorBias,
        sectorTotalStocks,
        sectorAdvancing,
        sectorDeclining,
        tradeVerdict: 'AVOID',
        verdictLabel: '🔴 AVOID (BULLISH SECTOR CONFLICT)',
        verdictDescription: `Shorting Against Sector Surge (+${sectorAvgPct.toFixed(2)}% Sector Avg • ${sectorBullishBreadthPct}% Green). Risky to fight strong industry uptrend.`,
        badgeBg: 'bg-rose-500/15',
        badgeTextColor: 'text-rose-400',
        badgeBorderColor: 'border-rose-500/30',
        isAligned: false,
        scoreAdjustment: -15
      };
    }

    // Neutral
    return {
      sectorKey,
      sectorName,
      categoryIcon: icon,
      sectorAvgPct,
      sectorBullishBreadthPct,
      sectorBias,
      sectorTotalStocks,
      sectorAdvancing,
      sectorDeclining,
      tradeVerdict: 'CAUTION',
      verdictLabel: '🟡 CAUTION (MIXED SECTOR)',
      verdictDescription: `Sector flow is mixed (${sectorAvgPct >= 0 ? '+' : ''}${sectorAvgPct.toFixed(2)}% Avg). Verify 15m breakdown trigger before entering short.`,
      badgeBg: 'bg-amber-500/15',
      badgeTextColor: 'text-amber-300',
      badgeBorderColor: 'border-amber-500/30',
      isAligned: false,
      scoreAdjustment: 0
    };
  }
}
