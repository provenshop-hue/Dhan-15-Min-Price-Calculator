import React, { useMemo, useState } from 'react';
import { StockCalculated } from '../types';
import { computeAllSectorStrengths, SectorMetric, getStockSector } from '../utils/sectorMaster';
import { TrendingUp, TrendingDown, Flame, Layers, ChevronRight, Zap } from 'lucide-react';

interface SectorDominanceBadgesBarProps {
  stocks: StockCalculated[];
  onSelectStock?: (stock: StockCalculated) => void;
  onFilterBySector?: (sectorKey: string) => void;
  selectedSectorKey?: string;
  title?: string;
}

export const SectorDominanceBadgesBar: React.FC<SectorDominanceBadgesBarProps> = ({
  stocks,
  onSelectStock,
  onFilterBySector,
  selectedSectorKey,
  title = "Sector Dominance & Stock Badges"
}) => {
  const [expandedSectorKey, setExpandedSectorKey] = useState<string | null>(null);

  const sectorMetricsMap = useMemo(() => computeAllSectorStrengths(stocks), [stocks]);

  // Group stocks by sector key
  const stocksBySector = useMemo(() => {
    const map = new Map<string, StockCalculated[]>();
    (stocks || []).forEach(s => {
      const sec = getStockSector(s.symbol);
      if (!map.has(sec.sectorKey)) {
        map.set(sec.sectorKey, []);
      }
      map.get(sec.sectorKey)!.push(s);
    });
    return map;
  }, [stocks]);

  const { bullishSectors, bearishSectors } = useMemo(() => {
    const all = Array.from(sectorMetricsMap.values()) as SectorMetric[];
    const bullish = all
      .filter(s => s.avgPctChange >= 0.05 || s.bullishBreadthPct >= 50)
      .sort((a, b) => b.avgPctChange - a.avgPctChange);
    const bearish = all
      .filter(s => s.avgPctChange <= -0.05 || s.bullishBreadthPct < 50)
      .sort((a, b) => a.avgPctChange - b.avgPctChange);
    return { bullishSectors: bullish, bearishSectors: bearish };
  }, [sectorMetricsMap]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white shadow-lg space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded-lg">
            <Layers className="w-4 h-4" />
          </div>
          <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-200">
            {title}
          </h3>
        </div>
        <div className="flex items-center space-x-3 text-[11px] font-mono">
          <span className="flex items-center gap-1 text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
            <TrendingUp className="w-3 h-3" />
            <span>{bullishSectors.length} Bullish Sectors</span>
          </span>
          <span className="flex items-center gap-1 text-rose-400 bg-rose-950/60 border border-rose-500/30 px-2.5 py-0.5 rounded-full">
            <TrendingDown className="w-3 h-3" />
            <span>{bearishSectors.length} Bearish Sectors</span>
          </span>
        </div>
      </div>

      {/* Grid of Sector Badges: Bullish & Bearish */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* BULLISH SECTORS COLUMN */}
        <div className="space-y-2">
          <div className="text-[11px] font-mono font-bold text-emerald-400 uppercase flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>🟢 Dominant Bullish Sectors &amp; Stocks</span>
          </div>
          
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {bullishSectors.length > 0 ? (
              bullishSectors.map(sec => {
                const sectorStocks = stocksBySector.get(sec.sectorKey) || [];
                const isExpanded = expandedSectorKey === sec.sectorKey;
                const isSelected = selectedSectorKey === sec.sectorKey;

                return (
                  <div 
                    key={sec.sectorKey}
                    className={`p-2.5 rounded-xl border transition-all ${
                      isSelected 
                        ? 'bg-emerald-950/80 border-emerald-500 ring-1 ring-emerald-400' 
                        : 'bg-slate-800/80 border-slate-700/80 hover:border-emerald-500/50'
                    }`}
                  >
                    <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedSectorKey(isExpanded ? null : sec.sectorKey)}>
                      <div className="flex items-center space-x-2">
                        <span className="text-base">{sec.categoryIcon}</span>
                        <div>
                          <span className="font-bold text-xs text-white flex items-center gap-1.5">
                            <span>{sec.sectorName}</span>
                            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-1.5 py-0.2 rounded border border-emerald-500/30">
                              +{sec.avgPctChange.toFixed(2)}%
                            </span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {sec.bullishBreadthPct}% Breadth &bull; {sectorStocks.length} Stocks active
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {onFilterBySector && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onFilterBySector(sec.sectorKey);
                            }}
                            className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold cursor-pointer"
                          >
                            Filter
                          </button>
                        )}
                        <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </div>
                    </div>

                    {/* Expanded Stock Chips */}
                    {isExpanded && (
                      <div className="mt-2.5 pt-2.5 border-t border-slate-700/80 flex flex-wrap gap-1.5">
                        {sectorStocks.length > 0 ? (
                          sectorStocks.map(stk => {
                            const pct = stk.pctChange || 0;
                            return (
                              <button
                                key={stk.symbol}
                                onClick={() => onSelectStock?.(stk)}
                                className={`px-2 py-1 rounded-lg text-[11px] font-mono font-bold flex items-center space-x-1 transition-colors cursor-pointer ${
                                  pct >= 0 
                                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-900' 
                                    : 'bg-slate-900 text-slate-300 border border-slate-700 hover:bg-slate-800'
                                }`}
                              >
                                <span>{stk.symbol}</span>
                                <span className={pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                  {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
                                </span>
                              </button>
                            );
                          })
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">No stocks loaded in this sector yet.</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-center text-xs text-slate-400 bg-slate-800/40 rounded-xl">
                No dominant bullish sectors currently.
              </div>
            )}
          </div>
        </div>

        {/* BEARISH SECTORS COLUMN */}
        <div className="space-y-2">
          <div className="text-[11px] font-mono font-bold text-rose-400 uppercase flex items-center gap-1.5">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>🔴 Dominant Bearish Sectors &amp; Stocks</span>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {bearishSectors.length > 0 ? (
              bearishSectors.map(sec => {
                const sectorStocks = stocksBySector.get(sec.sectorKey) || [];
                const isExpanded = expandedSectorKey === sec.sectorKey;
                const isSelected = selectedSectorKey === sec.sectorKey;

                return (
                  <div 
                    key={sec.sectorKey}
                    className={`p-2.5 rounded-xl border transition-all ${
                      isSelected 
                        ? 'bg-rose-950/80 border-rose-500 ring-1 ring-rose-400' 
                        : 'bg-slate-800/80 border-slate-700/80 hover:border-rose-500/50'
                    }`}
                  >
                    <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedSectorKey(isExpanded ? null : sec.sectorKey)}>
                      <div className="flex items-center space-x-2">
                        <span className="text-base">{sec.categoryIcon}</span>
                        <div>
                          <span className="font-bold text-xs text-white flex items-center gap-1.5">
                            <span>{sec.sectorName}</span>
                            <span className="text-[10px] font-mono text-rose-400 bg-rose-950 px-1.5 py-0.2 rounded border border-rose-500/30">
                              {sec.avgPctChange.toFixed(2)}%
                            </span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {sec.bullishBreadthPct}% Breadth &bull; {sectorStocks.length} Stocks active
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {onFilterBySector && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onFilterBySector(sec.sectorKey);
                            }}
                            className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold cursor-pointer"
                          >
                            Filter
                          </button>
                        )}
                        <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </div>
                    </div>

                    {/* Expanded Stock Chips */}
                    {isExpanded && (
                      <div className="mt-2.5 pt-2.5 border-t border-slate-700/80 flex flex-wrap gap-1.5">
                        {sectorStocks.length > 0 ? (
                          sectorStocks.map(stk => {
                            const pct = stk.pctChange || 0;
                            return (
                              <button
                                key={stk.symbol}
                                onClick={() => onSelectStock?.(stk)}
                                className={`px-2 py-1 rounded-lg text-[11px] font-mono font-bold flex items-center space-x-1 transition-colors cursor-pointer ${
                                  pct < 0 
                                    ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40 hover:bg-rose-900' 
                                    : 'bg-slate-900 text-slate-300 border border-slate-700 hover:bg-slate-800'
                                }`}
                              >
                                <span>{stk.symbol}</span>
                                <span className={pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                  {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
                                </span>
                              </button>
                            );
                          })
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">No stocks loaded in this sector yet.</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-center text-xs text-slate-400 bg-slate-800/40 rounded-xl">
                No dominant bearish sectors currently.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
