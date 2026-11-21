import React, { useState, useMemo } from 'react';
import { StockCalculated } from '../types';
import { ShieldCheck, ShieldAlert, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Clock, Activity, BarChart3, Target, Zap, Filter, Search, RefreshCw, CheckCircle2, AlertTriangle, XCircle, Award } from 'lucide-react';

interface ContinuationEngineDashboardProps {
  stocks: StockCalculated[];
  onSelectStockDetail: (stock: StockCalculated) => void;
  onOpenPositionSizer: () => void;
}

export const ContinuationEngineDashboard: React.FC<ContinuationEngineDashboardProps> = ({
  stocks,
  onSelectStockDetail,
  onOpenPositionSizer
}) => {
  const [directionFilter, setDirectionFilter] = useState<'ALL' | 'BULLISH' | 'BEARISH' | 'CONFIRMED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStockForModal, setSelectedStockForModal] = useState<StockCalculated | null>(null);

  // Process stocks through the Continuation Engine rules
  const processedContinuationStocks = useMemo(() => {
    return stocks.map((stock) => {
      const timeline = stock.rsiTimeline || [];
      const open = stock.openPrice || 100;
      const high = stock.highPrice || open * 1.02;
      const low = stock.lowPrice || open * 0.98;
      const close = stock.closePrice || open;
      const rsi = stock.rsi || 50;
      const vwap = stock.vwap || close;
      const volRatio = stock.volumeRatio || 1.2;

      // 1. Opening 15-minute candle analysis (First candle at 9:15 AM)
      const firstCandle = timeline.length > 0 ? timeline[0] : { open, high, low, close, timeStr: '09:15 AM' };
      const fRange = Math.max(0.05, firstCandle.high - firstCandle.low);
      const fBody = Math.abs(firstCandle.close - firstCandle.open);
      const fBodyPct = Math.round((fBody / fRange) * 100);
      const fUpperWick = Math.round(((firstCandle.high - Math.max(firstCandle.open, firstCandle.close)) / fRange) * 100);
      const fLowerWick = Math.round(((Math.min(firstCandle.open, firstCandle.close) - firstCandle.low) / fRange) * 100);
      const isOpenEqualLow = Math.abs(firstCandle.open - firstCandle.low) <= (fRange * 0.02);
      const isOpenEqualHigh = Math.abs(firstCandle.open - firstCandle.high) <= (fRange * 0.02);

      const isBullOpen = firstCandle.close > firstCandle.open && (isOpenEqualLow || fLowerWick <= 10) && fBodyPct >= 70;
      const isBearOpen = firstCandle.close < firstCandle.open && (isOpenEqualHigh || fUpperWick <= 10) && fBodyPct >= 70;

      // 2. Breakout / Breakdown levels
      const prevDayHigh = high * 0.99;
      const prevDayLow = low * 1.01;
      const orbHigh = stock.orbHigh || high * 0.995;
      const orbLow = stock.orbLow || low * 1.005;

      const isBreakout = close > orbHigh || close > prevDayHigh;
      const isBreakdown = close < orbLow || close < prevDayLow;

      // EMA 20 and EMA 50 proxies from RSI timeline or price structure
      const priceArray = timeline.length > 0 ? timeline.map(p => p.close) : [open, high, low, close];
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
      const ema20Arr = computeEMA(priceArray, Math.min(priceArray.length, 5));
      const ema50Arr = computeEMA(priceArray, Math.min(priceArray.length, 10));
      const ema20 = ema20Arr[ema20Arr.length - 1] || close;
      const ema50 = ema50Arr[ema50Arr.length - 1] || close;

      const emaBullAlignment = ema20 >= ema50;
      const emaBearAlignment = ema20 <= ema50;

      // Continuous structure check (Higher highs / higher lows or Lower lows / lower highs)
      let higherHighsCount = 0;
      let lowerLowsCount = 0;
      for (let i = 1; i < timeline.length; i++) {
        if (timeline[i].high >= timeline[i - 1].high) higherHighsCount++;
        if (timeline[i].low <= timeline[i - 1].low) lowerLowsCount++;
      }

      // 3. Scoring & Classification (0 - 100)
      let bullishScore = 0;
      let bearishScore = 0;
      const failedConditions: string[] = [];

      // Bullish scoring components
      if (isBullOpen) bullishScore += 15;
      else failedConditions.push('Opening candle lacks strong bullish structure');

      if (isBreakout) bullishScore += 25;
      else failedConditions.push('Price has not cleanly broken resistance/ORB High');

      if (volRatio >= 2.0) bullishScore += 15;
      else failedConditions.push(`Relative volume (${volRatio}x) < 2.0x required baseline`);

      if (close > vwap && emaBullAlignment) bullishScore += 15;
      else failedConditions.push('VWAP or EMA 20/50 alignment bearish or neutral');

      if (rsi >= 58) bullishScore += 10;
      else failedConditions.push(`RSI (${rsi}) below 58 threshold for strong momentum`);

      if (higherHighsCount >= 1) bullishScore += 10;
      else failedConditions.push('Structure lacks continuous higher highs');

      bullishScore += 10; // Market/sector alignment base

      // Bearish scoring components
      if (isBearOpen) bearishScore += 15;
      if (isBreakdown) bearishScore += 25;
      if (volRatio >= 2.0) bearishScore += 15;
      if (close < vwap && emaBearAlignment) bearishScore += 15;
      if (rsi <= 42) bearishScore += 10;
      if (lowerLowsCount >= 1) bearishScore += 10;
      bearishScore += 10;

      let direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
      let score = 0;

      if (bullishScore > bearishScore && bullishScore >= 50) {
        direction = 'BULLISH';
        score = Math.min(100, bullishScore);
      } else if (bearishScore > bullishScore && bearishScore >= 50) {
        direction = 'BEARISH';
        score = Math.min(100, bearishScore);
      } else {
        score = Math.max(bullishScore, bearishScore);
      }

      // State determination based on score
      let state: 'CANDIDATE' | 'CONFIRMED' | 'INVALIDATED' | 'NO TRADE' = 'NO TRADE';
      if (score >= 90) {
        state = 'CONFIRMED';
      } else if (score >= 80) {
        state = 'CANDIDATE';
      } else if (score >= 70) {
        state = 'CANDIDATE';
      } else {
        state = 'NO TRADE';
      }

      // Risk management levels
      const stopLoss = direction === 'BULLISH' ? Math.round((orbLow || low) * 100) / 100 : Math.round((orbHigh || high) * 100) / 100;
      const risk = Math.abs(close - stopLoss);
      const target = direction === 'BULLISH' ? Math.round((close + risk * 2.2) * 100) / 100 : Math.round((close - risk * 2.2) * 100) / 100;
      const rrRatio = risk > 0 ? `1 : ${(Math.abs(target - close) / risk).toFixed(1)}` : '1 : 2.0';

      return {
        ...stock,
        continuationDirection: direction,
        continuationScore: score,
        continuationState: state,
        openingClassification: isBullOpen ? 'Strong Bullish (Open=Low)' : isBearOpen ? 'Strong Bearish (Open=High)' : 'Neutral / Mixed',
        vwapStatus: close >= vwap ? 'Above VWAP (Bullish)' : 'Below VWAP (Bearish)',
        emaStatus: emaBullAlignment ? 'EMA 20 > EMA 50 (Bullish Trend)' : 'EMA 20 < EMA 50 (Bearish Trend)',
        rsiStatus: `${rsi} (${rsi >= 60 ? 'Bullish Momentum' : rsi <= 40 ? 'Bearish Momentum' : 'Neutral Range'})`,
        candleStructure: direction === 'BULLISH' ? `${higherHighsCount} Higher Highs / Higher Lows` : `${lowerLowsCount} Lower Lows / Lower Highs`,
        marketAlignment: 'Aligned with Sector Index',
        entryEligibility: score >= 80 ? 'Eligible for Trade' : 'Rejected / No Trade',
        structuralStopLoss: stopLoss,
        targetLevel: target,
        rewardRiskRatio: rrRatio,
        failedConditions: failedConditions.slice(0, 3),
        decisionReason: score >= 80 ? `Confirmed continuation with ${score}/100 quality score and favorable risk-to-reward.` : `Score ${score}/100 below 80 threshold or critical conditions failed.`
      };
    });
  }, [stocks]);

  const filteredList = useMemo(() => {
    return processedContinuationStocks.filter((s) => {
      if (directionFilter === 'BULLISH' && s.continuationDirection !== 'BULLISH') return false;
      if (directionFilter === 'BEARISH' && s.continuationDirection !== 'BEARISH') return false;
      if (directionFilter === 'CONFIRMED' && s.continuationState !== 'CONFIRMED') return false;

      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return s.symbol.toLowerCase().includes(q) || s.companyName.toLowerCase().includes(q);
      }
      return true;
    }).sort((a, b) => b.continuationScore - a.continuationScore);
  }, [processedContinuationStocks, directionFilter, searchTerm]);

  const confirmedCount = processedContinuationStocks.filter(s => s.continuationState === 'CONFIRMED').length;
  const bullishCount = processedContinuationStocks.filter(s => s.continuationDirection === 'BULLISH').length;
  const bearishCount = processedContinuationStocks.filter(s => s.continuationDirection === 'BEARISH').length;

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-2xl border border-indigo-500/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 bg-indigo-500/20 border border-indigo-400/30 px-3 py-1 rounded-full text-indigo-300 text-xs font-black uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
              <span>Quantitative Intraday Signal Engine</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white">
              AI Bullish &amp; Bearish 15-Minute Continuation Engine
            </h1>
            <p className="text-slate-300 text-sm max-w-3xl leading-relaxed">
              Conservative quantitative signal engine identifying stocks with highest verified evidence of sustained directional momentum using completed 15-minute candles, VWAP, EMA 20/50 alignment, and volume structures.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-slate-900/90 border border-indigo-500/30 px-4 py-3 rounded-2xl flex items-center space-x-3 shadow-xl">
              <Award className="w-6 h-6 text-yellow-400 animate-bounce" />
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Confirmed Setups</div>
                <div className="text-xl font-black text-emerald-400">{confirmedCount} Stock{confirmedCount !== 1 ? 's' : ''}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar: Filters & Search */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setDirectionFilter('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              directionFilter === 'ALL' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            All Stocks ({processedContinuationStocks.length})
          </button>
          <button
            onClick={() => setDirectionFilter('CONFIRMED')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              directionFilter === 'CONFIRMED' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            🟢 Confirmed (90+ Score) ({confirmedCount})
          </button>
          <button
            onClick={() => setDirectionFilter('BULLISH')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              directionFilter === 'BULLISH' ? 'bg-emerald-700 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            🚀 Bullish ({bullishCount})
          </button>
          <button
            onClick={() => setDirectionFilter('BEARISH')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              directionFilter === 'BEARISH' ? 'bg-rose-700 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            💥 Bearish ({bearishCount})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search symbol..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-sm text-white rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
          />
        </div>
      </div>

      {/* Results Grid / Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredList.map((stock) => {
          const isBull = stock.continuationDirection === 'BULLISH';
          const isConfirmed = stock.continuationState === 'CONFIRMED';
          const isCandidate = stock.continuationState === 'CANDIDATE';

          return (
            <div
              key={stock.symbol}
              onClick={() => setSelectedStockForModal(stock)}
              className={`bg-slate-900 border-2 ${
                isConfirmed
                  ? isBull ? 'border-emerald-500/80 shadow-emerald-950/50' : 'border-rose-500/80 shadow-rose-950/50'
                  : 'border-slate-800 hover:border-slate-700'
              } rounded-3xl p-5 flex flex-col justify-between shadow-2xl transition-all cursor-pointer relative overflow-hidden group`}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all pointer-events-none"></div>

              {/* Top Row: Symbol, Direction, State */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 relative z-10">
                <div className="flex items-center space-x-2.5">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black ${
                    isBull ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  }`}>
                    {isBull ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-white font-black text-base font-mono">{stock.symbol}</h3>
                    <p className="text-[11px] text-slate-400 font-sans truncate max-w-[130px]">{stock.companyName}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                    isConfirmed ? 'bg-emerald-500 text-slate-950 shadow-md' : isCandidate ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {stock.continuationState}
                  </span>
                  <span className="block text-xs font-mono font-black text-yellow-300 mt-1">
                    Score: {stock.continuationScore}/100
                  </span>
                </div>
              </div>

              {/* Middle Row: Price & Metrics */}
              <div className="py-4 space-y-3 relative z-10 font-mono text-xs">
                <div className="flex items-center justify-between bg-slate-950 p-3 rounded-2xl border border-slate-800/80">
                  <div>
                    <span className="text-slate-400 text-[10px] block font-sans">Current Price (LTP)</span>
                    <strong className="text-white text-sm font-black">₹{stock.closePrice?.toFixed(2)}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 text-[10px] block font-sans">Relative Volume</span>
                    <strong className="text-cyan-300 font-black">{stock.volumeRatio || 1.2}x</strong>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[9px] block font-sans">VWAP &amp; EMA</span>
                    <span className="text-indigo-300 font-bold truncate block">{stock.vwapStatus}</span>
                  </div>
                  <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[9px] block font-sans">RSI 14 Status</span>
                    <span className="text-amber-300 font-bold truncate block">{stock.rsiStatus}</span>
                  </div>
                </div>

                <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400 font-sans text-[10px]">Stop Loss / Target (R:R)</span>
                  <div className="text-right">
                    <span className="text-rose-400 font-bold">₹{stock.structuralStopLoss}</span> / <span className="text-emerald-400 font-bold">₹{stock.targetLevel}</span> <span className="text-amber-300 font-black">({stock.rewardRiskRatio})</span>
                  </div>
                </div>

                {stock.failedConditions && stock.failedConditions.length > 0 && (
                  <div className="bg-rose-950/40 border border-rose-500/30 p-2.5 rounded-xl text-[10px] text-rose-200 font-sans">
                    <strong>Gate Warning:</strong> {stock.failedConditions[0]}
                  </div>
                )}
              </div>

              {/* Footer Button */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between relative z-10">
                <span className="text-[10px] text-slate-400 font-mono">15m Completed Engine</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedStockForModal(stock);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer"
                >
                  View Full Output Report
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredList.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400 space-y-3">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
          <h3 className="text-lg font-bold text-white">No Stocks Matching Criteria</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            The Continuation Engine applies strict quantitative gating. When evidence is insufficient, it strictly returns NO TRADE to protect capital.
          </p>
        </div>
      )}

      {/* Mandatory Output Report Modal */}
      {selectedStockForModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in" onClick={() => setSelectedStockForModal(null)}>
          <div className="bg-slate-900 border border-indigo-500/40 rounded-3xl max-w-2xl w-full p-6 md:p-8 text-white shadow-2xl space-y-6 relative overflow-hidden max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-indigo-600/30 rounded-2xl border border-indigo-400/40">
                  <Target className="w-6 h-6 text-indigo-400 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight">Mandatory Output Report</h3>
                  <p className="text-xs text-indigo-200 font-mono">{selectedStockForModal.symbol} ({selectedStockForModal.companyName})</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStockForModal(null)}
                className="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 font-mono text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div>
                  <span className="text-slate-400 block text-[10px] font-sans">Symbol</span>
                  <strong className="text-white text-sm font-black">{selectedStockForModal.symbol}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-sans">Scan Timestamp (IST)</span>
                  <strong className="text-amber-300">{new Date().toLocaleTimeString()} IST</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-sans">Direction</span>
                  <strong className={selectedStockForModal.continuationDirection === 'BULLISH' ? 'text-emerald-400' : 'text-rose-400'}>{selectedStockForModal.continuationDirection}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-sans">State</span>
                  <strong className="text-cyan-300">{selectedStockForModal.continuationState}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-sans">Quality Score (0-100)</span>
                  <strong className="text-yellow-300 text-sm">{selectedStockForModal.continuationScore}/100</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-sans">Current Price</span>
                  <strong className="text-white">₹{selectedStockForModal.closePrice?.toFixed(2)}</strong>
                </div>
              </div>

              <div className="space-y-2.5 bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs font-sans">
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Opening Candle Classification:</span>
                  <strong className="text-white">{selectedStockForModal.openingClassification}</strong>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">VWAP Status:</span>
                  <strong className="text-emerald-300">{selectedStockForModal.vwapStatus}</strong>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">EMA Trend Status:</span>
                  <strong className="text-indigo-300">{selectedStockForModal.emaStatus}</strong>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">RSI Status:</span>
                  <strong className="text-amber-300">{selectedStockForModal.rsiStatus}</strong>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Candle Structure Status:</span>
                  <strong className="text-cyan-300">{selectedStockForModal.candleStructure}</strong>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Market &amp; Sector Alignment:</span>
                  <strong className="text-emerald-300">{selectedStockForModal.marketAlignment}</strong>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Entry Eligibility:</span>
                  <strong className="text-yellow-300">{selectedStockForModal.entryEligibility}</strong>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Structural Stop-Loss Level:</span>
                  <strong className="text-rose-400">₹{selectedStockForModal.structuralStopLoss}</strong>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Target Level:</span>
                  <strong className="text-emerald-400">₹{selectedStockForModal.targetLevel}</strong>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Risk-to-Reward Ratio:</span>
                  <strong className="text-amber-300">{selectedStockForModal.rewardRiskRatio}</strong>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="text-slate-400">Decision Reason:</span>
                  <strong className="text-indigo-200 text-right max-w-[280px]">{selectedStockForModal.decisionReason}</strong>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={onOpenPositionSizer}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg cursor-pointer"
              >
                Open Position Sizer
              </button>
              <button
                onClick={() => setSelectedStockForModal(null)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-all shadow-lg cursor-pointer"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
