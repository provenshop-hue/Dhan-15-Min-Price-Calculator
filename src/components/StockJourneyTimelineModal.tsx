import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  UserTrackedTrade, 
  StockJourneyTimelineConfig, 
  StockJourneyData,
  StockCalculated,
  TrackedJourneyStockItem,
  InstrumentType
} from '../types';
import { 
  generateStock5MinJourney, 
  getStoredJourneyStocks,
  saveStoredJourneyStocks,
  createJourneyStockFromTrade,
  createStandaloneJourneyStock,
  convertJourneyItemToTrade,
  saveStoredJourneyConfig,
  deleteStoredJourneyConfig
} from '../utils/capitalJourneyAdvisor';
import { INITIAL_STOCKS } from '../data/stocks';
import { roundToExactNseStrike, getExactNseStrikeStep } from '../utils/nseStrikeMaster';
import { 
  Clock, 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  Volume2, 
  VolumeX, 
  Bot, 
  Heart, 
  Activity, 
  BarChart2, 
  Shield, 
  Target, 
  Layers, 
  Sparkles, 
  X, 
  Check, 
  Table, 
  Sliders, 
  Zap,
  Plus,
  Trash2,
  TrendingUp,
  Search,
  CheckCircle2,
  ArrowRight,
  LayoutGrid
} from 'lucide-react';

interface StockJourneyTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTrade?: UserTrackedTrade | null;
  openTrades?: UserTrackedTrade[];
  stockMap?: Map<string, StockCalculated>;
  onSpeakText?: (text: string) => void;
  isSpeaking?: boolean;
}

