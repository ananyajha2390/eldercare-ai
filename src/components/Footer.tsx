import React, { useState } from 'react';
import { HeartPulse, ShieldCheck, Accessibility, Lock, Mail, X } from 'lucide-react';

export const Footer: React.FC = () => {
  const [modalType, setModalType] = useState<'privacy' | 'safety' | 'accessibility' | 'contact' | null>(null);

  const modalContent = {
    privacy: {
      title: 'Privacy & Data Protection',
      text: 'ElderCare AI encrypts voice transcripts and health metrics end-to-end. We do not sell personal data or use private elderly voice recordings for third-party advertising. All caregiver shared dashboards are restricted to authorized family circle members.',
    },
    safety: {
      title: 'Safety & Clinical Non-Diagnostic Directives',
      text: 'ElderCare AI provides observational health logging, medication reminders, and conversational engagement. It does NOT claim to diagnose diseases (e.g. hypertension, diabetes, dementia) or replace physician consultations. In life-threatening scenarios, always contact local emergency services immediately.',
    },
    accessibility: {
      title: 'Accessibility Standards',
      text: 'ElderCare AI is designed for elderly users with WCAG 2.1 AA compliant color contrast, high-readability typography, large touch targets (minimum 44px), Web Speech recognition fallbacks, and a dedicated Simple Elderly Mode.',
    },
    contact: {
      title: 'Contact Support & Care Team',
      text: 'Have questions or need assistance? Reach out to the ElderCare AI support desk at care@eldercare.ai or call our family helpline at +91 98110 43210. Dedicated 24/7 care support.',
    },
  };

  return (
    <footer className="bg-slate-900 text-white pt-16 pb-12 border-t border-slate-800" id="main-footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8 pb-12 border-b border-slate-800">
          <div className="space-y-3 max-w-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-500 text-white flex items-center justify-center shadow-md">
                <HeartPulse className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                ElderCare<span className="text-teal-400"> AI</span>
              </span>
            </div>
            <p className="text-teal-400 text-sm font-semibold italic">
              "Care that listens."
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              A voice-first AI companion that helps elderly people stay connected, remember medications, share health updates, and keep their families informed.
            </p>
          </div>

          <div className="flex flex-wrap gap-8 sm:gap-12">
            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                Company & Care
              </h4>
              <ul className="space-y-2 text-xs text-slate-400">
                <li>
                  <button
                    type="button"
                    onClick={() => setModalType('privacy')}
                    className="hover:text-teal-400 transition-colors"
                  >
                    Privacy
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setModalType('safety')}
                    className="hover:text-teal-400 transition-colors"
                  >
                    Safety Protocols
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setModalType('accessibility')}
                    className="hover:text-teal-400 transition-colors"
                  >
                    Accessibility
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setModalType('contact')}
                    className="hover:text-teal-400 transition-colors"
                  >
                    Contact
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                Core Modules
              </h4>
              <ul className="space-y-2 text-xs text-slate-400">
                <li>Voice AI Companion</li>
                <li>Caregiver Real-time Sync</li>
                <li>Smart Alert Engine</li>
                <li>Medication Tracker</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Required Medical Disclaimer */}
        <div className="pt-8 text-center sm:text-left space-y-2">
          <p className="text-xs text-slate-400 font-medium leading-relaxed max-w-4xl">
            <span className="font-bold text-slate-300">Disclaimer:</span> ElderCare AI is a supportive companion and monitoring tool. It does not provide medical diagnosis or replace professional medical advice.
          </p>
          <div className="text-[11px] text-slate-600 pt-2">
            © {new Date().getFullYear()} ElderCare AI Inc. Built for Hackathon Excellence. All rights reserved.
          </div>
        </div>
      </div>

      {/* Info Modal */}
      {modalType && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h4 className="text-base font-bold text-slate-900">
                {modalContent[modalType].title}
              </h4>
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
              {modalContent[modalType].text}
            </p>
            <button
              type="button"
              onClick={() => setModalType(null)}
              className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </footer>
  );
};
