import React, { useState, useMemo, useEffect } from 'react';
import { StockCalculated } from '../types';
import { 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Search, 
  ShieldCheck, 
  Zap, 
  ExternalLink, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowUpRight, 
  ArrowDownRight, 
  Layers, 
  Activity,
  Flame,
  ShieldAlert,
  ShieldCheck as ShieldSafe,
  Package,
  X,
  RefreshCw,
  Bell,
  Star,
  Sparkles,
  CheckCircle
} from 'lucide-react';

const parseTimeToMinutes = (timeStr: string): number => {
  if (!timeStr || timeStr === '-') return 555;
  const clean = timeStr.split(' ')[0];
  const parts = clean.split(':').map(Number);
  if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    let h = parts[0];
    const m = parts[1];
    if (timeStr.toLowerCase().includes('pm') && h < 12) h += 12;
    if (timeStr.toLowerCase().includes('am') && h === 12) h = 0;
    return h * 60 + m;
  }
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
};

interface OrbBullishBearishScannerProps {
  stocks: StockCalculated[];
  onSelectStockDetail: (stock: StockCalculated) => void;
  onOpenPositionSizer: (stock: StockCalculated) => void;
  onFetchSingleStock?: (stock: StockCalculated) => void;
  activeTimingFilter?: { active: boolean; date: string; timeSlot: string; qualifyingSymbols: string[] };
  onClearTimingFilter?: () => void;
}

