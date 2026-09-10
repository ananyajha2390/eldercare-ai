import React, { useState } from 'react';
import {
  Mic,
  Pill,
  Heart,
  Users,
  Volume2,
  VolumeX,
  X,
  Sparkles,
  PhoneCall,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Medication } from '../types';
import { voiceService } from '../services/voice';
import { useAuth } from '../contexts/AuthContext';
import { getGreeting } from '../lib/nameUtils';

interface SimpleElderlyModeProps {
  onExit: () => void;
  onOpenVoice: () => void;
  medications: Medication[];
  currentBP: string;
  onQuickVoiceUtterance: (text: string) => void;
  elderlyName?: string;
}

export const SimpleElderlyMode: React.FC<SimpleElderlyModeProps> = ({
  onExit,
  onOpenVoice,
  medications,
  currentBP,
  onQuickVoiceUtterance,
  elderlyName,
}) => {
  const { profile, user, isDemoMode } = useAuth();
  const rawName =
    elderlyName ||
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    (isDemoMode ? 'Sharma ji' : '');
  const greeting = getGreeting(rawName);

  const [activeTab, setActiveTab] = useState<'main' | 'medicines' | 'health' | 'family'>('main');
  const [spokenText, setSpokenText] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);

  const handleStartTalk = () => {
    setIsListening(true);
    setSpokenText('Listening... Please speak in Hindi or English.');

    const started = voiceService.startListening(
      (transcript, isFinal) => {
        setSpokenText(transcript);
        if (isFinal) {
          setIsListening(false);
          onQuickVoiceUtterance(transcript);
        }
      },
      () => {
        setIsListening(false);
        setSpokenText('Could not hear clearly. Tap below or choose a quick option.');
      },
      () => {
        setIsListening(false);
      }
    );

    if (!started) {
      setIsListening(false);
      onOpenVoice();
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDF9] text-slate-950 p-4 sm:p-8 flex flex-col justify-between select-none" id="simple-elderly-interface">
      {/* Top Bar with High-Contrast Exit */}
      <div className="flex items-center justify-between pb-4 border-b-2 border-slate-300">
        <div>
          <span className="text-xl sm:text-2xl font-black tracking-tight text-teal-900">
            ElderCare AI
          </span>
          <span className="ml-2 px-2.5 py-1 rounded-full bg-amber-200 text-amber-950 font-bold text-xs uppercase">
            Simple Elderly Mode
          </span>
        </div>

        <button
          type="button"
          onClick={onExit}
          className="px-4 py-2.5 rounded-2xl bg-slate-900 text-white text-sm font-extrabold hover:bg-slate-800 transition-all flex items-center gap-1.5 shadow-md"
        >
          <X className="w-4 h-4" />
          <span>Exit Simple Mode</span>
        </button>
      </div>

      {/* Main View Area */}
      {activeTab === 'main' && (
        <div className="my-auto py-8 text-center max-w-xl mx-auto space-y-8">
          {/* Greeting */}
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-5xl font-black text-slate-950 leading-tight">
              {greeting} 👋
            </h1>
            <p className="text-xl sm:text-2xl font-bold text-teal-800">
              How are you feeling today?
            </p>
          </div>

          {/* Huge Central Circular Button */}
          <div className="flex flex-col items-center justify-center">
            <button
              type="button"
              id="simple-talk-button"
              onClick={handleStartTalk}
              className={`w-64 h-64 sm:w-72 sm:h-72 rounded-full font-black text-white shadow-2xl flex flex-col items-center justify-center gap-3 transition-all duration-300 transform active:scale-95 cursor-pointer border-4 ${
                isListening
                  ? 'bg-gradient-to-tr from-emerald-500 to-teal-500 border-white ring-8 ring-emerald-300 animate-pulse'
                  : 'bg-gradient-to-tr from-teal-700 via-teal-600 to-emerald-600 border-white ring-8 ring-teal-200/70 hover:scale-105'
              }`}
            >
              <Mic className="w-20 h-20 sm:w-24 sm:h-24 drop-shadow-md" />
              <span className="text-xl sm:text-2xl tracking-wider uppercase font-black drop-shadow-sm">
                {isListening ? 'LISTENING...' : '🎙 TALK TO ELDERCARE'}
              </span>
              <span className="text-xs font-semibold text-teal-100">
                Tap anywhere to speak
              </span>
            </button>

            {spokenText && (
              <div className="mt-4 p-4 rounded-2xl bg-teal-50 border-2 border-teal-300 text-base sm:text-lg font-bold text-teal-950 max-w-md">
                "{spokenText}"
              </div>
            )}
          </div>

          {/* Quick Voice Options for Elderly Users */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => onQuickVoiceUtterance('Namaste, sab theek hai!')}
              className="px-4 py-2.5 rounded-full bg-white border-2 border-slate-300 text-sm font-extrabold text-slate-900 shadow-xs hover:border-teal-500"
            >
              "Sab theek hai"
            </button>
            <button
              type="button"
              onClick={() => onQuickVoiceUtterance('Thodi weakness hai.')}
              className="px-4 py-2.5 rounded-full bg-white border-2 border-slate-300 text-sm font-extrabold text-slate-900 shadow-xs hover:border-teal-500"
            >
              "Thodi weakness hai"
            </button>
            <button
              type="button"
              onClick={() => onQuickVoiceUtterance('Mera BP 128 by 82 hai.')}
              className="px-4 py-2.5 rounded-full bg-white border-2 border-slate-300 text-sm font-extrabold text-slate-900 shadow-xs hover:border-teal-500"
            >
              "Mera BP 128 by 82 hai"
            </button>
          </div>
        </div>
      )}

      {/* Medicines Subview in Simple Mode */}
      {activeTab === 'medicines' && (
        <div className="my-auto py-6 max-w-xl mx-auto w-full space-y-6">
          <div className="flex items-center justify-between border-b-2 border-slate-200 pb-3">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2">
              <Pill className="w-8 h-8 text-emerald-600" />
              <span>My Medicines</span>
            </h2>
            <button
              type="button"
              onClick={() => setActiveTab('main')}
              className="px-4 py-2 rounded-xl bg-slate-200 font-bold text-sm"
            >
              Back
            </button>
          </div>

          <div className="space-y-4">
            {medications.map(med => (
              <div
                key={med.id}
                className="p-5 rounded-2xl bg-white border-2 border-slate-300 shadow-sm flex items-center justify-between"
              >
                <div>
                  <div className="text-lg font-black text-slate-950">{med.time}</div>
                  <div className="text-base font-bold text-slate-800">{med.name}</div>
                  <div className="text-sm font-medium text-slate-600">{med.instruction}</div>
                </div>
                <span className={`px-4 py-2 rounded-xl text-sm font-black ${
                  med.status === 'taken' ? 'bg-emerald-100 text-emerald-950' : 'bg-amber-100 text-amber-950'
                }`}>
                  {med.status === 'taken' ? 'Taken ✓' : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Health Subview in Simple Mode */}
      {activeTab === 'health' && (
        <div className="my-auto py-6 max-w-xl mx-auto w-full space-y-6">
          <div className="flex items-center justify-between border-b-2 border-slate-200 pb-3">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2">
              <Heart className="w-8 h-8 text-rose-600" />
              <span>My Health Today</span>
            </h2>
            <button
              type="button"
              onClick={() => setActiveTab('main')}
              className="px-4 py-2 rounded-xl bg-slate-200 font-bold text-sm"
            >
              Back
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-6 rounded-2xl bg-white border-2 border-slate-300 shadow-sm text-center">
              <span className="text-sm font-bold text-slate-600 uppercase">Blood Pressure</span>
              <div className="text-3xl font-black text-slate-950 mt-1">{currentBP}</div>
              <span className="text-xs text-emerald-800 font-bold mt-1 block">Recorded 10:32 AM</span>
            </div>

            <div className="p-6 rounded-2xl bg-white border-2 border-slate-300 shadow-sm text-center">
              <span className="text-sm font-bold text-slate-600 uppercase">Blood Sugar</span>
              <div className="text-3xl font-black text-slate-950 mt-1">142 mg/dL</div>
              <span className="text-xs text-emerald-800 font-bold mt-1 block">Steady Baseline</span>
            </div>
          </div>
        </div>
      )}

      {/* Family Subview in Simple Mode */}
      {activeTab === 'family' && (
        <div className="my-auto py-6 max-w-xl mx-auto w-full space-y-6">
          <div className="flex items-center justify-between border-b-2 border-slate-200 pb-3">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2">
              <Users className="w-8 h-8 text-teal-600" />
              <span>My Family Circle</span>
            </h2>
            <button
              type="button"
              onClick={() => setActiveTab('main')}
              className="px-4 py-2 rounded-xl bg-slate-200 font-bold text-sm"
            >
              Back
            </button>
          </div>

          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-white border-2 border-slate-300 shadow-sm flex items-center justify-between">
              <div>
                <div className="text-lg font-black text-slate-950">Rahul Sharma (Son)</div>
                <div className="text-sm text-emerald-800 font-bold">● Online in Bengaluru</div>
              </div>
              <button
                type="button"
                onClick={() => alert("Calling Rahul Sharma (+91 98110 43210)...")}
                className="px-5 py-3 rounded-2xl bg-teal-700 text-white text-base font-black flex items-center gap-2"
              >
                <PhoneCall className="w-5 h-5" />
                <span>Call Rahul</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3 Giant Bottom Buttons: My Medicines, My Health, Family */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 pt-4 border-t-2 border-slate-300">
        <button
          type="button"
          id="btn-simple-medicines"
          onClick={() => setActiveTab('medicines')}
          className="py-4 sm:py-5 px-3 rounded-2xl bg-white hover:bg-slate-50 border-2 border-slate-300 text-slate-950 text-base sm:text-xl font-black flex flex-col items-center justify-center gap-1 shadow-sm active:scale-98"
        >
          <Pill className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-600" />
          <span>💊 My Medicines</span>
        </button>

        <button
          type="button"
          id="btn-simple-health"
          onClick={() => setActiveTab('health')}
          className="py-4 sm:py-5 px-3 rounded-2xl bg-white hover:bg-slate-50 border-2 border-slate-300 text-slate-950 text-base sm:text-xl font-black flex flex-col items-center justify-center gap-1 shadow-sm active:scale-98"
        >
          <Heart className="w-6 h-6 sm:w-8 sm:h-8 text-rose-600" />
          <span>❤️ My Health</span>
        </button>

        <button
          type="button"
          id="btn-simple-family"
          onClick={() => setActiveTab('family')}
          className="py-4 sm:py-5 px-3 rounded-2xl bg-white hover:bg-slate-50 border-2 border-slate-300 text-slate-950 text-base sm:text-xl font-black flex flex-col items-center justify-center gap-1 shadow-sm active:scale-98"
        >
          <Users className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600" />
          <span>👨‍👩‍👧 Family</span>
        </button>
      </div>
    </div>
  );
};
