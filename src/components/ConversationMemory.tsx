import React from 'react';
import { ConversationInsight } from '../types';
import {
  BrainCircuit,
  AlertCircle,
  ShieldCheck,
  Calendar,
  Sparkles,
  Info
} from 'lucide-react';

interface ConversationMemoryProps {
  insights: ConversationInsight[];
}

export const ConversationMemory: React.FC<ConversationMemoryProps> = ({
  insights,
}) => {
  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs mb-8" id="conversation-memory">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Conversation Insights & Memory
            </h3>
            <p className="text-xs text-slate-500">
              Safe conversational cadence and wellness pattern observations over time
            </p>
          </div>
        </div>

        <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60 self-start sm:self-auto">
          Pattern Observation Only
        </span>
      </div>

      {/* Observation Items List */}
      <div className="space-y-3.5 mb-6">
        {insights.map(item => (
          <div
            key={item.id}
            className="p-4 rounded-2xl bg-[#FBFBFA] border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">
                  {item.date}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    item.significance === 'noteworthy'
                      ? 'bg-amber-100 text-amber-900'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {item.significance === 'noteworthy' ? 'Noteworthy Pattern' : 'Routine Note'}
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-800">
                "{item.observation}"
              </p>
              <p className="text-xs text-slate-500">
                Insight context: {item.safetyGuidance}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Required Safe Medical Guidance & Prominent Disclaimer */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
          <Info className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>Clinical Safety Guideline</span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          "Repeated changes in conversation patterns or recall may be worth discussing with a healthcare professional during routine wellness appointments."
        </p>
        <div className="pt-2 border-t border-slate-200/60 text-[11px] font-medium text-slate-500">
          Disclaimer: ElderCare AI provides supportive observations and does not diagnose medical conditions, dementia, or cognitive disorders.
        </div>
      </div>
    </div>
  );
};