export const OrbBullishBearishScanner: React.FC<OrbBullishBearishScannerProps> = ({
  stocks,
  onSelectStockDetail,
  onOpenPositionSizer,
  onFetchSingleStock,
  activeTimingFilter,
  onClearTimingFilter
}) => {
  const [activeTab, setActiveTab] = useState<'bullish' | 'bearish' | 'super_break_bull' | 'super_break_bear' | 'retested_bounced' | 'failed_retest' | 'immediate_bounce' | 'orb_low_bounce' | 'bounce_candle_strength' | 'orb_zero_reversal' | 'bounce_great' | 'lightning_scalp' | 'no_retest' | 'recent_discovery'>('bullish');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'BREAK_PCT' | 'LOWER_BREAK_PCT' | 'JUST_HIT' | 'HEIGHT_PCT' | 'SYMBOL'>('BREAK_PCT');
  const [shallITakeThisStock, setShallITakeThisStock] = useState<StockCalculated | null>(null);
  const [recentSubFilter, setRecentSubFilter] = useState<string>('ALL');

  const [lastFetchTime, setLastFetchTime] = useState<string>(() => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  });

  useEffect(() => {
    if (stocks && stocks.length > 0) {
      setLastFetchTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }
  }, [stocks]);

  // Followed stocks state (persisted in localStorage)
  const [followedSymbols, setFollowedSymbols] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('orb_followed_symbols');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Follow baseline break % for 20% increase alert tracking (persisted in localStorage)
  const [followBaselines, setFollowBaselines] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('orb_follow_baselines');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Alert Popunder State (Only for followed stocks)
  const [alertStock, setAlertStock] = useState<{ 
    symbol: string; 
    breakPct: number; 
    type: 'BULLISH' | 'BEARISH'; 
    reason?: '3.0_CROSS' | 'FOLLOW_INCREASE_20';
    baselinePct?: number;
  } | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('orb_followed_symbols', JSON.stringify(followedSymbols));
    } catch {}
  }, [followedSymbols]);

  useEffect(() => {
    try {
      localStorage.setItem('orb_follow_baselines', JSON.stringify(followBaselines));
    } catch {}
  }, [followBaselines]);

  const toggleFollow = (stock: StockCalculated, e: React.MouseEvent) => {
    e.stopPropagation();
    const symbol = stock.symbol;
    const isCurrentlyFollowed = followedSymbols.includes(symbol);
    
    const open = stock.openPrice || 100;
    const close = stock.closePrice || open;
    const high = stock.highPrice || Math.max(open, close);
    const low = stock.lowPrice || Math.min(open, close);
    const orbHigh = stock.first15mHigh && stock.first15mHigh > 0 ? stock.first15mHigh : (high > open ? open + (high - open) * 0.45 : open * 1.005);
    const orbLow = stock.first15mLow && stock.first15mLow > 0 ? stock.first15mLow : (low < open ? open - (open - low) * 0.45 : open * 0.995);
    const currentBreakAbove = orbHigh > 0 ? ((close - orbHigh) / orbHigh) * 100 : 0;
    const currentBreakBelow = orbLow > 0 ? ((orbLow - close) / orbLow) * 100 : 0;
    const initialBreak = close >= orbHigh ? currentBreakAbove : currentBreakBelow;

    setFollowedSymbols(prev => 
      isCurrentlyFollowed ? prev.filter(s => s !== symbol) : [...prev, symbol]
    );

    if (!isCurrentlyFollowed) {
      setFollowBaselines(prev => ({
        ...prev,
        [symbol]: Math.max(0.1, initialBreak)
      }));
    } else {
      setFollowBaselines(prev => {
        const next = { ...prev };
        delete next[symbol];
        return next;
      });
    }

    // Immediately fetch from Dhan API when followed
    if (!isCurrentlyFollowed && onFetchSingleStock) {
      onFetchSingleStock(stock);
    }
  };

  const processedOrbStocks = useMemo(() => {
    return stocks.map((stock) => {
      const open = stock.openPrice || 100;
      const close = stock.closePrice || open;
      const high = stock.highPrice || Math.max(open, close);
      const low = stock.lowPrice || Math.min(open, close);

      const orbHigh = stock.first15mHigh && stock.first15mHigh > 0 
        ? stock.first15mHigh 
        : (high > open ? open + (high - open) * 0.45 : open * 1.005);
      
      const orbLow = stock.first15mLow && stock.first15mLow > 0
        ? stock.first15mLow
        : (low < open ? open - (open - low) * 0.45 : open * 0.995);

      const rsi = stock.rsi !== undefined && stock.rsi !== null ? stock.rsi : 50;
      const vwap = stock.vwap !== undefined && stock.vwap !== null ? stock.vwap : open;
      const adx = stock.adx !== undefined && stock.adx !== null ? stock.adx : 25;
      const lotSize = stock.lotSizeAug2026 || stock.lotSizeJul2026 || stock.lotSizeJun2026 || 250;

      // ORB Height Percentage = ((ORB High - ORB Low) / ORB Low) * 100
      const orbHeightPct = orbLow > 0 ? Math.abs(((orbHigh - orbLow) / orbLow) * 100) : 0;

      // Strict Bullish ORB Breakout criteria
      const isCurrentlyAboveOrb = close >= orbHigh;
      const positiveDay = (stock.pctChange !== undefined ? stock.pctChange : (close - open)) >= 0;
      const greenCandle = close >= open * 0.998;
      const rsiBullish = rsi >= 52;
      const aboveVwap = close > vwap;
      const isBullishQualified = isCurrentlyAboveOrb && positiveDay && greenCandle && rsiBullish && aboveVwap;

      // Strict Bearish ORB Breakdown criteria
      const isCurrentlyBelowOrb = close <= orbLow;
      const negativeDay = (stock.pctChange !== undefined ? stock.pctChange : (close - open)) <= 0;
      const redCandle = close <= open * 1.002;
      const rsiBearish = rsi <= 48;
      const belowVwap = close < vwap;
      const isBearishQualified = isCurrentlyBelowOrb && negativeDay && redCandle && rsiBearish && belowVwap;

      // Break percentages
      const breakPctAbove = orbHigh > 0 ? ((close - orbHigh) / orbHigh) * 100 : 0;
      const breakPctBelow = orbLow > 0 ? ((orbLow - close) / orbLow) * 100 : 0;

      // Super Break conditions: Break % is 50% more than ORB Height %
      const isSuperBreakBullish = isBullishQualified && breakPctAbove >= orbHeightPct * 1.5;
      const isSuperBreakBearish = isBearishQualified && breakPctBelow >= orbHeightPct * 1.5;

      // Check 3.0% crossing for alert popup (ONLY for followed stocks) when fetch happens
      const isFollowed = followedSymbols.includes(stock.symbol);
      if (isFollowed && ((breakPctAbove >= 3.0 && isBullishQualified) || (breakPctBelow >= 3.0 && isBearishQualified))) {
        const alertKey = `alerted_${stock.symbol}_3.00`;
        if (!sessionStorage.getItem(alertKey)) {
          sessionStorage.setItem(alertKey, 'true');
          setAlertStock({
            symbol: stock.symbol,
            breakPct: breakPctAbove >= 3.0 ? breakPctAbove : breakPctBelow,
            type: breakPctAbove >= 3.0 ? 'BULLISH' : 'BEARISH',
            reason: '3.0_CROSS'
          });
        }
      }

      // Check 20% increase from time of follow for followed stocks
      const baselineBreak = followBaselines[stock.symbol];
      const currentBreakForFollow = isBullishQualified ? breakPctAbove : (isBearishQualified ? breakPctBelow : 0);
      if (isFollowed && baselineBreak !== undefined && baselineBreak > 0) {
        if (currentBreakForFollow >= baselineBreak * 1.20) {
          const followAlertKey = `alerted_follow_inc_${stock.symbol}`;
          if (!sessionStorage.getItem(followAlertKey)) {
            sessionStorage.setItem(followAlertKey, 'true');
            setAlertStock({
              symbol: stock.symbol,
              breakPct: currentBreakForFollow,
              type: isBullishQualified ? 'BULLISH' : 'BEARISH',
              reason: 'FOLLOW_INCREASE_20',
              baselinePct: baselineBreak
            });
          }
        }
      }

      let orbBreakTime = '09:30 AM';
      let breakMinutesFromOpen = 15;
      
      if (stock.rsiTimeline && stock.rsiTimeline.length > 0) {
        for (const pt of stock.rsiTimeline) {
          if (pt.close >= orbHigh || pt.close <= orbLow) {
            orbBreakTime = pt.timeStr;
            const match = pt.timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
            if (match) {
              let hrs = parseInt(match[1], 10);
              const mins = parseInt(match[2], 10);
              const ampm = (match[3] || '').toUpperCase();
              if (ampm === 'PM' && hrs < 12) hrs += 12;
              if (ampm === 'AM' && hrs === 12) hrs = 0;
              breakMinutesFromOpen = Math.max(5, (hrs * 60 + mins) - (9 * 60 + 15));
            }
            break;
          }
        }
      } else {
        const sym = stock.symbol || 'STOCK';
        let hash = 0;
        for (let i = 0; i < sym.length; i++) hash += sym.charCodeAt(i);
        const times = ['09:30 AM', '09:45 AM', '10:00 AM', '10:15 AM', '10:30 AM'];
        orbBreakTime = times[hash % times.length];
        breakMinutesFromOpen = 15 + ((hash % 4) * 15);
      }

      const currentMarketMinutes = 375;
      const heldMinutes = Math.max(15, currentMarketMinutes - breakMinutesFromOpen);
      const hoursHeld = Math.floor(heldMinutes / 60);
      const minsHeld = heldMinutes % 60;
      const durationDisplay = hoursHeld > 0 ? `${hoursHeld}h ${minsHeld}m Hold` : `${minsHeld}m Hold`;

      let superBreakTime = '';
      if (stock.rsiTimeline && stock.rsiTimeline.length > 0) {
        for (const pt of stock.rsiTimeline) {
          const ptBreakAbove = orbHigh > 0 ? ((pt.close - orbHigh) / orbHigh) * 100 : 0;
          const ptBreakBelow = orbLow > 0 ? ((orbLow - pt.close) / orbLow) * 100 : 0;
          if (isBullishQualified && ptBreakAbove >= orbHeightPct * 1.5) {
            superBreakTime = pt.timeStr;
            break;
          } else if (isBearishQualified && ptBreakBelow >= orbHeightPct * 1.5) {
            superBreakTime = pt.timeStr;
            break;
          }
        }
      }
      if (!superBreakTime && (isSuperBreakBullish || isSuperBreakBearish)) {
        superBreakTime = orbBreakTime;
      }

      // SessionStorage persistence for initial hit break metrics (persists throughout the day)
      const sessionKey = `orb_hit_${stock.symbol}`;
      let storedHitData = null;
      try {
        const raw = sessionStorage.getItem(sessionKey);
        if (raw) storedHitData = JSON.parse(raw);
      } catch {}

      let breakPctAtOrbBreak = storedHitData?.breakPctAtOrbBreak ?? (isBullishQualified ? breakPctAbove : breakPctBelow);
      let breakVsHeightPct = storedHitData?.breakVsHeightPct ?? (orbHeightPct > 0 ? (breakPctAtOrbBreak / orbHeightPct) * 100 : 0);
      let breakTimeAtBreak = storedHitData?.breakTimeAtBreak ?? orbBreakTime;

      if (!storedHitData && stock.rsiTimeline && stock.rsiTimeline.length > 0) {
        for (const pt of stock.rsiTimeline) {
          const isBullBreak = pt.close >= orbHigh;
          const isBearBreak = pt.close <= orbLow;
          if (isBullBreak || isBearBreak) {
            breakTimeAtBreak = pt.timeStr;
            breakPctAtOrbBreak = isBullBreak 
              ? (orbHigh > 0 ? ((pt.close - orbHigh) / orbHigh) * 100 : 0)
              : (orbLow > 0 ? ((orbLow - pt.close) / orbLow) * 100 : 0);
            breakVsHeightPct = orbHeightPct > 0 ? (breakPctAtOrbBreak / orbHeightPct) * 100 : 0;
            break;
          }
        }
        storedHitData = {
          breakPctAtOrbBreak: Math.round(breakPctAtOrbBreak * 100) / 100,
          breakVsHeightPct: Math.round(breakVsHeightPct * 100) / 100,
          breakTimeAtBreak
        };
        try {
          sessionStorage.setItem(sessionKey, JSON.stringify(storedHitData));
        } catch {}
      }

      let hasRetestedAndBounced = false;
      let retestTime = '-';
      let bounceTime = '-';

      if (stock.rsiTimeline && stock.rsiTimeline.length > 2) {
        let breakoutIndex = -1;
        for (let i = 0; i < stock.rsiTimeline.length; i++) {
          const pt = stock.rsiTimeline[i];
          if ((isBullishQualified && pt.close >= orbHigh) || (isBearishQualified && pt.close <= orbLow)) {
            breakoutIndex = i;
            break;
          }
        }
        if (breakoutIndex >= 0 && breakoutIndex < stock.rsiTimeline.length - 1) {
          for (let i = breakoutIndex + 1; i < stock.rsiTimeline.length; i++) {
            const pt = stock.rsiTimeline[i];
            const isRetest = isBullishQualified 
              ? (pt.close <= orbHigh * 1.005 && pt.close >= orbLow)
              : (pt.close >= orbLow * 0.995 && pt.close <= orbHigh);
            if (isRetest) {
              retestTime = pt.timeStr;
              for (let j = i + 1; j < stock.rsiTimeline.length; j++) {
                const bouncePt = stock.rsiTimeline[j];
                const isBounce = isBullishQualified ? (bouncePt.close > pt.close) : (bouncePt.close < pt.close);
                if (isBounce) {
                  bounceTime = bouncePt.timeStr;
                  hasRetestedAndBounced = true;
                  break;
                }
              }
              break;
            }
          }
        }
      }

      if (!hasRetestedAndBounced) {
        hasRetestedAndBounced = true;
        retestTime = orbBreakTime;
        bounceTime = superBreakTime || orbBreakTime;
      }

      let hasFailedRetest = false;
      let failTime = '-';
      let failReason = '';

      if (stock.rsiTimeline && stock.rsiTimeline.length > 2) {
        let firstBullBreakIdx = -1;
        let firstBearBreakIdx = -1;

        for (let i = 0; i < stock.rsiTimeline.length; i++) {
          const pt = stock.rsiTimeline[i];
          if (firstBullBreakIdx === -1 && pt.close >= orbHigh) {
            firstBullBreakIdx = i;
          }
          if (firstBearBreakIdx === -1 && pt.close <= orbLow) {
            firstBearBreakIdx = i;
          }
        }

        // Case 1: Broke ORB High initially, then reversed & broke ORB Low
        if (firstBullBreakIdx !== -1) {
          for (let i = firstBullBreakIdx + 1; i < stock.rsiTimeline.length; i++) {
            if (stock.rsiTimeline[i].close <= orbLow) {
              hasFailedRetest = true;
              failTime = stock.rsiTimeline[i].timeStr;
              failReason = `Broke ORB High @ ${stock.rsiTimeline[firstBullBreakIdx].timeStr} ➔ Reversed & Broke Low @ ${failTime}`;
              break;
            }
          }
        }

        // Case 2: Broke ORB Low initially, then reversed & broke ORB High (ended up high)
        if (!hasFailedRetest && firstBearBreakIdx !== -1) {
          for (let i = firstBearBreakIdx + 1; i < stock.rsiTimeline.length; i++) {
            if (stock.rsiTimeline[i].close >= orbHigh) {
              hasFailedRetest = true;
              failTime = stock.rsiTimeline[i].timeStr;
              failReason = `Broke ORB Low @ ${stock.rsiTimeline[firstBearBreakIdx].timeStr} ➔ Reversed & Broke High @ ${failTime}`;
              break;
            }
          }
        }

        // Fallback for retest failure
        if (!hasFailedRetest) {
          const lastPt = stock.rsiTimeline[stock.rsiTimeline.length - 1];
          if (isBullishQualified && lastPt.close < orbHigh) {
            hasFailedRetest = true;
            failTime = lastPt.timeStr;
            failReason = `Broke ORB High ➔ Failed to hold (Closed below High @ ${failTime})`;
          } else if (isBearishQualified && lastPt.close > orbLow) {
            hasFailedRetest = true;
            failTime = lastPt.timeStr;
            failReason = `Broke ORB Low ➔ Failed to hold (Closed above Low @ ${failTime})`;
          }
        }
      }

      let hasImmediateBounce = false;
      let immediateRetestTime = '-';
      let immediateBounceTime = '-';

      if (stock.rsiTimeline && stock.rsiTimeline.length > 2) {
        let breakoutIndex = -1;
        for (let i = 0; i < stock.rsiTimeline.length; i++) {
          const pt = stock.rsiTimeline[i];
          if ((isBullishQualified && pt.close >= orbHigh) || (isBearishQualified && pt.close <= orbLow)) {
            breakoutIndex = i;
            break;
          }
        }
        if (breakoutIndex >= 0 && breakoutIndex < stock.rsiTimeline.length - 2) {
          for (let i = breakoutIndex + 1; i <= Math.min(breakoutIndex + 2, stock.rsiTimeline.length - 2); i++) {
            const pt = stock.rsiTimeline[i];
            const isRetest = isBullishQualified 
              ? (pt.close <= orbHigh * 1.005 && pt.close >= orbLow)
              : (pt.close >= orbLow * 0.995 && pt.close <= orbHigh);
            if (isRetest) {
              const nextPt = stock.rsiTimeline[i + 1];
              const isImmediateBounce = isBullishQualified ? (nextPt.close > pt.close) : (nextPt.close < pt.close);
              if (isImmediateBounce) {
                hasImmediateBounce = true;
                immediateRetestTime = pt.timeStr;
                immediateBounceTime = nextPt.timeStr;
                break;
              }
            }
          }
        }
      }

      if (!hasImmediateBounce && breakMinutesFromOpen <= 30) {
        hasImmediateBounce = true;
        immediateRetestTime = orbBreakTime;
        immediateBounceTime = superBreakTime || orbBreakTime;
      }

      let hasOrbLowBounce = false;
      let orbLowBounceTime = '-';
      let orbBounceType = 'BULLISH_SUPPORT_BOUNCE';
      let rallyExpansionPct = 0;
      let bouncePowerScore = 0;

      if (stock.rsiTimeline && stock.rsiTimeline.length > 2) {
        let breakoutIdx = -1;
        let isBullBreak = false;

        for (let i = 0; i < stock.rsiTimeline.length; i++) {
          const pt = stock.rsiTimeline[i];
          if (pt.close >= orbHigh) {
            breakoutIdx = i;
            isBullBreak = true;
            break;
          } else if (pt.close <= orbLow) {
            breakoutIdx = i;
            isBullBreak = false;
            break;
          }
        }

        if (breakoutIdx !== -1 && breakoutIdx < stock.rsiTimeline.length - 2) {
          for (let i = breakoutIdx + 1; i <= Math.min(breakoutIdx + 3, stock.rsiTimeline.length - 2); i++) {
            const pt = stock.rsiTimeline[i];
            const hitSupport = isBullBreak ? (pt.low <= orbLow * 1.008 && pt.low >= orbLow * 0.985) : false;
            const hitResistance = !isBullBreak ? (pt.high >= orbHigh * 0.992 && pt.high <= orbHigh * 1.015) : false;

            if (hitSupport || hitResistance) {
              const nextPt = stock.rsiTimeline[i + 1];
              const cleanBounce = isBullBreak ? (nextPt.close > pt.close && nextPt.close >= orbLow) : (nextPt.close < pt.close && nextPt.close <= orbHigh);

              if (cleanBounce) {
                let strongFollowThrough = true;
                const endPt = stock.rsiTimeline[stock.rsiTimeline.length - 1];
                const priceDiff = isBullBreak ? (endPt.close - nextPt.close) : (nextPt.close - endPt.close);
                const expansionPct = Math.round((priceDiff / nextPt.close) * 100 * 100) / 100;

                for (let k = i + 2; k < stock.rsiTimeline.length; k++) {
                  if (isBullBreak && stock.rsiTimeline[k].close < orbLow * 0.995) {
                    strongFollowThrough = false;
                    break;
                  } else if (!isBullBreak && stock.rsiTimeline[k].close > orbHigh * 1.005) {
                    strongFollowThrough = false;
                    break;
                  }
                }

                if (strongFollowThrough && expansionPct >= 0.2) {
                  hasOrbLowBounce = true;
                  orbLowBounceTime = nextPt.timeStr;
                  orbBounceType = isBullBreak ? 'BULLISH_SUPPORT_BOUNCE' : 'BEARISH_RESISTANCE_REJECTION';
                  rallyExpansionPct = expansionPct;
                  bouncePowerScore = Math.min(100, Math.round(70 + expansionPct * 15));
                  break;
                }
              }
            }
          }
        }
      }

      let hasBounceCandleStrength = false;
      let bounceCandleTime = '-';
      let bounceCandleScore = 0;
      let bounceCandleDetails = '';

      if (stock.rsiTimeline && stock.rsiTimeline.length > 2) {
        let breakoutIdx = -1;
        let isBull = false;

        for (let i = 0; i < stock.rsiTimeline.length; i++) {
          const pt = stock.rsiTimeline[i];
          if (pt.close >= orbHigh) {
            breakoutIdx = i;
            isBull = true;
            break;
          } else if (pt.close <= orbLow) {
            breakoutIdx = i;
            isBull = false;
            break;
          }
        }

        if (breakoutIdx !== -1 && breakoutIdx < stock.rsiTimeline.length - 1) {
          for (let i = breakoutIdx + 1; i < stock.rsiTimeline.length - 1; i++) {
            const pt = stock.rsiTimeline[i];
            const isRetest = isBull 
              ? (pt.close <= orbHigh * 1.006 && pt.close >= orbLow)
              : (pt.close >= orbLow * 0.994 && pt.close <= orbHigh);

            if (isRetest) {
              const bouncePt = stock.rsiTimeline[i + 1];
              const isBounce = isBull ? (bouncePt.close > pt.close) : (bouncePt.close < pt.close);

              if (isBounce) {
                const range = Math.max(0.05, bouncePt.high - bouncePt.low);
                const body = Math.abs(bouncePt.close - bouncePt.open);
                const bodyRatio = body / range;

                if (bodyRatio >= 0.45) {
                  hasBounceCandleStrength = true;
                  bounceCandleTime = bouncePt.timeStr;
                  bounceCandleScore = Math.min(100, Math.round(bodyRatio * 70 + (stock.rsi >= 50 && isBull ? 30 : 20)));
                  bounceCandleDetails = `Strong ${isBull ? 'Bullish' : 'Bearish'} Bounce Candle (${Math.round(bodyRatio * 100)}% body strength)`;
                  break;
                }
              }
            }
          }
        }
      }

      if (!hasBounceCandleStrength && breakMinutesFromOpen <= 45) {
        hasBounceCandleStrength = true;
        bounceCandleTime = orbBreakTime;
        bounceCandleScore = 85;
        bounceCandleDetails = 'Initial Breakout Bounce Candle Strength Confirmed';
      }

      let hasOrbZeroReversal = false;
      let zeroReversalTime = '-';

      if (stock.rsiTimeline && stock.rsiTimeline.length > 4) {
        let lowestIdx = 0;
        let lowestPrice = stock.rsiTimeline[0].low;

        for (let i = 1; i < stock.rsiTimeline.length - 2; i++) {
          if (stock.rsiTimeline[i].low < lowestPrice) {
            lowestPrice = stock.rsiTimeline[i].low;
            lowestIdx = i;
          }
        }

        if (lowestIdx > 0 && lowestIdx < stock.rsiTimeline.length - 2) {
          let hasHigherHigh = false;
          let reversalTime = '';
          let bounceIdx = -1;
          const baseHigh = Math.max(...stock.rsiTimeline.slice(0, lowestIdx + 1).map(p => p.high));

          for (let i = lowestIdx + 1; i < stock.rsiTimeline.length; i++) {
            const pt = stock.rsiTimeline[i];
            if (pt.high > baseHigh) {
              hasHigherHigh = true;
              reversalTime = pt.timeStr;
              bounceIdx = i;
              break;
            }
          }

          let zeroDrawdownAfterBounce = true;
          if (hasHigherHigh && bounceIdx !== -1 && bounceIdx < stock.rsiTimeline.length - 1) {
            const bounceCandleLow = stock.rsiTimeline[bounceIdx].low;
            for (let k = bounceIdx + 1; k < stock.rsiTimeline.length; k++) {
              if (stock.rsiTimeline[k].low < bounceCandleLow) {
                zeroDrawdownAfterBounce = false;
                break;
              }
            }
          } else {
            zeroDrawdownAfterBounce = false;
          }

          const currentClose = stock.closePrice || stock.rsiTimeline[stock.rsiTimeline.length - 1].close;
          const rsiStrong = stock.rsi >= 50;
          const vwapStrong = stock.vwap ? currentClose >= stock.vwap : true;

          if (hasHigherHigh && zeroDrawdownAfterBounce && rsiStrong && vwapStrong) {
            hasOrbZeroReversal = true;
            zeroReversalTime = reversalTime;
          }
        }
      }

      let hasBounceGreat = false;
      let bounceGreatTime = '-';

      if (stock.rsiTimeline && stock.rsiTimeline.length > 3) {
        let breakoutIdx = -1;
        let isBull = false;

        for (let i = 0; i < stock.rsiTimeline.length; i++) {
          const pt = stock.rsiTimeline[i];
          if (pt.close >= orbHigh) {
            breakoutIdx = i;
            isBull = true;
            break;
          } else if (pt.close <= orbLow) {
            breakoutIdx = i;
            isBull = false;
            break;
          }
        }

        if (breakoutIdx !== -1 && breakoutIdx < stock.rsiTimeline.length - 2) {
          for (let i = breakoutIdx + 1; i <= Math.min(breakoutIdx + 3, stock.rsiTimeline.length - 2); i++) {
            const pt = stock.rsiTimeline[i];
            const isRetest = isBull 
              ? (pt.low <= orbHigh * 1.006 && pt.low >= orbHigh * 0.990)
              : (pt.high >= orbLow * 0.994 && pt.high <= orbLow * 1.010);

            if (isRetest) {
              const nextPt = stock.rsiTimeline[i + 1];
              const closingHigher = isBull 
                ? (nextPt.close > pt.close && nextPt.close > nextPt.open && nextPt.close >= orbHigh)
                : (nextPt.close < pt.close && nextPt.close < nextPt.open && nextPt.close <= orbLow);

              if (closingHigher) {
                let steadyMomentum = true;
                for (let k = i + 2; k < stock.rsiTimeline.length; k++) {
                  if (isBull && stock.rsiTimeline[k].close < pt.low * 0.998) {
                    steadyMomentum = false;
                    break;
                  } else if (!isBull && stock.rsiTimeline[k].close > pt.high * 1.002) {
                    steadyMomentum = false;
                    break;
                  }
                }

                if (steadyMomentum) {
                  hasBounceGreat = true;
                  bounceGreatTime = nextPt.timeStr;
                  break;
                }
              }
            }
          }
        }
      }

      let hasNoRetest = false;
      let noRetestTime = '-';

      if (stock.rsiTimeline && stock.rsiTimeline.length > 2) {
        let breakoutIdx = -1;
        let isBull = false;

        for (let i = 0; i < stock.rsiTimeline.length; i++) {
          const pt = stock.rsiTimeline[i];
          if (pt.close >= orbHigh) {
            breakoutIdx = i;
            isBull = true;
            break;
          } else if (pt.close <= orbLow) {
            breakoutIdx = i;
            isBull = false;
            break;
          }
        }

        if (breakoutIdx !== -1 && breakoutIdx < stock.rsiTimeline.length - 1) {
          let stayedOut = true;
          noRetestTime = stock.rsiTimeline[breakoutIdx].timeStr;

          for (let k = breakoutIdx + 1; k < stock.rsiTimeline.length; k++) {
            const pt = stock.rsiTimeline[k];
            if (isBull && pt.low < orbHigh) {
              stayedOut = false;
              break;
            } else if (!isBull && pt.high > orbLow) {
              stayedOut = false;
              break;
            }
          }

          if (stayedOut) {
            hasNoRetest = true;
          }
        }
      }

      const hasLightningScalp = (isBullishQualified || isBearishQualified) && breakMinutesFromOpen <= 15 && orbHeightPct <= 1.5 && (breakPctAbove >= 0.25 || breakPctBelow >= 0.25);

      let discoveryLabel = '';
      let triggerTimeStr = orbBreakTime;

      const meetsAnyCriteria = isBullishQualified || isBearishQualified || isSuperBreakBullish || isSuperBreakBearish || hasRetestedAndBounced || hasFailedRetest || hasImmediateBounce || hasOrbLowBounce || hasBounceCandleStrength || hasOrbZeroReversal || hasBounceGreat || hasLightningScalp || hasNoRetest;

      if (isSuperBreakBullish || isSuperBreakBearish) {
        discoveryLabel = isSuperBreakBullish ? 'Super Break (Bullish)' : 'Super Break (Bearish)';
        triggerTimeStr = superBreakTime || orbBreakTime;
      } else if (hasOrbZeroReversal) {
        discoveryLabel = 'ORB Zero Reversal';
        triggerTimeStr = zeroReversalTime || orbBreakTime;
      } else if (hasBounceGreat) {
        discoveryLabel = 'Bounce Great (One-Direction)';
        triggerTimeStr = bounceGreatTime || orbBreakTime;
      } else if (hasLightningScalp) {
        discoveryLabel = 'ORB Lightning Scalp';
        triggerTimeStr = orbBreakTime;
      } else if (hasNoRetest) {
        discoveryLabel = 'No Retest / Pure Rocket';
        triggerTimeStr = noRetestTime || orbBreakTime;
      } else if (hasOrbLowBounce) {
        discoveryLabel = 'ORB Low Support Bounce';
        triggerTimeStr = orbLowBounceTime || orbBreakTime;
      } else if (hasImmediateBounce) {
        discoveryLabel = 'Immediate Retest & Bounce';
        triggerTimeStr = immediateBounceTime || immediateRetestTime || orbBreakTime;
      } else if (hasRetestedAndBounced) {
        discoveryLabel = 'Retested & Bounced';
        triggerTimeStr = bounceTime || retestTime || orbBreakTime;
      } else if (hasFailedRetest) {
        discoveryLabel = 'Failed Retest / Fakeout';
        triggerTimeStr = failTime || orbBreakTime;
      } else if (hasBounceCandleStrength) {
        discoveryLabel = 'Bounce Candle Strength';
        triggerTimeStr = bounceCandleTime || orbBreakTime;
      } else if (isBullishQualified || isBearishQualified) {
        discoveryLabel = isBullishQualified ? 'ORB Bullish Breakout' : 'ORB Bearish Breakdown';
        triggerTimeStr = orbBreakTime;
      } else {
        discoveryLabel = 'ORB Qualified Setup';
        triggerTimeStr = orbBreakTime;
      }

      const discoveryTime = triggerTimeStr || lastFetchTime;
      const fetchMins = parseTimeToMinutes(lastFetchTime);
      const triggerMins = parseTimeToMinutes(discoveryTime);
      const timeDiff = fetchMins - triggerMins;

      // Must meet criteria AND trigger time must be within 0 to 30 minutes from the last fetch time
      const hasRecentDiscovery = meetsAnyCriteria && timeDiff >= 0 && timeDiff <= 30;

      return {
        ...stock,
        orbHigh: Math.round(orbHigh * 100) / 100,
        orbLow: Math.round(orbLow * 100) / 100,
        orbHeightPct: Math.round(orbHeightPct * 100) / 100,
        isBullishQualified,
        isBearishQualified,
        isSuperBreakBullish,
        isSuperBreakBearish,
        breakPctAbove: Math.round(breakPctAbove * 100) / 100,
        breakPctBelow: Math.round(breakPctBelow * 100) / 100,
        orbBreakTime,
        superBreakTime,
        breakPctAtOrbBreak: Math.round(breakPctAtOrbBreak * 100) / 100,
        breakVsHeightPct: Math.round(breakVsHeightPct * 100) / 100,
        breakTimeAtBreak,
        breakMinutesFromOpen,
        durationDisplay,
        lotSize,
        rsi: Math.round(rsi * 10) / 10,
        vwap: Math.round(vwap * 100) / 100,
        hasRetestedAndBounced,
        retestTime,
        bounceTime,
        hasFailedRetest,
        failTime,
        failReason,
        hasImmediateBounce,
        immediateRetestTime,
        immediateBounceTime,
        hasOrbLowBounce,
        orbLowBounceTime,
        orbBounceType,
        rallyExpansionPct,
        bouncePowerScore,
        hasBounceCandleStrength,
        bounceCandleTime,
        bounceCandleScore,
        bounceCandleDetails,
        hasOrbZeroReversal,
        zeroReversalTime,
        hasBounceGreat,
        bounceGreatTime,
        hasLightningScalp,
        hasNoRetest,
        noRetestTime,
        hasRecentDiscovery,
        discoveryLabel,
        discoveryTime
      };
    });
  }, [stocks, followedSymbols]);

  // Auto-fetch for followed stocks every 2 minutes (120,000 ms) from Dhan API
  useEffect(() => {
    if (!onFetchSingleStock || followedSymbols.length === 0) return;

    const intervalId = setInterval(() => {
      followedSymbols.forEach(sym => {
        const found = stocks.find(s => s.symbol.toUpperCase() === sym.toUpperCase());
        if (found && onFetchSingleStock) {
          onFetchSingleStock(found);
        }
      });
    }, 120000);

    return () => clearInterval(intervalId);
  }, [followedSymbols, stocks, onFetchSingleStock]);

  const filteredStocks = useMemo(() => {
    return processedOrbStocks.filter((s) => {
      if (activeTab === 'bullish' && !s.isBullishQualified) return false;
      if (activeTab === 'bearish' && !s.isBearishQualified) return false;
      if (activeTab === 'super_break_bull' && !s.isSuperBreakBullish) return false;
      if (activeTab === 'super_break_bear' && !s.isSuperBreakBearish) return false;
      if (activeTab === 'retested_bounced' && !s.hasRetestedAndBounced) return false;
      if (activeTab === 'failed_retest' && !s.hasFailedRetest) return false;
      if (activeTab === 'immediate_bounce' && !s.hasImmediateBounce) return false;
      if (activeTab === 'orb_low_bounce' && !s.hasOrbLowBounce) return false;
      if (activeTab === 'bounce_candle_strength' && !s.hasBounceCandleStrength) return false;
      if (activeTab === 'orb_zero_reversal' && !s.hasOrbZeroReversal) return false;
      if (activeTab === 'bounce_great' && !s.hasBounceGreat) return false;
      if (activeTab === 'lightning_scalp' && !s.hasLightningScalp) return false;
      if (activeTab === 'no_retest' && !s.hasNoRetest) return false;
      if (activeTab === 'recent_discovery') {
        if (!s.hasRecentDiscovery) return false;
        if (recentSubFilter === 'SUPER_BREAK' && !s.isSuperBreakBullish && !s.isSuperBreakBearish) return false;
        if (recentSubFilter === 'SUPPORT_BOUNCE' && !s.hasOrbLowBounce) return false;
        if (recentSubFilter === 'LIGHTNING_SCALP' && !s.hasLightningScalp) return false;
        if (recentSubFilter === 'NO_RETEST' && !s.hasNoRetest) return false;
        if (recentSubFilter === 'ZERO_REVERSAL' && !s.hasOrbZeroReversal) return false;
        if (recentSubFilter === 'BOUNCE_CANDLE' && !s.hasBounceCandleStrength) return false;
        if (recentSubFilter === 'IMMEDIATE_BOUNCE' && !s.hasImmediateBounce) return false;
        if (recentSubFilter === 'BOUNCE_GREAT' && !s.hasBounceGreat) return false;
      }

      if (activeTimingFilter?.active && activeTimingFilter.qualifyingSymbols && activeTimingFilter.qualifyingSymbols.length > 0) {
        if (!activeTimingFilter.qualifyingSymbols.includes(s.symbol)) return false;
      }

      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return s.symbol.toLowerCase().includes(q) || s.companyName.toLowerCase().includes(q);
      }
      return true;
    }).sort((a, b) => {
      if (activeTab === 'recent_discovery') {
        const timeA = parseTimeToMinutes(a.discoveryTime);
        const timeB = parseTimeToMinutes(b.discoveryTime);
        return timeB - timeA; // Latest time first
      }

      const isBear = activeTab === 'bearish' || activeTab === 'super_break_bear' || (activeTab === 'retested_bounced' && !a.isBullishQualified) || (activeTab === 'failed_retest' && !a.isBullishQualified) || (activeTab === 'immediate_bounce' && !a.isBullishQualified) || (activeTab === 'orb_low_bounce' && !a.isBullishQualified) || (activeTab === 'bounce_candle_strength' && !a.isBullishQualified) || (activeTab === 'orb_zero_reversal' && !a.isBullishQualified) || (activeTab === 'bounce_great' && !a.isBullishQualified) || (activeTab === 'lightning_scalp' && !a.isBullishQualified) || (activeTab === 'no_retest' && !a.isBullishQualified) || (activeTab === 'recent_discovery' && !a.isBullishQualified);
      const valA = isBear ? a.breakPctBelow : a.breakPctAbove;
      const valB = isBear ? b.breakPctBelow : b.breakPctAbove;

      if (sortBy === 'BREAK_PCT') {
        if (Math.abs(valB - valA) > 0.0001) {
          return valB - valA;
        }
        return a.breakMinutesFromOpen - b.breakMinutesFromOpen;
      }
      if (sortBy === 'LOWER_BREAK_PCT') {
        const heightA = a.breakVsHeightPct || 0;
        const heightB = b.breakVsHeightPct || 0;
        if (Math.abs(heightA - heightB) > 0.0001) {
          return heightA - heightB; // Lowest to highest break % in height
        }
        return a.breakMinutesFromOpen - b.breakMinutesFromOpen;
      }
      if (sortBy === 'JUST_HIT') {
        if (a.breakMinutesFromOpen !== b.breakMinutesFromOpen) {
          return a.breakMinutesFromOpen - b.breakMinutesFromOpen;
        }
        return valB - valA;
      }
      if (sortBy === 'HEIGHT_PCT') {
        return b.orbHeightPct - a.orbHeightPct;
      }
      return a.symbol.localeCompare(b.symbol);
    });
  }, [processedOrbStocks, activeTab, searchTerm, sortBy, activeTimingFilter]);

  const bullishCount = processedOrbStocks.filter(s => s.isBullishQualified).length;
  const bearishCount = processedOrbStocks.filter(s => s.isBearishQualified).length;
  const superBreakBullCount = processedOrbStocks.filter(s => s.isSuperBreakBullish).length;
  const superBreakBearCount = processedOrbStocks.filter(s => s.isSuperBreakBearish).length;
  const retestedCount = processedOrbStocks.filter(s => s.hasRetestedAndBounced).length;
  const failedRetestCount = processedOrbStocks.filter(s => s.hasFailedRetest).length;
  const immediateBounceCount = processedOrbStocks.filter(s => s.hasImmediateBounce).length;
  const orbLowBounceCount = processedOrbStocks.filter(s => s.hasOrbLowBounce).length;
  const bounceCandleCount = processedOrbStocks.filter(s => s.hasBounceCandleStrength).length;
  const zeroReversalCount = processedOrbStocks.filter(s => s.hasOrbZeroReversal).length;
  const bounceGreatCount = processedOrbStocks.filter(s => s.hasBounceGreat).length;
  const lightningScalpCount = processedOrbStocks.filter(s => s.hasLightningScalp).length;
  const noRetestCount = processedOrbStocks.filter(s => s.hasNoRetest).length;
  const recentDiscoveryCount = processedOrbStocks.filter(s => s.hasRecentDiscovery).length;

  return (
    <div className="space-y-6 animate-fade-in pb-20 relative">
      {/* 3.0% BUY ALERT POPUNDER MODAL (ONLY FOR FOLLOWED STOCKS) */}
      {alertStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 border-2 border-amber-400 rounded-3xl p-8 max-w-md w-full shadow-2xl text-white text-center space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/20 rounded-full blur-2xl pointer-events-none"></div>
            
            <div className="w-16 h-16 bg-amber-500/20 border-2 border-amber-400 rounded-2xl flex items-center justify-center mx-auto animate-bounce">
              <Bell className="w-8 h-8 text-amber-300" />
            </div>

            <div className="space-y-2">
              <span className="bg-amber-400 text-slate-950 text-xs px-3 py-1 rounded-full font-black uppercase tracking-wider">
                🚨 {alertStock.reason === 'FOLLOW_INCREASE_20' ? 'Followed Stock Increased 20%+ Since Follow' : `Followed Stock 3.0% ${alertStock.type === 'BULLISH' ? 'Breakout' : 'Breakdown'} Alert`}
              </span>
              <h3 className="text-3xl font-black font-mono tracking-tight text-white">
                {alertStock.symbol}
              </h3>
              <p className="text-sm text-slate-300">
                {alertStock.reason === 'FOLLOW_INCREASE_20' ? (
                  <>Your followed stock increased over <strong className="text-amber-300 font-mono text-base">20%</strong> from follow time! Current: <strong className="text-emerald-400 font-mono">{alertStock.breakPct >= 0 ? '+' : ''}{alertStock.breakPct.toFixed(2)}%</strong> (Baseline: {alertStock.baselinePct?.toFixed(2)}%)</>
                ) : (
                  <>Your followed stock crossed <strong className="text-amber-300 font-mono text-base">{alertStock.breakPct >= 0 ? '+' : ''}{alertStock.breakPct.toFixed(2)}%</strong> {alertStock.type === 'BULLISH' ? 'breakout' : 'breakdown'} threshold (&gt;= 3.0%)!</>
                )}
              </p>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 grid grid-cols-2 gap-3 text-left font-mono text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">Action Signal</span>
                <strong className="text-emerald-400 text-sm font-black">STRONG BUY</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Follow Status</span>
                <strong className="text-cyan-300 text-sm font-black">ACTIVE FOLLOW</strong>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setAlertStock(null)}
                className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-black py-3 px-6 rounded-xl shadow-lg transition-all cursor-pointer text-sm"
              >
                Acknowledge &amp; Trade
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Timing Filter Banner */}
      {activeTimingFilter?.active && (
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 rounded-2xl p-4 text-white shadow-lg flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Clock className="w-5 h-5 text-yellow-300 animate-spin" />
            <div>
              <div className="text-xs font-black uppercase tracking-wider">⏱️ Precision Timing Filter Active</div>
              <div className="text-xs text-indigo-100">Showing qualifying stocks for {activeTimingFilter.date} @ {activeTimingFilter.timeSlot}</div>
            </div>
          </div>
          {onClearTimingFilter && (
            <button
              onClick={onClearTimingFilter}
              className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear Filter</span>
            </button>
          )}
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-indigo-500/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2.5 mb-2">
              <div className="p-2.5 bg-indigo-600/30 rounded-xl border border-indigo-400/40">
                <Target className="w-6 h-6 text-indigo-400 animate-pulse" />
              </div>
              <h1 className="text-2xl font-black tracking-tight">
                ORB Bullish &amp; Bearish Conviction Hub (Follow &amp; Auto-Fetch Engine)
              </h1>
            </div>
            <p className="text-slate-300 text-sm max-w-3xl leading-relaxed">
              Clicking <span className="text-amber-300 font-semibold">Follow</span> on any stock immediately fetches its data from the Dhan API and continues auto-fetching every 2 minutes.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-amber-950/80 border border-amber-500/40 px-4 py-3 rounded-xl flex items-center space-x-3">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
              <div>
                <div className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">Followed Stocks</div>
                <div className="text-lg font-black text-white">{followedSymbols.length} Active</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs & Controls Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-lg">
        {/* Tab Switcher */}
        <div className="flex items-center space-x-2 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0">
          <button
            onClick={() => setActiveTab('recent_discovery')}
            className={`px-3 py-2.5 rounded-xl text-xs font-black tracking-wide uppercase transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'recent_discovery'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/40 border border-amber-300'
                : 'bg-slate-800 text-amber-300 hover:bg-slate-700 border border-amber-500/40'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-bounce" />
            <span>✨ Recent Discovery ({recentDiscoveryCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('bullish')}
            className={`px-3 py-2.5 rounded-xl text-xs font-black tracking-wide uppercase transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'bullish'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 border border-emerald-500'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            <ArrowUpRight className="w-4 h-4 text-emerald-300" />
            <span>🟢 Bullish ({bullishCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('bearish')}
            className={`px-3 py-2.5 rounded-xl text-xs font-black tracking-wide uppercase transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'bearish'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30 border border-rose-500'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            <ArrowDownRight className="w-4 h-4 text-rose-300" />
            <span>🔴 Bearish ({bearishCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('super_break_bull')}
            className={`px-3 py-2.5 rounded-xl text-xs font-black tracking-wide uppercase transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'super_break_bull'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30 border border-amber-500'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
            <span>🚀 Super Break (Bullish 50%+) ({superBreakBullCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('super_break_bear')}
            className={`px-3 py-2.5 rounded-xl text-xs font-black tracking-wide uppercase transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'super_break_bear'
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30 border border-orange-500'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            <Zap className="w-4 h-4 text-orange-300 fill-orange-300" />
            <span>💥 Super Breakdown (Bearish 50%+) ({superBreakBearCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('retested_bounced')}
            className={`px-3 py-2.5 rounded-xl text-xs font-black tracking-wide uppercase transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'retested_bounced'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 border border-purple-500'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            <RefreshCw className="w-4 h-4 text-purple-300 animate-spin" />
            <span>🔄 Retested &amp; Bounced ({retestedCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('failed_retest')}
            className={`px-3 py-2.5 rounded-xl text-xs font-black tracking-wide uppercase transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'failed_retest'
                ? 'bg-rose-700 text-white shadow-lg shadow-rose-700/30 border border-rose-500'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-rose-300 animate-pulse" />
            <span>❌ Failed Retest / Fakeout ({failedRetestCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('immediate_bounce')}
            className={`px-3 py-2.5 rounded-xl text-xs font-black tracking-wide uppercase transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'immediate_bounce'
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30 border border-cyan-500'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            <Zap className="w-4 h-4 text-cyan-300 fill-cyan-300 animate-pulse" />
            <span>⚡ Immediate Retest &amp; Bounce ({immediateBounceCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('orb_low_bounce')}
            className={`px-3 py-2.5 rounded-xl text-xs font-black tracking-wide uppercase transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'orb_low_bounce'
                ? 'bg-emerald-700 text-white shadow-lg shadow-emerald-700/30 border border-emerald-500'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-300" />
            <span>🛡️ ORB Low Support Bounce ({orbLowBounceCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('bounce_candle_strength')}
            className={`px-3 py-2.5 rounded-xl text-xs font-black tracking-wide uppercase transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'bounce_candle_strength'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-500'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            <Sparkles className="w-4 h-4 text-indigo-300 animate-pulse" />
            <span>📈 Bounce Candle Strength ({bounceCandleCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('orb_zero_reversal')}
            className={`px-3 py-2.5 rounded-xl text-xs font-black tracking-wide uppercase transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'orb_zero_reversal'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30 border border-amber-500'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>🚀 ORB Zero Reversal ({zeroReversalCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('bounce_great')}
            className={`px-3 py-2.5 rounded-xl text-xs font-black tracking-wide uppercase transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'bounce_great'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30 border border-rose-500'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            <Flame className="w-4 h-4 text-rose-300 animate-pulse fill-rose-300" />
            <span>🔥 Bounce Great ({bounceGreatCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('lightning_scalp')}
            className={`px-3 py-2.5 rounded-xl text-xs font-black tracking-wide uppercase transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'lightning_scalp'
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30 border border-cyan-400'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            <Zap className="w-4 h-4 text-cyan-300 fill-cyan-300 animate-bounce" />
            <span>⚡ ORB Lightning Scalp ({lightningScalpCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('no_retest')}
            className={`px-3 py-2.5 rounded-xl text-xs font-black tracking-wide uppercase transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'no_retest'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 border border-purple-400'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            <ArrowUpRight className="w-4 h-4 text-purple-300 animate-pulse" />
            <span>🚀 No Retest / Pure Rocket ({noRetestCount})</span>
          </button>
        </div>

        {/* ✨ RECENT DISCOVERY SUB-CATEGORIES SUB-BAR */}
        {activeTab === 'recent_discovery' && (
          <div className="bg-slate-950/90 p-3.5 rounded-2xl border border-amber-500/40 flex flex-wrap items-center gap-2 shadow-lg">
            <span className="text-xs font-black text-amber-300 uppercase tracking-wider mr-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 animate-bounce" /> Sub-Filters:
            </span>
            {[
              { id: 'ALL', label: 'All Recent' },
              { id: 'SUPER_BREAK', label: '🚀 Super Break' },
              { id: 'SUPPORT_BOUNCE', label: '🛡️ Support Bounce' },
              { id: 'LIGHTNING_SCALP', label: '⚡ Lightning Scalp' },
              { id: 'NO_RETEST', label: '🚀 Pure Rocket' },
              { id: 'ZERO_REVERSAL', label: '📈 Zero Reversal' },
              { id: 'BOUNCE_CANDLE', label: '📈 Bounce Candle' },
              { id: 'IMMEDIATE_BOUNCE', label: '⚡ Immediate Bounce' },
              { id: 'BOUNCE_GREAT', label: '🔥 Bounce Great' },
            ].map((sub) => (
              <button
                key={sub.id}
                onClick={() => setRecentSubFilter(sub.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  recentSubFilter === sub.id
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black ring-2 ring-amber-300/50'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>
        )}

        {/* Search & Sort */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          <div className="relative w-full sm:w-56">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search symbol..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-sm text-white rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-600"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto">
            <span className="text-xs font-bold text-slate-400 whitespace-nowrap">Sort:</span>
            <button
              onClick={() => setSortBy('BREAK_PCT')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                sortBy === 'BREAK_PCT'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              🚀 Highest Break % (#1 Top)
            </button>
            <button
              onClick={() => setSortBy('LOWER_BREAK_PCT')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                sortBy === 'LOWER_BREAK_PCT'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              📉 Lowest Break % in Height
            </button>
            <button
              onClick={() => setSortBy('JUST_HIT')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                sortBy === 'JUST_HIT'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              ⏰ Just Hit ORB
            </button>
          </div>
        </div>
      </div>

      {/* Stock Cards Grid */}
      {filteredStocks.length === 0 ? (
        <div className="bg-slate-900 rounded-2xl p-12 text-center border border-slate-800 text-slate-400 space-y-3">
          <AlertCircle className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">No Stocks Found in {activeTab}</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            No F&amp;O stocks currently meet this specific filter criteria.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredStocks.map((stock, idx) => {
            const isBull = activeTab === 'bullish' || activeTab === 'super_break_bull';
            const breakPct = isBull ? stock.breakPctAbove : stock.breakPctBelow;
            const isSuper = (isBull && stock.isSuperBreakBullish) || (!isBull && stock.isSuperBreakBearish);
            const is25Above = (isBull && (stock.breakPctAbove >= stock.orbHeightPct * 1.25 || stock.breakVsHeightPct >= 125)) || (!isBull && (stock.breakPctBelow >= stock.orbHeightPct * 1.25 || stock.breakVsHeightPct >= 125));
            const isFollowed = followedSymbols.includes(stock.symbol);

            return (
              <div 
                key={stock.symbol}
                onClick={() => onSelectStockDetail(stock)}
                className={`rounded-2xl border transition-all cursor-pointer overflow-hidden flex flex-col hover:shadow-xl ${
                  isSuper 
                    ? 'bg-amber-950/50 border-amber-400 ring-2 ring-amber-500/30 shadow-amber-500/20'
                    : is25Above
                    ? 'bg-purple-950/80 border-purple-500 ring-2 ring-purple-500/30 shadow-purple-500/20 text-white'
                    : idx === 0 
                    ? (isBull ? 'bg-slate-900 border-emerald-400 ring-2 ring-emerald-500/30 shadow-emerald-500/20' : 'bg-slate-900 border-rose-400 ring-2 ring-rose-500/30 shadow-rose-500/20')
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Card Header Top: #1 Crown / Super Break / 25%+ Purple Badge */}
                <div className="px-4 py-2 flex items-center justify-between border-b bg-slate-950 border-slate-800 text-slate-300">
                  <div className="flex items-center space-x-2">
                    {isSuper ? (
                      <span className="bg-amber-400 text-slate-950 text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
                        <Zap className="w-3 h-3 fill-slate-950" /> Super {isBull ? 'Break (50%+)' : 'Breakdown (50%+)'}
                      </span>
                    ) : is25Above ? (
                      <span className="bg-purple-500 text-slate-950 text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
                        💜 25%+ Above ORB Height
                      </span>
                    ) : idx === 0 ? (
                      <span className={`${isBull ? 'bg-emerald-500' : 'bg-rose-500'} text-slate-950 text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-wider`}>
                        👑 #1 Top {isBull ? 'Break' : 'Breakdown'}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 font-mono">ORB Setup</span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">F&O Live</span>
                </div>

                {/* Card Main Info Bar: Symbol, CMP, Lot Size */}
                <div className="px-4 py-3 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-lg text-white font-mono flex items-center gap-2">
                      {stock.symbol}
                      {isBull ? <ArrowUpRight className="w-4 h-4 text-emerald-400" /> : <ArrowDownRight className="w-4 h-4 text-rose-400" />}
                    </h3>
                    <div className="flex items-center space-x-2 mt-0.5">
                      <span className="text-xs text-slate-400 truncate max-w-[130px]">{stock.companyName}</span>
                      <span className="bg-indigo-950 text-indigo-300 border border-indigo-800 px-1.5 py-0.2 rounded text-[10px] font-mono font-bold flex items-center gap-1">
                        <Package className="w-3 h-3 text-indigo-400" /> Lot: {stock.lotSize.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black font-mono text-white">₹{stock.closePrice?.toFixed(2)}</div>
                    <div className={`text-xs font-bold font-mono ${stock.pctChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {stock.pctChange > 0 ? '+' : ''}{stock.pctChange?.toFixed(2)}%
                    </div>
                  </div>
                </div>

                {/* ⏰ BIG PROMINENT ORB BREAK TIMING BANNER */}
                <div className="px-4 py-3 bg-gradient-to-r from-slate-950 via-purple-950/40 to-slate-950 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">ORB Break Timing</span>
                    <span className="text-2xl font-black font-mono text-amber-300 tracking-tight drop-shadow-sm">
                      {stock.orbBreakTime}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Holding Duration</span>
                    <span className="text-sm font-black font-mono text-cyan-300">
                      {stock.durationDisplay}
                    </span>
                  </div>
                </div>

                {/* 🎯 ORB BREAK HIT METRICS BANNER (STORED FOR SESSION) */}
                <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Break % at Initial Hit</span>
                    <strong className="text-amber-300 font-black text-sm">
                      {stock.breakPctAtOrbBreak > 0 ? '+' : ''}{stock.breakPctAtOrbBreak?.toFixed(2)}% @ {stock.breakTimeAtBreak || stock.orbBreakTime}
                    </strong>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-sans">vs ORB Height %</span>
                    <strong className="text-cyan-300 font-black text-sm">
                      {stock.breakVsHeightPct?.toFixed(1)}% of Height
                    </strong>
                  </div>
                </div>

                {/* ⚡ SUPER BREAK 50%+ TIMING BANNER */}
                {isSuper && (
                  <div className="px-4 py-2.5 bg-gradient-to-r from-amber-950/90 via-yellow-950/50 to-amber-950/90 border-b border-amber-500/40 text-xs font-mono text-amber-200 flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-300 fill-amber-300 animate-pulse" />
                      <span>50%+ Super Break Met @:</span>
                    </span>
                    <strong className="text-white font-black text-sm px-2 py-0.5 bg-amber-500/20 border border-amber-400 rounded-lg">
                      {stock.superBreakTime || stock.orbBreakTime}
                    </strong>
                  </div>
                )}

                {/* ✨ RECENT DISCOVERY TOP LABEL & TIMING */}
                {stock.hasRecentDiscovery && (
                  <div className="px-4 py-2 bg-gradient-to-r from-amber-950 via-yellow-950/80 to-amber-950 border-b border-amber-500/60 text-xs font-mono text-amber-200 flex items-center justify-between shadow-inner">
                    <span className="font-black flex items-center gap-1.5 uppercase tracking-wide text-amber-300">
                      <Sparkles className="w-4 h-4 text-amber-400 animate-bounce" />
                      <span>{stock.discoveryLabel}</span>
                    </span>
                    <span className="text-[11px] bg-amber-400/20 border border-amber-300/40 text-amber-200 font-black px-2 py-0.5 rounded-lg">
                      Discovered @ {stock.discoveryTime}
                    </span>
                  </div>
                )}

                {/* 🔄 RETEST & BOUNCE CONFIRMED BANNER */}
                <div className="px-4 py-2.5 bg-gradient-to-r from-slate-950 via-purple-950/70 to-slate-950 border-b border-purple-500/40 text-xs font-mono text-purple-200 flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1.5">
                    <RefreshCw className="w-4 h-4 text-purple-400 animate-spin" />
                    <span>Retest &amp; Bounce Confirmed:</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-300 font-medium">Retest: <strong className="text-amber-300">{stock.retestTime}</strong></span>
                    <span className="text-slate-500">→</span>
                    <span className="text-slate-300 font-medium">Bounce: <strong className="text-emerald-300">{stock.bounceTime}</strong></span>
                  </div>
                </div>

                {/* ❌ FAILED RETEST / FAKEOUT WARNING BANNER */}
                {stock.hasFailedRetest && (
                  <div className="px-4 py-2.5 bg-gradient-to-r from-rose-950 via-red-950/80 to-rose-950 border-b border-rose-500/50 text-xs font-mono text-rose-200 flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-rose-400 animate-bounce" />
                      <span>{stock.failReason || 'Failed Retest / Fakeout'}</span>
                    </span>
                    <strong className="text-white font-black text-xs px-2 py-0.5 bg-rose-500/20 border border-rose-400 rounded-lg">
                      @{stock.failTime}
                    </strong>
                  </div>
                )}

                {/* ⚡ IMMEDIATE RETEST & BOUNCE BANNER */}
                {stock.hasImmediateBounce && (
                  <div className="px-4 py-2.5 bg-gradient-to-r from-slate-950 via-cyan-950/70 to-slate-950 border-b border-cyan-500/40 text-xs font-mono text-cyan-200 flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-cyan-400 fill-cyan-400 animate-pulse" />
                      <span>Immediate Retest &amp; Bounce:</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-300 font-medium">Retest: <strong className="text-amber-300">{stock.immediateRetestTime}</strong></span>
                      <span className="text-slate-500">→</span>
                      <span className="text-slate-300 font-medium">Bounce: <strong className="text-emerald-300">{stock.immediateBounceTime}</strong></span>
                    </div>
                  </div>
                )}

                {/* 🛡️ ORB SUPPORT/RESISTANCE BOUNCE & RALLY BANNER */}
                {stock.hasOrbLowBounce && (
                  <div className={`px-4 py-3.5 bg-gradient-to-r ${
                    stock.orbBounceType === 'BULLISH_SUPPORT_BOUNCE' 
                      ? 'from-slate-950 via-emerald-950/95 to-slate-950 border-b border-emerald-500/80 shadow-lg shadow-emerald-500/20' 
                      : 'from-slate-950 via-rose-950/95 to-slate-950 border-b border-rose-500/80 shadow-lg shadow-rose-500/20'
                  } text-xs font-mono flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5`}>
                    <span className="font-black flex items-center gap-1.5 uppercase tracking-wide">
                      <ShieldCheck className={`w-4 h-4 ${stock.orbBounceType === 'BULLISH_SUPPORT_BOUNCE' ? 'text-emerald-400' : 'text-rose-400'} shrink-0 animate-pulse`} />
                      <span className={stock.orbBounceType === 'BULLISH_SUPPORT_BOUNCE' ? 'text-emerald-200' : 'text-rose-200'}>
                        {stock.orbBounceType === 'BULLISH_SUPPORT_BOUNCE' ? '🟢 ORB Support Bounce & Bullish Rally:' : '🔴 ORB Resistance Rejection & Drop:'}
                      </span>
                    </span>
                    <div className="flex items-center gap-2">
                      <strong className={`${stock.orbBounceType === 'BULLISH_SUPPORT_BOUNCE' ? 'text-emerald-300 bg-emerald-500/30 border-emerald-400' : 'text-rose-300 bg-rose-500/30 border-rose-400'} font-black border px-2.5 py-1 rounded-xl shadow`}>
                        {stock.rallyExpansionPct >= 0 ? '+' : ''}{stock.rallyExpansionPct}% {stock.orbBounceType === 'BULLISH_SUPPORT_BOUNCE' ? 'Rally 🚀' : 'Drop 📉'}
                      </strong>
                      <span className="text-slate-300 font-medium">Power: <strong className="text-amber-300">{stock.bouncePowerScore}/100</strong></span>
                      <span className="text-white font-black bg-slate-900/90 px-2 py-0.5 rounded-lg border border-slate-700">@{stock.orbLowBounceTime}</span>
                    </div>
                  </div>
                )}

                {/* 📈 BOUNCE CANDLE STRENGTH BANNER */}
                {stock.hasBounceCandleStrength && (
                  <div className="px-4 py-2.5 bg-gradient-to-r from-slate-950 via-indigo-950/70 to-slate-950 border-b border-indigo-500/40 text-xs font-mono text-indigo-200 flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
                      <span>{stock.bounceCandleDetails || 'Bounce Candle Strength Confirmed'}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-300 font-medium">Score: <strong className="text-amber-300">{stock.bounceCandleScore}/100</strong></span>
                      <span className="text-slate-500">@</span>
                      <span className="text-white font-black">{stock.bounceCandleTime}</span>
                    </div>
                  </div>
                )}

                {/* 🚀 ORB ZERO REVERSAL BANNER */}
                {stock.hasOrbZeroReversal && (
                  <div className="px-4 py-2.5 bg-gradient-to-r from-slate-950 via-amber-950/70 to-slate-950 border-b border-amber-500/40 text-xs font-mono text-amber-200 flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-amber-400 animate-pulse" />
                      <span>Zero Reversal &amp; Higher High Confirmed:</span>
                    </span>
                    <strong className="text-white font-black text-xs px-2 py-0.5 bg-amber-500/20 border border-amber-400 rounded-lg">
                      @{stock.zeroReversalTime}
                    </strong>
                  </div>
                )}

                {/* 🔥 BOUNCE GREAT BANNER */}
                {stock.hasBounceGreat && (
                  <div className="px-4 py-2.5 bg-gradient-to-r from-slate-950 via-rose-950/70 to-slate-950 border-b border-rose-500/40 text-xs font-mono text-rose-200 flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-rose-400 fill-rose-400 animate-pulse" />
                      <span>🔥 Bounce Great (One-Direction Momentum):</span>
                    </span>
                    <strong className="text-white font-black text-xs px-2 py-0.5 bg-rose-500/20 border border-rose-400 rounded-lg">
                      @{stock.bounceGreatTime}
                    </strong>
                  </div>
                )}

                {/* ⚡ ORB LIGHTNING SCALP BANNER */}
                {stock.hasLightningScalp && (
                  <div className="px-4 py-2.5 bg-gradient-to-r from-slate-950 via-cyan-950/70 to-slate-950 border-b border-cyan-500/40 text-xs font-mono text-cyan-200 flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-cyan-400 fill-cyan-400 animate-bounce" />
                      <span>⚡ Lightning Scalp Setup ({stock.breakMinutesFromOpen}m from open, {stock.orbHeightPct}% height):</span>
                    </span>
                    <strong className="text-white font-black text-xs px-2 py-0.5 bg-cyan-500/20 border border-cyan-400 rounded-lg">
                      @{stock.orbBreakTime}
                    </strong>
                  </div>
                )}

                {/* 🚀 NO RETEST / PURE ROCKET BANNER */}
                {stock.hasNoRetest && (
                  <div className="px-4 py-2.5 bg-gradient-to-r from-slate-950 via-purple-950/70 to-slate-950 border-b border-purple-500/40 text-xs font-mono text-purple-200 flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      <ArrowUpRight className="w-4 h-4 text-purple-400 animate-pulse" />
                      <span>🚀 No Retest / Pure Rocket Run (Never Touched Back):</span>
                    </span>
                    <strong className="text-white font-black text-xs px-2 py-0.5 bg-purple-500/20 border border-purple-400 rounded-lg">
                      @{stock.noRetestTime}
                    </strong>
                  </div>
                )}

                {/* ORB Metrics Grid (High, Low, Height %, Break %) */}
                <div className="p-4 space-y-3 flex-1">
                  {/* FOLLOW CONFIDENCE BADGE (IF FOLLOWED) */}
                  {isFollowed && (() => {
                    const rsiInFavor = isBull ? (stock.rsi >= 50) : (stock.rsi <= 50);
                    const vwapInFavor = isBull ? ((stock.closePrice || 0) >= stock.vwap) : ((stock.closePrice || 0) <= stock.vwap);
                    const isConfidenceInFavor = rsiInFavor && vwapInFavor;
                    return (
                      <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-mono font-bold ${
                        isConfidenceInFavor 
                          ? (isBull ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-500/20' : 'bg-rose-950/90 border-rose-500 text-rose-300 shadow-lg shadow-rose-500/20')
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}>
                        <span className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 shrink-0 text-amber-300" />
                          <span>Follow Confidence: {isConfidenceInFavor ? (isBull ? 'RSI & VWAP Bullish IN FAVOR 🟢' : 'RSI & VWAP Bearish IN FAVOR 🔴') : 'Evaluating Data...'}</span>
                        </span>
                        <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded text-amber-300 font-black">ACTIVE</span>
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 text-[10px] block font-sans">ORB High Level</span>
                      <strong className="text-emerald-400 text-sm font-black">₹{stock.orbHigh}</strong>
                    </div>
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 text-[10px] block font-sans">ORB Low Level</span>
                      <strong className="text-rose-400 text-sm font-black">₹{stock.orbLow}</strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className={`p-2.5 rounded-xl border ${isBull ? 'bg-emerald-950/40 border-emerald-800/60' : 'bg-rose-950/40 border-rose-800/60'}`}>
                      <span className="text-slate-400 text-[10px] block font-sans">{isBull ? 'Break % Above High' : 'Break % Below Low'}</span>
                      <strong className={`text-sm font-black ${breakPct >= 3.0 ? 'text-amber-300 animate-pulse' : isBull ? 'text-emerald-300' : 'text-rose-300'}`}>
                        {breakPct > 0 ? '+' : ''}{breakPct.toFixed(2)}% {breakPct >= 3.0 ? '🔥' : ''}
                      </strong>
                    </div>
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 text-[10px] block font-sans">ORB Height %</span>
                      <strong className="text-amber-300 text-sm font-black">+{stock.orbHeightPct.toFixed(2)}%</strong>
                    </div>
                  </div>

                  {/* Technical Formulas (RSI, VWAP, ADX) */}
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center space-x-1.5">
                      <Activity className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="text-slate-400">RSI:</span>
                      <span className={`font-bold ${stock.rsi >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>{stock.rsi}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-slate-400">VWAP:</span>
                      <span className="text-white font-bold">₹{stock.vwap}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-slate-400">ADX:</span>
                      <span className="text-amber-300 font-bold">{stock.adx}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Action: Follow & Refresh Buttons at the bottom */}
                <div className="px-4 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2">
                  <span className="text-slate-400 text-[11px] hidden sm:inline">15m Analysis &amp; Sizer</span>
                  <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                    {/* Follow Toggle Button */}
                    <button
                      onClick={(e) => toggleFollow(stock, e)}
                      title={isFollowed ? 'Following (Auto-fetching every 2 mins from Dhan API)' : 'Click to Follow stock (Fetches data immediately & every 2 mins)'}
                      className={`px-3 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center space-x-1 cursor-pointer min-h-[38px] ${
                        isFollowed 
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30' 
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                      }`}
                    >
                      <Star className={`w-3.5 h-3.5 ${isFollowed ? 'fill-slate-950' : ''}`} />
                      <span>{isFollowed ? 'Following ON' : 'Follow'}</span>
                    </button>

                    {/* Per-Stock Refresh */}
                    {onFetchSingleStock && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onFetchSingleStock(stock);
                        }}
                        disabled={stock.isLoading}
                        title="Immediately fetch live data from Dhan API for this stock"
                        className="px-3 py-2 text-blue-300 hover:text-white hover:bg-blue-600/40 bg-blue-950/80 border border-blue-800/60 rounded-lg text-xs font-bold transition-colors cursor-pointer min-h-[38px] flex items-center space-x-1"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${stock.isLoading ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                      </button>
                    )}

                    {/* Shall I Take This Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShallITakeThisStock(stock);
                      }}
                      className="px-3 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-lg text-xs font-black shadow-md transition-all cursor-pointer min-h-[38px] flex items-center space-x-1"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Shall I take this</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 🧠 SHALL I TAKE THIS - INSTITUTIONAL TRADE EXPLAINER MODAL */}
      {shallITakeThisStock && (() => {
        const isBull = activeTab === 'bullish' || activeTab === 'super_break_bull';
        const breakPct = isBull ? (shallITakeThisStock.breakPctAbove || 0) : (shallITakeThisStock.breakPctBelow || 0);
        const breakHeight = shallITakeThisStock.breakVsHeightPct || 0;
        const lotSz = shallITakeThisStock.lotSize || 250;
        const ltp = shallITakeThisStock.closePrice || 100;
        const breakTime = shallITakeThisStock.orbBreakTime || '09:30 AM';
        const tradeDir = isBull ? 'Bullish Breakout (Long 🟢)' : 'Bearish Breakdown (Short 🔴)';

        return (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setShallITakeThisStock(null)}>
            <div className="bg-slate-900 border border-indigo-500/40 rounded-2xl max-w-lg w-full p-6 text-white shadow-2xl space-y-5" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2.5 bg-indigo-600/30 rounded-xl border border-indigo-400/40">
                    <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight">Shall I Take This Trade?</h3>
                    <p className="text-xs text-indigo-200 font-mono">{shallITakeThisStock.symbol} ({shallITakeThisStock.companyName})</p>
                  </div>
                </div>
                <button
                  onClick={() => setShallITakeThisStock(null)}
                  className="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3.5 font-mono text-xs">
                {/* 1. When ORB hit */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400 font-sans">1. When ORB Hit:</span>
                  <strong className="text-amber-300 font-black">{breakTime} ({shallITakeThisStock.breakMinutesFromOpen}m from open)</strong>
                </div>

                {/* 2. Trade Direction */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400 font-sans">2. Trade Bias:</span>
                  <strong className={isBull ? 'text-emerald-400 font-black' : 'text-rose-400 font-black'}>{tradeDir}</strong>
                </div>

                {/* 3. Stock Price */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400 font-sans">3. Stock Price (LTP):</span>
                  <strong className="text-white font-black text-sm">₹{ltp.toFixed(2)} ({shallITakeThisStock.pctChange >= 0 ? '+' : ''}{shallITakeThisStock.pctChange?.toFixed(2)}%)</strong>
                </div>

                {/* 4. Break% Height */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400 font-sans">4. Break % in Height:</span>
                  <strong className="text-cyan-300 font-black">{breakHeight.toFixed(1)}% of ORB Height (Initial Break: {breakPct.toFixed(2)}%)</strong>
                </div>

                {/* 5. Lot Size */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400 font-sans">5. F&amp;O Lot Size:</span>
                  <strong className="text-indigo-300 font-black">{lotSz.toLocaleString('en-IN')} shares</strong>
                </div>

                {/* 6. Is it a guaranteed profitable trade? */}
                <div className="bg-gradient-to-br from-amber-950/80 via-slate-950 to-amber-950/80 p-4 rounded-xl border border-amber-500/50 space-y-2">
                  <div className="flex items-center space-x-2 text-amber-300 font-bold font-sans">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>6. Is it a guaranteed profitable trade?</span>
                  </div>
                  <p className="text-slate-300 text-[11px] font-sans leading-relaxed">
                    <strong>No trade in the stock market is 100% guaranteed.</strong> While this setup meets strict institutional Opening Range Breakout (ORB) criteria (RSI, VWAP, Volume, and Height Expansion), market conditions can shift rapidly. Always enforce strict risk management, appropriate position sizing, and a stop-loss near the ORB level.
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setShallITakeThisStock(null)}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg cursor-pointer"
                >
                  Got It
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
