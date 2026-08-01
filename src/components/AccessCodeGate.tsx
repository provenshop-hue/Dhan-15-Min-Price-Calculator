import React, { useState } from 'react';
import { Lock, ShieldCheck, KeyRound, ArrowRight, AlertCircle } from 'lucide-react';

interface AccessCodeGateProps {
  onUnlock: () => void;
}

export const AccessCodeGate: React.FC<AccessCodeGateProps> = ({ onUnlock }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim() === '7774') {
      setError(false);
      localStorage.setItem('gann_app_access_code_unlocked', 'true');
      sessionStorage.setItem('gann_app_access_code_unlocked', 'true');
      onUnlock();
    } else {
      setError(true);
      setAttempts((prev) => prev + 1);
      setCode('');
    }
  };

  const handleKeyClick = (num: string) => {
    if (code.length < 4) {
      const newCode = code + num;
      setCode(newCode);
      if (newCode === '7774') {
        setError(false);
        localStorage.setItem('gann_app_access_code_unlocked', 'true');
        sessionStorage.setItem('gann_app_access_code_unlocked', 'true');
        onUnlock();
      } else if (newCode.length === 4) {
        setError(true);
        setAttempts((prev) => prev + 1);
        setTimeout(() => setCode(''), 300);
      }
    }
  };

  const handleClear = () => {
    setCode('');
    setError(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-8 shadow-2xl text-slate-100 relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 text-center">
          {/* Header Icon */}
          <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/25 border border-blue-400/30">
            <Lock className="w-8 h-8 text-white" />
          </div>

          <h1 className="text-2xl font-black text-white tracking-tight mb-1">
            Gannformula-app
          </h1>
          <p className="text-xs text-slate-400 mb-6 font-medium">
            Protected Application. Enter your 4-digit access code to continue.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* PIN Indicator Dots */}
            <div className="flex justify-center items-center space-x-3 my-4">
              {[0, 1, 2, 3].map((idx) => {
                const filled = code.length > idx;
                return (
                  <div
                    key={idx}
                    className={`w-4 h-4 rounded-full transition-all duration-200 border ${
                      filled
                        ? 'bg-blue-500 border-blue-400 scale-110 shadow-sm shadow-blue-500/50'
                        : error
                        ? 'border-rose-500/60 bg-rose-500/10'
                        : 'border-slate-700 bg-slate-800'
                    }`}
                  />
                );
              })}
            </div>

            {/* Hidden Input for Keyboard Typing */}
            <input
              type="password"
              maxLength={4}
              value={code}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                setCode(val);
                setError(false);
                if (val === '7774') {
                  localStorage.setItem('gann_app_access_code_unlocked', 'true');
                  sessionStorage.setItem('gann_app_access_code_unlocked', 'true');
                  onUnlock();
                } else if (val.length === 4) {
                  setError(true);
                  setAttempts((prev) => prev + 1);
                }
              }}
              autoFocus
              className="w-full bg-slate-950/80 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-3 text-center text-lg font-mono font-bold tracking-widest text-white outline-none"
              placeholder="••••"
            />

            {error && (
              <div className="flex items-center justify-center space-x-1.5 text-rose-400 text-xs font-semibold bg-rose-950/50 border border-rose-800/60 p-2.5 rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Incorrect access code. Please try again.</span>
              </div>
            )}

            {/* Quick Keypad */}
            <div className="grid grid-cols-3 gap-2.5 pt-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeyClick(num)}
                  className="bg-slate-800/80 hover:bg-slate-700 active:bg-blue-600 active:text-white border border-slate-700/60 rounded-xl py-3 font-mono font-bold text-lg text-slate-100 transition-colors shadow-2xs"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={handleClear}
                className="bg-slate-800/50 hover:bg-slate-800 border border-slate-800 rounded-xl py-3 text-xs font-bold text-slate-400 transition-colors"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => handleKeyClick('0')}
                className="bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 rounded-xl py-3 font-mono font-bold text-lg text-slate-100 transition-colors"
              >
                0
              </button>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white border border-blue-400/40 rounded-xl py-3 font-bold text-xs flex items-center justify-center space-x-1 transition-colors"
              >
                <span>Enter</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800/60 text-[11px] text-slate-500 flex items-center justify-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
            <span>Authorized Personnel Access Only</span>
          </div>
        </div>
      </div>
    </div>
  );
};
