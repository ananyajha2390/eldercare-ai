import React, { useState, useEffect } from 'react';
import { AIOrb } from './AIOrb';
import {
  Mic,
  Activity,
  ShieldCheck,
  CheckCircle2,
  Users,
  Sparkles,
  ArrowRight,
  Heart,
  Volume2,
  LogIn,
  UserPlus,
  PlayCircle
} from 'lucide-react';
import { AppView } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface HeroSectionProps {
  onNavigate: (view: AppView) => void;
  onQuickVoiceTest: () => void;
  onStartCall: () => void;
  onStartDemo?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onNavigate,
  onQuickVoiceTest,
  onStartCall,
  onStartDemo,
}) => {
  const { user, isDemoMode } = useAuth();
  const isAuthenticated = Boolean(user || isDemoMode);
  const animatedPhrases = [
    'AI calls.',
    'AI listens.',
    'Family stays connected.',
  ];

  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex(prev => (prev + 1) % animatedPhrases.length);
    }, 2400);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative overflow-hidden pt-6 pb-16 lg:pt-12 lg:pb-24" id="hero-section">
      {/* Subtle ambient light gradient background */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-gradient-to-tr from-teal-200/25 via-emerald-100/30 to-sky-100/20 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Story & CTAs */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            {/* Tagline Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50/90 border border-teal-200/70 text-teal-800 text-xs font-semibold shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              <span>Care that calls. Care that listens.</span>
            </div>

            {/* Main Hero Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.14]">
              What if checking on your parents was{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600">
                just a phone call away?
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto lg:mx-0 font-normal leading-relaxed">
              ElderCare AI proactively calls elderly family members, talks naturally in Hindi, Hinglish and English, helps track medicines and health readings, and keeps caregivers informed.
            </p>

            {/* Flow Banner: AI Calling -> Voice Conversation -> Health Understanding -> Family Dashboard */}
            <div className="p-3 bg-slate-100/80 rounded-2xl border border-slate-200/80 flex flex-wrap items-center justify-center lg:justify-start gap-2 text-[11px] font-semibold text-slate-700">
              <span className="px-2 py-0.5 rounded-md bg-white text-teal-800 shadow-2xs font-bold">1. AI Calling</span>
              <span className="text-slate-400">→</span>
              <span className="px-2 py-0.5 rounded-md bg-white text-teal-800 shadow-2xs font-bold">2. Voice Conversation</span>
              <span className="text-slate-400">→</span>
              <span className="px-2 py-0.5 rounded-md bg-white text-teal-800 shadow-2xs font-bold">3. Health Understanding</span>
              <span className="text-slate-400">→</span>
              <span className="px-2 py-0.5 rounded-md bg-white text-emerald-800 shadow-2xs font-bold">4. Family Dashboard</span>
            </div>

            {/* Animated 3-phrase switcher */}
            <div className="flex items-center justify-center lg:justify-start gap-3 py-1">
              <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">Innovation:</span>
              <div className="h-8 flex items-center overflow-hidden">
                <div
                  key={phraseIndex}
                  className="text-lg sm:text-xl font-extrabold text-teal-700 transition-all duration-500 transform translate-y-0 opacity-100 animate-in fade-in slide-in-from-bottom-2"
                >
                  "{animatedPhrases[phraseIndex]}"
                </div>
              </div>
            </div>

            {/* Primary & Secondary CTAs */}
            {isAuthenticated ? (
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
                <button
                  type="button"
                  id="hero-start-voice-btn"
                  onClick={onStartCall}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-lg shadow-teal-600/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 cursor-pointer group"
                >
                  <span>📞 Start AI Care Call</span>
                  <ArrowRight className="w-4 h-4 text-teal-200 group-hover:translate-x-0.5 transition-transform" />
                </button>

                <button
                  type="button"
                  id="hero-explore-dashboard-btn"
                  onClick={() => onNavigate('family')}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/90 shadow-xs hover:border-slate-300 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Users className="w-4 h-4 text-slate-500" />
                  <span>Family Dashboard</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                {/* Logged-out primary buttons: "Get Started", "Sign In", "See How It Works" */}
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
                  <button
                    type="button"
                    id="hero-get-started-btn"
                    onClick={() => onNavigate('signup')}
                    className="w-full sm:w-auto px-7 py-3.5 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-lg shadow-teal-600/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer group"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Get Started</span>
                    <ArrowRight className="w-4 h-4 text-teal-200 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  <button
                    type="button"
                    id="hero-sign-in-btn"
                    onClick={() => onNavigate('login')}
                    className="w-full sm:w-auto px-6 py-3.5 rounded-2xl text-sm font-bold text-slate-800 bg-white hover:bg-slate-50 border border-slate-200/90 shadow-xs hover:border-slate-300 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <LogIn className="w-4 h-4 text-teal-600" />
                    <span>Sign In</span>
                  </button>

                  <button
                    type="button"
                    id="hero-see-how-it-works-btn"
                    onClick={() => {
                      if (onStartDemo) {
                        onStartDemo();
                      } else {
                        document.getElementById('solution-section')?.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    className="w-full sm:w-auto px-5 py-3.5 rounded-2xl text-sm font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <PlayCircle className="w-4 h-4 text-teal-600" />
                    <span>See How It Works</span>
                  </button>
                </div>

                {/* Secondary Voice Demo Pill for logged-out visitors */}
                <div className="flex items-center justify-center lg:justify-start gap-2 pt-1">
                  <span className="text-xs text-slate-500">Want a live voice test?</span>
                  <button
                    type="button"
                    onClick={onStartCall}
                    className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-800 hover:underline cursor-pointer"
                  >
                    <span>Try 30-sec Voice Demo</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Trust points */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-200/60 max-w-lg mx-auto lg:mx-0">
              <div className="flex items-center gap-2 text-left">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">Voice-First</div>
                  <div className="text-[11px] text-slate-500">Zero tech barrier</div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-left">
                <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">Smart Vitals</div>
                  <div className="text-[11px] text-slate-500">Extracts BP & Sugar</div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-left">
                <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">Safe Insights</div>
                  <div className="text-[11px] text-slate-500">No scary jargon</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Cinematic Abstract Visual of Voice Interaction */}
          <div className="lg:col-span-5 relative flex items-center justify-center">
            {/* Ambient visual container with subtle glow & connection lines */}
            <div className="relative w-full max-w-md aspect-square rounded-3xl bg-gradient-to-b from-white/90 to-slate-50/70 border border-slate-200/80 p-6 sm:p-8 shadow-xl shadow-slate-200/50 backdrop-blur-sm flex flex-col items-center justify-center">
              {/* Subtle connection line from user to caregiver */}
              <div className="absolute top-4 left-6 right-6 flex items-center justify-between text-[11px] font-semibold text-slate-500 border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-1.5 text-teal-700">
                  <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                  <span>Sharma ji (New Delhi)</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Rahul (Bengaluru)</span>
                </div>
              </div>

              {/* Central Glowing Conversational Orb */}
              <div className="my-auto py-4">
                <AIOrb
                  state="speaking"
                  size="hero"
                  onClick={onQuickVoiceTest}
                  showRipples={true}
                />
              </div>

              {/* Floating Health Metric Badges Around Orb */}
              {/* Badge 1: Blood Pressure */}
              <div className="absolute top-16 left-2 sm:-left-3 bg-white/95 border border-slate-200/90 shadow-md rounded-xl px-3 py-2 flex items-center gap-2.5 transform -rotate-1 hover:rotate-0 transition-transform duration-300">
                <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-700 tracking-wider">Blood Pressure</div>
                  <div className="text-xs font-extrabold text-slate-900">128 / 82 <span className="text-[9px] font-normal text-slate-500">mmHg</span></div>
                </div>
              </div>

              {/* Badge 2: Medication 3/3 */}
              <div className="absolute bottom-16 -right-2 sm:-right-4 bg-white/95 border border-slate-200/90 shadow-md rounded-xl px-3 py-2 flex items-center gap-2.5 transform rotate-2 hover:rotate-0 transition-transform duration-300">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-700 tracking-wider">Morning Medicine</div>
                  <div className="text-xs font-extrabold text-emerald-700">Telmisartan 40mg Taken ✓</div>
                </div>
              </div>

              {/* Bottom Quick Test Banner */}
              <div className="w-full bg-slate-50/90 rounded-2xl p-2.5 border border-slate-200/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-700">
                  <Volume2 className="w-4 h-4 text-teal-600" />
                  <span className="font-medium">"Namaste Sharma ji, tabiyat kaisi hai?"</span>
                </div>
                <button
                  type="button"
                  onClick={onQuickVoiceTest}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-teal-600 text-white hover:bg-teal-700 transition-colors"
                >
                  Listen
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
