import React, { useState } from 'react';
import { 
  UserCapitalProfile, 
  UserTrackedTrade 
} from '../types';
import { 
  Wallet, 
  TrendingUp, 
  Shield, 
  Target, 
  Layers, 
  CheckCircle2, 
  Sparkles, 
  Heart, 
  X, 
  Edit3, 
  Check, 
  ArrowRight,
  Bot
} from 'lucide-react';

interface CapitalJourneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  capitalProfile: UserCapitalProfile;
  openTrades: UserTrackedTrade[];
  onUpdateTotalCapital: (newAmount: number) => void;
}

export const CapitalJourneyModal: React.FC<CapitalJourneyModalProps> = ({
  isOpen,
  onClose,
  capitalProfile,
  openTrades,
  onUpdateTotalCapital
}) => {
  const [isEditingCapital, setIsEditingCapital] = useState(false);
  const [capitalInput, setCapitalInput] = useState(capitalProfile.totalTradingCapital.toString());

  if (!isOpen) return null;

  const handleSaveCapital = () => {
    const val = Number(capitalInput.replace(/,/g, ''));
    if (!isNaN(val) && val > 0) {
      onUpdateTotalCapital(val);
      setIsEditingCapital(false);
    }
  };

  const quickPresets = [25000, 50000, 100000, 200000, 500000, 1000000];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shrink-0 mt-0.5">
              <Wallet className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  Capital &amp; Trading Journey Blueprint
                </h2>
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase">
                  Co-Pilot Strategy
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 font-medium leading-relaxed">
                Smart capital allocation, phased compounding roadmap, and strict risk safeguards tailored to your portfolio.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto">

          {/* 1. Complete Capital Breakdown & Quick Editor */}
          <div className="bg-gradient-to-br from-slate-50 to-indigo-50/40 p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-blue-600" />
                  <span>Total Trading Capital Bankroll</span>
                </span>

                {isEditingCapital ? (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-lg font-black text-slate-800">₹</span>
                    <input
                      type="number"
                      value={capitalInput}
                      onChange={(e) => setCapitalInput(e.target.value)}
                      className="w-40 px-3 py-1 text-lg font-black font-mono border-2 border-blue-500 rounded-xl bg-white text-slate-900 focus:outline-none"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveCapital}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Save</span>
                    </button>
                    <button
                      onClick={() => setIsEditingCapital(false)}
                      className="px-2 py-1 text-slate-500 hover:text-slate-700 text-xs font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900">
                      ₹{capitalProfile.totalTradingCapital.toLocaleString('en-IN')}
                    </span>
                    <button
                      onClick={() => {
                        setCapitalInput(capitalProfile.totalTradingCapital.toString());
                        setIsEditingCapital(true);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                      title="Edit total trading capital"
                    >
                      <Edit3 className="w-3 h-3 text-blue-600" />
                      <span>Change</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Capital Stage Badge */}
              <div className="text-right">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Current Growth Stage</span>
                <div className="text-xs sm:text-sm font-black text-indigo-700 mt-0.5 bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-200/80">
                  {capitalProfile.stageTitle}
                </div>
              </div>
            </div>

            {/* Quick Capital Presets */}
            {isEditingCapital && (
              <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-200/60">
                <span className="text-[11px] font-bold text-slate-500 mr-1">Quick Select:</span>
                {quickPresets.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setCapitalInput(preset.toString())}
                    className="px-2.5 py-0.5 rounded-lg bg-white hover:bg-blue-50 border border-slate-200 text-[11px] font-mono font-bold text-slate-700 cursor-pointer"
                  >
                    ₹{(preset / 1000).toFixed(0)}k
                  </button>
                ))}
              </div>
            )}

            {/* 4-Pillar Capital Distribution Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Deployed in Trades</div>
                <div className="font-mono font-black text-slate-900 text-base sm:text-lg mt-0.5">
                  ₹{capitalProfile.deployedCapital.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-slate-500 font-semibold">
                  {((capitalProfile.deployedCapital / capitalProfile.totalTradingCapital) * 100).toFixed(1)}% of total ({openTrades.length} open)
                </div>
              </div>

              <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Averaging Buffer (35%)</div>
                <div className="font-mono font-black text-amber-700 text-base sm:text-lg mt-0.5">
                  ₹{capitalProfile.reservedAveragingBuffer.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-amber-600 font-bold">
                  Reserved for Dips
                </div>
              </div>

              <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Free Available Cash</div>
                <div className="font-mono font-black text-emerald-700 text-base sm:text-lg mt-0.5">
                  ₹{capitalProfile.freeCashCapital.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-emerald-600 font-semibold">
                  Ready to deploy
                </div>
              </div>

              <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Max Risk Per Trade</div>
                <div className="font-mono font-black text-rose-700 text-base sm:text-lg mt-0.5">
                  ₹{capitalProfile.maxRiskPerTradeAmount.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-rose-600 font-bold">
                  {capitalProfile.maxRiskPerTradePct}% Hard Limit
                </div>
              </div>
            </div>
          </div>

          {/* 2. Friend's Personalized Journey Blueprint Advice */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white border border-blue-500/30 flex items-start gap-3.5 shadow-md">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0 text-blue-400 mt-0.5">
              <Bot className="w-5 h-5 text-blue-300" />
            </div>
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-black text-blue-200 tracking-wide uppercase flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400/20" />
                  <span>Friend's Capital Journey Prescription</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 font-bold">
                  Max {capitalProfile.recommendedMaxActiveTrades} Trades | {capitalProfile.recommendedMaxLotSize} Lots Max
                </span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed font-medium">
                {capitalProfile.friendJourneyAdvice}
              </p>
            </div>
          </div>

          {/* 3. Phased Milestones & Progression Tracker */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-600" />
                <span>Your Capital Journey Milestones</span>
              </h3>
              <span className="text-xs font-bold text-slate-500">
                Target: ₹{capitalProfile.nextMilestoneCapital.toLocaleString('en-IN')}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="bg-slate-100 p-3 rounded-2xl border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-600">Progress to Next Milestone</span>
                <span className="font-mono text-blue-600">{capitalProfile.progressToNextMilestonePct}%</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-200 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-500"
                  style={{ width: `${capitalProfile.progressToNextMilestonePct}%` }}
                />
              </div>
            </div>

            {/* Milestone Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {capitalProfile.milestones.map((m, idx) => (
                <div 
                  key={idx}
                  className={`p-4 rounded-2xl border transition-all ${
                    m.status === 'ACTIVE'
                      ? 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-500/20'
                      : m.status === 'COMPLETED'
                      ? 'bg-emerald-50/60 border-emerald-300 opacity-90'
                      : 'bg-slate-50/60 border-slate-200 opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full border">
                      {m.status}
                    </span>
                    <span className="font-mono font-black text-xs text-slate-900">
                      ₹{m.targetCapital.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="font-black text-xs text-slate-900 mb-1">
                    {m.stageName}
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-medium mb-3">
                    {m.description}
                  </p>
                  <div className="pt-2 border-t border-black/5 flex items-center justify-between text-[10px] font-bold text-slate-500">
                    <span>Max {m.maxPositionsAllowed} Position(s)</span>
                    <span>{m.maxLotsAllowed} Lots</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Actionable Journey Rules */}
          <div className="space-y-2">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>Core Rules For Winning Your Capital Journey</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {capitalProfile.journeyActionableRules.map((rule, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 leading-relaxed flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{rule}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2">
          <div className="text-xs text-slate-500 font-medium">
            💡 Capital journey suggestions dynamically update as you log trades and grow your bankroll.
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition-all cursor-pointer"
          >
            Done &amp; Continue Trading
          </button>
        </div>

      </div>
    </div>
  );
};
