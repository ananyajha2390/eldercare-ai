import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  X,
  Sparkles,
  CheckCircle2,
  Volume2,
  AlertTriangle,
  ArrowRight,
  PhoneCall,
  PhoneOff,
  Pill,
  Heart,
  BellRing
} from 'lucide-react';
import { AppView, SmartAlert } from '../types';
import { voiceService } from '../services/voice';

interface DemoControllerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: AppView) => void;
  onOpenCallModal: (scenario?: 'high_bp' | 'normal') => void;
  onCloseCallModal: () => void;
  onUpdateBP: (bp: string) => void;
  onUpdateMood: (mood: string) => void;
  onConfirmMedication: () => void;
  onTriggerAlert: (alert: SmartAlert) => void;
  onResetToBaseline: () => void;
}

export const DemoController: React.FC<DemoControllerProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onOpenCallModal,
  onCloseCallModal,
  onUpdateBP,
  onUpdateMood,
  onConfirmMedication,
  onTriggerAlert,
  onResetToBaseline,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);

  const steps = [
    {
      step: 1,
      title: 'STEP 1: Incoming Proactive Call',
      desc: '📞 ElderCare AI proactively initiates the morning check-in call to Sharma ji (+91 98110 43210).',
      action: () => {
        onResetToBaseline();
        onOpenCallModal('high_bp');
      },
    },
    {
      step: 2,
      title: 'STEP 2: Sharma ji Answers Call',
      desc: 'The senior taps the green Answer button. Bidirectional audio connection is established.',
      action: () => {
        // Modal is in answered state
      },
    },
    {
      step: 3,
      title: 'STEP 3: AI Speaks (Gemini Voice)',
      desc: 'AI speaks in warm Hindi/Hinglish: "Namaste Sharma ji. Aaj aap kaisa feel kar rahe hain?"',
      action: () => {
        voiceService.speak('Namaste Sharma ji. Aaj aap kaisa feel kar rahe hain?');
      },
    },
    {
      step: 4,
      title: 'STEP 4: User Responds',
      desc: 'Sharma ji speaks naturally into the mic: "Thodi weakness lag rahi hai."',
      action: () => {
        onUpdateMood('tired');
      },
    },
    {
      step: 5,
      title: 'STEP 5: AI Follow-Up Inquiry',
      desc: 'AI responds calmly: "Kya aapne subah breakfast aur paani liya? Thoda aaram kijiye."',
      action: () => {
        voiceService.speak('Kya aapne breakfast aur paani liya? Thoda aaram kijiye.');
      },
    },
    {
      step: 6,
      title: 'STEP 6: User Shares Vitals Reading',
      desc: 'Sharma ji reports: "Mera BP 158 by 98 hai."',
      action: () => {
        // Speech input registered
      },
    },
    {
      step: 7,
      title: 'STEP 7: Live Dashboard Updates (158 / 98)',
      desc: 'The real-time database immediately updates Blood Pressure to 158 / 98 mmHg.',
      action: () => {
        onUpdateBP('158 / 98');
      },
    },
    {
      step: 8,
      title: 'STEP 8: Animated Alert Appears',
      desc: '⚠️ Unusual Reading Detected: "Today\'s reading is higher than recent readings recorded for this profile."',
      action: () => {
        onTriggerAlert({
          id: `demo-alert-${Date.now()}`,
          timestamp: 'Just now',
          timeAgo: 'Just now',
          title: '⚠️ Unusual Reading Detected',
          readingType: 'Blood Pressure',
          readingValue: '158 / 98',
          message: "Today's reading is higher than recent readings recorded for this profile.",
          severity: 'attention',
          caregiverNotified: true,
          recipientName: 'Rahul',
          isDismissed: false,
          suggestedAction: 'Consider rechecking after 15 minutes of quiet rest and hydration.',
        });
      },
    },
    {
      step: 9,
      title: 'STEP 9: AI Asks About Medicine',
      desc: 'AI gently checks: "Aaj ki morning medicine le li?"',
      action: () => {
        voiceService.speak('Aaj ki morning medicine le li?');
      },
    },
    {
      step: 10,
      title: 'STEP 10: User Confirms Medicine',
      desc: 'Sharma ji responds: "Haan, nashte ke baad le li thi."',
      action: () => {
        // Confirmed via voice
      },
    },
    {
      step: 11,
      title: 'STEP 11: Medication Updates Live',
      desc: 'Status updates live: ✓ Confirmed via AI Call (Telmisartan 40mg).',
      action: () => {
        onConfirmMedication();
      },
    },
    {
      step: 12,
      title: 'STEP 12: Call Ends Gracefully',
      desc: 'AI wishes Sharma ji a peaceful day. Call ends and audio session closes.',
      action: () => {
        onCloseCallModal();
      },
    },
    {
      step: 13,
      title: 'STEP 13: AI Call Summary Generated',
      desc: 'Gemini formats an observational clinical-safety summary for the family log.',
      action: () => {
        onNavigate('history');
      },
    },
    {
      step: 14,
      title: 'STEP 14: Family Dashboard Updates',
      desc: 'Caregiver Rahul in Bengaluru sees today\'s updated stats and call status.',
      action: () => {
        onNavigate('family');
      },
    },
    {
      step: 15,
      title: 'STEP 15: Caregiver Notified',
      desc: 'Caregiver notified: "Sharma ji completed check-in. Vitals logged and alert delivered." Demo Complete ✓',
      action: () => {
        onNavigate('family');
      },
    },
  ];

  // Auto-play timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying) {
      timer = setTimeout(() => {
        if (currentStep < 15) {
          executeStep(currentStep + 1);
        } else {
          setIsPlaying(false);
        }
      }, 5000);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentStep]);

  const executeStep = (stepNumber: number) => {
    if (stepNumber < 1 || stepNumber > 15) return;
    setCurrentStep(stepNumber);
    const stepObj = steps[stepNumber - 1];
    if (stepObj && stepObj.action) {
      stepObj.action();
    }
  };

  if (!isOpen) return null;

  const currentStepData = steps[currentStep - 1];

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 max-w-lg w-full bg-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-700 backdrop-blur-md animate-in slide-in-from-bottom-5" id="demo-controller-modal">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-teal-500 text-slate-950 flex items-center justify-center font-extrabold text-xs">
            {currentStep}/15
          </div>
          <div>
            <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider block">
              90-Second Hackathon Story Walkthrough
            </span>
            <h4 className="text-sm font-bold text-white">
              {currentStepData.title}
            </h4>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsPlaying(false);
            voiceService.stopSpeaking();
            onClose();
          }}
          className="text-slate-400 hover:text-white p-1 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-800 rounded-full h-1.5 my-3 overflow-hidden">
        <div
          className="bg-gradient-to-r from-teal-400 to-emerald-400 h-full transition-all duration-500 rounded-full"
          style={{ width: `${(currentStep / 15) * 100}%` }}
        />
      </div>

      {/* Step Description */}
      <p className="text-xs text-slate-300 leading-relaxed mb-4 min-h-[44px]">
        {currentStepData.desc}
      </p>

      {/* Step Indicator Badge */}
      {currentStep === 15 && (
        <div className="mb-4 p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Full Product Story Complete! Judges can now test live calls.</span>
        </div>
      )}

      {/* Playback Controls */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
        <button
          type="button"
          onClick={() => executeStep(1)}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          title="Restart from Step 1"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={currentStep === 1}
            onClick={() => executeStep(currentStep - 1)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
          >
            <SkipBack className="w-3.5 h-3.5" /> Prev
          </button>

          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-4 py-1.5 rounded-xl text-xs font-bold text-slate-950 bg-teal-400 hover:bg-teal-300 transition-colors flex items-center gap-1.5 shadow-md shadow-teal-400/20 cursor-pointer"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'Pause' : 'Auto Play'}</span>
          </button>

          <button
            type="button"
            disabled={currentStep === 15}
            onClick={() => executeStep(currentStep + 1)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
          >
            Next <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => executeStep(15)}
          className="text-xs text-teal-400 hover:underline font-semibold cursor-pointer"
        >
          Jump to End
        </button>
      </div>
    </div>
  );
};
