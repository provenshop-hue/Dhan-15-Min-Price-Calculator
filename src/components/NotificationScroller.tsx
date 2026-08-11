import React from 'react';
import { Bell, Flame, TrendingUp, TrendingDown, Zap, ShieldAlert, Sparkles, ChevronRight, Activity, Target } from 'lucide-react';
import { StockCalculated } from '../types';
import { is100PercentBullishMove, is100PercentBearishMove, detect15mHighPullbackBounce } from '../utils/rsiPullback';
import { isOpenLowPattern, isOpenHighPattern, isBothCalcLessThan3, isGannCalcLessThan3 } from '../utils/gann';

interface NotificationScrollerProps {
  stocks: StockCalculated[];
  onSelectStockDetail: (stock: StockCalculated) => void;
}

export const NotificationScroller: React.FC<NotificationScrollerProps> = ({
  stocks,
  onSelectStockDetail
}) => {
  // 1. Find NIFTY and BANKNIFTY stocks
  const niftyStock = stocks.find((s) => s.symbol === 'NIFTY' || s.symbol === 'NIFTY 50' || s.symbol.includes('NIFTY'));
  const bankNiftyStock = stocks.find((s) => s.symbol === 'BANKNIFTY' || s.symbol === 'BANK NIFTY' || s.symbol.includes('BANKNIFTY'));

  // Helper check for Open=Low and Open=High
  const checkOpenLow = (s?: StockCalculated | null) => {
    if (!s || s.openPrice === undefined || s.openPrice === null || s.openPrice <= 0) return false;
    return isOpenLowPattern(s.openPrice, s.lowPrice, s.first15mLow);
  };

  const checkOpenHigh = (s?: StockCalculated | null) => {
    if (!s || s.openPrice === undefined || s.openPrice === null || s.openPrice <= 0) return false;
    return isOpenHighPattern(s.openPrice, s.highPrice, s.first15mHigh);
  };

  const niftyOpenLow = checkOpenLow(niftyStock);
  const niftyOpenHigh = checkOpenHigh(niftyStock);
  const bankNiftyOpenLow = checkOpenLow(bankNiftyStock);
  const bankNiftyOpenHigh = checkOpenHigh(bankNiftyStock);

  const hasIndexAlert = niftyOpenLow || niftyOpenHigh || bankNiftyOpenLow || bankNiftyOpenHigh;

  // 2. Calculated Stocks (with valid candle data)
  const calculatedStocks = stocks.filter(
    (s) => s.openPrice !== undefined && s.openPrice !== null && s.openPrice > 0 &&
           s.closePrice !== undefined && s.closePrice !== null && s.closePrice > 0
  );

  // 3. Top Two 100% Bullish Stocks (STRICT REQUIREMENT: Green Candle, Positive % change, is100PercentBullishMove)
  const exact100Bullish = calculatedStocks.filter(
    (s) => is100PercentBullishMove(s) && (s.pctChange || 0) > 0 && (s.closePrice || 0) > (s.openPrice || 0)
  );
  const top2Bullish = [...exact100Bullish]
    .sort((a, b) => (b.pctChange || 0) - (a.pctChange || 0))
    .slice(0, 2);

  // Fallback to top gaining stocks if less than 2
  if (top2Bullish.length < 2) {
    const fallbackBullish = calculatedStocks
      .filter((s) => (s.pctChange || 0) > 0 && (s.closePrice || 0) > (s.openPrice || 0) && !top2Bullish.some((tb) => tb.id === s.id))
      .sort((a, b) => (b.pctChange || 0) - (a.pctChange || 0));
    top2Bullish.push(...fallbackBullish.slice(0, 2 - top2Bullish.length));
  }

  // 4. Top Two 100% Bearish Stocks (STRICT REQUIREMENT: Red Candle, Negative % change, is100PercentBearishMove)
  const exact100Bearish = calculatedStocks.filter(
    (s) => is100PercentBearishMove(s) && (s.pctChange || 0) < 0 && (s.closePrice || 0) < (s.openPrice || 0)
  );
  const top2Bearish = [...exact100Bearish]
    .sort((a, b) => (a.pctChange || 0) - (b.pctChange || 0))
    .slice(0, 2);

  // Fallback to top losing stocks if less than 2
  if (top2Bearish.length < 2) {
    const fallbackBearish = calculatedStocks
      .filter((s) => (s.pctChange || 0) < 0 && (s.closePrice || 0) < (s.openPrice || 0) && !top2Bearish.some((tb) => tb.id === s.id))
      .sort((a, b) => (a.pctChange || 0) - (b.pctChange || 0));
    top2Bearish.push(...fallbackBearish.slice(0, 2 - top2Bearish.length));
  }

  // 5. Stocks with Both Calculation < 3 (openCalc < 3 AND closeCalc < 3)
  const bothCalcLess3Stocks = calculatedStocks.filter((s) => isBothCalcLessThan3(s));
  // Fallback to single calc < 3 if empty
  const singleCalcLess3Stocks = bothCalcLess3Stocks.length > 0 
    ? bothCalcLess3Stocks 
    : calculatedStocks.filter((s) => isGannCalcLessThan3(s));

  // Build items array for ticker
  const items: Array<{
    id: string;
    type: 'INDEX_ALERT' | 'BULLISH_100' | 'BEARISH_100' | 'CALC_LESS_3';
    title: string;
    subtitle: string;
    badgeText: string;
    bgColor: string;
    borderColor: string;
    textColor: string;
    stock?: StockCalculated;
  }> = [];

  // 15m High Retest & Bounce checks for Nifty & Bank Nifty
  const nifty15mBounce = niftyStock ? detect15mHighPullbackBounce(niftyStock) : null;
  const bankNifty15mBounce = bankNiftyStock ? detect15mHighPullbackBounce(bankNiftyStock) : null;

  // Add Index Alerts
  if (niftyStock && nifty15mBounce && nifty15mBounce.isPullbackBounce) {
    items.push({
      id: 'nifty-15m-bounce-alert',
      type: 'INDEX_ALERT',
      title: `NIFTY 50 15m High Bounce!`,
      subtitle: `Retested ₹${nifty15mBounce.retestPrice.toFixed(2)} @ ${nifty15mBounce.bounceTime} & Bounced +${nifty15mBounce.bouncePct.toFixed(2)}% Bullish!`,
      badgeText: `🎯 NIFTY 15M BOUNCE`,
      bgColor: 'bg-purple-950/95 text-purple-100',
      borderColor: 'border-purple-500/80 shadow-purple-500/30',
      textColor: 'text-purple-300',
      stock: niftyStock
    });
  }

  if (niftyStock && (niftyOpenLow || niftyOpenHigh)) {
    const alertType = niftyOpenLow ? 'OPEN = LOW (BULLISH)' : 'OPEN = HIGH (BEARISH)';
    items.push({
      id: 'nifty-alert',
      type: 'INDEX_ALERT',
      title: `NIFTY 50 Match!`,
      subtitle: `${alertType} | CMP: ₹${niftyStock.closePrice?.toLocaleString('en-IN') || niftyStock.openPrice} (${(niftyStock.pctChange || 0) >= 0 ? '+' : ''}${(niftyStock.pctChange || 0).toFixed(2)}%)`,
      badgeText: `🚨 NIFTY ALERT`,
      bgColor: niftyOpenLow ? 'bg-emerald-950/90 text-emerald-100' : 'bg-rose-950/90 text-rose-100',
      borderColor: niftyOpenLow ? 'border-emerald-500/70 shadow-emerald-500/20' : 'border-rose-500/70 shadow-rose-500/20',
      textColor: niftyOpenLow ? 'text-emerald-300' : 'text-rose-300',
      stock: niftyStock
    });
  }

  if (bankNiftyStock && bankNifty15mBounce && bankNifty15mBounce.isPullbackBounce) {
    items.push({
      id: 'banknifty-15m-bounce-alert',
      type: 'INDEX_ALERT',
      title: `BANK NIFTY 15m High Bounce!`,
      subtitle: `Retested ₹${bankNifty15mBounce.retestPrice.toFixed(2)} @ ${bankNifty15mBounce.bounceTime} & Bounced +${bankNifty15mBounce.bouncePct.toFixed(2)}% Bullish!`,
      badgeText: `🎯 BANKNIFTY 15M BOUNCE`,
      bgColor: 'bg-purple-950/95 text-purple-100',
      borderColor: 'border-purple-500/80 shadow-purple-500/30',
      textColor: 'text-purple-300',
      stock: bankNiftyStock
    });
  }

  if (bankNiftyStock && (bankNiftyOpenLow || bankNiftyOpenHigh)) {
    const alertType = bankNiftyOpenLow ? 'OPEN = LOW (BULLISH)' : 'OPEN = HIGH (BEARISH)';
    items.push({
      id: 'banknifty-alert',
      type: 'INDEX_ALERT',
      title: `BANK NIFTY Match!`,
      subtitle: `${alertType} | CMP: ₹${bankNiftyStock.closePrice?.toLocaleString('en-IN') || bankNiftyStock.openPrice} (${(bankNiftyStock.pctChange || 0) >= 0 ? '+' : ''}${(bankNiftyStock.pctChange || 0).toFixed(2)}%)`,
      badgeText: `🚨 BANKNIFTY ALERT`,
      bgColor: bankNiftyOpenLow ? 'bg-emerald-950/90 text-emerald-100' : 'bg-rose-950/90 text-rose-100',
      borderColor: bankNiftyOpenLow ? 'border-emerald-500/70 shadow-emerald-500/20' : 'border-rose-500/70 shadow-rose-500/20',
      textColor: bankNiftyOpenLow ? 'text-emerald-300' : 'text-rose-300',
      stock: bankNiftyStock
    });
  }

  // If no index alert, add Index summary status
  if (!hasIndexAlert) {
    if (niftyStock && niftyStock.openPrice) {
      items.push({
        id: 'nifty-status',
        type: 'INDEX_ALERT',
        title: `NIFTY 50`,
        subtitle: `CMP: ₹${niftyStock.closePrice || niftyStock.openPrice} (${(niftyStock.pctChange || 0) >= 0 ? '+' : ''}${(niftyStock.pctChange || 0).toFixed(2)}%) | O=L: No, O=H: No`,
        badgeText: `📊 NIFTY 50`,
        bgColor: 'bg-slate-900/90 text-slate-200',
        borderColor: 'border-slate-700/60',
        textColor: 'text-blue-400',
        stock: niftyStock
      });
    }
    if (bankNiftyStock && bankNiftyStock.openPrice) {
      items.push({
        id: 'banknifty-status',
        type: 'INDEX_ALERT',
        title: `BANK NIFTY`,
        subtitle: `CMP: ₹${bankNiftyStock.closePrice || bankNiftyStock.openPrice} (${(bankNiftyStock.pctChange || 0) >= 0 ? '+' : ''}${(bankNiftyStock.pctChange || 0).toFixed(2)}%) | O=L: No, O=H: No`,
        badgeText: `📊 BANK NIFTY`,
        bgColor: 'bg-slate-900/90 text-slate-200',
        borderColor: 'border-slate-700/60',
        textColor: 'text-blue-400',
        stock: bankNiftyStock
      });
    }
  }

  // Add Top 2 Bullish 100%
  top2Bullish.forEach((stock, idx) => {
    const isTrue100 = is100PercentBullishMove(stock);
    items.push({
      id: `bullish-100-${stock.id}`,
      type: 'BULLISH_100',
      title: `${stock.symbol}`,
      subtitle: `+${(stock.pctChange || 0).toFixed(2)}% | CMP ₹${stock.closePrice || stock.openPrice} | Open Calc: ${stock.openCalc?.toFixed(2) ?? 'N/A'}, Close Calc: ${stock.closeCalc?.toFixed(2) ?? 'N/A'}`,
      badgeText: isTrue100 ? `💯 100% BULLISH #${idx + 1}` : `🔥 TOP BULLISH GAINER #${idx + 1}`,
      bgColor: 'bg-emerald-950/80 text-emerald-100',
      borderColor: 'border-emerald-500/60 shadow-emerald-500/10',
      textColor: 'text-emerald-300',
      stock
    });
  });

  // Add Top 2 Bearish 100%
  top2Bearish.forEach((stock, idx) => {
    const isTrue100 = is100PercentBearishMove(stock);
    items.push({
      id: `bearish-100-${stock.id}`,
      type: 'BEARISH_100',
      title: `${stock.symbol}`,
      subtitle: `${(stock.pctChange || 0).toFixed(2)}% | CMP ₹${stock.closePrice || stock.openPrice} | Open Calc: ${stock.openCalc?.toFixed(2) ?? 'N/A'}, Close Calc: ${stock.closeCalc?.toFixed(2) ?? 'N/A'}`,
      badgeText: isTrue100 ? `💥 100% BEARISH #${idx + 1}` : `🔻 TOP BEARISH LOSER #${idx + 1}`,
      bgColor: 'bg-rose-950/80 text-rose-100',
      borderColor: 'border-rose-500/60 shadow-rose-500/10',
      textColor: 'text-rose-300',
      stock
    });
  });

  // Add Both Calc < 3 stocks
  const targetCalcStocks = singleCalcLess3Stocks.slice(0, 3);
  targetCalcStocks.forEach((stock) => {
    const isBoth = isBothCalcLessThan3(stock);
    items.push({
      id: `both-calc-${stock.id}`,
      type: 'CALC_LESS_3',
      title: `${stock.symbol}`,
      subtitle: `Open Calc: ${stock.openCalc?.toFixed(2) ?? '-'} | Close Calc: ${stock.closeCalc?.toFixed(2) ?? '-'} | CMP ₹${stock.closePrice || stock.openPrice}`,
      badgeText: isBoth ? `⚡ BOTH CALC < 3` : `⚡ GANN CALC < 3`,
      bgColor: isBoth ? 'bg-purple-950/90 text-purple-100' : 'bg-indigo-950/80 text-indigo-100',
      borderColor: isBoth ? 'border-purple-500/70 shadow-purple-500/20' : 'border-indigo-500/60',
      textColor: isBoth ? 'text-purple-300' : 'text-indigo-300',
      stock
    });
  });

  // Duplicate items array to create seamless loop marquee
  const displayItems = [...items, ...items];

  return (
    <div className="bg-slate-950 border-y border-amber-500/30 text-white overflow-hidden relative shadow-lg my-3 rounded-xl">
      <div className="flex items-center">
        {/* Left Fixed Badge Label */}
        <div className="flex items-center space-x-2 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 px-4 py-2.5 z-10 shadow-md shrink-0 font-bold text-xs uppercase tracking-wider text-amber-50">
          <Flame className="w-4 h-4 text-yellow-300 animate-bounce" />
          <span className="hidden sm:inline">LIVE SIGNAL TICKER</span>
          <span className="sm:hidden">SIGNALS</span>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-300 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-400"></span>
          </span>
        </div>

        {/* Marquee Container */}
        <div className="overflow-hidden whitespace-nowrap relative flex-1 py-2">
          <div className="inline-flex space-x-4 animate-marquee hover:[animation-play-state:paused]">
            {displayItems.map((item, index) => (
              <div
                key={`${item.id}-${index}`}
                onClick={() => item.stock && onSelectStockDetail(item.stock)}
                className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg border text-xs font-medium transition-all duration-200 hover:scale-105 hover:shadow-md cursor-pointer ${item.bgColor} ${item.borderColor}`}
              >
                <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wide bg-black/40 border border-white/10 ${item.textColor}`}>
                  {item.badgeText}
                </span>
                <span className="font-extrabold text-white">{item.title}</span>
                <span className="text-slate-300 text-[11px] font-mono">{item.subtitle}</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 opacity-70 group-hover:opacity-100" />
              </div>
            ))}
          </div>
        </div>

        {/* Right Summary Pill Stats */}
        <div className="hidden lg:flex items-center space-x-3 px-4 py-2 bg-slate-900/90 border-l border-slate-800 z-10 shrink-0 text-xs">
          <div className="flex items-center space-x-1.5" title="Nifty / Bank Nifty Open=Low or Open=High Alerts">
            <span className={`w-2 h-2 rounded-full ${hasIndexAlert ? 'bg-rose-500 animate-ping' : 'bg-emerald-500'}`}></span>
            <span className="text-slate-400">Index Alerts:</span>
            <span className={`font-bold ${hasIndexAlert ? 'text-rose-400 font-black' : 'text-emerald-400'}`}>
              {hasIndexAlert ? 'ACTIVE 🔥' : 'NONE'}
            </span>
          </div>
          <div className="w-px h-3 bg-slate-800"></div>
          <div className="flex items-center space-x-1" title="100% Bullish Stocks Count">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">100% Bull:</span>
            <span className="font-bold text-emerald-400">{exact100Bullish.length}</span>
          </div>
          <div className="w-px h-3 bg-slate-800"></div>
          <div className="flex items-center space-x-1" title="100% Bearish Stocks Count">
            <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-slate-400">100% Bear:</span>
            <span className="font-bold text-rose-400">{exact100Bearish.length}</span>
          </div>
          <div className="w-px h-3 bg-slate-800"></div>
          <div className="flex items-center space-x-1" title="Both Open & Close Calc < 3 Count">
            <Zap className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-slate-400">Both Calc &lt; 3:</span>
            <span className="font-bold text-purple-300">{bothCalcLess3Stocks.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
