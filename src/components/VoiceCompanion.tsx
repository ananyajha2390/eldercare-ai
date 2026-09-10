import React, { useState, useEffect, useRef } from 'react';
import { AIOrb } from './AIOrb';
import {
  AudioState,
  ConversationMessage,
  ExtractedHealthData,
  AIMode,
  SmartAlert
} from '../types';
import {
  GeminiLiveClient,
  LiveConnectionStatus,
  LiveVoiceState,
  HealthEventData
} from '../services/geminiLiveClient';
import { useAuth } from '../contexts/AuthContext';
import { getGreeting, getHonorificName, extractFirstName } from '../lib/nameUtils';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  Sparkles,
  Heart,
  Pill,
  Activity,
  Smile,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Cpu,
  Radio,
  Wifi,
  WifiOff,
  Bug,
  Info
} from 'lucide-react';

interface VoiceCompanionProps {
  aiMode: AIMode;
  onHealthDataExtracted: (data: ExtractedHealthData) => void;
  onNewAlert: (alert: SmartAlert) => void;
  onNavigateToFamily?: () => void;
}

export const VoiceCompanion: React.FC<VoiceCompanionProps> = ({
  aiMode,
  onHealthDataExtracted,
  onNewAlert,
  onNavigateToFamily,
}) => {
  const { profile, user, isDemoMode } = useAuth();
  const rawName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    (isDemoMode ? 'Sharma ji' : '');
  const greeting = getGreeting(rawName);
  const honorific = getHonorificName(rawName);
  const firstName = extractFirstName(rawName);

  const [liveClient] = useState<GeminiLiveClient>(() => new GeminiLiveClient());
  const [connectionStatus, setConnectionStatus] = useState<LiveConnectionStatus>('disconnected');
  const [voiceState, setVoiceState] = useState<LiveVoiceState>('idle');
  const [micActive, setMicActive] = useState<boolean>(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const [showDebugPanel, setShowDebugPanel] = useState<boolean>(false);
  const [inputText, setInputText] = useState<string>('');
  const [liveTranscript, setLiveTranscript] = useState<{ speaker: 'user' | 'gemini'; text: string } | null>(null);

  const [activeExtracted, setActiveExtracted] = useState<ExtractedHealthData | null>(null);

  const [messages, setMessages] = useState<ConversationMessage[]>([
    {
      id: 'init-1',
      role: 'assistant',
      text: `${greeting}! Main ElderCare hoon. Aaj aapki tabiyat kaisi hai?`,
      timestamp: 'Ready',
    },
  ]);

  // Synchronize initial greeting if profile loads after mount
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].id === 'init-1') {
        return [
          {
            id: 'init-1',
            role: 'assistant',
            text: `${greeting}! Main ElderCare hoon. Aaj aapki tabiyat kaisi hai?`,
            timestamp: 'Ready',
          },
        ];
      }
      return prev;
    });
  }, [greeting]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Map LiveVoiceState to AudioState for AIOrb
  const orbAudioState: AudioState =
    voiceState === 'listening'
      ? 'listening'
      : voiceState === 'thinking'
      ? 'thinking'
      : voiceState === 'speaking'
      ? 'speaking'
      : 'idle';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, liveTranscript]);

  // Set up live client event listeners
  useEffect(() => {
    liveClient.setCallbacks({
      onStatusChange: (status) => {
        setConnectionStatus(status);
        if (status === 'connected') {
          setLastError(null);
        }
      },
      onVoiceStateChange: (state) => {
        setVoiceState(state);
      },
      onMicStateChange: (active) => {
        setMicActive(active);
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
            // Update last assistant message or append
            if (last && last.role === 'assistant' && last.id.startsWith('live-ai-')) {
              return prev.map((m, idx) =>
                idx === prev.length - 1 ? { ...m, text: `${m.text} ${text}`.trim() } : m
              );
            }
            return [
              ...prev,
              {
                id: `live-ai-${Date.now()}`,
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
        console.error('[Gemini Live Error]:', errMsg);
        setLastError(errMsg);
      },
    });

    return () => {
      liveClient.disconnect();
    };
  }, [liveClient]);

  // Handle structured health events from Gemini tool calls / transcription
  const handleStructuredHealthEvent = (event: HealthEventData) => {
    let bpString: string | null = null;
    let bpVals: { systolic: number; diastolic: number } | null = null;
    let sugarString: string | null = null;

    if (event.systolic && event.diastolic) {
      bpString = `${event.systolic} / ${event.diastolic}`;
      bpVals = { systolic: event.systolic, diastolic: event.diastolic };
    }

    if (event.glucose) {
      sugarString = `${event.glucose} mg/dL`;
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

    setActiveExtracted(extractedData);
    onHealthDataExtracted(extractedData);

    // Create an alert on family dashboard if high or unusual
    if (isUnusual) {
      const alert: SmartAlert = {
        id: `alert-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timeAgo: 'Just now',
        title: '⚠️ Unusual Reading Detected',
        readingType: bpString ? 'Blood Pressure' : 'Health Reading',
        readingValue: bpString || sugarString || 'Unusual reading',
        message: extractedData.safeNote || "Today's reading is higher than recent recorded readings.",
        severity: 'attention',
        caregiverNotified: true,
        recipientName: 'Rahul',
        isDismissed: false,
        suggestedAction: 'Consider resting quietly and checking again in 15 minutes.',
      };
      onNewAlert(alert);
    }
  };

  // Toggle Live Voice Session
  const handleToggleVoiceSession = async () => {
    setLastError(null);

    if (connectionStatus === 'connected') {
      liveClient.disconnect();
      return;
    }

    if (connectionStatus === 'connecting') {
      liveClient.disconnect();
      return;
    }

    // Connect to real Gemini Live session
    const success = await liveClient.connect(rawName);
    if (!success) {
      // Error message is set in callback
    }
  };

  // Quick Starter Prompts
  const samplePrompts = [
    {
      label: firstName ? `Namaste, mera naam ${firstName} hai` : 'Namaste, mera naam...',
      text: firstName ? `Namaste, mera naam ${firstName} hai.` : 'Namaste, main theek hoon.',
    },
    { label: 'Aaj thoda weakness lag raha hai', text: 'Aaj thoda weakness lag raha hai.' },
    { label: '⚠️ Mera BP 158 by 98 hai (High BP)', text: 'Mera BP 158 by 98 hai.' },
    { label: 'Maine subah ki medicine le li', text: 'Maine subah ki medicine le li.' },
    { label: 'Mera BP 128 by 82 hai (Normal)', text: 'Mera BP 128 by 82 hai.' },
    { label: 'Meri sugar 142 hai', text: 'Meri sugar 142 hai.' },
  ];

  // Send message via text or quick prompt
  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    setLastError(null);

    // If not connected, connect first
    if (connectionStatus !== 'connected') {
      const connected = await liveClient.connect(rawName);
      if (!connected) return;
    }

    // Append to UI messages
    const userMsg: ConversationMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');

    liveClient.sendTextMessage(textToSend.trim());
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      handleSendMessage(inputText);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10" id="voice-companion-screen">
      {/* Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md mb-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left border-b border-slate-100 pb-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 text-teal-800 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              <span>Gemini Live Voice Companion</span>
              <span className="bg-teal-700 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                gemini-3.1-flash-live-preview
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              "{honorific ? `Good morning, ${honorific}.` : 'Good morning.'}"
            </h2>
            <p className="text-base sm:text-lg text-teal-800 font-medium mt-0.5">
              Care that listens. Natural Hindi, Hinglish & English.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 sm:gap-3">
            {/* Live Connection Status Badge */}
            <div
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
                connectionStatus === 'connected'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : connectionStatus === 'connecting'
                  ? 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse'
                  : 'bg-rose-50 text-rose-800 border-rose-300'
              }`}
              id="gemini-connection-status-badge"
            >
              {connectionStatus === 'connected' && (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 -ml-4.5" />
                  <span>🟢 Connected to ElderCare AI</span>
                </>
              )}
              {connectionStatus === 'connecting' && (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-spin" />
                  <span>🟡 Connecting...</span>
                </>
              )}
              {(connectionStatus === 'disconnected' || connectionStatus === 'error') && (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span>{lastError ? '🔴 Unable to connect to Gemini' : '🔴 Disconnected'}</span>
                </>
              )}
            </div>

            {/* Talk to ElderCare Main Button */}
            <button
              type="button"
              id="talk-to-eldercare-btn"
              onClick={handleToggleVoiceSession}
              className={`px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer ${
                connectionStatus === 'connected'
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-teal-700 hover:bg-teal-800 text-white'
              }`}
            >
              <Mic className="w-4 h-4" />
              <span>
                {connectionStatus === 'connected'
                  ? 'End Live Session'
                  : connectionStatus === 'connecting'
                  ? 'Connecting...'
                  : 'TALK TO ELDERCARE'}
              </span>
            </button>

            {/* Dev Debug Panel Toggle */}
            <button
              type="button"
              id="debug-panel-toggle-btn"
              onClick={() => setShowDebugPanel(!showDebugPanel)}
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                showDebugPanel
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
              title="Development Debug Panel (Gemini Live Inspect)"
            >
              <Bug className="w-4 h-4 text-teal-600" />
              <span>Debug</span>
            </button>

            {/* Reset */}
            <button
              type="button"
              onClick={() => {
                liveClient.stopAudioPlayback();
                setMessages([
                  {
                    id: 'init-reset',
                    role: 'assistant',
                    text: `${greeting}! Main ElderCare hoon. Aaj aapki tabiyat kaisi hai?`,
                    timestamp: 'Just now',
                  },
                ]);
                setActiveExtracted(null);
                setLastError(null);
              }}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium flex items-center gap-1 cursor-pointer"
              title="Reset conversation"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* ERROR NOTIFICATION BANNER */}
        {lastError && (
          <div
            className="mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 flex items-start gap-2.5"
            id="gemini-error-banner"
          >
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-rose-950">Unable to connect to Gemini</div>
              <div className="text-rose-800 mt-0.5">{lastError}</div>
              <div className="mt-1 text-[11px] text-rose-700 font-medium">
                Make sure GEMINI_API_KEY is active and microphone permissions are granted.
              </div>
            </div>
          </div>
        )}

        {/* DEVELOPMENT-ONLY DEBUG PANEL (Collapsible, hidden in normal presentation mode) */}
        {showDebugPanel && (
          <div
            className="mt-4 p-4 bg-slate-950 text-slate-100 rounded-2xl font-mono text-xs border border-slate-800 shadow-xl"
            id="development-debug-panel"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <div className="flex items-center gap-2 font-bold text-teal-400">
                <Cpu className="w-4 h-4" />
                <span>DEVELOPMENT LIVE DEBUG PANEL (HACKATHON INSPECTOR)</span>
              </div>
              <span className="text-[10px] text-slate-400">gemini-3.1-flash-live-preview</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-[11px]">
              <div>
                <span className="text-slate-400 block font-semibold">Gemini connection:</span>
                <span
                  className={`font-bold ${
                    connectionStatus === 'connected'
                      ? 'text-emerald-400'
                      : connectionStatus === 'connecting'
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  {connectionStatus === 'connected'
                    ? 'CONNECTED'
                    : connectionStatus === 'connecting'
                    ? 'CONNECTING'
                    : 'DISCONNECTED'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block font-semibold">Live session:</span>
                <span
                  className={`font-bold ${
                    connectionStatus === 'connected' ? 'text-emerald-400' : 'text-slate-400'
                  }`}
                >
                  {connectionStatus === 'connected' ? 'ACTIVE' : 'CLOSED'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block font-semibold">Microphone:</span>
                <span
                  className={`font-bold ${
                    micActive ? 'text-emerald-400' : 'text-slate-400'
                  }`}
                >
                  {micActive ? 'ACTIVE (16kHz PCM Stream)' : 'INACTIVE'}
                </span>
              </div>

              <div className="sm:col-span-2 md:col-span-3 pt-2 border-t border-slate-800 space-y-1.5">
                <div>
                  <span className="text-slate-400 font-semibold">Last user transcript:</span>{' '}
                  <span className="text-sky-300">
                    {liveClient.getLastUserTranscript() || '(none yet)'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 font-semibold">Last Gemini transcript:</span>{' '}
                  <span className="text-emerald-300">
                    {liveClient.getLastGeminiTranscript() || '(none yet)'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 font-semibold">Last error:</span>{' '}
                  <span className={lastError ? 'text-rose-400' : 'text-slate-400'}>
                    {lastError || 'None'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Central Voice AI Orb Section */}
        <div className="py-8 sm:py-10 flex flex-col items-center justify-center">
          <AIOrb
            state={orbAudioState}
            size="lg"
            onClick={handleToggleVoiceSession}
            showRipples={true}
          />

          <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800">
              {voiceState === 'listening' && (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>🎙 Listening... Speak to ElderCare in Hindi, Hinglish or English</span>
                </>
              )}
              {voiceState === 'thinking' && (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
                  <span>✦ Thinking... Gemini is processing your health update</span>
                </>
              )}
              {voiceState === 'speaking' && (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-teal-600 animate-pulse" />
                  <span>🔊 Speaking... Gemini native audio stream</span>
                </>
              )}
              {voiceState === 'idle' && connectionStatus === 'connected' && (
                <>
                  <Mic className="w-3.5 h-3.5 text-teal-700" />
                  <span>Connected & Ready. Speak into your microphone</span>
                </>
              )}
              {connectionStatus !== 'connected' && (
                <>
                  <Mic className="w-3.5 h-3.5 text-slate-500" />
                  <span>Tap "TALK TO ELDERCARE" or the Orb to start live session</span>
                </>
              )}
            </div>

            {/* Streaming Interim Transcript */}
            {liveTranscript && (
              <p className="mt-3 text-sm font-semibold text-slate-700 italic max-w-lg mx-auto bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                <span className="text-teal-700 font-bold mr-1">
                  {liveTranscript.speaker === 'user' ? 'You:' : 'Gemini:'}
                </span>
                "{liveTranscript.text}"
              </p>
            )}
          </div>
        </div>

        {/* Quick Starter Prompts for Hackathon / Demonstration Testing */}
        <div className="pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Quick Test Scenarios (Hindi & English):
            </span>
            <span className="text-[11px] text-slate-500">
              Click any chip to send directly to real Gemini Live
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {samplePrompts.map((p, idx) => (
              <button
                key={idx}
                type="button"
                id={`sample-prompt-${idx}`}
                onClick={() => handleSendMessage(p.text)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                  p.label.includes('158')
                    ? 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100 font-semibold shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-teal-400 hover:bg-teal-50/50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid: Live Conversation Transcript & Extracted Health Information */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Chat Messages Container */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col h-[460px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs text-slate-500 font-semibold">
            <span>Conversation Transcript</span>
            <span
              className={`flex items-center gap-1 font-bold ${
                connectionStatus === 'connected' ? 'text-emerald-700' : 'text-slate-400'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {connectionStatus === 'connected' ? 'Live Gemini Connection' : 'Offline'}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-1">
            {messages.map((m) => {
              const isAssistant = m.role === 'assistant';
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isAssistant ? 'items-start' : 'items-end'}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <span className="text-[11px] font-bold text-slate-500">
                      {isAssistant ? 'ElderCare AI' : (honorific || (isDemoMode ? 'Sharma ji' : 'You'))}
                    </span>
                    <span className="text-[10px] text-slate-400">{m.timestamp}</span>
                  </div>
                  <div
                    className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      isAssistant
                        ? 'bg-slate-100/90 text-slate-900 rounded-tl-xs border border-slate-200/60'
                        : 'bg-gradient-to-r from-teal-700 to-emerald-700 text-white rounded-tr-xs shadow-xs'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Text input backup */}
          <form onSubmit={handleManualSubmit} className="pt-3 border-t border-slate-100 flex gap-2">
            <input
              type="text"
              id="voice-text-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Or type what ${honorific || (isDemoMode ? 'Sharma ji' : 'you')} said (e.g. 'Mera BP 158 by 98 hai')...`}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all text-slate-900"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="px-4 py-2.5 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>

        {/* Right: AI Health Information Extraction Card */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  AI Health Information Extraction
                </h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                Gemini Tool Calling
              </span>
            </div>

            {/* Extracted Metrics Matrix */}
            <div className="space-y-3">
              {/* Blood Pressure */}
              <div className="p-3 rounded-2xl bg-[#FBFBFA] border border-slate-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                    <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-700">Blood Pressure</div>
                    <div className="text-xs text-slate-500">Systolic / Diastolic</div>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`text-base font-extrabold ${
                      activeExtracted?.bloodPressureValues &&
                      (activeExtracted.bloodPressureValues.systolic >= 150 ||
                        activeExtracted.bloodPressureValues.diastolic >= 95)
                        ? 'text-rose-600'
                        : 'text-slate-900'
                    }`}
                  >
                    {activeExtracted?.bloodPressure || '128 / 82'}
                  </span>
                  <span className="text-[10px] text-slate-500 block">mmHg</span>
                </div>
              </div>

              {/* Blood Sugar */}
              <div className="p-3 rounded-2xl bg-[#FBFBFA] border border-slate-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-700">Blood Sugar</div>
                    <div className="text-xs text-slate-500">Post-meal / Routine</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-base font-extrabold text-slate-900">
                    {activeExtracted?.bloodSugar || '142 mg/dL'}
                  </span>
                </div>
              </div>

              {/* Medication */}
              <div className="p-3 rounded-2xl bg-[#FBFBFA] border border-slate-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Pill className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-700">Medication</div>
                    <div className="text-xs text-slate-500">Morning Schedule</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {activeExtracted?.medicationStatus
                      ? activeExtracted.medicationStatus === 'taken'
                        ? 'Taken'
                        : 'Pending'
                      : 'Taken'}
                  </span>
                </div>
              </div>

              {/* Mood */}
              <div className="p-3 rounded-2xl bg-[#FBFBFA] border border-slate-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                    <Smile className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-700">Mood / Vitality</div>
                    <div className="text-xs text-slate-500">Self-reported state</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-slate-800 capitalize">
                    {activeExtracted?.mood || 'Good'}
                  </span>
                </div>
              </div>
            </div>

            {/* Non-Diagnostic Observational Note Banner */}
            <div className="mt-4 p-3 rounded-2xl bg-teal-50/80 border border-teal-200/60">
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                <div className="text-[11px] text-teal-900 leading-relaxed font-medium">
                  {activeExtracted?.safeNote ||
                    'Readings recorded safely within customary profile baselines. Caregiver dashboard synchronized.'}
                </div>
              </div>
            </div>
          </div>

          {/* Strict Safety Directive Card */}
          <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/70 text-[11px] text-slate-700 leading-relaxed">
            <span className="font-bold text-slate-700">Safety Directive:</span> ElderCare AI
            provides supportive observations and structured logging. It does not diagnose
            diseases, claim conditions (e.g. hypertension, diabetes), or prescribe treatments.
          </div>
        </div>
      </div>
    </div>
  );
};
