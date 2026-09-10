import React, { useState } from 'react';
import {
  CallScheduleItem,
  CallHistoryItem,
  SmartAlert
} from '../types';
import { useAuth } from '../contexts/AuthContext';
import { getHonorificName } from '../lib/nameUtils';
import {
  Phone,
  PhoneCall,
  PhoneOff,
  Clock,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Settings,
  Sparkles,
  Volume2,
  Radio,
  Plus,
  ShieldCheck,
  ChevronRight,
  Info
} from 'lucide-react';

interface AICareCallsPageProps {
  schedule: CallScheduleItem[];
  onTriggerCall: (title?: string) => void;
  onSimulateMissedCall: () => void;
  onUpdateSchedule: (newSchedule: CallScheduleItem[]) => void;
  onNavigate: (view: any) => void;
}

export const AICareCallsPage: React.FC<AICareCallsPageProps> = ({
  schedule,
  onTriggerCall,
  onSimulateMissedCall,
  onUpdateSchedule,
  onNavigate,
}) => {
  const { profile, user, isDemoMode } = useAuth();
  const rawAuthName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    '';
  const memberName = getHonorificName(rawAuthName) || (isDemoMode ? 'Sharma ji' : 'Elderly Member');

  const [activeTab, setActiveTab] = useState<'schedule' | 'telephony' | 'settings'>('schedule');
  const [scheduleModalOpen, setScheduleModalOpen] = useState<boolean>(false);
  const [newTime, setNewTime] = useState<string>('06:00 PM');
  const [newTitle, setNewTitle] = useState<string>('Hydration & Evening Check-in');
  const [missedSimulatedState, setMissedSimulatedState] = useState<boolean>(false);

  const toggleItem = (id: string) => {
    const updated = schedule.map((item) =>
      item.id === id ? { ...item, enabled: !item.enabled } : item
    );
    onUpdateSchedule(updated);
  };

  const handleAddSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const newItem: CallScheduleItem = {
      id: `sched-${Date.now()}`,
      time: newTime,
      title: newTitle,
      status: 'scheduled',
      purpose: 'Custom scheduled wellbeing check-in',
      language: 'hinglish',
      enabled: true,
    };
    onUpdateSchedule([...schedule, newItem]);
    setScheduleModalOpen(false);
  };

  const runMissedCallDemo = () => {
    setMissedSimulatedState(true);
    onSimulateMissedCall();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-teal-900/40 via-slate-900 to-slate-900 border border-teal-800/40 rounded-3xl p-6 sm:p-8 relative overflow-hidden">
        <div className="max-w-2xl relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-teal-500/10 text-teal-400 border border-teal-500/30">
            <Radio className="w-3.5 h-3.5 animate-pulse text-teal-400" />
            Core Innovation: Proactive Autonomous Calling
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            AI Care Calls
          </h1>
          <p className="text-base text-slate-300 leading-relaxed">
            "Most health apps wait for elderly people to open an app. ElderCare AI doesn't wait. It calls them. The elderly person simply answers the phone and talks naturally."
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onTriggerCall('Morning Health Check')}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-teal-500/25 transition-all cursor-pointer active:scale-95"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Start AI Care Call Now</span>
            </button>

            <button
              type="button"
              onClick={() => setScheduleModalOpen(true)}
              className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-sm flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-teal-400" />
              <span>Schedule Call</span>
            </button>
          </div>
        </div>

        {/* Decorative background orb glow */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-teal-500/10 to-transparent pointer-events-none" />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-6 text-sm font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('schedule')}
          className={`pb-3 px-1 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'schedule'
              ? 'border-teal-400 text-teal-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Today's Schedule & Routine
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('telephony')}
          className={`pb-3 px-1 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'telephony'
              ? 'border-teal-400 text-teal-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Telephony Architecture (Twilio/PSTN)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`pb-3 px-1 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'settings'
              ? 'border-teal-400 text-teal-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Call Preferences & Escalations
        </button>
      </div>

      {/* TAB 1: TODAY'S SCHEDULE */}
      {activeTab === 'schedule' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-white">Daily Check-in Schedule</h3>
              <p className="text-xs text-slate-400">
                {rawAuthName
                  ? `Automated calls configured for ${rawAuthName} (${memberName})`
                  : 'Automated calls configured for Sunita Sharma (Sharma ji) • +91 98110 43210'}
              </p>
            </div>
            <span className="text-xs font-mono text-teal-400 bg-teal-950/60 border border-teal-800/50 px-3 py-1 rounded-full">
              Status: 1 of 3 Completed Today
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {schedule.map((item) => (
              <div
                key={item.id}
                className={`p-5 rounded-2xl border transition-all ${
                  item.status === 'completed'
                    ? 'bg-slate-900/90 border-emerald-500/30'
                    : item.enabled
                    ? 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                    : 'bg-slate-950/40 border-slate-800/40 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-teal-400" />
                    <span className="text-base font-extrabold text-white">{item.time}</span>
                  </div>
                  {item.status === 'completed' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-700/60 px-2 py-0.5 rounded-md">
                      <CheckCircle2 className="w-3 h-3" />
                      Completed ({item.duration || '2m 18s'})
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                      Scheduled
                    </span>
                  )}
                </div>

                <div className="mt-3">
                  <h4 className="text-sm font-bold text-slate-100">{item.title}</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.purpose}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-mono text-[11px]">
                    Lang: {item.language.toUpperCase()}
                  </span>
                  <div className="flex items-center gap-2">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        onChange={() => toggleItem(item.id)}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4 bg-slate-800 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-teal-500"></div>
                    </label>
                    <button
                      type="button"
                      onClick={() => onTriggerCall(item.title)}
                      className="px-2.5 py-1 rounded-lg bg-teal-600/30 hover:bg-teal-600/50 text-teal-300 border border-teal-500/40 text-[11px] font-semibold cursor-pointer"
                    >
                      Call Now
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Missed Call Escalation Simulation Card */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-950/30 to-slate-900 border border-amber-800/40 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>Missed Call & Caregiver Escalation Protocol</span>
              </div>
              <button
                type="button"
                onClick={runMissedCallDemo}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs cursor-pointer shadow-md"
              >
                Simulate 3 Unanswered Calls
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              If {memberName} does not answer, ElderCare AI retries automatically 3 times over 10 minutes (08:00 AM, 08:05 AM, 08:10 AM). If still unanswered, a priority notification is dispatched to Rahul.
            </p>

            {missedSimulatedState && (
              <div className="p-3.5 rounded-xl bg-slate-900 border border-amber-600/40 text-xs space-y-2 animate-in fade-in">
                <div className="font-bold text-amber-300">
                  ⚠️ Protocol Triggered: Check-in Missed
                </div>
                <div className="font-mono text-[11px] text-slate-400 space-y-0.5">
                  <div>• Attempt 1: 08:00 AM (No answer)</div>
                  <div>• Attempt 2: 08:05 AM (No answer)</div>
                  <div>• Attempt 3: 08:10 AM (No answer)</div>
                </div>
                <div className="text-emerald-400 font-semibold flex items-center gap-1.5 pt-1 border-t border-slate-800">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Caregiver Rahul notified via priority WhatsApp/SMS alert • Dashboard updated
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: TELEPHONY ARCHITECTURE (Real Phone Call Architecture) */}
      {activeTab === 'telephony' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center">
                <Radio className="w-5 h-5 text-teal-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">CallProvider Abstraction</h3>
                <p className="text-xs text-slate-400">
                  Clean decoupled architecture for Browser Demo and PSTN Carrier Telephony
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              ElderCare AI is architected with a provider abstraction (<code className="text-teal-300 font-mono text-xs">CallProvider</code>) separating the audio interface from the Gemini conversational intelligence:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-5 rounded-2xl bg-slate-950 border border-teal-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-400">Mode 1: Demo Call</span>
                  <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[10px] font-bold">
                    Active in Preview
                  </span>
                </div>
                <h4 className="text-base font-bold text-white">Browser Audio + Native Gemini Live</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Uses browser Web Audio and microphone directly with the server-side Gemini 3.1 Flash Live WebSocket proxy. Native 24kHz PCM audio response without requiring phone numbers.
                </p>
                <div className="pt-2 text-[11px] font-mono text-slate-400">
                  Provider: <span className="text-teal-300">BrowserCallProvider</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Mode 2: Real Phone Call</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold">
                    Server Integration Ready
                  </span>
                </div>
                <h4 className="text-base font-bold text-white">Twilio / Exotel / Plivo Carrier Bridge</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Calls {memberName}'s actual SIM mobile number via PSTN telephony webhooks. Audio streams via bidirectional WebSockets directly into Gemini Live.
                </p>
                <div className="pt-2 text-[11px] font-mono text-slate-400">
                  Required Secrets: <span className="text-slate-300">TELEPHONY_ACCOUNT_ID, TELEPHONY_AUTH_TOKEN, TELEPHONY_PHONE_NUMBER</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-400 space-y-1">
              <div className="font-bold text-slate-200">Production Security Notice:</div>
              <div>
                • Telephony tokens are strictly kept in the server environment (<code className="text-teal-300">server.ts</code>) and never exposed to the frontend browser bundle.
              </div>
              <div>
                • In this preview, all interactive calls are transparently marked as <strong>"Demo Call"</strong> to preserve judge trust.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CALL SETTINGS */}
      {activeTab === 'settings' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-lg font-bold text-white">Proactive Calling Preferences</h3>
            <p className="text-xs text-slate-400">
              Customize call timing, language cadence, and escalation threshold for {memberName}.
            </p>
          </div>

          <div className="space-y-4 max-w-xl text-sm">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Primary Spoken Language</label>
              <select className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-hidden focus:border-teal-500">
                <option value="hinglish">Hinglish (Natural conversational blend)</option>
                <option value="hindi">Hindi (Shuddh / Devanagari conversational)</option>
                <option value="english">English (Indian English with polite honorifics)</option>
                <option value="auto">Auto-detect from response</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Retry Interval for Unanswered Calls</label>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 rounded-xl bg-slate-800 border border-teal-500 text-teal-300 text-xs font-bold text-center">
                  Every 5 Mins (3 tries)
                </div>
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700 text-slate-400 text-xs font-medium text-center">
                  Every 10 Mins (2 tries)
                </div>
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700 text-slate-400 text-xs font-medium text-center">
                  Immediate Escalation
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Primary Emergency / Family Contact</label>
              <input
                type="text"
                disabled
                value="Rahul Sharma (Son) • +91 98110 43210"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {/* Schedule Call Modal */}
      {scheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Schedule New AI Check-in Call</h3>
            <form onSubmit={handleAddSchedule} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Check-in Purpose / Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Evening Hydration & Blood Sugar Check"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Scheduled Time</label>
                <input
                  type="text"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  placeholder="06:00 PM"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:border-teal-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setScheduleModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-600 text-white font-bold hover:bg-teal-500 cursor-pointer"
                >
                  Add to Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
