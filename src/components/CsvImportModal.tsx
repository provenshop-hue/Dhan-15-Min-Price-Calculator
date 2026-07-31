import React, { useState } from 'react';
import { X, Upload, FileSpreadsheet, Check, RotateCcw } from 'lucide-react';
import { parseCSVToStocks, RAW_NIFTY_FUTURES_CSV, StockItem } from '../data/stocks';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportStocks: (stocks: StockItem[]) => void;
  onResetToDefault: () => void;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
  onImportStocks,
  onResetToDefault
}) => {
  const [csvContent, setCsvContent] = useState(RAW_NIFTY_FUTURES_CSV);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        setCsvContent(text);
        setError(null);
      }
    };
    reader.readAsText(file);
  };

  const handleParseAndApply = () => {
    try {
      const parsed = parseCSVToStocks(csvContent);
      if (parsed.length === 0) {
        setError('No valid stock rows found in the CSV. Please check formatting.');
        return;
      }
      onImportStocks(parsed);
      onClose();
    } catch (err: any) {
      setError('Failed to parse CSV: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 shadow-xl text-slate-800 relative">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-50 rounded-xl border border-blue-200/60 text-blue-600">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Stock List CSV Manager</h3>
              <p className="text-xs text-slate-500">Upload custom CSV or inspect default Nifty F&O stock list</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="mt-4 space-y-4">
          
          {/* File input button */}
          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <div className="text-xs font-semibold text-slate-800">Upload CSV File</div>
              <div className="text-[11px] text-slate-500">Supported headers: Company, Symbol, Open, Close, Volume, Lot Sizes</div>
            </div>
            <label className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-2xs">
              <Upload className="w-3.5 h-3.5" />
              <span>Choose CSV</span>
              <input 
                type="file" 
                accept=".csv,.txt" 
                onChange={handleFileUpload} 
                className="hidden" 
              />
            </label>
          </div>

          {/* Raw Text Box */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              CSV Content Preview / Editor
            </label>
            <textarea
              rows={8}
              value={csvContent}
              onChange={(e) => {
                setCsvContent(e.target.value);
                setError(null);
              }}
              className="w-full bg-white border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 rounded-xl p-3 text-xs text-slate-800 font-mono outline-none resize-none shadow-2xs"
            />
          </div>

          {error && (
            <div className="text-xs text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
              {error}
            </div>
          )}

        </div>

        {/* Modal Actions */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              onResetToDefault();
              setCsvContent(RAW_NIFTY_FUTURES_CSV);
              onClose();
            }}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium border border-slate-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
            <span>Reset to Default F&O List</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleParseAndApply}
              className="flex items-center space-x-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>Import & Replace</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