export const StockJourneyTimelineModal: React.FC<StockJourneyTimelineModalProps> = ({
  isOpen,
  onClose,
  initialTrade,
  openTrades = [],
  stockMap = new Map(),
  onSpeakText,
  isSpeaking = false
}) => {
  if (!isOpen) return null;

  // Tracked multi-stock journey items
  const [journeyStocks, setJourneyStocks] = useState<TrackedJourneyStockItem[]>(() => {
    const loaded = getStoredJourneyStocks(openTrades);
    // If initialTrade was explicitly passed and isn't in loaded, ensure it is added
    if (initialTrade) {
      const exists = loaded.some(s => s.tradeId === initialTrade.id || (s.symbol === initialTrade.symbol && s.instrumentType === initialTrade.instrumentType));
      if (!exists) {
        const fromTrade = createJourneyStockFromTrade(initialTrade);
        const updated = [fromTrade, ...loaded];
        saveStoredJourneyStocks(updated);
        return updated;
      }
    }
    return loaded;
  });

  // Selected active stock ID
  const [activeStockId, setActiveStockId] = useState<string>(() => {
    if (initialTrade) {
      const match = journeyStocks.find(s => s.tradeId === initialTrade.id || s.symbol === initialTrade.symbol);
      if (match) return match.id;
    }
    return journeyStocks[0]?.id || '';
  });

  // Update active stock if initialTrade changes
  useEffect(() => {
    if (initialTrade) {
      setJourneyStocks(prev => {
        const exists = prev.find(s => s.tradeId === initialTrade.id || (s.symbol === initialTrade.symbol && s.instrumentType === initialTrade.instrumentType));
        if (!exists) {
          const fromTrade = createJourneyStockFromTrade(initialTrade);
          const updated = [fromTrade, ...prev];
          saveStoredJourneyStocks(updated);
          setActiveStockId(fromTrade.id);
          return updated;
        } else {
          setActiveStockId(exists.id);
          return prev;
        }
      });
    }
  }, [initialTrade]);

  // Current active journey item
  const currentStockItem = useMemo(() => {
    return journeyStocks.find(s => s.id === activeStockId) || journeyStocks[0] || null;
  }, [journeyStocks, activeStockId]);

  // Simulation & View state for current active stock
  const [activeStepIndex, setActiveStepIndex] = useState<number>(() => currentStockItem?.config.lastSimulatedStepIndex || 0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'interactive' | 'table' | 'matrix'>('interactive');
  const [startTimeInput, setStartTimeInput] = useState<string>(currentStockItem?.config.timelineStartTime || '09:15');

  // "Add Stock to Journey" Drawer / Modal state
  const [isAddStockOpen, setIsAddStockOpen] = useState<boolean>(false);
  const [addSymbol, setAddSymbol] = useState<string>('');
  const [addInstrument, setAddInstrument] = useState<InstrumentType>('EQUITY');
  const [addStrikePrice, setAddStrikePrice] = useState<string>('');
  const [addEntryPrice, setAddEntryPrice] = useState<string>('');
  const [addQuantity, setAddQuantity] = useState<string>('50');
  const [addStartTime, setAddStartTime] = useState<string>('09:15');

  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync state whenever active stock item switches
  useEffect(() => {
    if (currentStockItem) {
      setActiveStepIndex(currentStockItem.config.lastSimulatedStepIndex || 0);
      setStartTimeInput(currentStockItem.config.timelineStartTime || '09:15');
      setIsPlaying(false);
    }
  }, [currentStockItem?.id]);

  // Convert currentStockItem to active trade for 5-min journey generator
  const currentTrade = useMemo(() => {
    if (!currentStockItem) return null;
    const matchingStock = stockMap.get(currentStockItem.symbol.toUpperCase());
    return convertJourneyItemToTrade(currentStockItem, matchingStock);
  }, [currentStockItem, stockMap]);

  // Generate 5-minute journey data for active stock
  const journeyData: StockJourneyData | null = useMemo(() => {
    if (!currentStockItem || !currentTrade) return null;
    return generateStock5MinJourney(currentTrade, {
      ...currentStockItem.config,
      lastSimulatedStepIndex: activeStepIndex
    }, stockMap);
  }, [currentStockItem, currentTrade, activeStepIndex, stockMap]);

  const activeStep = journeyData?.steps[activeStepIndex] || journeyData?.steps[0] || null;

  // Auto playback effect
  useEffect(() => {
    if (isPlaying && journeyData) {
      playbackTimerRef.current = setInterval(() => {
        setActiveStepIndex((prev) => {
          if (prev >= journeyData.steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 2500);
    } else {
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current);
      }
    }
    return () => {
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current);
      }
    };
  }, [isPlaying, journeyData?.steps.length]);

  // Handle toggling enable / disable for current stock
  const handleToggleEnable = () => {
    if (!currentStockItem) return;
    const updatedConfig: StockJourneyTimelineConfig = {
      ...currentStockItem.config,
      isEnabled: !currentStockItem.config.isEnabled
    };
    const updatedStocks = journeyStocks.map(s => 
      s.id === currentStockItem.id ? { ...s, config: updatedConfig } : s
    );
    setJourneyStocks(updatedStocks);
    saveStoredJourneyStocks(updatedStocks);
    saveStoredJourneyConfig(updatedConfig);
  };

  // Handle changing start time
  const handleApplyStartTime = (newTime: string) => {
    if (!currentStockItem) return;
    const updatedConfig: StockJourneyTimelineConfig = {
      ...currentStockItem.config,
      timelineStartTime: newTime,
      lastSimulatedStepIndex: 0
    };
    const updatedStocks = journeyStocks.map(s => 
      s.id === currentStockItem.id ? { ...s, config: updatedConfig } : s
    );
    setJourneyStocks(updatedStocks);
    setStartTimeInput(newTime);
    setActiveStepIndex(0);
    saveStoredJourneyStocks(updatedStocks);
    saveStoredJourneyConfig(updatedConfig);
  };

  // Handle step slider change
  const handleStepChange = (index: number) => {
    if (!currentStockItem || !journeyData) return;
    const safeIdx = Math.max(0, Math.min(journeyData.steps.length - 1, index));
    setActiveStepIndex(safeIdx);
    const updatedConfig: StockJourneyTimelineConfig = {
      ...currentStockItem.config,
      lastSimulatedStepIndex: safeIdx
    };
    const updatedStocks = journeyStocks.map(s => 
      s.id === currentStockItem.id ? { ...s, config: updatedConfig } : s
    );
    setJourneyStocks(updatedStocks);
    saveStoredJourneyStocks(updatedStocks);
    saveStoredJourneyConfig(updatedConfig);
  };

  // Remove a stock from the journey list
  const handleRemoveStock = (stockIdToRemove: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const stockToRemove = journeyStocks.find(s => s.id === stockIdToRemove);
    if (!stockToRemove) return;

    const updated = journeyStocks.filter(s => s.id !== stockIdToRemove);
    setJourneyStocks(updated);
    saveStoredJourneyStocks(updated);
    deleteStoredJourneyConfig(stockToRemove.config.tradeId);

    // If removed active stock, focus on another stock
    if (activeStockId === stockIdToRemove) {
      if (updated.length > 0) {
        setActiveStockId(updated[0].id);
      } else {
        setActiveStockId('');
      }
    }
  };

  // Add stock from Open Trade directly
  const handleAddFromOpenTrade = (trade: UserTrackedTrade) => {
    const existing = journeyStocks.find(s => s.tradeId === trade.id || (s.symbol === trade.symbol && s.instrumentType === trade.instrumentType));
    if (existing) {
      setActiveStockId(existing.id);
      setIsAddStockOpen(false);
      return;
    }

    const newItem = createJourneyStockFromTrade(trade);
    const updated = [newItem, ...journeyStocks];
    setJourneyStocks(updated);
    saveStoredJourneyStocks(updated);
    setActiveStockId(newItem.id);
    setIsAddStockOpen(false);
  };

  // Submit adding new custom stock journey
  const handleSubmitAddCustomStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addSymbol.trim()) return;

    const symbolUpper = addSymbol.trim().toUpperCase();
    const matchingStock = stockMap.get(symbolUpper) || INITIAL_STOCKS.find(s => s.symbol.toUpperCase() === symbolUpper);
    const fallbackPrice = matchingStock ? (matchingStock.closePrice || matchingStock.openPrice || 1000) : 1000;
    const entryP = parseFloat(addEntryPrice) || fallbackPrice;
    const qty = parseInt(addQuantity, 10) || 50;
    const strikeP = addStrikePrice ? parseFloat(addStrikePrice) : undefined;

    const newItem = createStandaloneJourneyStock({
      symbol: symbolUpper,
      instrumentType: addInstrument,
      strikePrice: strikeP,
      entryPrice: entryP,
      quantity: qty,
      entryTime: addStartTime || '09:15',
      currentPrice: fallbackPrice
    });

    const updated = [newItem, ...journeyStocks];
    setJourneyStocks(updated);
    saveStoredJourneyStocks(updated);
    setActiveStockId(newItem.id);

    // Reset form
    setAddSymbol('');
    setAddEntryPrice('');
    setAddStrikePrice('');
    setAddQuantity('50');
    setIsAddStockOpen(false);
  };

  const handleSelectPredefinedSymbol = (sym: string) => {
    setAddSymbol(sym);
    const matching = stockMap.get(sym) || INITIAL_STOCKS.find(s => s.symbol.toUpperCase() === sym);
    if (matching) {
      const price = matching.closePrice || matching.openPrice || 1000;
      setAddEntryPrice(price.toString());
      if (addInstrument !== 'EQUITY') {
        const atmStrike = roundToExactNseStrike(price, sym);
        setAddStrikePrice(atmStrike.toString());
      }
    }
  };

  // Speech synthesis
  const handleSpeakCurrentStep = () => {
    if (!onSpeakText || !activeStep || !currentStockItem) return;
    const textToSpeak = `For ${currentStockItem.symbol} at ${activeStep.timeStr}, price is ₹${activeStep.price.toFixed(2)}. ${activeStep.friendGuidanceMessage} Action recommended: ${activeStep.actionCallout}`;
    onSpeakText(textToSpeak);
  };

  const timePresets = ['09:15', '09:30', '10:00', '11:30', '01:15', '02:30'];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shrink-0 mt-0.5">
              <Clock className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
                  <span>5-Minute Stock Journey Hub</span>
                </h2>
                <span className="text-xs text-blue-300 font-bold px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/30">
                  {journeyStocks.length} Stock{journeyStocks.length !== 1 ? 's' : ''} Tracked
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 font-medium leading-relaxed">
                Add, remove, and iterate step-by-step 5-minute journeys for multiple stocks with real-time RSI momentum, averaging opportunities, and friend coaching.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddStockOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
              title="Add another stock to 5-minute journey tracker"
            >
              <Plus className="w-4 h-4" />
              <span>Add Stock Journey</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Multi-Stock Tab Selector Bar */}
        <div className="bg-slate-900/95 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between gap-3 overflow-x-auto">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin py-0.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>Stocks:</span>
            </span>

            {journeyStocks.map((stock) => {
              const isActive = stock.id === activeStockId;
              return (
                <div
                  key={stock.id}
                  onClick={() => {
                    setActiveStockId(stock.id);
                    if (viewMode === 'matrix') setViewMode('interactive');
                  }}
                  className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer select-none shrink-0 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400/40'
                      : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <span>{stock.symbol}</span>
                  {stock.instrumentType !== 'EQUITY' && (
                    <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-black/30 text-blue-200">
                      {stock.instrumentType} {stock.strikePrice || ''}
                    </span>
                  )}

                  {/* Remove Stock Button */}
                  <button
                    type="button"
                    onClick={(e) => handleRemoveStock(stock.id, e)}
                    className="ml-1 p-0.5 rounded-md text-slate-400 hover:text-rose-300 hover:bg-rose-950/60 transition-colors"
                    title={`Remove ${stock.symbol} from Journey`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}

            {/* Quick Add Button In Tab Bar */}
            <button
              onClick={() => setIsAddStockOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-colors cursor-pointer shrink-0 border border-slate-700 border-dashed"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Add Stock</span>
            </button>
          </div>

          {/* View Mode Selector */}
          <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-xl shrink-0">
            <button
              onClick={() => setViewMode('interactive')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                viewMode === 'interactive' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Sliders className="w-3 h-3" />
              <span className="hidden sm:inline">Interactive</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                viewMode === 'table' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Table className="w-3 h-3" />
              <span className="hidden sm:inline">Log Table</span>
            </button>
            <button
              onClick={() => setViewMode('matrix')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                viewMode === 'matrix' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              <LayoutGrid className="w-3 h-3" />
              <span>Multi-Matrix</span>
            </button>
          </div>
        </div>

        {/* Add Stock Drawer / Dialog Modal */}
        {isAddStockOpen && (
          <div className="p-5 bg-gradient-to-br from-slate-900 to-indigo-950 text-white border-b border-indigo-500/30 animate-in slide-in-from-top-4 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Add Stock to 5-Minute Journey Tracker</h3>
                  <p className="text-[11px] text-slate-300 font-medium">
                    Add any stock or option setup to track its 5-minute confluence trajectory.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsAddStockOpen(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Add from Active Open Trades (if any) */}
            {openTrades.length > 0 && (
              <div className="mb-4 p-3 bg-white/5 rounded-2xl border border-white/10">
                <div className="text-[11px] font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Quick Add from Your Active Ledger Trades:</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {openTrades.map((t) => {
                    const isAlreadyAdded = journeyStocks.some(s => s.tradeId === t.id);
                    return (
                      <button
                        key={t.id}
                        onClick={() => handleAddFromOpenTrade(t)}
                        disabled={isAlreadyAdded}
                        className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          isAlreadyAdded
                            ? 'bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed'
                            : 'bg-indigo-600/60 hover:bg-indigo-600 text-white border border-indigo-400/40 shadow-sm'
                        }`}
                      >
                        <span>{t.symbol}</span>
                        {t.instrumentType !== 'EQUITY' && <span className="text-[10px] text-indigo-200">({t.instrumentType})</span>}
                        <span>₹{t.entryPrice.toFixed(1)}</span>
                        {isAlreadyAdded ? <Check className="w-3 h-3 text-slate-400" /> : <Plus className="w-3 h-3 text-emerald-300" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Manual Form Entry */}
            <form onSubmit={handleSubmitAddCustomStock} className="space-y-4">
              {/* Predefined Quick Symbol Tags */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-slate-400 mr-1">Popular Stocks:</span>
                {['RELIANCE', 'TATASTEEL', 'INFY', 'HDFCBANK', 'NIFTY', 'BANKNIFTY', 'ICICIBANK', 'SBIN', 'ITC'].map((sym) => (
                  <button
                    key={sym}
                    type="button"
                    onClick={() => handleSelectPredefinedSymbol(sym)}
                    className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-mono font-bold text-slate-200 cursor-pointer"
                  >
                    {sym}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {/* Symbol */}
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Stock Symbol</label>
                  <input
                    type="text"
                    required
                    value={addSymbol}
                    onChange={(e) => setAddSymbol(e.target.value.toUpperCase())}
                    placeholder="e.g. RELIANCE"
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-blue-500 uppercase"
                  />
                </div>

                {/* Instrument Type */}
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Instrument</label>
                  <select
                    value={addInstrument}
                    onChange={(e) => setAddInstrument(e.target.value as InstrumentType)}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="EQUITY">Equity (Cash)</option>
                    <option value="CE">Call Option (CE)</option>
                    <option value="PE">Put Option (PE)</option>
                    <option value="FUTURES">Futures</option>
                  </select>
                </div>

                {/* Strike Price (if option) */}
                {addInstrument !== 'EQUITY' && (
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Strike Price (₹)</label>
                    <input
                      type="number"
                      value={addStrikePrice}
                      onChange={(e) => setAddStrikePrice(e.target.value)}
                      placeholder="e.g. 2950"
                      className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}

                {/* Entry Price */}
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Entry Price / Premium (₹)</label>
                  <input
                    type="number"
                    step="0.05"
                    required
                    value={addEntryPrice}
                    onChange={(e) => setAddEntryPrice(e.target.value)}
                    placeholder="e.g. 2940.50"
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Quantity */}
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Quantity / Lot</label>
                  <input
                    type="number"
                    value={addQuantity}
                    onChange={(e) => setAddQuantity(e.target.value)}
                    placeholder="50"
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Start Time */}
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Journey Start Time</label>
                  <input
                    type="text"
                    value={addStartTime}
                    onChange={(e) => setAddStartTime(e.target.value)}
                    placeholder="09:15"
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddStockOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Start Tracking Journey</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* If no stocks in journey list */}
        {journeyStocks.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-14 h-14 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
              <Clock className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800">No Stocks in Journey Tracker</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto font-medium">
                Add any stock symbol or active trade to start simulating its 5-minute confluence journey and friend coaching.
              </p>
            </div>
            <button
              onClick={() => setIsAddStockOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Stock Journey</span>
            </button>
          </div>
        ) : viewMode === 'matrix' ? (
          /* Multi-Stock Matrix Overview */
          <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4 text-blue-600" />
                  <span>Multi-Stock 5-Minute Confluence Matrix</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  High-level comparative view of all {journeyStocks.length} tracked stocks and their current 5-minute verdict.
                </p>
              </div>

              <button
                onClick={() => setIsAddStockOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Stock</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {journeyStocks.map((stock) => {
                const matchingStock = stockMap.get(stock.symbol.toUpperCase());
                const tr = convertJourneyItemToTrade(stock, matchingStock);
                const sData = generateStock5MinJourney(tr, stock.config, stockMap);
                const sStep = sData.steps[stock.config.lastSimulatedStepIndex || 0] || sData.steps[0];

                return (
                  <div
                    key={stock.id}
                    onClick={() => {
                      setActiveStockId(stock.id);
                      setViewMode('interactive');
                    }}
                    className="p-5 rounded-3xl border border-slate-200 hover:border-blue-300 hover:shadow-lg bg-gradient-to-br from-white via-slate-50/50 to-blue-50/20 transition-all cursor-pointer space-y-3.5 group relative"
                  >
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-base text-slate-900 font-mono group-hover:text-blue-600 transition-colors">
                            {stock.symbol}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                            {stock.instrumentType} {stock.strikePrice ? `₹${stock.strikePrice}` : ''}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                          Start: <span className="font-mono font-bold text-slate-700">{stock.config.timelineStartTime}</span> • Entry: <span className="font-mono font-bold text-slate-700">₹{stock.entryPrice.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={(e) => handleRemoveStock(stock.id, e)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Remove from Journey"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Active Step Snapshot */}
                    <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-500">Step at {sStep.timeStr}</span>
                        <span className={`font-mono font-bold ${sStep.pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {sStep.pnl >= 0 ? '+' : ''}₹{sStep.pnl.toLocaleString('en-IN')} ({sStep.pnlPct >= 0 ? '+' : ''}{sStep.pnlPct.toFixed(1)}%)
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-medium">Price / RSI:</span>
                        <span className="font-mono font-bold text-slate-800">
                          ₹{sStep.price.toFixed(2)} | RSI {sStep.rsi.toFixed(1)}
                        </span>
                      </div>

                      {/* Verdict Badge */}
                      <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          sStep.verdictAction === 'STRONG_HOLD'
                            ? 'bg-emerald-100 text-emerald-800'
                            : sStep.verdictAction === 'SCALE_IN_AVERAGE'
                            ? 'bg-amber-100 text-amber-800'
                            : sStep.verdictAction === 'BOOK_PARTIAL_PROFIT'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {sStep.verdictBadge}
                        </span>

                        <span className="text-[10px] text-blue-600 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                          <span>Inspect</span>
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-600 font-medium line-clamp-2 leading-relaxed">
                      {sStep.friendGuidanceMessage}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Single Stock Detailed Interactive / Table View */
          <>
            {/* Active Stock Configuration Bar */}
            {currentStockItem && (
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4 flex-wrap">
                {/* Enable / Disable Switch */}
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={currentStockItem.config.isEnabled}
                      onChange={handleToggleEnable}
                      className="sr-only"
                    />
                    <div className={`w-11 h-6 rounded-full transition-colors p-0.5 ${currentStockItem.config.isEnabled ? 'bg-emerald-600' : 'bg-slate-300'}`}>
                      <div className={`w-5 h-5 rounded-full bg-white transition-transform ${currentStockItem.config.isEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                    </div>
                    <span className="text-xs font-black text-slate-800">
                      {currentStockItem.config.isEnabled ? `🟢 ${currentStockItem.symbol}: ENABLED` : `⚪ ${currentStockItem.symbol}: DISABLED`}
                    </span>
                  </label>
                </div>

                {/* Start Time Selector */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span>Start Time:</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={startTimeInput}
                      onChange={(e) => setStartTimeInput(e.target.value)}
                      placeholder="09:15"
                      className="w-20 px-2.5 py-1 text-xs font-mono font-bold border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleApplyStartTime(startTimeInput)}
                      className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                    >
                      Set
                    </button>
                  </div>

                  {/* Quick Presets */}
                  <div className="flex items-center gap-1 hidden sm:flex">
                    {timePresets.map((time) => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => handleApplyStartTime(time)}
                        className={`px-2 py-0.5 rounded text-[10.5px] font-mono font-bold cursor-pointer transition-colors ${
                          currentStockItem.config.timelineStartTime === time
                            ? 'bg-slate-900 text-white'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Remove this Stock action button */}
                <button
                  onClick={() => handleRemoveStock(currentStockItem.id)}
                  className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  title={`Remove ${currentStockItem.symbol} from Journey`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Stock</span>
                </button>
              </div>
            )}

            {/* Body Content */}
            <div className="p-5 sm:p-6 space-y-6 overflow-y-auto">

              {viewMode === 'interactive' && journeyData && activeStep ? (
                <>
                  {/* 1. Timeline Player & Controls Bar */}
                  <div className="bg-slate-900 text-white p-4 rounded-3xl shadow-md space-y-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-blue-300 uppercase tracking-wide">
                          ⏱️ {currentStockItem?.symbol} 5-Minute Time Machine
                        </span>
                        <span className="text-xs font-mono bg-white/10 px-2 py-0.5 rounded-md text-slate-200">
                          Step {activeStepIndex + 1} of {journeyData.steps.length} (+{activeStep.minutesElapsed} mins)
                        </span>
                      </div>

                      {/* Playback Buttons */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleStepChange(0)}
                          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 transition-colors cursor-pointer"
                          title="Reset to Start Time"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleStepChange(activeStepIndex - 1)}
                          disabled={activeStepIndex === 0}
                          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 disabled:opacity-30 transition-colors cursor-pointer"
                          title="Previous 5-Minute Interval"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setIsPlaying(!isPlaying)}
                          className={`px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-transform active:scale-95 ${
                            isPlaying ? 'bg-amber-500 hover:bg-amber-600 text-black' : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950'
                          }`}
                        >
                          {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                          <span>{isPlaying ? 'Pause' : 'Auto-Iterate 5m'}</span>
                        </button>

                        <button
                          onClick={() => handleStepChange(activeStepIndex + 1)}
                          disabled={activeStepIndex === journeyData.steps.length - 1}
                          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 disabled:opacity-30 transition-colors cursor-pointer"
                          title="Next 5-Minute Interval"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>

                        {/* Speech Synthesis Voice Playback */}
                        {onSpeakText && (
                          <button
                            onClick={handleSpeakCurrentStep}
                            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-transform active:scale-95 ml-1"
                            title="Listen to the Friend's Guidance at this step"
                          >
                            {isSpeaking ? <VolumeX className="w-3.5 h-3.5 animate-pulse" /> : <Volume2 className="w-3.5 h-3.5" />}
                            <span>{isSpeaking ? 'Stop' : '🔊 Listen'}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Scrubber Range Slider */}
                    <div className="space-y-1">
                      <input
                        type="range"
                        min={0}
                        max={journeyData.steps.length - 1}
                        value={activeStepIndex}
                        onChange={(e) => handleStepChange(Number(e.target.value))}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-400"
                      />
                      <div className="flex items-center justify-between text-[10.5px] text-slate-400 font-mono">
                        <span>{journeyData.steps[0]?.timeStr} (T+0m)</span>
                        <span className="text-blue-300 font-bold">{activeStep.timeStr} (Active)</span>
                        <span>{journeyData.steps[journeyData.steps.length - 1]?.timeStr} (+{journeyData.steps[journeyData.steps.length - 1]?.minutesElapsed}m)</span>
                      </div>
                    </div>

                    {/* Horizontal Step Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-thin">
                      {journeyData.steps.map((step, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleStepChange(idx)}
                          className={`px-2.5 py-1 rounded-xl text-[10.5px] font-mono font-bold shrink-0 transition-all cursor-pointer ${
                            idx === activeStepIndex
                              ? 'bg-blue-500 text-white ring-2 ring-blue-300 shadow-md'
                              : step.isMilestone
                              ? 'bg-slate-800 text-amber-300 border border-amber-500/40 hover:bg-slate-700'
                              : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          <span>{step.timeStr.replace(/ AM| PM/, '')}</span>
                          {step.isMilestone && <span className="ml-1 text-[9px]">★</span>}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. Primary Friend Coaching Card for this 5-Minute Step */}
                  <div className="rounded-3xl border-2 border-blue-200/80 bg-gradient-to-b from-blue-50/50 via-indigo-50/20 to-white p-5 sm:p-6 shadow-sm space-y-4">
                    
                    {/* Step Headline & Verdict Badge */}
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-blue-100 flex-wrap">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0 mt-0.5">
                          <Bot className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black text-slate-900 tracking-wide uppercase">
                              Friend's 5-Min Guidance at {activeStep.timeStr} ({currentStockItem?.symbol})
                            </span>
                            <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase border shadow-2xs ${
                              activeStep.verdictAction === 'STRONG_HOLD' || activeStep.verdictAction === 'WAIT_PATIENTLY'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : activeStep.verdictAction === 'SCALE_IN_AVERAGE'
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : activeStep.verdictAction === 'BOOK_PARTIAL_PROFIT'
                                ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                                : 'bg-rose-100 text-rose-800 border-rose-300'
                            }`}>
                              {activeStep.verdictBadge}
                            </span>
                            {activeStep.milestoneTag && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-300 flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-amber-600" />
                                <span>{activeStep.milestoneTag}</span>
                              </span>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-slate-800 font-medium mt-1 leading-relaxed">
                            {activeStep.friendGuidanceMessage}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 4-Pillar Diagnostics at this 5-Min Timestamp */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {/* Price & PnL */}
                      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Price at {activeStep.timeStr}</div>
                        <div className="font-mono font-black text-slate-900 text-base mt-0.5">
                          ₹{activeStep.price.toFixed(2)}
                        </div>
                        <div className={`text-[10px] font-bold ${activeStep.pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {activeStep.pnl >= 0 ? '+' : ''}₹{activeStep.pnl.toLocaleString('en-IN')} ({activeStep.pnlPct >= 0 ? '+' : ''}{activeStep.pnlPct.toFixed(1)}%)
                        </div>
                      </div>

                      {/* RSI (14) */}
                      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                        <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                          <Activity className="w-3 h-3 text-purple-600" />
                          <span>RSI (14) Momentum</span>
                        </div>
                        <div className="font-mono font-black text-purple-700 text-base mt-0.5">
                          {activeStep.rsi.toFixed(1)} {activeStep.rsiTrajectory === 'RISING' ? '↗' : activeStep.rsiTrajectory === 'FALLING' ? '↘' : '→'}
                        </div>
                        <div className="text-[10px] text-slate-500 font-semibold">
                          {activeStep.rsi >= 65 ? 'Overbought Fuel' : activeStep.rsi >= 50 ? 'Constructive Bull' : 'Testing Support'}
                        </div>
                      </div>

                      {/* Volume & Buyer % */}
                      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                        <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                          <BarChart2 className="w-3 h-3 text-blue-600" />
                          <span>Volume &amp; Order Flow</span>
                        </div>
                        <div className="font-mono font-black text-blue-700 text-base mt-0.5">
                          {activeStep.volumeRatio.toFixed(1)}x Vol
                        </div>
                        <div className="text-[10px] text-emerald-600 font-bold">
                          {activeStep.buyerPressurePct}% Buyer Dominance
                        </div>
                      </div>

                      {/* VWAP Support */}
                      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                        <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                          <Shield className="w-3 h-3 text-emerald-600" />
                          <span>VWAP Support</span>
                        </div>
                        <div className="font-mono font-black text-slate-900 text-base mt-0.5">
                          ₹{activeStep.vwap.toFixed(2)}
                        </div>
                        <div className={`text-[10px] font-bold ${activeStep.isAboveVwap ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {activeStep.isAboveVwap ? '✅ Above VWAP' : '⚠️ Testing Base'}
                        </div>
                      </div>
                    </div>

                    {/* Specific Action Callout */}
                    <div className="p-3.5 bg-gradient-to-r from-amber-50 via-slate-50 to-emerald-50 rounded-2xl border border-amber-200/80 flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-amber-500/20 text-amber-700 shrink-0 mt-0.5">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-amber-900 uppercase tracking-wide">
                          Recommended Action For This 5-Min Window
                        </div>
                        <div className="text-xs font-black text-slate-900 mt-0.5 leading-relaxed">
                          {activeStep.actionCallout}
                        </div>
                      </div>
                    </div>

                  </div>
                </>
              ) : viewMode === 'table' && journeyData ? (
                /* Full Step Table */
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-600 font-black uppercase text-[10px]">
                      <tr>
                        <th className="p-3">Time</th>
                        <th className="p-3">Elapsed</th>
                        <th className="p-3">Price</th>
                        <th className="p-3">P&amp;L</th>
                        <th className="p-3">RSI</th>
                        <th className="p-3">Volume</th>
                        <th className="p-3">Verdict</th>
                        <th className="p-3">Guidance / Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {journeyData.steps.map((step, idx) => (
                        <tr 
                          key={idx}
                          onClick={() => {
                            handleStepChange(idx);
                            setViewMode('interactive');
                          }}
                          className={`hover:bg-blue-50/60 cursor-pointer transition-colors ${
                            idx === activeStepIndex ? 'bg-blue-50 font-bold' : ''
                          }`}
                        >
                          <td className="p-3 font-mono font-bold text-slate-900">{step.timeStr}</td>
                          <td className="p-3 font-mono text-slate-500">+{step.minutesElapsed}m</td>
                          <td className="p-3 font-mono font-bold">₹{step.price.toFixed(2)}</td>
                          <td className={`p-3 font-mono font-bold ${step.pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {step.pnl >= 0 ? '+' : ''}₹{step.pnl.toLocaleString('en-IN')}
                          </td>
                          <td className="p-3 font-mono text-purple-700">{step.rsi.toFixed(1)}</td>
                          <td className="p-3 font-mono text-blue-700">{step.volumeRatio.toFixed(1)}x</td>
                          <td className="p-3">
                            <span className={`text-[9.5px] font-black px-2 py-0.5 rounded-full ${
                              step.verdictAction === 'STRONG_HOLD'
                                ? 'bg-emerald-100 text-emerald-800'
                                : step.verdictAction === 'SCALE_IN_AVERAGE'
                                ? 'bg-amber-100 text-amber-800'
                                : step.verdictAction === 'BOOK_PARTIAL_PROFIT'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}>
                              {step.verdictBadge}
                            </span>
                          </td>
                          <td className="p-3 text-[11px] text-slate-700 max-w-xs truncate">
                            {step.friendGuidanceMessage}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

            </div>
          </>
        )}

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2">
          <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
            <span>💡 Switch stocks above or click <strong>Add Stock Journey</strong> to track multiple tickers simultaneously.</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition-all cursor-pointer"
          >
            Close Hub
          </button>
        </div>

      </div>
    </div>
  );
};
