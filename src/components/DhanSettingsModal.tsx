import React, { useState } from 'react';
import { X, Key, Calendar, ShieldCheck, CheckCircle2, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { DhanApiCredentials } from '../types';

interface DhanSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  credentials: DhanApiCredentials;
  onSaveCredentials: (creds: DhanApiCredentials) => void;
}

export const DhanSettingsModal: React.FC<DhanSettingsModalProps> = ({
  isOpen,
  onClose,
  credentials,
  onSaveCredentials
}) => {
  const [clientId, setClientId] = useState(credentials.clientId || '');
  const [accessToken, setAccessToken] = useState(credentials.accessToken || '');
  const [date, setDate] = useState(credentials.date || new Date().toISOString().split('T')[0]);
  const [segment, setSegment] = useState<'NSE_EQ' | 'NSE_FNO'>(credentials.segment || 'NSE_EQ');
  
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!clientId || !accessToken) {
      setVerifyStatus({
        success: false,
        message: 'Please enter both Client ID and Access Token first.'
      });
      return;
    }

    setIsVerifying(true);
    setVerifyStatus(null);

    try {
      const res = await fetch('/api/dhan/verify-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, accessToken })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setVerifyStatus({
          success: true,
          message: 'Dhan API credentials verified successfully!'
        });
      } else {
        setVerifyStatus({
          success: false,
          message: data.error || 'Failed to authenticate with Dhan HQ API.'
        });
      }
    } catch (err: any) {
      setVerifyStatus({
        success: false,
        message: err.message || 'Network error while reaching server proxy.'
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSave = () => {
    onSaveCredentials({
      clientId: clientId.trim(),
      accessToken: accessToken.trim(),
      date,
      segment,
      isConfigured: Boolean(clientId.trim() && accessToken.trim())
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-xl text-slate-800 relative">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-50 rounded-xl border border-blue-200/60 text-blue-600">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Dhan HQ API Settings</h3>
              <p className="text-xs text-slate-500">Configure your Data API credentials for live 15-min candles</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <div className="mt-5 space-y-4">

          {/* Client ID */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Dhan Client ID
            </label>
            <input
              type="text"
              placeholder="e.g., 1000000123"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full bg-white border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-mono outline-none transition-colors shadow-2xs"
            />
          </div>

          {/* Access Token */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Dhan Access Token (JWT)
            </label>
            <textarea
              rows={3}
              placeholder="Paste your Dhan Data Access Token here..."
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              className="w-full bg-white border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono outline-none transition-colors resize-none shadow-2xs"
            />
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
              <span>Generate token in Dhan Web portal &gt; Profile &gt; Data API Settings</span>
              <a 
                href="https://dhanhq.co/" 
                target="_blank" 
                rel="noreferrer"
                className="text-blue-600 hover:underline flex items-center gap-1 font-medium"
              >
                Dhan HQ Portal <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Segment & Date */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Market Segment
              </label>
              <select
                value={segment}
                onChange={(e) => setSegment(e.target.value as 'NSE_EQ' | 'NSE_FNO')}
                className="w-full bg-white border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none font-medium shadow-2xs"
              >
                <option value="NSE_EQ">NSE Equity (NSE_EQ)</option>
                <option value="NSE_FNO">NSE Futures & Options (NSE_FNO)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-600" /> Trading Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-white border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none font-medium shadow-2xs"
              />
            </div>
          </div>

          {/* Test Status Banner */}
          {verifyStatus && (
            <div className={`p-3 rounded-xl border text-xs flex items-start space-x-2 ${
              verifyStatus.success
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}>
              {verifyStatus.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span>{verifyStatus.message}</span>
            </div>
          )}

        </div>

        {/* Modal Actions */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isVerifying}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium border border-slate-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin text-blue-600' : ''}`} />
            <span>{isVerifying ? 'Testing...' : 'Test Credentials'}</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center space-x-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Save & Apply</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
