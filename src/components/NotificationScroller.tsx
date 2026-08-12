import React from 'react';
import { Flame, TrendingUp, TrendingDown, ChevronRight, Zap } from 'lucide-react';
import { StockCalculated, FadedStockRecord } from '../types';
import { is100PercentBullishMove, is100PercentBearishMove, get100PercentBullishScore, get100PercentBearishScore, detect15mHighPullbackBounce } from '../utils/rsiPullback';
import { isOpenLowPattern, isOpenHighPattern, calculateGann15Min } from '../utils/gann';

interface NotificationScrollerProps {
  stocks: StockCalculated[];
  faded100Log?: FadedStockRecord[];
  onSelectStockDetail: (stock: StockCalculated) => void;
}

export const NotificationScroller: React.FC<NotificationScrollerProps> = ({
  stocks,
  onSelectStockDetail
}) => {

  // 1. Find NIFTY, BANKNIFTY, and SENSEX stocks
  const niftyStock = stocks.find((s) => s.symbol === 'NIFTY' || s.symbol === 'NIFTY 50' || s.symbol.includes('NIFTY'));
  const bankNiftyStock = stocks.find((s) => s.symbol === 'BANKNIFTY' || s.symbol === 'BANK NIFTY' || s.symbol.includes('BANKNIFTY'));
  const sensexStock = stocks.find((s) => s.symbol === 'SENSEX' || s.symbol === 'BSE SENSEX' || s.symbol.includes('SENSEX'));

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
  const sensexOpenLow = checkOpenLow(sensexStock);
  const sensexOpenHigh = checkOpenHigh(sensexStock);

  const hasIndexAlert = niftyOpenLow || niftyOpenHigh || bankNiftyOpenLow || bankNiftyOpenHigh || sensexOpenLow || sensexOpenHigh;

  // 2. Calculated Stocks (with valid candle data)
  const calculatedStocks = stocks.filter(
    (s) => s.openPrice !== undefined && s.openPrice !== null && s.openPrice > 0 &&
           s.closePrice !== undefined && s.closePrice !== null && s.closePrice > 0
  );

  // 3. Filter ONLY stocks that strictly qualify for:
  // - 100% Bullish Move
  // - Very Bullish
  // - 100% Bearish Move
  // - Very Bearish

  const exact100Bullish: StockCalculated[] = [];
  const veryBullishStocks: StockCalculated[] = [];
  const exact100Bearish: StockCalculated[] = [];
  const veryBearishStocks: StockCalculated[] = [];

  calculatedStocks.forEach((stock) => {
    const is100Bull = is100PercentBullishMove(stock);
    const is100Bear = is100PercentBearishMove(stock);

    // Get or compute trend
    let trend = stock.trend;
    if (!trend && stock.openPrice && stock.closePrice) {
      const gannRes = calculateGann15Min(
        stock.openPrice,
        stock.closePrice,
        stock.rsi,
        stock.vwap,
        stock.highPrice,
        stock.lowPrice,
        0.001,
        stock.adx,
        stock.first15mHigh,
        stock.first15mLow,
        stock.symbol,
        stock.candleTimestamp
      );
      trend = gannRes.trend;
    }

    const isVeryBull = trend === 'Very Bullish';
    const isVeryBear = trend === 'Very Bearish';

    if (is100Bull) {
      exact100Bullish.push(stock);
    } else if (isVeryBull) {
      veryBullishStocks.push(stock);
    }

    if (is100Bear) {
      exact100Bearish.push(stock);
    } else if (isVeryBear) {
      veryBearishStocks.push(stock);
    }
  });

  // Build items array for ticker
  const items: Array<{
    id: string;
    type: 'INDEX_ALERT' | 'BULLISH_100' | 'BEARISH_100' | 'VERY_BULLISH' | 'VERY_BEARISH';
    title: string;
    subtitle: string;
    badgeText: string;
    bgColor: string;
    borderColor: string;
    textColor: string;
    stock?: StockCalculated;
  }> = [];

  // 15m High Retest & Bounce checks for Nifty, Bank Nifty, and Sensex
  const nifty15mBounce = niftyStock ? detect15mHighPullbackBounce(niftyStock) : null;
  const bankNifty15mBounce = bankNiftyStock ? detect15mHighPullbackBounce(bankNiftyStock) : null;
  const sensex15mBounce = sensexStock ? detect15mHighPullbackBounce(sensexStock) : null;

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

  if (sensexStock && sensex15mBounce && sensex15mBounce.isPullbackBounce) {
    items.push({
      id: 'sensex-15m-bounce-alert',
      type: 'INDEX_ALERT',
      title: `BSE SENSEX 15m High Bounce!`,
      subtitle: `Retested ₹${sensex15mBounce.retestPrice.toFixed(2)} @ ${sensex15mBounce.bounceTime} & Bounced +${sensex15mBounce.bouncePct.toFixed(2)}% Bullish!`,
      badgeText: `🎯 SENSEX 15M BOUNCE`,
      bgColor: 'bg-purple-950/95 text-purple-100',
      borderColor: 'border-purple-500/80 shadow-purple-500/30',
      textColor: 'text-purple-300',
      stock: sensexStock
    });
  }

  if (sensexStock && (sensexOpenLow || sensexOpenHigh)) {
    const alertType = sensexOpenLow ? 'OPEN = LOW (BULLISH)' : 'OPEN = HIGH (BEARISH)';
    items.push({
      id: 'sensex-alert',
      type: 'INDEX_ALERT',
      title: `BSE SENSEX Match!`,
      subtitle: `${alertType} | CMP: ₹${sensexStock.closePrice?.toLocaleString('en-IN') || sensexStock.openPrice} (${(sensexStock.pctChange || 0) >= 0 ? '+' : ''}${(sensexStock.pctChange || 0).toFixed(2)}%)`,
      badgeText: `🚨 SENSEX ALERT`,
      bgColor: sensexOpenLow ? 'bg-emerald-950/90 text-emerald-100' : 'bg-rose-950/90 text-rose-100',
      borderColor: sensexOpenLow ? 'border-emerald-500/70 shadow-emerald-500/20' : 'border-rose-500/70 shadow-rose-500/20',
      textColor: sensexOpenLow ? 'text-emerald-300' : 'text-rose-300',
      stock: sensexStock
    });
  }

  // If no index alert, add Index summary status
  if (!hasIndexAlert) {
    if (niftyStock && niftyStock.openPrice) {
      items.push({
        id: 'nifty-status',
        type: 'INDEX_ALERT',
        title: `NIFTY 50`,
        subtitle: `CMP: ₹${niftyStock.closePrice || niftyStock.openPrice} (${(niftyStock.pctChange || 0) >= 0 ? '+' : ''}${(niftyStock.pctChange || 0).toFixed(2)}%)`,
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
        subtitle: `CMP: ₹${bankNiftyStock.closePrice || bankNiftyStock.openPrice} (${(bankNiftyStock.pctChange || 0) >= 0 ? '+' : ''}${(bankNiftyStock.pctChange || 0).toFixed(2)}%)`,
        badgeText: `📊 BANK NIFTY`,
        bgColor: 'bg-slate-900/90 text-slate-200',
        borderColor: 'border-slate-700/60',
        textColor: 'text-blue-400',
        stock: bankNiftyStock
      });
    }
    if (sensexStock && sensexStock.openPrice) {
      items.push({
        id: 'sensex-status',
        type: 'INDEX_ALERT',
        title: `BSE SENSEX`,
        subtitle: `CMP: ₹${sensexStock.closePrice || sensexStock.openPrice} (${(sensexStock.pctChange || 0) >= 0 ? '+' : ''}${(sensexStock.pctChange || 0).toFixed(2)}%)`,
        badgeText: `📊 BSE SENSEX`,
        bgColor: 'bg-slate-900/90 text-slate-200',
        borderColor: 'border-slate-700/60',
        textColor: 'text-blue-400',
        stock: sensexStock
      });
    }
  }

  // Sort 100% Bullish & Bearish by conviction score and take top 6
  const sorted100Bullish = exact100Bullish
    .sort((a, b) => get100PercentBullishScore(b) - get100PercentBullishScore(a))
    .slice(0, 6);

  const sorted100Bearish = exact100Bearish
    .sort((a, b) => get100PercentBearishScore(b) - get100PercentBearishScore(a))
    .slice(0, 6);

  const sortedVeryBullish = veryBullishStocks
    .sort((a, b) => (b.pctChange || 0) - (a.pctChange || 0))
    .slice(0, 6);

  const sortedVeryBearish = veryBearishStocks
    .sort((a, b) => (a.pctChange || 0) - (b.pctChange || 0))
    .slice(0, 6);

  // Add Top 6 100% Bullish Stocks
  sorted100Bullish.forEach((stock) => {
    const score = get100PercentBullishScore(stock);
    items.push({
      id: `bullish-100-${stock.id}`,
      type: 'BULLISH_100',
      title: `${stock.symbol}`,
      subtitle: `+${(stock.pctChange || 0).toFixed(2)}% | CMP ₹${stock.closePrice || stock.openPrice} | Score: ${score}/100 | VWAP: ₹${stock.vwap?.toFixed(2) ?? 'N/A'}, RSI: ${stock.rsi?.toFixed(1) ?? 'N/A'}`,
      badgeText: `💯 100% BULLISH`,
      bgColor: 'bg-emerald-950/90 text-emerald-100',
      borderColor: 'border-emerald-500/70 shadow-emerald-500/20',
      textColor: 'text-emerald-300',
      stock
    });
  });

  // Add Top 6 Very Bullish Stocks
  sortedVeryBullish.forEach((stock) => {
    items.push({
      id: `very-bullish-${stock.id}`,
      type: 'VERY_BULLISH',
      title: `${stock.symbol}`,
      subtitle: `+${(stock.pctChange || 0).toFixed(2)}% | CMP ₹${stock.closePrice || stock.openPrice} | Open Calc: ${stock.openCalc?.toFixed(2) ?? 'N/A'}, Close Calc: ${stock.closeCalc?.toFixed(2) ?? 'N/A'}`,
      badgeText: `🚀 VERY BULLISH`,
      bgColor: 'bg-teal-950/90 text-teal-100',
      borderColor: 'border-teal-500/70 shadow-teal-500/20',
      textColor: 'text-teal-300',
      stock
    });
  });

  // Add Top 6 100% Bearish Stocks
  sorted100Bearish.forEach((stock) => {
    const score = get100PercentBearishScore(stock);
    items.push({
      id: `bearish-100-${stock.id}`,
      type: 'BEARISH_100',
      title: `${stock.symbol}`,
      subtitle: `${(stock.pctChange || 0).toFixed(2)}% | CMP ₹${stock.closePrice || stock.openPrice} | Score: ${score}/100 | VWAP: ₹${stock.vwap?.toFixed(2) ?? 'N/A'}, RSI: ${stock.rsi?.toFixed(1) ?? 'N/A'}`,
      badgeText: `💥 100% BEARISH`,
      bgColor: 'bg-rose-950/90 text-rose-100',
      borderColor: 'border-rose-500/70 shadow-rose-500/20',
      textColor: 'text-rose-300',
      stock
    });
  });

  // Add Top 6 Very Bearish Stocks
  sortedVeryBearish.forEach((stock) => {
    items.push({
      id: `very-bearish-${stock.id}`,
      type: 'VERY_BEARISH',
      title: `${stock.symbol}`,
      subtitle: `${(stock.pctChange || 0).toFixed(2)}% | CMP ₹${stock.closePrice || stock.openPrice} | Open Calc: ${stock.openCalc?.toFixed(2) ?? 'N/A'}, Close Calc: ${stock.closeCalc?.toFixed(2) ?? 'N/A'}`,
      badgeText: `🔻 VERY BEARISH`,
      bgColor: 'bg-red-950/90 text-red-100',
      borderColor: 'border-red-500/70 shadow-red-500/20',
      textColor: 'text-red-300',
      stock
    });
  });

  // If no qualifying stocks, add scanning status
  const totalQualifyingStocks = exact100Bullish.length + veryBullishStocks.length + exact100Bearish.length + veryBearishStocks.length;
  if (totalQualifyingStocks === 0) {
    items.push({
      id: 'no-qualifying-signals',
      type: 'INDEX_ALERT',
      title: `SCANNING WATCHLIST`,
      subtitle: `No stocks currently meet 100% Bullish/Bearish or Very Bullish/Bearish thresholds`,
      badgeText: `⚡ SEARCHING EXTREME SIGNALS`,
      bgColor: 'bg-slate-900/90 text-slate-200',
      borderColor: 'border-slate-700/60',
      textColor: 'text-amber-400'
    });
  }

  // Duplicate items array for seamless marquee loop (repeat more if few items to prevent gaps)
  const repeatFactor = items.length < 5 ? 4 : 2;
  const displayItems = items.length > 0 ? Array(repeatFactor).fill(items).flat() : [];
  const marqueeDurationSeconds = Math.max(45, items.length * 10);

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
          <div 
            className="inline-flex space-x-4 animate-marquee hover:[animation-play-state:paused]"
            style={{ animationDuration: `${marqueeDurationSeconds}s` }}
          >
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
          <div className="flex items-center space-x-1" title="100% Bullish Stocks Count">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">100% Bull:</span>
            <span className="font-bold text-emerald-400">{exact100Bullish.length}</span>
          </div>
          <div className="w-px h-3 bg-slate-800"></div>
          <div className="flex items-center space-x-1" title="Very Bullish Stocks Count">
            <Zap className="w-3.5 h-3.5 text-teal-400" />
            <span className="text-slate-400">Very Bull:</span>
            <span className="font-bold text-teal-300">{veryBullishStocks.length}</span>
          </div>
          <div className="w-px h-3 bg-slate-800"></div>
          <div className="flex items-center space-x-1" title="100% Bearish Stocks Count">
            <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-slate-400">100% Bear:</span>
            <span className="font-bold text-rose-400">{exact100Bearish.length}</span>
          </div>
          <div className="w-px h-3 bg-slate-800"></div>
          <div className="flex items-center space-x-1" title="Very Bearish Stocks Count">
            <TrendingDown className="w-3.5 h-3.5 text-red-400" />
            <span className="text-slate-400">Very Bear:</span>
            <span className="font-bold text-red-400">{veryBearishStocks.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
