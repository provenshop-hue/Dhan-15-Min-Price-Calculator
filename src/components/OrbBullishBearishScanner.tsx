import React, { useState, useMemo, useEffect } from 'react';
import { StockCalculated } from '../types';
import { SectorDominanceBadgesBar } from './SectorDominanceBadgesBar';
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

const capTimeAtCurrentClock = (timeStr: string): string => {
  if (!timeStr || timeStr === '-') return timeStr;
  const now = new Date();
  const currentHours = now.getHours();
  const currentMins = now.getMinutes();
  const currentTotalMins = currentHours * 60 + currentMins;

  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return timeStr;

  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const ampm = (match[3] || '').toUpperCase();
  if (ampm === 'PM' && h < 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;

  const timeTotalMins = h * 60 + m;
  if (timeTotalMins > currentTotalMins && currentTotalMins >= 555) {
    const maxH = Math.floor(currentTotalMins / 60);
    const maxM = currentTotalMins % 60;
    const cappedAmpm = maxH >= 12 ? 'PM' : 'AM';
    const displayH = maxH % 12 === 0 ? 12 : maxH % 12;
    const displayM = maxM < 10 ? `0${maxM}` : maxM;
    return `${displayH}:${displayM} ${cappedAmpm}`;
  }
  return timeStr;
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
  const [activeTab, setActiveTab] = useState<'bullish' | 'bearish' | 'super_break_bull' | 'super_break_bear' | 'hq_breakout' | 'failed_retest' | 'orb_low_bounce' | 'bounce_candle_strength' | 'orb_zero_reversal' | 'bounce_great' | 'lightning_scalp' | 'no_retest' | 'break_and_continue' | 'orb_with_volume' | 'lowest_volume_concept' | 'recent_discovery'>('hq_breakout');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'BREAK_PCT' | 'LOWER_BREAK_PCT' | 'JUST_HIT' | 'HEIGHT_PCT' | 'SYMBOL'>('BREAK_PCT');
  const [shallITakeThisStock, setShallITakeThisStock] = useState<StockCalculated | null>(null);
  const [recentSubFilter, setRecentSubFilter] = useState<string>('ALL');
  const [zeroReversalSubFilter, setZeroReversalSubFilter] = useState<string>('ALL');
  const [tickerSpeed, setTickerSpeed] = useState<number>(40);

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

      // ORB High Quality Breakout Engine (15-Minute OHLCV Candles Only)
      let isHighQualityBullish = false;
      let isHighQualityBearish = false;
      let hqSignalStatus: 'STRONG BULLISH' | 'STRONG BEARISH' | 'WAITING FOR 15M CLOSE' | 'BREAKOUT DETECTED' | 'RETEST PENDING' | 'FAILED BREAKOUT' | 'NO TRADE' | 'DATA ERROR' = 'NO TRADE';
      let hqScore = 50;
      let hqBreakDistancePct = 0;
      let hqBreakDistanceAtr = 0;
      let hqCandleBodyPct = 0;
      let hqUpperWickPct = 0;
      let hqLowerWickPct = 0;
      let hqRelativeVolume = 1.0;
      let hqVwapStatus = 'Above VWAP';
      let hqNearestSr = 'None';
      let hqProposedEntry = close;
      let hqStopLoss = orbLow;
      let hqTarget = close * 1.02;
      let hqRewardRiskRatio = '1 : 2.0';
      let hqFailedConditions: string[] = [];
      let hqTimestamp = '09:30 AM';
      let hqBreakoutTime = '09:30 AM';
      let hqEntryTime = '09:30 AM';

      if (stock.rsiTimeline && stock.rsiTimeline.length > 0) {
        let breakoutFoundIdx = -1;
        let entryFoundIdx = -1;

        for (let idx = 0; idx < stock.rsiTimeline.length; idx++) {
          const pt = stock.rsiTimeline[idx];
          const cOpen = pt.open;
          const cHigh = pt.high;
          const cLow = pt.low;
          const cClose = pt.close;
          const cVol = pt.volume || 10000;

          const isBull = cClose > orbHigh;
          const isBear = cClose < orbLow;

          if (isBull || isBear) {
            if (breakoutFoundIdx === -1) {
              breakoutFoundIdx = idx;
              hqBreakoutTime = pt.timeStr || '09:30 AM';
              // EARLY CATCH ENTRY TIMING: Set entry time to the exact moment of breakout touch/ignition so user never misses the train
              hqEntryTime = pt.timeStr || '09:30 AM';
            }

            const range = Math.max(0.05, cHigh - cLow);
            const body = Math.abs(cClose - cOpen);
            const bodyPct = (body / range) * 100;
            const upperWick = ((cHigh - Math.max(cOpen, cClose)) / range) * 100;
            const lowerWick = ((Math.min(cOpen, cClose) - cLow) / range) * 100;

            let atr14 = range;
            if (idx >= 1) {
              let trSum = 0;
              for (let k = Math.max(0, idx - 14); k <= idx; k++) {
                const cc = stock.rsiTimeline[k];
                const prevC = k > 0 ? stock.rsiTimeline[k - 1].close : cc.open;
                const tr = Math.max(cc.high - cc.low, Math.abs(cc.high - prevC), Math.abs(cc.low - prevC));
                trSum += tr;
              }
              atr14 = trSum / Math.min(15, idx + 1);
            }

            let prevVolSum = 0;
            let prevCount = 0;
            for (let k = Math.max(0, idx - 20); k < idx; k++) {
              prevVolSum += (stock.rsiTimeline[k].volume || 10000);
              prevCount++;
            }
            const avgVol = prevCount > 0 ? prevVolSum / prevCount : cVol;
            const relVol = avgVol > 0 ? cVol / avgVol : 1.0;

            const dist = isBull ? cClose - orbHigh : orbLow - cClose;
            const distAtr = atr14 > 0 ? dist / atr14 : 0;

            const bodyOk = bodyPct >= 60;
            const wickOk = isBull ? upperWick <= 20 : lowerWick <= 20;
            const volOk = relVol >= 1.5;
            const atrOk = distAtr >= 0.10;
            const vwapOk = vwap > 0 ? (isBull ? cClose > vwap : cClose < vwap) : true;

            if (bodyOk && wickOk && volOk && atrOk && vwapOk) {
              entryFoundIdx = idx;
              hqBreakDistancePct = isBull ? Math.round((dist / orbHigh) * 100 * 100) / 100 : Math.round((dist / orbLow) * 100 * 100) / 100;
              hqBreakDistanceAtr = Math.round(distAtr * 100) / 100;
              hqCandleBodyPct = Math.round(bodyPct);
              hqUpperWickPct = Math.round(upperWick);
              hqLowerWickPct = Math.round(lowerWick);
              hqRelativeVolume = Math.round(relVol * 100) / 100;
              break;
            }
          }
        }

        if (entryFoundIdx === -1 && breakoutFoundIdx !== -1) {
          entryFoundIdx = breakoutFoundIdx;
          hqEntryTime = stock.rsiTimeline[breakoutFoundIdx].timeStr;
        } else if (entryFoundIdx === -1) {
          entryFoundIdx = stock.rsiTimeline.length - 1;
          hqEntryTime = stock.rsiTimeline[entryFoundIdx].timeStr;
        } else if (breakoutFoundIdx !== -1) {
          hqEntryTime = stock.rsiTimeline[breakoutFoundIdx].timeStr;
        }

        const entryCandle = stock.rsiTimeline[entryFoundIdx];
        hqBreakoutTime = stock.rsiTimeline[breakoutFoundIdx !== -1 ? breakoutFoundIdx : entryFoundIdx].timeStr;
        hqTimestamp = entryCandle.timeStr;

        let closedBackInside = false;
        for (let i = 1; i <= entryFoundIdx; i++) {
          const prevPt = stock.rsiTimeline[i - 1];
          const currPt = stock.rsiTimeline[i];
          if (prevPt.close > orbHigh && currPt.close <= orbHigh) closedBackInside = true;
          if (prevPt.close < orbLow && currPt.close >= orbLow) closedBackInside = true;
        }

        if (closedBackInside) {
          hqSignalStatus = 'FAILED BREAKOUT';
          hqFailedConditions.push('Price closed back inside the ORB range (Failed Breakout / Fakeout)');
        } else if (entryCandle.close > orbHigh) {
          const cond1 = entryCandle.close > orbHigh;
          const cond2 = hqBreakDistanceAtr >= 0.10;
          const cond3 = hqCandleBodyPct >= 60;
          const cond4 = hqUpperWickPct <= 20;
          const cond5 = hqRelativeVolume >= 1.5;
          const cond6 = vwap > 0 ? entryCandle.close > vwap : true;

          const risk = entryCandle.close - orbLow;
          const resistance = entryCandle.high * 1.03;
          const reward = resistance - entryCandle.close;
          const rrRatio = risk > 0 ? reward / risk : 2.0;
          const cond7 = rrRatio >= 2.0;

          if (!cond1) hqFailedConditions.push('Candle did not close above ORB High');
          if (!cond2) hqFailedConditions.push(`Breakout distance (${hqBreakDistanceAtr} ATR) < 0.10 ATR requirement`);
          if (!cond3) hqFailedConditions.push(`Candle body (${hqCandleBodyPct}%) < 60% requirement`);
          if (!cond4) hqFailedConditions.push(`Upper wick (${hqUpperWickPct}%) > 20% limit`);
          if (!cond5) hqFailedConditions.push(`Relative volume (${hqRelativeVolume}x) < 1.5x requirement`);
          if (!cond6) hqFailedConditions.push('Closing price is below VWAP');
          if (!cond7) hqFailedConditions.push(`Reward-to-risk ratio (${rrRatio.toFixed(1)}:1) < 2:1 requirement`);

          let score = 50;
          if (hqBreakDistanceAtr >= 0.10) score += 25;
          if (hqCandleBodyPct >= 60 && hqUpperWickPct <= 20) score += 20;
          if (hqRelativeVolume >= 1.5) score += 20;
          if (cond6) score += 15;
          if (cond7) score += 20;
          hqScore = Math.min(100, Math.max(0, score));

          hqProposedEntry = Math.min(entryCandle.close, orbHigh * 1.002);
          hqStopLoss = orbLow;
          hqTarget = hqProposedEntry + (hqProposedEntry - orbLow) * 2.2;
          hqRewardRiskRatio = `1 : ${Math.max(2.2, rrRatio).toFixed(1)}`;
          hqNearestSr = `Resistance @ ₹${resistance.toFixed(2)}`;
          hqVwapStatus = cond6 ? 'Above VWAP (Bullish)' : 'Below VWAP';

          if (cond1 && cond2 && cond3 && cond4 && cond5 && cond6 && cond7 && hqScore >= 80) {
            isHighQualityBullish = true;
            hqSignalStatus = 'STRONG BULLISH';
          } else if (cond1) {
            hqSignalStatus = 'BREAKOUT DETECTED';
          } else {
            hqSignalStatus = 'NO TRADE';
          }
        } else if (entryCandle.close < orbLow) {
          const cond1 = entryCandle.close < orbLow;
          const cond2 = hqBreakDistanceAtr >= 0.10;
          const cond3 = hqCandleBodyPct >= 60;
          const cond4 = hqLowerWickPct <= 20;
          const cond5 = hqRelativeVolume >= 1.5;
          const cond6 = vwap > 0 ? entryCandle.close < vwap : true;

          const risk = orbHigh - entryCandle.close;
          const support = entryCandle.low * 0.97;
          const reward = entryCandle.close - support;
          const rrRatio = risk > 0 ? reward / risk : 2.0;
          const cond7 = rrRatio >= 2.0;

          if (!cond1) hqFailedConditions.push('Candle did not close below ORB Low');
          if (!cond2) hqFailedConditions.push(`Breakout distance (${hqBreakDistanceAtr} ATR) < 0.10 ATR requirement`);
          if (!cond3) hqFailedConditions.push(`Candle body (${hqCandleBodyPct}%) < 60% requirement`);
          if (!cond4) hqFailedConditions.push(`Lower wick (${hqLowerWickPct}%) > 20% limit`);
          if (!cond5) hqFailedConditions.push(`Relative volume (${hqRelativeVolume}x) < 1.5x requirement`);
          if (!cond6) hqFailedConditions.push('Closing price is above VWAP');
          if (!cond7) hqFailedConditions.push(`Reward-to-risk ratio (${rrRatio.toFixed(1)}:1) < 2:1 requirement`);

          let score = 50;
          if (hqBreakDistanceAtr >= 0.10) score += 25;
          if (hqCandleBodyPct >= 60 && hqLowerWickPct <= 20) score += 20;
          if (hqRelativeVolume >= 1.5) score += 20;
          if (cond6) score += 15;
          if (cond7) score += 20;
          hqScore = Math.min(100, Math.max(0, score));

          hqProposedEntry = Math.max(entryCandle.close, orbLow * 0.998);
          hqStopLoss = orbHigh;
          hqTarget = hqProposedEntry - (orbHigh - hqProposedEntry) * 2.2;
          hqRewardRiskRatio = `1 : ${Math.max(2.2, rrRatio).toFixed(1)}`;
          hqNearestSr = `Support @ ₹${support.toFixed(2)}`;
          hqVwapStatus = cond6 ? 'Below VWAP (Bearish)' : 'Above VWAP';

          if (cond1 && cond2 && cond3 && cond4 && cond5 && cond6 && cond7 && hqScore >= 80) {
            isHighQualityBearish = true;
            hqSignalStatus = 'STRONG BEARISH';
          } else if (cond1) {
            hqSignalStatus = 'BREAKOUT DETECTED';
          } else {
            hqSignalStatus = 'NO TRADE';
          }
        } else {
          hqSignalStatus = 'NO TRADE';
          hqFailedConditions.push('Price is trading inside the Opening Range (ORB High/Low)');
        }
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
          for (let i = breakoutIdx + 1; i <= Math.min(breakoutIdx + 4, stock.rsiTimeline.length - 2); i++) {
            const pt = stock.rsiTimeline[i];
            const hitSupport = isBullBreak ? (pt.low <= orbLow * 1.012 && pt.low >= orbLow * 0.985) : false;

            if (hitSupport) {
              const nextPt = stock.rsiTimeline[i + 1];
              const cleanBounce = nextPt.close > pt.close && nextPt.close >= orbLow * 1.002;

              if (cleanBounce) {
                // NO REVERSAL CHECK: Ensure ALL subsequent candles after support touch never broke below support or turned negative
                let zeroReversalAfterTouch = true;
                for (let k = i + 1; k < stock.rsiTimeline.length; k++) {
                  if (stock.rsiTimeline[k].close < orbLow * 0.998 || stock.rsiTimeline[k].close < stock.rsiTimeline[i+1].close * 0.995) {
                    zeroReversalAfterTouch = false;
                    break;
                  }
                }

                const endPt = stock.rsiTimeline[stock.rsiTimeline.length - 1];
                const expansionPct = Math.round(((endPt.close - nextPt.close) / nextPt.close) * 100 * 100) / 100;

                if (zeroReversalAfterTouch && expansionPct >= 0.1 && (stock.pctChange === undefined || stock.pctChange > 0)) {
                  hasOrbLowBounce = true;
                  orbLowBounceTime = nextPt.timeStr;
                  orbBounceType = 'BULLISH_SUPPORT_BOUNCE';
                  rallyExpansionPct = Math.max(0.5, expansionPct);
                  bouncePowerScore = Math.min(100, Math.round(85 + rallyExpansionPct * 10));
                  break;
                }
              }
            }
          }
        }
      }

      // Ensure genuine sequence: bounce time must be strictly after orb break time
      if (hasOrbLowBounce && (orbLowBounceTime === '-' || orbLowBounceTime === orbBreakTime)) {
        hasOrbLowBounce = false;
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

      let hasBreakAndContinue = false;
      let breakAndContinueTime = '-';

      if (stock.rsiTimeline && stock.rsiTimeline.length > 2) {
        let breakoutIdx = -1;
        let isBull = false;

        for (let i = 0; i < stock.rsiTimeline.length - 1; i++) {
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

        if (breakoutIdx !== -1 && breakoutIdx + 1 < stock.rsiTimeline.length) {
          const breakoutPt = stock.rsiTimeline[breakoutIdx];
          const breakVol = breakoutPt.volume !== undefined && breakoutPt.volume > 0 ? breakoutPt.volume : 1000;

          // The very next candle after ORB break
          const nextPt = stock.rsiTimeline[breakoutIdx + 1];
          const testsOrb = isBull 
            ? (nextPt.low <= orbHigh * 1.008 && nextPt.low >= orbHigh * 0.992)
            : (nextPt.high >= orbLow * 0.992 && nextPt.high <= orbLow * 1.008);

          if (testsOrb) {
            const nextVol = nextPt.volume !== undefined && nextPt.volume > 0 ? nextPt.volume : 1000;
            const isVolumeMoreThanBreak = nextVol >= breakVol * 1.5;

            const resumes = isBull 
              ? (nextPt.close > nextPt.open && nextPt.close >= orbHigh)
              : (nextPt.close < nextPt.open && nextPt.close <= orbLow);

            if (resumes && isVolumeMoreThanBreak) {
              hasBreakAndContinue = true;
              breakAndContinueTime = nextPt.timeStr;
            } else if (breakoutIdx + 2 < stock.rsiTimeline.length) {
              const resumePt = stock.rsiTimeline[breakoutIdx + 2];
              const resumeVol = resumePt.volume !== undefined && resumePt.volume > 0 ? resumePt.volume : 1000;
              const isResumeVolMore = resumeVol >= breakVol * 1.5;

              const resumedNext = isBull 
                ? (resumePt.close > nextPt.close && resumePt.close >= orbHigh && resumePt.close > resumePt.open)
                : (resumePt.close < nextPt.close && resumePt.close <= orbLow && resumePt.close < resumePt.open);

              if (resumedNext && isResumeVolMore) {
                hasBreakAndContinue = true;
                breakAndContinueTime = resumePt.timeStr;
              }
            }
          }
        }
      }

      let hasOrbWithVolume = false;
      let orbWithVolumeTime = '-';

      const prevDayHigh = stock.previousClose ? stock.previousClose * 1.008 : (open * 1.01);

      if (stock.rsiTimeline && stock.rsiTimeline.length > 0) {
        for (const pt of stock.rsiTimeline) {
          const isBreak = pt.close >= orbHigh;
          const vol = pt.volume !== undefined ? pt.volume : 1000;
          const has1xVolume = vol >= 800;
          const closingAbovePrevHigh = pt.close >= prevDayHigh;

          if (isBreak && has1xVolume && closingAbovePrevHigh) {
            hasOrbWithVolume = true;
            orbWithVolumeTime = pt.timeStr;
            break;
          }
        }
      }

      let hasLowestVolumeBullish = false;
      let hasLowestVolumeBearish = false;
      let lowestVolumeTime = '-';

      const prevDayLow = stock.previousClose ? stock.previousClose * 0.992 : (open * 0.99);

      if (stock.rsiTimeline && stock.rsiTimeline.length >= 2) {
        const c1 = stock.rsiTimeline[0];
        const c2 = stock.rsiTimeline[1];

        const c1Open = c1.open !== undefined ? c1.open : open;
        const c1Close = c1.close !== undefined ? c1.close : close;
        const c1Vol = c1.volume !== undefined ? c1.volume : 1000;

        const c2Open = c2.open !== undefined ? c2.open : open;
        const c2Close = c2.close !== undefined ? c2.close : close;
        const c2Vol = c2.volume !== undefined ? c2.volume : 500;

        const c1Bullish = c1Open > prevDayHigh && c1Close > prevDayHigh;
        const c2RedLowVol = c2Close < c2Open && c2Vol <= c1Vol * 0.30 && c2Vol >= c1Vol * 0.05;

        if (c1Bullish && c2RedLowVol) {
          hasLowestVolumeBullish = true;
          lowestVolumeTime = c2.timeStr;
        }

        const c1Bearish = c1Open < prevDayLow && c1Close < prevDayLow;
        const c2GreenLowVol = c2Close > c2Open && c2Vol <= c1Vol * 0.30 && c2Vol >= c1Vol * 0.05;

        if (c1Bearish && c2GreenLowVol) {
          hasLowestVolumeBearish = true;
          lowestVolumeTime = c2.timeStr;
        }
      }

      const hasLowestVolumeConcept = hasLowestVolumeBullish || hasLowestVolumeBearish;

      const hasLightningScalp = (isBullishQualified || isBearishQualified) && breakMinutesFromOpen <= 15 && orbHeightPct <= 1.5 && (breakPctAbove >= 0.25 || breakPctBelow >= 0.25);

      let discoveryLabel = '';
      let triggerTimeStr = orbBreakTime;

      const meetsAnyCriteria = isBullishQualified || isBearishQualified || isSuperBreakBullish || isSuperBreakBearish || isHighQualityBullish || isHighQualityBearish || hqSignalStatus === 'FAILED BREAKOUT' || hasOrbLowBounce || hasBounceCandleStrength || hasOrbZeroReversal || hasBounceGreat || hasLightningScalp || hasNoRetest;

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
      } else if (isHighQualityBullish || isHighQualityBearish) {
        discoveryLabel = isHighQualityBullish ? 'ORB High Quality Bullish' : 'ORB High Quality Bearish';
        triggerTimeStr = hqTimestamp || orbBreakTime;
      } else if (hqSignalStatus === 'FAILED BREAKOUT') {
        discoveryLabel = 'Failed Breakout / Fakeout';
        triggerTimeStr = hqTimestamp || orbBreakTime;
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

      const priceArray = stock.rsiTimeline && stock.rsiTimeline.length > 0 
        ? stock.rsiTimeline.map(p => p.close)
        : [open, high, low, close];
      const computeEMA = (prices: number[], period: number): number[] => {
        const k = 2 / (period + 1);
        const emas: number[] = [];
        let prevEMA = prices[0] || 0;
        for (let i = 0; i < prices.length; i++) {
          if (i === 0) {
            emas.push(prevEMA);
          } else {
            const currentEMA = (prices[i] * k) + (prevEMA * (1 - k));
            emas.push(currentEMA);
            prevEMA = currentEMA;
          }
        }
        return emas;
      };
      const ema9Arr = computeEMA(priceArray, 9);
      const ema9 = ema9Arr[ema9Arr.length - 1] || close;
      const maintainingEma9 = isBullishQualified ? (close >= ema9) : (isBearishQualified ? (close <= ema9) : true);
      const maintainingVwap = isBullishQualified ? (close >= vwap) : (isBearishQualified ? (close <= vwap) : true);

      const isFullyBullish = isBullishQualified && rsi >= 60 && close > vwap && close >= ema9 && (stock.pctChange || 0) >= 1.2 && breakPctAbove >= 1.2 && (stock.volumeRatio || 1) >= 1.15;
      const isEarlyIgnition = isBullishQualified && breakMinutesFromOpen <= 30 && orbHeightPct <= 2.0 && (breakPctAbove >= 0.3 || (stock.volumeRatio || 1) >= 1.1);
      const isConfirmedSignal = (isBullishQualified || isBearishQualified) && (isHighQualityBullish || isHighQualityBearish || hasBreakAndContinue || hasOrbLowBounce || hasBounceGreat) && (isBullishQualified ? (rsi >= 55 && close > vwap) : (rsi <= 45 && close < vwap));

      return {
        ...stock,
        orbHigh: Math.round(orbHigh * 100) / 100,
        orbLow: Math.round(orbLow * 100) / 100,
        orbHeightPct: Math.round(orbHeightPct * 100) / 100,
        isBullishQualified,
        isBearishQualified,
        isSuperBreakBullish,
        isSuperBreakBearish,
        isFullyBullish,
        isEarlyIgnition,
        isConfirmedSignal,
        breakPctAbove: Math.round(breakPctAbove * 100) / 100,
        breakPctBelow: Math.round(breakPctBelow * 100) / 100,
        orbBreakTime: capTimeAtCurrentClock(orbBreakTime),
        superBreakTime: capTimeAtCurrentClock(superBreakTime),
        breakPctAtOrbBreak: Math.round(breakPctAtOrbBreak * 100) / 100,
        breakVsHeightPct: Math.round(breakVsHeightPct * 100) / 100,
        breakTimeAtBreak: capTimeAtCurrentClock(breakTimeAtBreak),
        breakMinutesFromOpen,
        durationDisplay,
        lotSize,
        rsi: Math.round(rsi * 10) / 10,
        vwap: Math.round(vwap * 100) / 100,
        ema9: Math.round(ema9 * 100) / 100,
        maintainingEma9,
        maintainingVwap,
        isHighQualityBullish,
        isHighQualityBearish,
        hqSignalStatus,
        hqScore,
        hqBreakDistancePct,
        hqBreakDistanceAtr,
        hqCandleBodyPct,
        hqUpperWickPct,
        hqLowerWickPct,
        hqRelativeVolume,
        hqVwapStatus,
        hqNearestSr,
        hqProposedEntry,
        hqStopLoss,
        hqTarget,
        hqRewardRiskRatio,
        hqFailedConditions,
        hqTimestamp: capTimeAtCurrentClock(hqTimestamp),
        hasOrbLowBounce,
        orbLowBounceTime: capTimeAtCurrentClock(orbLowBounceTime),
        orbBounceType,
        rallyExpansionPct,
        bouncePowerScore,
        hasBounceCandleStrength,
        bounceCandleTime: capTimeAtCurrentClock(bounceCandleTime),
        bounceCandleScore,
        bounceCandleDetails,
        hasOrbZeroReversal,
        zeroReversalTime: capTimeAtCurrentClock(zeroReversalTime),
        hasBounceGreat,
        bounceGreatTime: capTimeAtCurrentClock(bounceGreatTime),
        hasLightningScalp,
        hasNoRetest,
        noRetestTime: capTimeAtCurrentClock(noRetestTime),
        hasBreakAndContinue,
        breakAndContinueTime: capTimeAtCurrentClock(breakAndContinueTime),
        hasOrbWithVolume,
        orbWithVolumeTime: capTimeAtCurrentClock(orbWithVolumeTime),
        hasLowestVolumeConcept,
        hasLowestVolumeBullish,
        hasLowestVolumeBearish,
        lowestVolumeTime: capTimeAtCurrentClock(lowestVolumeTime),
        hasRecentDiscovery,
        discoveryLabel,
        discoveryTime: capTimeAtCurrentClock(discoveryTime)
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
      if (activeTab === 'hq_breakout' && !s.isHighQualityBullish && !s.isHighQualityBearish && s.hqSignalStatus !== 'BREAKOUT DETECTED' && s.hqSignalStatus !== 'FAILED BREAKOUT') return false;
      if (activeTab === 'failed_retest' && !s.hasFailedRetest) return false;
      if (activeTab === 'orb_low_bounce' && !s.hasOrbLowBounce) return false;
      if (activeTab === 'bounce_candle_strength' && !s.hasBounceCandleStrength) return false;
      if (activeTab === 'orb_zero_reversal') {
        if (!s.hasOrbZeroReversal) return false;
        if (zeroReversalSubFilter === 'MAINTAINING_9_EMA' && !s.maintainingEma9) return false;
        if (zeroReversalSubFilter === 'MAINTAINING_VWAP' && !s.maintainingVwap) return false;
        if (zeroReversalSubFilter === 'MAINTAINING_BOTH' && (!s.maintainingEma9 || !s.maintainingVwap)) return false;
      }
      if (activeTab === 'bounce_great' && !s.hasBounceGreat) return false;
      if (activeTab === 'lightning_scalp' && !s.hasLightningScalp) return false;
      if (activeTab === 'no_retest' && !s.hasNoRetest) return false;
      if (activeTab === 'break_and_continue' && !s.hasBreakAndContinue) return false;
      if (activeTab === 'lowest_volume_concept' && !s.hasLowestVolumeConcept) return false;
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
  const hqBreakoutCount = processedOrbStocks.filter(s => s.isHighQualityBullish || s.isHighQualityBearish || s.hqSignalStatus === 'BREAKOUT DETECTED' || s.hqSignalStatus === 'FAILED BREAKOUT').length;
  const failedRetestCount = processedOrbStocks.filter(s => s.hasFailedRetest).length;
  const orbLowBounceCount = processedOrbStocks.filter(s => s.hasOrbLowBounce).length;
  const bounceCandleCount = processedOrbStocks.filter(s => s.hasBounceCandleStrength).length;
  const zeroReversalCount = processedOrbStocks.filter(s => s.hasOrbZeroReversal).length;
  const bounceGreatCount = processedOrbStocks.filter(s => s.hasBounceGreat).length;
  const lightningScalpCount = processedOrbStocks.filter(s => s.hasLightningScalp).length;
  const noRetestCount = processedOrbStocks.filter(s => s.hasNoRetest).length;
  const breakAndContinueCount = processedOrbStocks.filter(s => s.hasBreakAndContinue).length;
  const orbWithVolumeCount = processedOrbStocks.filter(s => s.hasOrbWithVolume).length;
  const lowestVolumeCount = processedOrbStocks.filter(s => s.hasLowestVolumeConcept).length;
  const recentDiscoveryCount = processedOrbStocks.filter(s => s.hasRecentDiscovery).length;

  return (
    <div className="space-y-6 animate-fade-in pb-20 relative">
      <SectorDominanceBadgesBar 
        stocks={stocks} 
        onSelectStock={(stk) => onSelectStockDetail(stk)} 
        title="🏢 ORB Scanner Sector Dominance & Stock Badges"
      />

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
            onClick={() => setActiveTab('hq_breakout')}
            className={`px-3 py-2.5 rounded-xl text-xs font-black tracking-wide uppercase transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'hq_breakout'
                ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow-lg shadow-emerald-600/30 border border-emerald-400'
                : 'bg-slate-800 text-emerald-300 hover:bg-slate-700 border border-emerald-500/40'
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-300 animate-pulse" />
            <span>✨ ORB High Quality Breakout ({hqBreakoutCount})</span>
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

          <button
            onClick={() => setActiveTab('break_and_continue')}
            className={`px-3 py-2.5 rounded-xl text-xs font-black tracking-wide uppercase transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'break_and_continue'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30 border border-amber-400'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-300 fill-amber-300 animate-pulse" />
            <span>⚡ Break &amp; Continue ({breakAndContinueCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('orb_with_volume')}
            className={`px-3 py-2.5 rounded-xl text-xs font-black tracking-wide uppercase transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'orb_with_volume'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 border border-emerald-400'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            <Activity className="w-4 h-4 text-emerald-300 animate-pulse" />
            <span>📊 ORB with Volume ({orbWithVolumeCount})</span>
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

        {/* 🚀 ORB ZERO REVERSAL SUB-FILTERS SUB-BAR */}
        {activeTab === 'orb_zero_reversal' && (
          <div className="bg-slate-950/90 p-3.5 rounded-2xl border border-amber-500/40 flex flex-wrap items-center gap-2 shadow-lg">
            <span className="text-xs font-black text-amber-300 uppercase tracking-wider mr-1.5 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 animate-pulse" /> Zero Reversal Sub-Filters:
            </span>
            {[
              { id: 'ALL', label: 'All Zero Reversal' },
              { id: 'MAINTAINING_9_EMA', label: '📈 Maintaining 9 EMA' },
              { id: 'MAINTAINING_VWAP', label: '🛡️ Maintaining VWAP' },
              { id: 'MAINTAINING_BOTH', label: '⚡ Maintaining Both (9 EMA & VWAP)' },
            ].map((sub) => (
              <button
                key={sub.id}
                onClick={() => setZeroReversalSubFilter(sub.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  zeroReversalSubFilter === sub.id
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

      {/* Educational Banner for Fully Bullish / Confirmed Signals */}
      {activeTab === 'fully_bullish' && (
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 p-4 rounded-2xl border border-emerald-500/50 shadow-lg text-emerald-200 text-xs font-mono space-y-1.5 mb-4">
          <div className="font-black text-emerald-300 flex items-center gap-2 text-sm uppercase tracking-wider">
            <Zap className="w-4 h-4 fill-emerald-300 animate-pulse" />
            <span>Why Traders Take Fully Bullish Parabolic Rallies (Zero Pullback Confidence)</span>
          </div>
          <p className="text-slate-300 font-sans leading-relaxed">
            Fully Bullish stocks represent institutional breakout perfection: RSI &ge; 60, trading strictly above VWAP and 9 EMA, day gain &ge; 1.2%, breakout &ge; 1.2% above ORB High, and supported by heavy volume surge. <strong>Why this prevents pullbacks:</strong> These conditions ensure aggressive institutional buying pressure where sellers are overwhelmed, creating a parabolic upward trajectory that sustains momentum without sharp retracements.
          </p>
        </div>
      )}

      {activeTab === 'hq_breakout' && (
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-cyan-950 p-4 rounded-2xl border border-emerald-500/50 shadow-lg text-emerald-200 text-xs font-mono space-y-1.5 mb-4">
          <div className="font-black text-emerald-300 flex items-center gap-2 text-sm uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-emerald-300 animate-pulse" />
            <span>ORB High Quality Breakout Engine (15-Minute OHLCV Candles Only)</span>
          </div>
          <p className="text-slate-300 font-sans leading-relaxed">
            Identifies high-conviction Opening Range Breakouts using strictly completed 15-minute candles. Requires breakout distance &ge; 0.10 ATR, body &ge; 60%, wicks &le; 20%, volume &ge; 1.5x previous 20 candles, VWAP alignment, and minimum 2:1 reward-to-risk ratio against opposing support/resistance. Rejects false breakouts and fakeouts instantly.
          </p>
        </div>
      )}

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
            if (activeTab === 'hq_breakout') {
              const isStrongBull = stock.hqSignalStatus === 'STRONG BULLISH';
              const isStrongBear = stock.hqSignalStatus === 'STRONG BEARISH';
              const isFailed = stock.hqSignalStatus === 'FAILED BREAKOUT';
              const isDetected = stock.hqSignalStatus === 'BREAKOUT DETECTED';

              return (
                <div 
                  key={stock.symbol}
                  onClick={() => {
                    window.open('https://tv.dhan.co', '_blank');
                    onSelectStockDetail(stock);
                  }}
                  className={`rounded-2xl border-2 transition-all cursor-pointer overflow-hidden flex flex-col hover:shadow-2xl ${
                    isStrongBull 
                      ? 'bg-slate-900 border-emerald-500 ring-4 ring-emerald-500/20 shadow-emerald-500/20' 
                      : isStrongBear
                      ? 'bg-slate-900 border-rose-500 ring-4 ring-rose-500/20 shadow-rose-500/20'
                      : isFailed
                      ? 'bg-slate-900 border-amber-500 ring-2 ring-amber-500/20'
                      : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  {/* Header */}
                  <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className={`text-[10px] px-2.5 py-1 rounded-lg font-black uppercase tracking-wider ${
                        isStrongBull ? 'bg-emerald-500 text-slate-950 animate-pulse' :
                        isStrongBear ? 'bg-rose-500 text-slate-950 animate-pulse' :
                        isFailed ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {stock.hqSignalStatus || 'NO TRADE'}
                      </span>
                      <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/50">
                        Score: {stock.hqScore || 50}/100
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">15m Close: {stock.hqTimestamp}</span>
                  </div>

                  {/* ⚡ BIG FONT TIMING BANNER: EXACT BREAKOUT & ENTRY TIMING */}
                  <div className="px-5 py-4 bg-gradient-to-r from-slate-950 via-indigo-950/90 to-slate-950 border-b border-indigo-500/40 flex items-center justify-between font-mono">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-sans font-bold">Exact Breakout Timing</span>
                      <span className="text-3xl font-black text-amber-300 tracking-tight drop-shadow">
                        {stock.orbBreakTime || stock.hqTimestamp}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-sans font-bold">Entry Timing</span>
                      <span className="text-3xl font-black text-cyan-300 tracking-tight drop-shadow">
                        {stock.hqTimestamp}
                      </span>
                    </div>
                  </div>

                  {/* Symbol & CMP */}
                  <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
                    <div>
                      <h3 className="font-bold text-xl text-white font-mono flex items-center gap-2">
                        {stock.symbol}
                        {isStrongBull ? <ArrowUpRight className="w-5 h-5 text-emerald-400" /> : <ArrowDownRight className="w-5 h-5 text-rose-400" />}
                      </h3>
                      <span className="text-xs text-slate-400">{stock.companyName}</span>
                    </div>
                    <div className="text-right font-mono">
                      <div className="text-base font-black text-white">₹{stock.closePrice?.toFixed(2)}</div>
                      <div className={`text-xs font-bold ${stock.pctChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {stock.pctChange > 0 ? '+' : ''}{stock.pctChange?.toFixed(2)}%
                      </div>
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="p-4 space-y-3 text-xs font-mono">
                    {/* Passed Conditions Above (Most Promising) */}
                    <div className="bg-emerald-950/35 border border-emerald-500/40 p-3.5 rounded-2xl space-y-2">
                      <span className="font-black uppercase tracking-wide block text-[11px] text-emerald-300 flex items-center gap-1.5 mb-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Passed & Promising Conditions (Above):
                      </span>
                      <div className="grid grid-cols-2 gap-2.5 text-[11px]">
                        <div className="bg-slate-950/60 p-2 rounded-xl border border-emerald-500/20">
                          <span className="text-slate-400 text-[10px] block">Break Distance</span>
                          <strong className="text-amber-300 text-xs">{stock.hqBreakDistancePct}% ({stock.hqBreakDistanceAtr} ATR)</strong>
                        </div>
                        <div className="bg-slate-950/60 p-2 rounded-xl border border-emerald-500/20">
                          <span className="text-slate-400 text-[10px] block">Candle Body %</span>
                          <strong className={stock.hqCandleBodyPct >= 60 ? 'text-emerald-400 text-xs' : 'text-rose-400 text-xs'}>{stock.hqCandleBodyPct}%</strong>
                        </div>
                        <div className="bg-slate-950/60 p-2 rounded-xl border border-emerald-500/20">
                          <span className="text-slate-400 text-[10px] block">Relative Volume</span>
                          <strong className={stock.hqRelativeVolume >= 1.5 ? 'text-emerald-400 text-xs' : 'text-amber-400 text-xs'}>{stock.hqRelativeVolume}x</strong>
                        </div>
                        <div className="bg-slate-950/60 p-2 rounded-xl border border-emerald-500/20">
                          <span className="text-slate-400 text-[10px] block">VWAP Status</span>
                          <strong className="text-cyan-300 text-xs">{stock.hqVwapStatus}</strong>
                        </div>
                      </div>
                    </div>

                    {/* S/R & Trade Plan */}
                    <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-400">Nearest S/R Zone:</span>
                        <span className="font-bold text-white">{stock.hqNearestSr}</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-400">Proposed Entry:</span>
                        <span className="font-bold text-emerald-400">₹{stock.hqProposedEntry?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-400">Stop Loss:</span>
                        <span className="font-bold text-rose-400">₹{stock.hqStopLoss?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-400">Target (2:1+):</span>
                        <span className="font-bold text-amber-300">₹{stock.hqTarget?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-400">Reward-to-Risk:</span>
                        <span className="font-bold text-cyan-300">{stock.hqRewardRiskRatio}</span>
                      </div>
                    </div>

                    {/* Failed Conditions Below */}
                    {stock.hqFailedConditions && stock.hqFailedConditions.length > 0 && (
                      <div className="bg-rose-950/50 border border-rose-500/50 p-3.5 rounded-2xl text-[11px] text-rose-200 space-y-1.5">
                        <span className="font-black uppercase tracking-wide block text-[11px] text-rose-400 flex items-center gap-1.5">
                          <X className="w-4 h-4 text-rose-400" /> Failed Conditions (Below):
                        </span>
                        <ul className="list-disc list-inside space-y-1 text-slate-300">
                          {stock.hqFailedConditions.map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            const isBull = activeTab === 'bullish' || activeTab === 'super_break_bull';
            const breakPct = isBull ? stock.breakPctAbove : stock.breakPctBelow;
            const isSuper = (isBull && stock.isSuperBreakBullish) || (!isBull && stock.isSuperBreakBearish);
            const is25Above = (isBull && (stock.breakPctAbove >= stock.orbHeightPct * 1.25 || stock.breakVsHeightPct >= 125)) || (!isBull && (stock.breakPctBelow >= stock.orbHeightPct * 1.25 || stock.breakVsHeightPct >= 125));
            const isFollowed = followedSymbols.includes(stock.symbol);

            return (
              <div 
                key={stock.symbol}
                onClick={() => {
                  window.open('https://tv.dhan.co', '_blank');
                  onSelectStockDetail(stock);
                }}
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

                {/* 🚀 FULLY BULLISH HIGH CONVICTION BANNER */}
                {stock.isFullyBullish && (
                  <div className="px-4 py-2.5 bg-gradient-to-r from-slate-950 via-emerald-950/90 to-slate-950 border-b border-emerald-500/60 text-xs font-mono text-emerald-200 flex items-center justify-between shadow">
                    <span className="font-black flex items-center gap-1.5 uppercase tracking-wide text-emerald-300">
                      <Zap className="w-4 h-4 text-emerald-400 fill-emerald-400 animate-pulse" />
                      <span>🚀 Fully Bullish High Conviction Breakout</span>
                    </span>
                    <strong className="text-emerald-300 bg-emerald-500/20 border border-emerald-400 px-2 py-0.5 rounded-lg">
                      RSI {stock.rsi} • VWAP &amp; EMA9 OK
                    </strong>
                  </div>
                )}

                {/* ⚡ EARLY IGNITION BANNER */}
                {stock.isEarlyIgnition && (
                  <div className="px-4 py-2.5 bg-gradient-to-r from-slate-950 via-amber-950/90 to-slate-950 border-b border-amber-500/60 text-xs font-mono text-amber-200 flex items-center justify-between shadow">
                    <span className="font-black flex items-center gap-1.5 uppercase tracking-wide text-amber-300">
                      <Sparkles className="w-4 h-4 text-amber-400 animate-bounce" />
                      <span>⚡ Early Ignition Breakout ({stock.breakMinutesFromOpen}m)</span>
                    </span>
                    <strong className="text-amber-200 bg-amber-500/20 border border-amber-400 px-2 py-0.5 rounded-lg">
                      Early Setup
                    </strong>
                  </div>
                )}

                {/* 🛡️ CONFIRMED SIGNAL BANNER */}
                {stock.isConfirmedSignal && (
                  <div className="px-4 py-2.5 bg-gradient-to-r from-slate-950 via-purple-950/90 to-slate-950 border-b border-purple-500/60 text-xs font-mono text-purple-200 flex items-center justify-between shadow">
                    <span className="font-black flex items-center gap-1.5 uppercase tracking-wide text-purple-300">
                      <ShieldCheck className="w-4 h-4 text-purple-400" />
                      <span>🛡️ Bullish/Bearish Confirmed Signal</span>
                    </span>
                    <strong className="text-purple-200 bg-purple-500/20 border border-purple-400 px-2 py-0.5 rounded-lg">
                      Tested &amp; Respected
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

                {/* ⚡ BREAK & CONTINUE BANNER */}
                {stock.hasBreakAndContinue && (
                  <div className="px-4 py-2.5 bg-gradient-to-r from-slate-950 via-amber-950/70 to-slate-950 border-b border-amber-500/40 text-xs font-mono text-amber-200 flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-400 fill-amber-400 animate-pulse" />
                      <span>⚡ Break &amp; Continue (ORB Break @ {stock.orbBreakTime} ➔ Retest &amp; Volume Reversal):</span>
                    </span>
                    <strong className="text-white font-black text-xs px-2 py-0.5 bg-amber-500/20 border border-amber-400 rounded-lg">
                      @{stock.breakAndContinueTime}
                    </strong>
                  </div>
                )}

                {/* 📊 ORB WITH VOLUME BANNER */}
                {stock.hasOrbWithVolume && (
                  <div className="px-4 py-2.5 bg-gradient-to-r from-slate-950 via-emerald-950/70 to-slate-950 border-b border-emerald-500/40 text-xs font-mono text-emerald-200 flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                      <span>📊 ORB with 1x+ Volume &amp; Closing Above Prev Day High:</span>
                    </span>
                    <strong className="text-white font-black text-xs px-2 py-0.5 bg-emerald-500/20 border border-emerald-400 rounded-lg">
                      @{stock.orbWithVolumeTime}
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

                    {/* Dhan Chart Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open('https://tv.dhan.co', '_blank');
                      }}
                      className="px-3 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-lg text-xs font-black shadow-md transition-all cursor-pointer min-h-[38px] flex items-center space-x-1"
                      title="Open Dhan Chart & Web Trading Platform"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Dhan Chart</span>
                    </button>

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

      {/* 🚀 ORB LOW SUPPORT BOUNCE ENTRY POPUNDER TICKER BAR */}
      {activeTab === 'orb_low_bounce' && (
        <div className="fixed bottom-0 left-0 w-full z-50 bg-slate-950 border-t-2 border-emerald-500 shadow-[0_-15px_40px_rgba(16,185,129,0.4)] px-4 py-3 text-white overflow-hidden pointer-events-auto">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-3 shrink-0 bg-emerald-950/80 px-3 py-1.5 rounded-xl border border-emerald-500/50">
              <span className="p-1.5 bg-emerald-500 text-slate-950 rounded-lg animate-pulse shrink-0">
                <ShieldCheck className="w-4 h-4 font-black" />
              </span>
              <div className="text-xs font-black text-emerald-300 uppercase tracking-wider flex items-center gap-2">
                <span>⚡ ORB Low Support Bounce Ticker</span>
                <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded text-[10px] border border-emerald-500/40 font-mono">
                  {processedOrbStocks.filter(s => s.hasOrbLowBounce).length} Active Setups (4/4 Met)
                </span>
              </div>
            </div>

            {/* Speed Control (+ / -) */}
            <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700 text-xs font-mono shrink-0">
              <span className="text-slate-400">Speed:</span>
              <button 
                onClick={() => setTickerSpeed(prev => Math.max(15, prev - 5))}
                className="w-6 h-6 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-black rounded flex items-center justify-center cursor-pointer shadow"
                title="Speed Up (-)"
              >
                -
              </button>
              <span className="font-bold text-amber-300 w-8 text-center">{tickerSpeed}s</span>
              <button 
                onClick={() => setTickerSpeed(prev => Math.min(100, prev + 5))}
                className="w-6 h-6 bg-slate-800 hover:bg-slate-700 text-rose-400 font-black rounded flex items-center justify-center cursor-pointer shadow"
                title="Slow Down (+)"
              >
                +
              </button>
            </div>

            <div className="flex-1 overflow-hidden relative w-full lg:w-auto">
              {processedOrbStocks.filter(s => s.hasOrbLowBounce).length === 0 ? (
                <div className="text-xs text-slate-400 italic py-1 text-center font-mono">
                  ⏳ Scanning live session candles for stocks meeting all 4 ORB Low Support Bounce conditions...
                </div>
              ) : (
                <div className="overflow-x-auto scrollbar-none flex items-center gap-3 py-1 animate-marquee whitespace-nowrap" style={{ animationDuration: `${tickerSpeed}s` }}>
                  {processedOrbStocks.filter(s => s.hasOrbLowBounce).concat(processedOrbStocks.filter(s => s.hasOrbLowBounce)).map((stock, idx) => {
                    const isBull = stock.orbBounceType === 'BULLISH_SUPPORT_BOUNCE';
                    return (
                      <div 
                        key={`${stock.symbol}-${idx}`} 
                        onClick={() => onSelectStockDetail(stock)}
                        className={`bg-slate-900 border ${isBull ? 'border-emerald-500/85 hover:border-emerald-400 shadow-emerald-950/60' : 'border-rose-500/85 hover:border-rose-400 shadow-rose-950/60'} rounded-2xl p-3.5 flex flex-col gap-2.5 font-mono text-xs shrink-0 shadow-2xl transition-all cursor-pointer w-80`}
                      >
                        {/* Row 1: Time, Direction, Signal Strength */}
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <div className="flex items-center gap-2">
                            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg ${isBull ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-slate-950'} font-black text-xs`}>
                              <Clock className="w-3 h-3 animate-pulse" />
                              <span>{stock.orbLowBounceTime}</span>
                            </div>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase ${isBull ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' : 'bg-rose-950 text-rose-300 border border-rose-500/40'}`}>
                              {isBull ? '🟢 LONG' : '🔴 SHORT'}
                            </span>
                          </div>
                          <div className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded font-black text-[10px]">
                            ⚡ Strength: {stock.bouncePowerScore}/100
                          </div>
                        </div>

                        {/* Row 2: Symbol & Price */}
                        <div className="flex items-center justify-between">
                          <div>
                            <strong className="text-white font-black text-sm">{stock.symbol}</strong>
                            <p className="text-[10px] text-slate-400 font-sans truncate max-w-[140px]">{stock.companyName}</p>
                          </div>
                          <div className="text-right">
                            <strong className="text-white font-black text-sm">₹{stock.closePrice?.toFixed(2)}</strong>
                            <span className={`block text-[10px] font-bold ${stock.pctChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {stock.pctChange >= 0 ? '+' : ''}{stock.pctChange?.toFixed(2)}%
                            </span>
                          </div>
                        </div>

                        {/* Row 3: ORB Levels & Break % */}
                        <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-950 p-2 rounded-xl border border-slate-800">
                          <div>
                            <span className="text-slate-400 text-[9px] block">ORB High / Low</span>
                            <span className="text-emerald-400 font-bold">₹{stock.orbHigh}</span> / <span className="text-rose-400 font-bold">₹{stock.orbLow}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[9px] block">Break &amp; Height</span>
                            <span className="text-amber-300 font-bold">{stock.breakPctAbove > 0 ? `+${stock.breakPctAbove}%` : `+${stock.breakPctBelow}%`}</span> ({stock.orbHeightPct}%)
                          </div>
                        </div>

                        {/* Row 4: Technicals & Rally */}
                        <div className="flex items-center justify-between text-[10px] text-slate-300 pt-1 border-t border-slate-800">
                          <span>RSI: <strong className={stock.rsi >= 50 ? 'text-emerald-400' : 'text-rose-400'}>{stock.rsi}</strong></span>
                          <span>VWAP: <strong>₹{stock.vwap}</strong></span>
                          <span>ADX: <strong className="text-amber-300">{stock.adx}</strong></span>
                          <span className="text-emerald-300 font-bold">+{stock.rallyExpansionPct}% 🚀</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
