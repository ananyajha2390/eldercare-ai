import React, { useState } from 'react';
import {
  X,
  Settings,
  Bell,
  Phone,
  Shield,
  Clock,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { isConfigured, isDemoMode, profile } = useAuth();

  const [whatsappAlerts, setWhatsappAlerts] = useState(true);
  const [unusualBPNotification, setUnusualBPNotification] = useState(true);
  const [missedCallEscalation, setMissedCallEscalation] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(true);
  const [savedMessage, setSavedMessage] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    setSavedMessage(true);
    setTimeout(() => {
      setSavedMessage(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Care Settings</h3>
              <p className="text-[11px] text-slate-500">Alert channels and notification preferences</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {savedMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Settings saved successfully.</span>
            </div>
          )}

          {/* Section: Alert Channels */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-teal-600" />
              <span>Caregiver Notifications</span>
            </h4>

            <div className="space-y-2.5">
              <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-xs cursor-pointer">
                <div>
                  <span className="font-semibold text-slate-800 block">Instant WhatsApp Alerts</span>
                  <span className="text-[10px] text-slate-500">Receive immediate pings when unusual vitals are logged</span>
                </div>
                <input
                  type="checkbox"
                  checked={whatsappAlerts}
                  onChange={(e) => setWhatsappAlerts(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-xs cursor-pointer">
                <div>
                  <span className="font-semibold text-slate-800 block">High BP / Sugar Warning Thresholds</span>
                  <span className="text-[10px] text-slate-500">Trigger alert if systolic exceeds 145 or blood sugar is over 180</span>
                </div>
                <input
                  type="checkbox"
                  checked={unusualBPNotification}
                  onChange={(e) => setUnusualBPNotification(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-xs cursor-pointer">
                <div>
                  <span className="font-semibold text-slate-800 block">Missed Call Escalation</span>
                  <span className="text-[10px] text-slate-500">Notify Rahul if Sharma ji does not answer after 45s</span>
                </div>
                <input
                  type="checkbox"
                  checked={missedCallEscalation}
                  onChange={(e) => setMissedCallEscalation(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-xs cursor-pointer">
                <div>
                  <span className="font-semibold text-slate-800 block">Daily 8:00 PM Family Digest</span>
                  <span className="text-[10px] text-slate-500">Concise 3-bullet summary of day's calls and wellbeing</span>
                </div>
                <input
                  type="checkbox"
                  checked={dailyDigest}
                  onChange={(e) => setDailyDigest(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4"
                />
              </label>
            </div>
          </div>

          {/* System status */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Supabase Auth:</span>
              <span className={`font-bold ${isConfigured ? 'text-emerald-700' : 'text-amber-700'}`}>
                {isConfigured ? 'Connected & Verified' : 'Demo Preview Active'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">AI Voice Engine:</span>
              <span className="font-bold text-teal-700">Gemini 2.5 Flash / Live</span>
            </div>
          </div>

          {/* Buttons */}
          <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 cursor-pointer shadow-sm"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
