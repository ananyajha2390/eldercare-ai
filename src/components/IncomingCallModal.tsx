import React, { useState, useEffect, useRef } from 'react';
import { AIOrb } from './AIOrb';
import {
  AudioState,
  ConversationMessage,
  ExtractedHealthData,
  SmartAlert,
  CallHistoryItem
} from '../types';
import {
  GeminiLiveClient,
  LiveConnectionStatus,
  LiveVoiceState,
  HealthEventData
} from '../services/geminiLiveClient';
import { useAuth } from '../contexts/AuthContext';
import { getGreeting, getHonorificName } from '../lib/nameUtils';
import {
  Phone,
  PhoneOff,
  PhoneCall,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  Send,
  Heart,
  Pill,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Radio,
  FileText
} from 'lucide-react';

interface IncomingCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  elderlyName?: string;
  checkInTitle?: string;
  onHealthDataExtracted: (data: ExtractedHealthData) => void;
  onNewAlert: (alert: SmartAlert) => void;
  onCallCompleted: (call: CallHistoryItem) => void;
  prefillScenario?: 'high_bp' | 'normal' | null;
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  isOpen,
  onClose,
  elderlyName,
  checkInTitle = 'Morning Health Check',
  onHealthDataExtracted,
  onNewAlert,
  onCallCompleted,
  prefillScenario = null,
}) => {
  const { profile, user, isDemoMode } = useAuth();
  const rawAuthName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    '';
  // Use authenticated user's name if available; otherwise respect custom elderlyName prop, or fallback to demo
  const activeName = rawAuthName || (elderlyName && elderlyName !== 'Sharma ji' ? elderlyName : (isDemoMode ? 'Sharma ji' : ''));
  const effectiveDisplayName = getHonorificName(activeName) || (isDemoMode ? 'Sharma ji' : 'Elderly Member');
  const greeting = getGreeting(activeName);
  const honorific = getHonorificName(activeName);
  const nameJi = honorific || 'ji';

  // Call stages: 'ringing' | 'connecting' | 'connected' | 'ended'
  const [callStage, setCallStage] = useState<'ringing' | 'connecting' | 'connected' | 'ended'>('ringing');
  const [durationSeconds, setDurationSeconds] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState<boolean>(true);

  // Gemini Live Client
  const [liveClient] = useState<GeminiLiveClient>(() => new GeminiLiveClient());
  const [connectionStatus, setConnectionStatus] = useState<LiveConnectionStatus>('disconnected');
  const [voiceState, setVoiceState] = useState<LiveVoiceState>('idle');
  const [lastError, setLastError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [liveTranscript, setLiveTranscript] = useState<{ speaker: 'user' | 'gemini'; text: string } | null>(null);
  const [inputText, setInputText] = useState<string>('');

  // Structured events captured during this call
  const [extractedVitals, setExtractedVitals] = useState<{ bp?: string; sugar?: string; mood?: string }>({});
  const [medicationConfirmed, setMedicationConfirmed] = useState<boolean | null>(null);
  const [alertGenerated, setAlertGenerated] = useState<string | null>(null);
  const [showSummaryView, setShowSummaryView] = useState<boolean>(false);
  const [completedCallSummary, setCompletedCallSummary] = useState<CallHistoryItem | null>(null);

  const durationTimerRef = useRef<any>(null);
  const transcriptBottomRef = useRef<HTMLDivElement>(null);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setCallStage('ringing');
      setDurationSeconds(0);
      setMessages([]);
      setExtractedVitals({});
      setMedicationConfirmed(null);
      setAlertGenerated(null);
      setShowSummaryView(false);
      setCompletedCallSummary(null);
      setLastError(null);
    } else {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      liveClient.disconnect();
    }
  }, [isOpen]);

  // Duration counter when connected
  useEffect(() => {
    if (callStage === 'connected') {
      durationTimerRef.current = setInterval(() => {
        setDurationSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    }
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, [callStage]);

  // Scroll transcript
  useEffect(() => {
    transcriptBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, liveTranscript]);

  // Setup Live Client callbacks
  useEffect(() => {
    liveClient.setCallbacks({
      onStatusChange: (status) => {
        setConnectionStatus(status);
        if (status === 'connected') {
          setCallStage('connected');
          setLastError(null);
        } else if (status === 'error') {
          setLastError('Unable to connect to Gemini Live. You can test via quick conversational prompts or Demo Mode.');
        }
      },
      onVoiceStateChange: (state) => {
        setVoiceState(state);
      },
      onUserTranscript: (text, isFinal) => {
        setLiveTranscript({ speaker: 'user', text });
        if (isFinal && text.trim()) {
          const userMsg: ConversationMessage = {
            id: `usr-${Date.now()}`,
            role: 'user',
            text: text.trim(),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          setMessages((prev) => [...prev, userMsg]);
          setLiveTranscript(null);
        }
      },
      onGeminiTranscript: (text, isFinal) => {
        setLiveTranscript({ speaker: 'gemini', text });
        if (isFinal && text.trim()) {
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.role === 'assistant' && last.id.startsWith('call-ai-')) {
              return prev.map((m, idx) =>
                idx === prev.length - 1 ? { ...m, text: `${m.text} ${text}`.trim() } : m
              );
            }
            return [
              ...prev,
              {
                id: `call-ai-${Date.now()}`,
                role: 'assistant',
                text: text.trim(),
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            ];
          });
          setLiveTranscript(null);
        }
      },
      onHealthEvent: (event: HealthEventData) => {
        handleStructuredHealthEvent(event);
      },
      onError: (errMsg) => {
        setLastError(errMsg);
      },
    });

    return () => {
      liveClient.disconnect();
    };
  }, [liveClient]);

  // Process structured health events
  const handleStructuredHealthEvent = (event: HealthEventData) => {
    let bpString: string | null = null;
    let bpVals: { systolic: number; diastolic: number } | null = null;
    let sugarString: string | null = null;

    if (event.systolic && event.diastolic) {
      bpString = `${event.systolic} / ${event.diastolic}`;
      bpVals = { systolic: event.systolic, diastolic: event.diastolic };
      setExtractedVitals((prev) => ({ ...prev, bp: bpString! }));
    }

    if (event.glucose) {
      sugarString = `${event.glucose} mg/dL`;
      setExtractedVitals((prev) => ({ ...prev, sugar: sugarString! }));
    }

    if (event.mood) {
      setExtractedVitals((prev) => ({ ...prev, mood: event.mood }));
    }

    if (event.medicationStatus === 'taken' || event.type === 'medication_confirmation') {
      setMedicationConfirmed(true);
    } else if (event.medicationStatus === 'missed') {
      setMedicationConfirmed(false);
    }

    const isHighBP = bpVals ? bpVals.systolic >= 150 || bpVals.diastolic >= 95 : false;
    const isUnusual = Boolean(event.isUnusual || isHighBP);

    const extractedData: ExtractedHealthData = {
      bloodPressure: bpString,
      bloodPressureValues: bpVals,
      bloodSugar: sugarString,
      medicationStatus: event.medicationStatus || (event.type === 'medication_confirmation' ? 'taken' : null),
      mood: (event.mood as any) || 'good',
      symptoms: event.symptoms || [],
      isUnusual,
      alertSeverity: isHighBP ? 'attention' : event.alertSeverity || 'normal',
      safeNote:
        event.safeNote ||
        (isHighBP
          ? "Today's BP reading is higher than recent recorded readings. Consider resting quietly and rechecking."
          : 'Health reading recorded and synced to family dashboard.'),
    };

    onHealthDataExtracted(extractedData);

    if (isUnusual) {
      const alertTitle = '⚠️ Unusual Reading Detected';
      setAlertGenerated(alertTitle);
      const alert: SmartAlert = {
        id: `alert-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timeAgo: 'Just now',
        title: alertTitle,
        readingType: bpString ? 'Blood Pressure' : 'Health Reading',
        readingValue: bpString || sugarString || 'Unusual reading',
        message: "Today's reading is higher than recent readings recorded for this profile.",
        severity: 'attention',
        caregiverNotified: true,
        recipientName: 'Rahul',
        isDismissed: false,
        suggestedAction: 'Consider resting quietly and checking again in 15 minutes.',
      };
      onNewAlert(alert);
    }
  };

  // Answer Incoming Call
  const handleAnswerCall = async () => {
    setCallStage('connecting');
    setLastError(null);

    // Initial greeting prompt will be sent upon socket connection
    const connected = await liveClient.connect(activeName);
    if (connected) {
      // Send initial greeting trigger to Gemini Live
      setTimeout(() => {
        liveClient.sendTextMessage(
          `System: The elderly user has just answered the phone call. Greet ${nameJi} warmly in natural Hindi/Hinglish (e.g. '${greeting}. Main ElderCare AI hoon. Bas aapka haal-chaal poochne ke liye call kiya hai. Aaj aapki tabiyat kaisi hai?')`
        );
      }, 500);
    } else {
      // Fallback demo conversation starter if Gemini Live is offline
      setCallStage('connected');
      const fallbackGreeting: ConversationMessage = {
        id: `call-ai-init`,
        role: 'assistant',
        text: `${greeting}! Main ElderCare AI hoon. Bas aapka haal-chaal poochne ke liye call kiya hai. Aaj aapki tabiyat kaisi hai?`,
        timestamp: 'Just now',
      };
      setMessages([fallbackGreeting]);
    }
  };

  // Decline Incoming Call (Triggers missed call flow demonstration)
  const handleDeclineCall = () => {
    setCallStage('ended');
    onClose();
  };

  // End Active Call & Generate Summary
  const handleEndCall = () => {
    liveClient.disconnect();
    if (durationTimerRef.current) clearInterval(durationTimerRef.current);

    setCallStage('ended');
    const mins = Math.floor(durationSeconds / 60);
    const secs = durationSeconds % 60;
    const durationStr = `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;

    // Construct completed call history record
    const callRecord: CallHistoryItem = {
      id: `call-${Date.now()}`,
      timestamp: `Today, ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      title: checkInTitle,
      status: 'completed',
      duration: durationStr || '1m 24s',
      summary: `Duration: ${durationStr || '1m 24s'} | Status: ✓ Completed | Medication: ${
        medicationConfirmed ? '✓ Confirmed' : 'Not Confirmed'
      } | Wellbeing: ${extractedVitals.mood || 'Good'} | Health: ${
        extractedVitals.bp ? `BP ${extractedVitals.bp}` : 'Vitals logged'
      }`,
      caregiverSummary: `${effectiveDisplayName} completed the ${checkInTitle.toLowerCase()} check-in and ${
        medicationConfirmed ? 'confirmed their medication' : 'discussed their routine'
      }.${
        extractedVitals.bp
          ? ` They reported a blood pressure reading of ${extractedVitals.bp}.`
          : ''
      } ${
        extractedVitals.mood === 'tired' || extractedVitals.mood === 'weakness'
          ? 'They mentioned feeling slightly weak.'
          : 'They sounded calm and stable.'
      } Family has been informed.`,
      transcript: messages.map((m) => ({
        role: m.role === 'assistant' ? 'ai' : 'user',
        text: m.text,
        time: m.timestamp,
      })),
      healthEvents: extractedVitals.bp
        ? [{ type: 'Blood Pressure', value: `${extractedVitals.bp} mmHg`, isUnusual: Boolean(alertGenerated) }]
        : [],
      medicationEvents: [
        {
          name: 'Morning Medicine (Telmisartan 40mg)',
          status: medicationConfirmed ? 'confirmed' : 'unconfirmed',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ],
      wellbeingObservation: extractedVitals.mood
        ? `User reported ${extractedVitals.mood} during voice conversation.`
        : 'Normal conversational cadence. Responsive and attentive.',
      alertsGenerated: alertGenerated ? [alertGenerated] : [],
    };

    setCompletedCallSummary(callRecord);
    setShowSummaryView(true);
    onCallCompleted(callRecord);
  };

  // Quick utterance sender (Judge / User convenience)
  const handleQuickUtterance = (text: string) => {
    if (!text.trim()) return;
    const userMsg: ConversationMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);

    if (connectionStatus === 'connected') {
      liveClient.sendTextMessage(text);
    } else {
      // Local fallback simulation if server is disconnected
      if (text.includes('158 by 98')) {
        handleStructuredHealthEvent({
          type: 'blood_pressure',
          systolic: 158,
          diastolic: 98,
          isUnusual: true,
          alertSeverity: 'attention',
          safeNote: "Today's BP reading is higher than recent readings. Consider resting quietly and rechecking.",
        });
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: `call-ai-${Date.now()}`,
              role: 'assistant',
              text: `Ji ${nameJi}, maine aapka BP 158 by 98 note kar liya hai. Ye thoda high lag raha hai, aap aaram se baithiye aur paani lijiye. Maine caregiver ko bhi alert bhej diya hai.`,
              timestamp: 'Just now',
            },
          ]);
        }, 800);
      } else if (text.includes('medicine le li') || text.includes('Haan')) {
        handleStructuredHealthEvent({
          type: 'medication_confirmation',
          medicationStatus: 'taken',
        });
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: `call-ai-${Date.now()}`,
              role: 'assistant',
              text: `Bahut badhiya ${nameJi}! Maine morning medicine confirm kar di hai. Samay par dawai lene ke liye shukriya.`,
              timestamp: 'Just now',
            },
          ]);
        }, 800);
      } else if (text.includes('weakness')) {
        handleStructuredHealthEvent({
          type: 'mood',
          mood: 'tired',
          symptoms: ['weakness'],
        });
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: `call-ai-${Date.now()}`,
              role: 'assistant',
              text: `Achha ${nameJi}, thoda aaram kijiye. Kya aapne subah breakfast aur paani liya hai?`,
              timestamp: 'Just now',
            },
          ]);
        }, 800);
      }
    }
  };

  const handleManualTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      handleQuickUtterance(inputText.trim());
      setInputText('');
    }
  };

  const formatDuration = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const orbAudioState: AudioState =
    voiceState === 'listening'
      ? 'listening'
      : voiceState === 'thinking'
      ? 'thinking'
      : voiceState === 'speaking'
      ? 'speaking'
      : 'idle';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
      {/* Phone Call Modal Shell */}
      <div className="relative w-full max-w-md sm:max-w-lg bg-slate-900 border border-slate-700/80 rounded-[36px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Phone Notch / Header */}
        <div className="pt-4 pb-2 px-6 flex items-center justify-between text-slate-400 text-xs font-mono border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="font-bold text-slate-200 tracking-wider">ELDERCARE AI</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-teal-300 font-sans font-semibold">
              Demo Call
            </span>
            {callStage === 'connected' && (
              <span className="font-semibold text-emerald-400">{formatDuration(durationSeconds)}</span>
            )}
          </div>
        </div>

        {/* 1. INCOMING CALL RINGING SCREEN */}
        {callStage === 'ringing' && (
          <div className="p-8 flex-1 flex flex-col items-center justify-between text-center min-h-[460px]">
            <div className="space-y-2 pt-4">
              <div className="text-xs uppercase font-bold tracking-widest text-teal-400">Incoming Call</div>
              <h3 className="text-3xl font-extrabold text-white tracking-tight">{effectiveDisplayName}</h3>
              <p className="text-sm font-medium text-slate-300">{checkInTitle}</p>
            </div>

            {/* Glowing Ringing Pulsing Phone / Orb Icon */}
            <div className="relative my-8 flex items-center justify-center">
              {/* Concentric animation rings */}
              <div className="absolute w-40 h-40 rounded-full border border-teal-500/30 animate-ping" />
              <div className="absolute w-32 h-32 rounded-full border border-emerald-500/40 animate-pulse" />
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-teal-600 via-emerald-500 to-teal-400 p-1 shadow-xl shadow-teal-500/30 flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center">
                  <PhoneCall className="w-10 h-10 text-teal-400 animate-bounce" />
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-400 max-w-xs leading-relaxed">
              "Most health apps wait for seniors to open them. ElderCare AI calls them."
            </div>

            {/* Answer / Decline Action Buttons */}
            <div className="w-full grid grid-cols-2 gap-4 pt-6">
              <button
                type="button"
                onClick={handleDeclineCall}
                className="py-4 rounded-2xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 font-bold text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-95"
              >
                <PhoneOff className="w-5 h-5 text-rose-400" />
                <span>Decline</span>
              </button>

              <button
                type="button"
                onClick={handleAnswerCall}
                className="py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer active:scale-95 animate-pulse"
              >
                <Phone className="w-5 h-5 text-white" />
                <span>Answer</span>
              </button>
            </div>
          </div>
        )}

        {/* 2. CONNECTING SCREEN */}
        {callStage === 'connecting' && (
          <div className="p-8 flex-1 flex flex-col items-center justify-center text-center space-y-6 min-h-[460px]">
            <div className="w-20 h-20 rounded-full bg-teal-500/10 border border-teal-500/30 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-teal-400 animate-spin" />
            </div>
            <div className="space-y-1">
              <div className="text-lg font-bold text-white">Connecting to Gemini Live...</div>
              <div className="text-xs text-slate-400">Establishing real bidirectional audio session</div>
            </div>
            <div className="text-[11px] font-mono text-teal-300/80 bg-slate-800/80 px-3 py-1.5 rounded-full">
              Voice: Aoede (Native 24kHz) • Mode: Hindi/Hinglish
            </div>
          </div>
        )}

        {/* 3. ACTIVE CONNECTED CALL SCREEN */}
        {callStage === 'connected' && !showSummaryView && (
          <div className="flex-1 flex flex-col min-h-[500px] overflow-hidden">
            {/* Call State Sub-header */}
            <div className="py-2.5 px-6 bg-slate-850 border-b border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="font-semibold text-emerald-300">Connected to ElderCare AI</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{formatDuration(durationSeconds)}</span>
              </div>
            </div>

            {/* Main Call Visual: AI Orb + Live Reactive State */}
            <div className="p-6 flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-950 border-b border-slate-800">
              <div className="my-2">
                <AIOrb
                  state={orbAudioState}
                  size="default"
                  showRipples={true}
                />
              </div>

              <div className="mt-3 flex items-center gap-2">
                {voiceState === 'listening' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-700/50 animate-pulse">
                    <Mic className="w-3.5 h-3.5 text-emerald-400" />
                    Listening to {effectiveDisplayName}...
                  </span>
                )}
                {voiceState === 'thinking' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-700/50">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                    AI Thinking...
                  </span>
                )}
                {voiceState === 'speaking' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-950/80 text-teal-300 border border-teal-700/50">
                    <Volume2 className="w-3.5 h-3.5 text-teal-400" />
                    AI Speaking (Native Gemini Audio)...
                  </span>
                )}
                {voiceState === 'idle' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300">
                    Active Call • Speak naturally
                  </span>
                )}
              </div>

              {/* Real-time Extracted Vitals Pill Banner */}
              {(extractedVitals.bp || medicationConfirmed !== null) && (
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-[11px] animate-in fade-in">
                  {extractedVitals.bp && (
                    <span className="px-2.5 py-1 rounded-lg bg-rose-950/90 text-rose-300 border border-rose-800/80 font-bold flex items-center gap-1">
                      <Heart className="w-3 h-3 text-rose-400" />
                      BP: {extractedVitals.bp} mmHg
                    </span>
                  )}
                  {medicationConfirmed && (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-950/90 text-emerald-300 border border-emerald-800/80 font-bold flex items-center gap-1">
                      <Pill className="w-3 h-3 text-emerald-400" />
                      Morning Med Confirmed ✓
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Live Chat / Verbatim Transcript Section */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-900/60 text-xs">
              <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400 text-center py-1">
                Live Conversation Transcript
              </div>

              {messages.length === 0 && !liveTranscript && (
                <div className="text-center py-6 text-slate-400 text-xs italic">
                  Say hello or click one of the quick prompts below to speak...
                </div>
              )}

              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-teal-600 text-white rounded-br-none'
                        : 'bg-slate-800 text-slate-200 border border-slate-700/80 rounded-bl-none'
                    }`}
                  >
                    <div className="text-[10px] font-bold opacity-75 mb-0.5">
                      {m.role === 'user' ? elderlyName : 'ElderCare AI'}
                    </div>
                    <div>{m.text}</div>
                  </div>
                </div>
              ))}

              {liveTranscript && (
                <div className={`flex ${liveTranscript.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[85%] rounded-2xl px-3.5 py-2 text-slate-300 bg-slate-800/60 border border-teal-500/30 italic animate-pulse">
                    <span className="font-bold text-[10px] text-teal-400 not-italic block">
                      {liveTranscript.speaker === 'user' ? 'Speaking...' : 'ElderCare streaming...'}
                    </span>
                    {liveTranscript.text}
                  </div>
                </div>
              )}
              <div ref={transcriptBottomRef} />
            </div>

            {/* Quick Demo Utterance Chips */}
            <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 overflow-x-auto flex items-center gap-1.5 no-scrollbar">
              <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0">Quick Speak:</span>
              <button
                type="button"
                onClick={() => handleQuickUtterance('Thodi weakness lag rahi hai.')}
                className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shrink-0 cursor-pointer"
              >
                "Thodi weakness lag rahi hai"
              </button>
              <button
                type="button"
                onClick={() => handleQuickUtterance('Mera BP 158 by 98 hai.')}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 shrink-0 cursor-pointer"
              >
                ⚠️ "Mera BP 158 by 98 hai"
              </button>
              <button
                type="button"
                onClick={() => handleQuickUtterance('Maine subah ki medicine le li.')}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 shrink-0 cursor-pointer"
              >
                ✓ "Maine medicine le li"
              </button>
            </div>

            {/* Manual text input for quiet testing */}
            <form onSubmit={handleManualTextSubmit} className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type in Hindi, Hinglish or English..."
                className="flex-1 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-hidden focus:border-teal-500"
              />
              <button
                type="submit"
                className="p-2 rounded-xl bg-teal-600 text-white hover:bg-teal-500 cursor-pointer"
                title="Send test utterance"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* In-Call Controls: Mute, Speaker, End Call */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-around">
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className={`flex flex-col items-center gap-1 text-[10px] font-semibold ${
                  isMuted ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isMuted ? 'bg-amber-950 border border-amber-700' : 'bg-slate-800'
                }`}>
                  {isMuted ? <MicOff className="w-5 h-5 text-amber-400" /> : <Mic className="w-5 h-5 text-slate-300" />}
                </div>
                <span>{isMuted ? 'Unmute' : 'Mute'}</span>
              </button>

              {/* End Call Button */}
              <button
                type="button"
                onClick={handleEndCall}
                className="flex flex-col items-center gap-1 text-[10px] font-bold text-rose-400 cursor-pointer group"
              >
                <div className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 group-active:scale-95 transition-transform">
                  <PhoneOff className="w-6 h-6 text-white" />
                </div>
                <span>End Call</span>
              </button>

              <button
                type="button"
                onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                className={`flex flex-col items-center gap-1 text-[10px] font-semibold ${
                  isSpeakerOn ? 'text-teal-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isSpeakerOn ? 'bg-teal-950 border border-teal-700' : 'bg-slate-800'
                }`}>
                  {isSpeakerOn ? <Volume2 className="w-5 h-5 text-teal-400" /> : <VolumeX className="w-5 h-5 text-slate-400" />}
                </div>
                <span>Speaker</span>
              </button>
            </div>
          </div>
        )}

        {/* 4. POST-CALL AI SUMMARY & CAREGIVER LOG SCREEN */}
        {showSummaryView && completedCallSummary && (
          <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between overflow-y-auto max-h-[80vh] text-left space-y-6">
            <div className="space-y-2 border-b border-slate-800 pb-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Call Completed Successfully
              </div>
              <h3 className="text-2xl font-extrabold text-white">AI Call Summary</h3>
              <p className="text-xs text-slate-400">
                Generated by ElderCare AI and synchronized to the family dashboard.
              </p>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
                <div className="text-slate-400 text-[10px] uppercase font-bold">Duration</div>
                <div className="text-base font-extrabold text-white mt-0.5">{completedCallSummary.duration}</div>
              </div>
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
                <div className="text-slate-400 text-[10px] uppercase font-bold">Medication</div>
                <div className="text-base font-extrabold text-emerald-400 mt-0.5">
                  {medicationConfirmed ? '✓ Confirmed' : 'Reviewed'}
                </div>
              </div>
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
                <div className="text-slate-400 text-[10px] uppercase font-bold">Wellbeing</div>
                <div className="text-base font-extrabold text-teal-300 mt-0.5 capitalize">
                  {extractedVitals.mood || 'Good'}
                </div>
              </div>
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
                <div className="text-slate-400 text-[10px] uppercase font-bold">Health BP</div>
                <div className={`text-base font-extrabold mt-0.5 ${extractedVitals.bp ? 'text-rose-400' : 'text-slate-200'}`}>
                  {extractedVitals.bp || '128 / 82'}
                </div>
              </div>
            </div>

            {/* Caregiver-Friendly Summary Card */}
            <div className="p-4 rounded-2xl bg-teal-950/40 border border-teal-800/50 space-y-2">
              <div className="text-[11px] font-bold text-teal-300 uppercase tracking-wide flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                Caregiver Update (Sent to Rahul)
              </div>
              <p className="text-sm text-slate-200 leading-relaxed">
                "{completedCallSummary.caregiverSummary}"
              </p>
              <div className="text-[11px] text-teal-400/90 font-medium pt-1">
                ✓ Family dashboard updated • Caregiver notified
              </div>
            </div>

            {/* Close / Return to Dashboard */}
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3.5 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-lg shadow-teal-600/30 transition-all cursor-pointer"
            >
              Done • Return to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
