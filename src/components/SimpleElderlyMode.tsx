import React, { useState, useEffect } from 'react';
import {
  Mic,
  Pill,
  Heart,
  Activity,
  PhoneCall,
  ArrowLeft,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Smile,
  Meh,
  Frown,
  AlertTriangle,
  Phone,
  Check,
  LayoutDashboard,
  Volume2
} from 'lucide-react';
import { Medication, FamilyMember, ElderlyProfile } from '../types';
import { voiceService } from '../services/voice';
import { useAuth } from '../contexts/AuthContext';
import { getGreeting } from '../lib/nameUtils';

export interface SimpleElderlyModeProps {
  onExit: () => void;
  onOpenVoice: (initialPrompt?: string) => void;
  medications: Medication[];
  onToggleMedication?: (id: string) => void;
  currentBP?: string;
  currentSugar?: string;
  currentMood?: string;
  isStable?: boolean;
  familyMembers?: FamilyMember[];
  elderlyProfile?: ElderlyProfile | null;
  onUpdateMood?: (mood: string) => void;
  elderlyName?: string;
}

export const SimpleElderlyMode: React.FC<SimpleElderlyModeProps> = ({
  onExit,
  onOpenVoice,
  medications,
  onToggleMedication,
  currentBP = '',
  currentSugar = '',
  currentMood = '',
  isStable = true,
  familyMembers = [],
  elderlyProfile,
  onUpdateMood,
  elderlyName,
}) => {
  const { profile, user } = useAuth();

  // Active view: 'home' | 'medicines' | 'health' | 'mood' | 'help'
  const [activeView, setActiveView] = useState<'home' | 'medicines' | 'health' | 'mood' | 'help'>('home');

  // Real-time clock for current date and time
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000 * 30);
    return () => clearInterval(timer);
  }, []);

  // Format date and time in clear, readable Hinglish/English format
  const formattedTime = currentTime.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const formattedDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  // Dynamic user name resolution - never hardcoded
  const rawName = (
    elderlyName ||
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    (user?.email ? user.email.split('@')[0] : '') ||
    elderlyProfile?.name ||
    ''
  ).trim();

  const greeting = getGreeting(rawName);

  // Medication counts
  const takenMedsCount = medications.filter((m) => m.status === 'taken').length;
  const pendingMedsCount = medications.length - takenMedsCount;

  // Feedback state for recorded actions
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const showFeedback = (msg: string, speakIt = false) => {
    setFeedbackMessage(msg);
    if (speakIt) {
      voiceService.speak(msg);
    }
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 6000);
  };

  const handleSelectMood = (moodKey: string, moodLabel: string, reassuranceMsg: string) => {
    if (onUpdateMood) {
      onUpdateMood(moodKey);
    }
    showFeedback(reassuranceMsg, true);
  };

  const handleMedToggle = (medId: string, medName: string, currentlyTaken: boolean) => {
    if (onToggleMedication) {
      onToggleMedication(medId);
      const msg = currentlyTaken
        ? `${medName} ko baki (pending) mark kiya gaya hai.`
        : `Bahut badhiya! ${medName} le li gayi hai ✓`;
      showFeedback(msg, true);
    }
  };

  return (
    <div
      className="min-h-screen bg-[#FAF9F6] text-slate-900 flex flex-col justify-between selection:bg-teal-100 selection:text-teal-900"
      id="elderly-mode-screen"
    >
      {/* ========================================================================= */}
      {/* ACCESSIBLE TOP HEADER: GREETING, DATE & TIME, & NORMAL MODE TOGGLE        */}
      {/* ========================================================================= */}
      <header className="bg-white border-b-2 border-slate-200 px-4 sm:px-8 py-4 sm:py-5 shadow-xs sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-black text-xl shadow-xs">
              ई
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-black text-teal-950 tracking-tight block">
                ElderCare AI
              </span>
              <span className="text-xs sm:text-sm font-bold text-slate-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-teal-600" />
                <span>{formattedDate} • {formattedTime}</span>
              </span>
            </div>
          </div>

          {/* Large High-Contrast Exit Button to return to normal dashboard */}
          <button
            type="button"
            id="exit-elderly-mode-btn"
            onClick={onExit}
            className="min-h-[50px] px-4 sm:px-6 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm sm:text-base flex items-center gap-2 shadow-sm transition-all cursor-pointer border-2 border-slate-900 focus:ring-4 focus:ring-slate-300"
            aria-label="Switch back to normal caregiver dashboard"
          >
            <LayoutDashboard className="w-5 h-5 text-teal-300" />
            <span className="hidden sm:inline">Normal Dashboard</span>
            <span className="sm:hidden">Wapas</span>
          </button>
        </div>
      </header>

      {/* Floating feedback alert for elderly user */}
      {feedbackMessage && (
        <div className="max-w-xl mx-auto w-full px-4 pt-4 sticky top-20 z-40">
          <div className="p-4 sm:p-5 rounded-2xl bg-teal-900 text-white border-2 border-teal-500 shadow-xl flex items-center gap-3 animate-fade-in">
            <Volume2 className="w-7 h-7 text-teal-300 shrink-0 animate-pulse" />
            <p className="text-base sm:text-lg font-bold flex-1">{feedbackMessage}</p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. HOME SCREEN: GREETING, HUGE VOICE ACTION & 4 LARGE FUNCTION BUTTONS    */}
      {/* ========================================================================= */}
      {activeView === 'home' && (
        <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col justify-center space-y-6 sm:space-y-8">
          {/* Top Greeting Banner */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl sm:text-5xl font-black text-slate-950 tracking-tight">
              {greeting} 🙏
            </h1>
            <p className="text-xl sm:text-2xl font-bold text-teal-800">
              Aaj aap kaise hain?
            </p>
          </div>

          {/* PRIMARY HUGE VOICE BUTTON: "BAAT KAREIN" */}
          <div className="flex justify-center pt-1">
            <button
              type="button"
              id="elderly-talk-button"
              onClick={() => onOpenVoice()}
              className="w-full max-w-xl min-h-[140px] sm:min-h-[160px] p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-teal-700 via-teal-800 to-emerald-800 text-white shadow-xl hover:shadow-2xl hover:scale-[1.01] active:scale-[0.99] border-4 border-white ring-4 ring-teal-600/30 flex items-center justify-between gap-4 transition-all cursor-pointer focus:ring-6 focus:ring-teal-400"
            >
              <div className="text-left space-y-1 sm:space-y-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/30 text-teal-200 text-xs sm:text-sm font-extrabold uppercase tracking-wider">
                  🎙️ Voice Assistant
                </span>
                <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
                  Baat Karein
                </h2>
                <p className="text-sm sm:text-lg font-medium text-teal-100">
                  ElderCare AI se bolkar baat karne ke liye yahan dabayein
                </p>
              </div>

              <div className="w-18 h-18 sm:w-22 sm:h-22 rounded-full bg-white text-teal-800 flex items-center justify-center shrink-0 shadow-lg border-4 border-teal-200">
                <Mic className="w-9 h-9 sm:w-11 sm:h-11" />
              </div>
            </button>
          </div>

          {/* 4 LARGE TOUCH ACTIONS (GRID) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 pt-2">
            {/* 1. MY MEDICINES */}
            <button
              type="button"
              id="elderly-medicines-btn"
              onClick={() => setActiveView('medicines')}
              className="min-h-[110px] p-5 sm:p-6 rounded-3xl bg-white hover:bg-emerald-50/50 border-3 border-slate-300 hover:border-emerald-600 shadow-sm hover:shadow-md text-left flex items-center justify-between gap-3 transition-all cursor-pointer active:scale-[0.98] focus:ring-4 focus:ring-emerald-200"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Pill className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-600" />
                  <span className="text-xl sm:text-2xl font-black text-slate-900">
                    Meri Dawaai
                  </span>
                </div>
                <p className="text-sm sm:text-base font-semibold text-slate-600">
                  {pendingMedsCount === 0
                    ? 'Sabhi dawaai li gayi ✓'
                    : `${takenMedsCount} Li gayi • ${pendingMedsCount} Baki`}
                </p>
              </div>
              <span className="px-3.5 py-1.5 rounded-xl bg-emerald-100 text-emerald-950 font-black text-xs sm:text-sm">
                Dekhein →
              </span>
            </button>

            {/* 2. HOW AM I FEELING? (MOOD CHECK) */}
            <button
              type="button"
              id="elderly-mood-btn"
              onClick={() => setActiveView('mood')}
              className="min-h-[110px] p-5 sm:p-6 rounded-3xl bg-white hover:bg-rose-50/50 border-3 border-slate-300 hover:border-rose-500 shadow-sm hover:shadow-md text-left flex items-center justify-between gap-3 transition-all cursor-pointer active:scale-[0.98] focus:ring-4 focus:ring-rose-200"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Heart className="w-7 h-7 sm:w-8 sm:h-8 text-rose-600" />
                  <span className="text-xl sm:text-2xl font-black text-slate-900">
                    Kaisa Lag Raha Hai?
                  </span>
                </div>
                <p className="text-sm sm:text-base font-semibold text-slate-600">
                  {currentMood ? `Mood: ${currentMood}` : 'Apna mood bolkar batayein'}
                </p>
              </div>
              <span className="px-3.5 py-1.5 rounded-xl bg-rose-100 text-rose-950 font-black text-xs sm:text-sm">
                Check →
              </span>
            </button>

            {/* 3. MY HEALTH */}
            <button
              type="button"
              id="elderly-health-btn"
              onClick={() => setActiveView('health')}
              className="min-h-[110px] p-5 sm:p-6 rounded-3xl bg-white hover:bg-indigo-50/50 border-3 border-slate-300 hover:border-indigo-600 shadow-sm hover:shadow-md text-left flex items-center justify-between gap-3 transition-all cursor-pointer active:scale-[0.98] focus:ring-4 focus:ring-indigo-200"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Activity className="w-7 h-7 sm:w-8 sm:h-8 text-indigo-600" />
                  <span className="text-xl sm:text-2xl font-black text-slate-900">
                    Mera Swasthya
                  </span>
                </div>
                <p className="text-sm sm:text-base font-semibold text-slate-600">
                  {currentBP ? `BP: ${currentBP}` : 'Blood pressure aur sugar'}
                </p>
              </div>
              <span className="px-3.5 py-1.5 rounded-xl bg-indigo-100 text-indigo-950 font-black text-xs sm:text-sm">
                Record →
              </span>
            </button>

            {/* 4. CALL FOR HELP */}
            <button
              type="button"
              id="elderly-help-btn"
              onClick={() => setActiveView('help')}
              className="min-h-[110px] p-5 sm:p-6 rounded-3xl bg-amber-50 hover:bg-amber-100/70 border-3 border-amber-400 hover:border-amber-600 shadow-sm hover:shadow-md text-left flex items-center justify-between gap-3 transition-all cursor-pointer active:scale-[0.98] focus:ring-4 focus:ring-amber-200"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <PhoneCall className="w-7 h-7 sm:w-8 sm:h-8 text-amber-700" />
                  <span className="text-xl sm:text-2xl font-black text-amber-950">
                    Madad Chahiye?
                  </span>
                </div>
                <p className="text-sm sm:text-base font-bold text-amber-900">
                  Caregiver ya helpline se sampark
                </p>
              </div>
              <span className="px-3.5 py-1.5 rounded-xl bg-amber-200 text-amber-950 font-black text-xs sm:text-sm border border-amber-300">
                Sampark →
              </span>
            </button>
          </div>
        </main>
      )}

      {/* ========================================================================= */}
      {/* 2. MEDICINE VIEW: TODAY'S MEDICINES WITH LARGE TOUCH TARGETS              */}
      {/* ========================================================================= */}
      {activeView === 'medicines' && (
        <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
          {/* Back Button */}
          <button
            type="button"
            onClick={() => setActiveView('home')}
            className="min-h-[56px] px-5 py-3 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-900 font-black text-base sm:text-lg flex items-center gap-2.5 transition-all cursor-pointer border-2 border-slate-300 shadow-xs"
          >
            <ArrowLeft className="w-6 h-6 text-slate-800" />
            <span>← Wapas Home Jayein</span>
          </button>

          {/* Heading */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border-2 border-slate-200 shadow-xs space-y-1">
            <div className="flex items-center gap-3">
              <Pill className="w-9 h-9 text-emerald-600" />
              <h2 className="text-2xl sm:text-4xl font-black text-slate-950">
                Aaj Ki Dawaai
              </h2>
            </div>
            <p className="text-base sm:text-lg font-medium text-slate-600">
              Samay par dawaai lene se sehat achhi rehti hai.
            </p>
          </div>

          {/* Medicines List */}
          <div className="space-y-4">
            {medications.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-3xl border-2 border-slate-200">
                <p className="text-xl font-bold text-slate-600">
                  Aaj ke liye koi dawaai scheduled nahi hai.
                </p>
              </div>
            ) : (
              medications.map((med) => {
                const isTaken = med.status === 'taken';
                return (
                  <div
                    key={med.id}
                    className={`p-5 sm:p-6 rounded-3xl border-3 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                      isTaken
                        ? 'bg-emerald-50/60 border-emerald-400 shadow-xs'
                        : 'bg-white border-slate-300 shadow-sm'
                    }`}
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-xl bg-slate-100 text-slate-800 font-extrabold text-sm sm:text-base border border-slate-200">
                          ⏰ {med.time}
                        </span>
                        <span
                          className={`px-3 py-1 rounded-xl font-black text-xs sm:text-sm ${
                            isTaken
                              ? 'bg-emerald-200 text-emerald-950'
                              : 'bg-amber-100 text-amber-950'
                          }`}
                        >
                          {isTaken ? 'Li gayi ✓ (Taken)' : 'Baki hai (Pending)'}
                        </span>
                      </div>

                      <h3 className="text-2xl sm:text-3xl font-black text-slate-950">
                        {med.name}
                      </h3>

                      <p className="text-base sm:text-lg font-bold text-slate-700">
                        {med.dosage} {med.instruction ? `• ${med.instruction}` : ''}
                      </p>
                    </div>

                    {/* Single Tap Toggle Button */}
                    <button
                      type="button"
                      onClick={() => handleMedToggle(med.id, med.name, isTaken)}
                      className={`w-full sm:w-auto min-h-[58px] px-6 py-3.5 rounded-2xl font-black text-base sm:text-lg flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm ${
                        isTaken
                          ? 'bg-emerald-700 text-white hover:bg-emerald-800 border-2 border-emerald-800'
                          : 'bg-teal-700 text-white hover:bg-teal-800 border-2 border-teal-800'
                      }`}
                    >
                      {isTaken ? (
                        <>
                          <Check className="w-6 h-6 text-emerald-300" />
                          <span>Li gayi ✓</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-6 h-6 text-teal-200" />
                          <span>Dawaai le li ✓</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Voice Helper Banner */}
          <div className="p-6 rounded-3xl bg-teal-50 border-2 border-teal-300 text-center space-y-3">
            <p className="text-base sm:text-lg font-bold text-teal-950">
              🎙️ Aap bolkar bhi confirm kar sakte hain:
            </p>
            <button
              type="button"
              onClick={() => onOpenVoice('Maine dawaai le li hai')}
              className="w-full min-h-[56px] px-6 py-3 rounded-2xl bg-teal-800 hover:bg-teal-900 text-white font-extrabold text-base sm:text-lg flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <Mic className="w-6 h-6 text-teal-300" />
              <span>Bolkar Batayein: "Maine dawaai le li"</span>
            </button>
          </div>
        </main>
      )}

      {/* ========================================================================= */}
      {/* 3. HEALTH VIEW: BP, SUGAR & WELLNESS SIMPLE STATUS                        */}
      {/* ========================================================================= */}
      {activeView === 'health' && (
        <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
          {/* Back Button */}
          <button
            type="button"
            onClick={() => setActiveView('home')}
            className="min-h-[56px] px-5 py-3 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-900 font-black text-base sm:text-lg flex items-center gap-2.5 transition-all cursor-pointer border-2 border-slate-300 shadow-xs"
          >
            <ArrowLeft className="w-6 h-6 text-slate-800" />
            <span>← Wapas Home Jayein</span>
          </button>

          {/* Heading */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border-2 border-slate-200 shadow-xs space-y-1">
            <div className="flex items-center gap-3">
              <Activity className="w-9 h-9 text-indigo-600" />
              <h2 className="text-2xl sm:text-4xl font-black text-slate-950">
                Mera Swasthya
              </h2>
            </div>
            <p className="text-base sm:text-lg font-medium text-slate-600">
              Aapka taaza health record aur wellness status.
            </p>
          </div>

          {/* Simple Health Cards */}
          <div className="space-y-4">
            {/* General Wellness Card */}
            <div className="p-6 rounded-3xl bg-white border-3 border-slate-300 shadow-sm flex items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-sm sm:text-base font-extrabold uppercase tracking-wider text-slate-500">
                  ❤️ General Wellness (Samanya Sehat)
                </span>
                <div className="text-2xl sm:text-3xl font-black text-slate-950">
                  {isStable ? 'Achha aur Sthir (Good)' : 'Thoda aaram zaroori hai'}
                </div>
              </div>
              <span
                className={`px-4 py-2 rounded-2xl font-black text-sm sm:text-base ${
                  isStable
                    ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                    : 'bg-amber-100 text-amber-950 border border-amber-300'
                }`}
              >
                {isStable ? 'Normal ✓' : 'Notice'}
              </span>
            </div>

            {/* Blood Pressure Card */}
            <div className="p-6 rounded-3xl bg-white border-3 border-slate-300 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm sm:text-base font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <span>🩺 Blood Pressure (BP)</span>
                </span>
                {currentBP && (
                  <span className="text-xs sm:text-sm font-bold text-teal-800 bg-teal-100 px-3 py-1 rounded-xl">
                    Recorded
                  </span>
                )}
              </div>

              {currentBP ? (
                <div>
                  <div className="text-4xl sm:text-5xl font-black text-slate-950">
                    {currentBP}
                  </div>
                  <p className="text-sm sm:text-base font-semibold text-slate-600 mt-1">
                    Baseline standard ke anusar
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <p className="text-base sm:text-lg font-bold text-slate-600">
                    Abhi koi reading available nahi hai.
                  </p>
                </div>
              )}
            </div>

            {/* Blood Sugar Card */}
            <div className="p-6 rounded-3xl bg-white border-3 border-slate-300 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm sm:text-base font-extrabold uppercase tracking-wider text-slate-500">
                  🩸 Blood Sugar (Glucose)
                </span>
                {currentSugar && (
                  <span className="text-xs sm:text-sm font-bold text-teal-800 bg-teal-100 px-3 py-1 rounded-xl">
                    Recorded
                  </span>
                )}
              </div>

              {currentSugar ? (
                <div>
                  <div className="text-4xl sm:text-5xl font-black text-slate-950">
                    {currentSugar}
                  </div>
                  <p className="text-sm sm:text-base font-semibold text-slate-600 mt-1">
                    Latest check-in value
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <p className="text-base sm:text-lg font-bold text-slate-600">
                    Abhi koi reading available nahi hai.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Voice Record Action */}
          <div className="p-6 rounded-3xl bg-indigo-50 border-2 border-indigo-200 text-center space-y-3">
            <p className="text-base sm:text-lg font-bold text-indigo-950">
              🎙️ Naya BP ya Sugar record karne ke liye bolkar batayein:
            </p>
            <button
              type="button"
              onClick={() => onOpenVoice('Mera BP note kar lijiye')}
              className="w-full min-h-[56px] px-6 py-3 rounded-2xl bg-indigo-800 hover:bg-indigo-900 text-white font-extrabold text-base sm:text-lg flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <Mic className="w-6 h-6 text-indigo-300" />
              <span>Voice se Reading Record Karein</span>
            </button>
          </div>
        </main>
      )}

      {/* ========================================================================= */}
      {/* 4. MOOD CHECK VIEW: VOICE-FIRST & 4 GIANT EMOJI OPTIONS                   */}
      {/* ========================================================================= */}
      {activeView === 'mood' && (
        <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
          {/* Back Button */}
          <button
            type="button"
            onClick={() => setActiveView('home')}
            className="min-h-[56px] px-5 py-3 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-900 font-black text-base sm:text-lg flex items-center gap-2.5 transition-all cursor-pointer border-2 border-slate-300 shadow-xs"
          >
            <ArrowLeft className="w-6 h-6 text-slate-800" />
            <span>← Wapas Home Jayein</span>
          </button>

          {/* Heading */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border-2 border-slate-200 shadow-xs space-y-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-3">
              <Heart className="w-9 h-9 text-rose-600" />
              <h2 className="text-2xl sm:text-4xl font-black text-slate-950">
                Aaj Kaisa Lag Raha Hai?
              </h2>
            </div>
            <p className="text-base sm:text-lg font-medium text-slate-600">
              Aap jo bhi feel kar rahe hain, aasaani se batayein.
            </p>
          </div>

          {/* VOICE-FIRST PRIMARY ACTION */}
          <button
            type="button"
            onClick={() => onOpenVoice('Aaj mera mood aisa hai')}
            className="w-full min-h-[90px] p-5 sm:p-6 rounded-3xl bg-teal-800 hover:bg-teal-900 text-white border-3 border-teal-950 shadow-md flex items-center justify-between gap-4 transition-all cursor-pointer active:scale-[0.99]"
          >
            <div className="text-left space-y-1">
              <span className="text-xl sm:text-2xl font-black text-white block">
                🎙️ Bolkar Batayein
              </span>
              <span className="text-sm sm:text-base font-medium text-teal-200">
                ElderCare AI se aawaaz mein baat karein
              </span>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-white text-teal-800 flex items-center justify-center shrink-0 shadow-sm">
              <Mic className="w-8 h-8" />
            </div>
          </button>

          {/* 4 GIANT EMOJI OPTIONS */}
          <div className="space-y-3 pt-2">
            <p className="text-base sm:text-lg font-bold text-slate-700 px-1">
              Ya yahan se chunein:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option 1: Achha */}
              <button
                type="button"
                onClick={() =>
                  handleSelectMood(
                    'good',
                    'Achha',
                    'Sunkar bahut khushi hui ki aap achha feel kar rahe hain! Humne ye note kar liya hai.'
                  )
                }
                className="min-h-[85px] p-5 rounded-3xl bg-white hover:bg-emerald-50 border-3 border-slate-300 hover:border-emerald-600 shadow-sm flex items-center gap-4 transition-all cursor-pointer text-left active:scale-[0.98]"
              >
                <span className="text-4xl sm:text-5xl">😊</span>
                <div>
                  <span className="text-2xl sm:text-3xl font-black text-slate-950 block">
                    Achha
                  </span>
                  <span className="text-sm sm:text-base font-semibold text-emerald-800">
                    Feeling Good & Active
                  </span>
                </div>
              </button>

              {/* Option 2: Theek-thaak */}
              <button
                type="button"
                onClick={() =>
                  handleSelectMood(
                    'neutral',
                    'Theek-thaak',
                    'Maine aapka update note kar liya hai. Samay par paani pijiye aur aaram kijiye.'
                  )
                }
                className="min-h-[85px] p-5 rounded-3xl bg-white hover:bg-blue-50 border-3 border-slate-300 hover:border-blue-500 shadow-sm flex items-center gap-4 transition-all cursor-pointer text-left active:scale-[0.98]"
              >
                <span className="text-4xl sm:text-5xl">😐</span>
                <div>
                  <span className="text-2xl sm:text-3xl font-black text-slate-950 block">
                    Theek-thaak
                  </span>
                  <span className="text-sm sm:text-base font-semibold text-blue-800">
                    Normal / Okay
                  </span>
                </div>
              </button>

              {/* Option 3: Udaas */}
              <button
                type="button"
                onClick={() =>
                  handleSelectMood(
                    'tired',
                    'Udaas',
                    'Aap chinta mat kijiye, hum hamesha aapke saath hain. Thoda aaram kijiye.'
                  )
                }
                className="min-h-[85px] p-5 rounded-3xl bg-white hover:bg-amber-50 border-3 border-slate-300 hover:border-amber-500 shadow-sm flex items-center gap-4 transition-all cursor-pointer text-left active:scale-[0.98]"
              >
                <span className="text-4xl sm:text-5xl">😔</span>
                <div>
                  <span className="text-2xl sm:text-3xl font-black text-slate-950 block">
                    Udaas
                  </span>
                  <span className="text-sm sm:text-base font-semibold text-amber-800">
                    Feeling Low / Tired
                  </span>
                </div>
              </button>

              {/* Option 4: Pareshan / Dard */}
              <button
                type="button"
                onClick={() =>
                  handleSelectMood(
                    'unwell',
                    'Pareshan',
                    'Aap bilkul aaram se baithiye aur paani pijiye. Agar zaroorat ho toh family ya doctor se baat karenge.'
                  )
                }
                className="min-h-[85px] p-5 rounded-3xl bg-white hover:bg-rose-50 border-3 border-slate-300 hover:border-rose-500 shadow-sm flex items-center gap-4 transition-all cursor-pointer text-left active:scale-[0.98]"
              >
                <span className="text-4xl sm:text-5xl">😟</span>
                <div>
                  <span className="text-2xl sm:text-3xl font-black text-slate-950 block">
                    Pareshan
                  </span>
                  <span className="text-sm sm:text-base font-semibold text-rose-800">
                    Unwell or In Pain
                  </span>
                </div>
              </button>
            </div>
          </div>
        </main>
      )}

      {/* ========================================================================= */}
      {/* 5. HELP VIEW: CAREGIVER CONTACTS & EMERGENCY HELPLINES                    */}
      {/* ========================================================================= */}
      {activeView === 'help' && (
        <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
          {/* Back Button */}
          <button
            type="button"
            onClick={() => setActiveView('home')}
            className="min-h-[56px] px-5 py-3 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-900 font-black text-base sm:text-lg flex items-center gap-2.5 transition-all cursor-pointer border-2 border-slate-300 shadow-xs"
          >
            <ArrowLeft className="w-6 h-6 text-slate-800" />
            <span>← Wapas Home Jayein</span>
          </button>

          {/* Heading */}
          <div className="bg-amber-50 p-5 sm:p-6 rounded-3xl border-2 border-amber-300 shadow-xs space-y-1">
            <div className="flex items-center gap-3">
              <PhoneCall className="w-9 h-9 text-amber-700" />
              <h2 className="text-2xl sm:text-4xl font-black text-amber-950">
                Madad Chahiye?
              </h2>
            </div>
            <p className="text-base sm:text-lg font-medium text-amber-900">
              Aap akele nahi hain. Apne parivar ya helpline se seedhe baat karein.
            </p>
          </div>

          {/* Caregiver & Family Contacts */}
          <div className="space-y-4">
            <h3 className="text-lg sm:text-xl font-black text-slate-900 px-1">
              👨‍👩‍👧 Aapke Caregiver & Parivar
            </h3>

            {familyMembers.length > 0 ? (
              familyMembers.map((member) => (
                <div
                  key={member.id}
                  className="p-5 sm:p-6 rounded-3xl bg-white border-3 border-slate-300 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <h4 className="text-2xl sm:text-3xl font-black text-slate-950">
                      {member.name}
                    </h4>
                    <p className="text-base sm:text-lg font-bold text-teal-800">
                      {member.relationship} • {member.phone || 'Phone configured'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    {member.phone && (
                      <a
                        href={`tel:${member.phone.replace(/[^0-9+]/g, '')}`}
                        className="flex-1 sm:flex-none min-h-[56px] px-6 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-base sm:text-lg flex items-center justify-center gap-2 shadow-sm"
                      >
                        <Phone className="w-5 h-5" />
                        <span>Direct Call</span>
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => onOpenVoice(`Call caregiver ${member.name}`)}
                      className="flex-1 sm:flex-none min-h-[56px] px-5 py-3 rounded-2xl bg-teal-800 hover:bg-teal-900 text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Mic className="w-5 h-5 text-teal-300" />
                      <span>AI Care Call</span>
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 rounded-3xl bg-white border-2 border-slate-200 text-center space-y-2">
                <p className="text-lg font-bold text-slate-700">
                  Caregiver contact details Family Hub mein jod sakte hain.
                </p>
                <button
                  type="button"
                  onClick={() => onOpenVoice('Mujhe madad chahiye')}
                  className="min-h-[54px] px-6 py-3 rounded-2xl bg-teal-800 text-white font-extrabold text-base flex items-center justify-center gap-2 mx-auto"
                >
                  <Mic className="w-5 h-5" />
                  <span>ElderCare AI se Baat Karein</span>
                </button>
              </div>
            )}
          </div>

          {/* National Helplines (India) */}
          <div className="space-y-3 pt-2">
            <h3 className="text-lg sm:text-xl font-black text-slate-900 px-1">
              🚨 Rashtriya Sahayata Helplines (India)
            </h3>

            <div className="space-y-3">
              {/* Elderline */}
              <a
                href="tel:14567"
                className="p-5 rounded-3xl bg-white hover:bg-slate-50 border-3 border-teal-600 shadow-sm flex items-center justify-between gap-3 transition-all cursor-pointer block"
              >
                <div>
                  <span className="text-xl sm:text-2xl font-black text-slate-950 block">
                    Elderline (Senior Citizen Helpline)
                  </span>
                  <span className="text-sm sm:text-base font-semibold text-slate-600">
                    Government toll-free helpline for seniors
                  </span>
                </div>
                <span className="px-5 py-3 rounded-2xl bg-teal-700 text-white font-black text-lg sm:text-xl shrink-0">
                  📞 14567
                </span>
              </a>

              {/* Medical / Ambulance */}
              <a
                href="tel:108"
                className="p-5 rounded-3xl bg-white hover:bg-slate-50 border-3 border-rose-500 shadow-sm flex items-center justify-between gap-3 transition-all cursor-pointer block"
              >
                <div>
                  <span className="text-xl sm:text-2xl font-black text-slate-950 block">
                    Ambulance / Medical Emergency
                  </span>
                  <span className="text-sm sm:text-base font-semibold text-slate-600">
                    Aapatsampark Chikitsa Seva
                  </span>
                </div>
                <span className="px-5 py-3 rounded-2xl bg-rose-700 text-white font-black text-lg sm:text-xl shrink-0">
                  🚑 108
                </span>
              </a>

              {/* National Emergency */}
              <a
                href="tel:112"
                className="p-5 rounded-3xl bg-white hover:bg-slate-50 border-3 border-slate-400 shadow-sm flex items-center justify-between gap-3 transition-all cursor-pointer block"
              >
                <div>
                  <span className="text-xl sm:text-2xl font-black text-slate-950 block">
                    National Emergency Helpline
                  </span>
                  <span className="text-sm sm:text-base font-semibold text-slate-600">
                    All-in-one emergency response
                  </span>
                </div>
                <span className="px-5 py-3 rounded-2xl bg-slate-900 text-white font-black text-lg sm:text-xl shrink-0">
                  🚨 112
                </span>
              </a>
            </div>

            <p className="text-xs sm:text-sm text-slate-500 text-center pt-2">
              Note: Button par dabane par aapke phone ka dialer khulega. Bina aapke dabaye koi call nahi lagegi.
            </p>
          </div>
        </main>
      )}

      {/* ========================================================================= */}
      {/* BOTTOM FOOTER: SIMPLE LANGUAGE & VOICE ASSISTANCE INDICATOR               */}
      {/* ========================================================================= */}
      <footer className="bg-white border-t-2 border-slate-200 py-3 sm:py-4 px-4 text-center">
        <p className="text-xs sm:text-sm font-bold text-slate-500">
          ElderCare AI Saral Mode • Sahaj, Surakshit aur Aawaaz-Pratham
        </p>
      </footer>
    </div>
  );
};
