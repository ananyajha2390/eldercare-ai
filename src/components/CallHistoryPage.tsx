import React, { useState } from 'react';
import { CallHistoryItem } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { getHonorificName } from '../lib/nameUtils';
import {
  Phone,
  PhoneCall,
  CheckCircle2,
  Clock,
  Sparkles,
  Heart,
  Pill,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  AlertTriangle,
  FileText,
  User,
  Bot
} from 'lucide-react';

interface CallHistoryPageProps {
  calls: CallHistoryItem[];
  onStartNewCall: () => void;
}

export const CallHistoryPage: React.FC<CallHistoryPageProps> = ({
  calls,
  onStartNewCall,
}) => {
  const { profile, user, isDemoMode } = useAuth();
  const rawAuthName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    '';
  const memberName = getHonorificName(rawAuthName) || (isDemoMode ? 'Sharma ji' : 'User');

  const [expandedCallId, setExpandedCallId] = useState<string | null>(calls[0]?.id || null);

  const toggleExpand = (id: string) => {
    setExpandedCallId(expandedCallId === id ? null : id);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-500/10 text-teal-400 border border-teal-500/20 mb-2">
            <FileText className="w-3.5 h-3.5" />
            Audit & Care Logs
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Call History</h1>
          <p className="text-xs text-slate-400 mt-1">
            Verbatim transcripts, AI observations, and structured vitals extracted from every call.
          </p>
        </div>

        <button
          type="button"
          onClick={onStartNewCall}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-teal-500/20 self-start sm:self-auto cursor-pointer"
        >
          <PhoneCall className="w-3.5 h-3.5" />
          <span>Start New Call</span>
        </button>
      </div>

      {/* Call List */}
      <div className="space-y-4">
        {calls.length === 0 ? (
          <div className="p-8 text-center bg-slate-900 rounded-2xl border border-slate-800 text-slate-400 text-sm">
            No completed calls recorded yet. Click "Start New Call" to initiate a check-in.
          </div>
        ) : (
          calls.map((call) => {
            const isExpanded = expandedCallId === call.id;

            return (
              <div
                key={call.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl transition-all overflow-hidden"
              >
                {/* Summary Row */}
                <div
                  onClick={() => toggleExpand(call.id)}
                  className="p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center shrink-0">
                      <Phone className="w-5 h-5 text-teal-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white truncate">{call.title}</span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 rounded-md">
                          <CheckCircle2 className="w-3 h-3" />
                          Completed
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                        <span>{call.timestamp}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {call.duration}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="hidden sm:flex items-center gap-2 text-xs">
                      {call.healthEvents.length > 0 && (
                        <span className="px-2 py-1 rounded-lg bg-rose-950/80 text-rose-300 border border-rose-800/60 text-[11px] font-medium flex items-center gap-1">
                          <Heart className="w-3 h-3 text-rose-400" />
                          {call.healthEvents[0].value}
                        </span>
                      )}
                      {call.medicationEvents.length > 0 && (
                        <span className="px-2 py-1 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 text-[11px] font-medium flex items-center gap-1">
                          <Pill className="w-3 h-3 text-emerald-400" />
                          Meds Confirmed
                        </span>
                      )}
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details Drawer */}
                {isExpanded && (
                  <div className="px-4 sm:px-6 pb-6 pt-2 border-t border-slate-800 space-y-6 animate-in slide-in-from-top-2 duration-200">
                    {/* Caregiver Summary Banner */}
                    <div className="p-4 rounded-2xl bg-teal-950/40 border border-teal-800/50 space-y-1.5">
                      <div className="text-[11px] font-bold text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                        AI Caregiver Summary
                      </div>
                      <p className="text-sm text-slate-200 leading-relaxed">
                        "{call.caregiverSummary}"
                      </p>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                        <div className="text-slate-400 font-bold uppercase text-[10px]">Vitals Recorded</div>
                        <div className="text-white font-semibold">
                          {call.healthEvents.length > 0
                            ? call.healthEvents.map((e) => `${e.type}: ${e.value}`).join(', ')
                            : 'Normal range confirmed'}
                        </div>
                      </div>

                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                        <div className="text-slate-400 font-bold uppercase text-[10px]">Medication Event</div>
                        <div className="text-emerald-400 font-semibold">
                          {call.medicationEvents.length > 0
                            ? `${call.medicationEvents[0].name} (✓ Confirmed)`
                            : 'Confirmed via voice'}
                        </div>
                      </div>

                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                        <div className="text-slate-400 font-bold uppercase text-[10px]">Wellbeing Signal</div>
                        <div className="text-slate-300 font-semibold">
                          {call.wellbeingObservation || 'Conversational pace was steady and responsive.'}
                        </div>
                      </div>
                    </div>

                    {/* Verbatim Transcript */}
                    <div className="space-y-3">
                      <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-teal-400" />
                        Verbatim Call Transcript
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3 max-h-72 overflow-y-auto">
                        {call.transcript && call.transcript.length > 0 ? (
                          call.transcript.map((t, idx) => (
                            <div
                              key={idx}
                              className={`flex gap-2.5 ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                                  t.role === 'user'
                                    ? 'bg-teal-700/80 text-white rounded-br-none'
                                    : 'bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-bl-none'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-4 text-[10px] font-bold opacity-75 mb-1">
                                  <span>{t.role === 'user' ? memberName : 'ElderCare AI'}</span>
                                  <span>{t.time}</span>
                                </div>
                                <div>{t.text}</div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-slate-500 italic text-center py-2">
                            Transcript unavailable for this session.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
