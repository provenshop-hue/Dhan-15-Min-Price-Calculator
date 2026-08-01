import React, { useState } from 'react';
import { X, Lock, KeyRound, ArrowRight, AlertCircle, Shield } from 'lucide-react';

interface DhanApiGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const DhanApiGateModal: React.FC<DhanApiGateModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleVerify = (inputCode: string) => {
    if (inputCode === '1212') {
      setError(false);
      setCode('');
      onSuccess();
    } else {
      setError(true);
      setTimeout(() => setCode(''), 300);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleVerify(code);
  };

  const handleKeyClick = (num: string) => {
    if (code.length < 4) {
      const newCode = code + num;
      setCode(newCode);
      setError(false);
      if (newCode.length === 4) {
        handleVerify(newCode);
      }
    }
  };

  const handleClear = () => {
    setCode('');
    setError(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl text-slate-100 relative overflow-hidden">
        
        {/* Glow */}
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-white">Protected Setup</h3>
          </div>
          <button
            onClick={() => {
              setCode('');
              setError(false);
              onClose();
            }}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-5 text-center">
          <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center mx-auto mb-3 text-amber-400">
            <Lock className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-white mb-1">Dhan API Setup Access</h4>
          <p className="text-xs text-slate-400 mb-4">
            Enter 4-digit access code (1212) to configure API credentials
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* PIN Dots */}
            <div className="flex justify-center items-center space-x-2.5 my-3">
              {[0, 1, 2, 3].map((idx) => {
                const filled = code.length > idx;
                return (
                  <div
                    key={idx}
                    className={`w-3.5 h-3.5 rounded-full transition-all duration-200 border ${
                      filled
                        ? 'bg-amber-500 border-amber-400 scale-110 shadow-xs shadow-amber-500/50'
                        : error
                        ? 'border-rose-500 bg-rose-500/20'
                        : 'border-slate-700 bg-slate-800'
                    }`}
                  />
                );
              })}
            </div>

            {/* Hidden/Direct input */}
            <input
              type="password"
              maxLength={4}
              value={code}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                setCode(val);
                setError(false);
                if (val.length === 4) {
                  handleVerify(val);
                }
              }}
              autoFocus
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-center text-base font-mono font-bold tracking-widest text-white outline-none"
              placeholder="••••"
            />

            {error && (
              <div className="flex items-center justify-center space-x-1.5 text-rose-400 text-xs font-semibold bg-rose-950/60 border border-rose-800/80 p-2 rounded-lg">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Incorrect Code. Access Denied.</span>
              </div>
            )}

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeyClick(num)}
                  className="bg-slate-800/90 hover:bg-slate-700 active:bg-amber-600 active:text-white border border-slate-700/50 rounded-xl py-2.5 font-mono font-bold text-base text-slate-100 transition-colors"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={handleClear}
                className="bg-slate-800/40 hover:bg-slate-800 border border-slate-800 rounded-xl py-2.5 text-xs font-bold text-slate-400 transition-colors"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => handleKeyClick('0')}
                className="bg-slate-800/90 hover:bg-slate-700 border border-slate-700/50 rounded-xl py-2.5 font-mono font-bold text-base text-slate-100 transition-colors"
              >
                0
              </button>
              <button
                type="submit"
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl py-2.5 flex items-center justify-center space-x-1 transition-colors"
              >
                <span>Unlock</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};
