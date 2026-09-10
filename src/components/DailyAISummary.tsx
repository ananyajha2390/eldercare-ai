import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Heart,
  Pill,
  Smile,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { aiService } from '../services/aiService';

interface DailyAISummaryProps {
  currentBP?: string | null;
  currentSugar?: string | null;
  medsTakenText?: string | null;
  moodText?: string | null;
  lastCheckIn?: string | null;
  elderlyName?: string;
  caregiverName?: string;
  hasRealData?: boolean;
}

export const DailyAISummary: React.FC<DailyAISummaryProps> = ({
  currentBP,
  currentSugar,
  medsTakenText,
  moodText,
  lastCheckIn,
  elderlyName,
  caregiverName,
  hasRealData = false,
}) => {
  const [summaryText, setSummaryText] = useState<string>(
    hasRealData
      ? 'Synthesizing today\'s health updates...'
      : 'No health or check-in data has been recorded today.'
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!hasRealData) {
      setSummaryText('No health or check-in data has been recorded today.');
      return;
    }

    // If real data exists, generate dynamic summary
    const loadSummary = async () => {
      setIsLoading(true);
      try {
        const text = await aiService.getDailySummary(
          { bp: currentBP || undefined, sugar: currentSugar || undefined },
          medsTakenText || '0/0 Taken',
          moodText ? `Reported mood: ${moodText}.` : '',
          {
            elderlyName,
            caregiverName,
            checkInTime: lastCheckIn || undefined,
            mood: moodText || undefined,
            hasData: true,
          }
        );
        setSummaryText(text);
      } catch (err) {
        console.warn('Summary load error:', err);
        setSummaryText('No health or check-in data has been recorded today.');
      } finally {
        setIsLoading(false);
      }
    };

    loadSummary();
  }, [hasRealData, currentBP, currentSugar, medsTakenText, moodText, lastCheckIn, elderlyName, caregiverName]);

  const handleRegenerate = async () => {
    if (!hasRealData) {
      setSummaryText('No health or check-in data has been recorded today.');
      return;
    }

    setIsLoading(true);
    try {
      const updated = await aiService.getDailySummary(
        { bp: currentBP || undefined, sugar: currentSugar || undefined },
        medsTakenText || '0/0 Taken',
        moodText ? `Reported mood: ${moodText}. Check-in completed.` : '',
        {
          elderlyName,
          caregiverName,
          checkInTime: lastCheckIn || undefined,
          mood: moodText || undefined,
          hasData: true,
        }
      );
      setSummaryText(updated);
    } catch (err) {
      console.warn('Summary regeneration error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const bpDisplay = currentBP || '-- / --';
  const medsDisplay = medsTakenText || 'No records';
  const moodDisplay = moodText || 'No check-in';
  const checkInDisplay = lastCheckIn || 'None today';

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs mb-8" id="daily-ai-summary">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center shadow-md shadow-teal-600/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Today's AI Summary
            </h3>
            <p className="text-xs text-slate-500">
              Synthesized from recorded voice dialogues, vital readings, and medication records
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRegenerate}
          disabled={isLoading}
          className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-teal-600' : ''}`} />
          <span>{isLoading ? 'Synthesizing...' : 'Regenerate Summary'}</span>
        </button>
      </div>

      {/* Narrative AI Summary Body */}
      <div className="rounded-2xl p-5 bg-gradient-to-r from-teal-50/70 via-[#FBFBFA] to-emerald-50/40 border border-teal-100 mb-6">
        <p className="text-sm sm:text-base font-medium text-slate-800 leading-relaxed italic">
          "{summaryText}"
        </p>
      </div>

      {/* Snapshot Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
          <div className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold mb-1">
            <Pill className="w-3.5 h-3.5 text-emerald-600" />
            <span>Medication</span>
          </div>
          <div className="text-sm font-bold text-slate-900">{medsDisplay}</div>
          <div className="text-[10px] text-slate-500 font-medium">
            {hasRealData && medsTakenText ? 'Today\'s status' : 'No records logged'}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
          <div className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold mb-1">
            <Heart className="w-3.5 h-3.5 text-rose-500" />
            <span>Blood Pressure</span>
          </div>
          <div className="text-sm font-bold text-slate-900">{bpDisplay}</div>
          <div className="text-[10px] text-slate-500">
            {hasRealData && currentBP ? 'Recorded today' : 'No reading today'}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
          <div className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold mb-1">
            <Smile className="w-3.5 h-3.5 text-sky-600" />
            <span>Mood / Tone</span>
          </div>
          <div className="text-sm font-bold text-slate-900 capitalize">{moodDisplay}</div>
          <div className="text-[10px] text-slate-500">
            {hasRealData && moodText ? 'Reported during check-in' : 'Awaiting check-in'}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
          <div className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold mb-1">
            <Clock className="w-3.5 h-3.5 text-teal-600" />
            <span>Check-in Time</span>
          </div>
          <div className="text-sm font-bold text-slate-900">{checkInDisplay}</div>
          <div className="text-[10px] text-slate-500 font-medium">
            {hasRealData && lastCheckIn ? 'Voice check-in verified' : 'No call logged'}
          </div>
        </div>
      </div>
    </div>
  );
};
