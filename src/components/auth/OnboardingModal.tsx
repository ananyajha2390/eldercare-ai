import React, { useState } from 'react';
import {
  CheckCircle2,
  ArrowRight,
  User,
  Heart,
  Globe,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  X
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { OnboardingData } from '../../types';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onComplete,
}) => {
  const { profile, completeOnboarding, dismissOnboarding } = useAuth();

  const [step, setStep] = useState<number>(1);
  const [fullName, setFullName] = useState<string>(profile?.full_name || '');
  const [caregiverFor, setCaregiverFor] = useState<string>('My parent');
  const [seniorName, setSeniorName] = useState<string>('Sharma ji');
  const [language, setLanguage] = useState<'auto' | 'hindi' | 'hinglish' | 'english'>('auto');
  const [loading, setLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleNext = async () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      // Final step: complete onboarding
      setLoading(true);
      const data: OnboardingData = {
        fullName: fullName || profile?.full_name || 'Rahul',
        caregiverFor,
        seniorName,
        language,
      };
      await completeOnboarding(data);
      setLoading(false);
      onComplete();
    }
  };

  const handleSkip = () => {
    dismissOnboarding();
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col">
        {/* Header & Step progress */}
        <div className="p-6 bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 text-white flex items-center justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider">
              Step {step} of 4
            </div>
            <h3 className="text-lg font-bold">Profile Setup</h3>
          </div>

          <div className="flex items-center gap-2">
            {step < 4 && (
              <button
                type="button"
                onClick={handleSkip}
                className="text-xs text-teal-100 hover:text-white px-2.5 py-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                Skip for now
              </button>
            )}
            <button
              type="button"
              onClick={handleSkip}
              className="text-teal-100 hover:text-white p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Step indicator bar */}
        <div className="w-full bg-slate-100 h-1.5 overflow-hidden">
          <div
            className="bg-teal-600 h-full transition-all duration-300 rounded-full"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {/* Step Content */}
        <div className="p-6 sm:p-8 flex-1 space-y-6">
          {/* STEP 1: Tell us about yourself */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200/70 text-teal-700 flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">Tell us about yourself</h4>
                  <p className="text-xs text-slate-500">How should ElderCare AI address you in notifications?</p>
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="block text-xs font-semibold text-slate-700" htmlFor="onboarding-fullname">
                  Your Full Name
                </label>
                <input
                  id="onboarding-fullname"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Rahul Sharma"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs"
                />
              </div>

              <p className="text-xs text-slate-500 pt-1">
                Your role is registered as <span className="font-semibold text-teal-700">{profile?.role === 'elderly' ? 'Elderly Senior User' : 'Family / Caregiver'}</span>.
              </p>
            </div>
          )}

          {/* STEP 2: Who are you caring for? */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200/70 text-teal-700 flex items-center justify-center">
                  <Heart className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">Who are you caring for?</h4>
                  <p className="text-xs text-slate-500">Choose the primary relative for AI check-in calls.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                {[
                  { label: 'My parent', sub: 'Father or Mother' },
                  { label: 'My grandparent', sub: 'Grandfather or Grandmother' },
                  { label: 'My spouse', sub: 'Husband or Wife' },
                  { label: 'Other', sub: 'Friend or Relative' },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setCaregiverFor(item.label)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      caregiverFor === item.label
                        ? 'border-teal-600 bg-teal-50/70 text-teal-900 ring-2 ring-teal-600/20'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                    }`}
                  >
                    <span className="text-xs font-bold block">{item.label}</span>
                    <span className="text-[10px] text-slate-500">{item.sub}</span>
                  </button>
                ))}
              </div>

              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-semibold text-slate-700" htmlFor="senior-honorific">
                  Their Name / How AI Should Address Them
                </label>
                <input
                  id="senior-honorific"
                  type="text"
                  value={seniorName}
                  onChange={(e) => setSeniorName(e.target.value)}
                  placeholder="Sharma ji, Papaji, Amma..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs"
                />
              </div>
            </div>
          )}

          {/* STEP 3: Preferred language */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200/70 text-teal-700 flex items-center justify-center">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">Preferred Language</h4>
                  <p className="text-xs text-slate-500">ElderCare AI seamlessly speaks natural bilingual conversation.</p>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                {[
                  { id: 'auto', label: 'Auto (Natural Bilingual)', desc: 'Switches effortlessly between Hindi, Hinglish and English based on speech' },
                  { id: 'hinglish', label: 'Hinglish', desc: 'Everyday conversational mix like "Kaise hain aap? Subah medicine le li?"' },
                  { id: 'hindi', label: 'Hindi (हिंदी)', desc: 'Warm, respectful conversational Hindi with honorifics' },
                  { id: 'english', label: 'English', desc: 'Clear, gentle spoken English' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setLanguage(item.id as any)}
                    className={`w-full p-3 rounded-2xl border text-left flex items-start justify-between transition-all cursor-pointer ${
                      language === item.id
                        ? 'border-teal-600 bg-teal-50/70 text-teal-900 ring-2 ring-teal-600/20'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold block">{item.label}</span>
                      <span className="text-[11px] text-slate-500">{item.desc}</span>
                    </div>
                    <span className={`w-4 h-4 rounded-full border flex items-center justify-center mt-0.5 shrink-0 ${language === item.id ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-300'}`}>
                      {language === item.id && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: You're all set! */}
          {step === 4 && (
            <div className="space-y-5 text-center py-2 animate-in fade-in duration-200">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h4 className="text-xl font-extrabold text-slate-900">You're all set.</h4>
                <p className="text-xs text-slate-600 max-w-sm mx-auto">
                  Your family care circle is ready. You can initiate care calls, schedule automated morning check-ins, and inspect live vitals.
                </p>
              </div>

              {/* Summary Pill */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs space-y-1.5 text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500">Caregiver:</span>
                  <span className="font-bold text-slate-900">{fullName || profile?.full_name || 'Rahul'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Caring for:</span>
                  <span className="font-bold text-slate-900">{seniorName} ({caregiverFor})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">AI Voice Language:</span>
                  <span className="font-bold text-slate-900 uppercase">{language}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={handleNext}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-md shadow-teal-600/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>{step === 4 ? 'Go to Dashboard' : 'Continue'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
