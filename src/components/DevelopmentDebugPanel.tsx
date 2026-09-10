import React, { useState, useEffect } from 'react';
import { Terminal, CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp, Cpu } from 'lucide-react';

interface DebugPanelProps {
  geminiConnected: boolean;
  liveSessionActive: boolean;
  micActive: boolean;
  audioOutputActive: boolean;
  lastUserInput?: string;
  lastGeminiResponse?: string;
  lastExtractedEvent?: string;
  lastError?: string | null;
}

export const DevelopmentDebugPanel: React.FC<DebugPanelProps> = ({
  geminiConnected,
  liveSessionActive,
  micActive,
  audioOutputActive,
  lastUserInput,
  lastGeminiResponse,
  lastExtractedEvent,
  lastError,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [serverStatus, setServerStatus] = useState<any>(null);

  useEffect(() => {
    fetch('/api/status')
      .then((r) => r.json())
      .then((data) => setServerStatus(data))
      .catch(() => {});
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-40">
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-800 text-teal-300 border border-teal-500/40 text-[11px] font-mono shadow-xl backdrop-blur-sm flex items-center gap-2 cursor-pointer transition-transform active:scale-95"
        >
          <span className={`w-2 h-2 rounded-full ${geminiConnected ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
          <span>Inspect AI Engine</span>
          <Terminal className="w-3.5 h-3.5 text-teal-400" />
        </button>
      ) : (
        <div className="w-80 sm:w-96 bg-slate-950 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden font-mono text-[11px] text-slate-300 animate-in fade-in slide-in-from-bottom-2">
          {/* Header */}
          <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-white">
              <Cpu className="w-4 h-4 text-teal-400" />
              <span>ElderCare AI Engine Debugger</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-3.5 space-y-3 max-h-80 overflow-y-auto">
            {/* Connection States */}
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                <span>Gemini API</span>
                <span className={`font-bold ${geminiConnected || serverStatus?.geminiConfigured ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {geminiConnected || serverStatus?.geminiConfigured ? 'CONNECTED' : 'DISCONNECTED'}
                </span>
              </div>

              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                <span>Live Session</span>
                <span className={`font-bold ${liveSessionActive ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {liveSessionActive ? 'ACTIVE' : 'IDLE'}
                </span>
              </div>

              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                <span>Microphone</span>
                <span className={`font-bold ${micActive ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {micActive ? 'ACTIVE' : 'STANDBY'}
                </span>
              </div>

              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                <span>Native Audio</span>
                <span className={`font-bold ${audioOutputActive ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {audioOutputActive ? 'ACTIVE' : 'STANDBY'}
                </span>
              </div>
            </div>

            {/* Model info */}
            <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-[10px] space-y-0.5 text-slate-400">
              <div>Live API Model: <span className="text-teal-300">gemini-3.1-flash-live-preview</span></div>
              <div>Voice: <span className="text-teal-300">Aoede (24kHz Native PCM)</span></div>
              <div>Calling Architecture: <span className="text-teal-300">CallProvider (Demo + PSTN)</span></div>
            </div>

            {/* Last User Input */}
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold">Last User Utterance:</div>
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 mt-1 truncate">
                {lastUserInput || 'None yet'}
              </div>
            </div>

            {/* Last Gemini Response */}
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold">Last Gemini Live Response:</div>
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-teal-300 mt-1 truncate">
                {lastGeminiResponse || 'None yet'}
              </div>
            </div>

            {/* Last Health Event */}
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold">Last Extracted Tool Event:</div>
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-emerald-400 mt-1 truncate">
                {lastExtractedEvent || 'None yet'}
              </div>
            </div>

            {/* Last Error */}
            {lastError && (
              <div>
                <div className="text-[10px] text-rose-400 uppercase font-bold">Error Notice:</div>
                <div className="p-2 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 mt-1">
                  {lastError}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
