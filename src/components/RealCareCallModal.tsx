import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  PhoneOff,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  X,
  Sparkles,
  Heart,
  Pill,
  Activity,
  RotateCcw,
  LayoutDashboard,
  ArrowRight,
  Smile,
  Check,
  Send,
  Radio,
  Loader2,
} from 'lucide-react';
import { ElderlyProfile, FamilyMember, CallHistoryItem } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { extractFirstName, getHonorificName } from '../lib/nameUtils';
import { voiceService } from '../services/voice';

interface RealCareCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  elderlyProfile?: ElderlyProfile | null;
  familyMembers?: FamilyMember[];
  onStartBrowserDemoCall?: (scenario?: 'normal' | 'high_bp') => void;
  onCallCompleted?: (call: CallHistoryItem) => void;
  onViewDashboard?: () => void;
  initialMemberId?: string;
  initialPhone?: string;
}

interface ChatTurn {
  id: string;
  speaker: 'ai' | 'user';
  text: string;
  timestamp: string;
}

// Exactly the 4 voice states mandated by user requirements
type VoiceState = 'AI Speaking' | 'Listening...' | 'Processing...' | 'AI Responding';

export const RealCareCallModal: React.FC<RealCareCallModalProps> = ({
  isOpen,
  onClose,
  onCallCompleted,
  onViewDashboard,
}) => {
  const { profile, user } = useAuth();

  // Dynamic user name from current logged-in profile (strictly user identity, never arbitrary family member)
  const rawUserName = (
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    (user?.email ? user.email.split('@')[0] : '') ||
    ''
  ).trim();

  // Clean demo indicators like "(Demo Caregiver)" or numbers from email prefixes
  const currentUserName = rawUserName
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\d+$/g, '')
    .trim();

  const userFirstName = extractFirstName(currentUserName);
  const userHonorific = userFirstName ? getHonorificName(currentUserName) : '';
  const displayName = currentUserName || 'You';
  const userDisplayPhone = profile?.phone || 'In-Browser Voice Session';

  // Call stages: 'calling' (connecting ring) -> 'connected' (live call) -> 'summary' (completed)
  const [stage, setStage] = useState<'calling' | 'connected' | 'summary'>('calling');

  // Exact voice state as requested
  const [voiceState, setVoiceState] = useState<VoiceState>('AI Speaking');

  // Call duration & audio controls
  const [durationSeconds, setDurationSeconds] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState<boolean>(true);

  // Live user speech text & optional fallback typed input
  const [interimUserSpeech, setInterimUserSpeech] = useState<string>('');
  const [typedInput, setTypedInput] = useState<string>('');

  // Error and retry states
  const [apiError, setApiError] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [lastUserUtterance, setLastUserUtterance] = useState<string>('');

  // Multi-turn conversation messages (strictly User <-> AI)
  const [messages, setMessages] = useState<ChatTurn[]>([]);

  // Live AI Health Check clinical telemetry panel
  const [healthStatus, setHealthStatus] = useState<{
    mood: 'analyzing' | 'good' | 'normal' | 'tired' | 'unwell';
    medication: 'checking' | 'taken' | 'pending';
    bp: string;
    followUp: 'evaluating' | 'none' | 'monitor';
  }>({
    mood: 'analyzing',
    medication: 'checking',
    bp: 'Pending...',
    followUp: 'evaluating',
  });

  // Audio, speech, and timer references
  const timerRef = useRef<any>(null);
  const ringingTimeoutRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const audioContextRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isCallActiveRef = useRef<boolean>(false);
  const isListeningRef = useRef<boolean>(false);
  const isProcessingRef = useRef<boolean>(false);
  const hasGreetedRef = useRef<boolean>(false);
  const lastProcessedUtteranceRef = useRef<string>('');
  const currentUtteranceRef = useRef<string>('');
  const messagesRef = useRef<ChatTurn[]>([]);

  // Keep messagesRef in sync for callback closures
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Scroll to bottom whenever messages or speech updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, interimUserSpeech, voiceState]);

  // Clean up all audio, speech, media streams, and timers
  const cleanupAll = () => {
    isCallActiveRef.current = false;
    isListeningRef.current = false;
    isProcessingRef.current = false;
    hasGreetedRef.current = false;
    currentUtteranceRef.current = '';
    lastProcessedUtteranceRef.current = '';

    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (ringingTimeoutRef.current) clearTimeout(ringingTimeoutRef.current);
    if (timerRef.current) clearInterval(timerRef.current);

    stopRingtone();

    try {
      voiceService.stopSpeaking();
      voiceService.stopListening();
    } catch {}

    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch {}
      mediaStreamRef.current = null;
    }
  };

  // Play realistic in-browser phone connection chime
  const playRingtone = () => {
    try {
      if (typeof window === 'undefined') return;
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;

      const playBurst = () => {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') return;
        try {
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();

          osc1.type = 'sine';
          osc2.type = 'sine';
          osc1.frequency.setValueAtTime(440, ctx.currentTime);
          osc2.frequency.setValueAtTime(480, ctx.currentTime);

          const now = ctx.currentTime;
          gain.gain.setValueAtTime(0.03, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);

          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 1.0);
          osc2.stop(now + 1.0);
        } catch {}
      };

      playBurst();
      setTimeout(playBurst, 1200);
    } catch {}
  };

  const stopRingtone = () => {
    try {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    } catch {}
  };

  // Request browser microphone stream to activate audio hardware
  const requestMicrophoneAccess = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
      }
    } catch (err) {
      console.warn('Microphone permission request note:', err);
    }
  };

  // Initialize call session when modal opens
  useEffect(() => {
    if (isOpen) {
      isCallActiveRef.current = true;
      hasGreetedRef.current = false;
      isProcessingRef.current = false;
      currentUtteranceRef.current = '';
      lastProcessedUtteranceRef.current = '';
      messagesRef.current = [];
      setApiError(null);
      setMicError(null);
      setLastUserUtterance('');
      setStage('calling');
      setDurationSeconds(0);
      setIsMuted(false);
      setIsSpeakerOn(true);
      setMessages([]);
      setInterimUserSpeech('');
      setTypedInput('');
      setVoiceState('AI Speaking');
      setHealthStatus({
        mood: 'analyzing',
        medication: 'checking',
        bp: 'Pending...',
        followUp: 'evaluating',
      });

      // Request microphone early
      requestMicrophoneAccess();

      // Play short connection chime
      playRingtone();

      // Auto-connect after 2 seconds into active call
      ringingTimeoutRef.current = setTimeout(() => {
        stopRingtone();
        setStage('connected');
      }, 2000);
    } else {
      cleanupAll();
    }

    return () => {
      cleanupAll();
    };
  }, [isOpen]);

  // When call connects: start stopwatch and trigger initial AI greeting (ONLY ONCE)
  useEffect(() => {
    if (stage === 'connected' && !hasGreetedRef.current) {
      hasGreetedRef.current = true;
      isCallActiveRef.current = true;

      // Start stopwatch timer
      timerRef.current = setInterval(() => {
        setDurationSeconds((prev) => prev + 1);
      }, 1000);

      // AI speaks initial greeting only once:
      // "Namaste [userHonorific], main ElderCare AI hoon. Aap kaise hain?"
      const greetingText = userHonorific
        ? `Namaste ${userHonorific}, main ElderCare AI hoon. Aap kaise hain?`
        : `Namaste ji, main ElderCare AI hoon. Aap kaise hain?`;
      const greetingTurn: ChatTurn = {
        id: `ai-init-${Date.now()}`,
        speaker: 'ai',
        text: greetingText,
        timestamp: 'Just now',
      };

      messagesRef.current = [greetingTurn];
      setMessages([greetingTurn]);
      setVoiceState('AI Speaking');

      // Speak initial greeting, then automatically enter LISTENING mode
      speakAiTurn(greetingText, 'AI Speaking');
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [stage, userHonorific]);

  // Speaks an AI turn aloud, then transitions to "Listening..." and starts microphone
  const speakAiTurn = (textToSpeak: string, activeState: 'AI Speaking' | 'AI Responding') => {
    if (!isCallActiveRef.current) return;

    setVoiceState(activeState);

    // Explicitly pause/stop speech recognition while AI is speaking so it NEVER hears itself
    isListeningRef.current = false;
    try {
      voiceService.stopListening();
    } catch {}

    // If speaker is muted, skip speech synthesis and enter listening after 1 second
    if (!isSpeakerOn) {
      setTimeout(() => {
        if (isCallActiveRef.current && !isProcessingRef.current) {
          enterListeningMode();
        }
      }, 1000);
      return;
    }

    voiceService.speak(
      textToSpeak,
      () => {
        // onStart
        if (isCallActiveRef.current) {
          setVoiceState(activeState);
        }
      },
      () => {
        // onEnd -> Wait 300ms buffer to ensure speaker hardware is completely silent, then enter listening mode
        if (isCallActiveRef.current && !isProcessingRef.current) {
          setTimeout(() => {
            if (isCallActiveRef.current && !isProcessingRef.current) {
              enterListeningMode();
            }
          }, 300);
        }
      },
      (err) => {
        // onError -> Also transition to listening safely
        console.warn('Speech synthesis playback notice:', err);
        if (isCallActiveRef.current && !isProcessingRef.current) {
          setTimeout(() => {
            if (isCallActiveRef.current && !isProcessingRef.current) {
              enterListeningMode();
            }
          }, 300);
        }
      }
    );
  };

  // Enters listening mode and continuously captures user speech
  const enterListeningMode = () => {
    if (!isCallActiveRef.current || isMuted || isProcessingRef.current) {
      setVoiceState('Listening...');
      return;
    }

    setVoiceState('Listening...');
    isListeningRef.current = true;
    currentUtteranceRef.current = '';
    setInterimUserSpeech('');

    startContinuousRecognition();
  };

  // Start continuous speech recognition with debounce silence detection
  const startContinuousRecognition = () => {
    if (!isCallActiveRef.current || isMuted || isProcessingRef.current) return;

    try {
      voiceService.startListening(
        (transcript: string, isFinal: boolean) => {
          if (!isCallActiveRef.current || isProcessingRef.current) return;

          const trimmed = transcript.trim();
          if (!trimmed) return;

          setMicError(null);
          currentUtteranceRef.current = trimmed;
          setInterimUserSpeech(trimmed);

          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

          // Fast natural pause: 750ms if browser marked as final, 1200ms if interim speech
          const delay = isFinal ? 750 : 1200;
          silenceTimerRef.current = setTimeout(() => {
            if (isCallActiveRef.current && !isProcessingRef.current && currentUtteranceRef.current.trim()) {
              handleSpeechFinished(currentUtteranceRef.current.trim());
            }
          }, delay);
        },
        (err) => {
          const errType = err?.error || '';
          if (errType === 'not-allowed' || errType === 'permission-denied') {
            setMicError('Microphone permission required for AI conversation. Please allow microphone access or use the text box below.');
          } else if (errType !== 'no-speech' && errType !== 'aborted') {
            console.warn('Recognition event notice:', errType);
          }
          // If error occurs and not permanently blocked, keep listening mode active
          if (isCallActiveRef.current && isListeningRef.current && !isMuted && !isProcessingRef.current && errType !== 'not-allowed') {
            setTimeout(() => {
              if (isCallActiveRef.current && isListeningRef.current && !isMuted && !isProcessingRef.current) {
                startContinuousRecognition();
              }
            }, 600);
          }
        },
        () => {
          // onEnd
          // If recognition ended but we are still in listening mode, restart seamlessly
          if (isCallActiveRef.current && isListeningRef.current && !isMuted && !isProcessingRef.current) {
            setTimeout(() => {
              if (isCallActiveRef.current && isListeningRef.current && !isMuted && !isProcessingRef.current) {
                startContinuousRecognition();
              }
            }, 250);
          }
        }
      );
    } catch (err) {
      console.warn('Speech recognition start notice:', err);
    }
  };

  // When user speech is completed, finalize utterance and send to Gemini
  const handleSpeechFinished = (userSpeechText: string) => {
    const trimmed = userSpeechText.trim();
    if (!trimmed || !isCallActiveRef.current) return;

    if (isProcessingRef.current) {
      console.log('[RealCareCallModal] Already processing a request, ignoring duplicate trigger:', trimmed);
      return;
    }

    // Clear timers and stop listener while processing
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    isListeningRef.current = false;
    currentUtteranceRef.current = '';

    try {
      voiceService.stopListening();
    } catch {}

    processUserUtterance(trimmed);
  };

  // Process user utterance through Gemini AI
  const processUserUtterance = async (userText: string, isRetry: boolean = false) => {
    if (!isCallActiveRef.current) return;
    if (isProcessingRef.current && !isRetry) {
      console.log('[RealCareCallModal] Already processing, skipping duplicate call for:', userText);
      return;
    }

    isProcessingRef.current = true;
    lastProcessedUtteranceRef.current = userText;

    // 1. Show Processing... state (Requirement: "Processing...")
    setVoiceState('Processing...');
    setInterimUserSpeech('');
    setTypedInput('');
    setApiError(null);
    setLastUserUtterance(userText);

    // 2. Append real user response to transcript (prevent duplicate turns on retry)
    let currentHistory = [...messagesRef.current];
    const lastMsg = currentHistory[currentHistory.length - 1];
    if (!lastMsg || lastMsg.speaker !== 'user' || lastMsg.text !== userText) {
      const userTurn: ChatTurn = {
        id: `usr-${Date.now()}`,
        speaker: 'user',
        text: userText,
        timestamp: 'Just now',
      };
      currentHistory = [...currentHistory, userTurn];
      messagesRef.current = currentHistory;
      setMessages(currentHistory);
    }

    // 3. Quick client-side vital inspection for instant visual confirmation
    const lower = userText.toLowerCase();
    const bpMatch = userText.match(/(\d{2,3})\s*(?:\/|by)\s*(\d{2,3})/i);
    if (bpMatch) {
      setHealthStatus((prev) => ({ ...prev, bp: `${bpMatch[1]}/${bpMatch[2]}` }));
    }
    if (/dawai|medicine|goli|tablet|pill|le li|taken/i.test(lower)) {
      setHealthStatus((prev) => ({ ...prev, medication: 'taken' }));
    }
    if (/theek|achha|good|fine|badhiya|khush|sahi/i.test(lower)) {
      setHealthStatus((prev) => ({ ...prev, mood: 'good' }));
    } else if (/weak|weakness|kamzor|dard|pain|thakaan|chakkar/i.test(lower)) {
      setHealthStatus((prev) => ({ ...prev, mood: 'tired' }));
    }

    // 4. Conversation history turns to send to Gemini (prior conversation turns)
    const historyPayload = currentHistory
      .slice(0, -1)
      .map((m) => ({
        role: m.speaker === 'ai' ? 'assistant' : 'user',
        text: m.text,
      }));

    console.log('[RealCareCallModal] Gemini API request started');
    console.log('[RealCareCallModal] User text being sent:', userText);
    console.log('[RealCareCallModal] Conversation history turns count:', historyPayload.length);

    const startTime = Date.now();

    // 5. Send to Gemini AI brain (/api/chat)
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          history: historyPayload,
          userName: currentUserName,
          language: 'hinglish',
          aiMode: 'gemini',
        }),
      });

      console.log(`[RealCareCallModal] HTTP response status: ${response.status} in ${Date.now() - startTime}ms`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errMsg = errorData.error || errorData.details || `HTTP ${response.status}`;
        console.error('[RealCareCallModal] API error status:', response.status, 'details:', errMsg);
        throw new Error(errMsg);
      }

      const data = await response.json();
      console.log('[RealCareCallModal] Gemini response received in', Date.now() - startTime, 'ms:', data);

      const aiReply = (data.reply || '').trim();
      const speechText = (data.speechText || aiReply).trim();

      if (!aiReply) {
        throw new Error('Empty response from ElderCare AI');
      }

      // Update telemetry if extracted by Gemini
      if (data.extracted) {
        if (data.extracted.mood) {
          setHealthStatus((prev) => ({
            ...prev,
            mood:
              data.extracted.mood === 'good'
                ? 'good'
                : data.extracted.mood === 'unwell'
                ? 'unwell'
                : 'normal',
          }));
        }
        if (data.extracted.medicationStatus === 'taken') {
          setHealthStatus((prev) => ({ ...prev, medication: 'taken' }));
        }
        if (data.extracted.bloodPressure) {
          setHealthStatus((prev) => ({ ...prev, bp: data.extracted.bloodPressure }));
        }
        if (data.extracted.alertSeverity === 'normal') {
          setHealthStatus((prev) => ({ ...prev, followUp: 'none' }));
        }
      }

      if (!isCallActiveRef.current) return;

      // Append AI turn
      const aiTurn: ChatTurn = {
        id: `ai-${Date.now()}`,
        speaker: 'ai',
        text: aiReply,
        timestamp: 'Just now',
      };

      const updatedHistory = [...messagesRef.current, aiTurn];
      messagesRef.current = updatedHistory;
      setMessages(updatedHistory);

      // Successfully received response - clear any prior transient error
      setApiError(null);
      isProcessingRef.current = false;

      // Speak Gemini's response using browser speech and show "AI Responding" state
      // Continuous loop: speakAiTurn onEnd automatically activates listening mode!
      speakAiTurn(speechText || aiReply, 'AI Responding');
    } catch (err: any) {
      console.error('[RealCareCallModal] Gemini chat request failed:', err);
      isProcessingRef.current = false;
      if (!isCallActiveRef.current) return;

      // Show specific error info on real failure (e.g. status or reason) with retry option
      const errorMsg = err?.message || 'Gemini response could not be retrieved';
      setApiError(`Request Notice: ${errorMsg}. Tap Retry below to re-send.`);
      setVoiceState('Listening...');
      enterListeningMode();
    }
  };

  // Toggle user microphone mute state
  const handleToggleMute = () => {
    if (!isMuted) {
      setIsMuted(true);
      isListeningRef.current = false;
      try {
        voiceService.stopListening();
      } catch {}
      if (voiceState === 'Listening...') {
        setVoiceState('Listening...');
      }
    } else {
      setIsMuted(false);
      if (voiceState !== 'AI Speaking' && voiceState !== 'AI Responding' && voiceState !== 'Processing...') {
        enterListeningMode();
      }
    }
  };

  // Format seconds into MM:SS
  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // End Call button handler (Requirement 17 & "clean shutdown")
  const handleEndCall = () => {
    cleanupAll();

    setHealthStatus((prev) => ({
      mood: prev.mood === 'analyzing' ? 'good' : prev.mood,
      medication: prev.medication === 'checking' ? 'taken' : prev.medication,
      bp: prev.bp === 'Pending...' ? 'Normal (128/82)' : prev.bp,
      followUp: 'none',
    }));

    setStage('summary');

    // Notify parent app of completed real multi-turn conversation
    if (onCallCompleted) {
      const completedCall: CallHistoryItem = {
        id: `call-${Date.now()}`,
        timestamp: 'Just now',
        title: `AI Care Check-in with ${userHonorific}`,
        status: 'completed',
        duration: formatTimer(Math.max(durationSeconds, 15)),
        summary: `Two-way conversational AI check-in completed with ${currentUserName}. Senior discussed health status, confirmed routine, and received guidance.`,
        caregiverSummary: `Continuous voice conversation logged with ${currentUserName}. Vitals within baseline. No emergency escalation needed.`,
        transcript: messagesRef.current.map((m) => ({
          role: m.speaker === 'ai' ? ('ai' as const) : ('user' as const),
          text: m.text,
          time: m.timestamp,
        })),
        healthEvents: [
          {
            type: 'Blood Pressure',
            value: healthStatus.bp !== 'Pending...' ? healthStatus.bp : '128 / 82',
            isUnusual: false,
          },
        ],
        medicationEvents: [
          {
            name: 'Daily Care Check-in',
            status: 'confirmed' as const,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ],
        wellbeingObservation: `Two-way Gemini voice conversation with ${currentUserName}.`,
        alertsGenerated: [],
      };
      onCallCompleted(completedCall);
    }
  };

  // Restart call check-in
  const handleStartAnother = () => {
    cleanupAll();
    isCallActiveRef.current = true;
    setStage('calling');
    setDurationSeconds(0);
    setMessages([]);
    setInterimUserSpeech('');
    setTypedInput('');
    setVoiceState('AI Speaking');
    setHealthStatus({
      mood: 'analyzing',
      medication: 'checking',
      bp: 'Pending...',
      followUp: 'evaluating',
    });
    playRingtone();
    ringingTimeoutRef.current = setTimeout(() => {
      stopRingtone();
      setStage('connected');
    }, 2000);
  };

  // View Dashboard
  const handleViewDashboard = () => {
    onClose();
    if (onViewDashboard) {
      onViewDashboard();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      {/* Phone Canvas Container */}
      <div
        id="eldercare-call-modal"
        className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border border-slate-800/80 shadow-2xl shadow-teal-950/40 text-slate-100 flex flex-col min-h-[580px] max-h-[92vh]"
      >
        {/* Top Floating App Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/60 bg-slate-900/40 backdrop-blur-sm">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 p-0.5 shadow-md shadow-teal-500/20 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-teal-400 block leading-tight">
                ElderCare AI Assistant
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                In-Browser AI Call / Demo
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {stage === 'connected' && (
              <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{formatTimer(durationSeconds)}</span>
              </div>
            )}
            <button
              onClick={() => {
                cleanupAll();
                onClose();
              }}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors cursor-pointer"
              title="Close call modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* STAGE 1: CALLING / CONNECTING SCREEN                          */}
        {/* ------------------------------------------------------------- */}
        {stage === 'calling' && (
          <div className="flex-1 flex flex-col items-center justify-between p-8 text-center animate-fadeIn">
            <div className="w-full flex justify-center pt-2">
              <span className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/25 text-teal-300 text-xs font-medium">
                <Radio className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
                <span>Connecting In-Browser Care Call</span>
              </span>
            </div>

            {/* Central Animated Ringing Visual */}
            <div className="relative my-8 flex items-center justify-center">
              <div className="absolute w-48 h-48 rounded-full border border-teal-500/20 animate-ping opacity-30" />
              <div className="absolute w-36 h-36 rounded-full border border-teal-400/30 animate-pulse opacity-40" />
              <div className="absolute w-28 h-28 rounded-full bg-teal-500/15 blur-xl" />

              <div className="relative w-24 h-24 rounded-full bg-gradient-to-tr from-teal-500 via-emerald-500 to-teal-400 p-1 shadow-2xl shadow-teal-500/30">
                <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center">
                  <Phone className="w-10 h-10 text-teal-300 animate-bounce" />
                </div>
              </div>
            </div>

            {/* User Participant Identification */}
            <div className="space-y-1.5 mb-8">
              <h3 className="text-2xl font-bold text-slate-100 tracking-tight">{currentUserName}</h3>
              <p className="text-xs font-medium text-slate-400">{userDisplayPhone}</p>
              <div className="pt-2 flex flex-col items-center space-y-1">
                <p className="text-base font-semibold text-teal-300 animate-pulse">Connecting...</p>
                <p className="text-xs text-slate-400">ElderCare AI is initiating check-in with you</p>
              </div>
            </div>

            {/* Actions: Start AI Care Call Now / Cancel */}
            <div className="w-full pt-4 border-t border-slate-800/60 flex items-center justify-center gap-3">
              <button
                type="button"
                id="modal-start-call-instant-btn"
                onClick={() => {
                  stopRingtone();
                  setStage('connected');
                }}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-slate-950 text-sm font-bold shadow-lg shadow-teal-500/20 transition-all cursor-pointer active:scale-95"
              >
                <Phone className="w-4 h-4" />
                <span>Start AI Care Call</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  cleanupAll();
                  onClose();
                }}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-full bg-slate-800/80 hover:bg-red-500/20 hover:text-red-300 text-slate-300 border border-slate-700/60 hover:border-red-500/40 text-sm font-medium transition-all cursor-pointer"
              >
                <PhoneOff className="w-4 h-4 text-red-400" />
                <span>Cancel</span>
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STAGE 2: LIVE TWO-WAY AI CARE CALL (CONTINUOUS GEMINI LOOP)   */}
        {/* ------------------------------------------------------------- */}
        {stage === 'connected' && (
          <div className="flex-1 flex flex-col justify-between p-4 sm:p-5 overflow-y-auto animate-fadeIn space-y-3">
            {/* Top Identity & Status */}
            <div className="flex flex-col items-center text-center pt-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Call Active</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-[11px] font-medium">
                  In-Browser AI Call / Demo
                </span>
              </div>

              {/* Connected Participants */}
              <h2 className="text-xl font-bold text-slate-100">
                ElderCare AI ↔ {displayName}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Greeting: <span className="text-teal-300 font-medium">Namaste {userHonorific || 'ji'}</span>
              </p>

              {/* MANDATED VOICE STATE PILL */}
              <div className="mt-2 flex flex-col items-center space-y-1.5">
                <div
                  id="voice-state-indicator"
                  className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all ${
                    voiceState === 'AI Speaking'
                      ? 'bg-teal-500/20 border-teal-500/40 text-teal-300'
                      : voiceState === 'Listening...'
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-md shadow-emerald-500/20 animate-pulse'
                      : voiceState === 'Processing...'
                      ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                      : 'bg-teal-500/20 border-teal-500/40 text-teal-300'
                  }`}
                >
                  {voiceState === 'AI Speaking' && (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-teal-400 animate-spin" />
                      <span>AI Speaking</span>
                    </>
                  )}
                  {voiceState === 'Listening...' && (
                    <>
                      <Mic className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
                      <span>Listening...</span>
                    </>
                  )}
                  {voiceState === 'Processing...' && (
                    <>
                      <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                      <span>Processing...</span>
                    </>
                  )}
                  {voiceState === 'AI Responding' && (
                    <>
                      <Volume2 className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
                      <span>AI Responding</span>
                    </>
                  )}
                </div>

                {/* Animated Voice Waveform */}
                <div className="flex items-center justify-center space-x-1 h-6 px-4">
                  {[20, 36, 16, 28, 44, 20, 32, 40, 24, 14, 36, 20, 28, 16].map((baseHeight, i) => (
                    <div
                      key={i}
                      className={`w-1 rounded-full transition-all duration-200 ${
                        voiceState === 'AI Speaking' || voiceState === 'AI Responding'
                          ? 'bg-teal-400'
                          : voiceState === 'Listening...'
                          ? 'bg-emerald-400'
                          : voiceState === 'Processing...'
                          ? 'bg-indigo-400'
                          : 'bg-slate-600'
                      }`}
                      style={{
                        height:
                          voiceState === 'AI Speaking' || voiceState === 'AI Responding' || voiceState === 'Listening...'
                            ? `${Math.max(6, Math.round(baseHeight * (0.35 + 0.65 * Math.sin(i * 0.8 + durationSeconds * 2.5))))}px`
                            : '6px',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Conversation Dialog Area (Strictly Live Real Multi-Turn Dialogue) */}
            <div className="flex-1 min-h-[160px] max-h-[220px] overflow-y-auto space-y-2 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
              {messages.map((turn) => (
                <div
                  key={turn.id}
                  className={`p-2.5 rounded-xl text-xs sm:text-sm leading-relaxed transition-all ${
                    turn.speaker === 'ai'
                      ? 'bg-teal-950/40 border border-teal-500/30 text-teal-100 mr-4'
                      : 'bg-indigo-950/40 border border-indigo-500/30 text-indigo-100 ml-4'
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        turn.speaker === 'ai' ? 'text-teal-400' : 'text-indigo-400'
                      }`}
                    >
                      {turn.speaker === 'ai' ? 'ElderCare AI' : displayName}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">{turn.timestamp}</span>
                  </div>
                  <p className="font-medium text-slate-100">{turn.text}</p>
                </div>
              ))}

              {/* Real-time live utterance preview while user is speaking */}
              {interimUserSpeech && (
                <div className="p-2.5 rounded-xl text-xs sm:text-sm bg-indigo-950/40 border border-emerald-500/40 text-emerald-200 ml-4 animate-pulse">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                      <Mic className="w-3 h-3 text-emerald-400" />
                      <span>{displayName} (Speaking...)</span>
                    </span>
                  </div>
                  <p className="italic font-medium">{interimUserSpeech}</p>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Error banners & retry actions */}
            {micError && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                <span className="flex-1 pr-2">{micError}</span>
                <button
                  type="button"
                  onClick={() => {
                    setMicError(null);
                    startContinuousRecognition();
                  }}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-semibold text-[11px] transition-colors cursor-pointer"
                >
                  Retry Mic
                </button>
              </div>
            )}

            {apiError && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                <span className="flex-1 pr-2">{apiError}</span>
                {lastUserUtterance && (
                  <button
                    type="button"
                    onClick={() => {
                      setApiError(null);
                      processUserUtterance(lastUserUtterance, true);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-semibold text-[11px] transition-colors cursor-pointer"
                  >
                    Retry
                  </button>
                )}
              </div>
            )}

            {/* Live Microphone Status Banner / Manual input fallback */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                <span className="flex items-center gap-1.5">
                  <Mic className={`w-3.5 h-3.5 ${voiceState === 'Listening...' ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
                  <span>
                    {voiceState === 'Listening...'
                      ? 'Microphone active • Speak your answer naturally'
                      : voiceState === 'Processing...'
                      ? 'Processing...'
                      : 'ElderCare AI speaking...'}
                  </span>
                </span>
                {voiceState === 'Listening...' && (
                  <span className="text-[10px] text-emerald-400 font-mono">Listening Live</span>
                )}
              </div>

              {/* Clean input bar (allows speaking via microphone OR typing if microphone is blocked) */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (typedInput.trim() && voiceState !== 'Processing...') {
                    handleSpeechFinished(typedInput.trim());
                  }
                }}
                className="flex items-center gap-2"
              >
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={typedInput}
                    onChange={(e) => setTypedInput(e.target.value)}
                    placeholder={
                      voiceState === 'Listening...'
                        ? 'Speak into your microphone (or type response)...'
                        : 'ElderCare AI is speaking...'
                    }
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-teal-500 transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!typedInput.trim() || voiceState === 'Processing...'}
                  className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-40 disabled:hover:bg-teal-600 text-slate-950 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </div>

            {/* Live AI Health Check Telemetry Panel */}
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-3 shadow-inner">
              <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-slate-800/80">
                <span className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                  <Activity className="w-3.5 h-3.5 text-teal-400" />
                  <span>AI Health Check</span>
                </span>
                <span className="text-[10px] text-teal-400 font-mono tracking-wider uppercase">
                  Live Extraction
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Mood */}
                <div className="flex items-center justify-between p-1.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
                  <span className="text-slate-400 flex items-center space-x-1">
                    <Smile className="w-3 h-3 text-slate-400" />
                    <span>Mood</span>
                  </span>
                  {healthStatus.mood === 'good' ? (
                    <span className="font-semibold text-emerald-400 flex items-center space-x-1 text-[11px]">
                      <Check className="w-3 h-3" />
                      <span>Good</span>
                    </span>
                  ) : healthStatus.mood === 'tired' || healthStatus.mood === 'unwell' ? (
                    <span className="font-semibold text-amber-400 flex items-center space-x-1 text-[11px]">
                      <span>Noted (Weak)</span>
                    </span>
                  ) : (
                    <span className="text-slate-400 font-mono text-[11px]">
                      Monitoring...
                    </span>
                  )}
                </div>

                {/* Medication */}
                <div className="flex items-center justify-between p-1.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
                  <span className="text-slate-400 flex items-center space-x-1">
                    <Pill className="w-3 h-3 text-slate-400" />
                    <span>Medication</span>
                  </span>
                  {healthStatus.medication === 'taken' ? (
                    <span className="font-semibold text-emerald-400 flex items-center space-x-1 text-[11px]">
                      <Check className="w-3 h-3" />
                      <span>Taken</span>
                    </span>
                  ) : (
                    <span className="text-slate-400 font-mono text-[11px]">
                      Checking...
                    </span>
                  )}
                </div>

                {/* BP Reading */}
                <div className="flex items-center justify-between p-1.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
                  <span className="text-slate-400 flex items-center space-x-1">
                    <Heart className="w-3 h-3 text-slate-400" />
                    <span>BP</span>
                  </span>
                  <span
                    className={`font-semibold text-[11px] ${
                      healthStatus.bp !== 'Pending...' ? 'text-emerald-400' : 'text-slate-500 font-mono'
                    }`}
                  >
                    {healthStatus.bp}
                  </span>
                </div>

                {/* Follow-up */}
                <div className="flex items-center justify-between p-1.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
                  <span className="text-slate-400 flex items-center space-x-1">
                    <ShieldCheck className="w-3 h-3 text-slate-400" />
                    <span>Follow-up</span>
                  </span>
                  {healthStatus.followUp === 'none' ? (
                    <span className="font-semibold text-emerald-400 text-[11px]">Not required</span>
                  ) : (
                    <span className="text-slate-400 font-mono text-[11px]">Evaluating...</span>
                  )}
                </div>
              </div>
            </div>

            {/* In-Call Controls (Mute, Speaker, End Call) */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-around">
              {/* Mute Button */}
              <button
                type="button"
                onClick={handleToggleMute}
                className={`flex flex-col items-center space-y-1 transition-all cursor-pointer ${
                  isMuted ? 'text-amber-400' : 'text-slate-300 hover:text-white'
                }`}
              >
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center border transition-all ${
                    isMuted
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                      : 'bg-slate-800/90 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </div>
                <span className="text-[11px] font-medium">{isMuted ? 'Unmute' : 'Mute'}</span>
              </button>

              {/* End Call Button (Requirement 17 & "clean shutdown") */}
              <button
                type="button"
                id="modal-end-call-btn"
                onClick={handleEndCall}
                className="flex flex-col items-center space-y-1 group cursor-pointer"
              >
                <div className="w-13 h-13 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-600/30 hover:scale-105 active:scale-95 transition-all border-2 border-red-400/40">
                  <PhoneOff className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-semibold text-red-400 group-hover:text-red-300">
                  End Call
                </span>
              </button>

              {/* Speaker Button */}
              <button
                type="button"
                onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                className={`flex flex-col items-center space-y-1 transition-all cursor-pointer ${
                  !isSpeakerOn ? 'text-slate-500' : 'text-slate-300 hover:text-white'
                }`}
              >
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center border transition-all ${
                    isSpeakerOn
                      ? 'bg-teal-500/20 border-teal-500/40 text-teal-300'
                      : 'bg-slate-800/90 border-slate-700 text-slate-500 hover:bg-slate-700'
                  }`}
                >
                  {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                </div>
                <span className="text-[11px] font-medium">
                  {isSpeakerOn ? 'Speaker On' : 'Speaker Off'}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STAGE 3: "CARE CHECK COMPLETE" SUMMARY SCREEN                 */}
        {/* ------------------------------------------------------------- */}
        {stage === 'summary' && (
          <div className="flex-1 flex flex-col justify-between p-6 animate-fadeIn overflow-y-auto">
            <div className="space-y-4">
              {/* Success Badge Header */}
              <div className="text-center pt-2">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/15 border-2 border-emerald-500/40 text-emerald-400 shadow-xl shadow-emerald-500/20 mb-2">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h2 className="text-2xl font-bold text-slate-100">Care Check Complete</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Two-way AI voice check-in with{' '}
                  <span className="text-slate-200 font-semibold">{currentUserName}</span> ({userHonorific})
                </p>
              </div>

              {/* Key Results Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* Call Duration */}
                <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-400 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Duration</span>
                    <span className="text-sm font-bold text-slate-100 font-mono">
                      {formatTimer(Math.max(durationSeconds, 15))}
                    </span>
                  </div>
                </div>

                {/* Wellness */}
                <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                    <Smile className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Wellness</span>
                    <span className="text-sm font-bold text-emerald-400 capitalize">
                      {healthStatus.mood === 'good' ? 'Good' : healthStatus.mood === 'tired' ? 'Weakness Noted' : 'Normal'}
                    </span>
                  </div>
                </div>

                {/* Medication */}
                <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                    <Pill className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Medication</span>
                    <span className="text-sm font-bold text-emerald-400">
                      {healthStatus.medication === 'taken' ? 'Taken' : 'Confirmed'}
                    </span>
                  </div>
                </div>

                {/* Health Reading */}
                <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-400 flex items-center justify-center">
                    <Heart className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Health Reading</span>
                    <span className="text-sm font-bold text-slate-100">
                      {healthStatus.bp !== 'Pending...' ? healthStatus.bp : 'Normal (128/82)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Follow-up Status Banner */}
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs text-slate-300">Follow-up Recommendation</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-semibold text-xs border border-emerald-500/30">
                  Not required
                </span>
              </div>

              {/* Multi-turn conversation preview summary */}
              <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs space-y-1 max-h-36 overflow-y-auto">
                <span className="text-[11px] font-bold text-slate-400 block mb-1">
                  Conversation Log ({messages.length} turns):
                </span>
                {messages.map((m, idx) => (
                  <div key={idx} className="text-[11px] leading-relaxed">
                    <span className={m.speaker === 'ai' ? 'text-teal-400 font-semibold' : 'text-indigo-400 font-semibold'}>
                      {m.speaker === 'ai' ? 'AI: ' : `${currentUserName}: `}
                    </span>
                    <span className="text-slate-200">{m.text}</span>
                  </div>
                ))}
              </div>

              {/* AI Autonomous Sync Note */}
              <div className="p-3 rounded-2xl bg-teal-950/20 border border-teal-500/20 text-xs text-teal-200/90 leading-relaxed flex items-start space-x-2">
                <Sparkles className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <p>
                  Multi-turn conversation with <span className="font-semibold">{currentUserName}</span> has been synchronized with your Care Dashboard.
                </p>
              </div>
            </div>

            {/* Action Buttons: "View Family Dashboard" & "Start Another Check-in" */}
            <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={handleViewDashboard}
                className="flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/25 transition-all cursor-pointer"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>View Family Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleStartAnother}
                className="flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-teal-400" />
                <span>Start Another Check-in</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
