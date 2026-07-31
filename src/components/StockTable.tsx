import React, { useState } from 'react';
import { Search, Filter, ExternalLink, RefreshCw, Eye, Edit3, TrendingUp, TrendingDown, Check, ArrowUpDown, ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { StockCalculated, DhanApiCredentials } from '../types';
import { calculateGann15Min } from '../utils/gann';

interface StockTableProps {
  stocks: StockCalculated[];
  onUpdateStockPrices: (stockId: string, openPrice: number, closePrice: number) => void;
  onFetchSingleStock: (stock: StockCalculated) => void;
  onSelectStockDetail: (stock: StockCalculated) => void;
  onEditStockManual: (stock: StockCalculated) => void;
  credentials: DhanApiCredentials;
}

export const StockTable: React.FC<StockTableProps> = ({
  stocks,
  onUpdateStockPrices,
  onFetchSingleStock,
  onSelectStockDetail,
  onEditStockManual,
  credentials
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [trendFilter, setTrendFilter] = useState<'ALL' | 'BULLISH' | 'BEARISH' | 'CALCULATED'>('ALL');
  const [lotMonth, setLotMonth] = useState<'Jun' | 'Jul' | 'Aug'>('Jun');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Sorting
  const [sortField, setSortField] = useState<'symbol' | 'openCalc' | 'closeCalc' | 'companyName'>('symbol');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Filter stocks
  const filteredStocks = stocks.filter((s) => {
    const matchesSearch =
      s.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.companyName.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (trendFilter === 'BULLISH') return s.trend === 'Bullish';
    if (trendFilter === 'BEARISH') return s.trend === 'Bearish';
    if (trendFilter === 'CALCULATED') return s.isFetched || s.openPrice !== undefined;

    return true;
  });

  // Sort stocks
  const sortedStocks = [...filteredStocks].sort((a, b) => {
    let aVal: any = a[sortField];
    let bVal: any = b[sortField];

    if (aVal === undefined || aVal === null) aVal = -999999;
    if (bVal === undefined || bVal === null) bVal = -999999;

    if (typeof aVal === 'string') {
      return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
  });

  // Pagination calculation
  const totalPages = Math.ceil(sortedStocks.length / itemsPerPage) || 1;
  const paginatedStocks = sortedStocks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const toggleSort = (field: 'symbol' | 'openCalc' | 'closeCalc' | 'companyName') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
      
      {/* Table Controls Bar */}
      <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search stock by symbol or company name (e.g. RELIANCE, ADANIENT)..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-white border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 outline-none font-medium placeholder-slate-400 transition-colors shadow-2xs"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Trend filter buttons */}
          <div className="flex items-center bg-slate-200/60 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => { setTrendFilter('ALL'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                trendFilter === 'ALL' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({stocks.length})
            </button>
            <button
              onClick={() => { setTrendFilter('CALCULATED'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                trendFilter === 'CALCULATED' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Calculated
            </button>
            <button
              onClick={() => { setTrendFilter('BULLISH'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                trendFilter === 'BULLISH' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bullish
            </button>
            <button
              onClick={() => { setTrendFilter('BEARISH'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                trendFilter === 'BEARISH' ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bearish
            </button>
          </div>

          {/* Lot month selector */}
          <div className="flex items-center bg-slate-200/60 p-1 rounded-xl border border-slate-200 text-xs">
            <span className="text-[10px] text-slate-600 px-1.5 font-medium flex items-center gap-1">
              <Layers className="w-3 h-3 text-blue-600" /> Lot:
            </span>
            {(['Jun', 'Jul', 'Aug'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setLotMonth(m)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  lotMonth === m ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {m} '26
              </button>
            ))}
          </div>

        </div>

      </div>

      {/* Main Stock Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100/80 text-slate-600 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4">
                <button
                  onClick={() => toggleSort('symbol')}
                  className="flex items-center gap-1 hover:text-slate-900 transition-colors"
                >
                  Symbol / Company <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-3 px-3 text-center">Lot Size ({lotMonth} '26)</th>
              <th className="py-3 px-3 text-right">15-Min Open (₹)</th>
              <th className="py-3 px-3 text-right">15-Min Close (₹)</th>
              <th className="py-3 px-3 text-right">
                <button
                  onClick={() => toggleSort('openCalc')}
                  className="flex items-center justify-end gap-1 hover:text-blue-800 transition-colors text-blue-700 font-bold"
                >
                  Open Calc <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-3 px-3 text-right">
                <button
                  onClick={() => toggleSort('closeCalc')}
                  className="flex items-center justify-end gap-1 hover:text-blue-800 transition-colors text-blue-700 font-bold"
                >
                  Close Calc <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-3 px-3 text-center">Trend / Signal</th>
              <th className="py-3 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {paginatedStocks.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-slate-400">
                  No stocks match the selected search or filter criteria.
                </td>
              </tr>
            ) : (
              paginatedStocks.map((stock) => {
                const lotSize =
                  lotMonth === 'Jun'
                    ? stock.lotSizeJun2026
                    : lotMonth === 'Jul'
                    ? stock.lotSizeJul2026
                    : stock.lotSizeAug2026;

                return (
                  <tr 
                    key={stock.id} 
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    {/* Symbol & Company */}
                    <td className="py-2.5 px-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          {stock.symbol}
                        </span>
                        <a
                          href={stock.screenerUrl}
                          target="_blank"
                          rel="noreferrer"
                          title="Open Screener page"
                          className="text-slate-400 hover:text-blue-600 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                        {stock.companyName}
                      </div>
                    </td>

                    {/* Lot Size */}
                    <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-600">
                      {lotSize ? lotSize.toLocaleString() : '-'}
                    </td>

                    {/* 15-Min Open Input */}
                    <td className="py-2.5 px-3 text-right">
                      <input
                        type="number"
                        step="0.05"
                        placeholder="0.00"
                        value={stock.openPrice !== undefined && stock.openPrice !== null ? stock.openPrice : ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          onUpdateStockPrices(stock.id, val, stock.closePrice || 0);
                        }}
                        className="w-24 bg-white border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 rounded px-2 py-1 text-right font-mono text-slate-900 text-xs outline-none shadow-2xs"
                      />
                    </td>

                    {/* 15-Min Close Input */}
                    <td className="py-2.5 px-3 text-right">
                      <input
                        type="number"
                        step="0.05"
                        placeholder="0.00"
                        value={stock.closePrice !== undefined && stock.closePrice !== null ? stock.closePrice : ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          onUpdateStockPrices(stock.id, stock.openPrice || 0, val);
                        }}
                        className="w-24 bg-white border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 rounded px-2 py-1 text-right font-mono text-slate-900 text-xs outline-none shadow-2xs"
                      />
                    </td>

                    {/* Open Calculation Output */}
                    <td className="py-2.5 px-3 text-right font-mono font-extrabold text-blue-700 text-sm bg-blue-50/50">
                      {stock.openCalc !== undefined && stock.openCalc !== null ? (
                        <span>{stock.openCalc.toFixed(4)}</span>
                      ) : (
                        <span className="text-slate-400 font-normal text-xs">-</span>
                      )}
                    </td>

                    {/* Close Calculation Output */}
                    <td className="py-2.5 px-3 text-right font-mono font-extrabold text-blue-700 text-sm bg-blue-50/50">
                      {stock.closeCalc !== undefined && stock.closeCalc !== null ? (
                        <span>{stock.closeCalc.toFixed(4)}</span>
                      ) : (
                        <span className="text-slate-400 font-normal text-xs">-</span>
                      )}
                    </td>

                    {/* Trend Indicator */}
                    <td className="py-2.5 px-3 text-center">
                      {stock.trend ? (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          stock.trend === 'Bullish'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : stock.trend === 'Bearish'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {stock.trend === 'Bullish' && <TrendingUp className="w-3 h-3" />}
                          {stock.trend === 'Bearish' && <TrendingDown className="w-3 h-3" />}
                          <span>{stock.trend}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        
                        {/* Dhan Fetch Single */}
                        {credentials.isConfigured && (
                          <button
                            onClick={() => onFetchSingleStock(stock)}
                            disabled={stock.isLoading}
                            title="Fetch live 15-min candle from Dhan API"
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${stock.isLoading ? 'animate-spin text-blue-600' : ''}`} />
                          </button>
                        )}

                        {/* View Breakdown */}
                        <button
                          onClick={() => onSelectStockDetail(stock)}
                          title="View Gann Targets & Breakdown"
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Manual Edit */}
                        <button
                          onClick={() => onEditStockManual(stock)}
                          title="Manual Price Entry Modal"
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
        <div>
          Showing {sortedStocks.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to{' '}
          {Math.min(currentPage * itemsPerPage, sortedStocks.length)} of {sortedStocks.length} F&O Stocks
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-40 shadow-2xs"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="font-mono text-slate-700 font-semibold">
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-40 shadow-2xs"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
};
