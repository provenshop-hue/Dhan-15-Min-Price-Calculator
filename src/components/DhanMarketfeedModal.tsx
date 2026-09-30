import React, { useState, useEffect } from 'react';
import { 
  X, RefreshCw, Activity, Layers, Table, Check, Copy, 
  ShieldCheck, AlertCircle, ArrowUpRight, ArrowDownRight, 
  Terminal, Sparkles, Database, ExternalLink 
} from 'lucide-react';
import { DhanApiCredentials, StockCalculated } from '../types';
import { getDhanSecurityId, isIndexSymbol } from '../data/dhanSecurityMap';

interface DhanMarketfeedModalProps {
  isOpen: boolean;
  onClose: () => void;
  credentials: DhanApiCredentials;
  stocks: StockCalculated[];
}

type FeedMode = 'ltp' | 'ohlc' | 'quote';

export const DhanMarketfeedModal: React.FC<DhanMarketfeedModalProps> = ({
  isOpen,
  onClose,
  credentials,
  stocks
}) => {
  const [selectedMode, setSelectedMode] = useState<FeedMode>('quote');
  const [selectedSymbol, setSelectedSymbol] = useState<string>('RELIANCE');
  const [customSecId, setCustomSecId] = useState<string>('');
  const [segment, setSegment] = useState<string>('NSE_EQ');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [feedResponse, setFeedResponse] = useState<any>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);

  // Auto-sync securityId when symbol changes
  useEffect(() => {
    if (selectedSymbol) {
      const isIdx = isIndexSymbol(selectedSymbol);
      if (isIdx) {
        setSegment('IDX_I');
      } else {
        setSegment('NSE_EQ');
      }
      const secId = getDhanSecurityId(selectedSymbol);
      if (secId) {
        setCustomSecId(secId);
      }
    }
  }, [selectedSymbol]);

  if (!isOpen) return null;

  const handleFetchFeed = async (modeToFetch: FeedMode = selectedMode) => {
    setIsLoading(true);
    setError(null);

    const isIdx = isIndexSymbol(selectedSymbol);
    const targetSegment = isIdx ? 'IDX_I' : segment;
    const secIdNum = Number(customSecId || getDhanSecurityId(selectedSymbol));

    if (!secIdNum || isNaN(secIdNum)) {
      setError('Please provide a valid Security ID or select a recognized stock.');
      setIsLoading(false);
      return;
    }

    try {
      const endpointMap = {
        ltp: '/api/marketfeed/ltp',
        ohlc: '/api/marketfeed/ohlc',
        quote: '/api/marketfeed/quote'
      };

      const payload = {
        [targetSegment]: [secIdNum]
      };

      const res = await fetch(endpointMap[modeToFetch], {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(credentials.clientId ? { 'client-id': credentials.clientId } : {}),
          ...(credentials.accessToken ? { 'access-token': credentials.accessToken } : {})
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || data.status === 'failure') {
        setError(data.error || data.remarks || `Dhan API returned status ${res.status}`);
        setFeedResponse(data);
      } else {
        setFeedResponse(data);
        setLastFetchedAt(new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }));
      }
    } catch (err: any) {
      setError(err.message || 'Network error communicating with Dhan Marketfeed API');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyJson = () => {
    if (!feedResponse) return;
    navigator.clipboard.writeText(JSON.stringify(feedResponse, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper to extract instrument data safely from response
  const secIdStr = String(customSecId || getDhanSecurityId(selectedSymbol) || '');
  const dataSeg = feedResponse?.data?.[segment] || feedResponse?.data?.['IDX_I'] || feedResponse?.data?.['NSE_EQ'];
  const instrumentData = dataSeg?.[secIdStr] || (dataSeg ? Object.values(dataSeg)[0] : null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 md:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base md:text-lg font-black text-white font-mono tracking-tight">
                  Dhan Marketfeed v2 Live Inspector
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Deterministic Live Feed
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Zero AI Hallucination • Unadulterated real-time ticker, OHLC &amp; market depth from Dhan HQ API
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 md:p-6 overflow-y-auto space-y-6">
          
          {/* Endpoint Mode Tabs */}
          <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-950 rounded-2xl border border-slate-800/80">
            <button
              onClick={() => {
                setSelectedMode('ltp');
                handleFetchFeed('ltp');
              }}
              className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                selectedMode === 'ltp'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>POST /marketfeed/ltp</span>
            </button>

            <button
              onClick={() => {
                setSelectedMode('ohlc');
                handleFetchFeed('ohlc');
              }}
              className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                selectedMode === 'ohlc'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>POST /marketfeed/ohlc</span>
            </button>

            <button
              onClick={() => {
                setSelectedMode('quote');
                handleFetchFeed('quote');
              }}
              className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                selectedMode === 'quote'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Table className="w-4 h-4" />
              <span>POST /marketfeed/quote</span>
            </button>
          </div>

          {/* Instrument Selector Toolbar */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <div className="flex-1 flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                  Select Preset Stock / Index
                </label>
                <select
                  value={selectedSymbol}
                  onChange={(e) => setSelectedSymbol(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-blue-500"
                >
                  <optgroup label="Spot Indices">
                    <option value="NIFTY">NIFTY 50 (IDX_I: 13)</option>
                    <option value="BANKNIFTY">BANKNIFTY (IDX_I: 25)</option>
                    <option value="FINNIFTY">FINNIFTY (IDX_I: 27)</option>
                  </optgroup>
                  <optgroup label="Major F&O Equities">
                    <option value="RELIANCE">RELIANCE (2885)</option>
                    <option value="HDFCBANK">HDFCBANK (1333)</option>
                    <option value="TCS">TCS (11536)</option>
                    <option value="INFY">INFY (1594)</option>
                    <option value="ICICIBANK">ICICIBANK (4963)</option>
                    <option value="SBIN">SBIN (3045)</option>
                    <option value="TATAMOTORS">TATAMOTORS (3456)</option>
                    <option value="BHARTIARTL">BHARTIARTL (10604)</option>
                  </optgroup>
                  {stocks.length > 0 && (
                    <optgroup label="Universe Equities">
                      {stocks.slice(0, 40).map(s => (
                        <option key={s.id} value={s.symbol}>
                          {s.symbol} ({getDhanSecurityId(s.symbol) || 'SecID'})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              <div className="w-full sm:w-36">
                <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                  Security ID
                </label>
                <input
                  type="text"
                  value={customSecId}
                  onChange={(e) => setCustomSecId(e.target.value.trim())}
                  placeholder="e.g. 1333"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="w-full sm:w-32">
                <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                  Segment
                </label>
                <select
                  value={segment}
                  onChange={(e) => setSegment(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="NSE_EQ">NSE_EQ</option>
                  <option value="IDX_I">IDX_I</option>
                  <option value="NSE_FNO">NSE_FNO</option>
                  <option value="BSE_EQ">BSE_EQ</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => handleFetchFeed()}
              disabled={isLoading}
              className="mt-2 md:mt-5 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center space-x-2 transition-all cursor-pointer shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Querying Dhan...' : 'Fetch Live Data'}</span>
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start space-x-3 text-rose-400 text-xs">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold font-mono">Dhan Marketfeed API Notice</div>
                <div className="mt-0.5 text-rose-300/90">{error}</div>
                {!credentials.isConfigured && (
                  <div className="mt-2 text-slate-400 text-[11px]">
                    Tip: Ensure Dhan Client ID and 24-hour Access Token are saved in Dhan Settings.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Formatted View of Deterministic Data */}
          {instrumentData && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-black text-white font-mono">
                    {selectedSymbol}
                  </span>
                  <span className="text-xs font-mono text-slate-500">
                    SecID: {secIdStr} • {segment}
                  </span>
                </div>
                {lastFetchedAt && (
                  <span className="text-[11px] font-mono text-slate-400">
                    IST: {lastFetchedAt}
                  </span>
                )}
              </div>

              {/* Primary Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-900/90 border border-slate-800/80 p-3 rounded-xl">
                  <div className="text-[10px] font-mono uppercase text-slate-400">Last Traded Price (LTP)</div>
                  <div className="text-xl font-black font-mono text-emerald-400 mt-1">
                    ₹{Number(instrumentData.last_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                {instrumentData.net_change !== undefined && (
                  <div className="bg-slate-900/90 border border-slate-800/80 p-3 rounded-xl">
                    <div className="text-[10px] font-mono uppercase text-slate-400">Net Change</div>
                    <div className={`text-lg font-black font-mono mt-1 ${instrumentData.net_change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {instrumentData.net_change >= 0 ? '+' : ''}{Number(instrumentData.net_change).toFixed(2)}
                    </div>
                  </div>
                )}

                {instrumentData.volume !== undefined && (
                  <div className="bg-slate-900/90 border border-slate-800/80 p-3 rounded-xl">
                    <div className="text-[10px] font-mono uppercase text-slate-400">Total Volume</div>
                    <div className="text-lg font-black font-mono text-white mt-1">
                      {Number(instrumentData.volume || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                )}

                {instrumentData.average_price !== undefined && (
                  <div className="bg-slate-900/90 border border-slate-800/80 p-3 rounded-xl">
                    <div className="text-[10px] font-mono uppercase text-slate-400">Average Price</div>
                    <div className="text-lg font-black font-mono text-blue-400 mt-1">
                      ₹{Number(instrumentData.average_price || 0).toFixed(2)}
                    </div>
                  </div>
                )}
              </div>

              {/* OHLC Bar */}
              {instrumentData.ohlc && (
                <div className="bg-slate-900/60 border border-slate-800/80 p-3 rounded-xl">
                  <div className="text-[10px] font-mono uppercase text-slate-400 mb-2">Dhan Session OHLC</div>
                  <div className="grid grid-cols-4 gap-2 text-xs font-mono">
                    <div>
                      <span className="text-slate-500">Open:</span>{' '}
                      <strong className="text-white">₹{Number(instrumentData.ohlc.open || 0).toFixed(2)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">High:</span>{' '}
                      <strong className="text-emerald-400">₹{Number(instrumentData.ohlc.high || 0).toFixed(2)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Low:</span>{' '}
                      <strong className="text-rose-400">₹{Number(instrumentData.ohlc.low || 0).toFixed(2)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Prev Close:</span>{' '}
                      <strong className="text-slate-300">₹{Number(instrumentData.ohlc.close || 0).toFixed(2)}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Market Depth 5-Level Order Book (Quote Mode) */}
              {instrumentData.depth && (
                <div className="space-y-2">
                  <div className="text-[11px] font-mono uppercase text-slate-400 flex items-center justify-between">
                    <span>5-Level Market Depth (Real-Time Order Book)</span>
                    <span className="text-slate-500">Live Bid/Ask from Dhan</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
                    {/* Bids */}
                    <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-3">
                      <div className="text-[10px] font-bold text-emerald-400 mb-2 border-b border-emerald-500/20 pb-1 flex justify-between">
                        <span>BUY ORDERS (BIDS)</span>
                        <span>QTY @ PRICE</span>
                      </div>
                      <div className="space-y-1">
                        {instrumentData.depth.buy?.map((b: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center text-[11px]">
                            <span className="text-slate-400">{b.orders} ord</span>
                            <span className="text-slate-200">{Number(b.quantity || 0).toLocaleString()}</span>
                            <span className="text-emerald-400 font-bold">₹{Number(b.price || 0).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Asks */}
                    <div className="bg-rose-950/20 border border-rose-500/20 rounded-xl p-3">
                      <div className="text-[10px] font-bold text-rose-400 mb-2 border-b border-rose-500/20 pb-1 flex justify-between">
                        <span>SELL ORDERS (ASKS)</span>
                        <span>PRICE @ QTY</span>
                      </div>
                      <div className="space-y-1">
                        {instrumentData.depth.sell?.map((s: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center text-[11px]">
                            <span className="text-rose-400 font-bold">₹{Number(s.price || 0).toFixed(2)}</span>
                            <span className="text-slate-200">{Number(s.quantity || 0).toLocaleString()}</span>
                            <span className="text-slate-400">{s.orders} ord</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 52-Week Range & Circuit Limits */}
              {(instrumentData['52_week_high'] || instrumentData.upper_circuit_limit) && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
                  {instrumentData['52_week_high'] !== undefined && (
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase">52W High</div>
                      <div className="font-bold text-slate-300">₹{Number(instrumentData['52_week_high']).toFixed(2)}</div>
                    </div>
                  )}
                  {instrumentData['52_week_low'] !== undefined && (
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase">52W Low</div>
                      <div className="font-bold text-slate-300">₹{Number(instrumentData['52_week_low']).toFixed(2)}</div>
                    </div>
                  )}
                  {instrumentData.lower_circuit_limit !== undefined && (
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase">Lower Circuit</div>
                      <div className="font-bold text-rose-400">₹{Number(instrumentData.lower_circuit_limit).toFixed(2)}</div>
                    </div>
                  )}
                  {instrumentData.upper_circuit_limit !== undefined && (
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase">Upper Circuit</div>
                      <div className="font-bold text-emerald-400">₹{Number(instrumentData.upper_circuit_limit).toFixed(2)}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Raw JSON Payload Terminal */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center space-x-2 text-slate-400">
                <Terminal className="w-3.5 h-3.5 text-blue-400" />
                <span>Deterministic Dhan API Response (Raw Payload)</span>
              </div>
              {feedResponse && (
                <button
                  onClick={handleCopyJson}
                  className="flex items-center space-x-1 text-slate-400 hover:text-white px-2 py-0.5 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                </button>
              )}
            </div>
            <pre className="p-4 text-[11px] font-mono text-emerald-400/90 overflow-x-auto max-h-64 leading-relaxed">
              {feedResponse 
                ? JSON.stringify(feedResponse, null, 2) 
                : '// Click "Fetch Live Data" to query live Dhan HQ API.\n// Exact deterministic response from Dhan will appear here with zero artificial modification.'}
            </pre>
          </div>

          {/* API Endpoints Reference Box */}
          <div className="p-3.5 bg-slate-950/40 rounded-xl border border-slate-800/80 text-[11px] font-mono text-slate-400 space-y-1">
            <div className="text-slate-300 font-bold mb-1">Available Deterministic Marketfeed Endpoints:</div>
            <div>• <strong className="text-blue-400">POST /marketfeed/ltp</strong> — Get ticker data of instruments</div>
            <div>• <strong className="text-blue-400">POST /marketfeed/ohlc</strong> — Get OHLC data of instruments</div>
            <div>• <strong className="text-blue-400">POST /marketfeed/quote</strong> — Get market depth data of instruments</div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs font-mono text-slate-500 shrink-0">
          <div className="flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Pure Dhan HQ API v2 Proxy • Zero AI Hallucination</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
