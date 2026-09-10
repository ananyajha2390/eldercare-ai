import React, { useState } from 'react';
import {
  User,
  Mic,
  Sparkles,
  HeartHandshake,
  LayoutDashboard,
  BellRing,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

export const SolutionSection: React.FC = () => {
  const [activeStep, setActiveStep] = useState(2);

  const steps = [
    {
      id: 0,
      title: 'Elderly Person',
      subtitle: 'Speaks Naturally',
      description: 'Sharma ji sits comfortably and talks in simple Hindi, Hinglish, or English without touching complex screens.',
      icon: User,
      color: 'from-amber-500 to-orange-500',
      badge: 'Step 1',
    },
    {
      id: 1,
      title: 'Voice Conversation',
      subtitle: 'Warm Voice Companion',
      description: 'The companion checks in: "Namaste Sharma ji, breakfast aur medicine ho gayi? Kaisa feel ho raha hai?"',
      icon: Mic,
      color: 'from-teal-500 to-emerald-500',
      badge: 'Step 2',
    },
    {
      id: 2,
      title: 'Gemini AI',
      subtitle: 'Multimodal Understanding',
      description: 'Understands colloquial phrases like "BP 128 by 82 hai", "thodi thakan hai", and confirms morning meds.',
      icon: Sparkles,
      color: 'from-indigo-500 to-sky-500',
      badge: 'Step 3',
    },
    {
      id: 3,
      title: 'Health Understanding',
      subtitle: 'Safe Extraction Engine',
      description: 'Extracts structured vitals without diagnosing diseases. Observes baseline shifts and trends gently.',
      icon: HeartHandshake,
      color: 'from-emerald-500 to-teal-600',
      badge: 'Step 4',
    },
    {
      id: 4,
      title: 'Caregiver Dashboard',
      subtitle: 'Real-Time Peace of Mind',
      description: 'Son Rahul in Bengaluru instantly sees: Medication 3/3 taken, BP 128/82, Mood good, checked in 10:32 AM.',
      icon: LayoutDashboard,
      color: 'from-blue-600 to-indigo-600',
      badge: 'Step 5',
    },
    {
      id: 5,
      title: 'Smart Alerts',
      subtitle: 'Timely Care Notifications',
      description: 'If BP reads 158/98 or dizziness is noted, an instant gentle notification alerts family to check in.',
      icon: BellRing,
      color: 'from-rose-500 to-amber-500',
      badge: 'Step 6',
    },
  ];

  return (
    <section className="py-16 sm:py-24 bg-[#FBFBFA]" id="solution-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-teal-50 text-teal-800 text-xs font-semibold border border-teal-200/60">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>The ElderCare AI Architecture</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Meet your family's AI companion.
          </h2>
          <p className="text-base text-slate-600">
            A seamless bridge from an effortless daily morning chat to actionable, real-time family transparency.
          </p>
        </div>

        {/* Desktop / Tablet Connected Horizontal Flow */}
        <div className="mt-14 relative">
          {/* Glowing connecting line behind cards */}
          <div className="hidden lg:block absolute top-1/2 left-8 right-8 h-1 bg-gradient-to-r from-amber-200 via-teal-300 to-rose-300 -translate-y-6 z-0 rounded-full" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 relative z-10">
            {steps.map((step) => {
              const Icon = step.icon;
              const isSelected = activeStep === step.id;
              return (
                <div
                  key={step.id}
                  id={`solution-step-${step.id}`}
                  onClick={() => setActiveStep(step.id)}
                  className={`cursor-pointer rounded-2xl p-4 sm:p-5 transition-all duration-300 flex flex-col justify-between border ${
                    isSelected
                      ? 'bg-white border-teal-500 shadow-xl shadow-teal-500/10 scale-105'
                      : 'bg-white/80 border-slate-200/80 hover:bg-white hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                        {step.badge}
                      </span>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-teal-600" />
                      )}
                    </div>

                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-tr ${step.color} text-white flex items-center justify-center shadow-md mb-3`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 leading-tight">
                      {step.title}
                    </h3>

                    <p className="text-xs font-semibold text-teal-700 mt-0.5">
                      {step.subtitle}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100">
                    <p className="text-[11px] text-slate-500 line-clamp-3 leading-snug">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Step Spotlight Banner */}
        <div className="mt-8 bg-white border border-teal-200/80 rounded-2xl p-5 sm:p-6 shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${steps[activeStep].color} text-white flex items-center justify-center shrink-0 shadow-md`}>
              {React.createElement(steps[activeStep].icon, { className: 'w-6 h-6' })}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">{steps[activeStep].badge}</span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-500">{steps[activeStep].subtitle}</span>
              </div>
              <h4 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
                {steps[activeStep].title}
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
                {steps[activeStep].description}
              </p>
            </div>
          </div>

          <div className="shrink-0 flex gap-2">
            <button
              type="button"
              onClick={() => setActiveStep(prev => (prev === 0 ? steps.length - 1 : prev - 1))}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setActiveStep(prev => (prev === steps.length - 1 ? 0 : prev + 1))}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg flex items-center gap-1"
            >
              Next Step <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
