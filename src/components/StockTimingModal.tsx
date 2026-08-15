import React from 'react';
import { X, Clock, ExternalLink } from 'lucide-react';
import { StockCalculated, StockTradeJourney } from '../types';
import { StockTimingHistoryAnalysis } from './StockTimingHistoryAnalysis';

interface StockTimingModalProps {
  stock: StockCalculated | null;
  tradeJourney?: StockTradeJourney | null;
  onClose: () => void;
}

export const StockTimingModal: React.FC<StockTimingModalProps> = ({
  stock,
  tradeJourney,
  onClose
}) => {
  if (!stock) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl text-slate-100 relative max-h-[92vh] overflow-y-auto">
        
        {/* Top Bar */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-extrabold text-white font-mono">{stock.symbol}</span>
              <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded font-mono">
                CMP: ₹{(stock.closePrice || stock.openPrice || 0).toFixed(2)}
              </span>
              <a
                href={stock.screenerUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-400 hover:underline flex items-center gap-1 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800 font-medium"
              >
                ScanX <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <h3 className="text-xs text-slate-400 font-medium mt-0.5">{stock.companyName}</h3>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Timing Analysis Component */}
        <div className="mt-4">
          <StockTimingHistoryAnalysis stock={stock} tradeJourney={tradeJourney} />
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Close Analysis
          </button>
        </div>

      </div>
    </div>
  );
};
