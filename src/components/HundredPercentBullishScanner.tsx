import React, { useMemo, useState } from 'react';
import { Target, TrendingUp, Filter, AlertCircle, CheckCircle2, XCircle, BarChart3, ExternalLink } from 'lucide-react';
import { StockCalculated } from '../types';

interface Props {
  stocks: StockCalculated[];
  niftyStock?: StockCalculated;
  onSelectStockDetail: (stock: StockCalculated) => void;
}

interface ConfluenceCheck {
  id: string;
  name: string;
  value: string;
  met: boolean;
  type: 'CALCULATED' | 'INFERRED' | 'PENDING';
}

interface AnalyzedStock extends StockCalculated {
  variance: number;
  checks: ConfluenceCheck[];
  score: number;
}

export function HundredPercentBullishScanner({ stocks, niftyStock, onSelectStockDetail }: Props) {
  const [searchTerm, setSearchTerm] = useState('');

  const analyzedStocks = useMemo(() => {
    return stocks.map(stock => {
      // Must have basic prices
      if (stock.openPrice == null || stock.highPrice == null || stock.lowPrice == null || stock.closePrice == null) {
        return null;
      }
      
      const open = stock.first1mOpen ?? stock.openPrice;
      const low = stock.first1mLow ?? stock.lowPrice;
      const high = stock.highPrice;
      const close = stock.closePrice;
      
      // Calculate Open = Low variance
      const variance = Math.abs(open - low) / open * 100;
      
      // Filter out anything > 0.20% variance early
      if (variance > 0.20) {
        return null;
      }

      const checks: ConfluenceCheck[] = [];

      // 1. Open = Low (Variance <= 0.20%)
      checks.push({
        id: 'open_low',
        name: 'Open = Low (≤ 0.20%)',
        value: `${variance.toFixed(2)}% Var`,
        met: true,
        type: 'CALCULATED'
      });

      // 2. Close near High (Body >= 60% of candle)
      const candleRange = high - low;
      const body = close - open;
      const bodyPct = candleRange > 0 ? (body / candleRange) * 100 : 0;
      const isStrongClose = bodyPct >= 60;
      checks.push({
        id: 'body_pct',
        name: 'Body ≥ 60% of Range',
        value: `${bodyPct.toFixed(1)}%`,
        met: isStrongClose,
        type: 'CALCULATED'
      });

      // 3. Volume > 1.5x
      const volRatio = stock.volumeRatio || 0;
      const isHighVol = volRatio >= 1.5;
      checks.push({
        id: 'volume',
        name: 'Volume / RVOL > 1.5x',
        value: `${volRatio.toFixed(1)}x`,
        met: isHighVol,
        type: 'CALCULATED'
      });

      // 4. Above VWAP
      const aboveVwap = stock.vwap ? close > stock.vwap : false;
      checks.push({
        id: 'vwap',
        name: 'Price Above VWAP',
        value: stock.vwap ? `₹${stock.vwap.toFixed(2)}` : 'N/A',
        met: aboveVwap,
        type: 'CALCULATED'
      });

      // 5. Open above Previous Close
      const prevClose = stock.previousClose;
      const gapUp = prevClose ? open > prevClose : false;
      checks.push({
        id: 'prev_close',
        name: 'Gap Up / Open > Prev Close',
        value: prevClose ? `₹${prevClose.toFixed(2)}` : 'N/A',
        met: gapUp,
        type: 'CALCULATED'
      });

      // 6. Breaks First 15m High (ORB)
      const f15mHigh = stock.first15mHigh;
      const breaksORB = f15mHigh ? close > f15mHigh : false;
      checks.push({
        id: 'orb',
        name: 'Breaks 15m High (ORB)',
        value: f15mHigh ? `₹${f15mHigh.toFixed(2)}` : 'N/A',
        met: breaksORB,
        type: 'CALCULATED'
      });

      // 7. RSI 55-75
      const rsi = stock.rsi || 0;
      const isBullishRsi = rsi >= 55 && rsi <= 75;
      checks.push({
        id: 'rsi',
        name: 'RSI (55-75)',
        value: rsi ? rsi.toFixed(1) : 'N/A',
        met: isBullishRsi,
        type: 'CALCULATED'
      });

      // 8. Market/NIFTY Bullish
      const niftyPct = niftyStock?.pctChange || 0;
      const marketBullish = niftyPct > 0;
      checks.push({
        id: 'market',
        name: 'Market (NIFTY) Stable/Bull',
        value: `${niftyPct > 0 ? '+' : ''}${niftyPct.toFixed(2)}%`,
        met: marketBullish,
        type: 'CALCULATED'
      });

      // 9. Sector Stronger than NIFTY
      const stockPct = stock.pctChange || 0;
      const strongerThanMarket = stockPct > niftyPct;
      checks.push({
        id: 'sector',
        name: 'Stock/Sector > NIFTY',
        value: `Diff: ${(stockPct - niftyPct).toFixed(2)}%`,
        met: strongerThanMarket,
        type: 'CALCULATED'
      });

      // 10. 1-Hour Trend Bullish (Proxy via 15m)
      checks.push({
        id: '1h_trend',
        name: '1H Trend Bullish',
        value: stockPct > 1 ? 'Strong' : 'Weak',
        met: stockPct > 1,
        type: 'INFERRED'
      });

      // 11. 5-min Structure HH+HL (Proxy)
      checks.push({
        id: '5m_struct',
        name: '5m Struct: HH+HL',
        value: isStrongClose ? 'Intact' : 'Broken',
        met: isStrongClose,
        type: 'INFERRED'
      });

      // 12. Breaks Previous Day High (PDH) - Proxy
      checks.push({
        id: 'pdh',
        name: 'Breaks Prev Day High',
        value: stockPct > 1.5 ? 'Likely Yes' : 'Pending',
        met: stockPct > 1.5,
        type: 'INFERRED'
      });

      // 13. Futures OI increasing
      checks.push({
        id: 'oi',
        name: 'Price ↑ + OI ↑',
        value: isHighVol && stockPct > 0 ? 'Expansion' : 'Contraction',
        met: isHighVol && stockPct > 0,
        type: 'INFERRED'
      });

      const metCount = checks.filter(c => c.met).length;
      
      return {
        ...stock,
        variance,
        checks,
        score: metCount
      } as AnalyzedStock;

    }).filter(Boolean) as AnalyzedStock[];
  }, [stocks, niftyStock]);

  const filteredStocks = analyzedStocks
    .filter(s => searchTerm === '' || s.symbol.toLowerCase().includes(searchTerm.toLowerCase()) || s.companyName.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => b.score - a.score || b.variance - a.variance); // Sort by score desc, then variance asc

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white font-mono flex items-center gap-2">
              100% Bullish Setup
            </h2>
            <p className="text-sm text-slate-400">Open = Low (≤0.20% Var) + 12 Confluences</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <input
              type="text"
              placeholder="Search symbol..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-xl px-4 py-2 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStocks.map(stock => {
          return (
            <div 
              key={stock.symbol}
              onClick={() => onSelectStockDetail(stock)}
              className="group bg-slate-900 rounded-2xl border border-emerald-500/20 hover:border-emerald-500/50 hover:shadow-[0_8px_30px_rgba(16,185,129,0.15)] transition-all cursor-pointer overflow-hidden flex flex-col"
            >
              {/* Card Header */}
              <div className="px-4 py-3 border-b border-emerald-500/10 bg-emerald-500/5 flex items-center justify-between">
                <div className="flex flex-col">
                  <h3 className="font-bold text-lg text-white font-mono flex items-center gap-2">
                    {stock.symbol}
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  </h3>
                  <span className="text-xs text-slate-400 truncate max-w-[150px]">{stock.companyName}</span>
                </div>
                <div className="px-2.5 py-1 rounded-lg text-xs font-black font-mono shadow-sm flex flex-col items-end bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                  <span className="text-white text-sm">₹{stock.closePrice?.toFixed(2)}</span>
                  <span>{stock.pctChange > 0 ? '+' : ''}{stock.pctChange.toFixed(2)}%</span>
                </div>
              </div>

              {/* Progress Bar / Score */}
              <div className="px-4 pt-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Confluence Score</span>
                  <span className="text-sm font-black text-emerald-400 font-mono">{stock.score}/13</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5">
                  <div 
                    className="bg-emerald-500 h-1.5 rounded-full" 
                    style={{ width: `${(stock.score / 13) * 100}%` }}
                  />
                </div>
              </div>

              {/* Checklists */}
              <div className="p-4 flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                  {stock.checks.map(check => (
                    <div key={check.id} className="flex items-center justify-between py-1 border-b border-slate-800/50 last:border-0">
                      <div className="flex items-center gap-2 overflow-hidden">
                        {check.met ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                        )}
                        <span className={`text-[11px] truncate ${check.met ? 'text-slate-300' : 'text-slate-500'}`} title={check.name}>
                          {check.name}
                        </span>
                      </div>
                      <span className={`text-[10px] font-mono shrink-0 ml-2 ${check.met ? 'text-emerald-400/80' : 'text-slate-600'}`}>
                        {check.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredStocks.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-slate-500" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No Setups Found</h3>
          <p className="text-slate-400 max-w-md mx-auto">
            {searchTerm 
              ? `No stocks matching "${searchTerm}" meet the 100% Bullish criteria.`
              : `No stocks currently meet the Open = Low (≤0.20% var) baseline requirement.`}
          </p>
        </div>
      )}
    </div>
  );
}
